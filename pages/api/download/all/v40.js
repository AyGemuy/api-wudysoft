import axios from "axios";
import https from "https";
class VideoDownloader {
  constructor() {
    try {
      console.log("[LOG: INIT] Mengonfigurasi client downloader...");
      this.agt = new https.Agent({
        rejectUnauthorized: false
      });
      this.client = axios.create({
        baseURL: "http://209.38.122.53:3000",
        httpsAgent: this.agt,
        headers: {
          "User-Agent": "okhttp/5.2.1",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json"
        }
      });
      this.rules = [{
        id: "1",
        pattern: /instagram\.com|instagr\.am/i
      }, {
        id: "2",
        pattern: /facebook\.com|fb\.watch|fb\.com/i
      }, {
        id: "3",
        pattern: /twitter\.com|x\.com/i
      }, {
        id: "4",
        pattern: /tiktok\.com/i
      }, {
        id: "5",
        pattern: /pinterest\.com|pin\.it/i
      }, {
        id: "6",
        pattern: /mediafire\.com/i
      }, {
        id: "7",
        pattern: /capcut\.com/i
      }, {
        id: "8",
        pattern: /drive\.google\.com|gdrive/i
      }];
      console.log("[LOG: INIT] Aturan deteksi regex dan client siap digunakan.");
    } catch (err) {
      console.error("[LOG: ERROR] Gagal menginisialisasi client:", err?.message);
      throw err;
    }
  }
  det(url) {
    console.log("[LOG: DETECT] Memulai analisis pencocokan pola URL...");
    try {
      const targetUrl = url || "";
      const matchedRule = this.rules.find(rule => rule.pattern.test(targetUrl));
      const id = matchedRule ? matchedRule.id : "0";
      console.log(`[LOG: DETECT] Pola cocok ditemukan. ID Downloader: "${id}"`);
      return id;
    } catch (err) {
      console.error("[LOG: ERROR] Terjadi kesalahan saat deteksi pola URL:", err?.message);
      return "0";
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[LOG: GENERATE] Memproses penyiapan permintaan unduhan video...");
    try {
      const targetUrl = url || "";
      if (!targetUrl) {
        throw new Error("URL target kosong atau tidak valid.");
      }
      const detectedId = this.det(targetUrl);
      const payload = {
        downloader: detectedId,
        videolink: targetUrl,
        ...rest
      };
      console.log("[LOG: GENERATE] Mengirim permintaan ke server:", JSON.stringify(payload));
      const res = await this.client.post("/api/video", payload);
      console.log("[LOG: GENERATE] Respons berhasil diterima dari server.");
      return res?.data || null;
    } catch (err) {
      console.error("[LOG: ERROR] Gagal memproses permintaan unduhan video:", err?.response?.data || err?.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new VideoDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}