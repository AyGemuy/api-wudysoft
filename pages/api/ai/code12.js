import axios from "axios";
import FormData from "form-data";
const DEFS = {
  anime: "anime_futuristic_space_style|||VTN_588",
  fusion: "PIRATE_KING",
  tryon: "EMERALD_NIGHT",
  hf: "HF_DEFAULT_CODE",
  ghibli: "ghibli_spirited_away_style"
};
class Code12 {
  constructor() {
    this.baseURL = "https://api.code12.cloud/";
    this.credentials = {
      primary: {
        appId: "VTN_588",
        secretKey: "IVQii1UhAGT9yClHiMR3yvrHQGPcAHmdszImEl"
      },
      fallback: {
        appId: "CODE12_515_02",
        secretKey: "29BB2947BC9C6FD9F361B5CC34E54"
      }
    };
    this.activeAppId = this.credentials.primary.appId;
    this.token = null;
    this.ghibliStore = {
      themes: [],
      options: []
    };
    this.commonHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json, text/plain, */*"
    };
    this.availableModes = {
      anime: {
        description: "Mengubah foto karakter menjadi style anime/manga.",
        required: ["mode", "image"],
        optional: ["code", "attach", "attachmentFile", "uuid"],
        defaultCode: DEFS.anime
      },
      fusion: {
        description: "Melakukan face-swap atau penggabungan aktor/karakter template.",
        required: ["mode", "image"],
        optional: ["code", "uuid"],
        defaultCode: DEFS.fusion
      },
      tryon: {
        description: "Simulasi fitting pakaian/baju virtual ke model manusia.",
        required: ["mode", "image"],
        optional: ["code", "templateCode", "uuid"],
        defaultCode: DEFS.tryon
      },
      hf: {
        description: "Hugging Face Virtual Try-On tingkat lanjut (Multi-image cloth swap).",
        required: ["mode", "image"],
        optional: ["code", "context", "fileSecond", "attach", "uuid"],
        defaultCode: DEFS.hf
      },
      ghibli: {
        description: "Mengubah gambar menjadi aset bergaya ilustrasi Studio Ghibli.",
        required: ["mode", "image"],
        optional: ["code", "model", "ghibliType", "uuid"],
        defaultCode: DEFS.ghibli
      }
    };
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 6e4,
      headers: {
        ...this.commonHeaders,
        "X-APP-ID": this.activeAppId
      }
    });
    this.http.interceptors.request.use(async config => {
      if (config.url.includes("paygate-oauth/token")) return config;
      if (!this.token) await this.refresh();
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
        config.headers["X-APP-ID"] = this.activeAppId;
      }
      return config;
    });
    this.http.interceptors.response.use(res => {
      if (res.data?.status?.code === "405" || res.data?.status?.label === "ERROR_CORE_TOKEN_EXPIRED") {
        return Promise.reject({
          config: res.config,
          response: res
        });
      }
      return res;
    }, async err => {
      const req = err.config;
      const statusCode = err.response?.status || err.response?.data?.status?.code;
      const label = err.response?.data?.status?.label;
      if ((statusCode === 401 || statusCode === "405" || label === "ERROR_CORE_TOKEN_EXPIRED") && !req._retry) {
        req._retry = true;
        if (await this.refresh()) {
          req.headers.Authorization = `Bearer ${this.token}`;
          req.headers["X-APP-ID"] = this.activeAppId;
          return this.http(req);
        }
      }
      return Promise.reject(err);
    });
  }
  _set(passedToken) {
    if (passedToken) {
      this.token = passedToken;
      if (this.activeAppId !== this.credentials.fallback.appId && this.activeAppId !== this.credentials.primary.appId) {
        this.activeAppId = this.credentials.primary.appId;
      }
    }
  }
  _wrap(data) {
    return data && typeof data === "object" ? {
      ...data,
      token: this.token
    } : {
      result: data,
      token: this.token
    };
  }
  async refresh() {
    try {
      const res = await axios.post(`${this.baseURL}app/paygate-oauth/token`, {
        appId: this.credentials.primary.appId,
        secretKey: this.credentials.primary.secretKey
      }, {
        headers: {
          ...this.commonHeaders,
          "X-APP-ID": this.credentials.primary.appId,
          "Content-Type": "application/json"
        }
      });
      if (res.data?.data?.token) {
        this.token = res.data.data.token;
        this.activeAppId = this.credentials.primary.appId;
        return true;
      }
    } catch (err) {}
    try {
      const res = await axios.post(`${this.baseURL}app/paygate-oauth/token`, {
        appId: this.credentials.fallback.appId,
        secretKey: this.credentials.fallback.secretKey
      }, {
        headers: {
          ...this.commonHeaders,
          "X-APP-ID": this.credentials.fallback.appId,
          "Content-Type": "application/json"
        }
      });
      if (res.data?.data?.token) {
        this.token = res.data.data.token;
        this.activeAppId = this.credentials.fallback.appId;
        return true;
      }
    } catch (err) {}
    return false;
  }
  async _solve(input) {
    try {
      if (!input) return null;
      if (typeof input === "string") {
        if (input.startsWith("data:") || /^[a-zA-Z0-9+/]+={0,2}$/.test(input.replace(/[\s\r\n]+/g, ""))) {
          const b64 = input.startsWith("data:") ? input.split(",")[1] : input;
          return Buffer.from(b64, "base64");
        }
        if (input.startsWith("http://") || input.startsWith("https://")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          return Buffer.from(res.data);
        }
      }
      if (input instanceof Buffer) return input;
      if (input instanceof ArrayBuffer) return Buffer.from(input);
      if (input instanceof Blob) return Buffer.from(await input.arrayBuffer());
    } catch (err) {}
    return {
      success: false,
      error: "Format input tidak valid"
    };
  }
  async _load(type) {
    try {
      const headers = {
        ...this.commonHeaders,
        "X-APP-ID": this.activeAppId,
        Authorization: `Bearer ${this.token}`
      };
      if (type === "theme") {
        const res = await axios.get(`${this.baseURL}app/v2/ghibli/themes?languageCode=en`, {
          headers: headers
        });
        this.ghibliStore.themes = res.data?.data || [];
        return res.data;
      } else if (type === "option") {
        const res = await axios.get(`${this.baseURL}app/v2/ghibli/options?languageCode=en&parentId=0`, {
          headers: headers
        });
        const flat = arr => arr.reduce((acc, cur) => acc.concat(cur, cur.featureChild ? flat(cur.featureChild) : []), []);
        this.ghibliStore.options = flat(res.data?.data || []);
        return res.data;
      }
    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }
  _find(type, input) {
    const list = type === "theme" ? this.ghibliStore.themes : this.ghibliStore.options;
    if (!list.length) return {
      valid: false,
      msg: "Data kosong."
    };
    const k = String(input || DEFS.ghibli).toLowerCase();
    let item = list.find(x => String(x.studioId).toLowerCase() === k || String(x.featureId).toLowerCase() === k || x.code && x.code.toLowerCase() === k || (x.name || x.featureName || "").toLowerCase().includes(k));
    if (item) return {
      valid: true,
      item: item
    };
    const candidates = type === "option" ? list.filter(x => x.attribute) : list;
    return {
      valid: true,
      item: candidates[Math.floor(Math.random() * candidates.length)]
    };
  }
  async models({
    token,
    mode,
    page = 0,
    size = 200,
    ghibliType = "theme"
  }) {
    try {
      this._set(token);
      const m = mode?.toLowerCase().replace("-", "");
      if (m === "ghibli") return this._wrap(await this._load(ghibliType === "option" ? "option" : "theme"));
      let path = m === "anime" ? "app/v2/anime-character/style" : m === "fusion" ? "app/v2/fusion/actor" : m === "tryon" ? "app/v2/try-on/models" : null;
      if (!path) return this._wrap({
        success: false,
        error: "Mode tidak valid atau tidak mendukung list model."
      });
      const res = await this.http.get(path, {
        params: m === "fusion" ? {} : {
          page: page,
          size: size
        }
      });
      return this._wrap(res.data);
    } catch (err) {
      return this._wrap({
        success: false,
        error: err.response?.data || err.message
      });
    }
  }
  async generate({
    token,
    mode,
    image,
    code,
    ...rest
  }) {
    try {
      if (!mode || !image) return this._wrap({
        success: false,
        error: "Parameter 'mode' dan 'image' wajib diisi."
      });
      this._set(token);
      const m = mode.toLowerCase().replace("-", "");
      const form = new FormData();
      const targetCode = code || rest.code;
      const uid = rest.uuid || "uid-" + Math.random().toString(36).substring(2, 15);
      const fileBuffer = await this._solve(image);
      if (!fileBuffer || fileBuffer.success === false) return this._wrap({
        success: false,
        error: fileBuffer?.error || "Gagal memproses gambar."
      });
      switch (m) {
        case "anime": {
          form.append("file", fileBuffer, {
            filename: "main.jpg",
            contentType: "image/jpeg"
          });
          form.append("animeCode", targetCode || DEFS.anime);
          form.append("uuid", uid);
          if (rest.attach || rest.attachmentFile) {
            const att = await this._solve(rest.attach || rest.attachmentFile);
            if (att && att.success !== false) form.append("attachmentFile", att, {
              filename: "attach.jpg",
              contentType: "image/jpeg"
            });
          }
          Object.keys(rest).forEach(k => {
            if (!["code", "attach", "attachmentFile", "uuid"].includes(k)) form.append(k, rest[k]);
          });
          const res = await this.http.post("app/v2/anime-character/style", form, {
            headers: form.getHeaders()
          });
          return this._wrap(res.data);
        }
        case "fusion": {
          form.append("code", targetCode || DEFS.fusion);
          form.append("file", fileBuffer, {
            filename: "main.jpg",
            contentType: "image/jpeg"
          });
          form.append("uuid", uid);
          Object.keys(rest).forEach(k => {
            if (!["code", "uuid"].includes(k)) form.append(k, rest[k]);
          });
          const res = await this.http.post("app/v2/fusion/merge", form, {
            headers: form.getHeaders()
          });
          return this._wrap(res.data);
        }
        case "tryon": {
          form.append("file", fileBuffer, {
            filename: "main.jpg",
            contentType: "image/jpeg"
          });
          form.append("templateCode", targetCode || DEFS.tryon);
          form.append("uuid", uid);
          Object.keys(rest).forEach(k => {
            if (!["code", "uuid"].includes(k)) form.append(k, rest[k]);
          });
          const res = await this.http.post("app/v2/try-on/model", form, {
            headers: form.getHeaders()
          });
          return this._wrap(res.data);
        }
        case "hf": {
          form.append("code", targetCode || DEFS.hf);
          form.append("context", rest.context || "default_context");
          form.append("fileFirst", fileBuffer, {
            filename: "f1.jpg",
            contentType: "image/jpeg"
          });
          form.append("uuid", uid);
          if (rest.fileSecond || rest.attach) {
            const f2 = await this._solve(rest.fileSecond || rest.attach);
            if (f2 && f2.success !== false) form.append("fileSecond", f2, {
              filename: "f2.jpg",
              contentType: "image/jpeg"
            });
          }
          Object.keys(rest).forEach(k => {
            if (!["code", "context", "fileFirst", "fileSecond", "attach", "uuid"].includes(k)) form.append(k, rest[k]);
          });
          const res = await this.http.post("app/v2/hugging-face/try-on", form, {
            headers: form.getHeaders()
          });
          return this._wrap(res.data);
        }
        case "ghibli": {
          const gt = rest.ghibliType === "option" ? "option" : "theme";
          await this._load(gt);
          const match = this._find(gt, targetCode || rest.model);
          if (!match.valid) return this._wrap({
            success: false,
            error: match.msg
          });
          let url = "";
          if (gt === "theme") {
            url = "app/v2/ghibli/user-image/edit-theme";
            form.append("studio", match.item.code, {
              contentType: "text/plain"
            });
          } else {
            url = "app/v2/ai-tool/user-image/edit-option";
            const attr = typeof match.item.attribute === "string" ? match.item.attribute : JSON.stringify(match.item.attribute || {});
            form.append("feature", attr, {
              contentType: "text/plain"
            });
          }
          form.append("file", fileBuffer, {
            filename: "main.jpg",
            contentType: "image/jpeg"
          });
          const res = await this.http.post(url, form, {
            params: {
              uuid: uid
            },
            headers: form.getHeaders()
          });
          return this._wrap(res.data);
        }
        default:
          return this._wrap({
            success: false,
            error: "Mode tidak dikenali."
          });
      }
    } catch (err) {
      return this._wrap({
        success: false,
        error: err.response?.data || err.message
      });
    }
  }
}
const validActions = ["credits", "models", "generate"];
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new Code12();
  if (action === "generate") {
    const normalizedMode = params.mode?.toLowerCase().replace("-", "");
    const allowedModes = Object.keys(api.availableModes);
    if (!params.mode || !allowedModes.includes(normalizedMode)) {
      return res.status(400).json({
        status: false,
        error: `Parameter 'mode' tidak valid atau kosong. Mode yang tersedia: ${allowedModes.join(", ")}`,
        available_modes: api.availableModes
      });
    }
    if (!params.image) {
      return res.status(400).json({
        status: false,
        error: `Parameter 'image' (URL / Base64) wajib disertakan untuk mode '${params.mode}'.`,
        mode_schema: api.availableModes[normalizedMode]
      });
    }
  }
  try {
    let response;
    switch (action) {
      case "credits":
        response = {
          success: true,
          message: "Mekanisme sisa kuota terikat pada token kredensial aktif.",
          available_modes: api.availableModes
        };
        break;
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
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
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      action: action,
      message: "Terjadi kesalahan internal pada server atau cloud API gateway.",
      error: error.message || "Unknown Error"
    });
  }
}