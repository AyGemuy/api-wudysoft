import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
const PUB = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
const DEFAULT_TAGS = "ChicagoBlues,Hopeful,Sitar";
const DEFAULT_LYRICS = `[Verse 1]
The ink has dried on the final line,
Years of lessons now left behind.
The halls we roamed, the dreams we shared,
Fading echoes fill the air.
A photograph in a fading frame,
Yet the road ahead calls my name.

[Chorus]
Oh, the sky is wide, the wind is clear,
A brand-new map to guide me here.
I'll carry the roots, but let go of the ground,
A new chapter's calling, a new voice I've found.`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const attempt = async (fn, tries = 3, ms = 2e3) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const status = e.response?.status;
      const data = e.response?.data;
      console.warn(`[attempt] ${i + 1}/${tries} gagal: status=${status}, data=${JSON.stringify(data)}`);
      if (i < tries - 1) await sleep(ms);
    }
  }
  throw last;
};
class Text2Music {
  constructor() {
    this.fp = crypto.randomBytes(16).toString("hex");
    this.tv = null;
    this.ax = wrapper(axios.create({
      baseURL: "https://aifaceswap.io",
      jar: new CookieJar(),
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Origin: "https://aifaceswap.io",
        Referer: "https://aifaceswap.io/ai-music-generator/",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      validateStatus: () => true
    }));
  }
  async tv_get() {
    if (this.tv) return this.tv;
    try {
      console.log("[tv] fetch html...");
      const {
        data: html,
        status
      } = await this.ax.get("/ai-music-generator/");
      if (status !== 200) throw new Error(`Gagal fetch HTML, status ${status}`);
      const match = html.match(/src=["']([^"']*aifaceswap_text2music[^"']*\.js)["']/);
      if (!match) throw new Error("js build file not found");
      let jsUrl = match[1];
      if (!jsUrl.startsWith("http")) jsUrl = `https://aifaceswap.io${jsUrl}`;
      console.log("[tv] fetch js:", jsUrl);
      const {
        data: js,
        status: jsStatus
      } = await this.ax.get(jsUrl, {
        baseURL: ""
      });
      if (jsStatus !== 200) throw new Error(`Gagal fetch JS, status ${jsStatus}`);
      const tvMatch = js.match(/headers\["theme-version"\]="([^"]+)"/);
      this.tv = tvMatch?.[1] || "m4zcYhag/NiYjEkGfZ5MADYQWK8iko7+BaOQTX6/zARRG+BPpw9Q+iBok8fzahyB";
    } catch (e) {
      console.error("[tv] error:", e.message);
      this.tv = "m4zcYhag/NiYjEkGfZ5MADYQWK8iko7+BaOQTX6/zARRG+BPpw9Q+iBok8fzahyB";
    }
    console.log("[tv] Token theme-version:", this.tv);
    return this.tv;
  }
  async sig() {
    try {
      const tv = await this.tv_get();
      const key = crypto.randomBytes(8).toString("hex");
      const xg = crypto.publicEncrypt({
        key: PUB,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(key)).toString("base64");
      const ci = crypto.createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(key));
      const fp1 = ci.update("aifaceswap:" + this.fp, "utf8", "base64") + ci.final("base64");
      const headers = {
        fp: this.fp,
        fp1: fp1,
        "x-guide": xg,
        "x-code": Date.now().toString(),
        "theme-version": tv,
        "Content-Type": "application/json"
      };
      console.log("[sig] headers generated:", Object.keys(headers));
      return headers;
    } catch (e) {
      console.error("[sig] error:", e.message);
      throw e;
    }
  }
  async mk(tags, lyrics, duration, rest = {}) {
    try {
      console.log("[mk] task musik, tags:", tags);
      const {
        input: ri,
        ...rr
      } = rest;
      return await attempt(async () => {
        const sg = await this.sig();
        const payload = {
          fn_name: "demo-text2music",
          call_type: 1,
          input: {
            tags: tags,
            lyrics: lyrics,
            duration: duration,
            ...ri
          },
          request_from: 1,
          origin_from: "4b06e7fa483b761a",
          ...rr
        };
        console.log("[mk] payload keys:", Object.keys(payload));
        const response = await this.ax.post("/api/aikit/create", payload, {
          headers: sg
        });
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        const taskId = response.data?.data?.task_id;
        if (!taskId) throw new Error("task_id kosong");
        console.log("[mk] task_id:", taskId);
        return taskId;
      });
    } catch (e) {
      console.error("[mk] error:", e.message);
      throw e;
    }
  }
  async ck(taskId) {
    try {
      return await attempt(async () => {
        const sg = await this.sig();
        const response = await this.ax.post("/api/aikit/check_status", {
          task_id: taskId,
          fn_name: "demo-text2music",
          call_type: 1,
          request_from: 1,
          origin_from: "4b06e7fa483b761a"
        }, {
          headers: sg
        });
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        const d = response.data?.data;
        if (!d) throw new Error("response kosong");
        return d;
      }, 5, 3e3);
    } catch (e) {
      console.error("[ck] error:", e.message);
      throw e;
    }
  }
  async generate({
    tags,
    lyrics,
    duration = 15,
    ...rest
  }) {
    try {
      const finalTags = tags || DEFAULT_TAGS;
      const finalLyrics = lyrics || DEFAULT_LYRICS;
      console.log("[generate] membuat task musik...");
      const taskId = await this.mk(finalTags, finalLyrics, duration, rest);
      let result = null;
      let attempts = 0;
      const maxAttempts = 60;
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[poll] ${attempts}/${maxAttempts}, tunggu 5s...`);
        await sleep(5e3);
        result = await this.ck(taskId);
        console.log("[poll] status:", result?.status);
        if (!result || result.status !== 0 && result.status !== 1) break;
      }
      return {
        job_id: taskId,
        audio: result?.result_image || null
      };
    } catch (e) {
      console.error("[generate] error:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.lyrics) {
    return res.status(400).json({
      error: "Parameter 'lyrics' diperlukan"
    });
  }
  const api = new Text2Music();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}