import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class TextEffect {
  constructor() {
    this.api = axios.create({
      timeout: 6e4
    });
  }
  async generate({
    url,
    text,
    ...rest
  }) {
    try {
      console.log("[PROSES] Validasi & Kirim...");
      const targetText = Array.isArray(text) ? text : text || null;
      if (!targetText || Array.isArray(targetText) && !targetText.length) {
        throw new Error('Validasi gagal: "text" wajib diisi.');
      }
      const response = await this.api.request({
        method: "POST",
        url: `https://${apiConfig.DOMAIN_KOYEB}/text-effect`,
        headers: {
          "Content-Type": "application/json"
        },
        data: {
          text: targetText,
          url: url || undefined,
          ...rest
        }
      });
      console.log("[PROSES] Berhasil.");
      return response?.data;
    } catch (error) {
      const status = error?.response?.status ? `[Status: ${error.response.status}]` : "";
      const msg = error?.response?.data?.message || error?.message || "Unknown Error";
      console.error(`[GAGAL] ${status} ${msg}`);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text || !params.url) {
    return res.status(400).json({
      error: "Parameter 'text' dan 'url' diperlukan"
    });
  }
  const api = new TextEffect();
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