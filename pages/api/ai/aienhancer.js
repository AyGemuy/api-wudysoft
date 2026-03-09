import axios from "axios";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
const BASE_URL = "https://aienhancer.ai/api/v1";
const ENDPOINT = "/r/image-enhance";
const MODEL_REGISTRY = {
  nano: {
    gen: 2,
    edit: 2
  },
  seedream: {
    gen: 5,
    edit: 5
  },
  "seedream-45": {
    gen: 12,
    edit: 12
  },
  flux: {
    gen: 8,
    edit: 8
  },
  qwen: {
    gen: 11,
    edit: 9
  }
};
const http = axios.create({
  baseURL: BASE_URL,
  timeout: 6e4
});
class AIEnhancer {
  constructor() {
    try {
      this.key = CryptoJS.enc.Utf8.parse("ai-enhancer-web__aes-key");
      this.iv = CryptoJS.enc.Utf8.parse("aienhancer-aesiv");
      this.headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://aienhancer.ai",
        pragma: "no-cache",
        referer: "https://aienhancer.ai/ai-image-editor",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      console.log("[Init] AIEnhancer Class Ready.");
    } catch (e) {
      console.error("[Init] Constructor Error:", e.message);
    }
  }
  resolveModel(name, mode) {
    try {
      const key = String(name || "nano").toLowerCase().trim();
      const entry = MODEL_REGISTRY[key] || MODEL_REGISTRY["nano"];
      const id = entry[mode];
      if (id === undefined || id === null) {
        throw new Error(`Model "${key}" tidak mendukung mode "${mode.toUpperCase()}"`);
      }
      console.log(`[Model] Resolved: ${key} | Mode: ${mode} | ID: ${id}`);
      return {
        id: id,
        name: key,
        endpoint: ENDPOINT
      };
    } catch (e) {
      console.error("[Model] Resolve Error:", e.message);
      throw e;
    }
  }
  encrypt(data) {
    try {
      const s = typeof data === "string" ? data : JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(s, this.key, {
        iv: this.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return encrypted.toString();
    } catch (e) {
      console.error("[Crypto] Encryption Failed:", e.message);
      throw new Error("Gagal mengenkripsi data pengaturan.");
    }
  }
  async resolveImage(input) {
    if (!input) return "";
    console.log("[Image] Resolving input...");
    try {
      if (Buffer.isBuffer(input)) {
        return `data:image/jpeg;base64,${input.toString("base64")}`;
      }
      if (typeof input === "string" && input.startsWith("http")) {
        console.log(`[Image] Fetching from URL: ${input}`);
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        const mime = res.headers["content-type"] || "image/jpeg";
        const base64 = Buffer.from(res.data).toString("base64");
        return `data:${mime};base64,${base64}`;
      }
      if (typeof input === "string") {
        return input.includes("base64,") ? input : `data:image/jpeg;base64,${input}`;
      }
      return "";
    } catch (err) {
      console.error(`[Image] Resolve Error: ${err.message}`);
      return "";
    }
  }
  async poll(taskId, endpoint) {
    console.log(`[Poll] Starting for Task: ${taskId}`);
    const pollUrl = `${endpoint}/result`;
    while (true) {
      try {
        const {
          data: res
        } = await http.post(pollUrl, {
          task_id: taskId
        }, {
          headers: this.headers
        });
        const status = res?.data?.status || "unknown";
        const resultData = res?.data;
        if (status === "succeeded") {
          console.log("[Poll] Task Succeeded!");
          return resultData;
        }
        if (status === "failed" || resultData?.error) {
          console.error("[Poll] Task Failed:", resultData?.error);
          throw new Error(resultData?.error || "Task processing failed on server");
        }
        console.log(`[Poll] Current Status: ${status}...`);
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        console.error("[Poll] Request Error:", e.message);
        if (e.message.includes("failed")) throw e;
        await new Promise(r => setTimeout(r, 5e3));
      }
    }
  }
  async generate({
    prompt,
    image,
    model = "nano",
    ...rest
  }) {
    try {
      const isI2I = Array.isArray(image) ? image.length > 0 : !!image;
      const mode = isI2I ? "edit" : "gen";
      const modelInfo = this.resolveModel(model, mode);
      let images = [];
      if (isI2I) {
        console.log("[Generate] Processing Image Input...");
        const inputs = Array.isArray(image) ? image : [image];
        for (const inp of inputs) {
          const r = await this.resolveImage(inp);
          if (r) images.push(r);
        }
        if (images.length === 0) throw new Error("Gagal memproses gambar. Pastikan format benar.");
      }
      const settings = {
        prompt: prompt || (isI2I ? "Enhanced photo" : "High quality scenery"),
        size: rest?.size || "2K",
        aspect_ratio: rest?.aspect_ratio || (isI2I ? "match_input_image" : "1:1"),
        output_format: rest?.output_format || "png",
        max_images: 1,
        ...rest
      };
      const payload = {
        model: modelInfo.id,
        function: isI2I ? "ai-image-editor" : "ai-image-generator",
        settings: this.encrypt(settings),
        ...isI2I && {
          image: images
        }
      };
      console.log(`[Generate] Sending Create Request to ${modelInfo.endpoint}...`);
      const {
        data: res1
      } = await http.post(`${modelInfo.endpoint}/create`, payload, {
        headers: this.headers
      });
      const tid = res1?.data?.id;
      if (!tid) {
        console.error("[Generate] Server Response:", JSON.stringify(res1));
        throw new Error(res1?.message || "Server tidak memberikan Task ID.");
      }
      console.log(`[Generate] Task Created: ${tid}`);
      return await this.poll(tid, modelInfo.endpoint);
    } catch (e) {
      console.error("[Generate] Fatal Error:", e.message);
      return {
        error: true,
        message: e.message || "Internal Service Error",
        status: "failed"
      };
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
  const api = new AIEnhancer();
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