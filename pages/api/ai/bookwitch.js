import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class BookWitchChat {
  constructor() {
    this.base = "https://bookwitch.io";
    this.jar = {};
    this.history = [];
    this.std_headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: this.base,
      Pragma: "no-cache",
      Referer: `${this.base}/chat`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
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
  enc() {
    const data = {
      jar: this.jar,
      history: this.history
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
      if (parsed?.history) this.history = parsed.history;
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
          Referer: this.base
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
      const now = Date.now();
      if (!this.jar?.bw_cookie_consent) {
        this.jar["bw_cookie_consent"] = "accepted";
        changed = true;
      }
      if (!this.jar?._twsid) {
        this.jar["_twsid"] = `${now}-${Math.random() * 1e8 | 0}.1.${now}`;
        changed = true;
      }
      if (!this.jar?._twpid) {
        this.jar["_twpid"] = `tw.${now}.${Math.random() * 1e18 | 0}`;
        changed = true;
      }
      if (!this.jar?._rdt_uuid) {
        this.jar["_rdt_uuid"] = `${now}.${this.uuid()}`;
        changed = true;
      }
      if (changed) {
        console.log("[LOG] Menyiapkan cookies awal dan metadata chat...");
        await this.sc("/chat");
      }
      return true;
    } catch (err) {
      console.log(`[ERR] Gagal inisialisasi cookies: ${err?.message}`);
      return false;
    }
  }
  async slv(media) {
    try {
      console.log("[LOG] Memeriksa input media...");
      let buf = null;
      let mime = "image/png";
      if (Buffer.isBuffer(media)) {
        buf = media;
      } else if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          console.log(`[LOG] Mengunduh media dari URL: ${media}`);
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(res?.data);
          mime = res?.headers?.["content-type"] || mime;
        } else if (media.startsWith("data:")) {
          const parts = media.split(",");
          const m = parts[0]?.match(/:(.*?);/);
          mime = m ? m[1] : mime;
          buf = Buffer.from(parts[1] || "", "base64");
        } else {
          buf = Buffer.from(media, "base64");
        }
      }
      return buf ? {
        buffer: buf,
        mime: mime
      } : null;
    } catch (err) {
      console.log(`[ERR] Gagal memproses media: ${err?.message}`);
      return null;
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
      if (media) {
        const mediaList = Array.isArray(media) ? media : [media];
        for (const item of mediaList) {
          await this.slv(item);
        }
      }
      const currentMessages = rest?.messages || [...this.history, {
        role: "user",
        content: prompt
      }];
      const payload = {
        messages: currentMessages
      };
      console.log("[LOG] Mengirim prompt ke SSE stream endpoint...");
      const res = await this.http.post("/api/v1/tools/chat", payload, {
        headers: {
          ...this.std_headers,
          "Content-Type": "application/json"
        },
        responseType: "stream"
      });
      return await new Promise((resolve, reject) => {
        let fullText = "";
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
                if (parsed?.chunk) {
                  fullText += parsed.chunk;
                }
              } catch (_) {}
            }
          }
        });
        res.data.on("end", () => {
          console.log("[LOG] Stream selesai.");
          const reply = fullText.trim();
          this.history.push({
            role: "user",
            content: prompt
          });
          this.history.push({
            role: "assistant",
            content: reply
          });
          resolve({
            status: true,
            result: {
              content: reply,
              chunks: chunks,
              state: this.enc(),
              messages_count: this.history.length,
              total_chunks: chunks.length
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
  const api = new BookWitchChat();
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