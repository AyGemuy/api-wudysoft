import axios from "axios";
import {
  randomBytes
} from "crypto";
import FormData from "form-data";
import https from "https";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor(state = null) {
    this.BASE = "https://bananaproai.ai";
    this.MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.rnd = (n = 16) => randomBytes(n).toString("hex");
    this.wait = ms => new Promise(r => setTimeout(r, ms));
    this.log = (...a) => console.log(`-->`, ...a);
    this.agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      family: 4
    });
    this.cookieStore = {};
    this.http = axios.create({
      baseURL: this.BASE,
      httpsAgent: this.agent,
      maxRedirects: 10,
      headers: {
        "user-agent": this.UA,
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        priority: "u=1, i"
      }
    });
    this.http.interceptors.request.use(config => {
      const cookieString = Object.entries(this.cookieStore).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookieString) config.headers["Cookie"] = cookieString;
      return config;
    });
    const extractCookies = headers => {
      const setCookie = headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(raw => {
          const parts = raw.split(";")[0];
          const [key, ...valParts] = parts.split("=");
          const val = valParts.join("=");
          if (key && val) this.cookieStore[key.trim()] = val.trim();
        });
      }
    };
    this.http.interceptors.response.use(resp => {
      extractCookies(resp.headers);
      return resp;
    }, err => {
      if (err.response) extractCookies(err.response.headers);
      return Promise.reject(err);
    });
    if (state) this.load(state);
  }
  save() {
    try {
      return Buffer.from(JSON.stringify(this.cookieStore)).toString("base64");
    } catch {
      return null;
    }
  }
  load(b64) {
    try {
      const c = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      this.cookieStore = {
        ...this.cookieStore,
        ...c
      };
      this.log("[state] loaded");
    } catch (e) {
      this.log("[state] load failed");
    }
  }
  async mkMail() {
    try {
      this.log("[mail] creating...");
      const {
        data
      } = await axios.get(`${this.MAIL}?action=create`, {
        httpsAgent: this.agent
      });
      this.log("[mail]", data.email);
      return data.email;
    } catch (e) {
      this.log("[mail] err:", e.message);
      throw e;
    }
  }
  async waitOtp(email) {
    this.log("[otp] waiting...");
    for (let i = 0; i < 20; i++) {
      try {
        await this.wait(3e3);
        const {
          data
        } = await axios.get(`${this.MAIL}?action=message&email=${email}`, {
          httpsAgent: this.agent
        });
        for (const m of data.data || []) {
          const match = (m.text_content || "").match(/verify-email\?token=([^\s&)\]]+)/);
          if (match) return match[1].split("&")[0];
        }
      } catch (e) {}
    }
    throw new Error("OTP timeout");
  }
  async reg() {
    try {
      this.log("[reg] start");
      const email = await this.mkMail();
      const pass = "@A1" + this.rnd();
      const name = "user" + this.rnd(8);
      await this.http.post("/api/auth/sign-up/email", {
        email: email,
        password: pass,
        name: name,
        callbackURL: "/dashboard"
      }, {
        headers: {
          "content-type": "application/json",
          origin: this.BASE,
          referer: `${this.BASE}/register`
        }
      });
      this.log("[reg] signup ok");
      const token = await this.waitOtp(email);
      this.log("[reg] token found");
      try {
        await this.http.get(`/api/auth/verify-email?token=${token}&callbackURL=/dashboard`, {
          maxRedirects: 0,
          validateStatus: s => s >= 200 && s < 400,
          headers: {
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "upgrade-insecure-requests": "1"
          }
        });
        this.log("[reg] verify ok (cookie captured)");
      } catch (e) {
        this.log("[reg] verify warn:", e.message);
      }
      await this.http.post("/api/auth/update-utm", {}, {
        headers: {
          "content-type": "application/json",
          origin: this.BASE,
          referer: `${this.BASE}/dashboard`
        }
      });
      const {
        data
      } = await this.http.get("/api/user/info", {
        headers: {
          referer: `${this.BASE}/dashboard`
        }
      });
      const u = data?.user ?? data?.data;
      this.log("[reg] user:", u?.email, "| credits:", u?.leftCredits);
      return this.save();
    } catch (e) {
      this.log("[reg] fatal:", e.message);
      throw e;
    }
  }
  async solveImg(img) {
    try {
      if (Buffer.isBuffer(img)) return {
        buf: img,
        mime: "image/jpeg",
        name: `img_${this.rnd(4)}.jpg`
      };
      const {
        data,
        headers
      } = await axios.get(img, {
        responseType: "arraybuffer",
        httpsAgent: this.agent
      });
      const mime = headers["content-type"]?.split(";")[0] || "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      return {
        buf: Buffer.from(data),
        mime: mime,
        name: `img_${this.rnd(4)}.${ext}`
      };
    } catch (e) {
      throw new Error(`failed fetch img: ${e.message}`);
    }
  }
  async upImg(img) {
    try {
      const {
        buf,
        mime,
        name
      } = await this.solveImg(img);
      this.log("[upload] start:", name, buf.length, "bytes");
      const {
        data: ps
      } = await this.http.post("/api/upload/image/presign", {
        filename: name,
        contentType: mime,
        size: buf.length
      }, {
        headers: {
          "content-type": "application/json",
          origin: this.BASE,
          referer: `${this.BASE}/dashboard`
        }
      });
      await axios.put(ps.uploadUrl, buf, {
        headers: {
          "Content-Type": mime
        },
        maxRedirects: 0,
        httpsAgent: this.agent
      });
      this.log("[upload] done:", ps.url);
      return ps.url;
    } catch (e) {
      this.log("[upload] error:", e.message);
      throw e;
    }
  }
  async poll(taskId) {
    this.log("[poll]", taskId);
    for (let i = 0; i < 60; i++) {
      try {
        await this.wait(3e3);
        const {
          data
        } = await this.http.get(`/api/image/status/${taskId}`, {
          headers: {
            referer: `${this.BASE}/dashboard`
          }
        });
        if (data.status === 1) {
          this.log("[poll] success");
          return data;
        }
        if (data.status === -1) throw new Error("Generation failed");
      } catch (e) {
        if (e.message.includes("failed")) throw e;
      }
    }
    throw new Error("Poll timeout");
  }
  async generate({
    state,
    prompt,
    image,
    aspectRatio = "1:1",
    model = "nano-banana",
    addWatermark = true,
    ...rest
  }) {
    try {
      this.log("[gen] start");
      if (state) this.load(state);
      else state = await this.reg();
      let taskData;
      if (image) {
        this.log("[gen] mode: i2i");
        const imgs = Array.isArray(image) ? image : [image];
        const uploadedUrls = [];
        for (const i of imgs) {
          const u = await this.upImg(i);
          uploadedUrls.push(u);
        }
        const fd = new FormData();
        fd.append("prompt", prompt);
        fd.append("addWatermark", String(addWatermark));
        fd.append("model", model);
        fd.append("aspectRatio", aspectRatio);
        fd.append("inputMode", "url");
        fd.append("imageUrls", JSON.stringify(uploadedUrls));
        for (const [k, v] of Object.entries(rest)) fd.append(k, String(v));
        const {
          data
        } = await this.http.post("/api/image/generate", fd, {
          headers: {
            ...fd.getHeaders(),
            origin: this.BASE,
            referer: `${this.BASE}/dashboard`
          }
        });
        taskData = data;
      } else {
        this.log("[gen] mode: t2i");
        const payload = {
          prompt: prompt,
          aspectRatio: aspectRatio,
          addWatermark: addWatermark,
          model: model,
          ...rest
        };
        const {
          data
        } = await this.http.post("/api/text-to-image/generate", payload, {
          headers: {
            "content-type": "application/json",
            origin: this.BASE,
            referer: `${this.BASE}/text-to-image`
          }
        });
        taskData = data;
      }
      this.log("[gen] task created:", taskData.taskId, "| credits:", taskData.remainingCredits);
      const res = await this.poll(taskData.taskId);
      return {
        result: res.outputImage,
        state: this.save(),
        taskId: taskData.taskId,
        credits: taskData.remainingCredits
      };
    } catch (e) {
      this.log("[gen] error:", e.message);
      if (e.response) {
        this.log("[gen] status:", e.response.status);
        this.log("[gen] data:", JSON.stringify(e.response.data));
      }
      throw e;
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