import axios from "axios";
import crypto from "crypto";
import {
  EventSource
} from "eventsource";
import PROMPT from "@/configs/ai-prompt";
class FireRedImageEdit {
  constructor() {
    this.host = "https://prithivmlmods-firered-image-edit-1-0-fast.hf.space";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.host,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.host}/?__theme=system`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _log(act, msg) {
    console.log(`[FireRedImageEdit] [${act}] ${msg}`);
  }
  _hash() {
    return crypto.randomBytes(6).toString("hex");
  }
  async _img(item) {
    try {
      if (Buffer.isBuffer(item)) return item.toString("base64");
      if (typeof item === "string") {
        if (item.startsWith("http")) {
          this._log("Image", "Downloading URL...");
          const res = await axios.get(item, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data).toString("base64");
        }
        if (item.includes("base64,")) return item.split("base64,").pop();
        if (/^[A-Za-z0-9+/=]+$/.test(item)) return item;
      }
      return null;
    } catch (e) {
      this._log("Image Error", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    this._log("Queue", "Starting firered edit pipeline...");
    const sessionHash = rest?.session_hash || this._hash();
    let es = null;
    const imageInputs = Array.isArray(image) ? image : [image];
    const b64List = [];
    try {
      for (const img of imageInputs) {
        if (!img) continue;
        const b64Data = await this._img(img);
        if (b64Data) b64List.push(`data:image/jpeg;base64,${b64Data}`);
      }
      if (!b64List.length) throw new Error("No valid image sources could be parsed");
      const imageStringArray = JSON.stringify(b64List);
      const payload = {
        data: [imageStringArray, prompt || PROMPT.text, rest?.seed || 0, rest?.enhance ?? true, rest?.steps || 1, rest?.cfg || 4],
        fn_index: rest?.fn_index || 2,
        trigger_id: rest?.trigger_id || 12,
        session_hash: sessionHash,
        ...rest?.override
      };
      const client = axios.create({
        baseURL: this.host,
        headers: this.headers,
        timeout: 6e4
      });
      this._log("Queue", "Joining queue pipeline...");
      await client.post("/gradio_api/queue/join?__theme=system", payload, {
        headers: {
          "x-gradio-user": "app",
          "x-zerogpu-uuid": rest?.zerogpu_uuid || this._hash()
        }
      });
      this._log("Stream", `Listening for process completed [Session: ${sessionHash}]`);
      const streamResult = await new Promise((resolve, reject) => {
        es = new EventSource(`${this.host}/gradio_api/queue/data?session_hash=${sessionHash}`, {
          headers: {
            ...this.headers,
            accept: "text/event-stream"
          }
        });
        es.onmessage = event => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed?.output?.error?.includes("ZeroGPU quota exceeded") || parsed?.title?.includes("exceeded")) {
              es.close();
              reject(new Error(parsed?.output?.error || "ZeroGPU quota exceeded"));
            }
            if (parsed?.msg === "process_completed") {
              es.close();
              resolve(parsed);
            }
          } catch (_) {}
        };
        es.onerror = err => {
          es.close();
          reject(err);
        };
      });
      const responseDataArray = streamResult?.output?.data || [];
      const outputData = responseDataArray.find(item => item && (item.url || item.path)) || {};
      return {
        status: streamResult?.success || false,
        result: outputData?.url || null,
        info: {
          path: outputData?.path || null,
          duration: streamResult?.output?.duration || null,
          session_hash: sessionHash
        }
      };
    } catch (err) {
      if (es) es.close();
      this._log("Error", err?.message);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Terjadi kesalahan sistem",
        info: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new FireRedImageEdit();
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