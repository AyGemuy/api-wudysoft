import axios from "axios";
class AiImageEdit {
  constructor() {
    this.base = "https://dydkrpmnafsnivjxmipj.supabase.co";
    this.key = "sb_publishable_W_1Ofv9769iYEEn9dfyAHQ_OhuCER6g";
    this.sess = {};
    this.head = {
      "User-Agent": "Dart/3.9 (dart:io)",
      "Accept-Encoding": "gzip",
      "x-supabase-client-platform": "android",
      "x-client-info": "supabase-flutter/2.10.3",
      "Content-Type": "application/json; charset=utf-8",
      apikey: this.key,
      "x-supabase-api-version": "2024-01-01"
    };
  }
  async solve(img) {
    try {
      console.log("[Banana] Processing image input...");
      if (Buffer.isBuffer(img)) return img.toString("base64");
      if (typeof img === "string" && img.startsWith("http")) {
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data).toString("base64");
      }
      return img;
    } catch (e) {
      console.log("[Banana] Image processing failed:", e.message);
      return null;
    }
  }
  async auth() {
    try {
      console.log("[Banana] Authenticating...");
      const url = `${this.base}/auth/v1/signup`;
      const payload = {
        data: {},
        gotrue_meta_security: {
          captcha_token: null
        }
      };
      const headers = {
        ...this.head,
        Authorization: `Bearer ${this.key}`
      };
      const {
        data
      } = await axios.post(url, payload, {
        headers: headers
      });
      this.sess.token = data?.access_token || null;
      this.sess.refresh = data?.refresh_token || null;
      console.log(this.sess.token ? "[Banana] Auth Success." : "[Banana] Auth Failed.");
      return this.sess.token;
    } catch (e) {
      console.error("[Banana] Auth Error:", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    image,
    model,
    ...rest
  }) {
    try {
      const token = this.sess.token || await this.auth();
      if (!token) throw new Error("Authentication failed");
      const imgData = image ? await this.solve(image) : null;
      const endpoint = imgData ? "/functions/v1/edit-image" : "/functions/v1/generate-image";
      const targetModel = model || (imgData ? "auto" : "fal-ai/flux-2");
      console.log(`[Banana] Mode: ${imgData ? "Image-to-Image" : "Text-to-Image"} | Model: ${targetModel}`);
      const payload = imgData ? {
        image: imgData,
        mimeType: "image/png",
        prompt: prompt,
        model: targetModel,
        isFirstAttempt: true,
        ...rest
      } : {
        prompt: prompt,
        model: targetModel,
        ...rest
      };
      const {
        data
      } = await axios.post(`${this.base}${endpoint}`, payload, {
        headers: {
          ...this.head,
          Authorization: `Bearer ${token}`
        }
      });
      const b64Res = data?.image;
      if (!b64Res) throw new Error("No data returned from API");
      console.log("[Banana] Generation success.");
      const buffer = Buffer.from(b64Res, "base64");
      return {
        buffer: buffer,
        contentType: "image/png",
        meta: {
          prompt: data?.prompt || prompt,
          model: data?.model
        }
      };
    } catch (e) {
      console.error(`[Banana] Generate Error: ${e.response?.data?.msg || e.message}`);
      return {
        buffer: null,
        contentType: null
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
  const api = new AiImageEdit();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}