import axios from "axios";
import * as cheerio from "cheerio";
class DeepSeek {
  constructor() {
    console.log(`[AskAi] [Constructor] Memulai pembuatan instance Axios...`);
    this.ax = axios.create({
      baseURL: "https://askai.free",
      timeout: 6e4
    });
    this.endpoint = "/api/chat";
    this.csrf = "";
    this.ck = "";
    this.ax.interceptors.response.use(res => {
      try {
        const sc = res.headers?.["set-cookie"];
        if (sc) {
          console.log(`[AskAi] [Interceptor] Mendeteksi set-cookie dari server.`);
          const parsed = (Array.isArray(sc) ? sc : [sc]).map(c => c.split(";")[0].trim()).join("; ");
          this.ck = [...new Map(`${this.ck}; ${parsed}`.split(";").map(v => v.split("=").map(s => s.trim())))].map(([k, v]) => `${k}=${v}`).join("; ");
          console.log(`[AskAi] [Interceptor] Cookie berhasil diperbarui secara lokal.`);
        }
      } catch (err) {
        console.error(`[AskAi] [Interceptor] Error saat memproses cookie:`, err.message);
      }
      return res;
    });
  }
  _load(st) {
    try {
      if (!st) {
        console.log(`[AskAi] [_load] State kosong, mengembalikan array history baru.`);
        return [];
      }
      const decoded = JSON.parse(Buffer.from(st, "base64").toString("utf-8"));
      console.log(`[AskAi] [_load] Berhasil memuat ${decoded.length} riwayat pesan dari Base64 state.`);
      return decoded;
    } catch (err) {
      console.error(`[AskAi] [_load] Gagal mengurai Base64 state:`, err.message);
      return [];
    }
  }
  _save(msg) {
    try {
      console.log(`[AskAi] [_save] Mengonversi ${msg.length} riwayat pesan ke Base64 state.`);
      return Buffer.from(JSON.stringify(msg)).toString("base64");
    } catch (err) {
      console.error(`[AskAi] [_save] Gagal mengonversi history ke Base64:`, err.message);
      return "";
    }
  }
  async init() {
    try {
      console.log(`[AskAi] [init] Memulai scraping halaman /deepseek-r1...`);
      const res = await this.ax.get("/deepseek-r1", {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10)"
        }
      });
      console.log(`[AskAi] [init] Memuat data HTML ke Cheerio...`);
      const $ = cheerio.load(res.data);
      this.csrf = $('meta[name="csrf-token"]').attr("content") || res.data.match(/csrfToken":"([^"]+)"/)?.[1] || "c5eedde5dc50cb446acf076b9a6e4bb47b09f21099b8c216c05aaa40e56b307b";
      console.log(`[AskAi] [init] Berhasil mengunci CSRF Token: ${this.csrf}`);
      return this._save([]);
    } catch (err) {
      console.error(`[AskAi] [init] Gagal melakukan inisialisasi awal:`, err.message);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    ...rest
  }) {
    console.log(`[AskAi] [chat] Proses chat dimulai.`);
    let history = this._load(state);
    try {
      if (!this.csrf) {
        console.log(`[AskAi] [chat] CSRF token kosong, memicu fungsi init().`);
        await this.init();
      }
      if (messages && Array.isArray(messages)) {
        console.log(`[AskAi] [chat] Mendeteksi array messages eksternal. Overriding history lokal.`);
        history = [...messages];
      }
      if (history.length === 0) {
        console.log(`[AskAi] [chat] Menginisiasi objek system message baru.`);
        history.push({
          role: "system",
          content: "You are DeepSeek R1, a helpful and friendly AI assistant. Current date: Monday, June 15, 2026."
        });
      }
      if (prompt) {
        console.log(`[AskAi] [chat] Menambahkan prompt user baru ke riwayat.`);
        history.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        messages: history,
        modelName: "DeepSeek R1",
        currentPagePath: "/deepseek-r1",
        ...rest
      };
      console.log(`[AskAi] [chat] Menyiapkan payload request POST ke endpoint: ${this.endpoint}`);
      const res = await this.ax.post(this.endpoint, payload, {
        headers: {
          "content-type": "application/json",
          cookie: this.ck || "",
          origin: "https://askai.free",
          referer: "https://askai.free/deepseek-r1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10)",
          "x-csrf-token": this.csrf
        }
      });
      console.log(`[AskAi] [chat] Request berhasil, memproses ekstraksi respons teks...`);
      const directText = res.data?.response || res.data?.choices?.[0]?.message?.content || JSON.stringify(res.data);
      history.push({
        role: "assistant",
        content: directText
      });
      console.log(`[AskAi] [chat] Selesai menambahkan respon asisten ke riwayat.`);
      return {
        status: true,
        result: directText,
        chunks: [directText],
        state: this._save(history)
      };
    } catch (err) {
      let errorMsg = err.message;
      const errData = err.response?.data;
      if (errData) {
        console.error(`[AskAi] [chat] Server merespon dengan status error.`);
        if (typeof errData === "object") {
          errorMsg = errData.message || errData.error || JSON.stringify(errData);
        } else {
          errorMsg = errData;
        }
      } else {
        console.error(`[AskAi] [chat] Terjadi error pada koneksi jaringan/internal:`, err.message);
      }
      return {
        status: false,
        result: errorMsg,
        chunks: [],
        state: this._save(history)
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
  const api = new DeepSeek();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}