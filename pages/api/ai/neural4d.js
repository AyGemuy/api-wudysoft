import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
import https from "https";
import apiConfig from "@/configs/apiConfig";
class Neural4D {
  constructor() {
    this.baseUrl = "https://alb.neural4d.com:3000";
    this.savedToken = null;
    this.activeContext = null;
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      timeout: 6e4,
      rejectUnauthorized: false
    });
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      httpsAgent: this.httpsAgent,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json;charset=utf-8",
        Origin: "https://www.neural4d.com",
        Pragma: "no-cache",
        Referer: "https://www.neural4d.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }
  _uuid() {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  _fp() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let res = "";
    for (let i = 0; i < 16; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }
  _snake(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._snake(v));
    }
    if (obj !== null && typeof obj === "object") {
      const acc = {};
      for (const [key, val] of Object.entries(obj)) {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
        acc[snakeKey] = this._snake(val);
      }
      return acc;
    }
    return obj;
  }
  async _login() {
    try {
      console.log("[Neural4D] Memulai login guest...");
      const visitorId = `visitor_${this._uuid()}`;
      const sessionId = `session_${this._uuid()}`;
      const deviceFingerprint = this._fp();
      this.activeContext = {
        visitorId: visitorId,
        sessionId: sessionId,
        deviceFingerprint: deviceFingerprint
      };
      const payload = {
        businessKey: "neural4d",
        visitorId: visitorId,
        sessionId: sessionId,
        landingUrl: "https://www.neural4d.com/studio/image-generator",
        landingPath: "/studio/image-generator",
        referrer: "https://www.neural4d.com/features/ai-image-generator",
        deviceFingerprint: deviceFingerprint,
        siteType: "neural4d",
        isAvatarUser: 0,
        isDeliver3D: 0
      };
      const res = await this.client.post("/auth/createGuestAndLogin", payload, {
        headers: {
          Authorization: "Bearer null"
        }
      });
      const token = res?.data?.token || null;
      if (token) {
        this.savedToken = token;
      }
      return token;
    } catch (err) {
      console.error("[Neural4D] Error login guest:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async _register(guestToken) {
    try {
      console.log("[Neural4D] Memulai pembuatan email temporer...");
      const mailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`, {
        httpsAgent: this.httpsAgent
      });
      const email = mailRes?.data?.email || null;
      if (!email) {
        console.log("[Neural4D] Gagal membuat email temporer. Melewati pendaftaran...");
        return guestToken;
      }
      console.log(`[Neural4D] Email dibuat: ${email}`);
      console.log("[Neural4D] Mengirim kode verifikasi ke email...");
      await this.client.post("/auth/sendVerifyCode", {
        operation: "email",
        email: email,
        username: email
      }, {
        headers: {
          Authorization: `Bearer ${guestToken}`
        }
      });
      console.log("[Neural4D] Menunggu kode verifikasi masuk...");
      let otpCode = null;
      for (let i = 1; i <= 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        try {
          const inboxRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`, {
            httpsAgent: this.httpsAgent
          });
          const htmlContent = inboxRes?.data?.data?.[0]?.html_content || null;
          if (htmlContent) {
            const $ = cheerio.load(htmlContent);
            const bodyText = $.text() || "";
            const match = bodyText.match(/\b\d{6}\b/) || htmlContent.match(/\b\d{6}\b/);
            if (match) {
              otpCode = match[0];
              console.log(`[Neural4D] Kode verifikasi didapatkan: ${otpCode}`);
              break;
            }
          }
        } catch (mailErr) {
          console.error("[Neural4D] Terjadi kesalahan saat membaca inbox email:", mailErr?.message || mailErr);
        }
        console.log(`[Neural4D] Menunggu email OTP... (Percobaan ${i}/20)`);
      }
      if (!otpCode) {
        console.log("[Neural4D] Tidak menerima kode OTP setelah batas waktu. Menggunakan token guest...");
        return guestToken;
      }
      console.log("[Neural4D] Mengirimkan kode verifikasi OTP...");
      const verifyPayload = {
        businessKey: "neural4d",
        visitorId: this.activeContext?.visitorId || `visitor_${this._uuid()}`,
        sessionId: this.activeContext?.sessionId || `session_${this._uuid()}`,
        landingUrl: "https://www.neural4d.com/studio/image-generator",
        landingPath: "/studio/image-generator",
        referrer: "https://www.neural4d.com/features/ai-image-generator",
        deviceFingerprint: this.activeContext?.deviceFingerprint || this._fp(),
        username: email,
        code: otpCode,
        type: "normal"
      };
      const verifyRes = await this.client.post("/auth/checkVerifyCode", verifyPayload, {
        headers: {
          Authorization: `Bearer ${guestToken}`
        }
      });
      const finalToken = verifyRes?.data?.token || null;
      if (finalToken) {
        console.log("[Neural4D] Registrasi & Login berhasil.");
        this.savedToken = finalToken;
        return finalToken;
      }
      return guestToken;
    } catch (err) {
      console.error("[Neural4D] Gagal dalam proses registrasi:", err?.response?.data || err?.message || err);
      return guestToken;
    }
  }
  async _claim(token) {
    try {
      console.log("[Neural4D] Mengklaim bonus login harian/mingguan...");
      const res = await this.client.post("/member/setMonthlyPointsForLoginFirst", {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return res?.data?.statusType === 0;
    } catch (err) {
      console.error("[Neural4D] Error claim credit:", err?.response?.data || err?.message || err);
      return false;
    }
  }
  async _points(token) {
    try {
      console.log("[Neural4D] Memeriksa saldo kredit...");
      const res = await this.client.get("/member/getAllPointsInfo", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return res?.data?.data || null;
    } catch (err) {
      console.error("[Neural4D] Error check credit:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async _caps(token) {
    try {
      console.log("[Neural4D] Mengambil kapabilitas model...");
      const res = await this.client.get("/api/normal-generation/capabilities?entityType=image", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return res?.data?.data || null;
    } catch (err) {
      console.error("[Neural4D] Error get capabilities:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async _getBuf(source) {
    try {
      if (Buffer.isBuffer(source)) {
        return source;
      }
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          console.log(`[Neural4D] Mengunduh gambar dari URL: ${source}`);
          const res = await this.client.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (source.includes("base64,")) {
          return Buffer.from(source.split("base64,")[1], "base64");
        }
        return Buffer.from(source, "base64");
      }
    } catch (err) {
      console.error("[Neural4D] Error konversi buffer gambar:", err?.message || err);
    }
    return null;
  }
  async _upload(token, imgSource) {
    try {
      const buffer = await this._getBuf(imgSource);
      if (!buffer) {
        return null;
      }
      console.log("[Neural4D] Mengunggah file gambar...");
      const form = new FormData();
      form.append("file", buffer, {
        filename: `${this._uuid()}.jpg`,
        contentType: "image/jpeg"
      });
      const res = await this.client.post("/api/normal-generation/upload-image", form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      });
      return res?.data?.data || null;
    } catch (err) {
      console.error("[Neural4D] Error upload image:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async _poll(token, taskId) {
    console.log(`[Neural4D] Polling status task: ${taskId}`);
    const interval = 3e3;
    const maxAttempts = 60;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.client.get("/api/normal-generation/history?entityType=all&page=1&pageSize=10", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const items = res?.data?.data?.items || [];
        const task = items.find(item => item.taskId === taskId);
        if (task) {
          console.log(`[Neural4D] Polling status (Percobaan ${attempt}/${maxAttempts}): ${task.status}`);
          if (task.status === "completed") {
            return {
              status: true,
              result: task
            };
          }
          if (task.status === "failed") {
            return {
              status: false,
              result: task.message || "Task failed"
            };
          }
        } else {
          console.log(`[Neural4D] Task ${taskId} belum muncul di riwayat (Percobaan ${attempt}/${maxAttempts})`);
        }
      } catch (err) {
        console.error("[Neural4D] Error polling:", err?.message || err);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return {
      status: false,
      result: "Polling timeout exceeded"
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
      let activeToken = token || this.savedToken;
      if (!activeToken) {
        const guestToken = await this._login();
        if (guestToken) {
          activeToken = await this._register(guestToken);
        }
      }
      if (!activeToken) {
        return {
          status: false,
          result: this._snake("Gagal mendapatkan token autentikasi."),
          token: null
        };
      }
      await this._claim(activeToken);
      const credits = await this._points(activeToken);
      console.log(`[Neural4D] Total Kredit: ${credits?.total_points || 0}`);
      const selectedModel = model || "image-2";
      const caps = await this._caps(activeToken);
      const availableModels = caps?.models?.map(m => m.modelKey) || [];
      const modelDef = caps?.models?.find(m => m.modelKey === selectedModel);
      if (!modelDef) {
        return {
          status: false,
          result: this._snake({
            message: `Model "${selectedModel}" tidak ditemukan.`,
            available: availableModels
          }),
          token: activeToken
        };
      }
      if (!modelDef.isAvailable) {
        const availableActiveModels = caps?.models?.filter(m => m.isAvailable).map(m => m.modelKey) || [];
        return {
          status: false,
          result: this._snake({
            message: `Model "${selectedModel}" sedang tidak aktif.`,
            available: availableActiveModels
          }),
          token: activeToken
        };
      }
      const inputAspectRatio = rest?.aspectRatio || rest?.parameterContext?.aspectRatio || modelDef.defaultAspectRatio || "1:1";
      const inputResolution = rest?.resolution || rest?.parameterContext?.resolution || modelDef.defaultResolution || "2K";
      if (!modelDef.supportedAspectRatios?.includes(inputAspectRatio)) {
        return {
          status: false,
          result: this._snake({
            message: `Aspect ratio "${inputAspectRatio}" tidak didukung oleh model "${selectedModel}".`,
            available: modelDef.supportedAspectRatios || []
          }),
          token: activeToken
        };
      }
      if (!modelDef.supportedResolutions?.includes(inputResolution)) {
        return {
          status: false,
          result: this._snake({
            message: `Resolution "${inputResolution}" tidak didukung oleh model "${selectedModel}".`,
            available: modelDef.supportedResolutions || []
          }),
          token: activeToken
        };
      }
      const fileKeys = [];
      if (image) {
        if (!modelDef.supportsImageInput) {
          return {
            status: false,
            result: this._snake(`Model "${selectedModel}" tidak mendukung input gambar.`),
            token: activeToken
          };
        }
        const listImages = Array.isArray(image) ? image : [image];
        console.log(`[Neural4D] Memproses ${listImages.length} gambar untuk diunggah...`);
        for (const img of listImages) {
          const uploadRes = await this._upload(activeToken, img);
          const fileKey = uploadRes?.fileKey || null;
          if (fileKey) {
            fileKeys.push(fileKey);
          } else {
            return {
              status: false,
              result: this._snake("Salah satu proses unggah gambar gagal."),
              token: activeToken
            };
          }
        }
      }
      console.log(`[Neural4D] Memulai request pembuatan gambar dengan model: ${selectedModel}`);
      const payload = {
        taskType: "generate_normal_image",
        modelKey: selectedModel,
        prompt: prompt || "Car",
        sourcePage: "normalImage",
        jobNum: 1,
        assetRefs: {
          images: fileKeys,
          videos: []
        },
        parameterContext: {
          imageCount: modelDef.defaultImageCount || 1,
          aspectRatio: inputAspectRatio,
          resolution: inputResolution,
          ...rest?.parameterContext || {}
        },
        ...rest
      };
      const genRes = await this.client.post("/api/normal-generation/create", payload, {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      const taskId = genRes?.data?.data?.taskId || null;
      if (!taskId) {
        return {
          status: false,
          result: this._snake(genRes?.data?.message || "Gagal membuat task image generation."),
          token: activeToken
        };
      }
      const pollResult = await this._poll(activeToken, taskId);
      return {
        status: pollResult.status,
        result: this._snake(pollResult.result),
        token: activeToken
      };
    } catch (err) {
      console.error("[Neural4D] Error generate process:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: this._snake(err?.response?.data || err?.message || "Internal error occured during generation"),
        token: null
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
  const api = new Neural4D();
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