import axios from "axios";
import crypto from "crypto";
import {
  EventSource
} from "eventsource";
class ZImage {
  constructor() {
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.BASES = {
      tongyi: "https://tongyi-mai-z-image-turbo.hf.space",
      mrfake: "https://mrfakename-z-image-turbo.hf.space"
    };
    this.SEC = {
      "user-agent": this.UA,
      "accept-language": "id-ID",
      pragma: "no-cache",
      "cache-control": "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    this._axInstances = {};
  }
  log(t, ...a) {
    console.log(`[${t.toUpperCase()}]`, ...a);
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  rnd(n = 10) {
    return crypto.randomBytes(n).toString("base64url").slice(0, n);
  }
  rndInt(max = 999999) {
    return Math.floor(Math.random() * max);
  }
  async attempt(fn, tries = 3, delay = 2e3) {
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (e) {
        this.log("retry", `${i + 1}/${tries} - ${e?.message}`);
        if (i < tries - 1) await this.sleep(delay);
        else throw e;
      }
    }
  }
  getAxios(base) {
    try {
      const url = this.BASES[base];
      if (!url) throw new Error(`Unknown base: ${base}`);
      if (!this._axInstances[base]) {
        const ref = base === "tongyi" ? url + "/?__theme=system" : url + "/";
        this._axInstances[base] = axios.create({
          baseURL: url,
          headers: {
            ...this.SEC,
            origin: url,
            referer: ref
          }
        });
      }
      return {
        ax: this._axInstances[base],
        url: url
      };
    } catch (e) {
      this.log("error", "Axios setup failed");
      throw e;
    }
  }
  parseImgs(res) {
    try {
      const imgs = [];
      const dataArray = res?.output?.data || res?.data || [];
      for (const item of dataArray) {
        if (Array.isArray(item)) {
          for (const sub of item) {
            const targetUrl = sub?.image?.url || sub?.url || (typeof sub === "string" && sub.startsWith("http") ? sub : null);
            if (targetUrl) imgs.push(targetUrl);
          }
        } else {
          const targetUrl = item?.image?.url || item?.url || (typeof item === "string" && item.startsWith("http") ? item : null);
          if (targetUrl) imgs.push(targetUrl);
        }
      }
      return imgs;
    } catch (e) {
      this.log("error", "Parsing images failed", e.message);
      return [];
    }
  }
  listenSSE(url, hdrs, timeout = 12e4) {
    return new Promise((resolve, reject) => {
      try {
        const es = new EventSource(url, {
          headers: hdrs
        });
        const timer = setTimeout(() => {
          es.close();
          reject(new Error("SSE timeout"));
        }, timeout);
        es.onmessage = e => {
          try {
            const d = JSON.parse(e.data);
            this.log("sse", d?.msg || "heartbeat");
            if (d?.msg === "process_completed" || d?.msg === "complete") {
              clearTimeout(timer);
              es.close();
              resolve(d);
            }
            if (d?.msg === "process_errored") {
              clearTimeout(timer);
              es.close();
              reject(new Error(d?.output?.error || "Process Errored"));
            }
          } catch (err) {}
        };
        es.onerror = () => {
          if (es.readyState === 2) this.log("sse", "Connection closed");
        };
      } catch (e) {
        reject(e);
      }
    });
  }
  async generate({
    prompt,
    base = "tongyi",
    seed,
    steps,
    guidance,
    enhance = true,
    size,
    width,
    height
  } = {}) {
    try {
      if (!prompt) throw new Error("Prompt is required");
      const {
        ax,
        url
      } = this.getAxios(base);
      const session = this.rnd(10);
      const currentSeed = seed ?? this.rndInt();
      const trigger = this.rndInt(30) + 10;
      let joinUrl, body;
      if (base === "tongyi") {
        joinUrl = `/gradio_api/queue/join?__theme=system`;
        body = {
          data: [prompt, size || "1024x1024 ( 1:1 )", currentSeed, steps || 8, guidance || 5.3, enhance, []],
          fn_index: 2,
          trigger_id: trigger,
          session_hash: session
        };
      } else {
        joinUrl = `/gradio_api/queue/join?`;
        body = {
          data: [prompt, width || 1024, height || 1024, steps || 10, currentSeed, enhance],
          fn_index: 2,
          trigger_id: trigger,
          session_hash: session
        };
      }
      this.log(base, `Prompt: "${prompt.slice(0, 25)}..."`);
      const joinHdrs = {
        "content-type": "application/json"
      };
      if (base === "tongyi") joinHdrs["x-zerogpu-uuid"] = this.rnd(20);
      await this.attempt(() => ax.post(joinUrl, body, {
        headers: joinHdrs
      }));
      const sseHdrs = {
        ...this.SEC,
        accept: "text/event-stream"
      };
      const sseUrl = `${url}/gradio_api/queue/data?session_hash=${session}`;
      const rawResult = await this.attempt(() => this.listenSSE(sseUrl, sseHdrs));
      const images = this.parseImgs(rawResult);
      this.log(base, `Success! Found ${images.length} images`);
      return {
        base: base,
        result: images
      };
    } catch (e) {
      this.log("error", `Generate failed: ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ZImage();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}