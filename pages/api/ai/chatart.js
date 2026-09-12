import axios from "axios";
import WebSocket from "ws";
import crypto from "crypto";
import FormData from "form-data";
class ChatArt {
  constructor() {
    this.aes = {
      key: Buffer.from("Y6eENzQ69OKqRaHE", "utf-8"),
      iv: Buffer.from("qweNzsd9OKJOIJoo", "utf-8"),
      algo: "aes-128-cbc"
    };
    this.id = crypto.randomUUID().toUpperCase();
    this.token = "";
    this.room = "0";
    this.mdls = null;
    this.hdrs = {
      "User-Agent": "android",
      "Content-Type": "application/json",
      language: "ID",
      "user-type": "android",
      version: "4.4.8",
      "app-type": "1",
      "identity-id": this.id,
      "app-market": "google_play",
      enc: "ngeMqNvAJYWiRXZjUBjNxQ=="
    };
  }
  _enc(text) {
    try {
      const cipher = crypto.createCipheriv(this.aes.algo, this.aes.key, this.aes.iv);
      let e = cipher.update(typeof text === "object" ? JSON.stringify(text) : text, "utf-8", "base64");
      return e + cipher.final("base64");
    } catch (err) {
      console.error("[Error _enc]", err.message);
      return null;
    }
  }
  _dec(cipherText) {
    try {
      if (!cipherText) return null;
      const decipher = crypto.createDecipheriv(this.aes.algo, this.aes.key, this.aes.iv);
      let d = decipher.update(cipherText, "base64", "utf-8");
      d += decipher.final("utf-8");
      return d.startsWith("{") || d.startsWith("[") ? JSON.parse(d) : d;
    } catch (err) {
      console.error("[Error _dec]", err.message);
      return null;
    }
  }
  async login() {
    try {
      console.log(`[Proses] Login ID: ${this.id}`);
      const payload = {
        identity_id: this.id,
        is_cn: 0,
        source_site: "google_play",
        tourists_code: "",
        user_setting: 0
      };
      const res = await axios.post("https://chat-ai-api.chatartpro.com/v5/chat_user/login", {
        data: this._enc(payload)
      }, {
        headers: {
          ...this.hdrs,
          "member-token": this.token
        }
      });
      const rawBody = res?.data?.data;
      const decBody = typeof rawBody === "string" ? this._dec(rawBody) : res?.data;
      const resData = decBody?.data || decBody;
      const newToken = resData?.member_token;
      if (newToken) {
        this.token = newToken;
        console.log("[Sukses] Token diperbarui.");
        return this.token;
      }
      console.error("[Gagal] Gagal mendapatkan token login.");
      return null;
    } catch (err) {
      console.error("[Error Login]", err?.response?.data || err.message);
      return null;
    }
  }
  async _upImg(input, filename = "image.jpg") {
    try {
      if (!this.token) await this.login();
      console.log(`[Proses] Mengurai dan mengunggah media image...`);
      let buf;
      if (Buffer.isBuffer(input)) {
        buf = input;
      } else if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          const resStream = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(resStream.data);
        } else {
          const cleanB64 = input.replace(/^data:image\/\w+;base64,/, "");
          buf = Buffer.from(cleanB64, "base64");
        }
      } else {
        console.error("[Gagal] Format media tidak didukung.");
        return null;
      }
      const form = new FormData();
      form.append("file", buf, {
        filename: filename,
        contentType: "multipart/form-data"
      });
      const headers = {
        ...this.hdrs,
        "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`,
        "member-token": this.token
      };
      delete headers.enc;
      const res = await axios.post("https://chat-ai-api.chatartpro.com/v2/chat_gpt/upload_image", form, {
        headers: headers
      });
      const rawData = res?.data?.data;
      const decData = typeof rawData === "string" ? this._dec(rawData) : rawData || res?.data;
      const finalData = decData?.data || decData;
      if (finalData?.url_id || decData?.code === 200) {
        console.log("[Sukses] Upload gambar berhasil.");
        return {
          url_id: parseInt(finalData.url_id),
          url: finalData.url
        };
      } else {
        console.error("[Gagal]", decData?.message || "Gagal upload gambar");
        return null;
      }
    } catch (err) {
      console.error("[Error _upImg]", err.message);
      return null;
    }
  }
  async getMdls(refresh = false) {
    try {
      if (this.mdls && !refresh) return this.mdls;
      if (!this.token) await this.login();
      console.log("[Proses] Mengambil daftar model...");
      const res = await axios.get("https://chat-ai-api.chatartpro.com/v5/setting/get_model_list", {
        headers: {
          ...this.hdrs,
          "member-token": this.token
        }
      });
      const decData = this._dec(res?.data?.data);
      const finalData = decData?.data || decData;
      if (Array.isArray(finalData) || decData?.code === 200) {
        this.mdls = Array.isArray(finalData) ? finalData : finalData;
        console.log("[Sukses] Daftar model diperoleh.");
        return this.mdls;
      } else {
        console.error("[Gagal]", decData?.message || "Gagal mengambil daftar model");
        return null;
      }
    } catch (err) {
      console.error("[Error getMdls]", err.message);
      return null;
    }
  }
  async _valMdl(modelCode) {
    try {
      const list = await this.getMdls();
      if (!list || !Array.isArray(list)) return false;
      const all = list.flatMap(item => {
        const subs = item?.submodels || item?.sub_models || [];
        const subCodes = Array.isArray(subs) ? subs.map(sub => sub?.model_code).filter(Boolean) : [];
        return [item?.model_code, ...subCodes].filter(Boolean);
      });
      return all.includes(modelCode);
    } catch (err) {
      console.warn("[Peringatan _valMdl]", err.message);
      return false;
    }
  }
  async _initHttp(endpoint, payload) {
    try {
      if (!this.token) await this.login();
      console.log(`[Proses] Handshake HTTP POST [${endpoint}]`);
      const res = await axios.post(`https://chat-ai-api.chatartpro.com${endpoint}`, {
        data: this._enc(payload)
      }, {
        headers: {
          ...this.hdrs,
          "member-token": this.token
        }
      });
      const decData = this._dec(res?.data?.data);
      const finalData = decData?.data || decData;
      const streamId = finalData?.data?.[0]?.id || finalData?.stream_id;
      const newRoomId = finalData?.room_id;
      if (newRoomId) this.room = newRoomId;
      return {
        streamId: streamId
      };
    } catch (err) {
      console.error("[Error _initHttp]", err.message);
      return {
        streamId: null
      };
    }
  }
  async _connWs(streamId, onChunk) {
    return new Promise(resolve => {
      try {
        console.log("[Proses] Membuka jalur Web Socket...");
        const wsUrl = `wss://chat-ai-ws.chatartpro.com?member_token=${this.token}&Language=ID`;
        const ws = new WebSocket(wsUrl, {
          headers: {
            version: this.hdrs.version
          }
        });
        let fullResponse = "";
        const collectedChunks = [];
        ws.on("open", () => {
          ws.send(JSON.stringify({
            chat_type: 1,
            identity_id: this.id,
            stream_id: Number(streamId)
          }));
        });
        ws.on("message", data => {
          try {
            const parsed = JSON.parse(data.toString());
            const msg = parsed?.message;
            if (msg === "[Txx-DONE]") {
              ws.close();
              return resolve({
                fullResponse: fullResponse,
                collectedChunks: collectedChunks
              });
            }
            if (msg && msg !== "") {
              fullResponse += msg;
              collectedChunks.push(msg);
              if (typeof onChunk === "function") onChunk(msg);
            }
          } catch (e) {}
        });
        ws.on("error", err => {
          console.error("[Error WS Event]", err.message);
          resolve({
            fullResponse: fullResponse,
            collectedChunks: collectedChunks
          });
        });
        ws.on("close", () => resolve({
          fullResponse: fullResponse,
          collectedChunks: collectedChunks
        }));
      } catch (err) {
        console.error("[Error _connWs]", err.message);
        resolve({
          fullResponse: "",
          collectedChunks: []
        });
      }
    });
  }
  async chat({
    prompt,
    mode = "v6",
    image = null,
    imageName = "img.jpg",
    model = null,
    ...rest
  } = {}) {
    try {
      if (!prompt) {
        console.error("[Gagal] Prompt wajib diisi.");
        return {
          status: false,
          error: "Prompt kosong"
        };
      }
      const map = {
        v6: "/v6/chat_gpt/chat",
        v5: "/v5/chat_gpt/chat",
        vision: "/v1/chat_gpt/chat_vision"
      };
      if (!map[mode]) {
        const availableModes = Object.keys(map);
        console.error(`[Gagal] Mode "${mode}" tidak valid.`);
        return {
          status: false,
          error: `Mode tidak valid: ${mode}`,
          available: availableModes
        };
      }
      const endpoint = map[mode];
      if (model) {
        const isValidMdl = await this._valMdl(model);
        if (!isValidMdl) {
          const list = await this.getMdls() || [];
          const allAvailable = list.flatMap(item => {
            const subs = item?.submodels || item?.sub_models || [];
            const subCodes = Array.isArray(subs) ? subs.map(sub => sub?.model_code).filter(Boolean) : [];
            return [item?.model_code, ...subCodes].filter(Boolean);
          });
          const availableModels = [...new Set(allAvailable)];
          console.error(`[Gagal] Model "${model}" tidak valid.`);
          return {
            status: false,
            error: `Model tidak valid: ${model}`,
            available: availableModels
          };
        }
      }
      let url_id = 0;
      if (image) {
        const upRes = await this._upImg(image, imageName);
        if (upRes) url_id = Number(upRes.url_id);
      }
      let payload = {
        ai_search: 0,
        assistant_id: "",
        gpt_type: model || "gpt-5.5",
        keyword: prompt,
        role_id: 0,
        room_id: String(this.room),
        template_id: 0,
        tool_model: "",
        type: 1,
        url_id: url_id
      };
      payload = {
        ...payload,
        ...rest
      };
      const {
        streamId
      } = await this._initHttp(endpoint, payload);
      if (!streamId) {
        console.error("[Gagal] Gagal mendapatkan Stream ID.");
        return {
          status: false,
          error: "Stream ID null"
        };
      }
      const {
        fullResponse,
        collectedChunks
      } = await this._connWs(streamId, chunk => {
        process.stdout.write(chunk);
      });
      console.log("\n[Sukses] Response streaming selesai.");
      const messages = rest.messages || [];
      if (Array.isArray(messages)) {
        messages.push({
          role: "user",
          content: prompt
        });
        messages.push({
          role: "assistant",
          content: fullResponse
        });
      }
      return {
        status: true,
        result: fullResponse,
        chunks: collectedChunks,
        room: this.room,
        model: payload.gpt_type,
        identity_id: this.id,
        messages: messages,
        url_id: url_id,
        mode: mode
      };
    } catch (err) {
      console.error("\n[Error Chat]", err.message);
      return {
        status: false,
        result: null,
        chunks: [],
        error: err.message,
        messages: rest.messages || []
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
  const api = new ChatArt();
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