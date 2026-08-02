import axios from "axios";
class AnswersAI {
  constructor() {
    try {
      console.log("[Proses] Inisialisasi client AnswersAI...");
      this.base = "https://api.answersai.com";
      this.cookies = {};
      this.client = axios.create({
        baseURL: this.base,
        headers: {
          "User-Agent": "realme RMX3890; Android/15; SDK 35",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json"
        }
      });
      this.client.interceptors.response.use(res => {
        try {
          const sc = res.headers["set-cookie"];
          if (sc) {
            for (const c of sc) {
              const [part] = c.split(";");
              const [k, v] = part.split("=");
              if (k && v) {
                this.cookies[k.trim()] = v.trim();
              }
            }
          }
        } catch (err) {
          console.log(`[Error] Gagal memproses interceptor cookie: ${err.message}`);
        }
        return res;
      }, err => Promise.reject(err));
    } catch (err) {
      console.log(`[Error] Inisialisasi constructor gagal: ${err.message}`);
    }
  }
  _enc(o) {
    try {
      console.log("[Proses] Melakukan encoding state ke base64...");
      return Buffer.from(JSON.stringify(o || {})).toString("base64");
    } catch (err) {
      console.log(`[Error] Encoding state gagal: ${err.message}`);
      return "";
    }
  }
  _dec(s) {
    try {
      console.log("[Proses] Melakukan decoding state dari base64...");
      return JSON.parse(Buffer.from(s || "", "base64").toString("utf-8"));
    } catch (err) {
      console.log(`[Error] Decoding state gagal: ${err.message}`);
      return {};
    }
  }
  _cookie() {
    try {
      console.log("[Proses] Menyusun header cookie...");
      return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (err) {
      console.log(`[Error] Penyusunan cookie gagal: ${err.message}`);
      return "";
    }
  }
  async _img(img) {
    try {
      console.log("[Proses] Memproses resolusi gambar...");
      if (Buffer.isBuffer(img)) {
        return `data:image/png;base64,${img.toString("base64")}`;
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[Proses] Mengunduh gambar eksternal: ${img}`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/png";
          return `data:${mime};base64,${Buffer.from(res.data).toString("base64")}`;
        }
        if (img.startsWith("data:image")) {
          return img;
        }
        return `data:image/png;base64,${img}`;
      }
      return null;
    } catch (err) {
      console.log(`[Error] Gagal memproses gambar: ${err.message}`);
      return null;
    }
  }
  async mail() {
    console.log("[Proses] Menghubungi mail server untuk pembuatan kotak masuk...");
    try {
      const res = await axios.get(`https://wudysoft.my.id/api/mails/v9?action=create`);
      const email = res.data?.email || null;
      console.log(`[Proses] Email sementara dibuat: ${email}`);
      return email;
    } catch (err) {
      console.log(`[Error] Pembuatan email sementara gagal: ${err.message}`);
      throw err;
    }
  }
  async otp(email) {
    console.log(`[Proses] Memeriksa OTP pada email: ${email}`);
    try {
      const res = await axios.get("https://wudysoft.my.id/api/mails/v9?action=message&email=" + email);
      const data = res.data?.data || [];
      for (const msg of data) {
        const text = msg?.text_content || "";
        const match = text.match(/\b\d{6}\b/);
        if (match) {
          const code = match[0];
          console.log(`[Proses] Kode OTP didapatkan: ${code}`);
          return code;
        }
      }
      return null;
    } catch (err) {
      console.log(`[Error] Gagal membaca pesan masuk OTP: ${err.message}`);
      throw err;
    }
  }
  async login(email) {
    console.log("[Proses] Menjalankan alur otentikasi otomatis...");
    try {
      const reqEmail = await this.client.post("/auth/email", {
        email: email
      });
      const token = reqEmail.data?.token;
      if (!token) throw new Error("Token otentikasi tidak valid");
      let code = null;
      for (let i = 0; i < 30; i++) {
        console.log(`[Proses] Polling OTP ke-${i + 1}...`);
        code = await this.otp(email);
        if (code) break;
        await new Promise(r => setTimeout(r, 3e3));
      }
      if (!code) throw new Error("Kode OTP tidak diterima dalam batas waktu");
      console.log("[Proses] Mengirim kredensial login...");
      await this.client.post("/auth/login", {
        otp: code,
        token: token
      });
      const stateObj = {
        email: email,
        cookies: this.cookies,
        token: token
      };
      return this._enc(stateObj);
    } catch (err) {
      console.log(`[Error] Alur otentikasi gagal: ${err.message}`);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    image,
    ...rest
  }) {
    console.log("[Proses] Menjalankan fungsi chat...");
    try {
      let active = state ? this._dec(state) : null;
      if (!active || !active.cookies) {
        console.log("[Proses] State kosong atau kedalawarsa. Membuat sesi baru...");
        const email = await this.mail();
        if (!email) throw new Error("Gagal mendapatkan email baru");
        const newState = await this.login(email);
        active = this._dec(newState);
      }
      this.cookies = active.cookies || {};
      const token = this.cookies["x-access-token"] || "";
      const listImg = Array.isArray(image) ? image : image ? [image] : [];
      const resolved = [];
      for (const img of listImg) {
        const resImg = await this._img(img);
        if (resImg) resolved.push(resImg);
      }
      const payload = {
        detail_level: "default",
        question: prompt || "hai",
        ...rest
      };
      if (resolved.length > 0) {
        payload.image = resolved[0];
      }
      console.log("[Proses] Mengirim data ke API endpoint...");
      const response = await this.client.post("/ocr/chat", payload, {
        headers: {
          "x-access-token": token,
          Cookie: this._cookie()
        },
        responseType: "stream"
      });
      const chunks = [];
      let lastMeta = {};
      let finalAnswer = "";
      let buffer = "";
      let answerId = null;
      let chatId = null;
      let worksheet = null;
      await new Promise((resolve, reject) => {
        response.data.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;
            if (cleanLine.startsWith("data:")) {
              const dataStr = cleanLine.slice(5).trim();
              if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  chunks.push(parsed);
                  if (parsed?.final_answer) {
                    finalAnswer = parsed.final_answer;
                  }
                  lastMeta = {
                    ...lastMeta,
                    ...parsed
                  };
                } catch {}
              }
            } else {
              const splitParts = cleanLine.split(":");
              const key = splitParts[0]?.trim();
              const val = splitParts.slice(1).join(":")?.trim();
              if (key && val) {
                if (key === "answerId") answerId = val;
                if (key === "chatId") chatId = val;
                if (key === "worksheet") worksheet = val;
              }
            }
          }
        });
        response.data.on("end", () => {
          console.log("[Proses] Penerimaan data stream selesai.");
          resolve();
        });
        response.data.on("error", err => {
          console.log(`[Error] Kendala pada aliran stream: ${err.message}`);
          reject(err);
        });
      });
      const updatedState = this._enc({
        email: active.email,
        cookies: this.cookies,
        token: active.token
      });
      return {
        status_code: response.status || 200,
        final_result: finalAnswer || lastMeta?.final_answer || lastMeta?.explanation || "",
        data_chunks: chunks,
        chat_history: [],
        session_state: updatedState,
        answer_id: answerId || lastMeta?.answerId || null,
        chat_id: chatId || lastMeta?.chatId || null,
        worksheet_id: worksheet || lastMeta?.worksheet || null,
        meta_info: lastMeta
      };
    } catch (err) {
      console.log(`[Error] Terjadi kegagalan pada proses chat: ${err.message}`);
      return {
        status_code: err.response?.status || 500,
        final_result: "Terjadi kesalahan sistem internal.",
        data_chunks: [],
        chat_history: [],
        session_state: state || "",
        error_message: err.message
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
  const api = new AnswersAI();
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