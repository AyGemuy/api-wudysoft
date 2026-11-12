import WebSocket from "ws";
import axios from "axios";
import {
  createHmac,
  randomBytes
} from "crypto";
const BASE_URL = "ws://157.230.84.21:3000/";
const JWT_TOKEN = "UrLWXAD0wJ";
const MODES = {
  messages: {
    url: `${BASE_URL}messages-secure`,
    required: ["prompt"]
  },
  tts: {
    url: `${BASE_URL}tts-secure`,
    required: ["input"]
  },
  web: {
    url: `${BASE_URL}web-secure`,
    required: ["prompt"]
  },
  stt: {
    url: `${BASE_URL}stt-secure`,
    required: ["audio"]
  }
};
class ChatWS {
  constructor() {
    this.msgs = [];
    this.log = (...a) => console.log("[ChatWS]", ...a);
    this.err = (...a) => console.error("[ChatWS][ERR]", ...a);
  }
  uid() {
    return randomBytes(6).toString("hex");
  }
  now() {
    return Math.floor(Date.now() / 1e3);
  }
  sign(payload, secret) {
    try {
      const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      const h = b64({
        alg: "HS256",
        typ: "JWT"
      });
      const p = b64(payload);
      const s = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      return `${h}.${p}.${s}`;
    } catch (e) {
      this.err("sign gagal:", e.message);
      throw e;
    }
  }
  async chat({
    mode = "messages",
    ...opts
  }) {
    try {
      this.log(`mode="${mode}" dimulai`);
      if (!MODES[mode]) throw new Error(`Mode tidak valid: "${mode}". Tersedia: ${Object.keys(MODES).join(", ")}`);
      const miss = MODES[mode].required.filter(k => opts[k] == null);
      if (miss.length) throw new Error(`Mode "${mode}" membutuhkan field: ${miss.join(", ")}`);
      this.log(`menghubungkan ke ${MODES[mode].url}`);
      const ws = await this.conn(MODES[mode].url);
      this.log("WebSocket terhubung");
      try {
        if (mode === "tts") return await this.tts(ws, opts);
        if (mode === "stt") return await this.stt(ws, opts);
        return await this.msg(ws, opts);
      } finally {
        ws.close();
        this.log("WebSocket ditutup");
      }
    } catch (e) {
      this.err("chat gagal:", e.message);
      return {
        result: null,
        error: e.message
      };
    }
  }
  async conn(url) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        const timeout = setTimeout(() => {
          ws.terminate();
          reject(new Error("Koneksi timeout setelah 10 detik"));
        }, 1e4);
        ws.on("open", () => {
          clearTimeout(timeout);
          resolve(ws);
        });
        ws.on("error", e => {
          clearTimeout(timeout);
          this.err("WebSocket error:", e.message);
          reject(e);
        });
      } catch (e) {
        this.err("conn gagal:", e.message);
        reject(e);
      }
    });
  }
  async msg(ws, {
    prompt,
    messages,
    media,
    ...rest
  }) {
    try {
      this.log("mode messages: menyiapkan payload");
      if (messages) {
        this.msgs = [...messages];
        this.log(`history dimuat: ${this.msgs.length} pesan`);
      }
      let fc = null;
      if (media) {
        this.log("memproses media...");
        fc = await this.media(Array.isArray(media) ? media[0] : media);
        this.log(fc ? "media berhasil diproses" : "media gagal diproses, lanjut tanpa media");
      }
      this.msgs.push({
        id: this.uid(),
        role: "user",
        text: prompt,
        fileContent: fc,
        createdAt: this.now()
      });
      this.log(`pesan user ditambahkan, total history: ${this.msgs.length}`);
      const payload = {
        id: rest.id ?? this.uid(),
        messages: this.msgs,
        createdAt: this.now(),
        title: rest.title ?? "New Conversation",
        chatType: rest.chatType ?? "text",
        localChatType: rest.localChatType ?? "normal",
        voiceAssistantType: rest.voiceAssistantType ?? "none"
      };
      this.log("mengirim payload ke server...");
      const res = await this.send(ws, payload);
      if (res.result) {
        this.msgs.push({
          id: this.uid(),
          role: "assistant",
          text: res.result,
          createdAt: this.now()
        });
        this.log(`respons diterima: ${res.result.length} karakter`);
      }
      return res;
    } catch (e) {
      this.err("msg gagal:", e.message);
      return {
        result: null,
        error: e.message
      };
    }
  }
  async tts(ws, {
    input,
    voice = "nova",
    conversationId,
    ...rest
  }) {
    try {
      this.log(`mode tts: text="${input.slice(0, 40)}..." voice="${voice}"`);
      const payload = {
        text: input,
        conversationId: conversationId ?? this.uid(),
        voice: voice,
        ...rest
      };
      this.log("mengirim payload tts ke server...");
      const res = await this.send(ws, payload);
      this.log(res.result ? `tts selesai: ${res.result.length} karakter` : "tts gagal");
      return res;
    } catch (e) {
      this.err("tts gagal:", e.message);
      return {
        result: null,
        error: e.message
      };
    }
  }
  async stt(ws, {
    audio,
    ...rest
  }) {
    try {
      this.log("mode stt: memproses audio...");
      const fc = await this.media(audio);
      if (!fc) throw new Error("Audio gagal diproses");
      this.log("audio berhasil diproses");
      const payload = {
        id: this.uid(),
        messages: [{
          id: this.uid(),
          role: "user",
          text: "",
          fileContent: fc,
          createdAt: this.now()
        }],
        createdAt: this.now(),
        title: rest.title ?? "New Conversation",
        chatType: rest.chatType ?? "text",
        localChatType: rest.localChatType ?? "normal",
        voiceAssistantType: rest.voiceAssistantType ?? "none"
      };
      this.log("mengirim payload stt ke server...");
      const res = await this.send(ws, payload);
      this.log(res.result ? `stt selesai: "${res.result}"` : "stt gagal");
      return res;
    } catch (e) {
      this.err("stt gagal:", e.message);
      return {
        result: null,
        error: e.message
      };
    }
  }
  send(ws, obj) {
    return new Promise((resolve, reject) => {
      try {
        let text = "",
          chunks = [];
        const timeout = setTimeout(() => {
          this.err("send timeout setelah 30 detik");
          resolve({
            result: null,
            error: "Response timeout"
          });
        }, 3e4);
        ws.on("message", data => {
          try {
            const json = JSON.parse(data.toString());
            console.log(json);
            const content = json?.message ?? json?.data ?? "";
            if (content && content !== "End of stream") {
              text += content;
              chunks.push(content);
              process.stdout.write(content);
            }
            if (json?.endOfStream || json?.error) {
              clearTimeout(timeout);
              if (json?.endOfStream) process.stdout.write("\n");
              if (json?.error) {
                this.err("server error:", json.error);
                resolve({
                  result: null,
                  error: json.error,
                  raw: json
                });
              } else {
                this.log(`stream selesai: ${chunks.length} chunk, ${text.length} karakter`);
                resolve({
                  result: text,
                  chunks: chunks,
                  messages: this.msgs,
                  raw: json
                });
              }
            }
          } catch (e) {
            this.err("parse message gagal:", e.message, "| raw:", data.toString().slice(0, 100));
          }
        });
        ws.on("error", e => {
          clearTimeout(timeout);
          this.err("ws error saat send:", e.message);
          reject(e);
        });
        ws.on("close", (code, reason) => {
          clearTimeout(timeout);
          if (code !== 1e3 && text === "") {
            this.err(`ws ditutup tiba-tiba: code=${code} reason=${reason}`);
            resolve({
              result: null,
              error: `WebSocket closed: ${code}`
            });
          }
        });
        const token = this.sign({
          data: JSON.stringify(obj)
        }, JWT_TOKEN);
        ws.send(token);
        this.log("token JWT dikirim");
      } catch (e) {
        this.err("send gagal:", e.message);
        reject(e);
      }
    });
  }
  async media(input) {
    try {
      this.log("memproses media input...");
      let mime = "image/jpeg",
        b64 = "",
        url = "";
      if (typeof input === "string" && input.startsWith("http")) {
        this.log(`download media dari URL: ${input.slice(0, 60)}...`);
        const res = await axios.get(input, {
          responseType: "arraybuffer",
          timeout: 15e3
        });
        mime = res.headers["content-type"]?.split(";")[0] || mime;
        b64 = Buffer.from(res.data).toString("base64");
        url = input;
        this.log(`media didownload: ${mime}, ${Math.round(res.data.byteLength / 1024)} KB`);
      } else if (Buffer.isBuffer(input)) {
        b64 = input.toString("base64");
        this.log(`media dari Buffer: ${Math.round(input.length / 1024)} KB`);
      } else if (typeof input === "string") {
        b64 = input.includes("base64,") ? input.split(",")[1] : input;
        this.log("media dari base64 string");
      } else {
        throw new Error(`Tipe media tidak didukung: ${typeof input}`);
      }
      return {
        name: `file_${this.uid()}`,
        mimetype: mime,
        url: url,
        file: b64
      };
    } catch (e) {
      this.err("media gagal:", e.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ChatWS();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}