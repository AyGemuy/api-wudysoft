import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://bananaai.studio",
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        origin: "https://bananaai.studio",
        referer: "https://bananaai.studio/",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=1, i"
      }
    }));
    this.email = null;
    this.isAuth = false;
  }
  log(msg, tag = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${tag}] ${msg}`);
  }
  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async mail() {
    try {
      this.log("Creating mail...", "MAIL");
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.email = data?.email;
      return this.email;
    } catch (e) {
      this.log(e.message, "ERR-MAIL");
      return null;
    }
  }
  async check() {
    if (!this.email) return null;
    try {
      const {
        data
      } = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
      const msgs = data?.data || [];
      for (const m of msgs) {
        const txt = m?.text_content || m?.html_content || "";
        const match = txt.match(/https:\/\/bananaai\.studio\/(?:api\/auth\/)?verify-email[^\s"']+/);
        if (match) return match[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async auth() {
    if (this.isAuth) return true;
    if (!this.email) await this.mail();
    try {
      this.log(`Registering: ${this.email}`, "AUTH");
      await this.client.post("/api/auth/sign-up/email", {
        email: this.email,
        password: this.email,
        name: this.email.split("@")[0]
      });
      await this.client.post("/api/auth/send-verification-email", {
        email: this.email,
        callbackURL: "/"
      });
      this.log("Waiting link...", "AUTH");
      let link = null;
      for (let i = 0; i < 60; i++) {
        link = await this.check();
        if (link) break;
        await this.sleep(3e3);
      }
      if (!link) throw new Error("Timeout verify link");
      this.log(`Verifying: ${link}`, "AUTH");
      await this.client.get(link);
      const cookies = await this.jar.getCookies("https://bananaai.studio");
      if (cookies.some(c => c.key.includes("session_token"))) {
        this.isAuth = true;
        this.log("Login success", "AUTH");
        return true;
      }
      throw new Error("No session cookie");
    } catch (e) {
      this.log(e.message, "ERR-AUTH");
      return false;
    }
  }
  async upload(src) {
    try {
      this.log("Uploading...", "UP");
      const form = new FormData();
      let buf;
      if (Buffer.isBuffer(src)) {
        buf = src;
      } else if (src.startsWith("http")) {
        const r = await axios.get(src, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(r.data);
      } else if (src.startsWith("data:")) {
        buf = Buffer.from(src.split(",")[1], "base64");
      } else {
        throw new Error("Invalid format");
      }
      form.append("files", buf, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const {
        data
      } = await this.client.post("/api/storage/upload-image", form, {
        headers: form.getHeaders()
      });
      console.log(data);
      return data?.data?.urls?.[0];
    } catch (e) {
      this.log(e.message, "ERR-UP");
      return null;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.isAuth) await this.auth();
      const provider = rest.provider || "kie";
      let model = rest.model || "google/nano-banana";
      const ratio = rest.ratio || "1:1";
      let scene = "text-to-image";
      let imgs = [];
      if (image) {
        scene = "image-to-image";
        const url = await this.upload(image);
        if (!url) throw new Error("Upload failed");
        imgs = [url];
        if (model === "google/nano-banana") {
          model = "google/nano-banana-edit";
        }
      }
      const options = {
        aspect_ratio: ratio
      };
      if (["kie", "wavespeed"].includes(provider)) {
        if (imgs.length) options.image_urls = imgs;
      } else {
        if (imgs.length) options.image_input = imgs;
      }
      const payload = {
        mediaType: "image",
        scene: scene,
        provider: provider,
        model: model,
        prompt: prompt,
        options: options
      };
      this.log(`Gen [${provider}/${model}]: ${prompt.slice(0, 20)}...`, "GEN");
      const {
        data
      } = await this.client.post("/api/ai/generate", payload);
      console.log(data);
      const tid = data?.data?.id;
      if (!tid) throw new Error("No Task ID returned");
      return await this.poll(tid);
    } catch (e) {
      this.log(e.message, "ERR-GEN");
      return {
        error: e.message
      };
    }
  }
  async poll(tid) {
    this.log(`Polling: ${tid}`, "POLL");
    for (let i = 0; i < 60; i++) {
      try {
        const {
          data
        } = await this.client.post("/api/ai/query", {
          taskId: tid
        });
        console.log(data);
        const d = data?.data || {};
        const status = d.status;
        if (status === "success") {
          let results = [];
          try {
            const taskRes = JSON.parse(d.taskResult || "{}");
            const jsonRes = JSON.parse(taskRes.resultJson || "{}");
            results = jsonRes.resultUrls || jsonRes.outputs || [];
          } catch (err) {}
          this.log("Task Success!", "POLL");
          return {
            status: "success",
            result: results,
            info: {
              model: d.model,
              cost: d.costCredits,
              provider: d.provider
            }
          };
        } else if (status === "failed") {
          throw new Error(d.message || "Server reported failure");
        }
        await this.sleep(3e3);
      } catch (e) {
        if (e.message.includes("failure")) throw e;
      }
    }
    throw new Error("Polling timeout");
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