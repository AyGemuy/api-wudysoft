import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import sizeOf from "image-size";
class Dalle4AI {
  constructor() {
    try {
      this.base = "https://api2.ashirwadinfotech.com:22993";
      this.appId = "SD_AI_CI";
      this.fetchAppId = "dalle4";
      this.appVersion = "5";
      this.packageName = "com.creative.stablediffusionai";
      this.country = "ID";
      this.userAgent = "okhttp/3.14.9";
      this.dataCache = null;
      this.androidId = null;
    } catch (e) {
      this.dataCache = null;
    }
  }
  log(msg, data = null) {
    try {
      console.log(`[Dalle4AI] ${msg}`, data ? JSON.stringify(data) : "");
    } catch (e) {}
  }
  rndId() {
    try {
      return crypto.randomBytes(8).toString("hex");
    } catch (e) {
      return "0666b2e8da418dfa";
    }
  }
  getRatio(buffer) {
    try {
      if (!buffer || !Buffer.isBuffer(buffer)) return "square";
      const dim = sizeOf(buffer);
      if (dim?.width && dim?.height) {
        const ratio = dim.width / dim.height;
        if (ratio > 1.2) return "landscape";
        if (ratio < .8) return "portrait";
        return "square";
      }
      return "square";
    } catch (e) {
      return "square";
    }
  }
  hdrs(extra = {}) {
    try {
      return {
        "User-Agent": this.userAgent,
        "Accept-Encoding": "gzip",
        ...extra || {}
      };
    } catch (e) {
      return {};
    }
  }
  async rslv(media) {
    try {
      if (!media) return null;
      if (Buffer.isBuffer(media)) return media;
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          this.log("Mengunduh media dari URL...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        const b64 = media.includes("base64,") ? media.split("base64,")[1] : media;
        return Buffer.from(b64, "base64");
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async getAppData() {
    try {
      if (this.dataCache) return this.dataCache;
      this.log("Mengambil daftar model dan style dari server...");
      const url = `${this.base}/api/image/fetch-app-data/?app_id=${this.fetchAppId}`;
      const res = await axios.get(url, {
        headers: this.hdrs()
      }).catch(() => null);
      if (res?.data) {
        this.dataCache = res.data;
        return this.dataCache;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async initApp(androidId = null) {
    try {
      const aId = androidId || this.androidId || this.rndId();
      this.androidId = aId;
      this.log(`Inisialisasi akun android_id: ${aId}...`);
      const form = new FormData();
      form.append("android_id", aId);
      form.append("app_id", this.appId);
      form.append("in_app", "");
      form.append("in_app_sku", "");
      form.append("app_version", this.appVersion);
      form.append("package_name", this.packageName);
      form.append("is_premium", "false");
      form.append("fcm_token", "");
      form.append("country_code", this.country);
      const url = `${this.base}/api/image/android-app-config/`;
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          ...this.hdrs()
        }
      }).catch(() => null);
      this.log(`Auto-claim 10 koin saat inisialisasi untuk android_id: ${aId}...`);
      await axios.post(`${this.base}/api/image/reward-coin/`, {
        android_id: aId,
        app_id: this.appId,
        coins: 10
      }, {
        headers: this.hdrs({
          "Content-Type": "application/json"
        })
      }).catch(() => null);
      const data = res?.data || {};
      return {
        android_id: aId,
        remaining_balance: data?.remaining_balance ?? 5,
        coin_balance: (data?.coin_balance ?? 0) + 10,
        total_request_limit: data?.total_request_limit ?? 7,
        is_premium: data?.is_premium ?? false
      };
    } catch (e) {
      return {
        android_id: this.androidId || this.rndId(),
        remaining_balance: 5,
        coin_balance: 10
      };
    }
  }
  async poll(jobId, maxAttempts = 60, interval = 3e3) {
    try {
      this.log(`Memulai auto-polling task: ${jobId}...`);
      for (let i = 1; i <= maxAttempts; i++) {
        await new Promise(r => setTimeout(r, interval));
        const statusRes = await this.status({
          job_id: jobId
        });
        if (statusRes.status === "COMPLETED") {
          this.log(`Task ${jobId} selesai pada percobaan ke-${i}!`);
          return {
            status: "success",
            job_id: jobId,
            output: statusRes.output,
            attempts: i
          };
        }
        if (statusRes.status === "FAILED" || statusRes.status === "ERROR") {
          return {
            status: "error",
            message: statusRes?.message || "Proses pembuatan gambar gagal pada server."
          };
        }
        this.log(`Polling task ${jobId} (${i}/${maxAttempts}). Status: ${statusRes.status || "PROCESSING"}`);
      }
      return {
        status: "error",
        message: "Task timeout: Melebihi batas waktu polling 180 detik."
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Terjadi kesalahan saat polling status."
      };
    }
  }
  async claim({
    android_id,
    coins = 10,
    ...rest
  } = {}) {
    try {
      const aId = android_id || this.androidId || (await this.initApp())?.android_id;
      this.log(`Mengklaim reward coin (+${coins} coins) untuk android_id: ${aId}...`);
      const url = `${this.base}/api/image/reward-coin/`;
      const payload = {
        android_id: aId,
        app_id: this.appId,
        coins: Number(coins) || 10,
        ...rest
      };
      const res = await axios.post(url, payload, {
        headers: this.hdrs({
          "Content-Type": "application/json"
        })
      }).catch(err => err?.response || null);
      const data = res?.data || {};
      return {
        status: "success",
        android_id: aId,
        coin_balance: data?.coin_balance ?? 0,
        app_id: data?.app_id || this.appId,
        app_version: data?.app_version || this.appVersion
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal mengklaim reward coin."
      };
    }
  }
  async generate({
    prompt,
    image,
    model,
    style,
    aspect_ratio,
    android_id,
    wait = true,
    ...rest
  } = {}) {
    try {
      if (!prompt) return {
        status: "error",
        message: 'Parameter "prompt" wajib diisi.'
      };
      const userConfig = await this.initApp(android_id);
      const aId = userConfig?.android_id || this.androidId;
      const appData = await this.getAppData();
      const form = new FormData();
      const isImageToImage = Boolean(image);
      form.append("prompt", prompt);
      form.append("app_id", this.appId);
      form.append("android_id", aId);
      form.append("is_premium", "false");
      form.append("app_version", this.appVersion);
      form.append("country_code", this.country);
      form.append("use_queue", "true");
      if (isImageToImage) {
        const imgBuf = await this.rslv(image);
        if (!imgBuf) return {
          status: "error",
          message: "Gagal memproses file gambar input."
        };
        const fileName = `IMG_${Date.now()}.jpg`;
        form.append("image", imgBuf, {
          filename: fileName,
          contentType: "image/jpeg"
        });
        const itiModels = appData?.image_to_image_model || [];
        let matchedModel = itiModels.find(m => (m?.actual_model_name || "").toLowerCase() === (model || "").toLowerCase() || (m?.display_name || "").toLowerCase() === (model || "").toLowerCase());
        if (!matchedModel && itiModels.length > 0) {
          matchedModel = itiModels.find(m => m?.actual_model_name === "internal_actionfigure") || itiModels[0];
        }
        const processType = matchedModel?.actual_model_name || model || "internal_actionfigure";
        const trendName = matchedModel?.display_name || "Action Figure";
        form.append("process_type", processType);
        form.append("trend_name", trendName);
        form.append("image_style", style || "");
        form.append("aspect_ratio", aspect_ratio || this.getRatio(imgBuf));
      } else {
        form.append("process_type", "text_to_image");
        form.append("trend_name", "Text to Image");
        const ttiStyles = appData?.text_to_image_style || [];
        let matchedStyle = ttiStyles.find(s => (s?.name || "").toLowerCase() === (style || "").toLowerCase() || (s?.display_name || "").toLowerCase() === (style || "").toLowerCase());
        const imageStyle = matchedStyle?.name || style || "Ghibli Anime";
        form.append("image_style", imageStyle);
        form.append("aspect_ratio", aspect_ratio || "square");
        form.append("scale", String(rest?.scale || "12"));
        form.append("steps", String(rest?.steps || "20"));
      }
      form.append("enhance", rest?.enhance ? "true" : "false");
      form.append("baby_gender", rest?.baby_gender || "");
      form.append("baby_age", rest?.baby_age || "");
      form.append("cloth_type", rest?.cloth_type || "");
      form.append("room_style", rest?.room_style || "");
      form.append("interior_style", rest?.interior_style || "");
      form.append("color_palette", rest?.color_palette || "");
      form.append("is_ref_image", rest?.is_ref_image ? "true" : "false");
      form.append("name", rest?.name || "");
      form.append("accessories", rest?.accessories || "");
      this.log(`Mengirim task generator (${isImageToImage ? "Image-to-Image" : "Text-to-Image"})...`);
      const url = `${this.base}/api/image/image-generator/`;
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          ...this.hdrs()
        }
      }).catch(err => err?.response || null);
      const jobId = res?.data?.job_id;
      if (!jobId) {
        return {
          status: "error",
          message: res?.data?.message || res?.data?.detail || "Gagal mengirim job generate ke server."
        };
      }
      this.log(`Task berhasil diterima server. Job ID: ${jobId}`);
      if (wait === false || wait === "false") {
        return {
          status: "success",
          job_id: jobId,
          android_id: aId
        };
      }
      const pollResult = await this.poll(jobId, 60, 3e3);
      return {
        ...pollResult,
        android_id: aId
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Terjadi kesalahan sistem pada fungsi generate."
      };
    }
  }
  async status({
    task_id,
    taskId,
    job_id,
    id,
    ...rest
  } = {}) {
    try {
      const targetId = job_id || task_id || taskId || id;
      if (!targetId) return {
        status: "error",
        message: 'Parameter "job_id" atau "task_id" wajib diisi.'
      };
      const url = `${this.base}/api/image/image-generator/${targetId}/`;
      const res = await axios.get(url, {
        headers: this.hdrs()
      }).catch(err => err?.response || null);
      const data = res?.data || {};
      return {
        status: data?.status || "PROCESSING",
        job_id: data?.job_id || targetId,
        output: data?.output || null,
        is_premium: data?.is_premium ?? false,
        created_at: data?.created_at || null
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal mengecek status task."
      };
    }
  }
  async models(params = {}) {
    try {
      const appData = await this.getAppData();
      if (!appData) return {
        status: "error",
        message: "Gagal memuat list model dan style dari server."
      };
      return {
        status: "success",
        text_to_image_models: appData?.text_to_image_model || [],
        image_to_image_models: appData?.image_to_image_model || [],
        text_to_image_styles: appData?.text_to_image_style || []
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal memuat daftar model."
      };
    }
  }
  async profile({
    android_id,
    ...rest
  } = {}) {
    try {
      const userConfig = await this.initApp(android_id);
      return {
        status: "success",
        android_id: userConfig?.android_id || this.androidId,
        coin_balance: userConfig?.coin_balance ?? 10,
        remaining_balance: userConfig?.remaining_balance ?? 5,
        total_request_limit: userConfig?.total_request_limit ?? 7,
        is_premium: userConfig?.is_premium ?? false
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal memuat profil pengguna."
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["generate", "claim", "status", "models", "profile"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          generate_text_to_image: "/?action=generate&prompt=A+cute+anime+cat+in+cyberpunk+city&style=Ghibli+Anime",
          generate_image_to_image: "/?action=generate&prompt=Turn+into+action+figure&image=https://example.com/photo.jpg&model=internal_actionfigure",
          claim: "/?action=claim&coins=10&android_id=0666b2e8da418dfa",
          status: "/?action=status&job_id=2210f77a-d5eb-449a-b7d7-abeb151ed793",
          models: "/?action=models",
          profile: "/?action=profile&android_id=0666b2e8da418dfa"
        }
      }
    });
  }
  const api = new Dalle4AI();
  try {
    let response;
    switch (action) {
      case "generate":
        response = await api.generate(params);
        break;
      case "claim":
        response = await api.claim(params);
        break;
      case "status":
        response = await api.status(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "profile":
        response = await api.profile(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === "error") {
      return res.status(400).json({
        status: false,
        action: action,
        error: response.message || "Gagal memproses request internal API."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      action: action,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}