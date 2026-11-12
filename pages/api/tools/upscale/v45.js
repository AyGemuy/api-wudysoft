import axios from "axios";
import FormData from "form-data";
class Swiftspeed {
  constructor() {
    this.client = axios.create({
      baseURL: "https://swiftspeed.app/build",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.7871.124 Mobile Safari/537.36",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Accept-Language": "id-ID,id;q=0.5",
        Referer: "https://localhost/",
        "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Android WebView";v="150"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }
  async _slp(ms) {
    try {
      console.log(`[Jeda] Menunggu proses selama ${ms} ms...`);
      return new Promise(resolve => setTimeout(resolve, ms));
    } catch (error) {
      console.log("[Jeda] Terjadi kesalahan pada jeda waktu:", error?.message || error);
    }
  }
  async _buf(input) {
    try {
      console.log("[Buffer] Mengidentifikasi format masukan gambar...");
      if (Buffer.isBuffer(input)) {
        console.log("[Buffer] Input berupa objek Buffer.");
        return input;
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log("[Buffer] Input berupa tautan URL, memulai unduhan...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          console.log("[Buffer] Unduhan gambar berhasil diselesaikan.");
          return Buffer.from(res?.data);
        }
        if (input.startsWith("data:image")) {
          console.log("[Buffer] Input berupa skema Data URI Base64, memproses...");
          const base64Data = input.split(",")[1] || input;
          return Buffer.from(base64Data, "base64");
        }
        console.log("[Buffer] Input berupa string Base64 standar, mengonversi...");
        return Buffer.from(input, "base64");
      }
      console.log("[Buffer] Format tidak didukung.");
      return null;
    } catch (error) {
      console.log("[Buffer] Kegagalan konversi buffer:", error?.message || error);
      return null;
    }
  }
  async upscale({
    image,
    ...rest
  }) {
    try {
      console.log("[Sistem] Memulai validasi parameter wajib...");
      if (!image) {
        console.log('[Sistem] Gagal: Parameter "image" wajib diisi.');
        return {
          status: "error",
          result: {
            error_message: 'Parameter "image" wajib diisi'
          }
        };
      }
      const imgBuf = await this._buf(image);
      if (!imgBuf) {
        return {
          status: "error",
          result: {
            error_message: "Gagal mengubah input gambar menjadi format Buffer"
          }
        };
      }
      console.log("[Sistem] Menyiapkan struktur form-data...");
      const form = new FormData();
      form.append("file", imgBuf, {
        filename: "upload_image.png"
      });
      const payload = {
        scale: "4",
        ...rest
      };
      for (const [key, val] of Object.entries(payload)) {
        form.append(key, String(val));
      }
      const reqHeaders = {
        ...form.getHeaders(),
        "Accept-Encoding": "gzip"
      };
      console.log("[Sistem] Mengirimkan berkas gambar ke server...");
      const uploadRes = await this.client.post("/api/v2/tools/upscale", form, {
        headers: reqHeaders
      });
      const jobId = uploadRes?.data?.job_id || null;
      if (!jobId) {
        return {
          status: "error",
          result: {
            error_message: "ID pekerjaan tidak ditemukan dalam respons server"
          }
        };
      }
      console.log(`[Sistem] Pekerjaan diterima oleh antrean server. ID Pekerjaan: ${jobId}`);
      let state = "pending";
      let resultsData = [];
      let attempts = 0;
      const maxAttempts = 60;
      while (state !== "done" && attempts < maxAttempts) {
        attempts++;
        console.log(`[Sistem] Memeriksa status pekerjaan (Percobaan ${attempts}/${maxAttempts})...`);
        const checkRes = await this.client.get(`/api/v2/tools/upscale/status/${jobId}`);
        const serverStatus = checkRes?.data?.status || "pending";
        if (serverStatus === "done") {
          resultsData = checkRes?.data?.results || [];
          state = "done";
          console.log("[Sistem] Proses pada server selesai.");
          break;
        }
        if (serverStatus === "failed") {
          return {
            status: "error",
            result: {
              error_message: "Server melaporkan kegagalan proses peningkatan resolusi"
            }
          };
        }
        console.log("[Sistem] Proses masih berjalan di server, bersiap menunggu...");
        await this._slp(3e3);
      }
      if (state !== "done") {
        return {
          status: "error",
          result: {
            error_message: "Batas waktu pemrosesan pekerjaan habis"
          }
        };
      }
      const formattedResults = resultsData.map(item => ({
        token: item?.token || "",
        filename: item?.filename || "",
        original_size: item?.original_size || 0,
        processed_size: item?.processed_size || 0,
        preview_url: item?.preview_url ? `https://swiftspeed.app/build${item.preview_url}` : "",
        download_url: item?.download_url ? `https://swiftspeed.app/build${item.download_url}` : "",
        engine: item?.engine || "",
        engine_label: item?.engine_label || ""
      }));
      return {
        status: "success",
        result: {
          job_id: jobId,
          results: formattedResults
        }
      };
    } catch (error) {
      console.log("[Sistem] Terjadi kesalahan tidak terduga:", error?.message || error);
      return {
        status: "error",
        result: {
          error_message: error?.message || "Proses dihentikan karena gangguan sistem internal"
        }
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
  const api = new Swiftspeed();
  try {
    const data = await api.upscale(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}