import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class AskGpt5 {
  constructor() {
    this.api = "https://loadbalancer.askgpt5.app/api";
    this.ua = "okhttp/4.10.0";
  }
  _log(step, info = "") {
    console.log(`[AskGpt5] ${step} ${info ? `-> ${info}` : ""}`);
  }
  _gen() {
    const salt = crypto.randomBytes(4).toString("hex");
    return {
      name: `Guest${salt}`,
      email: `guest${salt}@mail.com`,
      pass: `Pwd${salt}A1!`
    };
  }
  _dec(st) {
    try {
      return st ? JSON.parse(Buffer.from(st, "base64").toString()) : null;
    } catch (e) {
      this._log("ERR_DEC", e.message);
      return null;
    }
  }
  _enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (e) {
      this._log("ERR_ENC", e.message);
      return "";
    }
  }
  async _file(med) {
    try {
      if (typeof med === "string" && med.startsWith("http")) {
        const r = await axios.get(med, {
          responseType: "arraybuffer"
        });
        return {
          value: Buffer.from(r.data),
          options: {
            contentType: r.headers["content-type"] || "image/jpeg",
            filename: "file.jpg"
          }
        };
      }
      if (typeof med === "string" && med.startsWith("data:")) {
        const m = med.match(/^data:(.+);base64,(.+)$/);
        const mime = m ? m[1] : "image/jpeg";
        const buf = Buffer.from(m ? m[2] : med, "base64");
        return {
          value: buf,
          options: {
            contentType: mime,
            filename: "file.jpg"
          }
        };
      }
      if (Buffer.isBuffer(med)) {
        return {
          value: med,
          options: {
            contentType: "image/jpeg",
            filename: "file.jpg"
          }
        };
      }
      return {
        value: med,
        options: {
          contentType: "image/jpeg",
          filename: "file.jpg"
        }
      };
    } catch (e) {
      this._log("ERR_FILE", e.message);
      throw e;
    }
  }
  async _auth(cur) {
    try {
      this._log("AUTH", "Registering new account...");
      const cred = this._gen();
      const r = await axios.post(`${this.api}/auth/register`, {
        email: cred.email,
        password: cred.pass,
        name: cred.name
      }, {
        headers: {
          "User-Agent": this.ua,
          "Content-Type": "application/json",
          newversion: "true"
        }
      });
      const tok = r.data?.access_token || r.data?.token || r.data?.data?.token || r.headers?.authorization?.split(" ")[1] || r.data?.result?.token;
      if (!tok) {
        console.log(r.data);
        throw new Error("Token tidak ditemukan dalam respon API");
      }
      return {
        token: tok,
        chatId: cur?.chatId || null,
        exp: Date.now() + 24 * 60 * 60 * 1e3
      };
    } catch (e) {
      this._log("ERR_AUTH", e.response?.data ? JSON.stringify(e.response.data) : e.message);
      throw e;
    }
  }
  async _room(hd) {
    try {
      this._log("ROOM", "Creating new chat session...");
      const r = await axios.post(`${this.api}/chats/`, {
        title: "New Chat"
      }, {
        headers: hd
      });
      return r.data?.id || r.data?.chat_id || 150903;
    } catch (e) {
      this._log("ERR_ROOM", e.response?.data ? JSON.stringify(e.response.data) : e.message);
      throw e;
    }
  }
  async _upload(media, hd) {
    try {
      this._log("UPLOAD", "Uploading media attachment...");
      const form = new FormData();
      const {
        value,
        options
      } = await this._file(media);
      const filename = options.filename || `image_${Date.now()}.jpg`;
      const contentType = options.contentType || "image/jpeg";
      form.append("files", value, {
        filename: filename,
        contentType: contentType,
        knownLength: value.length
      });
      const r = await axios.post(`${this.api}/attachments/`, form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": this.ua,
          authorization: hd.authorization,
          "Accept-Encoding": "gzip, deflate, br",
          newversion: "true"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      let attachmentId = null;
      if (Array.isArray(r.data) && r.data[0]) {
        attachmentId = r.data[0].id;
      } else if (r.data) {
        attachmentId = r.data.id || r.data.attachment_id || r.data.data?.id;
      }
      return attachmentId;
    } catch (e) {
      this._log("ERR_UPLOAD", e.response?.data ? JSON.stringify(e.response.data) : e.message);
      throw e;
    }
  }
  async chat({
    state,
    prompt,
    media,
    ...opt
  }) {
    return new Promise(async resolve => {
      let cur = null;
      try {
        cur = this._dec(state);
        if (!cur || cur.exp && Date.now() >= cur.exp) {
          cur = await this._auth(cur);
        }
        const hd = {
          "User-Agent": this.ua,
          authorization: `Bearer ${cur.token}`,
          newversion: "true"
        };
        if (!cur.chatId) {
          cur.chatId = await this._room({
            ...hd,
            "Content-Type": "application/json"
          });
        }
        let attIds = opt?.attachment_ids || [];
        if (!Array.isArray(attIds)) attIds = [attIds];
        if (media) {
          const list = Array.isArray(media) ? media : [media];
          for (const item of list) {
            const id = await this._upload(item, hd);
            if (id) attIds.push(id);
          }
        }
        this._log("PAYLOAD", `Building JSON payload for room: ${cur.chatId}`);
        const jsonPayload = {
          content: prompt || "",
          client_message_id: crypto.randomBytes(5).toString("hex"),
          web_search: opt?.web_search ?? true,
          model: opt?.model || "qwen3.5-397b-a17b",
          persona: opt?.persona || {
            name: "User",
            role: "",
            info: "",
            tags: ["friendly"],
            personality: "default"
          }
        };
        if (attIds.length > 0) {
          jsonPayload.attachment_ids = attIds;
        }
        this._log("STREAM", "Connecting to server stream...");
        const stream = await axios.post(`${this.api}/chats/${cur.chatId}/messages/stream`, jsonPayload, {
          headers: {
            ...hd,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            "cache-control": "no-cache"
          },
          responseType: "stream"
        });
        this._log("PARSING", "Processing chunks...");
        let chunks = [],
          text = "",
          bufferStr = "";
        stream.data.on("data", chunk => {
          bufferStr += chunk.toString();
          const lines = bufferStr.split("\n");
          bufferStr = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              try {
                const rawJson = trimmed.slice(5).trim();
                if (!rawJson || rawJson === "[DONE]") continue;
                const json = JSON.parse(rawJson);
                if (json?.chunk) {
                  chunks.push(json.chunk);
                  text = json?.full_content || text + json.chunk;
                }
              } catch (_) {}
            }
          }
        });
        stream.data.on("end", () => {
          if (bufferStr && bufferStr.trim().startsWith("data:")) {
            try {
              const rawJson = bufferStr.trim().slice(5).trim();
              if (rawJson && rawJson !== "[DONE]") {
                const json = JSON.parse(rawJson);
                if (json?.chunk) {
                  chunks.push(json.chunk);
                  text = json?.full_content || text + json.chunk;
                }
              }
            } catch (_) {}
          }
          this._log("SUCCESS", "Stream completed successfully");
          resolve({
            status: true,
            result: text || chunks.join(""),
            chunks: chunks,
            state: this._enc(cur)
          });
        });
        stream.data.on("error", err => {
          this._log("ERR_STREAM_DATA", err.message);
          resolve({
            status: false,
            result: err.message,
            chunks: [],
            state: cur ? this._enc(cur) : state || ""
          });
        });
      } catch (err) {
        let errMsg = err.message;
        if (err.response && err.response.data) {
          if (typeof err.response.data.on === "function") {
            errMsg = await new Promise(res => {
              let body = "";
              err.response.data.on("data", chunk => {
                body += chunk.toString();
              });
              err.response.data.on("end", () => {
                try {
                  const parsed = JSON.parse(body);
                  res(JSON.stringify(parsed));
                } catch (_) {
                  res(body || `HTTP Error ${err.response.status}`);
                }
              });
              err.response.data.on("error", () => {
                res(`HTTP Error ${err.response.status}`);
              });
            });
          } else if (typeof err.response.data === "object") {
            try {
              errMsg = JSON.stringify(err.response.data);
            } catch (_) {}
          } else {
            errMsg = String(err.response.data);
          }
        }
        this._log("ERR_FATAL", errMsg);
        resolve({
          status: false,
          result: errMsg,
          chunks: [],
          state: state || (cur ? this._enc(cur) : "")
        });
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AskGpt5();
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