import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import {
  Transform
} from "stream";
import apiConfig from "@/configs/apiConfig";
class PixaClient {
  constructor() {
    this._email = null;
    this._pass = null;
    this._token = null;
    this._base = "https://api.pixa-ai.work";
    this._mail = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this._auth_promise = null;
    this._conv_promise = null;
    this._axios = null;
    this._headers = {
      "User-Agent": "Agnes-Android",
      "Accept-Encoding": "gzip",
      "x-user-language": "id",
      "x-app-version": "2.1.8",
      "x-app-model": "RMX3890",
      "x-app-timezone": "Asia/Makassar",
      "x-client-time-ms": Date.now().toString(),
      "x-platform": "3"
    };
    this._axios = axios.create({
      baseURL: this._base,
      transformResponse: [data => {
        try {
          return this._parseJSON(data);
        } catch (e) {
          return data;
        }
      }]
    });
    this._allModels = null;
    this._allModes = null;
    this._capCache = {};
    this._accessCache = {};
    this._modelsByMode = {};
  }
  _log(tag, ...args) {
    console.log(`[pixa:${tag}]`, ...args);
  }
  _err(tag, ...args) {
    console.error(`[pixa:${tag}][ERR]`, ...args);
  }
  _parseJSON(str) {
    if (typeof str !== "string") return str;
    try {
      const fixed = str.replace(/(?<=[\[:,])\s*(\d{15,})\s*(?=[,\}\]])/g, '"$1"');
      return JSON.parse(fixed);
    } catch (e) {
      return JSON.parse(str);
    }
  }
  _applyHeaders(config) {
    config.headers = {
      ...this._headers,
      ...config.headers
    };
    if (this._token) {
      config.headers.Authorization = `Bearer ${this._token}`;
    }
    return config;
  }
  async _req(cfg) {
    const method = (cfg.method || "GET").toUpperCase();
    const url = cfg.url || "";
    this._log("req", method, url);
    try {
      const res = await this._axios(this._applyHeaders({
        ...cfg
      }));
      this._log("req", "OK", method, url, "→", res.status);
      return res.data;
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.message ?? e.message;
      this._err("req", method, url, status ?? "", msg);
      throw e;
    }
  }
  _enc_state() {
    return Buffer.from(JSON.stringify({
      email: this._email,
      pass: this._pass
    })).toString("base64");
  }
  _dec_state(b64) {
    try {
      return this._parseJSON(Buffer.from(b64, "base64").toString("utf8"));
    } catch {
      return null;
    }
  }
  _load_state(state) {
    if (!state) return;
    const s = this._dec_state(state);
    if (!s) return;
    if (s.email && !this._email) this._email = s.email;
    if (s.pass && !this._pass) this._pass = s.pass;
    this._log("state", "loaded email:", this._email);
  }
  async _mail_create() {
    this._log("mail", "creating temp email...");
    const r = await axios.get(`${this._mail}?action=create`);
    return r.data?.email;
  }
  async _mail_otp(email, timeout = 9e4, interval = 4e3) {
    this._log("mail", "polling OTP for:", email);
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        const r = await axios.get(`${this._mail}?action=message&email=${encodeURIComponent(email)}`);
        const msgs = r.data?.data ?? [];
        for (const m of msgs) {
          const text = m.text_content ?? "";
          const match = text.match(/\b(\d{6})\b/);
          if (match) return match[1];
        }
      } catch (e) {
        this._err("mail", "poll error:", e.message);
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("[pixa:mail] OTP timeout");
  }
  _detect_mime(filename) {
    const name = String(filename || "");
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".pdf": "application/pdf",
      ".txt": "text/plain"
    };
    return mimeMap[ext] || "application/octet-stream";
  }
  _basename(p) {
    const s = String(p || "");
    const parts = s.split("/").pop();
    return parts || s;
  }
  async upload({
    state = null,
    image,
    filename = "image.jpg",
    mime = "image/jpeg",
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const pre = await this._req({
        method: "POST",
        url: "/api/v1/file/presigned-url",
        data: {
          content_type: mime,
          expires_sec: null,
          filename: filename,
          purpose: "chat_attachment",
          ...rest
        }
      });
      const {
        upload_url,
        public_url,
        required_headers = {},
        method: putMethod = "PUT"
      } = pre?.data ?? {};
      let body;
      if (Buffer.isBuffer(image)) {
        body = image;
      } else if (typeof image === "string" && /^data:/.test(image)) {
        const b64 = image.split(",")[1] ?? "";
        body = Buffer.from(b64, "base64");
      } else if (typeof image === "string" && /^https?:\/\//.test(image)) {
        const dl = await axios({
          url: image,
          responseType: "arraybuffer"
        });
        body = Buffer.from(dl.data);
      } else if (typeof image === "string") {
        body = Buffer.from(image, "base64");
      } else {
        body = image;
      }
      await axios({
        method: putMethod,
        url: upload_url,
        data: body,
        headers: {
          "Content-Type": mime,
          ...required_headers
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      this._log("upload", "OK →", public_url);
      return {
        status: "ok",
        result: {
          public_url: public_url
        },
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async _upload_media(data, filename = "media.jpg", mime = "image/jpeg") {
    const upload_result = await this.upload({
      state: this._enc_state(),
      image: data,
      filename: filename,
      mime: mime
    });
    if (upload_result.status !== "ok") {
      throw new Error(upload_result.result.error || "Upload failed");
    }
    return upload_result.result.public_url;
  }
  async _prepare_image(img) {
    if (!img) return null;
    if (typeof img === "object" && !Buffer.isBuffer(img) && img.url) {
      const url = img.url;
      if (typeof url === "string" && (url.startsWith("http") || url.startsWith("data:"))) {
        return {
          url: url
        };
      }
      const filename = img.filename || "image.jpg";
      const mime = img.mime_type || this._detect_mime(filename) || "image/jpeg";
      const public_url = await this._upload_media(url, filename, mime);
      return {
        url: public_url
      };
    }
    if (Buffer.isBuffer(img)) {
      const public_url = await this._upload_media(img, "image.jpg", "image/jpeg");
      return {
        url: public_url
      };
    }
    if (typeof img === "string") {
      if (img.startsWith("http") || img.startsWith("data:")) {
        return {
          url: img
        };
      }
      const filename = "image.jpg";
      const mime = this._detect_mime(filename);
      const public_url = await this._upload_media(img, filename, mime);
      return {
        url: public_url
      };
    }
    const public_url = await this._upload_media(String(img), "image.jpg", "image/jpeg");
    return {
      url: public_url
    };
  }
  async _prepare_files(files) {
    if (!files || !Array.isArray(files)) return [];
    const prepared = [];
    for (const f of files) {
      const item = {
        ...f
      };
      const mime = item.mime_type || item.mime || this._detect_mime(item.filename || item.url || "") || "image/jpeg";
      const filename = item.filename || this._basename(item.url || "") || "file";
      if (!item.url) {
        this._log("files", "skip: no url/data");
        continue;
      }
      if (typeof item.url === "string" && item.url.startsWith("http")) {
        prepared.push({
          mime_type: mime,
          url: item.url,
          filename: item.filename || ""
        });
        continue;
      }
      if (typeof item.url === "string" && item.url.startsWith("data:")) {
        const public_url = await this._upload_media(item.url, filename, mime);
        prepared.push({
          mime_type: mime,
          url: public_url,
          filename: item.filename || ""
        });
        continue;
      }
      if (Buffer.isBuffer(item.url) || typeof item.url === "string") {
        const public_url = await this._upload_media(item.url, filename, mime);
        prepared.push({
          mime_type: mime,
          url: public_url,
          filename: item.filename || ""
        });
        continue;
      }
    }
    return prepared;
  }
  async _prepare_images_array(images) {
    const prepared = [];
    for (const img of images ?? []) {
      const result = await this._prepare_image(img);
      if (result) prepared.push(result);
    }
    return prepared;
  }
  async _send_code(email) {
    this._log("auth", "sending OTP to:", email);
    return this._req({
      method: "POST",
      url: "/api/v1/user/code/send",
      data: {
        email: email,
        scene: "register"
      }
    });
  }
  async _register(email, pass, otp) {
    this._log("auth", "registering email:", email);
    const r = await this._req({
      method: "POST",
      url: "/api/v1/user/register",
      data: {
        register_by_email: {
          email: email,
          password: pass,
          verification_code: otp
        }
      }
    });
    this._token = r?.data?.access_token ?? this._token;
    return r;
  }
  async _login(email, pass) {
    this._log("auth", "logging in:", email);
    const r = await this._req({
      method: "POST",
      url: "/api/v1/user/login",
      data: {
        email_password: {
          email: email,
          password: pass
        }
      }
    });
    this._token = r?.data?.access_token ?? this._token;
    return r;
  }
  async _refresh_token() {
    this._log("auth", "refreshing token...");
    if (!this._token) throw new Error("No token to refresh");
    const r = await this._req({
      method: "POST",
      url: "/api/v1/user/refresh-token"
    });
    this._token = r?.data?.access_token ?? this._token;
    this._log("auth", "token refreshed OK");
    return true;
  }
  async _ensure_auth(state) {
    if (this._auth_promise) {
      this._log("auth", "waiting for existing auth...");
      await this._auth_promise;
      return;
    }
    this._auth_promise = this._do_ensure_auth(state);
    try {
      await this._auth_promise;
    } finally {
      this._auth_promise = null;
    }
  }
  async _do_ensure_auth(state) {
    this._log("auth", "ensuring auth state...");
    this._load_state(state ?? null);
    if (this._token) {
      this._log("auth", "using existing token");
      return;
    }
    if (this._email && this._pass) {
      await this._login(this._email, this._pass);
      return;
    }
    this._log("auth", "no credentials, auto-register...");
    const email = await this._mail_create();
    const pass = crypto.randomBytes(8).toString("hex") + "Ax1!";
    this._email = email;
    this._pass = pass;
    await this._send_code(email);
    const otp = await this._mail_otp(email);
    await this._register(email, pass, otp);
    this._log("auth", "auto-register complete ✓");
  }
  async conv({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      if (!this._conv_promise) {
        this._conv_promise = this._doConv(rest);
      } else {
        this._log("conv", "Waiting for active conversation request...");
      }
      const r = await this._conv_promise;
      this._conv_promise = null;
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      this._conv_promise = null;
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async _doConv(rest, retry = 0) {
    try {
      this._log("conv", "creating conversation...");
      return await this._req({
        method: "POST",
        url: "/api/v1/chat/conversation",
        ...rest
      });
    } catch (e) {
      if (e.response?.status === 409 && retry < 3) {
        this._log("conv", `409 duplicate, retry ${retry + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1e3 * (retry + 1)));
        return this._doConv(rest, retry + 1);
      }
      throw e;
    }
  }
  async _getModels() {
    if (this._allModels) return this._allModels;
    const r = await this.models({
      state: this._enc_state()
    });
    if (r.status === "ok") {
      this._allModels = r.result?.models || [];
      return this._allModels;
    }
    throw new Error("Failed to fetch models");
  }
  async _getModes() {
    if (this._allModes) return this._allModes;
    const r = await this.modes({
      state: this._enc_state()
    });
    if (r.status === "ok") {
      this._allModes = r.result?.modes || [];
      return this._allModes;
    }
    throw new Error("Failed to fetch modes");
  }
  async _getCapability(modelCode) {
    if (this._capCache[modelCode]) return this._capCache[modelCode];
    const r = await this.capability({
      state: this._enc_state(),
      model_code: modelCode
    });
    if (r.status === "ok") {
      const cap = r.result?.model?.capability;
      if (cap) {
        this._capCache[modelCode] = cap;
        return cap;
      }
    }
    throw new Error(`Capability not found for ${modelCode}`);
  }
  async _checkAccess(modelCodes) {
    const key = JSON.stringify([...modelCodes].sort());
    if (this._accessCache[key]) return this._accessCache[key];
    const r = await this.access({
      state: this._enc_state(),
      model_codes: modelCodes
    });
    if (r.status === "ok") {
      const items = r.result?.items || [];
      const map = {};
      for (const it of items) map[it.model_code] = it;
      this._accessCache[key] = map;
      return map;
    }
    throw new Error("Failed to check access");
  }
  async _getModelsForMode(modeCode) {
    if (this._modelsByMode[modeCode]) return this._modelsByMode[modeCode];
    const r = await this.mode_support({
      state: this._enc_state(),
      mode_code: modeCode
    });
    if (r.status === "ok") {
      const models = r.result?.models || [];
      this._modelsByMode[modeCode] = models;
      return models;
    }
    return [];
  }
  async _selectBestModel(modeCode, preferred = null) {
    const models = await this._getModelsForMode(modeCode);
    if (!models.length) {
      if (modeCode === "design" || modeCode === "short_drama") {
        return preferred || "agnes-image";
      }
      throw new Error(`No models for mode ${modeCode}`);
    }
    if (preferred && models.some(m => (m.code || m.model_code) === preferred)) {
      const access = await this._checkAccess([preferred]);
      if (access[preferred]?.allowed !== false) {
        return preferred;
      }
    }
    let best = null,
      bestLevel = Infinity;
    for (const m of models) {
      const code = m.code || m.model_code;
      const level = m.subscription_level || 0;
      const access = await this._checkAccess([code]);
      if (access[code]?.allowed === false) continue;
      if (level < bestLevel) {
        bestLevel = level;
        best = code;
      }
    }
    if (best) return best;
    throw new Error("No accessible model found");
  }
  _adjustParams(params, cap) {
    const p = {
      ...params
    };
    const modes = cap.mode_types || [];
    if (p.mode && !modes.includes(p.mode)) {
      if (cap.type === "image") {
        p.mode = p.images && p.images.length ? "image_to_image" : "text_to_image";
      } else if (cap.type === "video") {
        p.mode = p.images && p.images.length ? "1st_frame_to_video" : "text_to_video";
      } else {
        p.mode = modes[0] || "text_to_image";
      }
    }
    const ratios = cap.aspect_ratios || [];
    if (p.ratio && p.ratio !== "auto" && !ratios.includes(p.ratio)) {
      p.ratio = ratios[0] || "1:1";
    } else if (!p.ratio || p.ratio === "auto") {
      p.ratio = ratios[0] || "1:1";
    }
    const res = cap.resolutions || [];
    if (p.resolution && p.resolution !== "auto" && !res.includes(p.resolution)) {
      p.resolution = res[0] || "sd";
    } else if (!p.resolution || p.resolution === "auto") {
      p.resolution = res[0] || "sd";
    }
    if (cap.type === "video") {
      const dur = cap.supported_duration_seconds || [];
      if (dur.length) {
        let d = parseInt(p.duration);
        if (isNaN(d) || !dur.includes(d)) p.duration = dur[0];
      } else {
        const min = cap.min_duration_seconds || 5,
          max = cap.max_duration_seconds || 15;
        let d = parseInt(p.duration) || min;
        if (d < min) d = min;
        if (d > max) d = max;
        p.duration = d;
      }
    }
    if (cap.type === "image") {
      const maxB = cap.max_batch_images || 1;
      let c = parseInt(p.count) || 1;
      if (c < 1) c = 1;
      if (c > maxB) c = maxB;
      p.count = c;
    }
    return p;
  }
  async _buildPayload({
    prompt,
    images,
    model,
    ratio,
    count,
    resolution,
    duration,
    sound,
    files,
    mode,
    rest
  }) {
    const prepared_images = await this._prepare_images_array(images);
    let prepared_files = [];
    if (files && files.length) {
      prepared_files = await this._prepare_files(files);
    }
    let finalMode = mode;
    if (!finalMode) {
      const hasImages = prepared_images.length > 0;
      const isVideo = !!(duration || sound || model && model.includes("video"));
      if (hasImages && isVideo) finalMode = "1st_frame_to_video";
      else if (hasImages && !isVideo) finalMode = "image_to_image";
      else if (!hasImages && isVideo) finalMode = "text_to_video";
      else finalMode = "text_to_image";
    }
    let mediaType;
    switch (finalMode) {
      case "text_to_image":
      case "image_to_image":
        mediaType = "image";
        break;
      case "text_to_video":
      case "ref_image_to_video":
      case "1st_frame_to_video":
      case "frames_to_video":
        mediaType = "video";
        break;
      default:
        mediaType = "image";
    }
    let finalModel = model;
    if (!finalModel || finalModel === "auto") {
      try {
        finalModel = await this._selectBestModel(finalMode, model);
      } catch (e) {
        this._log("build", "fallback to default model:", e.message);
        finalModel = mediaType === "video" ? "agnes-video" : "agnes-image";
      }
    }
    let cap = null;
    try {
      cap = await this._getCapability(finalModel);
    } catch (e) {
      this._log("build", "capability not found, using defaults");
    }
    const params = {
      mode: finalMode,
      ratio: ratio || "auto",
      resolution: resolution || "auto",
      duration: duration || "auto",
      count: count || "auto",
      images: prepared_images
    };
    if (cap) {
      const adj = this._adjustParams(params, cap);
      params.mode = adj.mode;
      params.ratio = adj.ratio;
      params.resolution = adj.resolution;
      if (mediaType === "video") {
        params.duration = adj.duration;
      } else {
        params.count = adj.count;
      }
    }
    let conv_id = rest.conversation_id;
    if (!conv_id) {
      const c = await this.conv({
        state: this._enc_state()
      });
      conv_id = c?.result?.conversation_id;
    }
    const payload = {
      conversation_id: conv_id,
      prompt: prompt || "",
      mode: finalMode,
      media_type: mediaType,
      model: finalModel,
      images: prepared_images,
      ratio: params.ratio,
      resolution: params.resolution,
      ...mediaType === "video" ? {
        duration: params.duration,
        sound: sound || false
      } : {
        count: params.count
      },
      ...prepared_files.length ? {
        files: prepared_files
      } : {},
      ...rest
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return payload;
  }
  _parseStream(readableStream) {
    return new Promise((resolve, reject) => {
      const events = [];
      let buffer = "";
      let currentEvent = null;
      let resolved = false;
      let timeout = null;
      const sseTransform = new Transform({
        objectMode: true,
        transform: (chunk, encoding, callback) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith("event: ")) {
              currentEvent = trimmed.slice(7).trim();
            } else if (trimmed.startsWith("data: ")) {
              const raw = trimmed.slice(6).trim();
              if (raw) {
                try {
                  const data = this._parseJSON(raw);
                  if (data.type !== "Heartbeat") {
                    sseTransform.push({
                      event: currentEvent,
                      data: data
                    });
                  }
                } catch (e) {}
              }
            }
          }
          callback();
        },
        flush(callback) {
          callback();
        }
      });
      sseTransform.on("data", event => {
        events.push(event);
        console.log("[pixa:stream] event:", event.event, JSON.stringify(event.data).slice(0, 100));
      });
      sseTransform.on("end", () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        resolve(this._processEvents(events));
      });
      sseTransform.on("error", err => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      });
      readableStream.pipe(sseTransform);
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn("[pixa:stream] timeout, resolving with partial events");
          resolve(this._processEvents(events));
        }
      }, 3e5);
    });
  }
  _processEvents(events) {
    let message = "";
    let generation = null;
    let gen_start = null;
    let premedita = null;
    let model_config = null;
    let quota = null;
    let token_usage = null;
    const tool_results = [];
    const results = [];
    for (const ev of events) {
      const {
        event,
        data
      } = ev;
      switch (event) {
        case "MessageDelta":
          if (data?.data?.content !== undefined) message += data.data.content;
          break;
        case "GenerationSuccess":
          generation = data?.data ?? null;
          if (generation?.results) results.push(...generation.results);
          break;
        case "GenerationStart":
          gen_start = data ?? null;
          break;
        case "PixaPreMeditaParamsStart":
          premedita = data ?? null;
          break;
        case "PixaModelConfigDone":
          model_config = data ?? null;
          break;
        case "QuotaTryDeduct":
          quota = data ?? null;
          break;
        case "TokenUsage":
          token_usage = data ?? null;
          break;
        case "ToolCallResult":
          tool_results.push(data);
          break;
        default:
          break;
      }
    }
    return {
      message: message,
      generation: generation,
      gen_start: gen_start,
      premedita: premedita,
      model_config: model_config,
      quota: quota,
      token_usage: token_usage,
      tool_results: tool_results,
      results: results
    };
  }
  async profile({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/user/profile",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async sendCode({
    email,
    scene = "register",
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "POST",
        url: "/api/v1/user/code/send",
        data: {
          email: email,
          scene: scene,
          ...rest
        }
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async register({
    email,
    password,
    verification_code,
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "POST",
        url: "/api/v1/user/register",
        data: {
          register_by_email: {
            email: email,
            password: password,
            verification_code: verification_code,
            ...rest
          }
        }
      });
      if (r?.data?.access_token) this._token = r.data.access_token;
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async login({
    email,
    password,
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "POST",
        url: "/api/v1/user/login",
        data: {
          email_password: {
            email: email,
            password: password,
            ...rest
          }
        }
      });
      if (r?.data?.access_token) this._token = r.data.access_token;
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async refreshToken({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "POST",
        url: "/api/v1/user/refresh-token",
        ...rest
      });
      if (r?.data?.access_token) this._token = r.data.access_token;
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async auth({
    state = null
  } = {}) {
    try {
      await this._ensure_auth(state);
      return {
        status: "ok",
        result: {
          email: this._email
        },
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async credits({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v2/subscription/credits-balance",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async user_sig({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/im/user-sig",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async models({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/pixa/models",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async modes({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/pixa/support_modes",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async capability({
    state = null,
    model_code,
    ...rest
  } = {}) {
    try {
      if (!model_code) return {
        status: "error",
        result: {
          error: "model_code required"
        },
        state: this._enc_state()
      };
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: `/api/v1/pixa/model_capability?model_code=${model_code}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async mode_support({
    state = null,
    mode_code,
    ...rest
  } = {}) {
    try {
      if (!mode_code) return {
        status: "error",
        result: {
          error: "mode_code required"
        },
        state: this._enc_state()
      };
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: `/api/v1/pixa/mode_support_models?mode_code=${mode_code}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async access({
    state = null,
    model_codes = [],
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "POST",
        url: "/api/v1/pixa/models_access",
        data: {
          model_codes: model_codes,
          ...rest
        }
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async features({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/pixa/support_features",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async resume({
    state = null,
    conversation_id,
    ...rest
  } = {}) {
    try {
      if (!conversation_id) {
        return {
          status: "error",
          result: {
            error: "conversation_id required"
          },
          state: this._enc_state()
        };
      }
      await this._ensure_auth(state);
      const response = await this._axios(this._applyHeaders({
        method: "POST",
        url: "/api/v1/chat/stream/resume",
        data: {
          conversation_id: String(conversation_id),
          ...rest
        },
        responseType: "stream",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        }
      }));
      const result = await this._parseStream(response.data);
      return {
        status: "ok",
        result: {
          ...result,
          conversation_id: conversation_id
        },
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async projects({
    state = null,
    page = 1,
    page_size = 10,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: `/api/v1/chat/projects?page=${page}&page_size=${page_size}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async tmpl_cats({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/template/categories",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async tmpl_list({
    state = null,
    category = "trending",
    page = 1,
    page_size = 20,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: `/api/v1/template/list_by_category?category_code=${category}&page=${page}&page_size=${page_size}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async tmpl_generate({
    state = null,
    template,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      if (!template || !template.template_id) {
        return {
          status: "error",
          result: {
            error: "template object with template_id required"
          },
          state: this._enc_state()
        };
      }
      const prepared_input = [];
      for (const param of template.input_params || []) {
        const item = {
          ...param
        };
        if (item.type === "image" && item.url) {
          if (typeof item.url === "string" && !item.url.startsWith("http")) {
            const filename = this._basename(item.url) || "template.jpg";
            const mime = this._detect_mime(filename) || "image/jpeg";
            item.url = await this._upload_media(item.url, filename, mime);
            this._log("tmpl", "uploaded input param →", item.url);
          }
        }
        prepared_input.push(item);
      }
      const r = await this._req({
        method: "POST",
        url: "/api/v1/template/generate",
        data: {
          template_id: template.template_id,
          aigc_name: template.aigc_name || "",
          input_params: prepared_input,
          result_params: template.result_params || {},
          resolution: template.resolution || [],
          sort_order: template.sort_order || 100,
          plan_level: template.plan_level || 0,
          is_usable: template.is_usable ?? true,
          is_liked: template.is_liked ?? false,
          is_collected: template.is_collected ?? false,
          like_count: template.like_count || 0,
          collection_count: template.collection_count || 0,
          purchase_count: template.purchase_count || 0,
          usage_count: template.usage_count || 0,
          ...rest
        }
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async tmpl_upload({
    state = null,
    file,
    fileKind = "image",
    keyPrefix = "template",
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const form = new FormData();
      if (Buffer.isBuffer(file)) {
        form.append("file", file, {
          filename: "upload.jpg",
          contentType: "image/jpeg"
        });
      } else if (file && file.buffer) {
        form.append("file", file.buffer, {
          filename: file.name || "upload.jpg",
          contentType: file.mimetype || "image/jpeg"
        });
      } else {
        form.append("file", file, {
          filename: file?.name || "upload.jpg",
          contentType: file?.mimetype || "image/jpeg"
        });
      }
      form.append("file_kind", fileKind);
      form.append("key_prefix", keyPrefix);
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === "string" || typeof v === "number") form.append(k, String(v));
      }
      const r = await this._axios(this._applyHeaders({
        method: "POST",
        url: "/api/v1/template/upload",
        data: form,
        headers: {
          ...form.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }));
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async ugc_cats({
    state = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: "/api/v1/ugc/categories",
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async ugc_list({
    state = null,
    category = "seed_cat_0",
    page = 1,
    page_size = 10,
    shuffle = false,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const endpoint = shuffle ? "/api/v1/ugc/list_by_category_shuffle" : "/api/v1/ugc/list_by_category";
      const r = await this._req({
        method: "GET",
        url: `${endpoint}?page=${page}&page_size=${page_size}&category_code=${category}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async ugc_by_ids({
    state = null,
    ids = [],
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const idStr = Array.isArray(ids) ? ids.join(",") : ids;
      const r = await this._req({
        method: "GET",
        url: `/api/v1/ugc/list_by_ids?ids=${idStr}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async visuals({
    state = null,
    page = 1,
    page_size = 10,
    category = "all",
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      const r = await this._req({
        method: "GET",
        url: `/api/v1/visuals?page=${page}&page_size=${page_size}&category=${category}`,
        ...rest
      });
      return {
        status: "ok",
        result: r?.data ?? r,
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async generate({
    state = null,
    prompt = "",
    images = [],
    model,
    ratio,
    count,
    resolution,
    duration,
    sound = false,
    files,
    template = null,
    agent = false,
    mode = null,
    ...rest
  } = {}) {
    try {
      await this._ensure_auth(state);
      if (agent || mode === "design" || mode === "short_drama") {
        return await this._generate_agent({
          state: state,
          prompt: prompt,
          images: images,
          files: files,
          model: model,
          ratio: ratio,
          count: count,
          resolution: resolution,
          duration: duration,
          sound: sound,
          mode: mode,
          ...rest
        });
      }
      if (template && template.template_id) {
        return await this.tmpl_generate({
          state: state,
          template: template,
          ...rest
        });
      }
      const payload = await this._buildPayload({
        prompt: prompt,
        images: images,
        model: model,
        ratio: ratio,
        count: count,
        resolution: resolution,
        duration: duration,
        sound: sound,
        files: files,
        mode: mode,
        rest: rest
      });
      const response = await this._axios(this._applyHeaders({
        method: "POST",
        url: "/api/v1/chat/stream",
        data: payload,
        responseType: "stream",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Connection: "keep-alive"
        }
      }));
      const result = await this._parseStream(response.data);
      return {
        status: "ok",
        result: {
          ...result,
          conversation_id: payload.conversation_id
        },
        state: this._enc_state()
      };
    } catch (e) {
      return {
        status: "error",
        result: {
          error: e.message
        },
        state: this._enc_state()
      };
    }
  }
  async _generate_agent({
    state,
    prompt,
    images,
    files,
    model,
    ratio,
    count,
    resolution,
    duration,
    sound,
    mode = "design",
    ...rest
  }) {
    const prepared_images = await this._prepare_images_array(images);
    let prepared_files = [];
    if (files && files.length) {
      prepared_files = await this._prepare_files(files);
    }
    let finalModel = model;
    if (!finalModel || finalModel === "auto") finalModel = "agnes-image";
    let conv_id = rest.conversation_id;
    if (!conv_id) {
      const c = await this.conv({
        state: this._enc_state()
      });
      conv_id = c?.result?.conversation_id;
    }
    let extra_context = {};
    if (mode === "short_drama") {
      extra_context = {
        extra_context: {
          agent_params: {
            genre: rest.genre || "action",
            characters: rest.characters || [],
            scene: rest.scene || ""
          }
        }
      };
      delete rest.genre;
      delete rest.characters;
      delete rest.scene;
    }
    const payload = {
      conversation_id: conv_id,
      prompt: prompt || "",
      mode: mode,
      media_type: "image",
      model: finalModel,
      images: prepared_images,
      ratio: ratio || "auto",
      count: count || "auto",
      resolution: resolution || "auto",
      ...prepared_files.length ? {
        files: prepared_files
      } : {},
      ...duration ? {
        duration: duration
      } : {},
      ...sound !== undefined ? {
        sound: sound
      } : {},
      ...extra_context,
      ...rest
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    const response = await this._axios(this._applyHeaders({
      method: "POST",
      url: "/api/v1/chat/stream",
      data: payload,
      responseType: "stream",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    }));
    const result = await this._parseStream(response.data);
    return {
      status: "ok",
      result: {
        ...result,
        conversation_id: payload.conversation_id
      },
      state: this._enc_state()
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["profile", "credits", "models", "modes", "visuals", "generate", "conv", "templates", "ugc", "resume"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          profile: "/api/pixa?action=profile&state=BASE64_STATE_OPIONAL",
          credits: "/api/pixa?action=credits&state=BASE64_STATE_OPTIONAL",
          models: "/api/pixa?action=models",
          modes: "/api/pixa?action=modes",
          visuals: "/api/pixa?action=visuals&page=1&page_size=10&category=all",
          conv: "/api/pixa?action=conv",
          templates: "/api/pixa?action=templates&category=trending&page=1",
          ugc: "/api/pixa?action=ugc&category=seed_cat_7&page=1&shuffle=false",
          resume: "/api/pixa?action=resume&conversation_id=334991869662687232",
          generate: {
            endpoint: "/api/pixa?action=generate",
            method: "POST",
            body: {
              prompt: "kucing terbang memakai topi",
              mode: "text_to_image",
              model: "agnes-image",
              state: "BASE64_STATE_OPTIONAL"
            }
          }
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new PixaClient();
  try {
    let response;
    switch (action) {
      case "profile":
        response = await api.profile(params);
        break;
      case "credits":
        response = await api.credits(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "modes":
        response = await api.modes(params);
        break;
      case "conv":
        response = await api.conv(params);
        break;
      case "visuals":
        response = await api.visuals(params);
        break;
      case "templates":
        response = await api.tmpl_list(params);
        break;
      case "ugc":
        response = await api.ugc_list(params);
        break;
      case "resume":
        if (!params.conversation_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'conversation_id' wajib diisi untuk melakukan resume."
          });
        }
        response = await api.resume(params);
        break;
      case "generate":
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Koneksi ke server API gagal atau data kosong."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}