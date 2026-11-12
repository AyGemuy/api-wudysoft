import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class NoTrack {
  constructor() {
    this.jar = {};
    try {
      console.log("[NoTrack] [constructor] Menginisialisasi Axios client...");
      this.client = axios.create({
        baseURL: "https://notrack.ai",
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          referer: "https://notrack.ai/chat"
        }
      });
      this.client.interceptors.request.use(cfg => {
        try {
          const cookieStr = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
          if (cookieStr) {
            cfg.headers["cookie"] = cookieStr;
          }
        } catch (err) {
          console.log("[NoTrack] [request-interceptor] Gagal menyematkan cookies:", err.message);
        }
        return cfg;
      }, err => {
        console.log("[NoTrack] [request-interceptor] Request digagalkan:", err.message);
        return Promise.reject(err);
      });
      this.client.interceptors.response.use(res => {
        try {
          const rawCookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
          if (rawCookies) {
            const cookieList = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
            cookieList.forEach(str => {
              const parts = str.split(";");
              const firstPart = parts[0] || "";
              const eqIdx = firstPart.indexOf("=");
              if (eqIdx !== -1) {
                const k = firstPart.slice(0, eqIdx).trim();
                const v = firstPart.slice(eqIdx + 1).trim();
                const lowerK = k.toLowerCase();
                if (!["path", "domain", "expires", "secure", "httponly", "samesite"].includes(lowerK)) {
                  this.jar[k] = v;
                }
              }
            });
          }
        } catch (err) {
          console.log("[NoTrack] [response-interceptor] Kendala saat mengekstrak cookies:", err.message);
        }
        return res;
      }, err => {
        console.log("[NoTrack] [response-interceptor] Gagal menerima respons dari server:", err?.message || err);
        return Promise.reject(err);
      });
    } catch (err) {
      console.log("[NoTrack] [constructor] Gagal membangun instance client:", err.message);
    }
  }
  _genId() {
    try {
      console.log("[NoTrack] [_genId] Membuat tracking ID baru...");
      return crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15);
    } catch (err) {
      console.log("[NoTrack] [_genId] Gagal merancang tracking ID:", err.message);
      return "gen_" + Date.now();
    }
  }
  _uuid() {
    try {
      console.log("[NoTrack] [_uuid] Membuat token UUID...");
      return crypto.randomUUID();
    } catch (err) {
      console.log("[NoTrack] [_uuid] Gagal membuat UUID via crypto, beralih ke fallback...");
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    }
  }
  _dec(st) {
    try {
      console.log("[NoTrack] [_dec] Mendekode data state dari base64...");
      return st ? JSON.parse(Buffer.from(st, "base64").toString("utf-8")) : {};
    } catch (err) {
      console.log("[NoTrack] [_dec] Gagal mendekode state:", err.message);
      return {};
    }
  }
  _enc(obj) {
    try {
      console.log("[NoTrack] [_enc] Melakukan serialisasi state ke format base64...");
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (err) {
      console.log("[NoTrack] [_enc] Gagal mengodekan state:", err.message);
      return "";
    }
  }
  async _solve(img) {
    try {
      console.log("[NoTrack] [_solve] Memulai pemecahan berkas gambar...");
      let buf;
      let mime = "image/jpeg";
      const randHex = crypto.randomBytes(8).toString("hex");
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[NoTrack] [_solve] Mengunduh gambar dari URL...");
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(res.data);
          mime = res.headers["content-type"] || mime;
        } else if (img.startsWith("data:")) {
          console.log("[NoTrack] [_solve] Mengonversi data URI base64...");
          const match = img.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
          if (match) {
            mime = match[1];
            buf = Buffer.from(match[2], "base64");
          }
        } else {
          console.log("[NoTrack] [_solve] Mengonversi raw string base64...");
          buf = Buffer.from(img, "base64");
        }
      } else if (Buffer.isBuffer(img)) {
        console.log("[NoTrack] [_solve] Membaca data buffer gambar langsung...");
        buf = img;
      }
      if (!buf) {
        throw new Error("Hasil pemecahan buffer gambar kosong.");
      }
      const ext = mime.split("/")[1] || "jpg";
      const filename = `${randHex}.${ext}`;
      console.log(`[NoTrack] [_solve] Berhasil menguraikan media gambar: ${filename} (${mime})`);
      return {
        buf: buf,
        mime: mime,
        filename: filename
      };
    } catch (err) {
      console.log("[NoTrack] [_solve] Kendala saat memproses berkas gambar:", err.message);
      throw err;
    }
  }
  async _init(prompt) {
    try {
      const q = prompt || "Hau";
      console.log(`[NoTrack] [_init] Menjalankan inisialisasi sesi untuk query: ${q}`);
      if (!this.jar["si_usr_id"]) this.jar["si_usr_id"] = this._genId();
      if (!this.jar["si_ses_id"]) this.jar["si_ses_id"] = this._genId();
      console.log("[NoTrack] [_init] Mengirim pemicu awal halaman chat...");
      await this.client.get(`/chat?q=${encodeURIComponent(q)}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
      });
      console.log("[NoTrack] [_init] Mengambil daftar percakapan aktif & cookie tambahan...");
      const resChats = await this.client.get("/api/chats");
      const chats = resChats.data?.chats || [];
      const chatId = chats[0]?.chat_id || this._uuid();
      console.log(`[NoTrack] [_init] Inisialisasi sukses. User ID: ${resChats.data?.user_id || "null"}, Chat ID: ${chatId}`);
      return chatId;
    } catch (err) {
      console.log("[NoTrack] [_init] Gagal menginisialisasi sesi:", err.message);
      throw err;
    }
  }
  async _upload(img) {
    try {
      console.log("[NoTrack] [_upload] Mempersiapkan data berkas lampiran...");
      const {
        buf,
        mime,
        filename
      } = await this._solve(img);
      console.log(`[NoTrack] [_upload] Memulai unggah berkas: ${filename}`);
      const form = new FormData();
      form.append("file", buf, {
        filename: filename,
        contentType: mime
      });
      const res = await this.client.post("/api/upload", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const fileId = res.data?.file_id || null;
      console.log(`[NoTrack] [_upload] Unggah selesai. ID: ${fileId}`);
      return fileId;
    } catch (err) {
      console.log("[NoTrack] [_upload] Gagal mengunggah gambar:", err.message);
      return null;
    }
  }
  async chat({
    state,
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log("[NoTrack] [chat] Menyiapkan transaksi chat baru...");
      const activeState = this._dec(state);
      this.jar = activeState.jar || {};
      const hasSession = this.jar["si_usr_id"] && this.jar["si_ses_id"];
      if (!hasSession) {
        console.log("[NoTrack] [chat] Sesi state kosong, mengeksekusi inisialisasi awal...");
        const newChatId = await this._init(prompt);
        activeState.chat_id = newChatId;
        activeState.jar = {
          ...this.jar
        };
      }
      let chatId = activeState.chat_id || this._uuid();
      activeState.chat_id = chatId;
      const attachments = [];
      if (image) {
        console.log("[NoTrack] [chat] Input gambar terdeteksi, memproses antrean unggahan...");
        const images = Array.isArray(image) ? image : [image];
        for (const img of images) {
          const fid = await this._upload(img);
          if (fid) {
            attachments.push(fid);
          }
        }
      }
      console.log(`[NoTrack] [chat] Mengirim data payload dispatch untuk Chat ID: ${chatId}`);
      const payload = {
        user_input: prompt,
        mode: rest.mode || "usual",
        model: rest.model || "C",
        persona: rest.persona || "normal",
        max_turns: rest.max_turns || 6,
        chat_id: chatId,
        attachments: attachments,
        regenerate: rest.regenerate || false,
        edit: rest.edit || false,
        edit_mid: rest.edit_mid || null
      };
      const res = await this.client.post("/api/dispatch", payload, {
        responseType: "stream"
      });
      return new Promise((resolve, reject) => {
        try {
          let result = "";
          const chunks = [];
          let buffer = "";
          res.data.on("data", chunk => {
            try {
              buffer += chunk.toString();
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const cleaned = line.slice(6).trim();
                  if (!cleaned) continue;
                  try {
                    const parsed = JSON.parse(cleaned);
                    chunks.push(parsed);
                    if (parsed.type === "chat_meta" && parsed.chat_id) {
                      chatId = parsed.chat_id;
                      activeState.chat_id = chatId;
                      console.log(`[NoTrack] [chat] Sinkronisasi Chat ID dinamis dari server: ${chatId}`);
                    }
                    if (parsed.type === "delta") {
                      result += parsed.chunk || "";
                    } else if (parsed.type === "message") {
                      result = parsed.content || result;
                    }
                  } catch (e) {}
                }
              }
            } catch (err) {
              console.log("[NoTrack] [chat] Gagal memproses data stream:", err.message);
            }
          });
          res.data.on("end", () => {
            try {
              console.log("[NoTrack] [chat] Aliran stream data dispatch selesai.");
              activeState.jar = {
                ...this.jar
              };
              const updatedState = this._enc(activeState);
              resolve({
                status: "success",
                result: result.trim(),
                chunks: chunks,
                state: updatedState
              });
            } catch (err) {
              reject(err);
            }
          });
          res.data.on("error", err => {
            reject(err);
          });
        } catch (promiseErr) {
          reject(promiseErr);
        }
      });
    } catch (err) {
      console.log("[NoTrack] [chat] Kendala kritis saat memproses chat:", err?.message || err);
      return {
        status: "error",
        result: err?.message || String(err),
        chunks: [],
        state: state || ""
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
  const api = new NoTrack();
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