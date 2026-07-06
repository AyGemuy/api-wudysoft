import axios from "axios";
import crypto from "crypto";
class ChatClient {
  constructor() {
    this.baseURL = "https://aichat.zagtechnology.com/chat-ai-api/chatbot-api.php";
    this.defaultHeaders = {
      "User-Agent": "okhttp/4.9.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
    this.key = Buffer.from("IWOpYXNZjxVL5Sc3IWOpYXNZjxVL5Sc3", "utf8");
    this.iv = Buffer.from("1234567812345678", "utf8");
    this.prefix = "TfcayRY+W96Xfl67mk3xIy902CFTLVcMKS7Y+sG0H0U=:";
  }
  _enc(text) {
    try {
      const cipher = crypto.createCipheriv("aes-256-cbc", this.key, this.iv);
      return cipher.update(text, "utf8", "base64") + cipher.final("base64");
    } catch (err) {
      console.error(`[ENC ERR] ${err.message}`);
      return null;
    }
  }
  async chat({
    prompt,
    ...rest
  }) {
    try {
      if (!prompt) {
        console.error("[CHAT ERR] Prompt kosong");
        return {
          error: true,
          message: "Prompt kosong"
        };
      }
      console.log(`[REQ] Sending prompt: "${prompt.substring(0, 30)}..."`);
      const encryptedData = this._enc(prompt);
      if (!encryptedData) {
        return {
          error: true,
          message: "Gagal melakukan enkripsi payload"
        };
      }
      const input = this.prefix + encryptedData;
      const res = await axios.post(this.baseURL, {
        input: input,
        ...rest
      }, {
        headers: this.defaultHeaders,
        timeout: 12e4
      });
      console.log(`[RES] Status: ${res.status}`);
      return res.data;
    } catch (err) {
      const errMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error(`[CHAT ERR] ${errMsg}`);
      return {
        error: true,
        message: errMsg
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
  const api = new ChatClient();
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