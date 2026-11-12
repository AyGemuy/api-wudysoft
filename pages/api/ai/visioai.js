import crypto from "crypto";
import axios from "axios";
class AzuraAI {
  constructor() {
    this.cfg = {
      baseURL: "https://api.azuraglobal.vn",
      clientId: "as083",
      clientSecret: "as083-prod",
      packageName: "com.visioai.photogenerator.art.anime",
      userAgent: "VisioAI: AI Photo Generator/1.0.1 (com.visioai.photogenerator.art.anime;build:4;Android 15) okhttp/5.3.2"
    };
  }
  getH(method, path, body) {
    try {
      console.log(`[INFO] Menyusun signature untuk ${method} ${path}...`);
      const ts = Math.floor(Date.now() / 1e3);
      const bodyStr = JSON.stringify(body);
      const hash = crypto.createHash("sha256").update(bodyStr).digest("hex");
      const signStr = `${method}\n${path}\n${ts}\n${hash}`;
      const sign = crypto.createHmac("sha256", this.cfg.clientSecret).update(signStr).digest("hex");
      console.log(`[SUCCESS] Signature berhasil dibuat: ${sign.slice(0, 8)}...`);
      return {
        "User-Agent": this.cfg.userAgent,
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        authorization: `Bearer ${this.cfg.clientId}`,
        "x-timestamp": String(ts),
        "x-signature": sign,
        "x-package-name": this.cfg.packageName,
        "x-integrity-token": "Error"
      };
    } catch (err) {
      console.error("[ERROR] Gagal membuat header/signature:", err.message);
      throw err;
    }
  }
  async resImg(imgInput) {
    try {
      if (!imgInput) return null;
      if (Buffer.isBuffer(imgInput)) {
        console.log("[PROCESS] Mendeteksi input image: Buffer. Mengonversi ke Base64...");
        return imgInput.toString("base64");
      }
      if (typeof imgInput === "string" && (imgInput.startsWith("http://") || imgInput.startsWith("https://"))) {
        console.log(`[PROCESS] Mendeteksi input image: URL. Mengunduh dari ${imgInput}...`);
        const res = await axios.get(imgInput, {
          responseType: "arraybuffer"
        });
        console.log("[SUCCESS] Gambar berhasil diunduh dan dikonversi ke Base64.");
        return Buffer.from(res.data, "binary").toString("base64");
      }
      if (typeof imgInput === "string") {
        console.log("[PROCESS] Mendeteksi input image: Base64 string. Memvalidasi format...");
        if (imgInput.includes(",")) {
          console.log("[INFO] Membersihkan data URI prefix pada Base64.");
          return imgInput.split(",")[1];
        }
        return imgInput;
      }
      throw new Error("Format input gambar tidak dikenali (Harus URL/Buffer/Base64).");
    } catch (err) {
      console.error("[ERROR] Gagal memproses data gambar:", err.message);
      throw err;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log("[START] Memulai proses pembuatan gambar...");
      const body = {
        height: rest.height || 1024,
        output_format: rest.output_format || "png",
        prompt: prompt,
        response_format: rest.response_format || "url",
        steps: rest.steps || 30,
        strength: rest.strength || .75,
        width: rest.width || 1024,
        ...rest
      };
      let endpoint = "text-to-image";
      if (image) {
        console.log("[INFO] Input gambar terdeteksi. Berpindah ke Mode: Image-to-Image (I2I).");
        endpoint = "image-to-image";
        const imgs = Array.isArray(image) ? image : [image];
        const processed = [];
        console.log(`[PROCESS] Memproses total ${imgs.length} gambar...`);
        for (const img of imgs) {
          const b64 = await this.resImg(img);
          if (b64) processed.push(b64);
        }
        if (processed.length > 0) {
          body.image = processed.length === 1 ? processed[0] : processed;
          console.log(`[SUCCESS] Berhasil memuat ${processed.length} gambar ke payload.`);
        }
      } else {
        console.log("[INFO] Tidak ada input gambar. Mode: Text-to-Image (T2I).");
      }
      const path = `/gen_img/v1/stable-diffusion/${endpoint}`;
      const headers = this.getH("POST", path, body);
      console.log(`[API REQUEST] Mengirimkan data ke ${this.cfg.baseURL}${path}...`);
      const res = await axios({
        method: "POST",
        url: `${this.cfg.baseURL}${path}`,
        headers: headers,
        data: body,
        responseType: "json"
      });
      console.log("[API RESPONSE] Respons diterima dari server. Memproses output gambar...");
      const data = res.data;
      return data;
    } catch (err) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error("[FATAL ERROR] Proses gen() gagal total:", errMsg);
      throw new Error(`AzuraAI Error: ${errMsg}`);
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
  const api = new AzuraAI();
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