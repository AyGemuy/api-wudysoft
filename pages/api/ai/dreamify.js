import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class DreamifyClient {
  constructor() {
    this._catalog = null;
    this.MODES = ["text", "cartoon"];
    this.DEFAULT_STYLE = "Fantasy";
    this.DEFAULT_SIZE = "square_hd";
    this.HMAC_SECRET = "SPnyAoMCDal5qKmmfngoYfNWYr3cSvvTwDKLR860qMmz4pikJy";
    this.AUTH_TOKEN = "Z4KW0R6ClrQew4XkyuXN44j9IQbZE5I9vKLuiFSwtIOzncPHBs";
    this.BASE_URL = "https://janbarkcloud.com/dreamify-playground-v2";
    this.PATH_TEXT = "/user-creation/v1";
    this.PATH_CARTOON = "/user-creation/cartoonify/v1";
    this.NONCE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  }
  _hmac(input) {
    try {
      console.log(`[Crypto] Generating HMAC-SHA256 untuk input: "${input}"`);
      const hmac = crypto.createHmac("sha256", Buffer.from(this.HMAC_SECRET, "utf8")).update(Buffer.from(input, "utf8")).digest("base64");
      console.log(`[Crypto] HMAC berhasil dibuat: ${hmac.slice(0, 15)}...`);
      return hmac;
    } catch (err) {
      console.error("[Crypto Error] Gagal membuat HMAC:", err.message);
      throw err;
    }
  }
  _nonce(len = 15) {
    try {
      const chars = [];
      for (let i = 0; i < len; i++) {
        const micros = Math.floor(performance.now() * 1e3) + i;
        chars.push(this.NONCE_CHARS[micros % 62]);
      }
      const nonceResult = chars.join("");
      console.log(`[Crypto] Nonce digenerate: ${nonceResult}`);
      return nonceResult;
    } catch (err) {
      console.error("[Crypto Error] Gagal membuat nonce:", err.message);
      throw err;
    }
  }
  _headers(method, path, body, extra = {}) {
    try {
      console.log(`[Headers] Menyusun struktur security header untuk [${method}] ${path}`);
      const ts = Math.floor(Date.now() / 1e3).toString();
      const nonce = this._nonce(15);
      const signature = this._hmac(`${method}|${path}|${ts}|${nonce}|${body}`);
      return {
        ...extra,
        Authorization: this.AUTH_TOKEN,
        "X-App-Timestamp": ts,
        "X-App-Nonce": nonce,
        "X-App-Signature": signature
      };
    } catch (err) {
      console.error("[Headers Error] Gagal menyusun security headers:", err.message);
      throw err;
    }
  }
  async _post(path, form, bodyString) {
    try {
      console.log(`[Req] Mempersiapkan POST request ke ke jalur: ${path}`);
      const headers = this._headers("POST", path, bodyString, form.getHeaders());
      console.log(`[Req] Mengirim data FormData ke ${this.BASE_URL}${path}...`);
      const res = await axios.post(`${this.BASE_URL}${path}`, form, {
        headers: headers,
        timeout: 3e4,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      console.log(`[Req] HTTP Server merespons dengan status: ${res.status}`);
      const parsedData = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      console.log(`[Req] Berhasil parse data respons dari ${path}`);
      return parsedData;
    } catch (err) {
      console.error(`[Error Req] Gagal memproses POST ${path}:`, err.message);
      if (err.response && err.response.data) {
        console.error("[Error Detail API 4xx/500]:", JSON.stringify(err.response.data, null, 2));
      }
      return {
        success: false,
        error: err.response ? err.response.data : err.message
      };
    }
  }
  async _toBuf(input, useAuth = false) {
    try {
      if (Buffer.isBuffer(input)) {
        console.log("[Image] Input terdeteksi sudah berbentuk Buffer.");
        return input;
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log(`[Image] Mendownload file gambar dari URL eksternal: ${input.slice(0, 50)}...`);
          const config = {
            responseType: "arraybuffer",
            timeout: 2e4
          };
          if (useAuth) {
            console.log("[Image] Download menggunakan header Authorization tambahan.");
            config.headers = {
              Authorization: this.AUTH_TOKEN
            };
          }
          const res = await axios.get(input, config);
          console.log(`[Image] Download sukses! Ukuran buffer: ${res.data.byteLength} bytes.`);
          return Buffer.from(res.data);
        }
        console.log("[Image] Mengonversi string Base64 langsung menjadi Buffer...");
        const b64 = input.replace(/^data:image\/\w+;base64,/, "");
        return Buffer.from(b64, "base64");
      }
      console.warn("[Image] Format objek gambar tidak valid / kosong.");
      return {
        success: false,
        error: "Format gambar tidak dikenali atau kosong."
      };
    } catch (err) {
      console.error("[Error Image] Prosedur _toBuf mengalami kendala:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async init() {
    try {
      console.log("[Init Catalog] Menghubungi endpoint /content/fetch-all...");
      const res = await axios.post(`${this.BASE_URL}/content/fetch-all`, {}, {
        headers: {
          Authorization: this.AUTH_TOKEN,
          "Content-Type": "application/json"
        },
        timeout: 15e3
      });
      const r = res.data?.result;
      if (!r) {
        console.error('[Init Catalog Error] Struktur "result" tidak ditemukan pada respons API.');
        return {
          success: false,
          error: "fetch-all: result kosong"
        };
      }
      this._catalog = {
        styles: r.styles ?? [],
        imageSizes: r.image_sizes ?? [],
        prompts: r.prompts ?? []
      };
      console.log(`[Init Catalog] Sukses memuat ${this._catalog.styles.length} styles & ${this._catalog.imageSizes.length} sizes.`);
      return this._catalog;
    } catch (err) {
      console.error("[Error Init Catalog] Gagal mengambil konfigurasi awal:", err.message);
      return {
        success: false,
        error: err.response ? err.response.data : err.message
      };
    }
  }
  async _ensure() {
    try {
      if (this._catalog) {
        console.log("[Ensure] Catalog sudah siap di memori. Lewati proses fetch.");
        return this._catalog;
      }
      console.log("[Ensure] Catalog belum tersedia. Menjalankan inisialisasi wajib...");
      return await this.init();
    } catch (err) {
      console.error("[Error Ensure] Gagal memastikan ketersediaan katalog:", err.message);
      throw err;
    }
  }
  _valid(mode, params) {
    try {
      console.log(`[Validation] Melakukan validasi parameter untuk mode: [${mode}]`);
      if (!this.MODES.includes(mode)) {
        return {
          success: false,
          error: `Mode '${mode}' tidak valid. Pilihan: ${this.MODES.join(", ")}`
        };
      }
      if (mode === "text" && !params.prompt) {
        return {
          success: false,
          error: "Mode 'text' membutuhkan parameter 'prompt'."
        };
      }
      if (mode === "cartoon" && !params.image) {
        return {
          success: false,
          error: "Mode 'cartoon' membutuhkan parameter objek 'image'."
        };
      }
      const styleNames = this._catalog.styles.map(s => s.name);
      if (!styleNames.includes(params.style)) {
        return {
          success: false,
          error: `Style "${params.style}" tidak tersedia di katalog. Pilihan: ${styleNames.join(", ")}`
        };
      }
      if (!this._catalog.imageSizes.includes(params.imageSize)) {
        return {
          success: false,
          error: `image_size "${params.imageSize}" tidak valid. Pilihan: ${this._catalog.imageSizes.join(", ")}`
        };
      }
      console.log("[Validation] Seluruh pemeriksaan parameter berhasil dilewati (VALID).");
      return null;
    } catch (err) {
      console.error("[Error Validation] Terjadi interupsi saat memproses data validasi:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _runText({
    style,
    imageSize,
    prompt
  }) {
    try {
      console.log("[Worker Text] Menyusun payload untuk Text Generation...");
      const bodyString = `{"image_size":"${imageSize}","style":"${style}","prompt":"${prompt}"}`;
      const form = new FormData();
      form.append("image_size", String(imageSize), {
        contentType: ""
      });
      form.append("style", String(style), {
        contentType: ""
      });
      form.append("prompt", String(prompt), {
        contentType: ""
      });
      return await this._post(this.PATH_TEXT, form, bodyString);
    } catch (err) {
      console.error("[Error Worker Text] Eksekusi worker gagal:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _runCartoon({
    style,
    imageSize,
    prompt,
    image
  }) {
    try {
      console.log("[Worker Cartoon] Memulai pemrosesan transformasi gambar ke kartun...");
      const buf = await this._toBuf(image);
      if (buf && buf.success === false) {
        console.error("[Worker Cartoon Abort] Proses konversi buffer gambar bermasalah.");
        return buf;
      }
      let bodyString = "";
      if (prompt) {
        bodyString = `{"image_size":"${imageSize}","style":"${style}","prompt":"${prompt}"}`;
      } else {
        bodyString = `{"image_size":"${imageSize}","style":"${style}"}`;
      }
      const form = new FormData();
      form.append("image_size", String(imageSize), {
        contentType: ""
      });
      form.append("style", String(style), {
        contentType: ""
      });
      if (prompt) {
        form.append("prompt", String(prompt), {
          contentType: ""
        });
      }
      form.append("image", buf, {
        filename: "upload.jpg",
        contentType: "image/jpeg"
      });
      return await this._post(this.PATH_CARTOON, form, bodyString);
    } catch (err) {
      console.error("[Error Worker Cartoon] Eksekusi worker gagal:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async generate({
    mode,
    ...rest
  }) {
    try {
      console.log(`\n===============================================================`);
      console.log(`[Generate] Memulai alur pembuatan konten Baru untuk mode: [${mode}]`);
      console.log(`===============================================================`);
      if (!this.MODES.includes(mode)) {
        console.warn(`[Generate Warning] Percobaan masuk dibatalkan. Mode "${mode}" tidak terdaftar.`);
        return {
          success: false,
          error: `Mode '${mode}' tidak valid. Pilihan: ${this.MODES.join(", ")}`
        };
      }
      const style = rest.style || this.DEFAULT_STYLE;
      const imageSize = rest.imageSize || rest.image_size || this.DEFAULT_SIZE;
      const mergedParams = {
        mode: mode,
        style: style,
        imageSize: imageSize,
        ...rest
      };
      mergedParams.imageSize = imageSize;
      const ensureResult = await this._ensure();
      if (ensureResult && ensureResult.success === false) {
        console.error("[Generate Abort] Alur dihentikan karena kegagalan pemuatan katalog eksternal.");
        return ensureResult;
      }
      const validResult = this._valid(mode, mergedParams);
      if (validResult && validResult.success === false) {
        console.error("[Generate Abort] Parameter input tidak lolos tahap verifikasi.");
        return validResult;
      }
      switch (mode) {
        case "text":
          return await this._runText({
            style: style,
            imageSize: imageSize,
            prompt: rest.prompt
          });
        case "cartoon":
          return await this._runCartoon({
            style: style,
            imageSize: imageSize,
            prompt: rest.prompt,
            image: rest.image
          });
        default:
          return {
            success: false,
              error: `Mode '${mode}' terdaftar tapi tidak memiliki modul penanganan.`
          };
      }
    } catch (err) {
      console.error("[Fatal Error Generate] Gangguan tidak terduga pada fungsi inti utama:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new DreamifyClient();
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