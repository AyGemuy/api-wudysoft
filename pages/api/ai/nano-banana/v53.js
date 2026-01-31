import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
const CONFIG = {
  MODES: ["standard", "pro"],
  ACTIONS: {
    UPLOAD: "7f991b3ca10618e3e3a3af672befc72c57439f2ef5",
    GENERATE: "7f4448cc5fac08412333b972b85a7ef0fb86c23cfc"
  },
  ASPECT_RATIOS: ["1:1", "16:9", "4:3", "3:2", "5:4", "9:16", "3:4", "2:3", "4:5", "21:9"],
  RESOLUTIONS: ["1K", "2K", "4K"]
};
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.ses = wrapper(axios.create({
      baseURL: "https://nanobanana.uk",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        origin: "https://nanobanana.uk",
        referer: "https://nanobanana.uk/image/banana-ai",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        priority: "u=1, i"
      }
    }));
    this.mailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.mail = null;
    this.uid = "guest";
  }
  log(msg, type = "INFO") {
    const t = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`[${t}] [${type}] ${msg}`);
  }
  async wait(ms) {
    return new Promise(r => setTimeout(r, ms || 1e3));
  }
  validateAspectRatio(ratio) {
    if (!CONFIG.ASPECT_RATIOS.includes(ratio)) {
      throw new Error(`Invalid aspect ratio: ${ratio}. Valid ratios: ${CONFIG.ASPECT_RATIOS.join(", ")}`);
    }
    return ratio;
  }
  validateResolution(resolution) {
    if (!CONFIG.RESOLUTIONS.includes(resolution)) {
      throw new Error(`Invalid resolution: ${resolution}. Valid resolutions: ${CONFIG.RESOLUTIONS.join(", ")}`);
    }
    return resolution;
  }
  validateMode(mode) {
    if (!CONFIG.MODES.includes(mode)) {
      throw new Error(`Invalid mode: ${mode}. Valid modes: ${CONFIG.MODES.join(", ")}`);
    }
    return mode;
  }
  async updateUidFromSession() {
    try {
      const cookies = await this.jar.getCookies("https://nanobanana.uk");
      const sessData = cookies.find(c => c.key.includes("session_data"));
      if (sessData) {
        const raw = decodeURIComponent(sessData.value);
        const jsonStr = Buffer.from(raw, "base64").toString("utf-8");
        const data = JSON.parse(jsonStr);
        if (data?.session?.user?.id) {
          this.uid = data.session.user.id;
          this.log(`Session Sync: UserID updated to ${this.uid}`);
          return true;
        }
      }
    } catch (e) {}
    return false;
  }
  async hasSession() {
    try {
      const cookies = await this.jar.getCookies("https://nanobanana.uk");
      return cookies.some(c => c.key.includes("session_token"));
    } catch {
      return false;
    }
  }
  async toBuf(src) {
    try {
      if (!src) return null;
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("http")) return (await axios.get(src, {
          responseType: "arraybuffer"
        })).data;
        if (src.startsWith("data:")) return Buffer.from(src.split(",")[1], "base64");
        return Buffer.from(src, "base64");
      }
      return null;
    } catch {
      return null;
    }
  }
  async mkMail() {
    try {
      this.mail = null;
      this.log("Creating temp mail...");
      const {
        data
      } = await axios.get(`${this.mailUrl}?action=create`);
      if (data?.email) {
        this.mail = data.email;
        this.log(`Mail created: ${this.mail}`);
        return this.mail;
      }
      throw new Error("No email");
    } catch (e) {
      throw new Error(`Mail fail: ${e.message}`);
    }
  }
  async scanMail() {
    this.log(`Waiting link for ${this.mail}...`);
    let i = 0;
    while (i < 60) {
      try {
        const {
          data
        } = await axios.get(`${this.mailUrl}?action=message&email=${this.mail}`);
        const msg = data?.data?.find(m => m.text_content?.includes("verify-email"));
        if (msg) {
          const match = msg.text_content.match(/https:\/\/nanobanana\.uk\/api\/auth\/verify-email[^\s\n]+/);
          if (match && match[0]) return match[0];
        }
      } catch {}
      await this.wait(3e3);
      i++;
    }
    throw new Error("Link timeout");
  }
  async auth() {
    try {
      await this.mkMail();
      this.log(`Registering...`);
      await this.ses.post("/api/auth/sign-up/email", {
        email: this.mail,
        password: this.mail,
        name: this.mail.split("@")[0],
        callbackURL: "/image/banana-ai"
      });
      const link = await this.scanMail();
      this.log(`Verifying: ${link.slice(0, 50)}...`);
      await this.ses.get(link, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1"
        }
      });
      if (await this.hasSession()) {
        await this.updateUidFromSession();
        this.log("Login Success.");
        return true;
      }
      throw new Error("No session cookie");
    } catch (e) {
      this.log(`Auth Fail: ${e.message}`, "ERR");
      this.mail = null;
      return false;
    }
  }
  async upImg(buf) {
    try {
      const b64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
      const headers = {
        "next-action": CONFIG.ACTIONS.UPLOAD
      };
      const {
        data
      } = await this.ses.post("/image/banana-ai", [{
        imageData: b64,
        filename: `ref-${Date.now()}.jpg`
      }], {
        headers: headers
      });
      const line = data.toString().split("\n").find(l => l.startsWith("1:"));
      const result = line ? JSON.parse(line.slice(2))?.data : null;
      console.log(result);
      return result;
    } catch {
      return null;
    }
  }
  async task(pl) {
    const headers = {
      "next-action": CONFIG.ACTIONS.GENERATE,
      "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(marketing)%22%2C%7B%22children%22%3A%5B%22image%22%2C%7B%22children%22%3A%5B%22banana-ai%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fimage%2Fbanana-ai%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D"
    };
    const {
      data
    } = await this.ses.post("/image/banana-ai", [pl], {
      headers: headers
    });
    const line = data.toString().split("\n").find(l => l.startsWith("1:"));
    const result = line ? JSON.parse(line.slice(2))?.data : null;
    console.log(result);
    return result;
  }
  async poll(tid, uid) {
    let e = 0;
    while (e < 60) {
      try {
        const {
          data
        } = await this.ses.get(`/api/kie/poll?taskId=${tid}&userId=${uid}`);
        console.log(data);
        if (data?.success) {
          if (data.status === "completed" && data.imageUrl) return data;
          if (data.status === "failed") throw new Error(data.error || "Failed");
        }
      } catch (err) {
        if (err.message.includes("Failed")) throw err;
      }
      await this.wait(3e3);
      e += 3;
    }
    throw new Error("Timeout");
  }
  async generate({
    prompt,
    image,
    mode = "standard",
    aspectRatio,
    resolution,
    ...opts
  }) {
    try {
      const finalMode = this.validateMode(mode);
      let finalAspectRatio, finalResolution;
      if (finalMode === "pro") {
        finalAspectRatio = this.validateAspectRatio(aspectRatio || "1:1");
        finalResolution = this.validateResolution(resolution || "2K");
      } else {
        finalAspectRatio = this.validateAspectRatio(aspectRatio || "1:1");
        finalResolution = undefined;
      }
      if (!await this.hasSession()) {
        const ok = await this.auth();
        if (!ok && finalMode === "pro") throw new Error("Auth required for pro mode");
      } else {
        if (this.uid === "guest") await this.updateUidFromSession();
      }
      const inputs = [];
      if (image) {
        const arr = Array.isArray(image) ? image : [image];
        const limit = finalMode === "pro" ? 8 : 10;
        this.log(`Uploading ${arr.length} images...`);
        for (const src of arr.slice(0, limit)) {
          const buf = await this.toBuf(src);
          if (buf) {
            const {
              url
            } = await this.upImg(buf);
            if (url) inputs.push(url);
            else if (typeof src === "string" && src.startsWith("http")) inputs.push(src);
          }
        }
      }
      const pl = {
        prompt: prompt || "Masterpiece",
        outputFormat: opts.outputFormat === "jpg" ? "jpeg" : "png",
        imageSize: finalAspectRatio,
        imageInput: inputs.length ? inputs : undefined,
        userId: this.uid,
        mode: finalMode,
        ...finalMode === "pro" && {
          resolution: finalResolution,
          aspectRatio: finalAspectRatio
        },
        ...opts
      };
      Object.keys(pl).forEach(k => pl[k] === undefined && delete pl[k]);
      this.log(`Task [${finalMode}]: ${prompt.slice(0, 15)}... Ratio: ${finalAspectRatio}${finalMode === "pro" ? `, Res: ${finalResolution}` : ""}`);
      const t = await this.task(pl);
      if (!t?.success) {
        const err = typeof t?.error === "string" ? t.error : JSON.stringify(t?.error || t?.serverError);
        if (err.includes("sign in") || err.includes("unauthorized")) {
          this.log("Session invalid. Resetting...");
          this.mail = null;
          this.uid = "guest";
          this.jar.removeAllCookiesSync();
          if (await this.auth()) {
            return this.generate({
              prompt: prompt,
              image: image,
              mode: finalMode,
              aspectRatio: finalAspectRatio,
              resolution: finalResolution,
              ...opts
            });
          }
        }
        throw new Error(err);
      }
      if (t.userId) this.uid = t.userId;
      const res = await this.poll(t.taskId, t.userId);
      this.log("Done!", "SUCCESS");
      return res;
    } catch (e) {
      return {
        status: false,
        error: e.message
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