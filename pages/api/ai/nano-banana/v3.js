import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        origin: "https://nanobananaai.ai",
        referer: "https://nanobananaai.ai/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        accept: "*/*",
        "cache-control": "no-cache",
        pragma: "no-cache",
        ...SpoofHead()
      }
    }));
    this.cfg = {
      baseUrl: "https://nanobananaai.ai/api",
      supabaseUrl: "https://qvkcckvxdltbongpgdvv.supabase.co/auth/v1",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a2Nja3Z4ZGx0Ym9uZ3BnZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY2NDIsImV4cCI6MjA3MTI3MjY0Mn0.IAv7Ec3JtvQrtChu2NQ5YeHEgM-SmpbSmnmthTQ_eu4",
      mailApi: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      models: {
        nano: {
          id: "nano-banana",
          type: "image",
          path: "/generate/nano-banana",
          validRatios: ["1:1", "9:16", "16:9", "3:4", "4:3"]
        },
        pro: {
          id: "nano-banana-pro",
          type: "image",
          path: "/generate/nano-banana-pro",
          validRatios: ["1:1", "2:3", "3:2", "16:9", "21:9"]
        },
        seedream: {
          id: "seedream",
          type: "image",
          path: "/generate/seedream",
          validRatios: ["1:1", "4:3", "3:4", "16:9"]
        },
        veo: {
          id: "veo",
          type: "video",
          path: "/generate/veo",
          validRatios: ["16:9", "9:16"]
        },
        wan: {
          id: "wan",
          type: "video",
          path: "/generate/wan",
          validRatios: ["1280*720", "720*1280", "1920*1080", "1080*1920"]
        }
      }
    };
    this.user = null;
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const codeChallenge = hash.toString("base64url");
    return {
      codeVerifier: codeVerifier,
      codeChallenge: codeChallenge,
      codeChallengeMethod: "s256"
    };
  }
  async getBuffer(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (source.startsWith("data:")) {
          return Buffer.from(source.split(",")[1], "base64");
        }
        return Buffer.from(source, "base64");
      }
      throw new Error("Invalid image source");
    } catch (e) {
      this.log(`Buffer Error: ${e.message}`, "ERROR");
      return null;
    }
  }
  async toDataUri(buffer, mime = "image/jpeg") {
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
  async createMail() {
    try {
      this.log("Creating temp email...");
      const {
        data
      } = await axios.get(`${this.cfg.mailApi}?action=create`);
      const email = data?.email || data?.address;
      if (!email) throw new Error("Failed to create email");
      this.log(`Email created: ${email}`);
      return email;
    } catch (e) {
      this.log(`Mail Create Error: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async checkOtp(email) {
    try {
      this.log(`Checking OTP for ${email}...`);
      let attempts = 0;
      while (attempts < 60) {
        const {
          data
        } = await axios.get(`${this.cfg.mailApi}?action=message&email=${email}`);
        const msgs = data?.data || data;
        if (msgs && msgs.length > 0) {
          const content = msgs[0].text_content || msgs[0].body || "";
          const match = content.match(/verification code:\s*\n*\s*(\d{6})/i);
          if (match && match[1]) {
            this.log(`OTP Found: ${match[1]}`);
            return match[1];
          }
        }
        await new Promise(r => setTimeout(r, 3e3));
        attempts++;
      }
      throw new Error("OTP Timeout");
    } catch (e) {
      this.log(`Check OTP Error: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async register() {
    try {
      const email = await this.createMail();
      const pkce = this.generatePKCE();
      this.log(`Generated PKCE - Verifier: ${pkce.codeVerifier.substring(0, 20)}..., Challenge: ${pkce.codeChallenge.substring(0, 20)}...`);
      const verifierCookie = `sb-qvkcckvxdltbongpgdvv-auth-token-code-verifier=base64-${Buffer.from(JSON.stringify(pkce.codeVerifier)).toString("base64")}; Domain=.nanobananaai.ai; Path=/; Secure`;
      await this.jar.setCookie(verifierCookie, "https://nanobananaai.ai");
      this.log("Requesting OTP from Supabase...");
      await axios.post(`${this.cfg.supabaseUrl}/otp`, {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: pkce.codeChallenge,
        code_challenge_method: pkce.codeChallengeMethod
      }, {
        headers: {
          apikey: this.cfg.anonKey,
          authorization: `Bearer ${this.cfg.anonKey}`,
          "content-type": "application/json",
          "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      const code = await this.checkOtp(email);
      this.log("Verifying OTP with NanoBanana API...");
      const verifyRes = await this.client.post(`${this.cfg.baseUrl}/auth/verificationCode`, JSON.stringify({
        email: email,
        verificationCode: code
      }), {
        headers: {
          "content-type": "text/plain;charset=UTF-8"
        }
      });
      if (verifyRes.data?.error) {
        throw new Error(verifyRes.data.error);
      }
      this.log("Successfully verified OTP");
      this.log("Fetching NanoBanana User Info...");
      const cookies = await this.jar.getCookies("https://nanobananaai.ai");
      const authCookie = cookies.find(c => c.key === "sb-qvkcckvxdltbongpgdvv-auth-token");
      if (!authCookie) {
        throw new Error("Auth cookie not found after verification");
      }
      const authTokenValue = authCookie.value.replace("base64-", "");
      const authData = JSON.parse(Buffer.from(authTokenValue, "base64").toString());
      const userId = authData.user?.id;
      if (!userId) {
        throw new Error("User ID not found in auth token");
      }
      this.log(`User ID from cookie: ${userId}`);
      const userRes = await this.client.post(`${this.cfg.baseUrl}/user`, {
        user_id: userId
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      this.user = userRes.data?.data;
      if (!this.user) {
        throw new Error("Failed to get user data from NanoBanana API");
      }
      await this.client.post(`${this.cfg.baseUrl}/utm-tracking`, {
        utmData: {
          landing_page: "https://nanobananaai.ai/"
        },
        user_id: this.user?.user_id
      }).catch(() => {});
      this.log(`✓ Logged in as User ID: ${this.user?.user_id}, Email: ${this.user?.user_email}, Credits: ${this.user?.left_credits}`);
      return this.user;
    } catch (e) {
      this.log(`Register/Login Error: ${e.response?.data?.message || e.response?.data?.error || e.message}`, "ERROR");
      if (e.response?.data) {
        this.log(`Response Data: ${JSON.stringify(e.response.data)}`, "ERROR");
      }
      throw e;
    }
  }
  async upload(images) {
    try {
      if (!images || !images.length) return [];
      this.log(`Uploading ${images.length} image(s)...`);
      const dataUris = [];
      const mimeTypes = [];
      for (const img of images) {
        const buf = await this.getBuffer(img);
        if (buf) {
          dataUris.push(await this.toDataUri(buf));
          mimeTypes.push("image/jpeg");
        }
      }
      if (!dataUris.length) throw new Error("No valid images to upload");
      const {
        data
      } = await this.client.post(`${this.cfg.baseUrl}/upload/images`, {
        images: dataUris,
        mimeTypes: mimeTypes
      });
      if (data.success && data.results) {
        const urls = data.results.filter(r => r.success).map(r => r.url);
        this.log(`Uploaded ${urls.length} images.`);
        return urls;
      }
      throw new Error("Upload returned unsuccessful status");
    } catch (e) {
      this.log(`Upload Error: ${e.message}`, "ERROR");
      return [];
    }
  }
  async generate({
    model = "nano",
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.user) await this.register();
      const mKey = Object.keys(this.cfg.models).find(k => k === model || this.cfg.models[k].id === model) || "nano";
      const mCfg = this.cfg.models[mKey];
      this.log(`Using model: ${mCfg.id}`);
      let imageUrls = [];
      if (image) {
        const imgArray = Array.isArray(image) ? image : [image];
        imageUrls = await this.upload(imgArray);
      }
      let payload = {
        prompt: prompt,
        user_id: this.user.user_id,
        user_email: this.user.user_email,
        ...rest
      };
      if (mKey === "nano") {
        payload = {
          ...payload,
          inputImages: imageUrls,
          mode: imageUrls.length > 0 ? "image-edit" : "text-to-image",
          output_format: rest.output_format || "png",
          image_size: rest.ratio || rest.image_size || "1:1"
        };
      } else if (mKey === "pro") {
        payload = {
          ...payload,
          image_input: imageUrls,
          aspect_ratio: rest.ratio || "1:1",
          resolution: rest.resolution || "1K",
          output_format: rest.output_format || "png"
        };
      } else if (mKey === "seedream") {
        payload = {
          ...payload,
          image_urls: imageUrls,
          aspect_ratio: rest.ratio || "1:1",
          quality: rest.quality || "basic"
        };
      } else if (mKey === "veo") {
        payload = {
          ...payload,
          imageUrls: imageUrls,
          aspectRatio: rest.ratio || "16:9",
          generationType: imageUrls.length ? "REFERENCE_2_VIDEO" : "TEXT_2_VIDEO"
        };
      } else if (mKey === "wan") {
        payload = {
          ...payload,
          imageUrls: imageUrls,
          size: rest.ratio || "1280*720",
          duration: rest.duration || 5,
          generationType: imageUrls.length ? "WAN_IMAGE_TO_VIDEO" : "WAN_TEXT_TO_VIDEO"
        };
        if (imageUrls.length) payload.resolution = "1080p";
      }
      this.log(`Sending Task...`);
      const {
        data: taskRes
      } = await this.client.post(`${this.cfg.baseUrl}${mCfg.path}`, payload);
      const taskId = taskRes.taskId;
      if (!taskId) throw new Error(`Failed to get Task ID. Response: ${JSON.stringify(taskRes)}`);
      this.log(`Task Started: ${taskId}`);
      return await this.poll(mCfg.path, taskId);
    } catch (e) {
      this.log(`Generate Error: ${e.response?.data?.error || e.message}`, "ERROR");
      throw e;
    }
  }
  async poll(path, taskId) {
    this.log("Polling for results...");
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
      try {
        const {
          data
        } = await this.client.get(`${this.cfg.baseUrl}${path}?taskId=${taskId}`);
        if (data.status === 2) {
          this.log("Task Completed Successfully!");
          return data;
        } else if (data.status === -1) {
          throw new Error(data.error_msg || "Task Failed on Server");
        } else {
          if (attempts % 5 === 0) this.log(`Status: Processing... (${attempts})`);
        }
      } catch (e) {
        if (e.message.includes("Task Failed")) throw e;
      }
      await new Promise(r => setTimeout(r, 4e3));
      attempts++;
    }
    throw new Error("Task Timeout");
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