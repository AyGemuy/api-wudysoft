import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class StyleAI {
  constructor() {
    this.base = "https://api1.styleai.art/styleai/client";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v22`;
    this.cfg = {
      token: "",
      kis: "",
      ra1: "",
      ra2: "",
      random: 0,
      timestamp: 0,
      isAuth: false
    };
  }
  enc(data) {
    try {
      const sorted = Object.keys(data).sort().reduce((r, k) => {
        let v = data[k];
        if (v === undefined) return r;
        if (typeof v === "string") v = v.replace(/[<>]/g, "");
        v = JSON.stringify(v);
        v = Buffer.from(v).toString("base64");
        r += `${k}=${v}`;
        return r;
      }, "");
      const parts = Buffer.from(this.cfg?.kis || "", "base64").toString().split("=sj+Ow2R/v");
      const randStr = (this.cfg?.random || 0).toString().split("");
      const v = parseInt(randStr?.[0] || 0);
      const g = parseInt(randStr?.[randStr?.length - 1] || 0);
      const w = randStr?.slice(2, 2 + v) || [];
      const B = randStr?.slice(4 + v, 4 + g + v) || [];
      const S = parseInt(w?.join("") || 0);
      const k = parseInt(B?.join("") || 0);
      const A = parts?.[S] || "";
      const E = parts?.[k] || "";
      const dec = (k, iv, data) => {
        const cipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(k, "utf8"), Buffer.from(iv, "utf8"));
        return cipher.update(data, "base64", "utf8") + cipher.final("utf8");
      };
      const enc = (k, iv, data) => {
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(k, "utf8"), Buffer.from(iv, "utf8"));
        return cipher.update(data, "utf8", "base64") + cipher.final("base64");
      };
      const C = dec(A, E, this.cfg?.ra1 || "");
      const z = dec(A, E, this.cfg?.ra2 || "");
      return crypto.createHash("md5").update(enc(C, z, sorted)).digest("hex");
    } catch {
      return "";
    }
  }
  async req(url, data = {}) {
    try {
      const res = await axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: this.cfg?.token || "",
          xtx: this.enc(data)
        }
      });
      console.log(res?.data);
      return res?.data || null;
    } catch (e) {
      console.log(`[ERR] ${e?.message || "Unknown"}`);
      return null;
    }
  }
  async init() {
    console.log("[INIT] Starting...");
    const res = await this.req(`${this.base}/common/getConfig`, {
      token: null,
      referrer: "https://www.google.com/"
    });
    if (res?.code === 0 && res?.data) {
      this.cfg = {
        ...this.cfg,
        ...res.data
      };
      console.log("[INIT] Ready");
      return res.data;
    }
    return null;
  }
  async mail(action, params = {}) {
    try {
      const res = await axios.get(this.mailApi, {
        params: {
          action: action,
          ...params
        }
      });
      return res?.data || null;
    } catch (e) {
      console.log(`[ERR] ${e?.message || "Unknown"}`);
      return null;
    }
  }
  async auth() {
    console.log("[AUTH] Creating temp email...");
    const mailData = await this.mail("create");
    if (!mailData?.email) return null;
    const email = mailData?.email;
    const mailId = mailData?.id;
    console.log(`[AUTH] Email: ${email}`);
    const sendRes = await this.req(`${this.base}/auth/mailSendMail`, {
      mail: email
    });
    if (sendRes?.code !== 0) return null;
    console.log("[AUTH] Waiting for code...");
    let code = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3e3));
      const inbox = await this.mail("inbox", {
        id: mailId
      });
      const msg = inbox?.messages?.[0];
      if (msg?.storage?.key) {
        const detail = await this.mail("message", {
          key: msg?.storage?.key,
          region: msg?.storage?.region
        });
        code = detail?.text_content?.match(/\d{6}/)?.[0];
        if (code) break;
      }
    }
    if (!code) {
      console.log("[AUTH] Code timeout");
      return null;
    }
    console.log(`[AUTH] Code: ${code}`);
    const loginRes = await this.req(`${this.base}/auth/mailLogin`, {
      mail: email,
      code: code
    });
    if (loginRes?.code === 0 && loginRes?.data) {
      this.cfg = {
        ...this.cfg,
        ...loginRes.data
      };
      console.log("[AUTH] Logged in");
      return loginRes.data;
    }
    return null;
  }
  async upload(input) {
    try {
      let buffer, type;
      if (typeof input === "string") {
        if (input?.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res?.data);
          type = res?.headers?.["content-type"] || "image/jpeg";
        } else if (input?.startsWith("data:")) {
          const [header, data] = input?.split(",") || [];
          type = header?.match(/:(.*?);/)?.[1] || "image/jpeg";
          buffer = Buffer.from(data, "base64");
        } else {
          buffer = Buffer.from(input, "base64");
          type = "image/jpeg";
        }
      } else if (Buffer.isBuffer(input)) {
        buffer = input;
        type = "image/jpeg";
      } else {
        throw new Error("Invalid input");
      }
      const form = new FormData();
      form.append("file", buffer, {
        filename: "image.jpg",
        contentType: type
      });
      const res = await axios.post(`${this.base}/resource/uploadFile`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: this.cfg?.token || "",
          xtx: this.enc({})
        }
      });
      return res?.data?.data?.key || null;
    } catch (e) {
      console.log(`[ERR] ${e?.message || "Unknown"}`);
      return null;
    }
  }
  async poll(id, max = 60, delay = 3e3) {
    for (let i = 0; i < max; i++) {
      const res = await this.req(`${this.base}/styleAI/check`, {
        id: id
      });
      const status = res?.data?.photo?.status;
      if (status === 2) return res?.data;
      if (status === 3) return res?.data;
      await new Promise(r => setTimeout(r, delay));
    }
    return null;
  }
  async ensure(token) {
    if (token) {
      console.log("[ENSURE] Using provided token");
      this.cfg.token = token;
      const res = await this.req(`${this.base}/common/getConfig`, {
        token: token,
        referrer: "https://styleai.art/"
      });
      if (res?.code === 0 && res?.data) {
        this.cfg = {
          ...this.cfg,
          ...res.data
        };
        return res.data;
      }
      return null;
    }
    if (!this.cfg?.isAuth) {
      const initData = await this.init();
      if (!initData) return null;
      const authData = await this.auth();
      if (!authData) return null;
      return authData;
    }
    return this.cfg;
  }
  async generate({
    token,
    mode = "draw",
    prompt = "",
    image,
    ...rest
  }) {
    console.log(`[GENERATE] Mode: ${mode}, Prompt: ${prompt}`);
    const authData = await this.ensure(token);
    if (!authData) {
      console.log("[GENERATE] Auth failed");
      return null;
    }
    const urls = {
      draw: `${this.base}/styleAI/draw`,
      veo: `${this.base}/styleAI/veo`,
      sora: `${this.base}/styleAI/sora2`,
      talk: `${this.base}/styleAI/talk`
    };
    let keys = [];
    if (image) {
      console.log("[GENERATE] Uploading images...");
      const imgs = Array.isArray(image) ? image : [image];
      for (const img of imgs) {
        const key = await this.upload(img);
        if (key) keys.push(key);
      }
    }
    const data = {
      prompt: prompt,
      keys: keys?.length ? keys : undefined,
      size: rest?.size || "auto",
      styleName: rest?.styleName || "",
      ...rest
    };
    console.log("[GENERATE] Submitting...");
    const res = await this.req(urls?.[mode] || urls.draw, data);
    const id = res?.data?.id;
    if (!id) {
      console.log("[GENERATE] No task ID");
      return null;
    }
    console.log(`[GENERATE] Task ID: ${id}`);
    console.log("[GENERATE] Polling...");
    const result = await this.poll(id);
    if (result?.photo?.url) {
      console.log(`[GENERATE] Done: ${result?.photo?.url}`);
    } else {
      console.log("[GENERATE] Failed");
    }
    return {
      ...result,
      token: this.cfg?.token
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
  const api = new StyleAI();
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