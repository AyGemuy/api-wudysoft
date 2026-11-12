import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
const BASE = "https://chatx.ai";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class ChatX {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      baseURL: BASE,
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": UA,
        "accept-language": "id-ID"
      }
    }));
    this.token = null;
    this.userId = null;
    this.chatId = null;
    this.convId = null;
    this.assConvId = null;
  }
  headers(customHeaders = {}) {
    return {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-csrf-token": this.token,
      "x-requested-with": "XMLHttpRequest",
      referer: `${BASE}/gpt`,
      ...customHeaders
    };
  }
  body(obj) {
    return new URLSearchParams({
      _token: this.token,
      ...obj
    });
  }
  log(tag, ...msg) {
    console.log(`[${tag}]`, ...msg);
  }
  save() {
    try {
      const b64 = Buffer.from(JSON.stringify({
        cookies: this.jar.toJSON(),
        token: this.token,
        userId: this.userId,
        chatId: this.chatId,
        convId: this.convId,
        assConvId: this.assConvId
      })).toString("base64");
      this.log("save", "State berhasil diexport, panjang:", b64.length);
      return b64;
    } catch (e) {
      this.log("save", "ERROR gagal export state:", e.message);
      return null;
    }
  }
  load(b64) {
    try {
      const s = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      this.jar = CookieJar.fromJSON(JSON.stringify(s.cookies));
      this.token = s.token;
      this.userId = s.userId;
      this.chatId = s.chatId ? String(s.chatId) : null;
      this.convId = s.convId ? String(s.convId) : null;
      this.assConvId = s.assConvId ? String(s.assConvId) : null;
      this.log("load", "State loaded -> user:", this.userId, "| chat:", this.chatId, "| conv:", this.convId, "| assConv:", this.assConvId);
      return true;
    } catch (e) {
      this.log("load", "ERROR gagal muat state:", e.message);
      return false;
    }
  }
  async connect() {
    try {
      this.log("connect", "Melakukan GET ke /gpt...");
      const res = await this.http.get("/gpt", {
        headers: {
          accept: "text/html"
        }
      });
      const $ = cheerio.load(res.data);
      this.token = $('meta[name="csrf-token"]').attr("content") || null;
      this.userId = $('input[name="user_id"]').val() || $("#user_id").val() || null;
      if (!this.chatId) {
        const htmlId = $('input[name="chats_id"]').val() || $("#chats_id").val() || null;
        if (htmlId) this.chatId = String(htmlId);
      }
      this.log("connect", "Hasil -> token:", this.token, "| userId:", this.userId, "| chatId:", this.chatId);
      if (!this.token) throw new Error("Gagal mendapatkan CSRF Token via Cheerio");
      if (!this.userId) throw new Error("Gagal mendapatkan User ID via Cheerio");
    } catch (e) {
      this.log("connect", "ERROR:", e.message);
      throw e;
    }
  }
  async create() {
    try {
      this.log("create", "Melakukan POST ke /newchat...");
      const res = await this.http.post("/newchat", this.body({
        user_id: this.userId,
        is_manual: 0
      }), {
        headers: this.headers()
      });
      const $ = cheerio.load(res.data);
      const extractedId = $("[data-action='chatedit']").first().attr("data-id");
      if (!extractedId) {
        throw new Error("Murni Cheerio gagal menemukan id room dari HTML response /newchat.");
      }
      this.chatId = String(extractedId).trim();
      this.log("create", "Room baru berhasil didapatkan via server:", this.chatId);
    } catch (e) {
      this.log("create", "FATAL ERROR:", e.message);
      throw e;
    }
  }
  async open() {
    try {
      this.log("open", "Melakukan sinkronisasi room via /openconversions untuk id:", this.chatId);
      const res = await this.http.post("/openconversions", this.body({
        id: this.chatId,
        page: 0
      }), {
        headers: this.headers()
      });
      if (res.data?.chats?.id) {
        this.chatId = String(res.data.chats.id);
      }
      this.log("open", "Sinkronisasi room sukses");
    } catch (e) {
      this.log("open", "ERROR sinkronisasi room:", e.message);
      throw e;
    }
  }
  async setModel(model) {
    try {
      this.log("model", "Mengubah pengaturan model aktif ke:", model);
      await this.http.post("/user_model", this.body({
        model: model
      }), {
        headers: this.headers()
      });
      this.log("model", "Model sukses diterapkan");
    } catch (e) {
      this.log("model", "ERROR gagal menerapkan model:", e.message);
      throw e;
    }
  }
  async setTitle(title) {
    try {
      const shortTitle = title.slice(0, 50);
      this.log("title", "Mengubah judul obrolan menjadi:", shortTitle);
      await this.http.post("/editchat", this.body({
        id: this.chatId,
        title: shortTitle
      }), {
        headers: this.headers()
      });
      this.log("title", "Judul room diperbarui");
    } catch (e) {
      this.log("title", "ERROR gagal update judul:", e.message);
    }
  }
  async send(customPayload = {}) {
    try {
      this.log("send", "Mengirim data prompt ke /sendchat...");
      const defaultPayload = {
        user_id: this.userId,
        chats_id: this.chatId,
        is_web: "0",
        is_youtube: "0"
      };
      const res = await this.http.post("/sendchat", this.body({
        ...defaultPayload,
        ...customPayload
      }), {
        headers: this.headers()
      });
      if (res.data?.conversions_id) this.convId = String(res.data.conversions_id);
      if (res.data?.ass_conversions_id) this.assConvId = String(res.data.ass_conversions_id);
      this.log("send", "Respons sendchat -> convId:", this.convId, "| assConvId:", this.assConvId);
      return res.data;
    } catch (e) {
      this.log("send", "ERROR gagal mengirim payload chat:", e.message);
      throw e;
    }
  }
  async stream(customParams = {}) {
    try {
      this.log("stream", "Menginisialisasi koneksi Server-Sent Events (SSE)...");
      const defaultParams = {
        user_id: this.userId,
        chats_id: this.chatId,
        conversions_id: this.convId,
        ass_conversions_id: this.assConvId,
        is_web: "0",
        is_youtube: "0",
        reasoning_effort: "low",
        verbosity: "low"
      };
      const q = new URLSearchParams({
        ...defaultParams,
        ...customParams
      });
      const res = await this.http.get(`/chats_stream?${q}`, {
        headers: {
          accept: "text/event-stream",
          referer: `${BASE}/gpt`
        },
        responseType: "stream"
      });
      return new Promise((resolve, reject) => {
        let fullText = "";
        let buffer = "";
        const streamChunks = [];
        res.data.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const rawData = line.slice(5).trim();
            if (!rawData || ["end", "[DONE]"].includes(rawData)) continue;
            try {
              const parsed = JSON.parse(rawData);
              streamChunks.push(parsed);
              if (parsed?.type === "response.output_text.delta" && parsed.delta != null) {
                fullText += parsed.delta;
                process.stdout.write(parsed.delta);
              }
            } catch {}
          }
        });
        res.data.on("end", () => {
          console.log();
          this.log("stream", "Koneksi stream ditutup. Total panjang karakter:", fullText.length);
          resolve({
            text: fullText,
            chunks: streamChunks
          });
        });
        res.data.on("error", err => {
          this.log("stream", "ERROR di tengah aliran data stream:", err.message);
          reject(err);
        });
      });
    } catch (e) {
      this.log("stream", "ERROR fatal inisialisasi stream:", e.message);
      throw e;
    }
  }
  async chat({
    prompt,
    model = "gpt3",
    state = null,
    ...rest
  }) {
    try {
      if (state) {
        this.log("chat", "Mendefinisikan sesi & auto-set ID dari state...");
        this.load(state);
      } else {
        this.log("chat", "Membuka lembaran room sesi baru murni...");
        this.chatId = this.convId = this.assConvId = null;
      }
      await this.connect();
      if (!this.chatId) {
        await this.create();
        await this.open();
        await this.setModel(model);
        await this.setTitle(prompt);
      } else {
        this.log("chat", "Bypass create room, mengunci data lama -> chatId:", this.chatId);
        await this.open();
        await this.setModel(model);
      }
      const sentData = await this.send({
        prompt: prompt,
        current_model: model,
        ...rest
      });
      if (!sentData?.response) {
        throw new Error(sentData?.messages || "Server menolak permintaan payload chat.");
      }
      const {
        text,
        chunks
      } = await this.stream({
        current_model: model,
        ...rest
      });
      return {
        ok: true,
        reply: text,
        chunks: chunks,
        quota: sentData.quota ?? null,
        state: this.save()
      };
    } catch (e) {
      this.log("chat", "FATAL ERROR ALUR CHAT:", e.message);
      return {
        ok: false,
        error: e.message,
        chunks: [],
        state: null
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
  const api = new ChatX();
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