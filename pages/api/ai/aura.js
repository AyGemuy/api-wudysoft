import axios from "axios";
import crypto from "crypto";
class AuraCompanion {
  constructor() {
    this.base = "https://aura-companion-api.lingering-snow-32fb.workers.dev/";
    this.token = null;
    this.modes = ["analyze", "enhance-prompt", "gen-img-enhance", "gen-img", "chat"];
  }
  _snake(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => this._snake(v));
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
      acc[snakeKey] = this._snake(obj[key]);
      return acc;
    }, {});
  }
  _genId() {
    return `guest_${crypto.randomBytes(8).toString("hex")}`;
  }
  async _auth() {
    const deviceId = this._genId();
    console.log(`[AUTH] POST /api/auth/guest (device: ${deviceId})`);
    try {
      const response = await axios.post(`${this.base}api/auth/guest`, {
        deviceId: deviceId
      }, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      const token = response.data?.data?.token;
      if (!token) return {
        success: false,
        error: "Token tidak ditemukan dalam respons."
      };
      this.token = token;
      console.log("[AUTH] Berhasil mendapatkan token.");
      return token;
    } catch (err) {
      const status = err.response?.status ? `[${err.response.status}] ` : "";
      const msg = err.response?.data?.message || err.message;
      return {
        success: false,
        error: `${status}Auth Gagal: ${msg}`
      };
    }
  }
  async _checkTk() {
    if (this.token) return this.token;
    return await this._auth();
  }
  async _req({
    method,
    path,
    data,
    token
  }) {
    const activeToken = token || await this._checkTk();
    if (activeToken?.success === false) return activeToken;
    const url = `${this.base}${path}`;
    const payload = this._snake(data || {});
    console.log(`[REQ] ${method} ${url}`);
    try {
      const response = await axios({
        method: method,
        url: url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        data: payload,
        timeout: 6e4
      });
      const result = this._snake(response.data);
      return {
        success: true,
        token: activeToken,
        ...result.data
      };
    } catch (err) {
      const status = err.response?.status ? `[${err.response.status}] ` : "";
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message;
      return {
        success: false,
        error: `${status}Request Gagal: ${msg}`
      };
    }
  }
  async generate({
    mode,
    prompt,
    token,
    ...rest
  }) {
    try {
      console.log(`[PROSES] Memulai mode: ${mode || "tidak ditentukan"}`);
      const activeMode = mode && this.modes.includes(mode) ? mode : null;
      if (!activeMode) {
        return {
          success: false,
          error: `Mode tidak valid. Pilih: ${this.modes.join(", ")}`
        };
      }
      let path = "";
      let defData = {};
      switch (activeMode) {
        case "analyze": {
          const dataText = rest.data;
          if (!dataText) return {
            success: false,
            error: 'Mode "analyze" membutuhkan field "data"'
          };
          path = "api/tools/analyze-data";
          defData = {
            data: dataText,
            question: rest.question
          };
          break;
        }
        case "enhance-prompt": {
          const text = prompt || rest.prompt;
          if (!text) return {
            success: false,
            error: 'Mode "enhance-prompt" membutuhkan field "prompt"'
          };
          path = "api/tools/image/enhance-prompt";
          defData = {
            prompt: text,
            style: "realistic",
            language: "en"
          };
          break;
        }
        case "gen-img-enhance": {
          const text = prompt || rest.prompt;
          if (!text) return {
            success: false,
            error: 'Mode "gen-img-enhance" membutuhkan field "prompt"'
          };
          path = "api/tools/image/generate";
          defData = {
            prompt: text,
            style: "realistic",
            aspectRatio: "1:1",
            quality: "standard",
            negativePrompt: null,
            assistantId: "aura",
            language: "en",
            enhancePrompt: false
          };
          break;
        }
        case "gen-img": {
          const text = prompt || rest.prompt;
          if (!text) return {
            success: false,
            error: 'Mode "gen-img" membutuhkan field "prompt"'
          };
          path = "api/tools/generate-image";
          defData = {
            prompt: text,
            style: "realistic"
          };
          break;
        }
        case "chat": {
          const msg = prompt || rest.message;
          if (!msg) return {
            success: false,
            error: 'Mode "chat" membutuhkan field "message" atau "prompt"'
          };
          path = "api/chat";
          defData = {
            message: msg,
            conversationId: null,
            tone: null
          };
          break;
        }
      }
      const res = await this._req({
        method: "POST",
        path: path,
        data: {
          ...defData,
          ...rest
        },
        token: token
      });
      if (res.success === false) return res;
      if (activeMode === "gen-img" || activeMode === "gen-img-enhance") {
        const base64Data = res.image_base64 || "";
        const mimeType = res.mime_type || "image/png";
        if (!base64Data) return {
          success: false,
          error: "API tidak mengembalikan image_base64"
        };
        return {
          buffer: Buffer.from(base64Data, "base64"),
          contentType: mimeType
        };
      }
      return res;
    } catch (err) {
      console.error(`[ERROR] Terjadi kesalahan: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AuraCompanion();
  try {
    const data = await api.generate(params);
    if (data?.success === false || data?.error) {
      return res.status(400).json({
        success: false,
        error: data.error || "Gagal memproses request."
      });
    }
    if (data?.buffer && data?.contentType) {
      res.setHeader("Content-Type", data.contentType);
      return res.status(200).send(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan sistem saat memproses.";
    console.error("[API ERROR]", error);
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}