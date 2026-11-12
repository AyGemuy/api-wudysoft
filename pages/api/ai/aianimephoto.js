import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class AIAnimePhoto {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
    this.base = "https://aianimephoto.com";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.email = null;
    this.authed = false;
  }
  async hasCookie() {
    try {
      const cookies = await this.jar.getCookies(this.base);
      const hasSession = cookies?.some(c => c?.key?.includes("session_token"));
      return hasSession || false;
    } catch {
      return false;
    }
  }
  async mail() {
    try {
      console.log("Creating temp email...");
      const {
        data
      } = await axios.get(`${this.mailApi}?action=create`);
      this.email = data?.email;
      console.log("Email:", this.email);
      return this.email;
    } catch (e) {
      console.log("Mail error:", e?.message);
      return null;
    }
  }
  async otp(max = 30) {
    try {
      console.log("Waiting for OTP...");
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        try {
          const {
            data
          } = await axios.get(`${this.mailApi}?action=message&email=${this.email}`);
          const msg = data?.data?.[0]?.text_content || "";
          const match = msg.match(/(\d{6})/);
          if (match?.[1]) {
            console.log("OTP code found:", match[1]);
            return match[1];
          }
        } catch (e) {
          console.log(`Check ${i + 1}/${max} error:`, e?.message);
        }
        console.log(`Check ${i + 1}/${max}...`);
      }
      console.log("OTP timeout");
      return null;
    } catch (e) {
      console.log("OTP error:", e?.message);
      return null;
    }
  }
  async auth() {
    try {
      if (this.authed && await this.hasCookie()) {
        console.log("Already authenticated");
        return true;
      }
      this.email = null;
      this.authed = false;
      const created = await this.mail();
      if (!created) {
        console.log("Failed create email");
        return false;
      }
      console.log("Sending OTP...");
      try {
        await this.http.post(`${this.base}/api/auth/email-otp/send-verification-otp`, {
          email: this.email,
          type: "sign-in"
        }, {
          headers: {
            "content-type": "application/json",
            origin: this.base,
            referer: `${this.base}/`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
      } catch (e) {
        console.log("Send OTP error:", e?.message);
        return false;
      }
      const code = await this.otp();
      if (!code) {
        console.log("No OTP code received");
        return false;
      }
      console.log("Signing in...");
      try {
        await this.http.post(`${this.base}/api/auth/sign-in/email-otp`, {
          email: this.email,
          otp: code
        }, {
          headers: {
            "content-type": "application/json",
            origin: this.base,
            referer: `${this.base}/`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
      } catch (e) {
        console.log("Sign in error:", e?.message);
      }
      await new Promise(r => setTimeout(r, 2e3));
      const hasAuth = await this.hasCookie();
      this.authed = hasAuth;
      console.log(hasAuth ? "Auth success" : "Auth failed");
      return hasAuth;
    } catch (e) {
      console.log("Auth error:", e?.message);
      return false;
    }
  }
  isUrl(str) {
    return typeof str === "string" && (str.startsWith("http://") || str.startsWith("https://"));
  }
  async toBuf(img) {
    try {
      if (this.isUrl(img)) {
        console.log("Downloading from URL...");
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      if (Buffer.isBuffer(img)) {
        return img;
      }
      if (img?.startsWith?.("data:")) {
        return Buffer.from(img.split(",")[1], "base64");
      }
      return Buffer.from(img, "base64");
    } catch (e) {
      console.log("toBuf error:", e?.message);
      throw e;
    }
  }
  async upload(img) {
    try {
      console.log("Processing image...");
      const buf = await this.toBuf(img);
      console.log("Uploading...");
      const form = new FormData();
      form.append("file", buf, {
        filename: `${Date.now()}.jpg`
      });
      form.append("folder", "user/uploads");
      const {
        data
      } = await this.http.post(`${this.base}/api/storage/upload`, form, {
        headers: {
          ...form.getHeaders(),
          origin: this.base,
          referer: `${this.base}/`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("Upload done:", data?.url);
      return data?.url;
    } catch (e) {
      console.log("Upload error:", e?.message);
      throw e;
    }
  }
  async poll(id, max = 60) {
    try {
      console.log("Polling task:", id);
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        try {
          const {
            data
          } = await this.http.get(`${this.base}/api/v1/tasks/${id}`, {
            headers: {
              referer: `${this.base}/`,
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin"
            }
          });
          const status = data?.data?.status;
          console.log(`Poll ${i + 1}/${max}:`, status);
          if (status === "SUCCESS") {
            console.log("Task completed");
            return data?.data || [];
          }
          if (status === "FAILED") {
            console.log("Task failed");
            return [];
          }
        } catch (e) {
          console.log(`Poll ${i + 1}/${max} error:`, e?.message);
        }
      }
      console.log("Poll timeout");
      return [];
    } catch (e) {
      console.log("Poll error:", e?.message);
      return [];
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.authed || !await this.hasCookie()) {
        console.log("Need authentication...");
        const success = await this.auth();
        if (!success) {
          console.log("Auth failed, cannot generate");
          return [];
        }
      }
      const body = {
        prompt: prompt,
        aspectRatio: rest?.aspectRatio || "2:3",
        numVariants: rest?.numVariants || 1,
        composition: rest?.composition || "Macro",
        mode: image ? "img2img" : "text2img",
        language: rest?.language || "en"
      };
      if (rest?.styleSlug) body.styleSlug = rest.styleSlug;
      if (rest?.color) body.color = rest.color;
      if (image) {
        const urls = [];
        const imgs = Array.isArray(image) ? image : [image];
        for (const img of imgs) {
          try {
            const url = await this.upload(img);
            if (url) urls.push(url);
          } catch (e) {
            console.log("Skip image error:", e?.message);
          }
        }
        if (urls.length > 0) body.images = urls;
      }
      console.log("Generating:", body.mode);
      const {
        data
      } = await this.http.post(`${this.base}/api/v1/tasks`, body, {
        headers: {
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        },
        validateStatus: status => status < 500
      });
      if (data?.code !== 0 || !data?.data?.taskId) {
        console.log("Generate failed, response:", data);
        console.log("Retrying with fresh auth...");
        this.authed = false;
        await this.auth();
        const retry = await this.http.post(`${this.base}/api/v1/tasks`, body, {
          headers: {
            "content-type": "application/json",
            origin: this.base,
            referer: `${this.base}/`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
        const taskId = retry?.data?.data?.taskId;
        if (!taskId) {
          console.log("Retry failed, no taskId");
          return [];
        }
        return await this.poll(taskId);
      }
      const taskId = data?.data?.taskId;
      return await this.poll(taskId);
    } catch (e) {
      console.log("Generate error:", e?.message, e?.response?.status);
      if (e?.response?.status === 402 || e?.response?.status === 401) {
        console.log("Auth error detected, retry once...");
        try {
          this.authed = false;
          await this.auth();
          return await this.generate({
            prompt: prompt,
            image: image,
            ...rest
          });
        } catch (retryErr) {
          console.log("Retry failed:", retryErr?.message);
        }
      }
      return [];
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
  const api = new AIAnimePhoto();
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