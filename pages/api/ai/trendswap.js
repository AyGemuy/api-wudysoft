import axios from "axios";
import { randomBytes } from "crypto";

const BASE = "https://trendswapapi.ezcomicbox.com/api";
const HDR = {
  "User-Agent": "okhttp/5.1.0",
  "Accept-Encoding": "gzip",
  "ver": "9.9.9.9.9.9",
  "time_zone": "Asia/Makassar",
  "version": "1",
  "platform": "1",
};

 class TrendSwap {
  constructor({ third_type = 4, code } = {}) {
    this.creds = { third_type, code: code ?? randomBytes(8).toString("hex") };
    this.token = null;
    this.http = axios.create({ baseURL: BASE, headers: HDR });
    console.log("[init] code:", this.creds.code);
  }

  async login() {
    console.log("[login] authenticating...");
    try {
      const body = new URLSearchParams({
        third_type: String(this.creds.third_type),
        code: this.creds.code,
        cannot_change_pro: "true",
      });
      const { data } = await this.http.post("/user/login", body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded", authorization: "" },
      });
      this.token = data?.data?.token ?? null;
      console.log("[login] ok:", !!this.token);
      return data?.data ?? null;
    } catch (e) {
      console.error("[login]", e?.response?.data ?? e.message);
      return null;
    }
  }

  async ensure(token) {
    if (!this.token && !token) await this.login();
    const t = token ?? this.token;
    if (!t) throw new Error("auth failed");
    return { ...HDR, authorization: t };
  }

  // GET /chat/chat-user-list (Daftar karakter/AI)
  async models({ token, page = 1, count = 20, chat_type = 10, ...rest } = {}) {
    console.log("[models] fetching page:", page);
    try {
      const headers = await this.ensure(token);
      const { data } = await this.http.get("/chat/chat-user-list", {
        headers,
        params: { page, count, chat_type, ...rest },
      });
      return { ...data, token: this.token };
    } catch (e) {
      console.error("[models]", e?.response?.data ?? e.message);
      return null;
    }
  }

  // POST /chat/chat-buy (Unlock karakter)
  async chatBuy({ token, user_id }) {
    console.log("[chat-buy] unlocking id:", user_id);
    try {
      const headers = await this.ensure(token);
      const body = new URLSearchParams({ chat_user_id: String(user_id) });
      const { data } = await this.http.post("/chat/chat-buy", body.toString(), {
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      });
      return data;
    } catch (e) {
      console.error("[chat-buy]", e?.response?.data ?? e.message);
      return null;
    }
  }

  // GET /chat/chat-record
  async record({ token, user_id, id = 0, count = 10 } = {}) {
    try {
      const headers = await this.ensure(token);
      const { data } = await this.http.get("/chat/chat-record", {
        headers,
        params: { id, count, chat_user_id: user_id },
      });
      return data?.data ?? null;
    } catch (e) {
      console.error("[record]", e?.response?.data ?? e.message);
      return null;
    }
  }

  // POST /chat/chat-send
  async send({ token, user_id, content = "", message_type = 1, ...rest }) {
    const headers = await this.ensure(token);
    const body = new URLSearchParams({
      chat_user_id: String(user_id),
      content,
      message_type: String(message_type),
      ...rest,
    });
    const { data } = await this.http.post("/chat/chat-send", body.toString(), {
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    });
    return { ...data, token: this.token };
  }

  /**
   * Mengikuti alur rekaman curl:
   * record -> buy -> send(type 1: greeting) -> send(type 2: image) -> send(user prompt)
   */
  async chat({ token, prompt, user_id, ...rest }) {
    console.log("[chat] starting flow for:", user_id);
    try {
      // 1. Cek record
      await this.record({ token, user_id });

      // 2. Buy/Unlock (Sesuai flow curl)
      await this.chatBuy({ token, user_id });

      // 3. Trigger Greeting (type 1)
      await this.send({ token, user_id, content: "", message_type: 1 });

      // 4. Trigger Image (type 2)
      await this.send({ token, user_id, content: "", message_type: 2 });

      // 5. Send User Prompt (type 1) — return respon asli langsung
      return await this.send({ token, user_id, content: prompt, message_type: 1, ...rest });
    } catch (e) {
      console.error("[chat] error:", e.message);
      return null;
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
      supportedActions: ["models", "chat"]
    });
  }
  const api = new TrendSwap();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        return res.status(200).json(response);

      case "chat":
        response = await api.chat(params);
        return res.status(200).json(response);
      
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supportedActions: ["models", "chat"]
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