import axios from "axios";
import qs from "qs";
class ChatLoanAI {
  constructor() {
    this.url = "https://chat-loan-ai-640216591025.asia-northeast1.run.app/stream";
    this.def_token = "eyJzdWI23d3iIyMzQyZmczNHJf343tt3CJuYW1l34f342iSm9objM0NTM0NT";
    this.def_app = "chat-android-iap";
    this.def_ua = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
  }
  _e(data) {
    try {
      console.log("[Encode] Memproses payload request...");
      return typeof data === "string" ? data : JSON.stringify(data);
    } catch (err) {
      console.error("[Encode Error]", err?.message || err);
      return "";
    }
  }
  _p(line) {
    if (!line.startsWith("data:")) return "";
    const val = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
    if (val.includes("[DONE]")) return "";
    return val;
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      console.log("[Chat] Memulai proses percakapan...");
      const msg_list = Array.isArray(messages) ? [...messages] : [];
      if (prompt) {
        console.log("[Chat] Menambahkan prompt baru ke daftar pesan...");
        msg_list.push({
          role: "user",
          content: prompt
        });
      }
      if (msg_list.length === 0) {
        console.log("[Chat] Validation Error: Prompt atau messages kosong.");
        return {
          status: false,
          result: {
            error: "Prompt atau messages wajib diisi"
          }
        };
      }
      const payload = {
        message: msg_list,
        token: rest?.token || this.def_token,
        app_name: rest?.app_name || this.def_app
      };
      const body = this._e(payload);
      const headers = {
        "User-Agent": rest?.user_agent || this.def_ua,
        Connection: "Keep-Alive",
        Accept: "text/event-stream",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json; charset=UTF-8"
      };
      console.log("[Chat] Mengirim request HTTP POST...");
      const res = await axios.post(this.url, body, {
        headers: headers,
        responseType: "stream",
        validateStatus: status => status < 500
      });
      console.log(`[Chat] Koneksi berhasil (${res?.status || 200}), membaca stream data...`);
      let full_text = "";
      let raw_response = "";
      let buffer = "";
      let chunks = [];
      await new Promise((resolve, reject) => {
        res.data.on("data", chunk => {
          const str = chunk.toString("utf-8");
          raw_response += str;
          buffer += str;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const text = this._p(line);
            if (text) {
              full_text += text;
              chunks.push(text);
            }
          }
        });
        res.data.on("end", () => {
          if (buffer) {
            const text = this._p(buffer);
            if (text) {
              full_text += text;
              chunks.push(text);
            }
          }
          console.log("[Chat] Stream data selesai dibaca.");
          resolve();
        });
        res.data.on("error", err => {
          console.error("[Stream Error]", err?.message || err);
          reject(err);
        });
      });
      if (res.headers["content-type"]?.includes("application/json") || res.status !== 200) {
        try {
          const json_err = JSON.parse(raw_response);
          return {
            status: false,
            result: {
              error: json_err?.msg || json_err?.error || "Server error"
            }
          };
        } catch {
          return {
            status: false,
            result: {
              error: raw_response || "Response error dari server"
            }
          };
        }
      }
      msg_list.push({
        role: "assistant",
        content: full_text
      });
      console.log("[Chat] Respon berhasil didapatkan.");
      return {
        status: true,
        result: {
          content: full_text,
          chunks: chunks,
          messages: msg_list
        }
      };
    } catch (err) {
      console.error("[Chat Error]", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: {
          error: err?.response?.statusText || err?.message || "Terjadi kesalahan pada server"
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
  const api = new ChatLoanAI();
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