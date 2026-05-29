import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const BASE = "https://lefi-m.base44.app";
const AID = "69d957b1d1de59180c2bc0d5";
const MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const SEC = {
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin"
};
class LefiAI {
  constructor() {
    this.ck = {};
    this.tok = null;
    this.mail = null;
    this.ip = null;
    this.http = this._mkHttp();
  }
  _uid() {
    return crypto.randomUUID();
  }
  _pw() {
    return "Ax" + crypto.randomBytes(6).toString("hex") + "@1";
  }
  _parseCk(str) {
    try {
      const [kv] = str.split(";");
      const idx = kv.indexOf("=");
      return {
        name: kv.slice(0, idx).trim(),
        value: kv.slice(idx + 1).trim()
      };
    } catch (e) {
      console.error("[parseCk] gagal:", e.message);
      return {
        name: null,
        value: null
      };
    }
  }
  _sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
  _mkHttp() {
    try {
      const inst = axios.create();
      const self = this;
      inst.interceptors.request.use(function(cfg) {
        try {
          const pairs = [];
          const keys = Object.keys(self.ck);
          for (let i = 0; i < keys.length; i++) {
            pairs.push(keys[i] + "=" + self.ck[keys[i]]);
          }
          const jar = pairs.join("; ");
          if (jar) cfg.headers["cookie"] = jar;
        } catch (e) {
          console.error("[http:req] inject cookie gagal:", e.message);
        }
        return cfg;
      });
      inst.interceptors.response.use(function(res) {
        try {
          const list = [].concat(res.headers?.["set-cookie"] ?? []);
          for (let i = 0; i < list.length; i++) {
            const parsed = self._parseCk(list[i]);
            if (parsed.name) self.ck[parsed.name] = parsed.value;
          }
        } catch (e) {
          console.error("[http:res] parse cookie gagal:", e.message);
        }
        return res;
      }, function(err) {
        try {
          const list = [].concat(err.response?.headers?.["set-cookie"] ?? []);
          for (let i = 0; i < list.length; i++) {
            const parsed = self._parseCk(list[i]);
            if (parsed.name) self.ck[parsed.name] = parsed.value;
          }
        } catch (e) {
          console.error("[http:err] parse cookie gagal:", e.message);
        }
        return Promise.reject(err);
      });
      return inst;
    } catch (e) {
      console.error("[http] init gagal:", e.message);
      throw e;
    }
  }
  _h(ex) {
    try {
      const base = {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "user-agent": UA,
        "x-app-id": AID,
        "x-origin-url": BASE + "/",
        referer: BASE + "/",
        "x-request-id": this._uid()
      };
      if (this.tok) base["authorization"] = "Bearer " + this.tok;
      const keys = Object.keys(SEC);
      for (let i = 0; i < keys.length; i++) base[keys[i]] = SEC[keys[i]];
      if (ex) {
        const exKeys = Object.keys(ex);
        for (let i = 0; i < exKeys.length; i++) base[exKeys[i]] = ex[exKeys[i]];
      }
      return base;
    } catch (e) {
      console.error("[_h] gagal:", e.message);
      throw e;
    }
  }
  enc() {
    try {
      const raw = {
        tok: this.tok,
        mail: this.mail,
        ip: this.ip,
        ck: this.ck
      };
      const b64 = Buffer.from(JSON.stringify(raw)).toString("base64");
      console.log("[enc] state ok");
      return b64;
    } catch (e) {
      console.error("[enc] gagal:", e.message);
      throw e;
    }
  }
  async dec(state) {
    try {
      console.log("[dec] load state...");
      const raw = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
      this.tok = raw?.tok ?? null;
      this.mail = raw?.mail ?? null;
      this.ip = raw?.ip ?? null;
      this.ck = raw?.ck ?? {};
      console.log("[dec] ok — mail:", this.mail, "| ip:", this.ip, "| ck:", Object.keys(this.ck).length);
    } catch (e) {
      console.error("[dec] gagal parse, reset state:", e.message);
      this.tok = null;
      this.mail = null;
      this.ip = null;
      this.ck = {};
    }
  }
  async getIp() {
    try {
      console.log("[ip] fetch...");
      const res = await this.http.post(BASE + "/api/apps/" + AID + "/functions/getClientIp", {}, {
        headers: this._h({
          "content-type": "application/json",
          "base44-functions-version": "prod"
        })
      });
      this.ip = res.data?.ip ?? "0.0.0.0";
      console.log("[ip] ok:", this.ip);
    } catch (e) {
      console.error("[ip] gagal:", e?.response?.data ?? e.message);
      this.ip = "0.0.0.0";
    }
  }
  async mkMail() {
    try {
      console.log("[mail] buat email...");
      const res = await this.http.get(MAIL + "?action=create");
      console.log("[mail] ok:", res.data?.email);
      return res.data?.email;
    } catch (e) {
      console.error("[mail] gagal:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async getOtp(email, tries, ms) {
    if (tries === undefined) tries = 20;
    if (ms === undefined) ms = 3e3;
    console.log("[otp] tunggu untuk:", email);
    for (let i = 0; i < tries; i++) {
      try {
        await this._sleep(ms);
        const res = await this.http.get(MAIL + "?action=message&email=" + encodeURIComponent(email));
        const msgs = res.data?.data ?? [];
        for (let j = 0; j < msgs.length; j++) {
          const txt = msgs[j]?.text_content ?? "";
          const lines = txt.split(/\r?\n/);
          for (let k = 0; k < lines.length; k++) {
            const line = lines[k].trim();
            if (/^\d{4,8}$/.test(line)) {
              console.log("[otp] ketemu (line):", line);
              return line;
            }
          }
          const m2 = txt.match(/(?:code|kode)[^\d]{0,10}(\d{4,8})/i) ?? txt.match(/\n\s*\n\s*(\d{4,8})\s*\n/);
          if (m2?.[1]) {
            console.log("[otp] ketemu (regex):", m2[1]);
            return m2[1];
          }
        }
        console.log("[otp] belum ada, coba " + (i + 1) + "/" + tries + "...");
      } catch (e) {
        console.error("[otp] error coba " + (i + 1) + "/" + tries + ":", e.message);
      }
    }
    throw new Error("OTP timeout");
  }
  async reg(email, password) {
    try {
      console.log("[reg] daftar:", email);
      const lh = BASE + "/login?from_url=" + encodeURIComponent(BASE + "/");
      const res = await this.http.post(BASE + "/api/apps/" + AID + "/auth/register", {
        email: email,
        password: password
      }, {
        headers: this._h({
          "content-type": "application/json",
          "x-origin-url": lh,
          referer: lh
        })
      });
      console.log("[reg] ok:", res.data?.message ?? res.data);
      return res.data;
    } catch (e) {
      console.error("[reg] gagal:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async verif(email, otp_code) {
    try {
      console.log("[verif] otp:", otp_code);
      const lh = BASE + "/login?from_url=" + encodeURIComponent(BASE + "/");
      const res = await this.http.post(BASE + "/api/apps/" + AID + "/auth/verify-otp", {
        email: email,
        otp_code: otp_code
      }, {
        headers: this._h({
          "content-type": "application/json",
          "x-origin-url": lh,
          referer: lh
        })
      });
      this.tok = res.data?.access_token ?? res.data?.token ?? res.data?.data?.access_token;
      console.log("[verif] token:", !!this.tok);
      return res.data;
    } catch (e) {
      console.error("[verif] gagal:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async login() {
    try {
      console.log("[login] mulai...");
      const email = await this.mkMail();
      const password = this._pw();
      this.mail = email;
      await this.reg(email, password);
      const otp = await this.getOtp(email);
      await this.verif(email, otp);
      await this.getIp();
      console.log("[login] berhasil:", email);
      return {
        email: email,
        password: password,
        token: this.tok
      };
    } catch (e) {
      console.error("[login] gagal:", e.message);
      throw e;
    }
  }
  async upload(buf) {
    try {
      console.log("[upload] " + buf.length + " bytes...");
      const form = new FormData();
      form.append("file", buf, {
        filename: "img_" + Date.now() + ".jpg",
        contentType: "image/jpeg",
        knownLength: buf.length
      });
      const merged = this._h();
      const fh = form.getHeaders();
      const fkeys = Object.keys(fh);
      for (let i = 0; i < fkeys.length; i++) merged[fkeys[i]] = fh[fkeys[i]];
      const res = await this.http.post(BASE + "/api/apps/" + AID + "/integration-endpoints/Core/UploadFile", form, {
        headers: merged,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      const url = res.data?.url ?? res.data?.file_url ?? res.data?.data?.url;
      console.log("[upload] ok:", url);
      return url;
    } catch (e) {
      console.error("[upload] gagal:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async _resolveOne(img) {
    try {
      let buf;
      if (typeof img === "string" && /^https?:\/\//.test(img)) {
        console.log("[img] fetch url:", img);
        const res = await this.http.get(img, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res.data);
        console.log("[img] fetch ok:", buf.length, "bytes");
      } else if (Buffer.isBuffer(img)) {
        buf = img;
      } else {
        buf = Buffer.from(img.replace(/^data:[^;]+;base64,/, ""), "base64");
      }
      return await this.upload(buf);
    } catch (e) {
      console.error("[img:resolveOne] gagal:", e.message);
      throw e;
    }
  }
  async resolve(image) {
    try {
      if (!image) return [];
      const list = Array.isArray(image) ? image : [image];
      const urls = [];
      for (let i = 0; i < list.length; i++) {
        console.log("[img] resolve " + (i + 1) + "/" + list.length + "...");
        urls.push(await this._resolveOne(list[i]));
      }
      console.log("[img] selesai:", urls.length, "url");
      return urls;
    } catch (e) {
      console.error("[img:resolve] gagal:", e.message);
      throw e;
    }
  }
  async gen(prompt, imgUrls, rest) {
    if (!imgUrls) imgUrls = [];
    if (!rest) rest = {};
    try {
      const hasImg = imgUrls.length > 0;
      console.log("[gen] prompt:", prompt, "| imgs:", hasImg ? imgUrls.length : "-");
      const ref = hasImg ? BASE + "/EditImage" : BASE + "/";
      const body = Object.assign({
        prompt: prompt
      }, rest);
      if (hasImg) body.existing_image_urls = imgUrls;
      const res = await this.http.post(BASE + "/api/apps/" + AID + "/integration-endpoints/Core/GenerateImage", body, {
        headers: this._h({
          "content-type": "application/json",
          "x-origin-url": ref,
          referer: ref
        })
      });
      const url = res.data?.url ?? res.data?.image_url ?? res.data?.data?.url;
      console.log("[gen] url:", url);
      return url;
    } catch (e) {
      console.error("[gen] gagal:", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async save(imgUrl, prompt) {
    try {
      console.log("[save] simpan:", imgUrl);
      const res = await this.http.post(BASE + "/api/apps/" + AID + "/entities/GeneratedImage", {
        user_email: this.mail,
        image_url: imgUrl,
        prompt: prompt,
        generated_at: new Date().toISOString(),
        ip_address: this.ip ?? "0.0.0.0"
      }, {
        headers: this._h({
          "content-type": "application/json"
        })
      });
      console.log("[save] ok:", res.data?.id);
      return res.data;
    } catch (e) {
      console.error("[save] gagal (skip):", e?.response?.data ?? e.message);
      return null;
    }
  }
  async generate({
    prompt,
    image,
    state,
    ...rest
  }) {
    try {
      console.log("[run] mulai...");
      if (state) await this.dec(state);
      if (!this.tok) await this.login();
      const imgUrls = await this.resolve(image);
      const url = await this.gen(prompt, imgUrls, rest);
      if (!url) throw new Error("url kosong dari gen");
      const saved = await this.save(url, prompt);
      const newState = this.enc();
      console.log("[run] selesai:", url);
      return {
        result: url,
        state: newState,
        saved: saved?.id ?? null
      };
    } catch (e) {
      console.error("[run] gagal:", e.message);
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
  const api = new LefiAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}