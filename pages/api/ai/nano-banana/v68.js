import axios from "axios";
import http from "http";
import https from "https";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class NanoBanana {
  constructor() {
    this.BASE = "https://www.aiai.com/aitab";
    this.BASE_AI = "https://www.aiai.com/aitab/api-ai/v1/frontend";
    this.BASE_API = "https://www.aiai.com/aitab/api/frontend";
    this.BASE_SUB = "https://www.aiai.com/aitab/api-subscribe/v1/frontend";
    this.MAIL_API = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.APP_ID = "101";
    this.HEADERS = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      accept: "*/*",
      "accept-language": "en",
      "x-timezone": "Asia/Makassar",
      "x-device-type": "mobile",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      origin: "https://www.aiai.com",
      referer: "https://www.aiai.com/image/ai-image-to-image-generator",
      ...SpoofHead()
    };
    this.cookies = {};
    this.token = null;
    this.client = axios.create();
    const self = this;
    this.client.interceptors.request.use(function(config) {
      try {
        const cookieStr = self.getCookieString();
        if (cookieStr) {
          config.headers = config.headers || {};
          config.headers["cookie"] = cookieStr;
        }
        console.log("[req] Cookie dikirim:", cookieStr ? cookieStr.slice(0, 60) + "..." : "(kosong)");
      } catch (e) {
        console.warn("[req] interceptor error:", e.message);
      }
      return config;
    });
    this.client.interceptors.response.use(function(res) {
      try {
        const setCookie = res.headers["set-cookie"];
        if (setCookie && setCookie.length) {
          for (let i = 0; i < setCookie.length; i++) {
            self.parseSetCookie(setCookie[i]);
          }
        }
      } catch (e) {
        console.warn("[res] interceptor error:", e.message);
      }
      return res;
    }, function(err) {
      try {
        const setCookie = err.response?.headers?.["set-cookie"];
        if (setCookie && setCookie.length) {
          for (let i = 0; i < setCookie.length; i++) {
            self.parseSetCookie(setCookie[i]);
          }
        }
      } catch (e) {
        console.warn("[err] interceptor error:", e.message);
      }
      return Promise.reject(err);
    });
  }
  parseSetCookie(raw) {
    try {
      const part = raw.split(";")[0].trim();
      const idx = part.indexOf("=");
      if (idx < 0) return;
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      this.cookies[name] = value;
      console.log("[cookie] Set:", name, "=", value.slice(0, 30) + (value.length > 30 ? "..." : ""));
    } catch (e) {
      console.warn("[cookie] parse error:", e.message);
    }
  }
  getCookieString() {
    const parts = [];
    for (const name in this.cookies) {
      if (this.cookies.hasOwnProperty(name)) parts.push(name + "=" + this.cookies[name]);
    }
    return parts.join("; ");
  }
  setCookie(name, value) {
    this.cookies[name] = value;
    console.log("[cookie] manual set:", name);
  }
  delay(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
  headers(extra) {
    return Object.assign({}, this.HEADERS, extra || {});
  }
  _genPassword() {
    return "Pass" + crypto.randomBytes(8).toString("hex") + "!";
  }
  async toUrl(img) {
    console.log("[toUrl] start");
    try {
      let buffer, mime = "image/jpeg";
      if (typeof img === "string" && img.startsWith("http")) {
        console.log("[toUrl] Fetching from URL:", img);
        const fetchRes = await axios.get(img, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(fetchRes.data);
        mime = fetchRes.headers["content-type"] || "image/jpeg";
      } else if (Buffer.isBuffer(img)) {
        buffer = img;
      } else if (typeof img === "string") {
        const match = img.match(/^data:(image\/\w+);base64,(.+)/);
        if (match) {
          mime = match[1];
          buffer = Buffer.from(match[2], "base64");
        } else {
          throw new Error("Invalid base64 image");
        }
      } else {
        throw new Error("Unsupported image type");
      }
      const fname = Date.now() + "_" + Math.random().toString(36).slice(2) + ".jpg";
      const signRes = await this.client.post(this.BASE_API + "/oss/sign-upload-file-url", {
        file_name: fname,
        content_type: mime,
        method: "PUT",
        scene: "UPLOAD"
      }, {
        headers: this.headers({
          "content-type": "application/json"
        })
      });
      const signedUrl = signRes.data?.d?.url;
      if (!signedUrl) throw new Error("signed url kosong");
      await axios.put(signedUrl, buffer, {
        headers: {
          "content-type": mime,
          "content-length": buffer.length
        }
      });
      const finalUrl = signedUrl.split("?")[0];
      console.log("[toUrl] final URL:", finalUrl);
      return finalUrl;
    } catch (e) {
      console.error("[toUrl] Error:", e.message);
      throw new Error("toUrl: " + e.message);
    }
  }
  async createEmail() {
    console.log("[createEmail] create email");
    const res = await axios.get(this.MAIL_API + "?action=create");
    const email = res.data?.email;
    if (!email) throw new Error("email kosong");
    console.log("[createEmail] email:", email);
    return email;
  }
  async sendOtp(email) {
    console.log("[sendOtp] send OTP ke", email);
    await this.client.post(this.BASE_API + "/captcha/send-email", {
      email: email,
      scene: "register_verify_email"
    }, {
      headers: this.headers({
        "content-type": "application/json"
      })
    });
    console.log("[sendOtp] terkirim");
  }
  async waitOtp(email, timeoutMs = 6e4) {
    console.log("[waitOtp] polling", email);
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      await this.delay(3e3);
      const res = await axios.get(this.MAIL_API + "?action=message&email=" + encodeURIComponent(email));
      const msgs = res.data?.data || [];
      for (let i = 0; i < msgs.length; i++) {
        const match = (msgs[i].text_content || "").match(/\b(\d{6})\b/);
        if (match) {
          console.log("[waitOtp] code:", match[1]);
          return match[1];
        }
      }
    }
    throw new Error("waitOtp timeout");
  }
  async verifyOtp(email, code) {
    console.log("[verifyOtp] verify code", code);
    const res = await this.client.post(this.BASE_API + "/user/verify-code", {
      scene: "register_verify_email",
      code: code,
      email: email
    }, {
      headers: this.headers({
        "content-type": "application/json"
      })
    });
    const vToken = res.data?.d?.token;
    if (!vToken) throw new Error("verify token kosong");
    return vToken;
  }
  async doLogin(email, vToken) {
    console.log("[doLogin] login as", email);
    const pass = this._genPassword();
    await this.client.post(this.BASE_API + "/user/login", {
      platform: "web",
      http_referer: "https://www.google.com/",
      landing_page: "https://www.aiai.com/image/ai-nano-banana-image-generator",
      landing_page_with_utm: "",
      device: crypto.randomBytes(16).toString("hex"),
      key: email,
      value: pass,
      type: 2,
      is_sign: 1,
      recaptchaKey: "",
      email_verify_token: vToken
    }, {
      headers: this.headers({
        "content-type": "application/json"
      })
    });
    const knU = this.cookies["__kn_u"];
    if (!knU) throw new Error("__kn_u tidak ditemukan");
    this.token = knU;
    console.log("[doLogin] token:", this.token.slice(0, 30) + "...");
  }
  async doSubscribe() {
    console.log("[doSubscribe] start SSE");
    const self = this;
    return new Promise(function(resolve, reject) {
      try {
        const cookieStr = self.getCookieString();
        const url = new URL(self.BASE_SUB + "/subscribe?app_id=" + self.APP_ID);
        const lib = url.protocol === "https:" ? https : http;
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: "GET",
          headers: Object.assign({}, self.HEADERS, {
            accept: "text/event-stream",
            "cache-control": "no-cache",
            pragma: "no-cache",
            cookie: cookieStr
          })
        };
        let gotReward = false;
        let resolved = false;
        let buffer = "";
        const done = function(req) {
          if (resolved) return;
          resolved = true;
          if (req) try {
            req.destroy();
          } catch (e) {}
          console.log("[doSubscribe] selesai, reward:", gotReward);
          resolve({
            gotReward: gotReward
          });
        };
        const req = lib.request(options, function(res) {
          console.log("[doSubscribe] response status:", res.statusCode);
          if (res.statusCode !== 200) {
            reject(new Error("SSE status " + res.statusCode));
            return;
          }
          const setCookie = res.headers["set-cookie"];
          if (setCookie && setCookie.length) {
            for (let i = 0; i < setCookie.length; i++) self.parseSetCookie(setCookie[i]);
          }
          res.on("data", function(chunk) {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (let i = 0; i < lines.length; i++) {
              const trimmed = lines[i].trim();
              if (!trimmed.startsWith("data:")) continue;
              let evt;
              try {
                evt = JSON.parse(trimmed.slice(5).trim());
              } catch (e) {
                continue;
              }
              const etype = evt.event_type;
              console.log("[doSubscribe] event:", etype);
              if (etype === "user_register_reward_provide_notice") {
                gotReward = true;
                done(req);
              }
            }
          });
          res.on("end", function() {
            done(req);
          });
          res.on("error", function(e) {
            console.warn("[doSubscribe] stream error:", e.message);
            done(req);
          });
        });
        req.setTimeout(15e3, function() {
          console.warn("[doSubscribe] timeout 15s, lanjut");
          done(req);
        });
        req.on("error", function(e) {
          if (!resolved) reject(e);
        });
        req.end();
      } catch (e) {
        reject(e);
      }
    });
  }
  async checkUsage() {
    console.log("[checkUsage] check subscription usage");
    const res = await this.client.get(this.BASE_API + "/subscription/user-subscription-usage", {
      headers: this.headers()
    });
    const data = res.data?.d || {};
    console.log("[checkUsage] plan:", data.plan_name, "credits:", data.credits);
    return data;
  }
  async estimateCost(templateId, images = []) {
    console.log("[estimateCost] template:", templateId);
    try {
      const res = await this.client.post(this.BASE_AI + "/gen/task/calculate-consumption", {
        template_id: templateId,
        images: images,
        prompt: "",
        resolution: "2K",
        aspect_ratio: "match_input_image"
      }, {
        headers: this.headers({
          "content-type": "application/json",
          app_id: this.APP_ID
        })
      });
      const cost = res.data?.d?.value || 0;
      console.log("[estimateCost] cost:", cost);
      return cost;
    } catch (e) {
      console.warn("[estimateCost] gagal (lanjut):", e.message);
      return 0;
    }
  }
  async setToken(token) {
    console.log("[setToken] set token manual");
    this.token = token;
    this.setCookie("__kn_u", token);
    this.setCookie("x-device-type", "mobile");
  }
  async ensureToken() {
    console.log("[ensureToken] ensure token valid");
    if (this.token) {
      console.log("[ensureToken] token sudah ada");
      return;
    }
    console.log("[ensureToken] registrasi baru");
    const email = await this.createEmail();
    await this.sendOtp(email);
    const code = await this.waitOtp(email);
    const vToken = await this.verifyOtp(email, code);
    await this.doLogin(email, vToken);
    await this.doSubscribe();
    await this.checkUsage();
    console.log("[ensureToken] token siap");
  }
  async models(options = {}) {
    console.log("[models] get models");
    if (options.token) await this.setToken(options.token);
    else await this.ensureToken();
    const res = await this.client.get(this.BASE_API + "/subscription/user-subscription-detail", {
      headers: this.headers()
    });
    return {
      token: this.token,
      ...res.data?.d,
      ...options
    };
  }
  async generate(options = {}) {
    console.log("[generate] start");
    if (options.token) await this.setToken(options.token);
    else await this.ensureToken();
    let prompt = options.prompt || "";
    let image = options.image;
    let model = options.model;
    let rest = Object.assign({}, options);
    delete rest.token;
    delete rest.prompt;
    delete rest.image;
    delete rest.model;
    let images = [];
    if (image) {
      const list = Array.isArray(image) ? image : [image];
      console.log("[generate] Uploading", list.length, "image(s) sequentially");
      for (let i = 0; i < list.length; i++) {
        const imgUrl = await this.toUrl(list[i]);
        images.push(imgUrl);
      }
      console.log("[generate] All images uploaded:", images);
    }
    const isI2I = images.length > 0;
    const templateId = model || (isI2I ? 511 : 181);
    const payload = {
      template_id: templateId,
      images: images,
      prompt: prompt,
      resolution: rest.resolution || "2K",
      aspect_ratio: rest.aspect_ratio || (isI2I ? "match_input_image" : "1:1"),
      is_public: rest.is_public !== undefined ? rest.is_public : 1,
      ...rest
    };
    delete payload.token;
    await this.estimateCost(templateId, images);
    const createRes = await this.client.post(this.BASE_AI + "/gen/task/create", payload, {
      headers: this.headers({
        "content-type": "application/json",
        app_id: this.APP_ID
      })
    });
    const taskId = createRes.data?.d?.id;
    if (!taskId) throw new Error("task id kosong");
    console.log("[generate] taskId:", taskId);
    let result = null;
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      await this.delay(3e3);
      attempts++;
      const queryRes = await this.client.get(this.BASE_AI + "/gen/task/query?task_id=" + taskId, {
        headers: this.headers({
          app_id: this.APP_ID
        })
      });
      const data = queryRes.data?.d || {};
      const status = data.status;
      console.log("[poll] attempt", attempts, "status=", status);
      if (status === 2) {
        let rawUrls = [];
        try {
          rawUrls = JSON.parse(data.result_data || "[]");
        } catch (e) {
          rawUrls = [];
        }
        if (rawUrls.length > 0) {
          result = data;
          break;
        } else {
          console.log("[poll] status 2 but no images yet, continue polling");
          continue;
        }
      }
      if (status === 3) {
        throw new Error(data.failed_reason || "task gagal");
      }
    }
    if (!result) throw new Error("polling timeout atau gambar tidak kunjung muncul");
    const rawUrls = JSON.parse(result.result_data || "[]");
    const dataMate = JSON.parse(result.data_mate || "{}");
    const origParams = JSON.parse(result.original_params || "{}");
    return {
      token: this.token,
      task_id: taskId,
      scene: isI2I ? "image2image" : "text2image",
      images: rawUrls,
      result_meta: dataMate?.result_data || [],
      original_params: origParams,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
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