import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class ImagesArtClient {
  constructor() {
    this.token = "";
    this.cookies = {};
    this.models = null;
    this.email = "";
    this.password = "";
    this.client = axios.create({
      baseURL: "https://imagesart.ai",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.client.interceptors.request.use(config => {
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) {
        config.headers["Cookie"] = cookieStr;
      }
      return config;
    }, err => Promise.reject(err));
    this.client.interceptors.response.use(res => {
      const setCookies = res.headers["set-cookie"];
      if (setCookies) {
        setCookies.forEach(cookie => {
          const part = cookie.split(";")[0];
          const index = part.indexOf("=");
          if (index !== -1) {
            const key = part.substring(0, index).trim();
            const val = part.substring(index + 1).trim();
            this.cookies[key] = val;
          }
        });
      }
      return res;
    }, err => Promise.reject(err));
  }
  rnd(len) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
  }
  async gMail() {
    try {
      console.log("[Proses] Membuat email sementara...");
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      return res?.data?.email || null;
    } catch (e) {
      console.log("[Error] Gagal mendapatkan email baru:", e.message);
      return null;
    }
  }
  async gOtp(email) {
    try {
      console.log(`[Proses] Memantau inbox verifikasi untuk: ${email}...`);
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const data = res?.data?.data || [];
        for (const item of data) {
          const content = item?.text_content || "";
          const match = content.match(/https:\/\/imagesart\.ai\/api\/auth\/verify-email\?token=[^\s&]+/);
          if (match) {
            console.log("[Proses] Tautan verifikasi berhasil diperoleh.");
            return match[0];
          }
        }
      }
      console.log("[Error] Batas waktu verifikasi email habis (Timeout).");
      return null;
    } catch (e) {
      console.log("[Error] Terjadi kesalahan saat memeriksa pesan:", e.message);
      return null;
    }
  }
  async reg(email, pass, name) {
    try {
      console.log("[Proses] Mengirim data registrasi...");
      const payload = {
        email: email,
        password: pass,
        name: name,
        callbackURL: "/"
      };
      await this.client.post("/api/auth/sign-up/email", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://imagesart.ai",
          referer: "https://imagesart.ai/ai-edit-image"
        }
      });
      return true;
    } catch (e) {
      console.log("[Error] Pendaftaran gagal:", e.response?.data || e.message);
      return false;
    }
  }
  async ver(link) {
    try {
      console.log("[Proses] Melakukan verifikasi akun via tautan...");
      await this.client.get(link, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      return true;
    } catch (e) {
      console.log("[Error] Gagal memverifikasi akun:", e.message);
      return false;
    }
  }
  async lgn(email, pass) {
    try {
      console.log("[Proses] Melakukan login sistem...");
      const payload = {
        mode: "password",
        email: email,
        password: pass,
        callbackURL: "/ai-image-generator"
      };
      const res = await this.client.post("/api/auth/sign-in/email", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://imagesart.ai",
          referer: "https://imagesart.ai/ai-image-generator"
        }
      });
      this.token = res?.data?.token || "";
      console.log("[Proses] Otentikasi masuk sukses.");
      return this.token;
    } catch (e) {
      console.log("[Error] Gagal melakukan proses login:", e.message);
      return null;
    }
  }
  async aut() {
    try {
      if (this.token && this.cookies["__Secure-better-auth.session_token"]) {
        return this.token;
      }
      console.log("[Proses] Memulai siklus pembentukan sesi baru...");
      const email = await this.gMail();
      if (!email) throw new Error("Inisialisasi email gagal.");
      const pass = email;
      const name = email;
      const registered = await this.reg(email, pass, name);
      if (!registered) throw new Error("Langkah registrasi terhenti.");
      const verifyLink = await this.gOtp(email);
      if (!verifyLink) throw new Error("Tautan verifikasi tidak diterima.");
      const verified = await this.ver(verifyLink);
      if (!verified) throw new Error("Proses aktivasi tautan gagal.");
      const token = await this.lgn(email, pass);
      if (!token) throw new Error("Pengambilan token login gagal.");
      this.email = email;
      this.password = pass;
      return token;
    } catch (e) {
      console.log("[Error] Siklus otentikasi bermasalah:", e.message);
      throw e;
    }
  }
  async resImg(imgSource) {
    try {
      if (Buffer.isBuffer(imgSource)) {
        return {
          buffer: imgSource,
          contentType: "image/webp"
        };
      }
      if (typeof imgSource === "string") {
        if (imgSource.startsWith("data:")) {
          const match = imgSource.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return {
              buffer: Buffer.from(match[2], "base64"),
              contentType: match[1] || "image/webp"
            };
          }
        }
        if (imgSource.startsWith("http://") || imgSource.startsWith("https://")) {
          console.log("[Proses] Mengambil berkas eksternal dari URL...");
          const res = await axios.get(imgSource, {
            responseType: "arraybuffer"
          });
          const contentType = res.headers["content-type"] || "image/webp";
          return {
            buffer: Buffer.from(res.data),
            contentType: contentType
          };
        }
      }
      throw new Error("Jenis media tidak didukung.");
    } catch (e) {
      console.log("[Error] Pengolahan berkas gagal:", e.message);
      throw e;
    }
  }
  async upl(imgSource) {
    try {
      const {
        buffer,
        contentType
      } = await this.resImg(imgSource);
      console.log("[Proses] Meminta presigned upload URL...");
      const res = await this.client.post("/api/uploads/signed-upload-url-r2", {
        contentType: contentType
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://imagesart.ai",
          referer: "https://imagesart.ai/ai-image-generator"
        }
      });
      const {
        signedUrl,
        publicUrl
      } = res?.data || {};
      if (!signedUrl) throw new Error("Gagal mendapatkan otorisasi upload.");
      console.log("[Proses] Mengirim data ke R2 storage...");
      await axios.put(signedUrl, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      console.log("[Proses] Unggahan selesai:", publicUrl);
      return publicUrl;
    } catch (e) {
      console.log("[Error] Unggahan gagal:", e.message);
      return null;
    }
  }
  async gMod() {
    try {
      if (this.models) return this.models;
      console.log("[Proses] Memperbarui struktur metadata model...");
      const res = await this.client.get("/api/image-generator/models", {
        headers: {
          referer: "https://imagesart.ai/ai-image-generator"
        }
      });
      this.models = res?.data?.models || {};
      return this.models;
    } catch (e) {
      console.log("[Error] Pengambilan daftar model gagal:", e.message);
      return {};
    }
  }
  vPrm(modelName, ratio, resolution, inputType) {
    const validRatios = ["1:1", "16:9", "9:16", "3:4", "4:3", "3:2", "2:3", "original"];
    let targetRatio = validRatios.includes(ratio) ? ratio : "1:1";
    if (modelName === "gpt-image-2" && (targetRatio === "2:3" || targetRatio === "3:2")) {
      console.log('[Validasi] Model "gpt-image-2" tidak mendukung rasio 2:3 atau 3:2. Dialihkan ke "1:1".');
      targetRatio = "1:1";
    }
    if (inputType === "text" && targetRatio === "original") {
      console.log('[Validasi] Mode Text-to-Image tidak mendukung rasio "original". Dialihkan ke "1:1".');
      targetRatio = "1:1";
    }
    if (inputType === "image" && targetRatio === "original") {
      if (modelName !== "nano-banana" && modelName !== "nano-banana-pro") {
        console.log(`[Validasi] Model "${modelName}" tidak mendukung rasio "original" dalam mode Image-to-Image. Dialihkan ke "1:1".`);
        targetRatio = "1:1";
      }
    }
    const validResolutions = ["1K", "2K", "4K"];
    let targetRes = validResolutions.includes(resolution) ? resolution : "1K";
    const modelMeta = this.models?.[modelName];
    if (modelMeta) {
      const allowedRes = modelMeta.creditCostByResolution ? Object.keys(modelMeta.creditCostByResolution) : [];
      if (targetRes !== "1K" && allowedRes.length > 0 && !allowedRes.includes(targetRes)) {
        console.log(`[Validasi] Resolusi "${targetRes}" tidak didukung model "${modelName}". Dialihkan ke "1K".`);
        targetRes = "1K";
      }
    }
    return {
      aspect_ratio: targetRatio,
      resolution: targetRes
    };
  }
  async generate({
    token,
    prompt,
    image,
    model,
    ...rest
  }) {
    try {
      let inputType = image ? "image" : "text";
      let modelName = model || "v3.0";
      if (inputType === "image" && modelName === "v1.0") {
        console.log('[Validasi] Model "v1.0" hanya mendukung Text-to-Image. Dialihkan ke model "v3.0".');
        modelName = "v3.0";
      }
      const parsedPrompt = prompt ? prompt.trim() : "";
      if (!parsedPrompt && inputType === "text") {
        throw new Error('Parameter "prompt" wajib ditentukan untuk mode Text-to-Image.');
      }
      if (token) this.token = token;
      await this.aut();
      const modelList = await this.gMod();
      if (!modelList[modelName]) {
        console.log(`[Validasi] Model "${modelName}" tidak terdaftar. Menggunakan default model "v3.0".`);
        modelName = "v3.0";
      }
      const validatedParams = this.vPrm(modelName, rest?.aspect_ratio, rest?.resolution, inputType);
      let uploadedImages = [];
      if (inputType === "image") {
        console.log("[Proses] Memulai persiapan berkas Image-to-Image...");
        const imagesToProcess = Array.isArray(image) ? image : [image];
        for (const img of imagesToProcess) {
          const uploadedUrl = await this.upl(img);
          if (uploadedUrl) {
            uploadedImages.push(uploadedUrl);
          }
        }
        if (uploadedImages.length === 0) {
          console.log("[Validasi] Gagal memproses gambar masukan. Beralih kembali ke mode Text-to-Image.");
          inputType = "text";
          if (!parsedPrompt) {
            throw new Error('Parameter "prompt" diperlukan ketika proses konversi ke Text-to-Image terjadi.');
          }
        }
      }
      const payload = {
        prompt: parsedPrompt,
        model: modelName,
        aspect_ratio: validatedParams.aspect_ratio,
        num_outputs: rest?.num_outputs || 1,
        isPublic: rest?.isPublic !== undefined ? rest?.isPublic : true,
        inputType: inputType,
        resolution: validatedParams.resolution,
        ...inputType === "image" ? {
          image_input: uploadedImages
        } : {},
        ...rest
      };
      console.log("[Proses] Mengirimkan data generasi ke API endpoint...");
      const res = await this.client.post("/api/image-generator", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://imagesart.ai",
          referer: "https://imagesart.ai/ai-image-generator"
        }
      });
      const responseData = res?.data || {};
      const success = responseData?.status === "SUCCESS" || responseData?.imageUrls?.length > 0;
      const status = success ? "success" : "failed";
      const result = {
        image_urls: responseData?.imageUrls || [],
        model: responseData?.model || modelName,
        prompt: responseData?.prompt || prompt,
        input_type: responseData?.inputType || inputType,
        status: responseData?.status || "UNKNOWN",
        metadata: responseData?.metadata || {}
      };
      return {
        status: status,
        result: result,
        token: this.token
      };
    } catch (e) {
      console.log("[Error] Kegagalan pemicu proses generate:", e.message);
      return {
        status: "error",
        result: {
          error: e.message
        },
        token: this.token
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
  const api = new ImagesArtClient();
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