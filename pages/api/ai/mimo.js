import axios from "axios";
import crypto from "crypto";
class MimoClient {
  constructor() {
    try {
      this.k = "@sk=Rigel5729%2-diordnA";
      this.p = "info.camposha.mimo";
      this.b = "https://aiv1.clemy.top";
      this.mb = "https://apps.clemy.top";
      this.av = "3";
      this.ev = "android__15__API__35)";
      this.tz = "Asia/Makassar";
      this.cc = "IDR";
      this.co = "ID";
      this._dev();
      this.client = axios.create({
        baseURL: this.b,
        timeout: 6e4
      });
    } catch (err) {
      console.error(err);
    }
  }
  _dev() {
    try {
      this.androidId = crypto.randomBytes(8).toString("hex");
      this.hwFp = crypto.randomBytes(16).toString("hex");
      this.firstInstall = Date.now() - Math.floor(Math.random() * 30 + 1) * 864e5;
    } catch (err) {
      throw err;
    }
  }
  _xo(d, k) {
    try {
      const db = Buffer.isBuffer(d) ? d : Buffer.from(d, "utf-8");
      const kb = Buffer.from(k || this.k, "utf-8");
      const out = Buffer.alloc(db.length);
      for (let i = 0; i < db.length; i++) {
        out[i] = db[i] ^ kb[i % kb.length];
      }
      return out;
    } catch (err) {
      throw err;
    }
  }
  _en(s) {
    try {
      return this._xo(s || "").toString("base64") + "\n";
    } catch (err) {
      throw err;
    }
  }
  _sg(p, ts) {
    try {
      const dt = typeof p === "object" ? JSON.stringify(p) : p;
      const strToSign = `${dt}:${ts}`;
      return crypto.createHmac("sha256", this.k).update(strToSign).digest("base64");
    } catch (err) {
      throw err;
    }
  }
  async _mo(t) {
    try {
      const url = t === "vision" ? `${this.mb}/ai/mimo/vision_v1.json` : `${this.mb}/ai/mimo/models.json`;
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "okhttp/3.9.0",
          Connection: "Keep-Alive",
          Accept: "application/json",
          "Accept-Encoding": "gzip"
        }
      });
      return res?.data?.models || [];
    } catch (err) {
      throw err;
    }
  }
  async _im(s) {
    try {
      if (typeof s === "string" && s.startsWith("http")) {
        const res = await axios.get(s, {
          responseType: "arraybuffer"
        });
        return `data:image/jpeg;base64,${Buffer.from(res.data).toString("base64")}`;
      } else if (Buffer.isBuffer(s)) {
        return `data:image/jpeg;base64,${s.toString("base64")}`;
      } else if (typeof s === "string" && s.startsWith("data:image")) {
        return s;
      } else {
        return `data:image/jpeg;base64,${s}`;
      }
    } catch (err) {
      throw err;
    }
  }
  _da() {
    try {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    } catch (err) {
      throw err;
    }
  }
  _ui() {
    try {
      return crypto.randomUUID();
    } catch (err) {
      throw err;
    }
  }
  async generate({
    mode = "chat",
    prompt,
    messages,
    image,
    model,
    ...rest
  }) {
    try {
      const validModes = ["chat", "vision"];
      if (!validModes.includes(mode)) {
        return {
          status: false,
          result: null,
          chunks: [],
          error_message: `Mode "${mode}" is not supported. Use: ${validModes.join(", ")}.`,
          current_mode: mode
        };
      }
      const msgs = messages || (prompt ? [{
        role: "user",
        content: prompt
      }] : null);
      if (!msgs || msgs.length === 0) {
        return {
          status: false,
          result: null,
          chunks: [],
          error_message: "Prompt or messages required.",
          current_mode: mode
        };
      }
      const avl = await this._mo(mode);
      const defaultModel = mode === "vision" ? "mistralai/ministral-14b-2512" : "xiaomi/mimo-v2.5-pro";
      const targetModel = model || defaultModel;
      const matched = avl.find(m => m.id === targetModel) || avl[0];
      if (!targetModel || !avl.some(m => m.id === targetModel)) {
        return {
          status: false,
          result: null,
          chunks: [],
          error_message: `Model "${targetModel || "empty"}" not supported in ${mode}.`,
          current_mode: mode
        };
      }
      const processed = [];
      if (mode === "vision") {
        const hasSystem = msgs.some(m => m.role === "system");
        if (!hasSystem) {
          processed.push({
            role: "system",
            content: "You are a helpful AI assistant specialized in image analysis and visual understanding."
          });
          processed.push({
            role: "assistant",
            content: "👋 Welcome to AI Vision! I can analyze images and answer questions about them. Select an image to get started!"
          });
        }
      }
      for (const msg of msgs) {
        processed.push({
          role: msg?.role || "user",
          content: msg?.content || ""
        });
      }
      if (image) {
        const resolved = await this._im(image);
        if (mode === "vision") {
          const last = processed[processed.length - 1];
          if (last) {
            const textVal = typeof last.content === "string" ? last.content : prompt || "What's in this image?";
            last.content = JSON.stringify([{
              type: "text",
              text: textVal
            }, {
              type: "image_url",
              image_url: {
                url: resolved
              }
            }]);
          }
        }
      }
      let ed = "full_edition";
      let sub = "monthly";
      const rawUuid = `user_fi-${this.firstInstall}_uu-${this._ui()}_pa-mimo_ed-${ed}_apv-${this.av}_anv-${this.ev}`;
      const ts = Date.now();
      const payload = {
        package: this._en(this.p),
        uuid: this._en(rawUuid),
        edition: this._en(ed),
        subscription: this._en(sub),
        order_id: "",
        last_purchase_date: "",
        ai_model: this._en(matched.id),
        messages: processed,
        token_usage: 0,
        thread_char_count: processed.reduce((acc, cur) => acc + (typeof cur.content === "string" ? cur.content.length : 0), 0),
        is_premium: true,
        current_language: this._en("id"),
        app_version: this._en(this.av),
        request_date: this._en(this._da()),
        request_time: ts,
        first_install: this.firstInstall,
        version: this._en(this.ev),
        session_requests: 1,
        current_session_ads: 0,
        android_id: this._en(this.androidId),
        hw_fp: this._en(this.hwFp),
        is_rooted: false,
        is_emulator: false,
        tz: this._en(this.tz),
        currency: this._en(this.cc),
        country: this._en(this.co),
        gpa_id: "",
        extra: "",
        ...rest
      };
      const sig = this._sg(payload, ts);
      const ep = mode === "vision" ? "/chat-completion" : "/chat-completion-stream";
      const res = await this.client.post(ep, payload, {
        headers: {
          "User-Agent": "okhttp/3.9.0",
          Connection: "Keep-Alive",
          Accept: mode === "vision" ? "application/json" : "text/event-stream",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "X-Signature": sig,
          "X-Timestamp": String(ts)
        },
        responseType: mode === "vision" ? "json" : "text"
      });
      let finalResult = "";
      const chunks = [];
      if (mode === "vision") {
        finalResult = res?.data?.choices?.[0]?.message?.content || "";
        if (res?.data) {
          chunks.push(res.data);
        }
      } else {
        const lines = res?.data?.split("\n") || [];
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const chunk = JSON.parse(line.slice(6));
              const content = chunk?.choices?.[0]?.delta?.content || "";
              if (content) {
                finalResult += content;
              }
              chunks.push(chunk);
            } catch {}
          }
        }
      }
      return {
        status: true,
        result: finalResult,
        chunks: chunks,
        models: avl.map(m => m.id),
        mode: mode
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        chunks: [],
        error_message: err?.response?.data || err?.message,
        current_mode: mode
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MimoClient();
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