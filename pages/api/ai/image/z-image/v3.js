import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
const BASE = "https://zimage2.com";
const MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const ACTION_DASHBOARD = "7f81eb6cfe2b1c2a9ff93ba33bf13d06828ffd6a4d";
const ACTION_CREDITS = "7fb7c352d68fd8d271182bd8d23730f5a850aa7b96";
const SIZES = ["1:1", "9:16", "3:4", "2:3", "4:5", "16:9", "21:9", "4:3", "3:2", "5:4"];
const log = (t, ...a) => console.log(`[${t}]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
class ZImage {
  constructor() {
    this.jar = new CookieJar();
    this.ax = wrapper(axios.create({
      baseURL: BASE,
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": UA,
        "accept-language": "id-ID",
        pragma: "no-cache",
        "cache-control": "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        origin: BASE
      }
    }));
    this.authed = false;
    this.userId = null;
  }
  async attempt(fn, tries = 3, delay = 3e3) {
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (e) {
        log("retry", `${i + 1}/${tries}`, e?.response?.data?.message || e?.message);
        if (i < tries - 1) await sleep(delay);
        else throw e;
      }
    }
  }
  async toImg(src) {
    if (!src) return null;
    try {
      if (typeof src === "string" && src.startsWith("http")) {
        log("img", "fetching...");
        const r = await axios.get(src, {
          responseType: "arraybuffer"
        });
        return "data:image/jpeg;base64," + Buffer.from(r.data).toString("base64");
      }
      if (Buffer.isBuffer(src)) return "data:image/jpeg;base64," + src.toString("base64");
      if (typeof src === "string" && src.startsWith("data:")) return src;
      return "data:image/jpeg;base64," + src;
    } catch (e) {
      log("error", "toImg", e?.message);
      throw e;
    }
  }
  async mkMail() {
    log("mail", "creating...");
    try {
      const {
        data
      } = await axios.get(MAIL, {
        params: {
          action: "create"
        }
      });
      log("mail", data?.email);
      return data?.email;
    } catch (e) {
      log("error", "mkMail", e?.message);
      throw e;
    }
  }
  async getOtp(email, {
    timeout = 6e4,
    interval = 3e3
  } = {}) {
    log("otp", "polling", email);
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        const {
          data
        } = await axios.get(MAIL, {
          params: {
            action: "message",
            email: email
          }
        });
        for (const m of data?.data || []) {
          const match = (m?.text_content || "").match(/verify-email\?token=([A-Za-z0-9._-]+)/);
          if (match) {
            log("otp", "token found");
            return match[1];
          }
        }
      } catch (e) {
        log("warn", "otp", e?.message);
      }
      log("otp", "waiting...");
      await sleep(interval);
    }
    throw new Error("OTP timeout");
  }
  async register(email) {
    log("register", email);
    try {
      const {
        data
      } = await this.ax.post("/api/auth/sign-up/email", {
        email: email,
        password: email,
        name: email,
        callbackURL: "/dashboard?conv=signup"
      }, {
        headers: {
          "content-type": "application/json",
          referer: BASE + "/auth/register"
        }
      });
      log("register", "ok");
      return data;
    } catch (e) {
      log("error", "register", e?.response?.data || e?.message);
      throw e;
    }
  }
  async verify(token) {
    log("verify", token.slice(0, 20) + "...");
    try {
      await this.ax.get(`/api/auth/verify-email?token=${token}&callbackURL=/dashboard?conv=signup`, {
        maxRedirects: 5,
        validateStatus: s => s < 500,
        headers: {
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "upgrade-insecure-requests": "1"
        }
      });
      const cookies = await this.jar.getCookies(BASE);
      log("verify", "cookies:", cookies.map(c => c.key).join(", "));
    } catch (e) {
      log("error", "verify", e?.message);
      throw e;
    }
  }
  async session() {
    log("session", "fetching...");
    try {
      const {
        data
      } = await this.ax.get("/api/auth/get-session", {
        headers: {
          accept: "*/*",
          referer: BASE + "/dashboard?conv=signup"
        }
      });
      this.userId = data?.user?.id || data?.session?.userId || null;
      log("session", "userId:", this.userId, "| email:", data?.user?.email);
      return data;
    } catch (e) {
      log("error", "session", e?.response?.data || e?.message);
      throw e;
    }
  }
  async claimDashboard() {
    if (!this.userId) throw new Error("userId not set — call session() first");
    log("claim", "dashboard action, userId:", this.userId);
    try {
      const {
        data
      } = await this.ax.post("/dashboard", JSON.stringify([{
        userId: this.userId
      }]), {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": ACTION_DASHBOARD,
          "next-router-state-tree": encodeURIComponent(JSON.stringify(["", {
            children: [
              ["locale", "en", "d"], {
                children: ["(protected)", {
                  children: ["dashboard", {
                    children: ['__PAGE__?{"conv":"signup"}', {}, "/dashboard?conv=signup", "refresh"]
                  }]
                }]
              }
            ]
          }])),
          referer: BASE + "/dashboard"
        }
      });
      log("claim", "dashboard:", typeof data === "string" ? data.slice(0, 80) : JSON.stringify(data).slice(0, 80));
      return data;
    } catch (e) {
      log("warn", "claimDashboard", e?.response?.data || e?.message);
      return null;
    }
  }
  async checkCredits({
    requiredCredits = 3,
    operation = "image-generation-max"
  } = {}) {
    log("credits", "checking...");
    try {
      const res = await this.ax.post("/image/zimage", JSON.stringify([{
        requiredCredits: requiredCredits,
        operation: operation
      }]), {
        headers: {
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": ACTION_CREDITS,
          "next-router-state-tree": encodeURIComponent(JSON.stringify(["", {
            children: [
              ["locale", "en", "d"], {
                children: ["(marketing)", {
                  children: ["image", {
                    children: ["zimage", {
                      children: ["__PAGE__", {}, "/image/zimage", "refresh"]
                    }]
                  }]
                }]
              }
            ]
          }])),
          referer: BASE + "/image/zimage"
        }
      });
      const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      let parsed = null;
      for (const line of raw.split("\n")) {
        const m = line.match(/^\d+:(.+)$/);
        if (!m) continue;
        try {
          const obj = JSON.parse(m[1]);
          if (obj?.data?.success !== undefined) {
            parsed = obj.data;
            break;
          }
        } catch {}
      }
      const bal = parsed?.data?.currentBalance ?? parsed?.data?.hasCredits ?? "?";
      log("credits", "hasCredits:", parsed?.data?.hasCredits, "| balance:", bal);
      return parsed;
    } catch (e) {
      log("warn", "checkCredits", e?.response?.data || e?.message);
      return null;
    }
  }
  async auth() {
    if (this.authed) return;
    log("auth", "start...");
    const email = await this.mkMail();
    await this.register(email);
    const token = await this.getOtp(email);
    await this.verify(token);
    await this.session();
    await this.claimDashboard();
    await this.checkCredits();
    this.authed = true;
    log("auth", "ready ✓");
  }
  async moderate(prompt) {
    log("moderate", prompt.slice(0, 40) + "...");
    return this.attempt(async () => {
      try {
        const {
          data
        } = await this.ax.post("/api/ws-moderator/text", {
          text: prompt
        }, {
          headers: {
            "content-type": "application/json",
            referer: BASE + "/image/zimage"
          }
        });
        log("moderate", "allowed:", data?.allowed);
        if (!data?.allowed) throw new Error(data?.message || "prompt not allowed");
        if (!data?.moderationToken) throw new Error("no moderationToken");
        return data.moderationToken;
      } catch (e) {
        log("error", "moderate", e?.response?.data || e?.message);
        throw e;
      }
    });
  }
  async gen(body) {
    log("gen", "imageSize:", body.imageSize, "| i2i:", !!body.images);
    return this.attempt(async () => {
      try {
        const {
          data
        } = await this.ax.post("/api/wave-zimage/generate", body, {
          headers: {
            "content-type": "application/json",
            referer: BASE + "/image/zimage"
          }
        });
        const taskId = data?.generationTaskId || data?.taskId || data?.id || data?.requestId;
        log("gen", "taskId:", taskId);
        if (!taskId) throw new Error("no taskId: " + JSON.stringify(data));
        return taskId;
      } catch (e) {
        log("error", "gen", e?.response?.data || e?.message);
        throw e;
      }
    });
  }
  async poll(taskId) {
    log("poll", taskId);
    let n = 0,
      delay = 3e3;
    while (n < 60) {
      n++;
      log("poll", `${n}/60 @ ${delay}ms`);
      try {
        const {
          data
        } = await this.ax.get(`/api/wave-zimage/polling/${taskId}`, {
          headers: {
            referer: BASE + "/image/zimage"
          }
        });
        const st = (data?.status || "").toUpperCase();
        log("poll", "status:", st);
        if (st === "SUCCESS") {
          const imgs = data?.response?.resultUrls || (data?.response?.resultImageUrl ? [data.response.resultImageUrl] : []);
          log("poll", "done! images:", imgs.length, "|", imgs[0]);
          return {
            status: st,
            id: taskId,
            result: imgs
          };
        }
        if (st === "FAILED") throw new Error(data?.errorMessage || "Task failed");
      } catch (e) {
        if (e?.message?.startsWith("Task")) throw e;
        log("warn", "poll", e?.message);
      }
      await sleep(delay);
      delay = Math.min(Math.round(delay * 1.2), 6e4);
    }
    throw new Error("Poll timeout after 60 attempts");
  }
  async generate({
    prompt,
    imageSize,
    image,
    ...rest
  }) {
    if (!prompt) throw new Error("prompt required");
    imageSize = imageSize || "1:1";
    if (!SIZES.includes(imageSize)) throw new Error(`invalid imageSize "${imageSize}". valid: ${SIZES.join(", ")}`);
    await this.auth();
    const moderationToken = await this.moderate(prompt);
    const body = {
      prompt: prompt,
      imageSize: imageSize,
      moderationToken: moderationToken
    };
    if (image) {
      const srcs = Array.isArray(image) ? image : [image];
      const resolved = [];
      for (const s of srcs) resolved.push(await this.toImg(s) || s);
      log("gen", "mode: i2i, images:", resolved.length);
      body.images = resolved;
    } else {
      log("gen", "mode: t2i");
    }
    Object.assign(body, rest);
    const taskId = await this.gen(body);
    return await this.poll(taskId);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ZImage();
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