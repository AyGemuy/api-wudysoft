import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class Pixelfox {
  constructor() {
    this.cfg = {
      api: {
        mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v22`,
        pixel: "https://api.pixelfox.ai"
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        "Content-Type": "application/json",
        ...SpoofHead()
      },
      filters: ["anime", "3d", "handdrawn", "sketch", "artstyle", "hongkong", "comic", "animation3d"]
    };
    this.session = {
      email: null,
      mailId: null,
      token: null
    };
    this.client = axios.create({
      baseURL: this.cfg.api.pixel,
      headers: this.cfg.headers
    });
    this._log("Instance initialized");
  }
  _log(msg, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warn: "⚠️"
    };
    console.log(`${icons[type] || "🔹"} [Pixelfox] ${msg}`);
  }
  async _processImage(img) {
    try {
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return {
            buffer: Buffer.from(res.data),
            filename: "image.jpg",
            contentType: res.headers["content-type"] || "image/jpeg"
          };
        } else if (img.startsWith("data:image")) {
          const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
          return {
            buffer: Buffer.from(match[2], "base64"),
            filename: `image.${match[1]}`,
            contentType: `image/${match[1]}`
          };
        }
      } else if (Buffer.isBuffer(img)) {
        return {
          buffer: img,
          filename: "image.jpg",
          contentType: "image/jpeg"
        };
      }
      throw new Error("Invalid image format (must be URL, Base64, or Buffer)");
    } catch (error) {
      this._log(`Image processing failed: ${error.message}`, "error");
      throw error;
    }
  }
  _genId() {
    return Math.random().toString(36).substring(2, 10).padEnd(8, "0");
  }
  async _mailReq(action, params = {}) {
    try {
      const {
        data
      } = await axios.get(this.cfg.api.mail, {
        params: {
          action: action,
          ...params
        },
        headers: {
          "User-Agent": this.cfg.headers["User-Agent"]
        }
      });
      return data;
    } catch (error) {
      throw new Error(`Mail API Error: ${error.message}`);
    }
  }
  async _createMail() {
    try {
      const {
        email,
        id
      } = await this._mailReq("create", {});
      this.session.email = email;
      this.session.mailId = id;
      this._log(`Temp mail created: ${email}`, "success");
      return {
        id: this.session.email,
        email: this.session.mailId
      };
    } catch (error) {
      this._log(`Failed to create mail: ${error.message}`, "error");
      throw error;
    }
  }
  async _checkOTP() {
    if (!this.session.mailId) return null;
    try {
      const data = await this._mailReq("inbox", {
        id: this.session.mailId
      });
      if (!data?.messages?.length) return null;
      for (const msg of data.messages) {
        if (/verification|code/i.test(msg.subject)) {
          const content = await this._mailReq("message", {
            region: msg.storage?.region || "us",
            key: msg.storage?.key
          });
          const text = content.text_content || "";
          const otpMatch = text.match(/\b\d{4,6}\b/);
          if (otpMatch) return otpMatch[0];
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  async _waitOTP(timeoutSeconds = 60) {
    this._log("Waiting for OTP...", "info");
    const start = Date.now();
    while (Date.now() - start < timeoutSeconds * 1e3) {
      const otp = await this._checkOTP();
      if (otp) {
        this._log(`OTP Recieved: ${otp}`, "success");
        return otp;
      }
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("OTP Timeout");
  }
  async login() {
    try {
      this._log("Starting Auto-Auth sequence...", "warn");
      await this._createMail();
      const sendRes = await this.client.post("/api/ems/send", {
        email: this.session.email,
        event: "register"
      });
      if (sendRes.data.code !== 1) throw new Error(sendRes.data.msg);
      this._log("OTP Sent to email", "info");
      const otp = await this._waitOTP();
      const regRes = await this.client.post("/api/user/register", {
        account: this.session.email,
        code: otp,
        password: `A!${this._genId()}`
      });
      if (regRes.data.code !== 1) throw new Error(regRes.data.msg);
      this.session.token = regRes.data.data.userinfo.token;
      this._log("Authentication successful, Token acquired", "success");
      return this.session.token;
    } catch (error) {
      this._log(`Login Failed: ${error.message}`, "error");
      throw error;
    }
  }
  async generate({
    token,
    image,
    style = "anime",
    ...rest
  }) {
    try {
      if (!this.cfg.filters.includes(style)) {
        throw new Error(`Invalid style '${style}'. Available: ${this.cfg.filters.join(", ")}`);
      }
      if (token) {
        this.session.token = token;
      }
      if (!this.session.token) {
        await this.login();
      }
      const imgData = await this._processImage(image);
      const form = new FormData();
      form.append("type_name", rest?.type || "GenerateHumanAnimeStyle");
      form.append("algoType", style);
      form.append("imageURL", imgData.buffer, {
        filename: imgData.filename,
        contentType: imgData.contentType
      });
      Object.keys(rest).forEach(key => {
        form.append(key, rest[key]);
      });
      this._log(`Generating image with style: ${style}...`, "info");
      const response = await this.client.post("/api/ai/img/facebody/main", form, {
        headers: {
          ...form.getHeaders(),
          token: this.session.token
        }
      });
      if (response.data?.code === 401 || response.status === 401) {
        this._log("Token expired, re-authenticating...", "warn");
        this.session.token = null;
        return this.generate({
          image: image,
          style: style,
          ...rest
        });
      }
      this._log("Generation successful", "success");
      return {
        ...response.data,
        token: this.session.token
      };
    } catch (error) {
      this._log(`Generate Error: ${error.message}`, "error");
      throw error;
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
  const api = new Pixelfox();
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