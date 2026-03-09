import axios from "axios";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class NanaBanana {
  constructor() {
    this.base = "https://nanabananapro.io/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://nanabananapro.io",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://nanabananapro.io/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async getBuf(src) {
    try {
      if (!src) return null;
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (/^https?:\/\//.test(src)) {
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        return Buffer.from(src.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      return null;
    } catch (e) {
      console.error("[Buf] Error:", e.message);
      return null;
    }
  }
  async poll(taskId) {
    console.log(`[Poll] Task: ${taskId}`);
    for (let i = 0; i < 60; i++) {
      await this.wait(3e3);
      try {
        const {
          data
        } = await axios.get(`${this.base}/image/status/${taskId}`, {
          headers: this.headers
        });
        const status = data?.status;
        process.stdout.write(`\r[Poll] ${i + 1}/60 | Status: ${status} `);
        if (status === 1) {
          console.log("\n[Poll] Success.");
          return data?.outputImage;
        }
        if (status === -1 || data?.error) throw new Error("Gen Failed/Cancelled");
      } catch (e) {
        if (!e.message.includes("Status")) console.error(` [Retry] ${e.message}`);
      }
    }
    throw new Error("Timeout");
  }
  async generate({
    prompt,
    image,
    model,
    addWatermark,
    ...rest
  }) {
    try {
      console.log("[Chat] Mode: I2I Only");
      const form = new FormData();
      const imgs = image ? Array.isArray(image) ? image : [image] : [];
      if (!imgs.length) throw new Error("Image parameter is required for I2I");
      const pl = {
        prompt: prompt || PROMPT.text,
        addWatermark: String(addWatermark ?? true),
        inputMode: "upload",
        model: model || "nano-banana",
        ...rest
      };
      Object.keys(pl).forEach(k => form.append(k, pl[k]));
      for (const src of imgs) {
        const buf = await this.getBuf(src);
        if (buf) {
          form.append("images", buf, {
            filename: `img-${Date.now()}.jpg`,
            contentType: "image/jpeg"
          });
        }
      }
      const {
        data
      } = await axios.post(`${this.base}/image/generate`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      if (!data?.taskId) throw new Error("No Task ID received");
      const resultUrl = await this.poll(data.taskId);
      return {
        result: resultUrl,
        ...data
      };
    } catch (e) {
      console.error("\n[Error]", e?.response?.data || e.message);
      return {
        result: null,
        error: e.message
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
  const api = new NanaBanana();
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