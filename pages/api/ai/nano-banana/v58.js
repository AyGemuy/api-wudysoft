import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    console.log("🍌 Init NanoBanana");
    this.jar = new CookieJar();
    this.mailClient = axios.create({
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.apiClient = wrapper(axios.create({
      jar: this.jar,
      headers: {
        "accept-language": "id-ID",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      maxRedirects: 5,
      validateStatus: () => true
    }));
    this.baseUrl = "https://nan0banana.com";
    this.supabaseUrl = "https://onuybjorbiqvsulwyuaj.supabase.co";
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udXliam9yYmlxdnN1bHd5dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODE2MTcsImV4cCI6MjA3ODA1NzYxN30.9SNkUC55AX9y5nO6BUkrKt46M9cumu7JM_hfY9VHff8";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.state = null;
    this.credits = null;
  }
  genCodeChallenge() {
    const verifier = crypto.randomBytes(64).toString("hex");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return {
      verifier: verifier,
      challenge: challenge
    };
  }
  async createMail() {
    console.log("📧 Create email");
    try {
      const {
        data
      } = await this.mailClient.get(`${this.mailApi}?action=create`);
      const email = data?.email || null;
      console.log(`✅ ${email}`);
      return email;
    } catch (err) {
      console.error("❌ Create email failed:", err.message);
      throw err;
    }
  }
  async checkOtp(email) {
    try {
      const {
        data
      } = await this.mailClient.get(`${this.mailApi}?action=message&email=${email}`);
      const messages = data?.data || [];
      for (const msg of messages) {
        const content = msg?.text_content || "";
        const tokenMatch = content.match(/token=([^&\s]+)/);
        if (tokenMatch) {
          console.log(`✅ OTP: ${tokenMatch[1]}`);
          return tokenMatch[1];
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  }
  async signup(email) {
    console.log("📝 Signup");
    try {
      const {
        verifier,
        challenge
      } = this.genCodeChallenge();
      await this.apiClient.post(`${this.supabaseUrl}/auth/v1/signup`, {
        email: email,
        password: email,
        data: {},
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: "s256"
      }, {
        headers: {
          accept: "*/*",
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json;charset=UTF-8",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-client-info": "supabase-ssr/0.7.0 createBrowserClient",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      return {
        verifier: verifier,
        email: email
      };
    } catch (err) {
      console.error("❌ Signup failed:", err.message);
      throw err;
    }
  }
  async getState() {
    try {
      const cookies = await this.jar.getCookies(this.baseUrl);
      const authToken = cookies.find(c => c.key === "sb-onuybjorbiqvsulwyuaj-auth-token");
      if (authToken?.value) {
        return authToken.value;
      }
      const cookieHeader = cookies.map(c => `${c.key}=${c.value}`).join("; ");
      return cookieHeader ? Buffer.from(cookieHeader).toString("base64") : null;
    } catch (err) {
      return null;
    }
  }
  async setState(state) {
    try {
      if (!state) return;
      let cookieStr = state;
      if (state.startsWith("base64-")) {
        cookieStr = state.substring(7);
      }
      if (!cookieStr.includes("=")) {
        cookieStr = Buffer.from(cookieStr, "base64").toString("utf-8");
      }
      const cookies = cookieStr.split(";").map(c => c.trim());
      for (const cookie of cookies) {
        if (cookie) {
          await this.jar.setCookie(cookie, this.baseUrl);
        }
      }
      this.state = await this.getState();
    } catch (err) {
      console.error("❌ Set state failed:", err.message);
    }
  }
  async checkCredit() {
    try {
      const {
        data
      } = await this.apiClient.post(`${this.baseUrl}/api/get-user-info`, "", {
        headers: {
          accept: "*/*",
          "cache-control": "no-cache",
          "content-length": "0",
          origin: this.baseUrl,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `${this.baseUrl}/en`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      if (data?.code === 0) {
        const credits = data?.data?.credits || null;
        if (credits) {
          this.credits = credits;
          return credits;
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  }
  async waitForCredit(maxWait = 3e4, interval = 3e3) {
    console.log("💳 Check credit");
    const start = Date.now();
    process.stdout.write("⏳ Wait");
    while (Date.now() - start < maxWait) {
      const credit = await this.checkCredit();
      if (credit && credit.left_credits !== undefined && credit.left_credits > 0) {
        process.stdout.write("\n");
        const proStatus = credit.is_pro ? "Pro" : "Free";
        console.log(`✅ Credits: ${credit.left_credits} | ${proStatus}`);
        return credit;
      }
      process.stdout.write(".");
      await new Promise(r => setTimeout(r, interval));
    }
    process.stdout.write("\n");
    console.log("⚠️ No credits found, continuing anyway");
    return null;
  }
  async verify(token, verifier) {
    console.log("🔐 Verify");
    try {
      const verifyUrl = `${this.supabaseUrl}/auth/v1/verify?token=${token}&type=signup&redirect_to=${this.baseUrl}/`;
      const verifierCookie = `sb-onuybjorbiqvsulwyuaj-auth-token-code-verifier=base64-${Buffer.from(JSON.stringify(verifier)).toString("base64")}`;
      await this.jar.setCookie(verifierCookie, this.baseUrl);
      const res = await this.apiClient.get(verifyUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      let authCode = null;
      let currentUrl = res?.request?.res?.responseUrl || res?.config?.url || "";
      const codeMatch = currentUrl.match(/code=([^&]+)/);
      if (codeMatch) {
        authCode = codeMatch[1];
      }
      if (!authCode) {
        console.error("❌ No auth code");
        throw new Error("No auth code");
      }
      console.log(`✅ Code: ${authCode}`);
      await this.apiClient.get(`${this.baseUrl}/en?code=${authCode}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          referer: `${this.baseUrl}/?code=${authCode}`,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      console.log("🎟️ Exchange token");
      const {
        data
      } = await this.apiClient.post(`${this.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
        auth_code: authCode,
        code_verifier: verifier
      }, {
        headers: {
          accept: "*/*",
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json;charset=UTF-8",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-client-info": "supabase-ssr/0.7.0 createBrowserClient",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      const token64 = Buffer.from(JSON.stringify(data)).toString("base64");
      const authTokenCookie = `sb-onuybjorbiqvsulwyuaj-auth-token=base64-${token64}`;
      await this.jar.setCookie(authTokenCookie, this.baseUrl);
      this.state = await this.getState();
      console.log("✅ Auth success");
      return this.state;
    } catch (err) {
      console.error("❌ Verify failed:", err.message);
      throw err;
    }
  }
  async login() {
    console.log("🔑 Login");
    try {
      const email = await this.createMail();
      const {
        verifier
      } = await this.signup(email);
      let token = null;
      let attempts = 0;
      process.stdout.write("⏳ Wait OTP");
      while (!token && attempts < 20) {
        await new Promise(r => setTimeout(r, 3e3));
        token = await this.checkOtp(email);
        if (!token) process.stdout.write(".");
        attempts++;
      }
      process.stdout.write("\n");
      if (!token) throw new Error("OTP timeout");
      const state = await this.verify(token, verifier);
      await this.waitForCredit();
      return state;
    } catch (err) {
      console.error("❌ Login failed:", err.message);
      throw err;
    }
  }
  async uploadImages(images) {
    console.log(`📤 Upload ${images.length} image(s)`);
    try {
      const form = new FormData();
      for (const img of images) {
        let buffer;
        if (Buffer.isBuffer(img)) {
          buffer = img;
        } else if (img.startsWith("http")) {
          const {
            data
          } = await axios.get(img, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(data);
        } else if (img.startsWith("data:")) {
          const base64Data = img.split(",")[1];
          buffer = Buffer.from(base64Data, "base64");
        } else {
          buffer = Buffer.from(img, "base64");
        }
        form.append("images", buffer, {
          filename: `${Date.now()}.jpg`
        });
      }
      const {
        data
      } = await this.apiClient.post(`${this.baseUrl}/api/nano-banana/upload-image`, form, {
        headers: {
          accept: "*/*",
          ...form.getHeaders(),
          origin: this.baseUrl,
          referer: `${this.baseUrl}/en/generate`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      const urls = data?.urls || [];
      console.log(`✅ Uploaded ${urls.length}`);
      return urls;
    } catch (err) {
      console.error("❌ Upload failed:", err.message);
      throw err;
    }
  }
  async pollTask(taskId, maxWait = 6e4, interval = 3e3) {
    const start = Date.now();
    process.stdout.write("⏳ Generate");
    while (Date.now() - start < maxWait) {
      try {
        const {
          data
        } = await this.apiClient.get(`${this.baseUrl}/api/nano-banana/status/${taskId}`, {
          headers: {
            accept: "*/*",
            referer: `${this.baseUrl}/en/generate`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
        if (data?.status === "success") {
          process.stdout.write("\n");
          console.log("✅ Done");
          return data?.result || data;
        }
        if (data?.status === "failed") {
          process.stdout.write("\n");
          throw new Error("Task failed");
        }
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, interval));
      } catch (err) {
        process.stdout.write("!");
      }
    }
    process.stdout.write("\n");
    throw new Error("Timeout");
  }
  async generate({
    state,
    prompt,
    image,
    pro,
    ...rest
  }) {
    if (state) {
      await this.setState(state);
    } else if (!this.state) {
      await this.login();
    }
    if (!this.credits) {
      await this.waitForCredit();
    }
    try {
      const isPro = pro ?? false;
      const images = image ? Array.isArray(image) ? image : [image] : [];
      const mode = images.length > 0 ? isPro ? "pro" : "edit" : "txt2img";
      let imageUrls = [];
      if (images.length > 0) {
        imageUrls = await this.uploadImages(images);
      }
      const endpoint = isPro ? "/api/nano-banana/pro" : mode === "edit" ? "/api/nano-banana/edit" : "/api/nano-banana/generate";
      const payload = isPro ? {
        prompt: prompt,
        image_input: imageUrls,
        aspect_ratio: rest.aspect_ratio || rest.image_size || "1:1",
        resolution: rest.resolution || "1K",
        output_format: rest.output_format || "png",
        ...rest
      } : mode === "edit" ? {
        prompt: prompt,
        image_urls: imageUrls,
        output_format: rest.output_format || "png",
        image_size: rest.image_size || "auto",
        ...rest
      } : {
        prompt: prompt,
        output_format: rest.output_format || "png",
        image_size: rest.image_size || "1:1",
        ...rest
      };
      console.log(`🚀 ${mode.toUpperCase()}: ${prompt}`);
      const {
        data
      } = await this.apiClient.post(`${this.baseUrl}${endpoint}`, payload, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/en/generate`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      const taskId = data?.task_id || null;
      if (!taskId) {
        console.error("❌ No task ID, response:", JSON.stringify(data));
        throw new Error("No task ID");
      }
      const result = await this.pollTask(taskId);
      this.credits = null;
      return {
        result: result?.image_url || result,
        state: this.state,
        task_id: taskId,
        mode: mode,
        ...result
      };
    } catch (err) {
      console.error("❌ Generate failed:", err.message);
      throw err;
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