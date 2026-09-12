import axios from "axios";
import FormData from "form-data";
import ApiKey from "@/configs/api-key";
class OcrService {
  constructor() {
    this.baseUrl = "https://api.ocr.space/parse/image";
    this.keys = ApiKey.ocr;
    this.idx = 0;
  }
  rot() {
    this.idx = (this.idx + 1) % this.keys.length;
    console.log(`[OcrService] Memutar ke API Key indeks: ${this.idx}`);
  }
  bld(data) {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    return form;
  }
  snk(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(item => this.snk(item));
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
      acc[snakeKey] = this.snk(obj[key]);
      return acc;
    }, {});
  }
  async generate({
    image,
    ...rest
  }) {
    let attempts = 0;
    const max = this.keys.length;
    let lastError = null;
    while (attempts < max) {
      const key = this.keys[this.idx] || "helloworld";
      console.log(`[OcrService] Mencoba memproses dengan key indeks ke-${this.idx} (Percobaan ${attempts + 1}/${max})`);
      try {
        const client = axios.create({
          baseURL: this.baseUrl,
          headers: {
            apikey: key
          }
        });
        const isBase64 = image?.startsWith("data:");
        const payload = {
          base64Image: isBase64 ? image : undefined,
          url: !isBase64 ? image : undefined,
          ...rest
        };
        const form = this.bld(payload);
        console.log(`[OcrService] Mengirimkan permintaan data ke server...`);
        const response = await client.post("", form, {
          headers: form.getHeaders()
        });
        const data = response?.data;
        if (data?.IsErroredOnProcessing) {
          const errMsg = data?.ErrorMessage?.[0] || "Gagal memproses gambar";
          console.log(`[OcrService] API merespons dengan kendala: ${errMsg}`);
          lastError = {
            error: errMsg,
            details: data
          };
          this.rot();
          attempts++;
          continue;
        }
        console.log(`[OcrService] Pemrosesan selesai.`);
        return this.snk(data);
      } catch (err) {
        const errMsg = err?.message || err;
        console.error(`[OcrService] Kendala pada indeks key ${this.idx}:`, errMsg);
        lastError = {
          error: errMsg
        };
        this.rot();
        attempts++;
      }
    }
    console.log(`[OcrService] Seluruh percobaan dengan API key tidak berhasil.`);
    return this.snk(lastError || {
      error: "Unknown processing failure"
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new OcrService();
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