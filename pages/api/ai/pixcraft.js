import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class PixCraftAI {
  constructor() {
    try {
      this.dom = "www.pixcraft.cc";
      this.apiDom = "api.pixcraft.cc";
      this.cdnDom = "source.pixcraft.cc";
      this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.did = this._devId();
      this.fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e18)}`;
      this.siteId = "001";
      this.lang = "en";
      this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
      this.email = null;
      this.password = "SecurePass123!";
      this.authToken = null;
      this.userInfoData = null;
      this.jar = {};
      this._initPromise = null;
      this._cachedModels = {
        t2i: null,
        i2i: null
      };
      this.http = axios.create({
        baseURL: `${proxy}https://${this.apiDom}`,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          device: this.did,
          language: this.lang,
          origin: `https://${this.dom}`,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://${this.dom}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": this.ua,
          "x-fbp": this.fbp,
          "x-site-id": this.siteId
        }
      });
      this.http.interceptors.request.use((cfg = {}) => {
        try {
          const c = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
          if (c && cfg.headers) cfg.headers["cookie"] = c;
          if (this.authToken && cfg.headers) cfg.headers["authorization"] = this.authToken;
          return cfg;
        } catch {
          return cfg;
        }
      });
      this.http.interceptors.response.use((res = {}) => {
        try {
          const h = res?.headers?.["set-cookie"] || [];
          (Array.isArray(h) ? h : [h]).forEach(c => {
            const [p] = (c || "").split(";");
            const [k, v] = (p || "").split("=");
            if (k?.trim()) this.jar[k.trim()] = v?.trim() || "";
          });
          const token = res?.headers?.["authorization"] || res?.headers?.["token"];
          if (token) this.authToken = token;
          return res;
        } catch {
          return res;
        }
      });
    } catch (e) {
      console.error("[PixCraft] Constructor error:", e?.message || e);
    }
  }
  _devId() {
    try {
      const p1 = crypto.randomBytes(7).toString("hex");
      const p2 = crypto.randomBytes(7).toString("hex");
      const p3 = crypto.randomBytes(4).toString("hex");
      const p4 = Math.floor(1e5 + Math.random() * 9e5);
      const p5 = crypto.randomBytes(7).toString("hex");
      return `${p1}-${p2}-${p3}-${p4}-${p5}`;
    } catch {
      return crypto.randomUUID();
    }
  }
  _exportState() {
    try {
      const data = {
        did: this.did,
        fbp: this.fbp,
        email: this.email,
        password: this.password,
        authToken: this.authToken,
        jar: this.jar,
        userInfo: this.userInfoData
      };
      return Buffer.from(JSON.stringify(data)).toString("base64");
    } catch (e) {
      console.error("[PixCraft] Export state error:", e?.message || e);
      return null;
    }
  }
  _importState(stateB64 = "") {
    try {
      if (!stateB64) return false;
      const jsonStr = Buffer.from(stateB64, "base64").toString("utf-8");
      const data = JSON.parse(jsonStr);
      if (data.did) this.did = data.did;
      if (data.fbp) this.fbp = data.fbp;
      if (data.email) this.email = data.email;
      if (data.password) this.password = data.password;
      if (data.authToken) this.authToken = data.authToken;
      if (data.jar) this.jar = data.jar;
      if (data.userInfo) this.userInfoData = data.userInfo;
      console.log(`[PixCraft] State dipulihkan: ${this.email || "Anonymous"}`);
      return true;
    } catch (e) {
      console.error("[PixCraft] Import state error:", e?.message || e);
      return false;
    }
  }
  async _createTempMail() {
    try {
      console.log("[PixCraft] Membuat temp email...");
      const res = await axios.get(`${this.mailApi}?action=create`);
      const email = res?.data?.email || res?.data?.data?.email;
      if (!email) throw new Error("Gagal membuat temp email");
      console.log(`[PixCraft] Email: ${email}`);
      return email;
    } catch (e) {
      console.error("[PixCraft] Temp mail error:", e?.message || e);
      return null;
    }
  }
  async _getMailOtp(email = "", maxAttempts = 20, interval = 3e3) {
    try {
      console.log(`[PixCraft] Menunggu OTP untuk: ${email}...`);
      for (let i = 1; i <= maxAttempts; i++) {
        await new Promise(r => setTimeout(r, interval));
        try {
          const res = await axios.get(`${this.mailApi}?action=message&email=${encodeURIComponent(email)}`);
          const messages = res?.data?.data || res?.data || [];
          if (Array.isArray(messages) && messages.length > 0) {
            for (const msg of messages) {
              const content = `${msg?.text_content || ""} ${msg?.html_content || ""} ${msg?.subject || ""}`;
              const otpMatch = content.match(/\b(\d{6})\b/);
              if (otpMatch) {
                console.log(`[PixCraft] OTP diterima: ${otpMatch[1]}`);
                return otpMatch[1];
              }
            }
          }
        } catch {}
      }
      return null;
    } catch (e) {
      console.error("[PixCraft] OTP error:", e?.message || e);
      return null;
    }
  }
  async _autoRegister() {
    try {
      this.email = await this._createTempMail();
      if (!this.email) return {
        status: false,
        error: "Gagal membuat temporary email"
      };
      console.log("[PixCraft] Mendaftarkan akun baru...");
      const encPassword = Buffer.from(this.password).toString("base64");
      const regRes = await this.http.post("/api/user/v1/user/register", {
        userEmail: this.email,
        userPassword: encPassword,
        userTenantId: 1
      });
      if (regRes?.data?.code !== 200) {
        return {
          status: false,
          error: regRes?.data?.msg || "Registrasi gagal"
        };
      }
      const regData = regRes?.data?.data || {};
      const otp = await this._getMailOtp(this.email);
      if (!otp) return {
        status: false,
        error: "Timeout menunggu OTP"
      };
      console.log("[PixCraft] Mengaktivasi akun...");
      const actRes = await this.http.post("/api/user/v1/user/register/active", {
        userId: String(regData.userId),
        codeId: String(regData.codeId),
        time: String(regData.time || new Date().toISOString()),
        userEmail: this.email,
        verificationCode: String(otp)
      });
      if (actRes?.data?.code !== 200) {
        return {
          status: false,
          error: actRes?.data?.msg || "Aktivasi gagal"
        };
      }
      console.log("[PixCraft] Login akun baru...");
      const loginRes = await this.http.post("/api/user/v1/user/login", {
        userEmail: this.email,
        userPassword: encPassword
      });
      const userToken = loginRes?.data?.data?.userToken;
      if (!userToken) {
        return {
          status: false,
          error: loginRes?.data?.msg || "Login gagal"
        };
      }
      this.authToken = userToken;
      try {
        await this.http.post("/api/user/v1/user/getRegisterMoney", {});
      } catch {}
      return {
        status: true,
        token: this.authToken
      };
    } catch (e) {
      console.error("[PixCraft] Auto-register error:", e?.response?.data || e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
    }
  }
  async _init(stateB64 = null) {
    try {
      if (stateB64) {
        this._importState(stateB64);
      }
      if (this.authToken && this.userInfoData) {
        return {
          status: true,
          token: this.authToken,
          user: this.userInfoData,
          state: this._exportState()
        };
      }
      if (this._initPromise) return await this._initPromise;
      this._initPromise = (async () => {
        try {
          if (!this.authToken) {
            if (!this.email) {
              const regResult = await this._autoRegister();
              if (!regResult?.status) return regResult;
            } else {
              console.log(`[PixCraft] Login akun: ${this.email}...`);
              const encPassword = Buffer.from(this.password).toString("base64");
              const loginRes = await this.http.post("/api/user/v1/user/login", {
                userEmail: this.email,
                userPassword: encPassword
              });
              if (loginRes?.data?.code !== 200 || !loginRes?.data?.data?.userToken) {
                return {
                  status: false,
                  error: loginRes?.data?.msg || "Login gagal"
                };
              }
              this.authToken = loginRes.data.data.userToken;
            }
          }
          const infoRes = await this.http.post("/api/user/v1/user/info", {});
          this.userInfoData = infoRes?.data?.data || {};
          console.log(`[PixCraft] Siap | Email: ${this.userInfoData?.userEmail || "-"} | Saldo: $${this.userInfoData?.userMoney ?? 0}`);
          return {
            status: true,
            token: this.authToken,
            user: this.userInfoData,
            state: this._exportState()
          };
        } catch (e) {
          console.error("[PixCraft] Inisialisasi error:", e?.message || e);
          return {
            status: false,
            error: e?.message || String(e)
          };
        } finally {
          this._initPromise = null;
        }
      })();
      return await this._initPromise;
    } catch (e) {
      console.error("[PixCraft] Init exception:", e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
    }
  }
  async models({
    state = null,
    type = "all"
  } = {}) {
    try {
      const initRes = await this._init(state);
      if (!initRes?.status) return {
        status: false,
        error: initRes?.error
      };
      console.log(`[PixCraft] Mengambil daftar model (${type})...`);
      const fetchT2I = async () => {
        try {
          if (this._cachedModels.t2i) return this._cachedModels.t2i;
          const res = await this.http.get("/api/user/v5/aiHub/t2i/models");
          this._cachedModels.t2i = res?.data?.data || [];
          return this._cachedModels.t2i;
        } catch {
          return [];
        }
      };
      const fetchI2I = async () => {
        try {
          if (this._cachedModels.i2i) return this._cachedModels.i2i;
          const res = await this.http.get("/api/user/v5/aiHub/i2i/models");
          this._cachedModels.i2i = res?.data?.data || [];
          return this._cachedModels.i2i;
        } catch {
          return [];
        }
      };
      const currentState = this._exportState();
      if (type === "t2i") {
        const data = await fetchT2I();
        return {
          status: true,
          state: currentState,
          type: "t2i",
          total: data.length,
          models: data
        };
      } else if (type === "i2i") {
        const data = await fetchI2I();
        return {
          status: true,
          state: currentState,
          type: "i2i",
          total: data.length,
          models: data
        };
      } else {
        const [t2i, i2i] = await Promise.all([fetchT2I(), fetchI2I()]);
        return {
          status: true,
          state: currentState,
          type: "all",
          t2i: {
            total: t2i.length,
            models: t2i
          },
          i2i: {
            total: i2i.length,
            models: i2i
          }
        };
      }
    } catch (e) {
      console.error("[PixCraft] Models error:", e?.message || e);
      return {
        status: false,
        error: e?.response?.data || e?.message || String(e)
      };
    }
  }
  async _validateModelParams({
    scene = "t2i",
    model = "",
    prompt = "",
    ratio = "",
    resolution = "",
    uploadedUrls = []
  }) {
    try {
      const modelsData = await this.models({
        type: scene
      });
      const list = modelsData?.models || (scene === "t2i" ? modelsData?.t2i?.models : modelsData?.i2i?.models) || [];
      let targetModel = list.find(m => m.modelName?.toLowerCase() === model?.toLowerCase());
      if (!targetModel) {
        targetModel = list.find(m => m.modelName === "wan2.7-image-pro") || list[0];
      }
      if (!targetModel) {
        throw new Error(`Model '${model}' tidak ditemukan.`);
      }
      const requiredFields = targetModel.requiredFields || [];
      if (requiredFields.includes("prompt") && !prompt?.trim()) {
        throw new Error(`Field 'prompt' wajib diisi untuk model '${targetModel.modelName}'`);
      }
      if (requiredFields.includes("imageUrl") && (!uploadedUrls || uploadedUrls.length === 0)) {
        throw new Error(`Field 'imageUrl' wajib disertakan untuk model '${targetModel.modelName}'`);
      }
      let finalRatio = ratio;
      const supportedRatios = targetModel.supportedAspectRatios || [];
      if (supportedRatios.length > 0) {
        if (!finalRatio || !supportedRatios.includes(finalRatio)) {
          finalRatio = supportedRatios.includes("16:9") ? "16:9" : supportedRatios[0];
        }
      } else {
        finalRatio = null;
      }
      let finalResolution = resolution;
      const supportedResolutions = targetModel.supportedResolutions || [];
      if (supportedResolutions.length > 0) {
        if (!finalResolution || !supportedResolutions.includes(finalResolution)) {
          finalResolution = supportedResolutions[0];
        }
      } else {
        finalResolution = null;
      }
      return {
        model: targetModel.modelName,
        modelDisplayName: targetModel.displayName,
        aspectRatio: finalRatio,
        resolution: finalResolution,
        meta: targetModel
      };
    } catch (e) {
      throw new Error(`[Validasi Error] ${e.message}`);
    }
  }
  async _toBuf(img = null) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          const r = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(r?.data || []);
        }
        if (/^data:image\/[a-z]+;base64,/i.test(img)) {
          return Buffer.from(img.replace(/^data:image\/[a-z]+;base64,/, ""), "base64");
        }
        return Buffer.from(img, "base64");
      }
      return null;
    } catch {
      return null;
    }
  }
  async _up(buf = null, filename = "image.png") {
    try {
      if (!buf) return {
        status: false,
        error: "Buffer kosong"
      };
      const preRes = await this.http.post("/api/file/v1/oss/presigned/url", {
        fileDirectoryUrl: "pixcraft/runtime-undress",
        fileName: `${Date.now()}_${filename}`,
        isSaveOriginalName: false
      });
      const ossData = preRes?.data?.data;
      if (!ossData?.s3CloudUrl || !ossData?.host) {
        return {
          status: false,
          error: preRes?.data?.msg || "Gagal generate OSS URL"
        };
      }
      const fd = new FormData();
      fd.append("key", ossData.s3CloudUrl);
      fd.append("x-oss-signature-version", ossData.signatureVersion || "OSS4-HMAC-SHA256");
      fd.append("x-oss-credential", ossData.x_oss_credential);
      fd.append("x-oss-date", ossData.x_oss_date);
      fd.append("x-oss-security-token", ossData.security_token);
      fd.append("policy", ossData.policy);
      fd.append("signature", ossData.signature);
      fd.append("success_action_status", "200");
      fd.append("file", buf, {
        filename: filename,
        contentType: "image/png"
      });
      await axios.post(ossData.host, fd, {
        headers: {
          ...fd.getHeaders()
        }
      });
      const saveRes = await this.http.post("/api/file/v1/oss/saveFile", {
        fileName: filename,
        s3CloudUrl: ossData.s3CloudUrl
      });
      const fileFullUrl = saveRes?.data?.data?.fileS3CloudUrlFull;
      if (!fileFullUrl) {
        return {
          status: false,
          error: saveRes?.data?.msg || "Gagal menyimpan file"
        };
      }
      return {
        status: true,
        fileUrl: fileFullUrl
      };
    } catch (e) {
      console.error("[PixCraft] Upload error:", e?.message || e);
      return {
        status: false,
        error: e?.response?.data || e?.message || String(e)
      };
    }
  }
  async _poll(taskId = "", max = 60, interval = 3e3) {
    try {
      if (!taskId) return {
        status: false,
        error: "Task ID kosong"
      };
      console.log(`[PixCraft] Memulai polling Task ID: ${taskId}`);
      for (let i = 1; i <= max; i++) {
        await new Promise(r => setTimeout(r, interval));
        try {
          const res = await this.http.post("/api/user/v5/aiHub/list", {
            agentRoute: "ai-photo-generator",
            current: 1,
            size: 20,
            types: ["6"]
          });
          const taskList = res?.data?.data?.list || [];
          const currentTask = taskList.find(t => String(t.id || t.taskId).trim() === String(taskId).trim());
          if (currentTask) {
            const status = Number(currentTask.resultStatus);
            const statusDesc = status === 0 ? "Antrean (0)" : status === 5 ? "Generating AI (5)" : status === 1 ? "Selesai (1)" : `Status (${status})`;
            console.log(`[PixCraft] Polling #${i}/${max} - ${statusDesc}`);
            if ((status === 1 || Boolean(currentTask.resultUrl)) && currentTask.resultUrl) {
              console.log("[PixCraft] Task berhasil selesai!");
              return {
                status: true,
                data: currentTask
              };
            }
            if (status === 2 || status === 3 || status === -1 || currentTask.errorCategory && status !== 0 && status !== 5) {
              return {
                status: false,
                error: currentTask.remark || currentTask.errorCategory || `Task gagal dengan status code: ${status}`
              };
            }
          } else {
            console.log(`[PixCraft] Polling #${i}/${max} - Menunggu task masuk antrean...`);
          }
        } catch (err) {
          console.warn(`[PixCraft] Polling network retry #${i}:`, err?.message || err);
        }
      }
      return {
        status: false,
        error: `Polling timeout setelah ${max * (interval / 1e3)} detik.`
      };
    } catch (e) {
      console.error("[PixCraft] Polling error:", e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
    }
  }
  async generate({
    state = null,
    prompt = "",
    image = null,
    images = null,
    model = "wan2.7-image-pro",
    ratio = "16:9",
    resolution = "",
    ...rest
  } = {}) {
    try {
      const initRes = await this._init(state);
      if (!initRes?.status) return {
        status: false,
        error: initRes?.error
      };
      let rawImages = [];
      if (images) {
        rawImages = Array.isArray(images) ? images : [images];
      } else if (image) {
        rawImages = Array.isArray(image) ? image : [image];
      }
      const isI2I = rawImages.length > 0;
      const scene = isI2I ? "i2i" : "t2i";
      const uploadedImageUrls = [];
      if (isI2I) {
        console.log(`[PixCraft] Mengunggah ${rawImages.length} gambar ke OSS...`);
        for (const [index, item] of rawImages.entries()) {
          const buf = await this._toBuf(item);
          if (!buf) return {
            status: false,
            error: `Buffer gambar ke-${index + 1} tidak valid`
          };
          const upRes = await this._up(buf, `input_${index + 1}.png`);
          if (!upRes?.status) return {
            status: false,
            error: upRes?.error || `Upload gambar ke-${index + 1} gagal`
          };
          uploadedImageUrls.push(upRes.fileUrl);
        }
      }
      const primaryImageUrl = uploadedImageUrls[0] || null;
      const valid = await this._validateModelParams({
        scene: scene,
        model: model,
        prompt: prompt,
        ratio: ratio,
        resolution: resolution,
        uploadedUrls: uploadedImageUrls
      });
      console.log(`[PixCraft] Generate [${scene.toUpperCase()}] Model: ${valid.model}`);
      let taskPayload = {
        agentRoute: "ai-photo-generator",
        model: valid.model,
        scene: scene,
        prompt: prompt,
        type: "6",
        ...rest
      };
      if (valid.aspectRatio) taskPayload.aspectRatio = valid.aspectRatio;
      if (valid.resolution) taskPayload.resolution = valid.resolution;
      let editObj = {
        model: valid.model,
        scene: scene,
        prompt: prompt
      };
      if (valid.aspectRatio) editObj.aspectRatio = valid.aspectRatio;
      if (valid.resolution) editObj.resolution = valid.resolution;
      if (isI2I) {
        taskPayload.imageUrl = primaryImageUrl;
        taskPayload.imageUrls = uploadedImageUrls;
        editObj.imageUrl = primaryImageUrl;
        editObj.imageUrls = uploadedImageUrls;
      }
      taskPayload.edit = JSON.stringify(editObj);
      const res = await this.http.post("/api/user/v5/aiHub/saveTask", taskPayload);
      const taskId = res?.data?.data;
      if (!taskId || res?.data?.code !== 200) {
        return {
          status: false,
          error: res?.data?.msg || `Gagal submit task: ${JSON.stringify(res?.data)}`
        };
      }
      console.log(`[PixCraft] Task ID: ${taskId} | Menunggu antrean...`);
      const pollRes = await this._poll(taskId, rest.maxPoll || 60, rest.pollInterval || 3e3);
      if (!pollRes?.status) return {
        status: false,
        error: pollRes?.error
      };
      const taskData = pollRes.data;
      return {
        status: true,
        state: this._exportState(),
        taskId: taskData.id,
        model: taskData.model,
        modelDisplayName: taskData.modelDisplayName,
        scene: scene,
        resultUrl: taskData.resultUrl,
        resultThumbnailUrl: taskData.resultThumbnailUrl,
        aspectRatio: taskData.resolutionLabel || valid.aspectRatio,
        createTime: taskData.createTime,
        resultProcessingTime: taskData.resultProcessingTime
      };
    } catch (e) {
      console.error("[PixCraft] Generate error:", e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["models", "generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          models: "/?action=models&type=all (type: 'all' | 't2i' | 'i2i', state?: 'base64...')",
          generate: "/?action=generate (POST body: { prompt: 'A cute cat', model: 'wan2.7-image-pro', ratio: '16:9', image?: 'https://...', state?: 'base64...' })"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new PixCraftAI();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (response?.status === false) {
      return res.status(400).json(response);
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}