import axios from "axios";
import crypto from "crypto";
const BASE = "https://santriai.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class SantriAI {
  constructor() {
    this.cookies = {};
    this.http = axios.create({
      baseURL: BASE,
      withCredentials: true,
      headers: {
        "user-agent": UA,
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        origin: BASE,
        referer: BASE + "/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-fetch-dest": "empty",
        priority: "u=1, i"
      }
    });
    this.http.interceptors.response.use(function(res) {
      const sc = res.headers["set-cookie"] ?? [];
      for (const c of sc) {
        const pair = c.split(";")[0];
        const idx = pair.indexOf("=");
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        this.cookies[k] = v;
      }
      return res;
    }.bind(this));
    this.http.interceptors.request.use(function(cfg) {
      const parts = [];
      for (const k in this.cookies) {
        parts.push(k + "=" + this.cookies[k]);
      }
      if (parts.length) cfg.headers["cookie"] = parts.join("; ");
      return cfg;
    }.bind(this));
  }
  ai(min, max) {
    return min + crypto.randomInt(max - min + 1);
  }
  ah(n) {
    let s = "";
    for (let i = 0; i < n; i++) {
      s += String.fromCharCode(this.ai(97, 122));
    }
    return s;
  }
  asu() {
    const kon = "bdjklmnprst";
    const vok = "aiueo";
    const k = kon[this.ai(0, kon.length - 1)];
    const v = vok[this.ai(0, vok.length - 1)];
    return k + v;
  }
  an() {
    const suku = this.ai(2, 3);
    let nama = "";
    for (let i = 0; i < suku; i++) {
      nama += this.asu();
    }
    return nama.charAt(0).toUpperCase() + nama.slice(1);
  }
  ak() {
    const suku = this.ai(2, 3);
    let kota = "";
    for (let i = 0; i < suku; i++) {
      kota += this.asu();
    }
    return kota.charAt(0).toUpperCase() + kota.slice(1);
  }
  ad() {
    return "gmail.com";
  }
  ag() {
    return this.ai(0, 1) === 0 ? "Laki-laki" : "Perempuan";
  }
  fake() {
    const nama = this.an();
    const slug = nama.toLowerCase() + this.ai(1e3, 9999);
    const m = String(this.ai(1, 12)).padStart(2, "0");
    const d = String(this.ai(1, 28)).padStart(2, "0");
    return {
      full_name: nama,
      email: slug + this.ai(10, 99) + "@" + this.ad(),
      wa_number: "08" + this.ai(1e8, 999999999),
      password: crypto.randomBytes(6).toString("hex"),
      gender: this.ag(),
      city: this.ak(),
      birthdate: this.ai(1990, 2004) + "-" + m + "-" + d,
      referral_code: ""
    };
  }
  async img(src) {
    let res, mime, b64;
    try {
      if (Buffer.isBuffer(src)) {
        this.log("img", "buffer → base64");
        b64 = src.toString("base64");
        return {
          type: "image_url",
          image_url: {
            url: "data:image/jpeg;base64," + b64
          }
        };
      }
      if (typeof src === "string" && src.startsWith("data:")) {
        this.log("img", "base64 string, as-is");
        return {
          type: "image_url",
          image_url: {
            url: src
          }
        };
      }
      if (typeof src === "string") {
        this.log("img", "url, fetching → " + src);
        res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        mime = res.headers["content-type"] || "image/jpeg";
        b64 = Buffer.from(res.data).toString("base64");
        this.log("img", "fetch ok, mime=" + mime);
        return {
          type: "image_url",
          image_url: {
            url: "data:" + mime + ";base64," + b64
          }
        };
      }
      this.log("img", "unknown type, skip");
      return null;
    } catch (e) {
      this.log("img", "error: " + e.message);
      throw e;
    }
  }
  log(tag, msg) {
    console.log("[" + new Date().toISOString() + "] [" + tag + "] " + msg);
  }
  async setLang(lang) {
    lang = lang || "id";
    this.log("setLang", "→ " + lang);
    let data;
    try {
      const res = await this.http.post("/api/set_language.php", {
        language: lang
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      data = res.data;
      this.log("setLang", data.success ? "ok" : "fail: " + JSON.stringify(data));
      return data;
    } catch (e) {
      this.log("setLang", "error: " + e.message);
      throw e;
    }
  }
  async reg(payload) {
    const user = Object.assign(this.fake(), payload || {});
    this.log("reg", "→ " + user.email);
    let data;
    try {
      const res = await this.http.post("/api/auth_ajax.php", Object.assign({
        action: "register"
      }, user), {
        headers: {
          "content-type": "application/json"
        }
      });
      data = res.data;
      this.log("reg", data.success ? "ok: " + data.message : "fail: " + data.error);
      return Object.assign({}, data, {
        _user: user
      });
    } catch (e) {
      this.log("reg", "error: " + e.message);
      throw e;
    }
  }
  async login(email, password) {
    this.log("login", "→ " + email);
    let data;
    try {
      const res = await this.http.post("/api/auth_ajax.php", {
        action: "login",
        email: email,
        password: password
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      data = res.data;
      this.log("login", data.success ? "ok" : "fail: " + data.error);
      return data;
    } catch (e) {
      this.log("login", "error: " + e.message);
      throw e;
    }
  }
  async credits() {
    this.log("credits", "checking…");
    let data;
    try {
      const res = await this.http.get("/api/ai_credit_check");
      data = res.data;
      this.log("credits", "ok → " + data.credits + " (" + data.type + ")");
      return data;
    } catch (e) {
      this.log("credits", "error: " + e.message);
      throw e;
    }
  }
  async sess() {
    this.log("sess", "fetching…");
    let data;
    try {
      const res = await this.http.get("/api/ai_chat_history", {
        params: {
          action: "sessions"
        }
      });
      data = res.data;
      this.log("sess", "ok → " + (data.sessions ? data.sessions.length : 0) + " sessions");
      return data;
    } catch (e) {
      this.log("sess", "error: " + e.message);
      throw e;
    }
  }
  async auth() {
    this.log("auth", "auto auth start…");
    let regData;
    try {
      await this.setLang();
      regData = await this.reg();
      if (!regData.success) {
        this.log("auth", "reg fail, abort");
        throw new Error(regData.error || "reg failed");
      }
      await this.login(regData._user.email, regData._user.password);
      this.log("auth", "auto auth done → " + regData._user.email);
      return regData._user;
    } catch (e) {
      this.log("auth", "error: " + e.message);
      throw e;
    }
  }
  async chat({
    prompt,
    messages,
    image,
    model_id,
    session_id,
    agent_id,
    ...rest
  }) {
    messages = messages || [];
    model_id = model_id || "7";
    session_id = session_id || null;
    agent_id = agent_id || null;
    if (!this.cookies["PHPSESSID"]) {
      this.log("chat", "no session, running auto auth…");
      try {
        await this.auth();
      } catch (e) {
        this.log("chat", "auto auth error: " + e.message);
        throw e;
      }
    }
    this.log("chat", "building…");
    const content = [];
    let resolved, imgs, src;
    for (const msg of messages) {
      this.log("chat", "push msg: " + (typeof msg === "string" ? msg.slice(0, 30) : msg.type));
      content.push(typeof msg === "string" ? {
        type: "text",
        text: msg
      } : msg);
    }
    if (prompt) {
      this.log("chat", "push prompt: " + prompt.slice(0, 40));
      content.push({
        type: "text",
        text: prompt
      });
    }
    imgs = image ? Array.isArray(image) ? image : [image] : [];
    for (src of imgs) {
      this.log("chat", "resolving img (" + typeof src + ")");
      try {
        resolved = await this.img(src);
        if (resolved) {
          content.push(resolved);
          this.log("chat", "img ok");
        }
      } catch (e) {
        this.log("chat", "img error: " + e.message);
        throw e;
      }
    }
    const body = Object.assign({
      messages: [{
        role: "user",
        content: content
      }],
      session_id: session_id,
      model_id: String(model_id),
      agent_id: agent_id
    }, rest);
    this.log("chat", "sending → model=" + body.model_id + ", blocks=" + content.length);
    let data;
    try {
      const res = await this.http.post("/api/ai_chat", body, {
        headers: {
          "content-type": "application/json"
        }
      });
      data = res.data;
      let result, info;
      if (typeof data === "string") {
        result = data.trim();
        info = {};
      } else if (data !== null && typeof data === "object") {
        result = data.reply || data.message || data.text || data.content || data.response || data.answer || data.output || "";
        info = data;
      } else {
        result = String(data);
        info = {};
      }
      this.log("chat", "ok → " + result.slice(0, 80));
      return Object.assign({
        result: result
      }, info);
    } catch (e) {
      this.log("chat", "error: " + (e.response ? e.response.status : "") + " " + e.message);
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
  const api = new SantriAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}