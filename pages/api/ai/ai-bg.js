import axios from "axios";
import crypto from "crypto";
class AIService {
  constructor() {
    this.url = "https://us-central1-ai-bg-remover-android.cloudfunctions.net";
    this.tk = this.gTk();
    this.ac = this.gAc();
  }
  gTk() {
    try {
      return crypto.randomBytes(16).toString("hex");
    } catch (e) {
      return "tk_" + Date.now();
    }
  }
  gAc() {
    try {
      const p = Buffer.from(JSON.stringify({
        exp: Math.floor(Date.now() / 1e3) + 3600
      })).toString("base64");
      return `header.${p}.${crypto.randomBytes(16).toString("hex")}`;
    } catch (e) {
      return "ac_" + Date.now();
    }
  }
  async gen({
    mode = "chat",
    prompt,
    ...opt
  }) {
    try {
      const isImg = mode === "image";
      const path = isImg ? "/ca_logo_gen" : "/askGPT_v2";
      const body = {
        data: isImg ? {
          query: prompt ?? "",
          width: opt?.w || 1024,
          height: opt?.h || 1024
        } : {
          query: prompt || "",
          ...opt
        }
      };
      const res = await axios.post(`${this.url}${path}`, body, {
        headers: {
          "User-Agent": "okhttp/4.11.0",
          "firebase-instance-id-token": this.tk,
          "x-firebase-appcheck": this.ac,
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      const raw = res?.data?.result || res?.data;
      if (isImg && raw?.base64_image) {
        return {
          buffer: Buffer.from(raw.base64_image, "base64"),
          contentType: "image/jpeg"
        };
      }
      return raw;
    } catch (err) {
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    prompt,
    mode = "chat"
  } = params;
  if (!prompt) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AIService();
  try {
    const result = await api.gen({
      mode: mode,
      prompt: prompt,
      ...params
    });
    if (!result) {
      throw new Error("Gagal mendapatkan respon dari AI service");
    }
    if (mode === "image" && result.buffer) {
      res.setHeader("Content-Type", result.contentType);
      return res.status(200).send(result.buffer);
    }
    return res.status(200).json({
      status: true,
      ...result
    });
  } catch (error) {
    console.error("[API_ERROR]", error.message);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server"
    });
  }
}