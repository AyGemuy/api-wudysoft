import axios from "axios";
import {
  createHash
} from "crypto";
class NudifyClient {
  constructor(config = {}) {
    try {
      const {
        authToken = null,
          baseURL = "https://api.lovepal.net/v1/",
          timeout = 6e4,
          secretKey = "eac091c790ba144807037553a0517ff9"
      } = config;
      this.secretKey = secretKey;
      this.authToken = authToken;
      this.axios = axios.create({
        baseURL: baseURL,
        timeout: timeout,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://nudify.now",
          pragma: "no-cache",
          referer: "https://nudify.now/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-accept-language": "id",
          "x-app-domain": "nudify.now",
          "x-app-id": "1",
          "x-app-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Makassar",
          "x-app-version": "0.5.29"
        }
      });
      if (this.authToken) {
        this.axios.defaults.headers.common["authorization"] = this.authToken;
      }
      this.axios.interceptors.request.use(this._signRequest.bind(this));
      console.log("[System] NudifyClient berhasil diinisialisasi.");
    } catch (err) {
      console.error("[System Error] Gagal inisialisasi client:", err.message);
    }
  }
  async _req(method, url, data = {}, params = {}) {
    try {
      console.log(`[Request] Melakukan HTTP ${method.toUpperCase()} ke: ${url}`);
      const res = await this.axios({
        method: method,
        url: url,
        data: data,
        params: params
      });
      return res.data?.data || res.data;
    } catch (err) {
      console.error(`[Request Error] Gagal pada ${method.toUpperCase()} ${url}`);
      return {
        error: true,
        message: err.response?.data?.msg || err.message
      };
    }
  }
  async _ensureAuth() {
    try {
      console.log("[Auth] Memeriksa status token otentikasi...");
      if (this.authToken) {
        console.log("[Auth] Menggunakan token aktif yang sudah ada.");
        return {
          success: true
        };
      }
      console.log("[Auth] Token tidak ada. Melakukan login anonim...");
      const data = await this._req("post", "/sso/anonymous-login", {
        invite_code: "3vqoi"
      });
      if (data?.error) return data;
      this.authToken = data?.token;
      if (!this.authToken) {
        console.error("[Auth Error] Respons login tidak mengembalikan token.");
        return {
          error: true,
          message: "Token otentikasi tidak diperoleh"
        };
      }
      this.axios.defaults.headers.common["authorization"] = this.authToken;
      console.log("[Auth] Login anonim berhasil, token baru disimpan.");
      return {
        success: true
      };
    } catch (err) {
      console.error("[Auth Error] Terjadi kesalahan saat otentikasi:", err.message);
      return {
        error: true,
        message: `Otentikasi gagal: ${err.message}`
      };
    }
  }
  _genNonce(len = 16) {
    try {
      const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz123456789";
      return Array.from({
        length: len
      }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    } catch (err) {
      console.error("[Nonce Error] Gagal membuat nonce:", err.message);
      return {
        error: true,
        message: `Gagal generate nonce: ${err.message}`
      };
    }
  }
  _flatten(obj, prefix = "") {
    try {
      if (obj === null || obj === undefined) return [];
      if (typeof obj !== "object") {
        const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
        return [`${enc(prefix)}=${enc(obj)}`];
      }
      return Object.keys(obj).sort().flatMap(k => this._flatten(obj[k], prefix ? `${prefix}[${k}]` : k));
    } catch (err) {
      console.error("[Flatten Error] Gagal menyusun parameter:", err.message);
      return [];
    }
  }
  _signRequest(config) {
    try {
      const timestamp = Math.floor(Date.now() / 1e3);
      const nonce = this._genNonce();
      if (nonce.error) return config;
      if (this.authToken) {
        config.headers["authorization"] = this.authToken;
      }
      const [path, query] = (config.url || "").split("?");
      const existing = Object.fromEntries(new URLSearchParams(query));
      let parsedBody = {};
      if (config.data) {
        if (typeof config.data === "string") {
          try {
            parsedBody = JSON.parse(config.data);
          } catch (e) {}
        } else if (typeof config.data === "object") {
          parsedBody = config.data;
        }
      }
      const queryParams = config.params || {};
      const combined = {
        ...existing,
        ...parsedBody,
        ...queryParams,
        timestamp: timestamp,
        nonce: nonce
      };
      const clean = Object.fromEntries(Object.entries(combined).filter(([_, v]) => v != null));
      const queryString = this._flatten(clean).join("&");
      const base = (this.axios.defaults.baseURL || "").replace(/\/$/, "");
      const normalizedPath = path.startsWith("/") ? path : "/" + path;
      const fullUrl = base + normalizedPath;
      const signBase = fullUrl + queryString + this.secretKey;
      const sign = createHash("md5").update(signBase).digest("hex");
      config.url = path;
      config.params = {
        ...existing,
        ...config.params,
        timestamp: timestamp,
        nonce: nonce,
        sign: sign
      };
      return config;
    } catch (err) {
      console.error("[Sign Error] Gagal memproses signature request:", err.message);
      return config;
    }
  }
  async _prepareImage(image) {
    try {
      console.log("[Image] Menyiapkan format gambar input...");
      let buffer, contentType = "image/jpeg";
      if (Buffer.isBuffer(image)) {
        buffer = image;
        const hex = image.toString("hex", 0, 4);
        if (hex.startsWith("ffd8")) contentType = "image/jpeg";
        else if (hex.startsWith("89504e47")) contentType = "image/png";
        else if (hex.startsWith("474946")) contentType = "image/gif";
        else if (hex.startsWith("52494646")) contentType = "image/webp";
      } else if (typeof image === "string") {
        if (image.startsWith("http")) {
          console.log("[Image] Mengunduh gambar dari URL...");
          const res = await axios.get(image, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          contentType = res.headers["content-type"] || contentType;
        } else {
          console.log("[Image] Membaca gambar dari format Base64...");
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          buffer = Buffer.from(matches ? matches[2] : image, "base64");
          if (matches) contentType = matches[1];
        }
      } else {
        console.error("[Image Error] Format input gambar tidak valid.");
        return {
          error: true,
          message: "Format gambar tidak didukung"
        };
      }
      console.log(`[Image] Berhasil disiapkan. Tipe: ${contentType}, Ukuran: ${buffer.length} bytes`);
      return {
        buffer: buffer,
        contentType: contentType,
        fileName: `img_${Date.now()}.${contentType.split("/")[1] || "jpg"}`
      };
    } catch (err) {
      console.error("[Image Error] Gagal menyiapkan gambar:", err.message);
      return {
        error: true,
        message: `Image preparation failed: ${err.message}`
      };
    }
  }
  async generate({
    image,
    ...opts
  }) {
    try {
      console.log("[Process] Memulai tahapan generate...");
      const authStatus = await this._ensureAuth();
      if (authStatus.error) return {
        status: 401,
        result: authStatus
      };
      const imgData = await this._prepareImage(image);
      if (imgData.error) return {
        status: 400,
        result: imgData
      };
      console.log("[Upload] Mengajukan URL upload penyimpanan ke server...");
      const uploadDetails = await this._req("post", "get-upload-url", {
        file_name: imgData.fileName,
        content_type: imgData.contentType
      });
      if (uploadDetails.error) return {
        status: 500,
        result: uploadDetails
      };
      console.log("[Upload] Mengunggah file gambar ke server penyimpanan...");
      await axios.put(uploadDetails.url, imgData.buffer, {
        headers: {
          "Content-Type": imgData.contentType
        }
      });
      console.log("[Upload] Unggah file berhasil diselesaikan.");
      console.log("[Job] Mengirim instruksi pemrosesan ke server...");
      const seed = () => Math.floor(Math.random() * 1e9);
      const run = await this._req("post", "tool/runpod", {
        tool_id: "29",
        input: JSON.stringify({
          image: uploadDetails.key,
          seed: opts.seed || seed(),
          seed1: opts.seed1 || seed(),
          seed2: opts.seed2 || seed(),
          seed3: opts.seed3 || seed(),
          aspectRatio: opts.aspectRatio || "1:1",
          mode: opts.mode || "Remove all clothing, bikinis, bathing suits, bras, panties, pants, shorts, dresses, tops, and any fabric from every woman's body in the image, making them completely nude and naked. Keep the original poses, body shapes, skin details, expressions, movements, hair, lighting, background, and camera angle exactly the same. Highly detailed skin texture, natural body proportions, realistic nudity.",
          breast_size: opts.breast_size || "Small",
          pussy_haircut: opts.pussy_haircut || opts.pussy_haircut || "Shaved",
          age: opts.age || "Young",
          body_type: opts.body_type || "Slim"
        }),
        original_input: JSON.stringify({
          mode: opts.mode ? "Undress" : "",
          breast_size: opts.breast_size || "",
          pussy_haircut: opts.pussy_haircut || opts.pussy_haircut || "",
          age: opts.age || "",
          body_type: opts.body_type || ""
        })
      });
      if (run.error) return {
        status: 500,
        result: run
      };
      if (!run.pid) {
        console.error("[Job Error] Server tidak mengembalikan PID pemrosesan.");
        return {
          status: 500,
          result: {
            error: true,
            message: "Server did not return a valid PID",
            details: run
          }
        };
      }
      let progress, attempts = 0;
      console.log(`[Job] Menunggu antrean. Polling dimulai untuk PID: ${run.pid}`);
      do {
        if (attempts++ > 60) {
          console.error("[Job Error] Proses polling mencapai batas waktu (timeout).");
          return {
            status: 408,
            result: {
              error: true,
              message: "Polling timeout"
            }
          };
        }
        await new Promise(r => setTimeout(r, 3e3));
        progress = await this._req("get", "tool/get-prediction-progress", {}, {
          pid: run.pid
        });
        if (progress.error) return {
          status: 500,
          result: progress
        };
        console.log(`[Job] Status PID ${run.pid}: ${progress.progress || 0}% selesai`);
      } while (progress.status !== 1);
      console.log("[Result] Mengambil daftar hasil output yang berhasil diproses...");
      const listRes = await this._req("post", "generated/output-list", {
        tool_id: 29,
        p: 1,
        pid: run.pid
      });
      if (listRes.error) return {
        status: 500,
        result: listRes
      };
      console.log("[Process] Seluruh tahapan selesai diproses dengan sukses.");
      return {
        status: 200,
        result: {
          pid: run.pid,
          prediction_id: run.prediction_id,
          output_urls: progress.output || [],
          list: listRes.list || [],
          progress: progress
        }
      };
    } catch (err) {
      console.error("[Process Error] Kegagalan sistem saat eksekusi:", err.message);
      return {
        status: 500,
        result: {
          error: true,
          message: err.message,
          details: null
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
  const api = new NudifyClient();
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