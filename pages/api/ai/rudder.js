import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import crypto from "crypto";
class RudderChat {
  constructor() {
    this.base = "https://rudder.chat";
    this.jar = {};
    this.tz = "Asia/Makassar";
    this.fp = this.uuid();
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
  enc() {
    const data = {
      jar: this.jar,
      fp: this.fp,
      tz: this.tz
    };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }
  dec(b64) {
    try {
      if (!b64 || typeof b64 !== "string") return false;
      console.log("[LOG] Memuat dan menerapkan sesi dari Base64 state...");
      const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
      if (parsed?.jar) this.jar = {
        ...this.jar,
        ...parsed.jar
      };
      if (parsed?.fp) this.fp = parsed.fp;
      if (parsed?.tz) this.tz = parsed.tz;
      return true;
    } catch (err) {
      console.log(`[ERR] Gagal decode base64 state: ${err?.message}`);
      return false;
    }
  }
  uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  async sc(path = "/login") {
    try {
      console.log(`[LOG] Mengambil halaman HTML: ${path}`);
      const res = await this.http.get(path, {
        headers: {
          ...this.std_headers,
          referer: `${this.base}/chat`
        }
      });
      const _ = cheerio.load(res?.data || "");
      const meta = _("input").map((i, el) => _(el).attr("name")).get();
      return meta;
    } catch (err) {
      console.log(`[ERR] Gagal scrape halaman: ${err?.message}`);
      return [];
    }
  }
  async slv(media) {
    try {
      console.log("[LOG] Memproses dan mengonversi media...");
      let buf = null;
      let mime = "image/png";
      let name = `file_${Date.now()}`;
      if (Buffer.isBuffer(media)) {
        buf = media;
        mime = "image/png";
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
      if (!buf) throw new Error("Format media tidak dapat diproses");
      let kind = "file";
      if (mime.startsWith("image/")) kind = "image";
      else if (mime.startsWith("video/")) kind = "video";
      else if (mime.startsWith("audio/")) kind = "audio";
      return {
        buffer: buf,
        bytes: buf.length,
        mime: mime,
        name: name,
        kind: kind
      };
    } catch (err) {
      console.log(`[ERR] Gagal auto-solve media: ${err?.message}`);
      throw err;
    }
  }
  async auth(email, pass) {
    try {
      console.log("[LOG] Menjalankan pre-check autentikasi...");
      await this.http.get(`/api/auth/signup-precheck?fp=${encodeURIComponent(this.fp)}`, {
        headers: {
          ...this.std_headers,
          referer: `${this.base}/login?next=%2Fchat%3Fq%3DHai&mode=signup`
        }
      });
      await this.sc("/login?next=%2Fchat%3Fq%3DHai&mode=signup");
      const uEmail = email ? email : `user_${Date.now()}@gmail.com`;
      const uPass = pass ? pass : `pass_${Date.now()}_secure123`;
      console.log(`[LOG] Mendaftarkan sesi akun baru (${uEmail})...`);
      const fd = new FormData();
      fd.append("_1_device_fingerprint", this.fp);
      fd.append("_1_timezone", this.tz);
      fd.append("_1_next", "/chat?q=Hai");
      fd.append("_1_email", uEmail);
      fd.append("_1_password", uPass);
      fd.append("_1_invite_code", "");
      fd.append("0", '[{"error":"Password needs at least 12 characters."},"$K1"]');
      await this.http.post("/login?next=%2Fchat%3Fq%3DHai&mode=signup", fd, {
        headers: {
          ...this.std_headers,
          ...fd.getHeaders(),
          accept: "text/x-component",
          "next-action": "608520e644a42d6892e7aae707fcabd1a5142b1fed",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22login%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2C4096%5D%7D%2Cnull%2Cnull%2C4096%5D%7D%2Cnull%2Cnull%2C4116%5D",
          origin: this.base,
          referer: `${this.base}/login?next=%2Fchat%3Fq%3DHai&mode=signup`,
          "x-deployment-id": "dpl_2ma2kquYgRKw9PHqjPdDoRSSkvD6"
        }
      });
      console.log("[LOG] Autentikasi berhasil disiapkan.");
      return true;
    } catch (err) {
      console.log(`[ERR] Gagal autentikasi: ${err?.message}`);
      return false;
    }
  }
  async ses(model = "th-rudder:free") {
    try {
      console.log("[LOG] Membuka direct session baru...");
      const res = await this.http.post("/api/direct-chat/sessions", {
        model: model,
        temporary: false
      }, {
        headers: {
          ...this.std_headers,
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/chat`
        }
      });
      const sid = res?.data?.session?.id || null;
      console.log(`[LOG] Session ID aktif: ${sid}`);
      return sid;
    } catch (err) {
      console.log(`[ERR] Gagal membuat session: ${err?.message}`);
      throw err;
    }
  }
  async upl(meta, sid) {
    try {
      console.log(`[LOG] Meminta presigned URL upload: ${meta?.name}...`);
      const reqPayload = {
        kind: meta?.kind || "image",
        name: meta?.name || "media.png",
        mime: meta?.mime || "image/png",
        bytes: meta?.bytes || 0
      };
      const prep = await this.http.post("/api/direct-chat/upload", reqPayload, {
        headers: {
          ...this.std_headers,
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/chat/${sid || ""}`
        }
      });
      const {
        upload_url,
        path,
        store
      } = prep?.data || {};
      if (!upload_url) throw new Error("Gagal mendapatkan upload_url");
      console.log(`[LOG] Mengunggah payload biner (${meta?.bytes} bytes)...`);
      await axios.put(upload_url, meta?.buffer, {
        headers: {
          "Content-Type": meta?.mime || "image/png",
          "Content-Length": meta?.bytes
        }
      });
      console.log(`[LOG] File ${meta?.name} sukses diunggah.`);
      return {
        kind: meta.kind,
        mime: meta.mime,
        name: meta.name,
        bytes: meta.bytes,
        storage_path: path,
        store: store || "r2"
      };
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
      console.log("[LOG] Menyiapkan parameter chat...");
      const hasAuthToken = Object.keys(this.jar).some(k => k.startsWith("sb-auth-auth-token"));
      if (!hasAuthToken) {
        await this.auth(rest?.email, rest?.password);
      } else {
        console.log("[LOG] Menggunakan sesi autentikasi yang sudah ada.");
      }
      const model = rest?.model ? rest.model : "th-rudder:free";
      const sessionId = rest?.session_id || await this.ses(model);
      const attachments = [];
      if (media) {
        const mediaList = Array.isArray(media) ? media : [media];
        console.log(`[LOG] Menemukan ${mediaList.length} media untuk diproses...`);
        for (const item of mediaList) {
          const solved = await this.slv(item);
          const uploaded = await this.upl(solved, sessionId);
          attachments.push(uploaded);
        }
      }
      const payload = {
        sessionId: sessionId,
        content: prompt,
        model: model,
        attachments: attachments,
        webSearch: rest?.web_search ? rest.web_search : "auto",
        tz: this.tz
      };
      console.log("[LOG] Mengirim data payload ke SSE stream...");
      const res = await this.http.post("/api/direct-chat/stream", payload, {
        headers: {
          ...this.std_headers,
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/chat/${sessionId}`
        },
        responseType: "stream"
      });
      return await new Promise((resolve, reject) => {
        let fullText = "";
        let doneData = {};
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
                if (parsed?.delta) {
                  fullText += parsed.delta;
                }
                if (parsed?.messageId || parsed?.usage) {
                  doneData = parsed;
                }
              } catch (_) {}
            }
          }
        });
        res.data.on("end", () => {
          console.log("[LOG] Stream selesai.");
          resolve({
            status: true,
            result: {
              session_id: sessionId,
              message_id: doneData?.messageId || null,
              model: doneData?.model || model,
              content: fullText.trim(),
              attachments_count: attachments.length,
              chunks: chunks,
              state: this.enc(),
              search_count: doneData?.searchCount || 0,
              input_tokens: doneData?.usage?.inputTokens || 0,
              output_tokens: doneData?.usage?.outputTokens || 0,
              billing: doneData?.billing || "free"
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
  const api = new RudderChat();
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