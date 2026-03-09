import axios from "axios";
import crypto from "crypto";
import PROMPT from "@/configs/ai-prompt";
import apiConfig from "@/configs/apiConfig";
class CopyRocket {
  constructor() {
    this.BASE = "https://ma.copyrocket.ai";
    this.MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.sleep = ms => new Promise(r => setTimeout(r, ms));
    this.cookies = {};
    this.token = null;
    this.csrf = null;
    this.http = axios.create({
      baseURL: this.BASE
    });
    this.mail = axios.create({
      baseURL: this.MAIL
    });
    this.http.interceptors.request.use(cfg => {
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) cfg.headers["cookie"] = cookieStr;
      cfg.headers["user-agent"] = this.UA;
      cfg.headers["accept-language"] = "id-ID";
      cfg.headers["sec-ch-ua-mobile"] = "?1";
      if (this.token) cfg.headers["authorization"] = `Bearer ${this.token}`;
      return cfg;
    });
    this.http.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"] || [];
      for (const c of setCookie) {
        const [pair] = c.split(";");
        const [k, ...v] = pair.split("=");
        this.cookies[k.trim()] = v.join("=").trim();
      }
      return res;
    }, err => Promise.reject(err));
  }
  hdrs(extra = {}) {
    return {
      accept: "*/*",
      "content-type": "application/json",
      ...extra
    };
  }
  async toB64(img) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return `data:image/png;base64,${img.toString("base64")}`;
      if (img.startsWith?.("data:")) return img;
      if (img.startsWith?.("http")) {
        const r = await axios.get(img, {
          responseType: "arraybuffer"
        });
        const mime = r.headers["content-type"] || "image/png";
        return `data:${mime};base64,${Buffer.from(r.data).toString("base64")}`;
      }
      return img;
    } catch (err) {
      console.error("[toB64] error:", err.message);
      throw err;
    }
  }
  async mkMail() {
    try {
      console.log("[mail] creating temp email...");
      const {
        data
      } = await this.mail.get("?action=create");
      console.log("[mail] email:", data.email);
      return data.email;
    } catch (err) {
      console.error("[mail] error:", err.message);
      throw err;
    }
  }
  async waitOtp(email, tries = 60, delay = 3e3) {
    try {
      console.log("[otp] waiting for verification token...");
      for (let i = 0; i < tries; i++) {
        await this.sleep(delay);
        try {
          const {
            data
          } = await this.mail.get(`?action=message&email=${encodeURIComponent(email)}`);
          const msg = data?.data?.[0]?.text_content || "";
          const match = msg.match(/token[=\/]([a-f0-9-]{36})/i) || msg.match(/([a-f0-9-]{36})/);
          if (match?.[1]) {
            console.log("[otp] token:", match[1]);
            return match[1];
          }
        } catch {}
        console.log(`[otp] attempt ${i + 1}/${tries}...`);
      }
      throw new Error("OTP timeout");
    } catch (err) {
      console.error("[otp] error:", err.message);
      throw err;
    }
  }
  async getCsrf() {
    try {
      console.log("[csrf] fetching...");
      const {
        data
      } = await this.http.get("/api/auth/csrf", {
        headers: this.hdrs()
      });
      this.csrf = data?.csrfToken;
      console.log("[csrf]", this.csrf?.slice(0, 16) + "...");
      return this.csrf;
    } catch (err) {
      console.error("[csrf] error:", err.message);
      throw err;
    }
  }
  async reg(email, pass, name) {
    try {
      console.log("[register]", email);
      const {
        data
      } = await this.http.post("/api/auth/register", {
        name: name,
        email: email,
        password: pass
      }, {
        headers: this.hdrs()
      });
      console.log("[register] done");
      return data;
    } catch (err) {
      console.error("[register] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async verifyEmail(tok) {
    try {
      console.log("[verify] token:", tok);
      const {
        data
      } = await this.http.post("/api/auth/verify-email", {
        token: tok
      }, {
        headers: this.hdrs()
      });
      console.log("[verify] done");
      return data;
    } catch (err) {
      console.error("[verify] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async login(email, pass) {
    try {
      console.log("[login]", email);
      await this.getCsrf();
      const params = new URLSearchParams({
        email: email,
        password: pass,
        csrfToken: this.csrf,
        callbackUrl: `${this.BASE}/login?callbackUrl=%2Fdashboard`
      });
      const {
        data
      } = await this.http.post("/api/auth/callback/credentials?", params.toString(), {
        headers: {
          ...this.hdrs(),
          "content-type": "application/x-www-form-urlencoded",
          "x-auth-return-redirect": "1"
        }
      });
      console.log("[login] done");
      return data;
    } catch (err) {
      console.error("[login] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async sess() {
    try {
      console.log("[session] fetching...");
      const {
        data
      } = await this.http.get("/api/auth/session", {
        headers: this.hdrs()
      });
      this.token = data?.accessToken || data?.user?.accessToken;
      console.log("[session] token:", this.token?.slice(0, 20) + "...");
      return data;
    } catch (err) {
      console.error("[session] error:", err.message);
      throw err;
    }
  }
  async signup() {
    try {
      const email = await this.mkMail();
      const name = crypto.randomBytes(16).toString("base64").replace(/[^a-zA-Z]/g, "").substring(0, 8);
      const pass = crypto.randomBytes(16).toString("base64").replace(/[^a-zA-Z]/g, "").substring(0, 12) + "@1A";
      await this.getCsrf();
      await this.reg(email, pass, name);
      const tok = await this.waitOtp(email);
      await this.verifyEmail(tok);
      await this.login(email, pass);
      await this.sess();
      console.log("[signup] complete!");
      return {
        email: email,
        pass: pass
      };
    } catch (err) {
      console.error("[signup] error:", err.message);
      throw err;
    }
  }
  async gallery(page = 1, limit = 20) {
    try {
      console.log("[gallery] fetching page", page);
      const {
        data
      } = await this.http.get(`/api/image-generator/gallery?page=${page}&limit=${limit}`, {
        headers: this.hdrs()
      });
      return (data?.images || []).map(img => ({
        ...img,
        url: img.url?.startsWith("http") ? img.url : `${this.BASE}${img.url}`
      }));
    } catch (err) {
      console.error("[gallery] error:", err.message);
      throw err;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.token) {
        console.log("[generate] no token, auto signup...");
        await this.signup();
      }
      const images = Array.isArray(image) ? image : [image];
      const b64List = [];
      for (const img of images) {
        try {
          const b64 = await this.toB64(img);
          b64List.push(b64);
        } catch (err) {
          console.error("[generate] toB64 failed:", err.message);
        }
      }
      let result, info;
      try {
        console.log("[generate] sending draw request...");
        const {
          data
        } = await this.http.post("/api/image-generator/draw", {
          prompt: prompt || PROMPT.text,
          image_data: b64List.length === 1 ? b64List[0] : b64List,
          model_id: rest.model_id || "fal-ai/nano-banana-pro/edit",
          strength: rest.strength ?? .8,
          ...rest
        }, {
          headers: this.hdrs()
        });
        const rawUrl = data?.image?.url;
        result = rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `${this.BASE}${rawUrl}` : null;
        info = {
          id: data?.image?.id,
          prompt: data?.image?.prompt,
          generation_time_ms: data?.generation_time_ms
        };
        console.log("[generate] result:", result);
      } catch (err) {
        console.error("[generate] draw failed, fallback to gallery...", err?.response?.data || err.message);
        try {
          const imgs = await this.gallery();
          const latest = imgs?.[0];
          result = latest?.url || null;
          info = {
            id: latest?.id,
            prompt: latest?.prompt,
            model_id: latest?.model_id
          };
          console.log("[generate] gallery fallback:", result);
        } catch (gErr) {
          console.error("[generate] gallery fallback error:", gErr.message);
          throw gErr;
        }
      }
      return {
        result: result,
        ...info
      };
    } catch (err) {
      console.error("[generate] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async models() {
    try {
      console.log("[models] fetching...");
      const {
        data
      } = await this.http.get("/api/image-generator/models", {
        headers: this.hdrs()
      });
      return data;
    } catch (err) {
      console.error("[models] error:", err.message);
      throw err;
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
  const api = new CopyRocket();
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