import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import FormData from "form-data";
class QuillbotChat {
  constructor() {
    this.token = "empty-token";
    this._refreshToken = null;
    this._expiry = 0;
    this.jar = new CookieJar();
    this.modeConfig = {
      chat: {
        required: ["prompt"]
      },
      raven: {
        required: ["prompt"]
      },
      image: {
        required: ["prompt"]
      },
      edit: {
        required: ["prompt", "files"]
      }
    };
    this.availableModes = Object.keys(this.modeConfig);
    this.deviceId = this._uid();
    this.anonId = this._hex(16);
    this.client = null;
    this.headers = {};
  }
  async _genToken() {
    const API_KEY = "AIzaSyAhX7hgWsGjY-Lo6eqwJmuRU2xxNRTY7kQ";
    const REFERER = "https://quillbot.com";
    const now = Date.now();
    if (this.token !== "empty-token" && this._expiry > now + 6e4) {
      return this.token;
    }
    if (this._refreshToken) {
      try {
        const res = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this._refreshToken
        }).toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: REFERER
          }
        });
        const data = res.data;
        this.token = data.id_token || data.access_token;
        this._refreshToken = data.refresh_token || this._refreshToken;
        this._expiry = now + (parseInt(data.expires_in) || 3600) * 1e3;
        return this.token;
      } catch {
        this.token = "empty-token";
        this._refreshToken = null;
        this._expiry = 0;
      }
    }
    const res = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      returnSecureToken: true
    }, {
      headers: {
        "Content-Type": "application/json",
        Referer: REFERER
      }
    });
    const data = res.data;
    this.token = data.idToken;
    this._refreshToken = data.refreshToken;
    this._expiry = now + parseInt(data.expiresIn) * 1e3;
    return this.token;
  }
  async init(customToken = null) {
    try {
      if (customToken) {
        this.token = customToken;
      } else {
        this.token = await this._genToken() || "empty-token";
      }
      const isAuthenticated = this.token !== "empty-token";
      this.headers = {
        accept: "text/event-stream",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        cookie: `qbDeviceId=${this.deviceId}; anonID=${this.anonId}; ajs_anonymous_id=${this.deviceId}; premium=false; authenticated=${isAuthenticated};`,
        origin: "https://quillbot.com",
        "platform-type": "webapp",
        referer: "https://quillbot.com/ai-chat/c/new?tools=web_search",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        useridtoken: this.token,
        "webapp-version": "38.26.0"
      };
      this.client = wrapper(axios.create({
        jar: this.jar,
        baseURL: "https://quillbot.com",
        headers: this.headers
      }));
      this._log("init", `Client siap (Authenticated: ${isAuthenticated})`);
    } catch (err) {
      this._log("error", `Init failed: ${err.message}`);
      throw err;
    }
  }
  _uid() {
    return crypto.randomUUID();
  }
  _hex(n) {
    return crypto.randomBytes(n / 2).toString("hex");
  }
  _log(step, msg) {
    console.log(`[QB:${step.toUpperCase()}] ${msg}`);
  }
  _clean(text) {
    return (text ?? "").trim();
  }
  _detectMime(buf) {
    if (!buf || buf.length < 12) return "image/jpeg";
    const head = buf.subarray(0, 12);
    if (head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71) return "image/png";
    if (head[0] === 255 && head[1] === 216) return "image/jpeg";
    if (head[0] === 71 && head[1] === 73 && head[2] === 70) return "image/gif";
    if (head[0] === 82 && head[1] === 73 && head[2] === 70 && head[3] === 70) return "image/webp";
    return "image/jpeg";
  }
  _parseChat(raw) {
    const out = {
      result: "",
      annotations: [],
      titles: [],
      status: "",
      chatId: null,
      raw: []
    };
    try {
      const text = Buffer.isBuffer(raw) ? raw.toString() : raw ?? "";
      const lines = text.split("\n").filter(l => l.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          out.raw.push(data);
          switch (data.type) {
            case "content":
              out.result += data.content ?? "";
              break;
            case "status":
              out.status = data.status ?? out.status;
              out.chatId = data.chatId ?? out.chatId;
              break;
            case "title":
              data.title && out.titles.push(data.title);
              break;
            case "annotation":
              data.annotation && out.annotations.push(data.annotation);
              break;
          }
        } catch {}
      }
      out.result = this._clean(out.result);
    } catch (err) {
      this._log("error", `Parse chat failed: ${err.message}`);
    }
    return out;
  }
  async upImg(imageInput, options = {}) {
    const {
      filename = `image_${Date.now()}.jpg`,
        chatId = this._uid(),
        namespace = "ai-chat"
    } = options;
    let buffer, mime;
    if (Buffer.isBuffer(imageInput)) {
      buffer = imageInput;
      mime = this._detectMime(buffer);
    } else if (typeof imageInput === "string" && imageInput.startsWith("data:image")) {
      const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return {
        success: false,
        error: "Invalid base64 format"
      };
      mime = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else if (typeof imageInput === "string" && (imageInput.startsWith("http://") || imageInput.startsWith("https://"))) {
      try {
        const resp = await axios.get(imageInput, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(resp.data);
        mime = resp.headers["content-type"] || "image/jpeg";
      } catch (e) {
        return {
          success: false,
          error: `Download failed: ${e.message}`
        };
      }
    } else if (typeof imageInput === "string") {
      buffer = Buffer.from(imageInput, "base64");
      mime = "image/png";
    } else return {
      success: false,
      error: "Unsupported input type. Use URL, base64, or Buffer."
    };
    const ext = mime.split("/")[1] || "jpg";
    const finalName = filename.includes(".") ? filename : `${filename}.${ext}`;
    let docId;
    try {
      const createRes = await this.client.post("/api/docupine/documents", {
        name: finalName,
        documentMeta: {
          file_name: finalName,
          chatId: chatId
        },
        namespace: namespace,
        dirPath: ""
      }, {
        headers: {
          "qb-product": "AI-CHAT",
          "content-type": "application/json"
        }
      });
      docId = createRes.data?.data?.id;
      if (!docId) return {
        success: false,
        error: "No document ID"
      };
    } catch (err) {
      return {
        success: false,
        error: `Create doc failed: ${err.message}`
      };
    }
    const form = new FormData();
    form.append("file", buffer, {
      filename: finalName,
      contentType: mime
    });
    try {
      await this.client.put(`/api/docupine/documents/${docId}/content`, form, {
        headers: {
          ...form.getHeaders(),
          "qb-product": "AI-CHAT",
          "x-beaver-change_timestamp": Date.now().toString(),
          "x-beaver-create_new": "false",
          "x-beaver-current_version": "1"
        }
      });
    } catch (err) {
      return {
        success: false,
        error: `Upload failed: ${err.message}`,
        documentId: docId
      };
    }
    let url = null;
    try {
      const info = await this.client.get(`/api/docupine/documents/${docId}`, {
        headers: {
          "qb-product": "AI-CHAT"
        }
      });
      url = info.data?.data?.document?.url || null;
    } catch (e) {
      this._log("warn", `Could not fetch doc URL: ${e.message}`);
    }
    this._log("upImg", `Uploaded ${finalName} -> ${docId}`);
    return {
      success: true,
      documentId: docId,
      url: url,
      name: finalName,
      mimeType: mime,
      size: buffer.length,
      chatId: chatId
    };
  }
  async uploadFiles(fileInputs, baseOptions = {}) {
    const inputs = Array.isArray(fileInputs) ? fileInputs : [fileInputs];
    const results = [];
    for (const file of inputs) {
      const res = await this.upImg(file, baseOptions);
      if (!res.success) return {
        success: false,
        error: res.error,
        partial: results
      };
      results.push({
        id: res.documentId,
        mimeType: res.mimeType,
        name: res.name,
        url: res.url
      });
    }
    return {
      success: true,
      files: results
    };
  }
  async sendRaven(prompt, files = [], rest = {}) {
    const payload = {
      stream: true,
      message: {
        role: "user",
        content: prompt,
        messageId: this._uid(),
        createdAt: new Date().toISOString(),
        files: files.map(f => ({
          id: f.id,
          mimeType: f.mimeType,
          name: f.name
        }))
      },
      product: "ai-chat",
      originUrl: "/ai-chat",
      prompt: {
        id: "ai_chat"
      },
      tools: ["web_search"],
      ...rest
    };
    try {
      const res = await this.client.post("/api/raven/quill-chat/responses", payload, {
        responseType: "stream",
        headers: {
          accept: "text/event-stream"
        }
      });
      const result = {
        result: "",
        annotations: [],
        titles: [],
        status: "processing",
        chatId: null
      };
      return new Promise(resolve => {
        res.data.on("data", chunk => {
          const text = chunk.toString();
          for (const line of text.split("\n")) {
            if (!line.trim() || !line.startsWith("data:")) continue;
            try {
              const jsonStr = line.slice(5).trim();
              if (jsonStr === "[DONE]") continue;
              const data = JSON.parse(jsonStr);
              result.result += data.chunk ?? data.content ?? "";
              result.status = data.status ?? result.status;
              result.chatId = data.chatId ?? data.data?.chatId ?? result.chatId;
              data.annotation && result.annotations.push(data.annotation);
              data.title && result.titles.push(data.title);
            } catch {}
          }
        });
        res.data.on("end", () => {
          result.status = result.status || "completed";
          result.result = this._clean(result.result);
          this._log("stream", "Raven selesai");
          resolve(result);
        });
        res.data.on("error", err => {
          this._log("error", `Stream error: ${err.message}`);
          resolve({
            ...result,
            status: "error",
            error: err.message
          });
        });
      });
    } catch (err) {
      this._log("error", `Raven request failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async sendChat(prompt, chatId, files = [], rest = {}) {
    const id = chatId ?? this._uid();
    const payload = {
      message: {
        content: prompt,
        files: files.map(f => ({
          id: f.id,
          mimeType: f.mimeType,
          name: f.name
        })),
        prompt: {
          id: "ai_chat"
        }
      },
      context: {},
      origin: {
        name: "ai-chat.chat",
        url: "https://quillbot.com"
      },
      ...rest
    };
    try {
      const res = await this.client.post(`/api/ai-chat/chat/conversation/${id}`, payload, {
        responseType: "text",
        headers: {
          referer: `https://quillbot.com/ai-chat/c/${id}`
        }
      });
      const parsed = this._parseChat(res.data);
      parsed.chatId = parsed.chatId ?? id;
      parsed.status = parsed.status || "completed";
      return parsed;
    } catch (err) {
      this._log("error", `Chat request failed: ${err.response?.status || err.message}`);
      return {
        success: false,
        error: err.message,
        result: ""
      };
    }
  }
  async genImg(prompt, options = {}) {
    const {
      category = "Auto",
        aspectRatio = "1:1",
        promptId = "image/generate-image"
    } = options;
    if (!prompt?.trim()) return {
      success: false,
      error: "Prompt tidak boleh kosong"
    };
    try {
      const res = await this.client.post("/api/raven/generate/image", {
        prompt: prompt,
        category: category,
        aspectRatio: aspectRatio,
        promptId: promptId
      }, {
        headers: {
          "qb-product": "IMAGE-GENERATOR",
          "content-type": "application/json",
          accept: "application/json"
        }
      });
      this._log("genImg", "Success");
      return {
        success: true,
        images: res.data.images || res.data.data?.images || [],
        urls: res.data.urls || [],
        raw: res.data
      };
    } catch (err) {
      this._log("error", `Gen image failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async editImg(prompt, files, options = {}) {
    const {
      chatId = this._uid(),
        namespace = "ai-chat", ...rest
    } = options;
    if (!prompt?.trim()) return {
      success: false,
      error: "Prompt tidak boleh kosong"
    };
    const payload = {
      message: {
        content: prompt + "\n\n",
        files: files,
        prompt: {
          id: "image/edit-image",
          version: 7,
          variables: {
            title: "Free AI photo editor",
            summary: "Upgrade your photos with the AI photo editor."
          }
        }
      },
      context: {
        editorContext: "",
        selectionContext: "",
        userDialect: "en-us",
        apiVersion: 2
      },
      origin: {
        name: "ai-chat.chat",
        url: "https://quillbot.com"
      },
      ...rest
    };
    try {
      const res = await this.client.post(`/api/ai-chat/chat/conversation/${chatId}`, payload, {
        responseType: "text",
        headers: {
          "qb-product": "AI-CHAT",
          referer: `https://quillbot.com/ai-chat/c/${chatId}`,
          "content-type": "application/json"
        }
      });
      const parsed = this._parseChat(res.data);
      parsed.chatId = parsed.chatId ?? chatId;
      parsed.status = parsed.status || "completed";
      parsed.uploadedFiles = files;
      return {
        success: true,
        mode: "edit",
        content: parsed.result,
        status: parsed.status,
        chatId: parsed.chatId,
        annotations: parsed.annotations,
        titles: parsed.titles,
        uploadedFiles: parsed.uploadedFiles,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      this._log("error", `Edit image failed: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async generate(params = {}) {
    const {
      token,
      mode = "chat",
      prompt,
      chatId,
      verbose = false,
      imageOptions = {},
      files = null,
      ...rest
    } = params;
    await this.init(token);
    if (!this.modeConfig[mode]) {
      return {
        success: false,
        error: `Mode '${mode}' tidak dikenal. Mode tersedia: ${this.availableModes.join(", ")}`,
        mode: mode,
        token: this.token,
        timestamp: new Date().toISOString()
      };
    }
    const config = this.modeConfig[mode];
    const missing = config.required.filter(field => {
      if (field === "prompt") return !prompt?.trim();
      if (field === "files") return !files || Array.isArray(files) && files.length === 0;
      return false;
    });
    if (missing.length) {
      return {
        success: false,
        error: `Mode '${mode}' membutuhkan field: ${missing.join(", ")}`,
        mode: mode,
        token: this.token
      };
    }
    let uploadedFiles = [];
    if (files && (mode === "chat" || mode === "raven" || mode === "edit")) {
      const uploadResult = await this.uploadFiles(files, {
        chatId: chatId
      });
      if (!uploadResult.success) {
        return {
          success: false,
          error: `Upload files gagal: ${uploadResult.error}`,
          partial: uploadResult.partial,
          token: this.token
        };
      }
      uploadedFiles = uploadResult.files;
    }
    let finalResponse;
    switch (mode) {
      case "image":
        finalResponse = await this.genImg(prompt, imageOptions);
        break;
      case "edit":
        if (!uploadedFiles.length) {
          return {
            success: false,
            error: "Mode edit memerlukan minimal satu file gambar",
            token: this.token
          };
        }
        finalResponse = await this.editImg(prompt, uploadedFiles, {
          chatId: chatId,
          ...imageOptions
        });
        break;
      case "raven": {
        verbose && this._log("start", `Mode raven | "${prompt.slice(0, 60)}..."`);
        const start = Date.now();
        const raw = await this.sendRaven(prompt, uploadedFiles, rest);
        if (raw.success === false) return {
          ...raw,
          token: this.token
        };
        const time = Date.now() - start;
        verbose && this._log("done", `${time}ms | ${raw.result.length} chars`);
        finalResponse = {
          success: true,
          mode: mode,
          content: raw.result,
          status: raw.status ?? "completed",
          chatId: raw.chatId,
          annotations: raw.annotations ?? [],
          titles: raw.titles ?? [],
          metadata: {
            length: raw.result.length,
            wordCount: raw.result.split(/\s+/).filter(Boolean).length,
            hasCitations: (raw.annotations ?? []).length > 0
          },
          timestamp: new Date().toISOString()
        };
        break;
      }
      case "chat":
      default: {
        verbose && this._log("start", `Mode chat | "${prompt.slice(0, 60)}..."`);
        const start = Date.now();
        const raw = await this.sendChat(prompt, chatId, uploadedFiles, rest);
        if (raw.success === false) return {
          ...raw,
          token: this.token
        };
        const time = Date.now() - start;
        verbose && this._log("done", `${time}ms | ${raw.result.length} chars`);
        finalResponse = {
          success: true,
          mode: mode,
          content: raw.result,
          status: raw.status ?? "completed",
          chatId: raw.chatId,
          annotations: raw.annotations ?? [],
          titles: raw.titles ?? [],
          metadata: {
            length: raw.result.length,
            wordCount: raw.result.split(/\s+/).filter(Boolean).length,
            hasCitations: (raw.annotations ?? []).length > 0
          },
          timestamp: new Date().toISOString()
        };
        break;
      }
    }
    return {
      ...finalResponse,
      token: this.token
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new QuillbotChat();
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