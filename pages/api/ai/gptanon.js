import axios from "axios";
class GptAnon {
  constructor() {
    this.ax = axios.create({
      baseURL: "https://gptanon.com",
      timeout: 6e4
    });
  }
  _init() {
    if (this._initialized) return;
    this.ax.interceptors.response.use(res => {
      const sc = res.headers?.["set-cookie"];
      if (sc) {
        const cookies = Array.isArray(sc) ? sc : [sc];
        const parsed = cookies.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
        if (parsed) {
          this.ck = this.ck ? `${this.ck}; ${parsed}` : parsed;
          this.ck = [...new Map(this.ck.split(";").map(v => v.split("=").map(s => s.trim()))).entries()].map(([k, v]) => `${k}=${v}`).join("; ");
          this._log("Full cookie diperbarui:", this.ck);
        }
      }
      return res;
    }, err => Promise.reject(err));
    this._initialized = true;
  }
  _log(m, d = "") {
    console.log(`[${new Date().toISOString()}] [GptAnon] ${m}`, d);
  }
  _load(st) {
    try {
      if (!st) return;
      const dec = JSON.parse(Buffer.from(st, "base64").toString("utf-8"));
      this.ck = dec?.cookie || this.ck;
      this.sid = dec?.sessionId || this.sid;
      this._log("State loaded (Full Cookie & SessionId).");
    } catch {
      this._log("Gagal memuat state Base64.");
    }
  }
  _save() {
    return Buffer.from(JSON.stringify({
      cookie: this.ck || "",
      sessionId: this.sid || ""
    })).toString("base64");
  }
  _img(im) {
    if (!im) return null;
    if (typeof im === "string") {
      if (im.startsWith("http")) return {
        type: "url",
        url: im
      };
      if (im.startsWith("data:")) return {
        type: "base64",
        data: im
      };
      return {
        type: "base64",
        data: `data:image/jpeg;base64,${im}`
      };
    }
    if (Buffer.isBuffer(im)) {
      return {
        type: "base64",
        data: `data:image/jpeg;base64,${im.toString("base64")}`
      };
    }
    return null;
  }
  async init() {
    try {
      this._init();
      this._log("Melakukan inisialisasi session cookie dari halaman utama...");
      await this.ax.get("/chat", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }
      });
      return this._save();
    } catch (err) {
      this._log("Gagal inisialisasi cookie awal:", err.message);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    image,
    messages,
    ...rest
  }) {
    try {
      this._init();
      this._load(state);
      if (!this.ck) {
        this._log("Cookie kosong, menjalankan auto-init...");
        await this.init();
      }
      const models = rest?.modelIds || rest?.models || ["google/gemma-3-27b-it"];
      const chatHistory = messages || [];
      const attachments = [];
      if (image) {
        const imagesToProcess = Array.isArray(image) ? image : [image];
        for (const img of imagesToProcess) {
          const parsedImg = this._img(img);
          if (parsedImg) {
            attachments.push({
              id: Math.random().toString(36).substring(7),
              name: "attachment.jpg",
              type: "image/jpeg",
              url: parsedImg.type === "url" ? parsedImg.url : parsedImg.data
            });
          }
        }
      }
      const currentSessionId = rest?.sessionId || this.sid || null;
      const payload = {
        message: prompt || "",
        modelIds: Array.isArray(models) ? models : [models],
        deepSearchEnabled: rest?.deepSearchEnabled || false,
        ...attachments.length ? {
          attachments: attachments
        } : {},
        ...currentSessionId ? {
          sessionId: currentSessionId
        } : {}
      };
      this._log("Mengirim request payload stream...");
      const res = await this.ax.post("/api/chat/stream", payload, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          cookie: this.ck || "",
          origin: "https://gptanon.com",
          referer: "https://gptanon.com/chat",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        },
        responseType: "stream"
      });
      let fullText = "";
      const tokenChunks = [];
      await new Promise((resolve, reject) => {
        let buffer = "";
        res.data.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const rawJson = trimmed.slice(6);
            try {
              const parsed = JSON.parse(rawJson);
              if (parsed?.type === "session" && parsed?.sessionId) {
                this.sid = parsed.sessionId;
                this._log("Session ID baru berhasil dikunci:", this.sid);
              }
              if (parsed?.type === "token" && parsed?.token) {
                fullText += parsed.token;
                tokenChunks.push(parsed.token);
              }
              if (parsed?.type === "complete" && parsed?.content) {
                fullText = parsed.content;
              }
            } catch {}
          }
        });
        res.data.on("end", () => resolve());
        res.data.on("error", err => reject(err));
      });
      return {
        status: true,
        result: fullText,
        chunks: tokenChunks,
        state: this._save()
      };
    } catch (err) {
      this._log("Error pada proses chat:", err?.response?.data || err?.message);
      return {
        status: false,
        result: err?.response?.data || err?.message,
        chunks: [],
        state: this._save()
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
  const api = new GptAnon();
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