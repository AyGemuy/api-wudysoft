import axios from "axios";
import {
  randomBytes
} from "crypto";
import WebSocket from "ws";
import FormData from "form-data";
class BorliChat {
  constructor() {
    this.token = null;
    this.dev_id = randomBytes(8).toString("hex");
    this.def_char = "522994d9-60e7-41fc-bd1d-3475bacccfc6";
    this.http = axios.create({
      baseURL: "https://borli.byteumobile.com/api/v1",
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        platform: "android",
        appversion: "999999",
        "accept-language": "en"
      }
    });
  }
  tok(t) {
    const tk = t || this.token;
    if (!tk) throw new Error("[borli] token kosong");
    return tk;
  }
  hdr(t) {
    return {
      authorization: "Bearer " + this.tok(t)
    };
  }
  async reg() {
    console.log("[borli] reg...");
    try {
      const res = await this.http.post("/auth/register-anonymous", {
        language_code: "en"
      });
      this.token = res.data?.data?.token ?? null;
      console.log("[borli] token:", this.token?.slice(0, 30) + "...");
      return this.token;
    } catch (err) {
      console.error("[borli] reg gagal:", err?.response?.data ?? err.message);
      throw err;
    }
  }
  async ensure(t) {
    if (!t && !this.token) await this.reg();
    return this.tok(t);
  }
  async search({
    query,
    ...rest
  } = {}) {
    if (!query) throw new Error("[borli] query wajib diisi");
    console.log("[borli] cari:", query);
    try {
      const {
        token,
        page = 1,
        limit = 20
      } = rest;
      const tok = await this.ensure(token);
      const res = await this.http.get("/characters", {
        headers: this.hdr(tok),
        params: {
          search: query,
          page: page,
          limit: limit,
          ...rest
        }
      });
      const data = res.data?.data ?? {};
      console.log("[borli] ketemu:", data.total_count ?? 0);
      return {
        list: data.characters ?? [],
        total: data.total_count ?? 0
      };
    } catch (err) {
      console.error("[borli] cari error:", err?.response?.data ?? err.message);
      throw err;
    }
  }
  async create_chat(char_uuid, token) {
    console.log("[borli] buat/ambil chat untuk:", char_uuid);
    try {
      const tok = await this.ensure(token);
      const res = await this.http.post("/chats", {
        character_uuid: char_uuid
      }, {
        headers: {
          ...this.hdr(tok),
          "Content-Type": "application/json"
        }
      });
      const chat = res.data?.data?.chat ?? {};
      console.log("[borli] chat uuid:", chat.uuid);
      return chat;
    } catch (err) {
      console.error("[borli] create_chat error:", err?.response?.data ?? err.message);
      throw err;
    }
  }
  async send_chat(chat_uuid, pesan, token) {
    console.log("[borli] send_chat ke chat:", chat_uuid);
    try {
      const tok = await this.ensure(token);
      const form = new FormData();
      form.append("chat_uuid", chat_uuid);
      form.append("content", pesan);
      const res = await this.http.post("/messages/send", form, {
        headers: {
          ...this.hdr(tok),
          ...form.getHeaders()
        }
      });
      console.log("[borli] pesan terkirim");
      return res.data?.data?.message;
    } catch (err) {
      console.error("[borli] send_chat error:", err?.response?.data ?? err.message);
      throw err;
    }
  }
  ws(tok, chat_uuid, resolve, reject) {
    console.log("[borli] ws mulai...");
    const socket = new WebSocket("wss://borli.byteumobile.com/ws", {
      headers: {
        "User-Agent": "okhttp/4.12.0",
        origin: "https://borli.byteumobile.com"
      }
    });
    let chunks = [];
    let finalMsg = null;
    socket.on("open", () => {
      console.log("[borli] ws open, auth...");
      socket.send(JSON.stringify({
        type: "auth",
        data: {
          token: tok,
          device_id: this.dev_id
        }
      }));
    });
    socket.on("message", raw => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }
      const {
        type,
        data = {}
      } = msg;
      if (type === "ping") {
        socket.send(JSON.stringify({
          type: "pong"
        }));
        return;
      }
      if (type === "auth") {
        console.log("[borli] ws auth:", data.success ? "ok" : "fail");
        return;
      }
      if (type === "ai_response_start") {
        return;
      }
      if (type === "ai_response_chunk") {
        const c = data.content || "";
        process.stdout.write(c);
        chunks.push(c);
        return;
      }
      if (type === "ai_response_end") {
        finalMsg = data.content || chunks.join("");
        console.log("\n[borli] ws selesai");
        socket.close();
        return;
      }
    });
    socket.on("close", () => resolve(finalMsg || chunks.join("")));
    socket.on("error", err => reject(err));
  }
  async chat({
    prompt,
    ...rest
  } = {}) {
    if (!prompt) throw new Error("[borli] prompt wajib diisi");
    console.log("[borli] chat:", prompt.slice(0, 50));
    try {
      const {
        token,
        char_uuid,
        chat_uuid
      } = rest;
      const tok = await this.ensure(token);
      const uuidChar = char_uuid || this.def_char;
      if (!uuidChar) throw new Error("[borli] butuh character_uuid atau set default");
      let uuidChat = chat_uuid;
      if (!uuidChat) {
        const chat = await this.create_chat(uuidChar, tok);
        uuidChat = chat.uuid;
      }
      await this.send_chat(uuidChat, prompt, tok);
      return new Promise((resolve, reject) => {
        this.ws(tok, uuidChat, resolve, reject);
      });
    } catch (err) {
      console.error("[borli] chat error:", err?.response?.data ?? err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      supportedActions: ["search", "chat"]
    });
  }
  const api = new BorliChat();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params?.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        return res.status(200).json(response);
      case "chat":
        if (!params?.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supportedActions: ["search", "chat"]
        });
    }
  } catch (error) {
    console.error(`[FATAL] Action '${action}' error:`, error?.message);
    if (error?.response?.data) {
      console.error("API Response:", error.response.data);
    }
    return res.status(500).json({
      success: false,
      error: error?.message || "Terjadi kesalahan internal pada server.",
      action: action
    });
  }
}