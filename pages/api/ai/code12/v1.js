import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
const BASE = "https://api.code12.cloud/";
const TOK_URL = "https://api.code12.cloud/app/paygate-oauth/token";
const AID = "VTN_588";
const SKEY = "IVQii1UhAGT9yClHiMR3yvrHQGPcAHmdszImEl";
const L = (t, ...a) => console.log(`[${t}]`, ...a);
const MODES = ["anime", "fusion", "tryon", "hf"];
const DEFS = {
  stylesMode: "anime",
  anime: {
    animeCode: "anime_futuristic_space_style|||VTN_588"
  },
  fusion: {
    code: "PIRATE_KING"
  },
  tryon: {
    code: "EMERALD_NIGHT"
  }
};
const EP = {
  anime: "app/v2/anime-character/style",
  fusion: "app/v2/fusion/merge",
  tryon: "app/v2/try-on/model",
  hf: "app/v2/hugging-face/try-on"
};
const LEP = {
  anime: "app/v2/anime-character/style",
  fusion: "app/v2/fusion/actor",
  tryon: "app/v2/try-on/models"
};
const VALID_ACTIONS = ["styles", "generate"];
class Code12 {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE
    });
    this._tok = null;
  }
  uid() {
    try {
      const h = crypto.randomBytes(16);
      h[6] = h[6] & 15 | 64;
      h[8] = h[8] & 63 | 128;
      const x = h.toString("hex");
      const id = `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
      L("uid", id);
      return id;
    } catch (e) {
      L("uid", "err:", e.message);
      throw e;
    }
  }
  chkM(mode) {
    try {
      if (!MODES.includes(mode)) throw new Error(`unknown mode "${mode}". valid: ${MODES.join(" | ")}`);
      L("chkM", mode);
      return mode;
    } catch (e) {
      L("chkM", "err:", e.message);
      throw e;
    }
  }
  hdr(tok) {
    try {
      return {
        "Content-Type": "application/json",
        "X-APP-ID": AID,
        Authorization: `Bearer ${tok}`
      };
    } catch (e) {
      L("hdr", "err:", e.message);
      throw e;
    }
  }
  enc(s) {
    try {
      const b = Buffer.from(JSON.stringify(s)).toString("base64");
      L("enc", "ok");
      return b;
    } catch (e) {
      L("enc", "err:", e.message);
      throw e;
    }
  }
  dec(b) {
    try {
      const s = JSON.parse(Buffer.from(b, "base64").toString());
      L("dec", "ok · expire:", s?.expire);
      return s;
    } catch (e) {
      L("dec", "err:", e.message);
      return null;
    }
  }
  async solv(item) {
    try {
      if (Buffer.isBuffer(item)) {
        L("solv", "buffer · bytes:", item.length);
        return item;
      }
      if (typeof item !== "string") throw new Error("unsupported media type");
      if (/^data:[^;]+;base64,/.test(item)) {
        L("solv", "dataURI");
        return Buffer.from(item.split(",")[1], "base64");
      }
      if (/^https?:\/\//.test(item)) {
        L("solv", "url fetch:", item);
        const r = await axios.get(item, {
          responseType: "arraybuffer"
        });
        L("solv", "fetched · bytes:", r.data.byteLength);
        return Buffer.from(r.data);
      }
      L("solv", "plain base64");
      return Buffer.from(item, "base64");
    } catch (e) {
      L("solv", "err:", e.message);
      throw e;
    }
  }
  async getT(state) {
    try {
      if (state && !this._tok) {
        const s = this.dec(state);
        if (s?.token && Date.now() < s?.expire) {
          L("getT", "restored · expire:", new Date(s.expire).toISOString());
          this._tok = s;
        }
      }
      if (this._tok?.token && Date.now() < this._tok.expire - 1e4) {
        L("getT", "reuse · expire:", new Date(this._tok.expire).toISOString());
        return this._tok.token;
      }
      L("getT", "fetching...");
      const res = await axios.post(TOK_URL, {
        appId: AID,
        secretKey: SKEY
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-APP-ID": AID,
          Authorization: ""
        }
      });
      const d = res.data?.data;
      if (!d?.token) throw new Error("no token in response");
      this._tok = {
        token: d.token,
        expire: d.tokenExpire || Date.now() + 36e5
      };
      L("getT", "ok · expire:", new Date(this._tok.expire).toISOString());
      return this._tok.token;
    } catch (e) {
      L("getT", "err:", e?.response?.data || e.message);
      throw e;
    }
  }
  async bFd(mode, params, uuid) {
    try {
      L("bFd", `mode:${mode}`);
      const fd = new FormData();
      if (mode === "anime") {
        const buf = await this.solv(params.image || params.file);
        fd.append("file", buf, {
          filename: params.fileName || `img_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
        fd.append("animeCode", params.animeCode || params.style || DEFS.anime.animeCode);
        if (params.attachmentFile) {
          const abuf = await this.solv(params.attachmentFile);
          fd.append("attachmentFile", abuf, {
            filename: `att_${Date.now()}.jpg`,
            contentType: "image/jpeg"
          });
        }
      }
      if (mode === "fusion") {
        const buf = await this.solv(params.image || params.file);
        fd.append("code", params.code || params.actorCode || DEFS.fusion.code);
        fd.append("file", buf, {
          filename: params.fileName || `img_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
      }
      if (mode === "tryon") {
        const buf = await this.solv(params.image || params.file);
        fd.append("file", buf, {
          filename: params.fileName || `img_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
        fd.append("templateCode", params.templateCode || params.template || DEFS.tryon.code);
      }
      if (mode === "hf") {
        fd.append("code", params.code || "");
        fd.append("context", params.context || "");
        const f1 = await this.solv(params.image || params.fileFirst || params.file);
        fd.append("fileFirst", f1, {
          filename: `f1_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
        if (params.fileSecond) {
          const f2 = await this.solv(params.fileSecond);
          fd.append("fileSecond", f2, {
            filename: `f2_${Date.now()}.jpg`,
            contentType: "image/jpeg"
          });
        }
      }
      fd.append("uuid", uuid);
      L("bFd", "built ok");
      return fd;
    } catch (e) {
      L("bFd", "err:", e.message);
      throw e;
    }
  }
  async pst(mode, fd, tok) {
    try {
      const path = EP[mode];
      L("pst", `POST ${path}`);
      const res = await this.ax.post(path, fd, {
        headers: {
          ...this.hdr(tok),
          ...fd.getHeaders(),
          "Content-Type": "multipart/form-data"
        }
      });
      const d = res.data;
      if (!d) throw new Error("empty response");
      L("pst", "ok · keys:", Object.keys(d).join(", "));
      return d;
    } catch (e) {
      L("pst", "err:", e?.response?.data || e.message);
      throw e;
    }
  }
  async styles({
    state,
    mode = DEFS.stylesMode
  } = {}) {
    L("styles", "start · mode:", mode);
    try {
      this.chkM(mode);
      const path = LEP[mode];
      if (!path) throw new Error(`no list endpoint for mode "${mode}"`);
      const tok = await this.getT(state);
      const params = mode === "anime" ? {
        page: 0,
        size: 200
      } : undefined;
      L("styles", `GET ${path}`);
      const res = await this.ax.get(path, {
        headers: this.hdr(tok),
        params: params
      });
      const d = res.data?.data || res.data;
      L("styles", "ok · items:", Array.isArray(d) ? d.length : "?");
      return d;
    } catch (e) {
      L("styles", "err:", e?.response?.data || e.message);
      throw e;
    }
  }
  async generate({
    state,
    mode = DEFS.stylesMode,
    image,
    ...rest
  }) {
    L("gen", "start · mode:", mode);
    try {
      this.chkM(mode);
      const tok = await this.getT(state);
      const uuid = this.uid();
      const fd = await this.bFd(mode, {
        image: image,
        ...rest
      }, uuid);
      const result = await this.pst(mode, fd, tok);
      const nState = this.enc(this._tok);
      L("gen", "done");
      return {
        ...result,
        state: nState
      };
    } catch (e) {
      L("gen", "err:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: VALID_ACTIONS
    });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: VALID_ACTIONS
    });
  }
  const api = new Code12();
  try {
    let response;
    switch (action) {
      case "styles": {
        response = await api.styles(params);
        break;
      }
      case "generate": {
        if (!params.image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: VALID_ACTIONS
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server Code12. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL] action '${action}':`, error);
    return res.status(500).json({
      status: false,
      action: action,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}