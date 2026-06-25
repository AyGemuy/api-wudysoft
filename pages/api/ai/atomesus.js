import axios from "axios";
import FormData from "form-data";
class Atomesus {
  constructor() {
    this.base = "https://api.atomesus.com/api/guest-chat";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  _log(act, msg) {
    console.log(`[Atomesus] [${act}] ${msg}`);
  }
  _enc(data) {
    try {
      return Buffer.from(JSON.stringify(data || [])).toString("base64");
    } catch (_) {
      return "";
    }
  }
  _dec(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : null;
    } catch (_) {
      this._log("Error", "Gagal decode state Base64, reset history.");
      return null;
    }
  }
  async _media(item) {
    try {
      if (Buffer.isBuffer(item)) {
        return {
          value: item,
          options: {
            filename: `buf_${Date.now()}.jpg`
          }
        };
      }
      if (typeof item === "string") {
        if (item.startsWith("http")) {
          this._log("Media", "Downloading URL...");
          const res = await axios.get(item, {
            responseType: "arraybuffer"
          });
          return {
            value: res.data,
            options: {
              filename: item.split("/").pop() || "file.jpg"
            }
          };
        }
        if (item.includes("base64,")) {
          const parts = item.split("base64,");
          const ext = parts[0]?.match(/\/(.*?);/)?.[1] || "jpg";
          return {
            value: Buffer.from(parts[1], "base64"),
            options: {
              filename: `b64_${Date.now()}.${ext}`
            }
          };
        }
        if (/^[A-Za-z0-9+/=]+$/.test(item)) {
          return {
            value: Buffer.from(item, "base64"),
            options: {
              filename: `b64_${Date.now()}.jpg`
            }
          };
        }
      }
      return null;
    } catch (e) {
      this._log("Media Error", e.message);
      return null;
    }
  }
  async chat({
    prompt,
    messages,
    media,
    state,
    ...rest
  }) {
    this._log("Chat", "Starting request...");
    let history = this._dec(state) || messages || [];
    if (prompt) history.push({
      role: "user",
      content: prompt
    });
    try {
      const form = new FormData();
      form.append("message", prompt || "");
      form.append("stream", "true");
      if (media) {
        const items = Array.isArray(media) ? media : [media];
        for (const item of items) {
          const fileData = await this._media(item);
          if (fileData) {
            form.append("files", fileData.value, fileData.options);
            this._log("Media", `Appended: ${fileData.options.filename}`);
          }
        }
      }
      const response = await axios.post(this.base, form, {
        headers: {
          ...form.getHeaders(),
          accept: "text/event-stream",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://www.atomesus.com",
          referer: "https://www.atomesus.com/",
          "user-agent": this.ua,
          ...rest?.headers
        },
        responseType: "stream"
      });
      let fullText = "";
      const chunks = [];
      return new Promise((resolve, reject) => {
        response.data.on("data", chunk => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(trimmed.indexOf("{"));
            if (!jsonStr.startsWith("{")) continue;
            try {
              const json = JSON.parse(jsonStr);
              chunks.push(json);
              if (json?.type === "content" && json?.content) {
                fullText += json.content;
              }
              if (json?.type === "end" && json?.reply) {
                fullText = json.reply;
              }
            } catch (_) {}
          }
        });
        response.data.on("end", () => {
          this._log("Chat", "Stream closed.");
          history.push({
            role: "assistant",
            content: fullText
          });
          resolve({
            status: true,
            result: fullText,
            chunks: chunks,
            state: this._enc(history)
          });
        });
        response.data.on("error", err => {
          reject(err);
        });
      });
    } catch (err) {
      this._log("Error", err?.response?.data?.message || err?.message);
      return {
        status: false,
        result: err?.message || "Terjadi kesalahan sistem",
        chunks: [],
        state: this._enc(history)
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
  const api = new Atomesus();
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