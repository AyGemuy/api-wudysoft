import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import crypto from "crypto";
class NoRestrictionsChat {
  constructor() {
    this.base = "https://aiwithnorestrictions.com";
    this.jar = {};
    this.chat_id = null;
    this.std_headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.http = axios.create({
      baseURL: this.base,
      headers: this.std_headers
    });
    this.http.interceptors.request.use(cfg => {
      const cStr = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cStr) {
        cfg.headers = cfg.headers || {};
        cfg.headers["Cookie"] = cStr;
      }
      return cfg;
    });
    this.http.interceptors.response.use(res => {
      const sc = res?.headers?.["set-cookie"] || [];
      const list = Array.isArray(sc) ? sc : [sc];
      list.forEach(c => {
        if (!c) return;
        const [pair] = c.split(";");
        const [k, ...v] = pair.split("=");
        if (k) this.jar[k.trim()] = v.join("=").trim();
      });
      return res;
    });
  }
  uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  rnd(len = 14) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_";
    return Array.from({
      length: len
    }, () => chars[Math.random() * chars.length | 0]).join("");
  }
  enc() {
    const data = {
      jar: this.jar,
      chat_id: this.chat_id
    };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }
  dec(b64) {
    try {
      if (!b64 || typeof b64 !== "string") return false;
      console.log("[LOG] Memulihkan session state dari Base64...");
      const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
      if (parsed?.jar) this.jar = {
        ...this.jar,
        ...parsed.jar
      };
      if (parsed?.chat_id) this.chat_id = parsed.chat_id;
      return true;
    } catch (err) {
      console.log(`[ERR] Gagal decode state: ${err?.message}`);
      return false;
    }
  }
  async sc(path = "/chat") {
    try {
      console.log(`[LOG] Mengambil halaman HTML: ${path}`);
      const res = await this.http.get(path, {
        headers: {
          ...this.std_headers,
          referer: this.base
        }
      });
      const _ = cheerio.load(res?.data || "");
      const meta = _("meta").map((i, el) => _(el).attr("name") || _(el).attr("property")).get();
      return meta;
    } catch (err) {
      console.log(`[ERR] Gagal scrape halaman: ${err?.message}`);
      return [];
    }
  }
  async init() {
    try {
      let changed = false;
      if (!this.jar?.uid) {
        this.jar["uid"] = this.uuid();
        changed = true;
      }
      if (!this.jar?.si_usr_id || !this.jar?.si_ses_id) {
        const sid = this.rnd(14);
        this.jar["si_usr_id"] = this.jar["si_usr_id"] || sid;
        this.jar["si_ses_id"] = this.jar["si_ses_id"] || sid;
        changed = true;
      }
      if (changed) {
        console.log("[LOG] Inisialisasi sesi guest & scrape cookies awal...");
        await this.sc("/chat");
      }
      return true;
    } catch (err) {
      console.log(`[ERR] Gagal inisialisasi sesi: ${err?.message}`);
      return false;
    }
  }
  async slv(media) {
    try {
      console.log("[LOG] Memproses dan mengonversi media...");
      let buf = null;
      let mime = "image/png";
      let name = `IMG-${Date.now()}`;
      if (Buffer.isBuffer(media)) {
        buf = media;
        name += ".png";
      } else if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          console.log(`[LOG] Mengunduh media: ${media}`);
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(res?.data);
          mime = res?.headers?.["content-type"] || "image/png";
          const ext = mime.split("/")[1] || "png";
          name += `.${ext}`;
        } else if (media.startsWith("data:")) {
          const parts = media.split(",");
          const m = parts[0]?.match(/:(.*?);/);
          mime = m ? m[1] : "image/png";
          buf = Buffer.from(parts[1] || "", "base64");
          const ext = mime.split("/")[1] || "png";
          name += `.${ext}`;
        } else {
          buf = Buffer.from(media, "base64");
          name += ".png";
        }
      }
      if (!buf) throw new Error("Format media tidak valid");
      return {
        buffer: buf,
        mime: mime,
        name: name
      };
    } catch (err) {
      console.log(`[ERR] Gagal auto-solve media: ${err?.message}`);
      throw err;
    }
  }
  async upl(meta) {
    try {
      console.log(`[LOG] Mengunggah lampiran: ${meta?.name}...`);
      const fd = new FormData();
      fd.append("file", meta?.buffer, {
        filename: meta?.name || "upload.png",
        contentType: meta?.mime || "image/png"
      });
      const res = await this.http.post("/api/upload", fd, {
        headers: {
          ...this.std_headers,
          ...fd.getHeaders(),
          origin: this.base,
          referer: `${this.base}/chat`
        }
      });
      const fileId = res?.data?.file_id || null;
      if (!fileId) throw new Error("Gagal mendapatkan file_id dari respon upload");
      console.log(`[LOG] File sukses diunggah dengan file_id: ${fileId}`);
      return fileId;
    } catch (err) {
      console.log(`[ERR] Gagal unggah lampiran: ${err?.message}`);
      throw err;
    }
  }
  async chat({
    prompt,
    media,
    ...rest
  }) {
    try {
      if (!prompt) {
        return {
          status: false,
          result: {
            error_message: "Prompt tidak boleh kosong"
          }
        };
      }
      const b64State = rest?.state ? rest.state : null;
      if (b64State) {
        this.dec(b64State);
      }
      await this.init();
      const model = rest?.model ? rest.model : "C";
      const persona = rest?.persona ? rest.persona : "normal";
      const mode = rest?.mode ? rest.mode : "usual";
      const chatId = rest?.chat_id ? rest.chat_id : this.chat_id;
      const attachments = [];
      if (media) {
        const mediaList = Array.isArray(media) ? media : [media];
        console.log(`[LOG] Memproses ${mediaList.length} media lampiran...`);
        for (const item of mediaList) {
          const solved = await this.slv(item);
          const fileId = await this.upl(solved);
          if (fileId) attachments.push(fileId);
        }
      }
      const payload = {
        user_input: prompt,
        mode: mode,
        model: model,
        persona: persona,
        max_turns: rest?.max_turns ? rest.max_turns : 6,
        chat_id: chatId,
        attachments: attachments,
        regenerate: rest?.regenerate || false,
        edit: rest?.edit || false,
        edit_mid: rest?.edit_mid || null,
        via: rest?.via ? rest.via : "typed"
      };
      console.log("[LOG] Mengirim prompt ke stream dispatch...");
      const res = await this.http.post("/api/dispatch", payload, {
        headers: {
          ...this.std_headers,
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/chat`
        },
        responseType: "stream"
      });
      return await new Promise((resolve, reject) => {
        let fullContent = "";
        let resultChatId = chatId;
        let messageId = null;
        const chunks = [];
        res.data.on("data", chunk => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const rawData = line.slice(6).trim();
              if (!rawData) continue;
              try {
                const parsed = JSON.parse(rawData);
                chunks.push(parsed);
                if (parsed?.type === "chat_meta" && parsed?.chat_id) {
                  resultChatId = parsed.chat_id;
                  this.chat_id = parsed.chat_id;
                }
                if (parsed?.type === "user" && parsed?.message_id) {
                  messageId = parsed.message_id;
                }
                if (parsed?.type === "delta" && parsed?.chunk) {
                  fullContent += parsed.chunk;
                }
                if (parsed?.type === "message" && parsed?.content) {
                  fullContent = parsed.content;
                }
              } catch (_) {}
            }
          }
        });
        res.data.on("end", () => {
          console.log("[LOG] Stream selesai diterima.");
          resolve({
            status: true,
            result: {
              chat_id: resultChatId,
              message_id: messageId,
              model: model,
              persona: persona,
              content: fullContent.trim(),
              attachments_count: attachments.length,
              chunks: chunks,
              state: this.enc()
            }
          });
        });
        res.data.on("error", err => {
          console.log(`[ERR] Stream error: ${err?.message}`);
          reject(err);
        });
      });
    } catch (err) {
      console.log(`[ERR] Exception pada chat: ${err?.message}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data || err?.message || "Internal error"
        }
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
  const api = new NoRestrictionsChat();
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