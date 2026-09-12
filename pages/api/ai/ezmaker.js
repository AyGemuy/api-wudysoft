import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class EzMakerClient {
  constructor() {
    this._PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
    this._BRAND_NAME = "ezmaker.ai";
    this._BRAND_ID = 37;
    this._BASE_URL = "https://api.ezmaker.ai";
    this.originFrom = crypto.createHash("md5").update(this._BRAND_NAME).digest("hex").substring(8, 24);
    this._defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      origin: "https://ezmaker.ai",
      referer: "https://ezmaker.ai/",
      "theme-version": "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    this.client = axios.create({
      baseURL: this._BASE_URL,
      timeout: 36e4
    });
  }
  _uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16));
  }
  _rand16() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: 16
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  _aesEncrypt(text, key, iv) {
    const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }
  _rsaEncrypt(text, publicKey) {
    return crypto.publicEncrypt({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(text)).toString("base64");
  }
  async _resolveImg(imageInput) {
    try {
      if (Buffer.isBuffer(imageInput)) {
        return {
          success: true,
          buffer: imageInput,
          filename: "image.jpg",
          contentType: "image/jpeg"
        };
      }
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
          const res = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          const contentType = res.headers["content-type"] || "image/jpeg";
          const extension = contentType.split("/")[1] || "jpg";
          return {
            success: true,
            buffer: Buffer.from(res.data),
            filename: `image.${extension}`,
            contentType: contentType
          };
        }
        if (imageInput.startsWith("data:image")) {
          const matches = imageInput.match(/^data:(image\/[a-z]+);base64,(.+)$/);
          if (matches) {
            const contentType = matches[1];
            const extension = contentType.split("/")[1] || "jpg";
            const buffer = Buffer.from(matches[2], "base64");
            return {
              success: true,
              buffer: buffer,
              filename: `image.${extension}`,
              contentType: contentType
            };
          }
        }
        const buffer = Buffer.from(imageInput, "base64");
        return {
          success: true,
          buffer: buffer,
          filename: "image.jpg",
          contentType: "image/jpeg"
        };
      }
      return {
        success: false,
        error: "Format input gambar tidak didukung"
      };
    } catch (err) {
      return {
        success: false,
        error: err?.message || "Gagal memproses berkas gambar"
      };
    }
  }
  _gHd(isUpload = false) {
    const now = new Date();
    const utcSeconds = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) / 1e3);
    const nonce = this._uuidv4();
    const aesSecret = this._rand16();
    const secretKey = this._rsaEncrypt(aesSecret, this._PUBLIC_KEY);
    const fp = "d8953cb6d9f87645a0a61edcaeddd0d3";
    const fp1Plain = `aifaceswap:${fp}`;
    const fp1 = this._aesEncrypt(fp1Plain, aesSecret, aesSecret);
    const headers = {
      ...this._defaultHeaders
    };
    headers["x-code"] = Date.now().toString();
    if (isUpload) {
      const signuxPlain = `aifaceswap:${nonce}:${secretKey}`;
      const signuxEncrypted = this._aesEncrypt(signuxPlain, aesSecret, aesSecret);
      headers["x-guide"] = secretKey;
      headers["x-sign"] = signuxEncrypted;
      headers["fp"] = fp;
      headers["fp1"] = fp1;
    } else {
      headers["fp"] = fp;
      headers["fp1"] = fp1;
      headers["x-guide"] = secretKey;
    }
    return headers;
  }
  async _upImg(imageInput) {
    try {
      console.log("[Process] Mengonversi data gambar...");
      const resolveRes = await this._resolveImg(imageInput);
      if (!resolveRes.success) {
        return {
          success: false,
          error: resolveRes.error
        };
      }
      const {
        buffer,
        filename,
        contentType
      } = resolveRes;
      console.log("[Process] Mengunggah gambar ke server CDN...");
      const form = new FormData();
      form.append("file", buffer, {
        filename: filename,
        contentType: contentType
      });
      form.append("fn_name", "demo-qwen-image-editor");
      form.append("request_from", String(this._BRAND_ID));
      form.append("origin_from", this.originFrom);
      const headers = this._gHd(true);
      Object.assign(headers, form.getHeaders());
      const res = await this.client.post("/aitools/upload-img-cdn", form, {
        headers: headers
      });
      if (res.data?.code !== 200) {
        return {
          success: false,
          error: `Gagal mengunggah gambar: ${res.data?.message || "Tidak ada respon"}`
        };
      }
      const relativeUrl = res.data?.data?.url;
      const fullUrl = relativeUrl?.startsWith("http") ? relativeUrl : `https://temp.ezmaker.ai/${relativeUrl}`;
      console.log(`[Success] Gambar berhasil diunggah: ${fullUrl}`);
      return {
        success: true,
        url: fullUrl
      };
    } catch (err) {
      console.error("[Error] Terjadi kegagalan saat proses unggah:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Kesalahan jaringan saat unggah"
      };
    }
  }
  async _upAll(imageInput) {
    if (!imageInput) {
      return {
        success: true,
        urls: []
      };
    }
    const inputs = Array.isArray(imageInput) ? imageInput : [imageInput];
    const urls = [];
    for (let i = 0; i < inputs.length; i++) {
      const uploadRes = await this._upImg(inputs[i]);
      if (!uploadRes.success) {
        return {
          success: false,
          error: `Gagal mengunggah gambar ke-${i + 1}: ${uploadRes.error}`
        };
      }
      urls.push(uploadRes.url);
    }
    return {
      success: true,
      urls: urls
    };
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log("[Process] Memulai transaksi baru...");
      const uploadResult = await this._upAll(image);
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error
        };
      }
      const uploadedUrls = uploadResult.urls || [];
      const isI2I = uploadedUrls.length > 0;
      const defaultFnName = isI2I ? "demo-qwen-image-editor" : "demo-ez-text2image";
      const defaultAspectRatio = isI2I ? "auto" : "1:1";
      const payloadInput = isI2I ? {
        mode: uploadedUrls.length > 1 ? "Multi Fusion" : "Single Edit",
        source_images: uploadedUrls,
        prompt: prompt || "Change hair color to platinum blonde",
        aspect_ratio: defaultAspectRatio,
        request_from: this._BRAND_ID
      } : {
        prompt: prompt || "A dark blue gradient background slide",
        aspect_ratio: defaultAspectRatio,
        request_from: this._BRAND_ID
      };
      console.log(`[Process] Membuat tugas pemrosesan (${isI2I ? "I2I" : "T2I"})...`);
      const payload = {
        fn_name: defaultFnName,
        call_type: 3,
        request_from: this._BRAND_ID,
        origin_from: this.originFrom,
        ...rest,
        input: {
          ...payloadInput,
          ...rest?.input
        }
      };
      const createRes = await this.client.post("/aitools/of/create", payload, {
        headers: this._gHd(false)
      });
      if (createRes.data?.code !== 200) {
        return {
          success: false,
          error: `Gagal membuat antrean tugas: ${createRes.data?.message || "Respon tidak valid"}`
        };
      }
      const taskId = createRes.data?.data?.task_id;
      const pointsType = createRes.data?.data?.points_type || 0;
      const activeFnName = payload.fn_name;
      console.log(`[Success] Tugas terdaftar. Task ID: ${taskId}`);
      console.log("[Process] Menghubungkan ke sistem pemantauan status...");
      let isCompleted = false;
      let finalResult = "";
      let attempts = 0;
      const maxAttempts = 360;
      while (!isCompleted && attempts < maxAttempts) {
        attempts++;
        const statusRes = await this.client.post("/aitools/of/check-status", {
          task_id: taskId,
          fn_name: activeFnName,
          call_type: 3,
          consume_type: pointsType,
          request_from: this._BRAND_ID,
          origin_from: this.originFrom
        }, {
          headers: this._gHd(false)
        });
        if (statusRes.data?.code !== 200) {
          return {
            success: false,
            error: `Gagal membaca status tugas: ${statusRes.data?.message || "Respon tidak valid"}`
          };
        }
        const data = statusRes.data?.data || {};
        const status = data.status;
        if (status === 0) {
          console.log(`[Status] Tugas berada dalam antrean. Posisi: ${data.rank || 0}/${data.queue_len || 0} (Upaya ${attempts}/${maxAttempts})`);
        } else if (status === 1) {
          console.log(`[Status] Mesin sedang memproses grafis... (Upaya ${attempts}/${maxAttempts})`);
        } else if (status === 2) {
          const rawResultPath = data.result_image;
          finalResult = rawResultPath?.startsWith("http") ? rawResultPath : `https://temp.ezmaker.ai/${rawResultPath}`;
          console.log(`[Success] Pemrosesan selesai. Hasil: ${finalResult}`);
          isCompleted = true;
        } else if (status === 3) {
          return {
            success: false,
            error: `Sistem melaporkan kegagalan proses: ${data.error || "Unknown error"}`
          };
        } else {
          console.log(`[Warning] Status tidak dikenal: ${status}`);
        }
        if (!isCompleted && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3e3));
        }
      }
      if (!isCompleted) {
        return {
          success: false,
          error: "Mencapai batas waktu maksimum pemantauan tugas (timeout 180s)"
        };
      }
      return {
        success: true,
        url: finalResult
      };
    } catch (err) {
      console.error("[Error] Proses generate gagal:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Kesalahan tak terduga selama pemrosesan"
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
  const api = new EzMakerClient();
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