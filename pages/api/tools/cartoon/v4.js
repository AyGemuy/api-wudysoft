import axios from "axios";
import crypto from "crypto";
import https from "https";
class Avatar {
  constructor({
    deviceId = crypto.randomUUID(),
    lang = "id",
    appVersion = "2.1.0",
    countryCode = "ID",
    osVersion = "14",
    deviceModel = "RMX3890"
  } = {}) {
    const agent = new https.Agent({
      keepAlive: true
    });
    this.cfg = {
      ua: "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      appName: "com.wowooapps.ai.avatar.maker",
      appCert: "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      appAccess: "Yzrvv92130dsfyuP8"
    };
    this.style = ["pixar", "anime", "ghibli", "classic", "pet_cartoon", "dog_cartoon", "baby_pixar", "baby_disney", "baby_anime"];
    this.state = {
      deviceId: deviceId,
      lang: lang,
      appVersion: appVersion,
      countryCode: countryCode,
      osVersion: osVersion,
      deviceModel: deviceModel,
      accessToken: null,
      userId: null
    };
    this.auth = axios.create({
      baseURL: "https://user-service.wowoo-services.com",
      httpsAgent: agent,
      timeout: 6e4
    });
    this.ai = axios.create({
      baseURL: "https://ai-flow.wowoo-services.com",
      httpsAgent: agent,
      timeout: 6e4
    });
    const applyHead = c => ({
      ...c,
      headers: {
        ...this.buildHead(),
        ...c.headers
      }
    });
    this.auth.interceptors.request.use(applyHead);
    this.ai.interceptors.request.use(applyHead);
  }
  buildHead() {
    const {
      deviceId,
      appVersion,
      countryCode,
      osVersion,
      deviceModel,
      lang,
      accessToken,
      userId
    } = this.state;
    return {
      "User-Agent": this.cfg.ua,
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      "X-App-Version": appVersion,
      "X-Country-Code": countryCode,
      "X-OS-Version": osVersion,
      "X-OS-Type": "android",
      "X-Device-Model": deviceModel,
      "Accept-Language": lang,
      "X-Android-Package": this.cfg.appName,
      "X-Android-Cert": this.cfg.appCert,
      "X-Access-Key": this.cfg.appAccess,
      "X-User-Id": userId || deviceId,
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      Connection: "keep-alive"
    };
  }
  async login() {
    console.log("[Auth] Memulai proses login...");
    try {
      const {
        data
      } = await this.auth.post("/api/v1/client/apps/cartoon-app/auth/login-or-register");
      const res = data?.data || data;
      this.state.accessToken = res.accessToken;
      this.state.userId = res.userId;
      console.log(`[Auth] Login sukses. UserID: ${this.state.userId}`);
      return res;
    } catch (e) {
      console.error("[Auth] Login gagal:", e.message);
      throw e;
    }
  }
  async _poll(processId, interval = 3e3, maxAttempts = 60) {
    console.log(`[Polling] Mengecek status: ${processId}...`);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const {
          data
        } = await this.ai.get(`/cartoon-style/results/${processId}`);
        const res = data?.data || data;
        if (res.status === 200) {
          console.log("[Polling] Selesai! Gambar berhasil dibuat.");
          const result = res.imageURLs && res.imageURLs.length > 0 ? res.imageURLs[0] : res.imageURL;
          return {
            ...res,
            result: result
          };
        }
        console.log(`[Polling] Masih diproses... (${i + 1}/${maxAttempts}) | Status: ${res.status}`);
      } catch (e) {
        if (e.response?.status === 404) {
          console.log("[Polling] Server sedang antre (404)...");
        } else {
          console.error("[Polling] Error:", e.message);
        }
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("Polling timeout.");
  }
  async generate({
    image,
    style = "anime",
    ...rest
  }) {
    try {
      if (!this.state.accessToken) await this.login();
      console.log(`[Process] Menyiapkan style: ${style}`);
      const isBaby = style.startsWith("baby_");
      const isPet = style.startsWith("pet_") || style === "dog_cartoon";
      const featureName = isBaby ? "baby_cartoon" : isPet ? "pet_cartoon" : "cartoon_multiverse";
      const serverStyle = isBaby ? style === "baby_disney" ? "classic_cartoon" : style === "baby_anime" ? "anime" : "pixar" : isPet ? style === "pet_cartoon" ? "pixar" : "classic_cartoon" : style === "ghibli" ? "realistic" : style === "classic" ? "classic_cartoon" : style;
      const {
        data
      } = await this.ai.post("/cartoon-style/generate", {
        imageURL: image,
        style: serverStyle,
        featureName: featureName,
        ...rest
      });
      const initial = data?.data || data;
      if (initial.processId) return await this._poll(initial.processId);
      return initial;
    } catch (e) {
      console.error("[Process] Gagal:", e.response?.data || e.message);
      throw e;
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
  const api = new Avatar();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}