import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class SoraAI {
  constructor() {
    this.base = "https://soraaivideogenerator.org";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
  }
  log(msg) {
    console.log(`[SoraAI] ${msg}`);
  }
  encState(data = {}) {
    try {
      const obj = {
        ...data,
        base: this.base,
        ts: Date.now()
      };
      const json = JSON.stringify(obj);
      return Buffer.from(json).toString("base64");
    } catch (err) {
      this.log(`Encode state error: ${err?.message}`);
      return null;
    }
  }
  decState(state) {
    try {
      const json = Buffer.from(state, "base64").toString("utf-8");
      const obj = JSON.parse(json);
      return obj || {};
    } catch (err) {
      this.log(`Decode state error: ${err?.message}`);
      return {};
    }
  }
  createAx(cookieStr = "") {
    const ax = axios.create({
      baseURL: this.base,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: this.base,
        Referer: this.base + "/"
      }
    });
    let cookies = cookieStr || "";
    ax.interceptors.request.use(config => {
      if (cookies) {
        config.headers["Cookie"] = cookies;
      }
      this.log(`→ ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, err => Promise.reject(err));
    ax.interceptors.response.use(res => {
      const setCookie = res.headers?.["set-cookie"];
      if (setCookie) {
        const newCookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        const parsed = newCookies.map(c => c.split(";")[0]).filter(Boolean);
        if (parsed.length > 0) {
          const existing = cookies ? cookies.split("; ") : [];
          const merged = [...existing];
          parsed.forEach(newC => {
            const name = newC.split("=")[0];
            const idx = merged.findIndex(c => c.startsWith(name + "="));
            if (idx >= 0) {
              merged[idx] = newC;
            } else {
              merged.push(newC);
            }
          });
          cookies = merged.join("; ");
          this.log(`Cookies updated: ${cookies.substring(0, 80)}...`);
        }
      }
      this.log(`← ${res.status} ${res.config.url}`);
      return res;
    }, err => {
      this.log(`✗ ${err?.response?.status || "ERR"} ${err?.config?.url}`);
      return Promise.reject(err);
    });
    ax.getCookies = () => cookies;
    return ax;
  }
  async createMail() {
    try {
      this.log("Creating temp mail...");
      const {
        data
      } = await axios.get(this.mailApi, {
        params: {
          action: "create"
        }
      });
      return data?.email || null;
    } catch (err) {
      this.log(`Mail error: ${err?.message}`);
      return null;
    }
  }
  async getOtp(email) {
    try {
      this.log("Checking OTP...");
      const {
        data
      } = await axios.get(this.mailApi, {
        params: {
          action: "message",
          email: email
        }
      });
      const msg = data?.data?.[0]?.text_content || "";
      const match = msg.match(/token=([a-f0-9-]+)/i);
      return match?.[1] || null;
    } catch (err) {
      this.log(`OTP error: ${err?.message}`);
      return null;
    }
  }
  async signup(ax, email, pass) {
    try {
      this.log("Signing up...");
      await ax.post("/api/auth/sign-up/email", {
        email: email,
        password: pass,
        name: email
      });
      return true;
    } catch (err) {
      this.log(`Signup error: ${err?.response?.data?.message || err?.message}`);
      return false;
    }
  }
  async verify(ax, token) {
    try {
      this.log("Verifying email...");
      const {
        data
      } = await ax.post("/api/auth/verify-email", {
        token: token
      });
      return data?.data?.success || false;
    } catch (err) {
      this.log(`Verify error: ${err?.response?.data?.message || err?.message}`);
      return false;
    }
  }
  async signin(ax, email, pass) {
    try {
      this.log("Signing in...");
      const {
        data
      } = await ax.post("/api/auth/sign-in/email", {
        email: email,
        password: pass,
        callbackURL: "/"
      });
      const token = data?.token || null;
      const user = data?.user || null;
      if (!token) return null;
      this.log("Signin success");
      return {
        token: token,
        user: user
      };
    } catch (err) {
      this.log(`Signin error: ${err?.response?.data?.message || err?.message}`);
      return null;
    }
  }
  async autoReg() {
    try {
      const mail = await this.createMail();
      if (!mail) return null;
      this.log(`Mail created: ${mail}`);
      const pass = mail;
      const ax = this.createAx();
      if (!await this.signup(ax, mail, pass)) return null;
      await new Promise(r => setTimeout(r, 3e3));
      let otp = null;
      for (let i = 0; i < 60; i++) {
        otp = await this.getOtp(mail);
        if (otp) break;
        await new Promise(r => setTimeout(r, 3e3));
      }
      if (!otp) {
        this.log("OTP not received");
        return null;
      }
      this.log(`OTP received: ${otp}`);
      if (!await this.verify(ax, otp)) return null;
      const auth = await this.signin(ax, mail, pass);
      if (!auth) return null;
      const cookieStr = ax.getCookies();
      this.log(`Cookies captured: ${cookieStr.substring(0, 80)}...`);
      const state = this.encState({
        token: auth.token,
        cookies: cookieStr,
        user: auth.user,
        email: mail
      });
      this.log("Auto registration success");
      return {
        state: state,
        email: mail,
        token: auth.token,
        cookies: cookieStr,
        user: auth.user
      };
    } catch (err) {
      this.log(`Auto reg error: ${err?.message}`);
      return null;
    }
  }
  async uploadImg(state, img) {
    try {
      const isUrl = typeof img === "string" && /^https?:\/\//i.test(img);
      const isBuf = Buffer.isBuffer(img);
      const isB64 = typeof img === "string" && /^data:image/.test(img);
      let file;
      let filename = "image.png";
      let mimetype = "image/png";
      if (isUrl) {
        this.log("Downloading image from URL...");
        const {
          data,
          headers
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        file = Buffer.from(data);
        const contentType = headers?.["content-type"];
        if (contentType) {
          mimetype = contentType;
          const ext = contentType.split("/")[1]?.split(";")[0];
          if (ext) filename = `image.${ext}`;
        }
      } else if (isBuf) {
        file = img;
        const magic = file.slice(0, 4).toString("hex");
        if (magic.startsWith("89504e47")) {
          mimetype = "image/png";
          filename = "image.png";
        } else if (magic.startsWith("ffd8ff")) {
          mimetype = "image/jpeg";
          filename = "image.jpg";
        } else if (magic.startsWith("47494638")) {
          mimetype = "image/gif";
          filename = "image.gif";
        } else if (magic.startsWith("52494646")) {
          mimetype = "image/webp";
          filename = "image.webp";
        }
      } else if (isB64) {
        const match = img.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          mimetype = match[1];
          const ext = mimetype.split("/")[1];
          filename = `image.${ext}`;
          file = Buffer.from(match[2], "base64");
        } else {
          const b64 = img.split(",")[1] || img;
          file = Buffer.from(b64, "base64");
        }
      } else {
        throw new Error("Invalid image format");
      }
      const {
        cookies = ""
      } = this.decState(state);
      const uniqueFilename = `${crypto.randomUUID()}.${filename.split(".").pop()}`;
      this.log(`Uploading image (${uniqueFilename}, ${mimetype})...`);
      const ax = this.createAx(cookies);
      const form = new FormData();
      form.append("files", file, {
        filename: uniqueFilename,
        contentType: mimetype
      });
      const {
        data
      } = await ax.post("/api/storage/upload-image", form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      if (data?.code !== 0) throw new Error(data?.message || "Upload failed");
      const url = data?.data?.urls?.[0] || null;
      this.log(`Image uploaded: ${url}`);
      return url;
    } catch (err) {
      this.log(`Upload error: ${err?.response?.data?.message || err?.message}`);
      if (err?.response?.data) {
        this.log(`Error details: ${JSON.stringify(err.response.data)}`);
      }
      return null;
    }
  }
  async getUserInfo(state) {
    try {
      this.log("Getting user info...");
      const {
        cookies = ""
      } = this.decState(state);
      const ax = this.createAx(cookies);
      const {
        data
      } = await ax.post("/api/user/get-user-info");
      if (data?.code !== 0) {
        this.log(`Get user info error: ${data?.message}`);
        return null;
      }
      const user = data?.data || null;
      this.log(`User credits: ${user?.credits?.remainingCredits || 0}`);
      return user;
    } catch (err) {
      this.log(`Get user info error: ${err?.message}`);
      return null;
    }
  }
  async status({
    state,
    task_id
  }) {
    try {
      this.log(`Checking status: ${task_id}`);
      const {
        cookies = ""
      } = this.decState(state);
      const ax = this.createAx(cookies);
      const {
        data
      } = await ax.post("/api/ai/query", {
        taskId: task_id
      });
      if (data?.code !== 0) {
        this.log(`Query error: ${data?.message}`);
        return {
          success: false,
          message: data?.message,
          status: "error"
        };
      }
      const status = data?.data?.status || "pending";
      const taskInfo = data?.data?.taskInfo ? JSON.parse(data.data.taskInfo) : {};
      const taskResult = data?.data?.taskResult ? JSON.parse(data.data.taskResult) : null;
      this.log(`Task status: ${status}`);
      if (status === "failed") {
        const failMsg = taskInfo?.failMsg || taskInfo?.failMessage || "Task failed";
        const failCode = taskInfo?.failCode || taskInfo?.errorCode;
        this.log(`Task failed: ${failMsg} (code: ${failCode})`);
        return {
          success: false,
          status: "failed",
          message: failMsg,
          failCode: failCode,
          taskInfo: taskInfo
        };
      }
      if (status === "SUCCESS" || status === "success") {
        this.log("Task completed");
        return {
          success: true,
          status: "success",
          videoUrl: taskResult?.videoUrl || null,
          data: data?.data
        };
      }
      return {
        success: true,
        status: status?.toLowerCase() || "processing",
        message: "Task in progress",
        data: data?.data
      };
    } catch (err) {
      this.log(`Status error: ${err?.message}`);
      return {
        success: false,
        status: "error",
        message: err?.message
      };
    }
  }
  async generate({
    state,
    prompt,
    image,
    ...rest
  }) {
    try {
      let authState = state;
      if (!authState) {
        this.log("No state provided, auto register...");
        const auth = await this.autoReg();
        if (!auth) throw new Error("Registration failed");
        authState = auth.state;
      }
      const {
        cookies = ""
      } = this.decState(authState);
      const ax = this.createAx(cookies);
      const payload = {
        mediaType: rest?.mediaType || "video",
        model: rest?.model || "sora-2-text-to-video",
        ...rest
      };
      if (!payload.options) {
        payload.options = {};
      }
      if (!payload.options.aspect_ratio) {
        payload.options.aspect_ratio = rest?.aspectRatio || rest?.aspect_ratio || "landscape";
      }
      if (!payload.options.n_frames) {
        payload.options.n_frames = rest?.duration || rest?.n_frames || "10";
      }
      if (!payload.options.size && rest?.size) {
        payload.options.size = rest.size;
      }
      if (image) {
        const imgs = Array.isArray(image) ? image : [image];
        const urls = [];
        for (const img of imgs) {
          const url = await this.uploadImg(authState, img);
          if (url) urls.push(url);
        }
        if (urls.length === 0) throw new Error("Image upload failed");
        payload.options.imageUrl = urls[0];
        payload.imageUrl = urls[0];
        if (!rest?.model) payload.model = "sora-2-image-to-video";
      }
      if (prompt) payload.prompt = prompt;
      this.log("Generating video...");
      this.log(`Payload: ${JSON.stringify(payload)}`);
      const {
        data
      } = await ax.post("/api/ai/generate", payload);
      if (data?.code !== 0) throw new Error(data?.message || "Generate failed");
      const taskId = data?.data?.id;
      if (!taskId) throw new Error("No task ID received");
      this.log(`Task created: ${taskId}`);
      return {
        success: true,
        task_id: taskId,
        state: authState,
        message: "Task created successfully",
        data: data?.data
      };
    } catch (err) {
      this.log(`Generate error: ${err?.response?.data?.message || err?.message}`);
      if (err?.response?.data) {
        this.log(`Error details: ${JSON.stringify(err.response.data)}`);
      }
      return {
        success: false,
        message: err?.response?.data?.message || err?.message,
        error: err
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status"]
    });
  }
  const api = new SoraAI();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "A futuristic car driving through neon city"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id || !params.state) {
          return res.status(400).json({
            error: "Parameter 'task_id' dan 'state' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              task_id: "xxxxxxxxx",
              state: "eyxxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}