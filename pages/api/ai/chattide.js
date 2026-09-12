import crypto from "crypto";
import axios from "axios";
class Chattide {
  constructor() {
    this.model = "gpt-4.1-mini";
    this.vtoken = this._gTok();
    this.headers = {};
    this.client = axios.create({
      baseURL: "https://api.chattide.ai",
      headers: {
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://www.chattide.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.chattide.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        source: "web",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        vtoken: this.vtoken,
        ...this.headers
      }
    });
  }
  _gTok() {
    try {
      console.log("[Chattide] Menyiapkan vtoken anonim baru...");
      const rawKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";
      const pubKey = `-----BEGIN PUBLIC KEY-----\n${rawKey}\n-----END PUBLIC KEY-----`;
      const visId = crypto.randomBytes(16).toString("hex");
      const enc = crypto.publicEncrypt({
        key: pubKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(visId, "utf8"));
      console.log("[Chattide] Vtoken berhasil dibuat.");
      return enc.toString("base64");
    } catch (err) {
      console.log("[Chattide] Gagal membuat token:", err?.message || err);
      return "";
    }
  }
  async _conv(img) {
    try {
      if (Buffer.isBuffer(img)) {
        console.log("[Chattide] Memproses gambar dari format Buffer...");
        return `data:image/jpeg;base64,${img.toString("base64")}`;
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[Chattide] Mengunduh gambar dari URL: ${img}...`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          return `data:${mime};base64,${Buffer.from(res.data).toString("base64")}`;
        }
        if (img.startsWith("data:image/")) {
          console.log("[Chattide] Gambar menggunakan format Data URL base64...");
          return img;
        }
        if (/^[A-Za-z0-9+/=]+$/.test(img)) {
          console.log("[Chattide] Gambar menggunakan format raw base64 string...");
          return `data:image/jpeg;base64,${img}`;
        }
      }
      console.log("[Chattide] Tipe gambar tidak didukung atau tidak dikenali.");
      return null;
    } catch (err) {
      console.log("[Chattide] Gagal memproses gambar:", err?.message || err);
      return null;
    }
  }
  _toSnake(obj) {
    try {
      if (Array.isArray(obj)) {
        return obj.map(item => this._toSnake(item));
      }
      if (obj !== null && typeof obj === "object") {
        const temp = {};
        for (const [key, val] of Object.entries(obj)) {
          const sKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
          temp[sKey] = this._toSnake(val);
        }
        return temp;
      }
      return obj;
    } catch (err) {
      console.log("[Chattide] Gagal melakukan konversi snake_case:", err?.message || err);
      return obj;
    }
  }
  async autoCheckCredit() {
    try {
      console.log("[Chattide] Memulai pemeriksaan sisa kredit pengguna...");
      const res = await this.client.get("/aigc/chat/user?score=CHATTIDE", {
        headers: {
          accept: "application/json, text/plain, */*"
        },
        timeout: 18e4
      });
      const status = res?.status === 200 ? true : false;
      const data = res?.data?.data || {};
      console.log("[Chattide] Pemeriksaan kredit selesai.");
      return {
        status: status,
        result: this._toSnake(data),
        chunks: []
      };
    } catch (err) {
      console.log("[Chattide] Gagal melakukan pemeriksaan kredit:", err?.message || err);
      return {
        status: false,
        result: null,
        chunks: []
      };
    }
  }
  async chat({
    prompt,
    messages,
    image,
    ...rest
  }) {
    try {
      console.log("[Chattide] Otomatis memeriksa sisa kredit sebelum mengirim pesan...");
      const creditInfo = await this.autoCheckCredit();
      if (creditInfo?.status) {
        const freeCredit = creditInfo?.result?.chat_data?.free_credit ?? 0;
        console.log(`[Chattide] Sisa kredit gratis terdeteksi: ${freeCredit}`);
      } else {
        console.log("[Chattide] Peringatan: Tidak dapat memverifikasi sisa kredit.");
      }
      console.log("[Chattide] Menyiapkan payload percakapan...");
      const contentList = [];
      if (prompt) {
        contentList.push({
          type: "text",
          text: prompt
        });
      }
      if (image) {
        const images = Array.isArray(image) ? image : [image];
        for (const img of images) {
          const b64 = await this._conv(img);
          if (b64) {
            contentList.push({
              type: "image_url",
              image_url: {
                url: b64
              }
            });
          }
        }
      }
      let finalMessages = messages ? [...messages] : [];
      if (contentList.length > 0) {
        finalMessages.push({
          role: "user",
          content: contentList
        });
      }
      const payload = {
        spaceHandle: true,
        roleId: 0,
        messages: finalMessages,
        conversationId: null,
        model: this.model,
        ...rest
      };
      console.log("[Chattide] Menghubungkan ke layanan API Chattide...");
      const response = await this.client.post("/aigc/chat/v2/professional/stream", payload, {
        headers: {
          accept: "text/event-stream,application/json, text/event-stream",
          "content-type": "application/json",
          lang: "en"
        },
        responseType: "stream"
      });
      let fullText = "";
      const chunks = [];
      console.log("[Chattide] Menerima aliran respon...");
      await new Promise((resolve, reject) => {
        response.data.on("data", chunk => {
          const lines = chunk.toString("utf8").split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              const rawData = trimmed.substring(5);
              if (rawData === "--@DONE@--") continue;
              if (rawData) {
                chunks.push(rawData);
                fullText += rawData;
              }
            }
          }
        });
        response.data.on("end", () => resolve());
        response.data.on("error", err => reject(err));
      });
      console.log("[Chattide] Aliran respon selesai.");
      return {
        status: response?.status === 200 ? true : false,
        result: fullText,
        chunks: chunks
      };
    } catch (err) {
      console.log("[Chattide] Gagal melakukan chat:", err?.message || err);
      return {
        status: false,
        result: "",
        chunks: []
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
  const api = new Chattide();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}