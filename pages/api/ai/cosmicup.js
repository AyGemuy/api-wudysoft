import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class CosmicUpClient {
  constructor(token = "") {
    this.token = token || "";
    this.refreshToken = "";
    this.key = "AIzaSyC_srcJbSRuoqVdERKgUXDWssUrnTqEMPk";
    this.modes = ["chat", "image", "audio"];
    this.models = ["openai/gpt-5.4-nano", "openai/gpt-5.4-mini", "openai/gpt-5.4", "gpt-image-1-mini", "cosmicup_music_agent", "openai/gpt-4o", "deepseek/deepseek-chat", "google/gemini-2.5-pro-preview"];
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://app.cosmicup.me",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: "https://api-5dvhxg2zwq-uc.a.run.app",
      headers: this.headers
    });
    this.client.interceptors.request.use(cfg => {
      if (this.token) cfg.headers["authorization"] = `${this.token}`;
      return cfg;
    }, err => Promise.reject(err));
  }
  _sKey(s) {
    return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
  }
  _snk(o) {
    if (!o || typeof o !== "object") return o;
    if (Array.isArray(o)) return o.map(v => this._snk(v));
    const res = {};
    for (const [k, v] of Object.entries(o)) res[this._sKey(k)] = this._snk(v);
    return res;
  }
  async _solv(m) {
    try {
      let buffer, filename = "file.bin",
        contentType = "application/octet-stream";
      if (typeof m === "string") {
        const isUrl = m.startsWith("http://") || m.startsWith("https://");
        const isData = m.startsWith("data:");
        if (isUrl) {
          const res = await axios.get(m, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          const mime = res.headers["content-type"];
          contentType = mime || contentType;
          filename = `file.${mime ? mime.split("/")[1] || "bin" : "bin"}`;
        } else if (isData) {
          const idx = m.indexOf(";base64,");
          if (idx !== -1) {
            contentType = m.slice(5, idx);
            buffer = Buffer.from(m.slice(idx + 8), "base64");
            filename = `file.${contentType.split("/")[1] || "bin"}`;
          }
        } else {
          buffer = Buffer.from(m, "base64");
        }
      } else if (Buffer.isBuffer(m)) {
        buffer = m;
      }
      return {
        buffer: buffer,
        filename: filename,
        contentType: contentType
      };
    } catch {
      return null;
    }
  }
  _pfVal(v) {
    if (!v || typeof v !== "object") return v;
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return Number(v.doubleValue);
    if ("booleanValue" in v) return Boolean(v.booleanValue);
    if ("nullValue" in v) return null;
    if ("timestampValue" in v) return v.timestampValue;
    if ("bytesValue" in v) return v.bytesValue;
    if ("referenceValue" in v) return v.referenceValue;
    if ("geoPointValue" in v) return v.geoPointValue;
    if ("arrayValue" in v) return (v.arrayValue?.values || []).map(x => this._pfVal(x));
    if ("mapValue" in v) return this._pfFld(v.mapValue?.fields || {});
    return v;
  }
  _pfFld(f) {
    if (!f || typeof f !== "object") return {};
    const res = {};
    for (const k of Object.keys(f)) res[k] = this._pfVal(f[k]);
    return res;
  }
  _pfDoc(d) {
    return d?.fields ? this._pfFld(d.fields) : d || null;
  }
  async _listenFS(id, max = 60, delay = 3e3) {
    const url = `https://firestore.googleapis.com/v1/projects/chatupweb/databases/(default)/documents/chats/${id}/messages`;
    for (let i = 0; i < max; i++) {
      try {
        const res = await axios.get(url, {
          headers: {
            ...this.headers,
            authorization: `Bearer ${this.token}`
          }
        });
        const docs = res?.data?.documents || [];
        if (docs.length > 0) {
          const chunks = docs.map(doc => {
            const parsed = this._pfDoc(doc) || {};
            return {
              message_id: doc.name.split("/").pop(),
              ...this._snk(parsed)
            };
          });
          chunks.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
          const assistantMsg = chunks.find(c => {
            if (c.role !== "assistant") return false;
            if (c.is_loading === true) return false;
            if (c.is_image_agent_working === true) return false;
            if (c.is_audio_agent_working === true) return false;
            return Boolean(c.message || c.image_urls || c.audio_url);
          });
          if (assistantMsg) {
            return {
              success: true,
              messageId: assistantMsg.message_id,
              data: assistantMsg,
              chunks: chunks
            };
          }
        }
      } catch {}
      await new Promise(r => setTimeout(r, delay));
    }
    return {
      success: false,
      message: "Waktu tunggu balasan Firestore session habis."
    };
  }
  async _pollMail(tok) {
    const url = `https://${apiConfig.DOMAIN_URL}/api/mails/v42?action=message&token=${tok}`;
    for (let i = 0; i < 15; i++) {
      console.log(`[Mail] Polling inbox Ryzenmail (Percobaan ${i + 1}/15)...`);
      try {
        const res = await axios.get(url);
        const mails = res?.data?.result?.mails || [];
        for (const mail of mails) {
          if ((mail.subject || "").includes("Verify")) {
            const body = mail.body_html || mail.body_text || "";
            const idx = body.indexOf("oobCode=");
            if (idx !== -1) {
              const rem = body.slice(idx + 8);
              let oobCode = "";
              for (const c of rem) {
                if ("&\"' \n".includes(c)) break;
                oobCode += c;
              }
              console.log(`[Mail] Token OOB berhasil didapatkan: ${oobCode}`);
              return {
                success: true,
                oobCode: oobCode
              };
            }
          }
        }
      } catch {}
      await new Promise(r => setTimeout(r, 3e3));
    }
    return {
      success: false,
      message: "Waktu tunggu verifikasi email habis."
    };
  }
  async _chkTok() {
    if (this.token) return {
      success: true,
      token: this.token
    };
    console.log("[Auth] Memulai siklus registrasi akun otomatis...");
    try {
      const mailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v42?action=create`);
      const email = mailRes?.data?.result?.address;
      const rTok = mailRes?.data?.token;
      if (!email || !rTok) return {
        success: false,
        message: "Alamat kotak surat gagal dibuat."
      };
      console.log(`[Auth] Email terdaftar: ${email}`);
      console.log("[Auth] Melakukan registrasi akun baru ke Firebase Identity Toolkit...");
      const signUpRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.key}`, {
        returnSecureToken: true,
        email: email,
        password: `1A${email}`,
        clientType: "CLIENT_TYPE_WEB"
      }, {
        headers: this.headers
      });
      const initTok = signUpRes?.data?.idToken;
      this.refreshToken = signUpRes?.data?.refreshToken;
      if (!initTok) return {
        success: false,
        message: "Operasi pendaftaran Firebase gagal."
      };
      console.log("[Auth] Mengajukan pengiriman kode verifikasi email...");
      await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${this.key}`, {
        requestType: "VERIFY_EMAIL",
        idToken: initTok
      }, {
        headers: this.headers
      });
      const pollRes = await this._pollMail(rTok);
      if (!pollRes.success) return pollRes;
      console.log("[Auth] Mengonfirmasi kode verifikasi akun...");
      await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.key}`, {
        oobCode: pollRes.oobCode
      }, {
        headers: this.headers
      });
      console.log("[Auth] Memperbarui sesi token otentikasi terverifikasi...");
      const refRes = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${this.key}`, `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.refreshToken)}`, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      this.token = refRes?.data?.id_token || initTok;
      this.refreshToken = refRes?.data?.refresh_token || this.refreshToken;
      console.log("[Auth] Token otentikasi berhasil terverifikasi dan aktif.");
      return {
        success: true,
        token: this.token
      };
    } catch (err) {
      return {
        success: false,
        message: err?.response?.data?.error?.message || err?.message || "Kegagalan Otentikasi"
      };
    }
  }
  async _up(buffer, filename, contentType) {
    try {
      console.log(`[Upload] Mengunggah lampiran: ${filename} (${contentType})`);
      const form = new FormData();
      form.append("files[]", buffer, {
        filename: filename,
        contentType: contentType
      });
      const res = await this.client.post("/v2/attachments/upload", form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const data = res?.data || {};
      const id = typeof data === "string" ? data : data?.document?.id || data?.id || data?.attachmentId;
      return {
        success: true,
        id: id,
        document: data?.document || null
      };
    } catch (err) {
      return {
        success: false,
        message: err?.message
      };
    }
  }
  async generate({
    token,
    mode,
    prompt,
    messages,
    media,
    ...rest
  }) {
    try {
      if (token) this.token = token;
      const authCheck = await this._chkTok();
      if (!authCheck.success) {
        return {
          status: false,
          message: authCheck.message,
          result: null,
          chatID: null,
          token: this.token
        };
      }
      const appMode = mode || "chat";
      const model = rest.model || (appMode === "chat" ? "openai/gpt-5.4-nano" : appMode === "image" ? "gpt-image-1-mini" : "cosmicup_music_agent");
      if (!this.modes.includes(appMode)) {
        return {
          status: false,
          message: `Mode "${appMode}" tidak didukung oleh sistem.`
        };
      }
      if (!this.models.includes(model)) {
        return {
          status: false,
          message: `Model "${model}" tidak terdaftar dalam konfigurasi sistem.`
        };
      }
      console.log(`[Generate] Menjalankan operasi pembuatan [Mode: ${appMode}] [Model: ${model}]`);
      let res;
      let chatID = rest.chatID || "undefined";
      const attachments = [];
      switch (appMode) {
        case "chat": {
          const attIds = [];
          if (media) {
            const items = Array.isArray(media) ? media : [media];
            for (let i = 0; i < items.length; i++) {
              const parsed = await this._solv(items[i]);
              if (parsed?.buffer) {
                const upRes = await this._up(parsed.buffer, parsed.filename, parsed.contentType);
                if (upRes.success && upRes.id) {
                  attIds.push(upRes.id);
                  attachments.push(this._snk({
                    id: upRes.id,
                    ...upRes.document || {}
                  }));
                }
              }
            }
          }
          const form = new FormData();
          form.append("attachmentIds", JSON.stringify(attIds));
          form.append("model", model);
          form.append("style", rest.style || "default");
          form.append("value", prompt || "");
          form.append("chatID", String(chatID));
          form.append("canvaOptionSelected", String(!!rest.canvaOptionSelected));
          form.append("isWebSearchSelected", String(!!rest.isWebSearchSelected));
          form.append("isDeepResearchSelected", String(!!rest.isDeepResearchSelected));
          form.append("reasoningEffort", rest.reasoningEffort || "auto");
          if (messages && Array.isArray(messages)) {
            for (let i = 0; i < messages.length; i++) {
              form.append("messages[]", JSON.stringify(messages[i]));
            }
          }
          res = await this.client.post("/v2/chat/sendMessage", form, {
            headers: {
              ...this.headers,
              ...form.getHeaders()
            }
          });
          break;
        }
        case "image": {
          const form = new FormData();
          form.append("model", model);
          form.append("value", prompt || "");
          form.append("chatID", String(chatID));
          if (media) {
            const items = Array.isArray(media) ? media : [media];
            for (let i = 0; i < items.length; i++) {
              const parsed = await this._solv(items[i]);
              if (parsed?.buffer) {
                form.append("files[]", parsed.buffer, {
                  filename: parsed.filename,
                  contentType: parsed.contentType
                });
              }
            }
          }
          res = await this.client.post("/chat/image/sendMessage", form, {
            headers: {
              ...this.headers,
              ...form.getHeaders()
            }
          });
          break;
        }
        case "audio": {
          const form = new FormData();
          form.append("model", model);
          form.append("value", prompt || "");
          form.append("chatID", String(chatID));
          if (media) {
            const items = Array.isArray(media) ? media : [media];
            for (let i = 0; i < items.length; i++) {
              const parsed = await this._solv(items[i]);
              if (parsed?.buffer) {
                form.append("files[]", parsed.buffer, {
                  filename: parsed.filename,
                  contentType: parsed.contentType
                });
              }
            }
          }
          res = await this.client.post("/chat/audio/sendMessage", form, {
            headers: {
              ...this.headers,
              ...form.getHeaders()
            }
          });
          break;
        }
        default:
          return {
            status: false,
              message: "Kesalahan rute eksekusi mode."
          };
      }
      console.log("[Generate] Inisiasi pesan berhasil diselesaikan.");
      const activeChatID = res?.data?.chatID || (chatID !== "undefined" ? chatID : null);
      let sRes = null;
      if (activeChatID) {
        console.log(`[Firestore] Mengambil hasil dari Firestore Session (chatID: ${activeChatID})...`);
        sRes = await this._listenFS(activeChatID);
      }
      const hRes = this._snk(res?.data || {});
      const sData = sRes?.success ? sRes.data : {};
      const chunks = sRes?.chunks || [];
      return {
        status: true,
        result: {
          ...hRes,
          ...sData,
          attachments: attachments,
          chunks: chunks
        },
        chatID: activeChatID,
        token: this.token
      };
    } catch (error) {
      return {
        status: false,
        message: error?.response?.data?.message || error?.message || "Terjadi kesalahan tidak terduga",
        result: null,
        chatID: null,
        token: this.token
      };
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
  const api = new CosmicUpClient();
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