import axios from "axios";
import {
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
const rnd = (n = 16) => randomBytes(n).toString("hex");
const rndUUID = () => {
  const h = randomBytes(16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${[ "8", "9", "a", "b" ][randomBytes(1)[0] % 4]}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const ok = (key, data) => ({
  success: true,
  key: key,
  ...data
});
const err = (key, e) => ({
  success: false,
  key: key,
  error: e?.message || String(e)
});
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";
const SEC_CH = '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"';
const LANG = "id,ms;q=0.9,en;q=0.8";
const H_BASE = {
  "User-Agent": UA,
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "accept-language": LANG,
  "sec-ch-ua": SEC_CH,
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  dnt: "1",
  origin: "https://modelhunter.ai",
  referer: "https://modelhunter.ai/"
};
const H_CORS = {
  ...H_BASE,
  "Content-Type": "application/json",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  priority: "u=1, i"
};
const H_NAV = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "sec-ch-ua": SEC_CH,
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  dnt: "1",
  "upgrade-insecure-requests": "1",
  "sec-fetch-site": "none",
  "sec-fetch-mode": "navigate",
  "sec-fetch-user": "?1",
  "sec-fetch-dest": "document",
  "accept-language": LANG,
  priority: "u=0, i"
};
const hApiKey = visitorId => ({
  ...H_CORS,
  "x-platform": "web",
  "x-utm": "utm_source=google&utm_medium=cpc&utm_campaign=s-model-banana-api&utm_term=nanobanana",
  "x-visitor-id": visitorId
});
const hAuth = key => ({
  "Content-Type": "application/json",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  priority: "u=1, i",
  "x-platform": "web",
  Authorization: `Bearer ${key}`
});
class ModelHunter {
  constructor() {
    this.cookies = {};
    this.key = null;
    this.visitorId = rndUUID();
    this.cfg = {
      base: "https://api.modelhunter.ai/api",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      providers: {
        gemini: {
          models: ["nano-banana-2"],
          t2i: "/v1/gemini/text-to-image",
          i2i: "/v1/gemini/image-to-image"
        },
        seedream: {
          models: ["seedream-5-0-lite", "seedream-4-5", "seedream-4-0", "seedream-3-0-t2i"],
          t2i: "/v1/seedream/text-to-image",
          i2i: "/v1/seedream/image-to-image"
        },
        vidu: {
          models: ["viduq3-pro", "viduq3-turbo"],
          t2v: "/v1/vidu/text-to-video",
          i2v: "/v1/vidu/image-to-video"
        },
        kling: {
          models: ["kling-v3", "kling-v2-6"],
          t2v: "/v1/kling/text-to-video",
          i2v: "/v1/kling/image-to-video"
        },
        seedance: {
          models: ["seedance-1-5-pro", "seedance-1-0-pro", "seedance-1-0-pro-fast", "seedance-1-0-lite-t2v", "seedance-1-0-lite-i2v"],
          t2v: "/v1/seedance/text-to-video",
          i2v: "/v1/seedance/image-to-video"
        }
      }
    };
    this.http = axios.create({
      baseURL: this.cfg.base
    });
    this.http.interceptors.response.use(res => {
      try {
        const sc = res.headers?.["set-cookie"];
        if (sc) {
          for (const c of sc) {
            try {
              const [kv] = c.split(";");
              const idx = kv.indexOf("=");
              if (idx > 0) this.cookies[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
            } catch (ce) {
              console.log("[COOKIE] parse err", ce?.message);
            }
          }
          console.log("[COOKIE] saved", Object.keys(this.cookies));
        }
      } catch (ie) {
        console.log("[COOKIE] interceptor err", ie?.message);
      }
      return res;
    }, e => Promise.reject(e));
  }
  _cookieStr() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  _h(preset) {
    const c = this._cookieStr();
    return c ? {
      ...preset,
      Cookie: c
    } : {
      ...preset
    };
  }
  _valModel(provider, model) {
    const p = this.cfg.providers[provider];
    if (!p) throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(this.cfg.providers).join(", ")}`);
    const m = model || p.models[0];
    if (!p.models.includes(m)) throw new Error(`Model "${m}" invalid for ${provider}. Available: ${p.models.join(", ")}`);
    return m;
  }
  async _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async _ensureKey() {
    if (this.key) return this.key;
    console.log("[ENSURE_KEY] no key, auto creating...");
    try {
      const res = await this.create_key();
      if (!res.success) throw new Error(res.error);
      this.key = res.key;
      console.log("[ENSURE_KEY] ready", this.key?.slice(0, 20) + "...");
      return this.key;
    } catch (e) {
      console.log("[ENSURE_KEY] failed", e?.message);
      throw e;
    }
  }
  async _uploadOne(raw, key) {
    try {
      if (!raw) return null;
      if (typeof raw === "string" && raw.startsWith("http") && !raw.startsWith("data:")) {
        console.log("[IMG] url as-is", raw.slice(0, 80));
        return raw;
      }
      let buf, mime, ext;
      try {
        if (Buffer.isBuffer(raw)) {
          buf = raw;
          mime = "image/jpeg";
          ext = "jpg";
        } else if (typeof raw === "string" && raw.startsWith("data:")) {
          const [header, b64] = raw.split(",");
          mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
          ext = mime.split("/")[1] || "jpg";
          buf = Buffer.from(b64, "base64");
        } else {
          buf = Buffer.from(raw, "base64");
          mime = "image/jpeg";
          ext = "jpg";
        }
      } catch (pe) {
        console.log("[IMG] buf parse err", pe?.message);
        throw pe;
      }
      const fname = `${rnd(8)}.${ext}`;
      console.log("[IMG] presigning...", {
        fname: fname,
        mime: mime,
        size: buf.length
      });
      let presignData;
      try {
        const {
          data
        } = await this.http.post("/v1/files/upload-url", {
          filename: fname,
          contentType: mime,
          sizeBytes: buf.length
        }, {
          headers: this._h(hAuth(key))
        });
        presignData = data?.data;
        console.log("[IMG] presign ok", presignData?.file_id);
      } catch (pe) {
        console.log("[IMG] presign failed", pe?.message);
        throw pe;
      }
      try {
        await axios.put(presignData?.upload_url, buf, {
          headers: {
            "Content-Type": mime,
            "Content-Length": buf.length
          }
        });
        console.log("[IMG] PUT ok");
      } catch (ue) {
        console.log("[IMG] PUT failed", ue?.message);
        throw ue;
      }
      try {
        const {
          data
        } = await this.http.post(`/v1/files/${presignData?.file_id}/complete`, null, {
          headers: this._h(hAuth(key))
        });
        const url = data?.data?.url;
        console.log("[IMG] complete ok", url);
        return url;
      } catch (ce) {
        console.log("[IMG] complete failed", ce?.message);
        throw ce;
      }
    } catch (e) {
      console.log("[IMG] uploadOne err", e?.message);
      throw e;
    }
  }
  async _resolveImgs(raw, key) {
    try {
      const list = Array.isArray(raw) ? raw : [raw];
      const urls = [];
      for (const item of list) {
        try {
          const url = await this._uploadOne(item, key);
          if (url) urls.push(url);
        } catch (ie) {
          console.log("[IMG] item failed", ie?.message);
          throw ie;
        }
      }
      console.log("[IMG] resolved", urls.length, "image(s)");
      return urls;
    } catch (e) {
      console.log("[IMG] resolveImgs err", e?.message);
      throw e;
    }
  }
  async _mkMail() {
    try {
      console.log("[MAIL] creating...");
      const {
        data
      } = await axios.get(`${this.cfg.mail}?action=create`);
      const email = data?.email;
      if (!email) throw new Error("No email from mail API");
      console.log("[MAIL] ok", email);
      return email;
    } catch (e) {
      console.log("[MAIL] failed", e?.message);
      throw e;
    }
  }
  async _waitOtp(email, timeout = 9e4) {
    try {
      console.log("[OTP] polling...", email);
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        await this._sleep(3e3);
        try {
          const {
            data
          } = await axios.get(`${this.cfg.mail}?action=message&email=${email}`);
          for (const m of data?.data || []) {
            const match = (m?.text_content || "").match(/https:\/\/api\.modelhunter\.ai\/api\/auth\/verify-email\?token=[^\s"<]+/);
            if (match) {
              console.log("[OTP] link found");
              return match[0];
            }
          }
          console.log("[OTP] no link yet...");
        } catch (pe) {
          console.log("[OTP] poll err (retry)", pe?.message);
        }
      }
      throw new Error("OTP timeout");
    } catch (e) {
      console.log("[OTP] err", e?.message);
      throw e;
    }
  }
  async _signup(email, name, pass) {
    try {
      console.log("[SIGNUP] registering...", email);
      await this.http.post("/auth/sign-up/email", {
        name: name,
        email: email,
        password: pass
      }, {
        headers: this._h(H_CORS)
      });
      console.log("[SIGNUP] done");
    } catch (e) {
      console.log("[SIGNUP] failed", e?.message);
      throw e;
    }
  }
  async _verify(link) {
    try {
      console.log("[VERIFY] following link...", link.slice(0, 80));
      const path = link.replace("https://api.modelhunter.ai/api", "");
      await this.http.get(path, {
        maxRedirects: 10,
        headers: this._h(H_NAV)
      });
      console.log("[VERIFY] done");
    } catch (e) {
      const st = e?.response?.status;
      if (st && st < 500) {
        console.log("[VERIFY] ended with status", st, "(ok)");
      } else {
        console.log("[VERIFY] failed", e?.message);
        throw e;
      }
    }
  }
  async _signin(email, pass) {
    try {
      console.log("[SIGNIN] signing in...");
      const {
        data
      } = await this.http.post("/auth/sign-in/email", {
        email: email,
        password: pass
      }, {
        headers: this._h(H_CORS)
      });
      console.log("[SIGNIN] done");
      return data;
    } catch (e) {
      console.log("[SIGNIN] failed", e?.message);
      throw e;
    }
  }
  async create_key({
    name,
    ...rest
  } = {}) {
    console.log("[CREATE_KEY] start");
    try {
      this.cookies = {};
      const email = await this._mkMail();
      const uname = name || rnd(10);
      const pass = rnd(18);
      await this._signup(email, uname, pass);
      const link = await this._waitOtp(email);
      await this._verify(link);
      await this._signin(email, pass);
      const keyName = rnd(8);
      console.log("[CREATE_KEY] posting key request...");
      let keyData;
      try {
        const {
          data
        } = await this.http.post("/v1/api-keys", {
          name: keyName
        }, {
          headers: this._h(hApiKey(this.visitorId))
        });
        keyData = data?.data;
      } catch (re) {
        console.log("[CREATE_KEY] api-key req failed", re?.response?.data || re?.message);
        throw re;
      }
      const keyVal = keyData?.key;
      this.key = keyVal;
      console.log("[CREATE_KEY] success", keyVal?.slice(0, 20) + "...");
      return ok(keyVal, {
        account: email,
        ...keyData
      });
    } catch (e) {
      console.log("[CREATE_KEY] error", e?.message);
      return err(null, e);
    }
  }
  async gen_image({
    key,
    provider = "gemini",
    model,
    prompt,
    image,
    ...rest
  } = {}) {
    console.log("[GEN_IMAGE] start", provider, model, prompt?.slice(0, 50));
    try {
      const k = key || await this._ensureKey();
      const m = this._valModel(provider, model);
      const p = this.cfg.providers[provider];
      const isI2I = !!image;
      const endpoint = isI2I ? p?.i2i : p?.t2i;
      if (!endpoint) throw new Error(`Provider "${provider}" has no ${isI2I ? "i2i" : "t2i"} endpoint`);
      let imgUrls = [];
      if (isI2I) {
        try {
          imgUrls = await this._resolveImgs(image, k);
        } catch (ie) {
          console.log("[GEN_IMAGE] img resolve failed", ie?.message);
          throw ie;
        }
      }
      let input = {};
      try {
        if (provider === "gemini") {
          input = isI2I ? {
            prompt: prompt,
            image_input: imgUrls,
            aspect_ratio: rest.aspect_ratio || "auto",
            resolution: rest.resolution || "1K",
            output_format: rest.output_format || "jpg",
            google_search: rest.google_search ?? true
          } : {
            prompt: prompt,
            aspect_ratio: rest.aspect_ratio || "auto",
            resolution: rest.resolution || "1K",
            output_format: rest.output_format || "jpg",
            google_search: rest.google_search ?? true
          };
        } else if (provider === "seedream") {
          input = isI2I ? {
            prompt: prompt,
            image: imgUrls[0],
            images: imgUrls,
            size: rest.size,
            width: rest.width,
            height: rest.height,
            output_format: rest.output_format || "jpg",
            web_search: rest.web_search ?? true
          } : {
            prompt: prompt,
            size: rest.size,
            width: rest.width,
            height: rest.height,
            output_format: rest.output_format || "jpg",
            web_search: rest.web_search ?? true
          };
        }
        Object.keys(input).forEach(k => input[k] === undefined && delete input[k]);
      } catch (be) {
        console.log("[GEN_IMAGE] build input err", be?.message);
        throw be;
      }
      console.log("[GEN_IMAGE] posting...", endpoint, m, isI2I);
      let task;
      try {
        const {
          data
        } = await this.http.post(endpoint, {
          model: m,
          input: input,
          webhookUrl: rest.webhookUrl || undefined,
          metadata: rest.metadata || {}
        }, {
          headers: this._h(hAuth(k))
        });
        task = data?.data;
        console.log("[GEN_IMAGE] task ok", task?.id, task?.status);
      } catch (re) {
        console.log("[GEN_IMAGE] req failed", re?.response?.data || re?.message);
        throw re;
      }
      return ok(k, {
        id: task?.id,
        provider: provider,
        model: m,
        task: task
      });
    } catch (e) {
      console.log("[GEN_IMAGE] error", e?.message);
      return err(key || this.key, e);
    }
  }
  async gen_video({
    key,
    provider = "vidu",
    model,
    prompt,
    image,
    ...rest
  } = {}) {
    console.log("[GEN_VIDEO] start", provider, model, prompt?.slice(0, 50));
    try {
      const k = key || await this._ensureKey();
      const m = this._valModel(provider, model);
      const p = this.cfg.providers[provider];
      const isI2V = !!image;
      const endpoint = isI2V ? p?.i2v : p?.t2v;
      if (!endpoint) throw new Error(`Provider "${provider}" has no ${isI2V ? "i2v" : "t2v"} endpoint`);
      let imgUrls = [];
      if (isI2V) {
        try {
          imgUrls = await this._resolveImgs(image, k);
        } catch (ie) {
          console.log("[GEN_VIDEO] img resolve failed", ie?.message);
          throw ie;
        }
      }
      let input = {};
      try {
        if (provider === "vidu") {
          input = isI2V ? {
            "input.image": imgUrls[0],
            "input.prompt": prompt,
            "input.duration": rest.duration || 5,
            "input.resolution": rest.resolution || "720p",
            "input.audio": rest.audio ?? false,
            "input.seed": rest.seed,
            "input.off_peak": rest.off_peak ?? false
          } : {
            "input.prompt": prompt,
            "input.duration": rest.duration || 5,
            "input.aspect_ratio": rest.aspect_ratio || "16:9",
            "input.resolution": rest.resolution || "720p",
            "input.style": rest.style,
            "input.audio": rest.audio ?? false,
            "input.seed": rest.seed,
            "input.off_peak": rest.off_peak ?? false
          };
        } else if (provider === "kling") {
          input = isI2V ? {
            image: imgUrls[0],
            image_tail: rest.image_tail,
            prompt: prompt,
            negative_prompt: rest.negative_prompt,
            duration: rest.duration || 5,
            aspect_ratio: rest.aspect_ratio || "16:9",
            mode: rest.mode || "std",
            sound: rest.sound
          } : {
            prompt: prompt,
            negative_prompt: rest.negative_prompt,
            duration: rest.duration || 5,
            aspect_ratio: rest.aspect_ratio || "16:9",
            mode: rest.mode || "std",
            sound: rest.sound
          };
        } else if (provider === "seedance") {
          input = isI2V ? {
            image: imgUrls[0],
            last_image: rest.last_image,
            reference_images: imgUrls.slice(1),
            prompt: prompt,
            duration: rest.duration || 5,
            resolution: rest.resolution || "720p",
            ratio: rest.ratio || "16:9",
            seed: rest.seed,
            camera_fixed: rest.camera_fixed,
            watermark: rest.watermark,
            generate_audio: rest.generate_audio ?? true,
            return_last_frame: rest.return_last_frame
          } : {
            prompt: prompt,
            duration: rest.duration || 5,
            resolution: rest.resolution || "720p",
            ratio: rest.ratio || "16:9",
            seed: rest.seed,
            camera_fixed: rest.camera_fixed,
            watermark: rest.watermark,
            generate_audio: rest.generate_audio ?? true,
            draft: rest.draft,
            service_tier: rest.service_tier
          };
        }
        Object.keys(input).forEach(k => input[k] === undefined && delete input[k]);
      } catch (be) {
        console.log("[GEN_VIDEO] build input err", be?.message);
        throw be;
      }
      console.log("[GEN_VIDEO] posting...", endpoint, m, isI2V);
      let task;
      try {
        const {
          data
        } = await this.http.post(endpoint, {
          model: m,
          input: input,
          webhookUrl: rest.webhookUrl || undefined,
          metadata: rest.metadata || {}
        }, {
          headers: this._h(hAuth(k))
        });
        task = data?.data;
        console.log("[GEN_VIDEO] task ok", task?.id, task?.status);
      } catch (re) {
        console.log("[GEN_VIDEO] req failed", re?.response?.data || re?.message);
        throw re;
      }
      return ok(k, {
        id: task?.id,
        provider: provider,
        model: m,
        task: task
      });
    } catch (e) {
      console.log("[GEN_VIDEO] error", e?.message);
      return err(key || this.key, e);
    }
  }
  async get_status({
    key,
    id,
    ...rest
  } = {}) {
    console.log("[STATUS] checking", id);
    try {
      const k = key || await this._ensureKey();
      if (!id) throw new Error("id required");
      let task;
      try {
        const {
          "Content-Type": _,
          ...hGet
        } = hAuth(k);
        const {
          data
        } = await this.http.get(`/v1/tasks/${id}`, {
          headers: this._h(hGet)
        });
        task = data?.data;
      } catch (re) {
        console.log("[STATUS] req failed", re?.response?.data || re?.message);
        throw re;
      }
      console.log("[STATUS]", task?.status, id, task?.type);
      return ok(k, {
        id: id,
        status: task?.status,
        result: task?.result || null,
        task: task
      });
    } catch (e) {
      console.log("[STATUS] error", e?.message);
      return err(key || this.key, e);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "image", "video", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=image&prompt=isekai"
      }
    });
  }
  const api = new ModelHunter();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create_key(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await api.gen_image(params);
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'video'."
          });
        }
        response = await api.gen_video(params);
        break;
      case "status":
        if (!params.key || !params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'key' dan 'id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.get_status(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}