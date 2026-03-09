import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const wait = ms => new Promise(r => setTimeout(r, ms));
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const BASE = "https://nanana.app";
const MAIL = `https://${apiConfig.DOMAIN_URL}`;
const DEF = {
  "user-agent": UA,
  accept: "*/*",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=1, i",
  origin: BASE,
  referer: BASE + "/en",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin"
};
class NanoBanana {
  constructor() {
    this.cookie = "";
    this.fpId = null;
    this.token = null;
    this.credit = 0;
    this.user = null;
    this.session = null;
    this.ready = false;
    this.http = axios.create({
      baseURL: BASE
    });
    this.mhttp = axios.create({
      baseURL: MAIL
    });
  }
  sc(res) {
    try {
      const raw = [].concat(res?.headers?.["set-cookie"] || []);
      if (!raw.length) return;
      for (const c of raw) {
        const pair = c.split(";")[0].trim();
        if (!pair) continue;
        const key = pair.split("=")[0];
        const re = new RegExp(`(?:^|;\\s*)${key}=[^;]*`, "g");
        this.cookie = this.cookie.replace(re, "").replace(/^;\s*/, "").trim();
        this.cookie = this.cookie ? `${this.cookie}; ${pair}` : pair;
      }
    } catch (e) {
      console.warn("[sc]", e.message);
    }
  }
  hd(x = {}) {
    return {
      ...DEF,
      ...this.cookie ? {
        cookie: this.cookie
      } : {},
      ...x
    };
  }
  hf(x = {}) {
    return this.hd({
      "x-fp-id": this.fpId || "",
      ...x
    });
  }
  xport() {
    try {
      return Buffer.from(JSON.stringify({
        cookie: this.cookie,
        fpId: this.fpId,
        token: this.token,
        credit: this.credit,
        user: this.user,
        session: this.session
      })).toString("base64");
    } catch (e) {
      console.error("[xport]", e.message);
      throw e;
    }
  }
  async iport(b64) {
    try {
      const s = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      this.cookie = s.cookie ?? "";
      this.fpId = s.fpId ?? null;
      this.token = s.token ?? null;
      this.credit = s.credit ?? 0;
      this.user = s.user ?? null;
      this.session = s.session ?? null;
      if (!this.token) return false;
      const exp = this.session?.expiresAt ? new Date(this.session.expiresAt) : null;
      if (!exp || exp <= new Date()) {
        console.log("[iport] expired");
        return false;
      }
      try {
        await this.gses();
        await this.gcredit();
      } catch (e) {
        console.warn("[iport]", e.message);
        return false;
      }
      if (this.credit <= 0) {
        console.log("[iport] no credit");
        return false;
      }
      this.ready = true;
      console.log("[iport] reused | user:", this.user?.email, "| credit:", this.credit);
      return true;
    } catch (e) {
      console.error("[iport]", e.message);
      return false;
    }
  }
  async gfp() {
    try {
      if (this.fpId) return this.fpId;
      const id = "fp-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      const sig = crypto.createHmac("sha256", "GOAT").update(id).digest("hex");
      this.fpId = Buffer.from(`${id}.${sig}`).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return this.fpId;
    } catch (e) {
      console.error("[fp]", e.message);
      throw e;
    }
  }
  async mkm() {
    try {
      console.log("[mail] creating...");
      const {
        data
      } = await this.mhttp.get("/api/mails/v9?action=create");
      console.log("[mail]", data.email);
      return data.email;
    } catch (e) {
      console.error("[mail]", e.message);
      throw e;
    }
  }
  async otp(email, n = 60, ms = 3e3) {
    try {
      console.log("[otp] polling...");
      for (let i = 0; i < n; i++) {
        await wait(ms);
        try {
          const {
            data
          } = await this.mhttp.get(`/api/mails/v9?action=message&email=${email}`);
          const m = (data?.data?.[0]?.text_content || "").match(/\b(\d{6})\b/);
          if (m) {
            console.log("[otp]", m[1]);
            return m[1];
          }
        } catch (e) {
          console.warn(`[otp] ${i + 1}/${n}`, e.message);
        }
        console.log(`[otp] ${i + 1}/${n}...`);
      }
      throw new Error("OTP timeout");
    } catch (e) {
      console.error("[otp]", e.message);
      throw e;
    }
  }
  async login() {
    try {
      await this.gfp();
      const email = await this.mkm();
      console.log("[auth] send otp...");
      try {
        const res = await this.http.post("/api/auth/email-otp/send-verification-otp", {
          email: email,
          type: "sign-in"
        }, {
          headers: this.hd({
            "content-type": "application/json"
          })
        });
        this.sc(res);
      } catch (e) {
        console.error("[auth] send otp failed", e?.response?.data || e.message);
        throw e;
      }
      const code = await this.otp(email);
      console.log("[auth] sign in...");
      let signinData;
      try {
        const res = await this.http.post("/api/auth/sign-in/email-otp", {
          email: email,
          otp: code
        }, {
          headers: this.hd({
            "content-type": "application/json"
          })
        });
        this.sc(res);
        signinData = res.data;
      } catch (e) {
        console.error("[auth] sign in failed", e?.response?.data || e.message);
        throw e;
      }
      this.token = signinData?.token;
      console.log("[auth] ok, token:", this.token);
      await this.gses();
      return signinData;
    } catch (e) {
      console.error("[auth]", e?.response?.data || e.message);
      throw e;
    }
  }
  async gses() {
    try {
      console.log("[session] get session...");
      const res = await this.http.get("/api/auth/get-session", {
        headers: this.hd()
      });
      this.sc(res);
      this.user = res.data?.user ?? null;
      this.session = res.data?.session ?? null;
      console.log("[session] user:", this.user?.email, "| expires:", this.session?.expiresAt);
      return res.data;
    } catch (e) {
      console.error("[session]", e?.response?.data || e.message);
      throw e;
    }
  }
  async gcredit() {
    try {
      console.log("[credit] checking...");
      const res = await this.http.get("/api/credits", {
        headers: this.hf()
      });
      this.sc(res);
      this.credit = res.data?.balance ?? 0;
      console.log("[credit] balance:", this.credit, "| hasLoggedIn:", res.data?.hasLoggedIn);
      return this.credit;
    } catch (e) {
      console.error("[credit]", e?.response?.data || e.message);
      throw e;
    }
  }
  async chkc() {
    try {
      await this.gcredit();
      if (this.credit <= 0) {
        console.log("[credit] empty, re-login new account...");
        this.cookie = "";
        this.fpId = null;
        this.token = null;
        this.user = null;
        this.session = null;
        this.ready = false;
        await this.login();
        await this.gcredit();
        if (this.credit <= 0) throw new Error("No credits after re-login");
      }
      return this.credit;
    } catch (e) {
      console.error("[chkc]", e.message);
      throw e;
    }
  }
  async init(b64 = null) {
    try {
      if (this.ready) return this;
      console.log("[init] starting...");
      if (b64) {
        const ok = await this.iport(b64);
        if (ok) return this;
      }
      await this.gfp();
      await this.login();
      await this.gcredit();
      if (this.credit <= 0) throw new Error("No credits available");
      this.ready = true;
      console.log("[init] ready | user:", this.user?.email, "| credit:", this.credit);
      return this;
    } catch (e) {
      console.error("[init]", e.message);
      throw e;
    }
  }
  async rimg(img) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (/^https?:\/\//.test(img)) {
          console.log("[img] fetch url...");
          try {
            const res = await this.http.get(img, {
              responseType: "arraybuffer",
              baseURL: ""
            });
            return Buffer.from(res.data);
          } catch (e) {
            console.error("[img] fetch failed", e.message);
            throw e;
          }
        }
        return Buffer.from(img.replace(/^data:[^;]+;base64,/, ""), "base64");
      }
      throw new Error("Unknown image type");
    } catch (e) {
      console.error("[rimg]", e.message);
      throw e;
    }
  }
  async upl(img) {
    try {
      console.log("[upload] uploading...");
      const buf = await this.rimg(img);
      const fd = new FormData();
      fd.append("image", buf, {
        filename: `img_${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const res = await this.http.post("/api/upload-img", fd, {
        headers: this.hf({
          ...fd.getHeaders()
        })
      });
      this.sc(res);
      console.log("[upload]", res.data?.url);
      return res.data?.url;
    } catch (e) {
      console.error("[upload]", e?.response?.data || e.message);
      throw e;
    }
  }
  async poll(rid, type, max = 60, ms = 3e3) {
    try {
      console.log(`[poll] ${type} ${rid}`);
      for (let i = 0; i < max; i++) {
        await wait(ms);
        try {
          const res = await this.http.post("/api/get-result", {
            requestId: rid,
            type: type
          }, {
            headers: this.hf({
              "content-type": "application/json"
            })
          });
          this.sc(res);
          console.log(`[poll] ${i + 1}/${max} status:`, res.data?.status);
          if (res.data?.completed || res.data?.status === 3) {
            console.log("[poll] done");
            return res.data;
          }
          if (res.data?.status === 4) throw new Error("Task failed");
        } catch (e) {
          if (e.message === "Task failed") throw e;
          console.warn("[poll] retry:", e.message);
        }
      }
      throw new Error("Poll timeout");
    } catch (e) {
      console.error("[poll]", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image,
    state = null,
    ...rest
  }) {
    try {
      await this.init(state);
      await this.chkc();
      const i2i = !!image;
      const ep = i2i ? "/api/image-to-image" : "/api/text-to-image";
      const type = i2i ? "image-to-image" : "text-to-image";
      console.log(`[chat] ${type} | credit: ${this.credit} | ${(prompt || "").slice(0, 60)}`);
      const body = {
        prompt: prompt || "",
        ...rest
      };
      if (i2i) {
        try {
          const imgs = Array.isArray(image) ? image : [image];
          const urls = [];
          for (const img of imgs) urls.push(await this.upl(img));
          body.image_urls = urls;
        } catch (e) {
          console.error("[chat] upload failed", e.message);
          throw e;
        }
      }
      let rid;
      try {
        console.log("[chat] submit...");
        const res = await this.http.post(ep, body, {
          headers: this.hf({
            "content-type": "application/json"
          })
        });
        this.sc(res);
        rid = res.data?.request_id;
        if (!rid) throw new Error("No request_id: " + JSON.stringify(res.data));
        console.log("[chat] request_id:", rid);
      } catch (e) {
        console.error("[chat] submit failed", e?.response?.data || e.message);
        throw e;
      }
      const res = await this.poll(rid, type);
      const images = res?.data?.images || res?.data;
      console.log("[chat] images:", images);
      return {
        id: rid,
        images: images,
        state: this.xport()
      };
    } catch (e) {
      console.error("[chat]", e?.response?.data || e.message);
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