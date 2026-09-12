import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class ChatMax {
  constructor() {
    try {
      this.base = "https://ai-app-studio.var-meta.com/chatbot-app/api";
      this.key = "chatbot_f543aa7739c3453e733291a0b477e35d1e318ce0a302";
      this.ua = "okhttp/4.12.0";
      this.cache = null;
      this.def = "GPT-4o-mini";
      this._log("INIT", "Class ready");
    } catch (e) {
      this._log("ERR_INIT", e.message);
    }
  }
  _log(tag, msg = "") {
    try {
      console.log(`[ChatMax] [${tag}] ${msg}`);
    } catch (e) {}
  }
  _e64(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (e) {
      return "";
    }
  }
  _d64(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf8")) : null;
    } catch (e) {
      return null;
    }
  }
  _hd(id, ext = {}) {
    try {
      return {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        "x-device-id": id || "",
        "x-api-key": this.key,
        accept: "*/*",
        ...ext
      };
    } catch (e) {
      return ext;
    }
  }
  async fMod(id) {
    try {
      if (this.cache) return this.cache;
      const r = await axios.get(`${this.base}/sessions/list_model`, {
        headers: this._hd(id)
      });
      this.cache = r?.data?.models || [];
      return this.cache;
    } catch (e) {
      this._log("ERR_MOD", e.message);
      return [];
    }
  }
  async chat({
    prompt,
    model,
    state,
    media,
    ...rest
  }) {
    try {
      this._log("CHAT", "Process start");
      let ctx = this._d64(state);
      let id = ctx?.deviceId || crypto.randomBytes(8).toString("hex");
      if (!ctx || !ctx.deviceId) {
        try {
          await axios.post(`${this.base}/access/signup`, {
            deviceId: id,
            name: `User_${id.slice(0, 6)}`
          }, {
            headers: this._hd(id, {
              "Content-Type": "application/json"
            })
          });
          this._log("REG", `Device: ${id}`);
        } catch (err) {
          this._log("REG_SKIP", err.message);
        }
      }
      const list = await this.fMod(id);
      const inputMod = model || ctx?.model || this.def;
      const match = list.find(m => m.name?.toLowerCase() === inputMod.toLowerCase());
      if (model && !match) {
        this._log("WARN", `Model '${model}' invalid.`);
        return {
          status: false,
          result: `Model '${model}' tidak ditemukan. Silakan pilih opsi model yang valid.`,
          chunks: [],
          state: state || null,
          availableModels: list.map(m => m.name)
        };
      }
      let target = match ? match.name : this.def;
      if (!ctx || !ctx.sessionId || model && ctx.model !== target) {
        try {
          const sess = await axios.post(`${this.base}/sessions/create_session`, {
            aiModel: target
          }, {
            headers: this._hd(id, {
              "Content-Type": "application/json"
            })
          });
          ctx = {
            deviceId: id,
            sessionId: sess?.data?.id,
            model: target
          };
          this._log("SESS", `Active ID: ${ctx.sessionId}`);
        } catch (err) {
          this._log("ERR_SESS", err.message);
          return {
            status: false,
            result: "Gagal alokasi runtime session.",
            chunks: [],
            state: state || null
          };
        }
      }
      const form = new FormData();
      form.append("sessionId", ctx.sessionId);
      form.append("message", prompt || "");
      if (Object.keys(rest).length > 0) {
        for (const [k, v] of Object.entries(rest)) {
          form.append(k, String(v));
        }
      }
      if (media) {
        try {
          const arr = Array.isArray(media) ? media : [media];
          for (const item of arr) {
            let buf = null,
              name = "file.png",
              field = "images";
            if (Buffer.isBuffer(item)) {
              buf = item;
            } else if (typeof item === "string") {
              if (item.startsWith("http://") || item.startsWith("https://")) {
                const dl = await axios.get(item, {
                  responseType: "arraybuffer"
                });
                buf = Buffer.from(dl.data);
                if ((dl.headers["content-type"] || "").includes("pdf")) {
                  field = "pdfFiles";
                  name = "document.pdf";
                }
              } else if (item.startsWith("data:")) {
                const idx = item.indexOf(",");
                if (idx !== -1) {
                  buf = Buffer.from(item.slice(idx + 1), "base64");
                  if (item.slice(0, idx).includes("pdf")) {
                    field = "pdfFiles";
                    name = "document.pdf";
                  }
                }
              } else {
                buf = Buffer.from(item, "base64");
              }
            } else if (item && typeof item === "object") {
              buf = item.data ? Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data, "base64") : null;
              name = item.filename || name;
              field = item.fieldName || (name.endsWith(".pdf") ? "pdfFiles" : "images");
            }
            if (buf) form.append(field, buf, {
              filename: name
            });
          }
        } catch (err) {
          this._log("ERR_MED", err.message);
        }
      }
      this._log("SEND", `Post target -> ${ctx.sessionId}`);
      const resp = await axios.post(`${this.base}/sessions/interact`, form, {
        headers: this._hd(id, form.getHeaders()),
        responseType: "text"
      });
      const lines = (resp?.data || "").split("\n");
      const chunks = [];
      let resTxt = "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const raw = line.slice(5).trim();
            if (!raw) continue;
            const json = JSON.parse(raw);
            chunks.push(json);
            if (json?.type === "chunk" && json?.content) resTxt += json.content;
          } catch (e) {}
        }
      }
      return {
        status: true,
        result: resTxt,
        chunks: chunks,
        state: this._e64(ctx)
      };
    } catch (e) {
      this._log("CRIT_EXCEPTION", e.message);
      return {
        status: false,
        result: null,
        chunks: [],
        state: state || null,
        error: e?.response?.data || e.message
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
  const api = new ChatMax();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}