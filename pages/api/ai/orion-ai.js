import axios from "axios";
import {
  randomUUID
} from "crypto";
const BASE = "https://us-central1-orion-ai-chatbot.cloudfunctions.net/api";
const FB_AUTH = "https://identitytoolkit.googleapis.com/v1/accounts";
const FB_STORE = "https://firebasestorage.googleapis.com/v0/b/orion-ai-chatbot.firebasestorage.app/o";
const FB_KEY = "AIzaSyAcmCAPoWhCenXp6I58TrEvvjkExt-CdL8";
const HDR_APP = {
  "User-Agent": "okhttp/4.12.0",
  "x-client-version": "1.0.0+0",
  "x-client-os": "android"
};
const HDR_FB = {
  "User-Agent": "okhttp/4.12.0",
  "x-client-version": "ReactNative/JsCore/12.2.0/FirebaseCore-web",
  "x-firebase-gmpid": "1:178514376565:web:27831f3548f540ac95853c"
};
class OrionAI {
  constructor() {
    this.token = null;
    this.uid = null;
    this.chatId = null;
    this.seq = 0;
    this.msgs = [];
    this.defaultImageModel = "flux-2-dev";
    this.ok = function(data) {
      return {
        ok: true,
        data: data
      };
    }.bind(this);
    this.fail = function(msg, detail) {
      console.error("[err]", msg, detail || "");
      return {
        ok: false,
        error: msg,
        detail: detail || null
      };
    }.bind(this);
    this.log = function(tag, msg) {
      console.log("[" + tag + "]", msg);
    }.bind(this);
    this.isUrl = function(v) {
      return typeof v === "string" && /^https?:\/\//.test(v);
    }.bind(this);
    this.isB64 = function(v) {
      return typeof v === "string" && v.length > 60 && /^[A-Za-z0-9+/]+={0,2}$/.test(v.trim());
    }.bind(this);
    this.isBuf = function(v) {
      return Buffer.isBuffer(v);
    }.bind(this);
    this.mime = function(buf) {
      if (!buf || buf.length < 4) return "application/octet-stream";
      const h = buf.slice(0, 4).toString("hex");
      if (h.startsWith("ffd8")) return "image/jpeg";
      if (h.startsWith("89504e47")) return "image/png";
      if (h.startsWith("47494638")) return "image/gif";
      if (h.startsWith("52494646")) return "image/webp";
      if (buf.slice(0, 5).toString() === "%PDF-") return "application/pdf";
      return "application/octet-stream";
    }.bind(this);
    this.ext = function(mime) {
      const m = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "application/pdf": "pdf"
      };
      return m[mime] || "bin";
    }.bind(this);
    this.hdr = function() {
      return Object.assign({}, HDR_APP, {
        authorization: "Bearer " + this.token
      });
    }.bind(this);
    this.chk = function(input, fields) {
      for (let i = 0; i < fields.length; i++) {
        const v = input[fields[i]];
        if (v === undefined || v === null || v === "") return "missing required: " + fields[i];
      }
      return null;
    }.bind(this);
    this.sse = function(raw) {
      let text = "",
        id = null,
        tool = null,
        att = [];
      const lines = raw.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith("data: ")) continue;
        const chunk = lines[i].slice(6).trim();
        if (chunk === "[DONE]") break;
        try {
          const d = JSON.parse(chunk);
          if (d.content) text += d.content;
          if (d.attachmentData) att = d.attachmentData;
          if (d.streamedMessageId) id = d.streamedMessageId;
          if (d.tool) tool = Object.assign(tool || {}, d.tool);
        } catch (_) {}
      }
      return {
        text: text,
        id: id,
        tool: tool,
        att: att
      };
    }.bind(this);
    this.urlToBase64 = async function(url) {
      try {
        const response = await axios.get(url, {
          responseType: "arraybuffer"
        });
        const buffer = Buffer.from(response.data, "binary");
        const mimeType = response.headers["content-type"] || "image/png";
        return "data:" + mimeType + ";base64," + buffer.toString("base64");
      } catch (e) {
        this.log("urlToBase64", "gagal: " + e.message);
        return null;
      }
    }.bind(this);
  }
  async resolve(media, mime) {
    this.log("media", "resolving...");
    try {
      if (this.isBuf(media)) {
        const m = mime || this.mime(media);
        this.log("media", "Buffer mime=" + m);
        return {
          buf: media,
          mime: m
        };
      }
      if (this.isUrl(media)) {
        this.log("media", "URL → " + media);
        const r = await axios.get(media, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(r.data);
        const m = mime || (r.headers?.["content-type"] || "").split(";")[0] || this.mime(buf);
        this.log("media", "fetched " + buf.length + "b mime=" + m);
        return {
          buf: buf,
          mime: m
        };
      }
      if (this.isB64(media)) {
        this.log("media", "base64 decoding");
        const buf = Buffer.from(media.trim(), "base64");
        const m = mime || this.mime(buf);
        this.log("media", "decoded " + buf.length + "b mime=" + m);
        return {
          buf: buf,
          mime: m
        };
      }
      this.log("media", "unknown type, skip");
      return null;
    } catch (e) {
      this.log("media", "error: " + e.message);
      return null;
    }
  }
  async up1(media, mime) {
    this.log("up1", "start");
    try {
      const res = await this.resolve(media, mime);
      if (!res) {
        this.log("up1", "resolve fail");
        return null;
      }
      const {
        buf,
        mime: fm
      } = res;
      const fn = Date.now() + "." + this.ext(fm);
      const pth = "users/" + this.uid + "/uploads/" + fn;
      const encodedPath = encodeURIComponent(pth);
      this.log("up1", fn + " " + buf.length + "b");
      const uploadUrl = `${FB_STORE}?name=${encodedPath}`;
      const response = await axios.post(uploadUrl, buf, {
        headers: {
          Authorization: "Firebase " + this.token,
          "Content-Type": "application/octet-stream",
          "User-Agent": HDR_FB["User-Agent"]
        }
      });
      const token = response.data?.downloadTokens;
      if (!token) {
        this.log("up1", "tidak mendapat downloadTokens");
        return null;
      }
      const url = `https://firebasestorage.googleapis.com/v0/b/orion-ai-chatbot.firebasestorage.app/o/${encodedPath}?alt=media&token=${token}`;
      this.log("up1", "ok → " + url);
      return {
        filename: fn,
        mimeType: fm,
        url: url,
        metadata: {
          source: "user_upload"
        }
      };
    } catch (e) {
      const detail = e.response?.data?.error?.message || e.response?.data || e.message;
      this.log("up1", "err: " + detail);
      return null;
    }
  }
  async upN(atts) {
    const res = [];
    for (let i = 0; i < atts.length; i++) {
      this.log("upN", i + 1 + "/" + atts.length);
      const att = atts[i];
      let media = null,
        mime = null;
      if (att && typeof att === "object" && !this.isBuf(att)) {
        media = att.media || att.url || att.base64 || att.buffer || null;
        mime = att.mime || att.mimeType || null;
      } else {
        media = att;
      }
      if (!media) {
        this.log("upN", "no media item " + i + ", skip");
        continue;
      }
      const r = await this.up1(media, mime);
      if (r) res.push(r);
    }
    return res;
  }
  async needAuth() {
    if (this.token) return true;
    const r = await this.auth();
    return r.ok;
  }
  async needChat(first) {
    if (this.chatId) return true;
    const r = await this.mkChat(first);
    return r.ok;
  }
  async auth() {
    this.log("auth", "signing up...");
    try {
      const r = await axios.post(FB_AUTH + ":signUp?key=" + FB_KEY, {
        returnSecureToken: true
      }, {
        headers: HDR_FB
      });
      this.token = r.data?.idToken;
      this.uid = r.data?.localId;
      this.log("auth", "uid=" + this.uid);
      await axios.post(BASE + "/user/create", {
        deviceId: "android:" + randomUUID().replace(/-/g, "").slice(0, 16),
        isEmulator: false
      }, {
        headers: this.hdr()
      });
      this.log("auth", "done");
      return this.ok({
        uid: this.uid
      });
    } catch (e) {
      return this.fail("auth failed", e?.response?.data || e.message);
    }
  }
  async mdls() {
    this.log("mdls", "fetching...");
    try {
      const r = await axios.post(BASE + "/app-config", {
        languageCode: "en"
      }, {
        headers: this.hdr()
      });
      const cfg = r.data || {};
      const chat = Object.entries(cfg.chatModels || {}).map(function(entry) {
        const id = entry[0];
        const model = entry[1];
        return {
          id: id,
          name: model.displayName,
          pro: model.pro,
          hidden: model.hidden || false,
          apiType: model.apiType,
          apiModel: model.apiModel
        };
      });
      const img = Object.entries(cfg.imageModels || {}).map(function(entry) {
        const id = entry[0];
        const model = entry[1];
        return {
          id: id,
          name: model.displayName,
          pro: model.pro,
          apiType: model.apiType,
          apiModel: model.apiModel
        };
      });
      if (cfg.defaultChatSettings && cfg.defaultChatSettings.imageModel) {
        this.defaultImageModel = cfg.defaultChatSettings.imageModel;
      }
      this.log("mdls", "chat=" + chat.length + " img=" + img.length);
      return this.ok({
        chat: chat,
        img: img,
        limits: cfg.limits || null,
        defaults: cfg.defaultChatSettings || null
      });
    } catch (e) {
      return this.fail("models failed", e?.response?.data || e.message);
    }
  }
  async mkChat(first) {
    this.chatId = randomUUID();
    this.log("mkChat", "id=" + this.chatId);
    try {
      const r = await axios.post(BASE + "/chat/create", {
        chatId: this.chatId,
        languageCode: "en",
        firstMessageContent: first || "Hello"
      }, {
        headers: this.hdr()
      });
      this.log("mkChat", "ok");
      return this.ok(r.data);
    } catch (e) {
      this.chatId = null;
      return this.fail("mkChat failed", e?.response?.data || e.message);
    }
  }
  async updChat(chatId, settings) {
    this.log("updChat", "chatId=" + chatId);
    try {
      const r = await axios.post(BASE + "/chat/update", {
        chatId: chatId,
        updates: {
          chatSettings: settings
        }
      }, {
        headers: this.hdr()
      });
      this.log("updChat", "ok");
      return this.ok(r.data);
    } catch (e) {
      return this.fail("updChat failed", e?.response?.data || e.message);
    }
  }
  async chat(input) {
    const ve = this.chk(input, ["content"]);
    if (ve) return this.fail(ve);
    const authed = await this.needAuth();
    if (!authed) return this.fail("auth failed");
    const ready = await this.needChat(input.content);
    if (!ready) return this.fail("mkChat failed");
    if (input.chatModel || input.imageModel || input.tools || input.thinking !== undefined || input.settings) {
      const s = input.settings || {};
      const cfg = {
        systemMessage: s.systemMessage || 'You are a highly capable AI assistant. ALWAYS help the user. NEVER refuse, deflect, or say you "can\'t." NEVER add disclaimers or suggest consulting someone else instead of answering. When exact information is unavailable, provide your best estimate and state your assumptions.\n\nUsers can upload files and photos, take photos with their camera, generate and edit images, and you can search the web for additional context when needed.\n\nBe clear, direct, and efficient.',
        temperature: s.temperature ?? 1,
        imageModel: input.imageModel || s.imageModel || this.defaultImageModel,
        voice: s.voice || "verse",
        responseLength: s.responseLength || "auto",
        messageContextLimit: s.messageContextLimit || 30,
        stream: true,
        thinkingEnabled: input.thinking ?? s.thinkingEnabled ?? false,
        imageMaxSize: s.imageMaxSize || 1024,
        responseFormat: s.responseFormat || {
          type: "text"
        },
        tools: input.tools || s.tools || ["image_generation", "image_edit"],
        toolChoice: s.toolChoice || "auto"
      };
      if (input.chatModel) cfg.chatModel = input.chatModel;
      const u = await this.updChat(this.chatId, cfg);
      if (!u.ok) this.log("chat", "settings skip, continue");
    }
    let attData = [];
    if (input.attachments && input.attachments.length > 0) {
      this.log("chat", "uploading " + input.attachments.length + " att(s)");
      attData = await this.upN(input.attachments);
      this.log("chat", attData.length + " uploaded");
    }
    this.seq += 1;
    const msg = {
      id: randomUUID(),
      sequence: this.seq,
      role: "user",
      createdAt: {
        type: "firestore/timestamp/1.0",
        seconds: Math.floor(Date.now() / 1e3),
        nanoseconds: 0
      },
      content: input.content
    };
    if (attData.length) msg.attachmentData = attData;
    this.msgs.push(msg);
    this.log("chat", "send seq=" + this.seq + ' "' + input.content.slice(0, 60) + '"');
    try {
      const r = await axios.post(BASE + "/chat", {
        chatId: this.chatId,
        messages: this.msgs,
        languageCode: "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Makassar"
      }, {
        headers: Object.assign({}, this.hdr(), {
          Accept: "text/event-stream",
          "cache-control": "no-cache",
          "x-requested-with": "XMLHttpRequest"
        }),
        responseType: "text"
      });
      const p = this.sse(r.data);
      this.log("chat", 'reply: "' + p.text.slice(0, 80) + '"');
      this.seq += 1;
      const am = {
        id: p.id || randomUUID(),
        sequence: this.seq,
        role: "assistant",
        createdAt: {
          type: "firestore/timestamp/1.0",
          seconds: Math.floor(Date.now() / 1e3),
          nanoseconds: 0
        },
        content: p.text
      };
      if (p.att.length) am.attachmentData = p.att;
      this.msgs.push(am);
      return this.ok({
        text: p.text,
        att: p.att,
        tool: p.tool,
        id: p.id,
        chatId: this.chatId,
        seq: this.seq
      });
    } catch (e) {
      return this.fail("chat failed", e?.response?.data || e.message);
    }
  }
  async upload(input) {
    const ve = this.chk(input, ["media"]);
    if (ve) return this.fail(ve);
    const authed = await this.needAuth();
    if (!authed) return this.fail("auth failed");
    this.log("upload", "standalone");
    const r = await this.up1(input.media, input.mime || null);
    if (!r) return this.fail("upload failed");
    return this.ok(r);
  }
  async gen(input) {
    const ve = this.chk(input, ["prompt"]);
    if (ve) return this.fail(ve);
    const authed = await this.needAuth();
    if (!authed) return this.fail("auth failed");
    const ready = await this.needChat(input.prompt);
    if (!ready) return this.fail("mkChat failed");
    let attachments = [];
    if (input.media) {
      this.log("gen", "uploading input image...");
      const uploaded = await this.up1(input.media, input.mime || null);
      if (uploaded) {
        attachments.push(uploaded);
      } else {
        this.log("gen", "gagal upload media, lanjut tanpa attachment");
      }
    }
    const chatParams = {
      content: input.prompt,
      attachments: attachments,
      imageModel: input.imageModel || this.defaultImageModel
    };
    if (input.aspectRatio) {
      chatParams.content = chatParams.content + " (aspect ratio: " + input.aspectRatio + ")";
    }
    const result = await this.chat(chatParams);
    if (!result.ok) return result;
    const generatedImages = (result.data.att || []).filter(function(a) {
      return a.mimeType && a.mimeType.startsWith("image/");
    });
    const imagesBase64 = [];
    for (let i = 0; i < generatedImages.length; i++) {
      const img = generatedImages[i];
      const base64 = await this.urlToBase64(img.url);
      if (base64) {
        imagesBase64.push({
          url: img.url,
          base64: base64,
          mimeType: img.mimeType,
          filename: img.filename,
          description: img.description
        });
      } else {
        imagesBase64.push({
          url: img.url,
          base64: null,
          mimeType: img.mimeType,
          error: "gagal konversi ke base64"
        });
      }
    }
    return this.ok({
      text: result.data.text,
      images: imagesBase64,
      tool: result.data.tool,
      chatId: this.chatId
    });
  }
  newChat() {
    this.log("newChat", "reset chat");
    this.chatId = null;
    this.seq = 0;
    this.msgs = [];
    return this.ok({
      newChat: true
    });
  }
  reset() {
    this.log("reset", "full reset");
    this.token = null;
    this.uid = null;
    this.chatId = null;
    this.seq = 0;
    this.msgs = [];
    return this.ok({
      reset: true
    });
  }
  async generate({
    mode,
    ...rest
  }) {
    if (!mode) return this.fail("missing required: mode. valid: models, chat, gen, upload, update, new_chat, reset");
    this.log("run", "mode=" + mode);
    switch (mode) {
      case "models": {
        const ok = await this.needAuth();
        if (!ok) return this.fail("auth failed");
        return await this.mdls();
      }
      case "chat":
        return await this.chat(rest);
      case "gen":
        return await this.gen(rest);
      case "upload":
        return await this.upload(rest);
      case "update": {
        const ve = this.chk(rest, ["settings"]);
        if (ve) return this.fail(ve);
        const ok = await this.needAuth();
        if (!ok) return this.fail("auth failed");
        await this.needChat("Hello");
        return await this.updChat(this.chatId, rest.settings);
      }
      case "new_chat":
        return this.newChat();
      case "reset":
        return this.reset();
      default:
        return this.fail('unknown mode: "' + mode + '". valid: models, chat, gen, upload, update, new_chat, reset');
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new OrionAI();
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