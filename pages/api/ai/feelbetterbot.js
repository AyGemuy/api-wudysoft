import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class FeelBetter {
  constructor() {
    this.cookies = {};
    this.client = axios.create({
      baseURL: "https://feelbetterbot.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://feelbetterbot.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://feelbetterbot.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(config => {
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) config.headers["Cookie"] = cookieStr;
      return config;
    }, err => Promise.reject(err));
    this.client.interceptors.response.use(res => {
      const sc = res.headers["set-cookie"];
      if (sc) {
        sc.forEach(cookie => {
          const [pair] = cookie.split(";");
          const [k, v] = pair.split("=");
          if (k && v) this.cookies[k.trim()] = v.trim();
        });
      }
      return res;
    }, err => Promise.reject(err));
  }
  _mem() {
    const p1 = crypto.randomBytes(3).toString("hex");
    const p2 = crypto.randomBytes(3).toString("hex").substring(0, 5);
    const num = crypto.randomInt(1e3, 9999);
    return `${p1}-${p2}-${num}`;
  }
  _fd(obj) {
    const fd = new FormData();
    Object.entries(obj || {}).forEach(([k, v]) => fd.append(k, v));
    return fd;
  }
  _cook(k, v) {
    this.cookies[k] = v;
  }
  async _check() {
    console.log("[Log] Check status...");
    try {
      const res = await this.client.get("/api/status");
      console.log(`[Log] Status: ${JSON.stringify(res?.data || {})}`);
      return res?.data;
    } catch (err) {
      console.warn("[Log] Check error:", err?.message || err);
      return null;
    }
  }
  async chat({
    memory,
    prompt,
    messages = [],
    audio = false,
    ...rest
  }) {
    console.log("[Log] Chat init...");
    try {
      const activeMem = memory || this.cookies["feelbet-memory"] || this._mem();
      this._cook("feelbet-memory", activeMem);
      console.log(`[Log] Memory: ${activeMem}`);
      await this._check();
      const defaultGreeting = {
        role: "assistant",
        content: "Hi there. I'm FeelBetterBot, and I'm here to listen to whatever you want to share — no judgment, just warmth and honest conversation. I draw on a lot of different ways of understanding people, but mostly I just want to be present with you. So, how are you doing right now?"
      };
      if (messages.length === 0) {
        messages.push(defaultGreeting);
      }
      if (prompt) {
        messages.push({
          role: "user",
          content: prompt
        });
      }
      console.log("[Log] Sending text...");
      const chatRes = await this.client.post("/", {
        messages: messages,
        ...rest
      });
      const cleanReply = (typeof chatRes?.data === "string" ? chatRes.data.trim() : JSON.stringify(chatRes?.data)) || "";
      console.log("[Log] Text success.");
      messages.push({
        role: "assistant",
        content: cleanReply
      });
      const out = {
        status: true,
        result: cleanReply,
        memory: activeMem
      };
      if (audio) {
        console.log("[Log] Sending audio...");
        const ttsRes = await this.client.post("/api/tts", {
          text: cleanReply
        }, {
          responseType: "arraybuffer"
        });
        out.audio = `data:audio/mpeg;base64,${Buffer.from(ttsRes?.data).toString("base64")}`;
        console.log("[Log] Audio success.");
      }
      return out;
    } catch (err) {
      console.error("[Log] Error:", err?.message || err);
      return {
        status: false,
        result: err?.message || "Error",
        memory: memory || null
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
  const api = new FeelBetter();
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