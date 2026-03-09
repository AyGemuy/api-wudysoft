import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.base = "https://dh3ai.com";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
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
      origin: this.base,
      referer: `${this.base}/ai-image/dh3`
    };
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      baseURL: this.base,
      headers: this.headers
    }));
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async req(method, url, data = null, customHeaders = {}) {
    try {
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...customHeaders
        }
      };
      if (data) config.data = data;
      if (data instanceof URLSearchParams) {
        config.headers["content-type"] = "application/x-www-form-urlencoded";
      }
      const res = await this.client(config);
      return res;
    } catch (e) {
      throw new Error(`Req Fail: ${url} - ${e.response?.status || "No Status"} ${e.response?.statusText || ""} || ${e.message}`);
    }
  }
  exportState() {
    const serialized = this.jar.toJSON();
    return Buffer.from(JSON.stringify(serialized)).toString("base64");
  }
  importState(state) {
    if (!state) return false;
    try {
      const jsonStr = Buffer.from(state, "base64").toString("utf-8");
      const jsonData = JSON.parse(jsonStr);
      this.jar = CookieJar.fromJSON(jsonData);
      return true;
    } catch (e) {
      this.log("Invalid state provided", "WARN");
      return false;
    }
  }
  async getCsrf() {
    const res = await this.req("GET", "/api/auth/csrf");
    return res?.data?.csrfToken;
  }
  async auth() {
    this.log("Starting Auto Login...", "AUTH");
    try {
      const csrfToken = await this.getCsrf();
      if (!csrfToken) throw new Error("Failed to get CSRF Token");
      const mailClient = axios.create({
        baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
      });
      const mailCreate = await mailClient.get("", {
        params: {
          action: "create"
        }
      });
      const email = mailCreate?.data?.email;
      if (!email) throw new Error("Failed to generate temp email");
      this.log(`Temp Email: ${email}`, "AUTH");
      await this.req("POST", "/api/auth/email-verification", {
        email: email
      }, {
        "content-type": "application/json"
      });
      this.log("Verification code requested", "AUTH");
      let otp = null;
      for (let i = 0; i < 60; i++) {
        await this.sleep(3e3);
        const check = await mailClient.get("", {
          params: {
            action: "message",
            email: email
          }
        });
        const messages = check?.data?.data || [];
        const latest = messages[0];
        if (latest?.text_content) {
          const match = latest.text_content.match(/\b\d{6}\b/);
          if (match) {
            otp = match[0];
            this.log(`OTP Found: ${otp}`, "AUTH");
            break;
          }
        }
      }
      if (!otp) throw new Error("Timeout waiting for OTP");
      const params = new URLSearchParams();
      params.append("email", email);
      params.append("code", otp);
      params.append("redirect", "false");
      params.append("csrfToken", csrfToken);
      params.append("callbackUrl", "https://dh3ai.com/ai-image/dh3");
      await this.req("POST", "/api/auth/callback/email-verification?", params, {
        "x-auth-return-redirect": "1"
      });
      await this.req("GET", "/api/auth/session");
      const userInfo = await this.req("POST", "/api/get-user-info");
      const credits = userInfo?.data?.data?.credits?.left_credits ?? 0;
      this.log(`Login Success. Credits: ${credits}`, "SUCCESS");
      return true;
    } catch (e) {
      this.log(`Login Failed: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async solveImg(input) {
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      if (input.startsWith("data:image")) return Buffer.from(input.split(",")[1], "base64");
      if (input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      try {
        return Buffer.from(input, "base64");
      } catch {
        return null;
      }
    }
    return null;
  }
  async up(imageInput) {
    this.log("Uploading image...", "UPLOAD");
    try {
      const buf = await this.solveImg(imageInput);
      if (!buf) throw new Error("Invalid image input");
      const form = new FormData();
      form.append("file", buf, {
        filename: `${crypto.randomUUID()}.jpg`,
        contentType: "image/jpeg"
      });
      const csrf = await this.getCsrf() || "";
      const {
        data
      } = await this.client.post("/api/upload", form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          "x-csrf-token": csrf
        }
      });
      if (data?.url) {
        this.log(`Uploaded: ${data.url}`, "UPLOAD");
        return data.url;
      }
      throw new Error("Upload response missing URL");
    } catch (e) {
      this.log(`Upload failed: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async generate({
    state,
    prompt,
    image,
    images,
    ...rest
  }) {
    try {
      if (state) {
        const loaded = this.importState(state);
        if (!loaded) await this.auth();
        try {
          await this.req("POST", "/api/get-user-info");
        } catch {
          this.log("Session expired, re-login...", "WARN");
          await this.auth();
        }
      } else {
        await this.auth();
      }
      const currentState = this.exportState();
      const inputImages = [];
      const rawList = images || (image ? [image] : []);
      if (rawList.length > 0) {
        this.log(`Processing ${rawList.length} images...`, "PROCESS");
        for (const img of rawList) {
          if (typeof img === "string" && (img.includes("dh3ai.com") || img.includes("v03ai.com"))) {
            inputImages.push(img);
          } else {
            const uploadedUrl = await this.up(img);
            inputImages.push(uploadedUrl);
          }
        }
      }
      const payload = {
        prompt: prompt || "masterpiece, best quality",
        image_urls: inputImages.length > 0 ? inputImages : undefined,
        output_format: rest.output_format || "png",
        image_size: rest.image_size || "auto",
        enable_translation: rest.enable_translation || false,
        width: rest.width || 1024,
        height: rest.height || 1024,
        steps: rest.steps || 20,
        guidance_scale: rest.guidance_scale || 7.5,
        is_public: false
      };
      this.log(`Sending Task [${inputImages.length > 0 ? "I2I" : "T2I"}]`, "GEN");
      const createRes = await this.req("POST", "/api/image-generation-nano-banana/create", payload, {
        "content-type": "application/json"
      });
      const taskId = createRes?.data?.taskId || createRes?.data?.task_id;
      if (!taskId) throw new Error(`No Task ID: ${JSON.stringify(createRes.data)}`);
      this.log(`Task ID: ${taskId}`, "GEN");
      let finalResult = null;
      for (let i = 0; i < 60; i++) {
        await this.sleep(3e3);
        const statusRes = await this.req("POST", "/api/image-generation-nano-banana/status", {
          taskId: taskId
        }, {
          "content-type": "application/json"
        });
        const data = statusRes?.data;
        const gen = data?.generations?.[0];
        const status = gen?.status;
        if (status === "succeed") {
          finalResult = data?.generations;
          this.log(`Success: ${gen.url}`, "SUCCESS");
          break;
        } else if (status === "failed") {
          throw new Error(gen.failMsg || "Generation failed");
        } else {
          process.stdout.write(".");
        }
      }
      if (!finalResult) throw new Error("Timeout generating image");
      return {
        result: finalResult,
        state: currentState,
        info: "Success"
      };
    } catch (e) {
      this.log(`Error: ${e.message}`, "ERROR");
      return {
        result: null,
        state: this.exportState(),
        info: e.message
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
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}