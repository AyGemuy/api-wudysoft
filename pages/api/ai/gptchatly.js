import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  randomUUID
} from "crypto";
class GeminiChatly {
  constructor() {
    this.base = "https://gemini.gptchatly.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: this.h()
    }));
    this.token = null;
    this.csrf = null;
    this.chatId = randomUUID();
    this.msgs = [];
    this.ready = false;
  }
  h() {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: this.base,
      referer: `${this.base}/?chatId=${this.chatId}`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  calc(a, b, op) {
    const ops = {
      "+": (x, y) => x + y,
      "-": (x, y) => x - y,
      "*": (x, y) => x * y,
      "/": (x, y) => x / y
    };
    return ops[op]?.(a, b) || 0;
  }
  async b64(input) {
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string") {
        if (input.startsWith("UklGR")) return input;
        if (input.startsWith("data:")) return input.split(",")[1] || input;
        if (input.startsWith("http")) {
          console.log(`[IMG] Download: ${input.slice(0, 50)}...`);
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data).toString("base64");
        }
        return input;
      }
    } catch (err) {
      console.error("[IMG ERROR]", err.message);
      throw err;
    }
  }
  parse(stream) {
    try {
      const lines = stream.split("\n").filter(l => l.trim() && l.startsWith("data: "));
      const events = [];
      const r = {};
      for (const line of lines) {
        const content = line.slice(6).trim();
        if (content === "[DONE]") continue;
        try {
          const j = JSON.parse(content);
          events.push(j);
          for (const [k, v] of Object.entries(j)) {
            if (k === "type") continue;
            if (k === "delta" || k === "data") {
              const t = j.type || "";
              const parts = t.split("-");
              const key = parts[parts.length - 2] || parts[parts.length - 1] || k;
              r[key] = (r[key] || "") + (v || "");
            } else if (k === "output" && v?.content) {
              r.toolOutput = (r.toolOutput || "") + v.content;
            } else if (v !== null && v !== undefined) {
              r[k] = v;
            }
          }
        } catch (err) {
          continue;
        }
      }
      const final = r.text || r.toolOutput || "";
      const isVision = !!r.toolOutput && !r.text;
      const isImage = !!r.image && r.kind === "image";
      const isChat = !isVision && !isImage;
      return {
        ...r,
        final: final,
        isChat: isChat,
        isVision: isVision,
        isImage: isImage,
        events: events
      };
    } catch (err) {
      console.error("[PARSE ERROR]", err.message);
      return {
        final: "",
        isChat: true,
        isVision: false,
        isImage: false,
        events: []
      };
    }
  }
  async init() {
    if (this.ready && this.token && Date.now() < (this.expiry || 0)) return this;
    try {
      console.log("[INIT] Starting...");
      await this.client.get(`${this.base}/`, {
        headers: {
          ...this.h(),
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const cookies = await this.jar.getCookies(this.base);
      this.csrf = cookies.find(c => c.key === "csrf-token")?.value || randomUUID();
      console.log(`[CSRF] ${this.csrf.slice(0, 20)}...`);
      console.log("[CHALLENGE] Requesting...");
      const {
        data: ch
      } = await this.client.post(`${this.base}/api/auth/challenge`, null, {
        headers: {
          ...this.h(),
          "x-csrf-token": this.csrf,
          cookie: `csrf-token=${this.csrf}`
        }
      });
      const ans = this.calc(ch?.operandA || 0, ch?.operandB || 0, ch?.operator || "+");
      console.log(`[SOLVE] ${ch?.operandA} ${ch?.operator} ${ch?.operandB} = ${ans}`);
      console.log("[TOKEN] Requesting...");
      const {
        data: auth
      } = await this.client.post(`${this.base}/api/auth/token`, {
        challengeId: ch?.id,
        answer: ans
      }, {
        headers: {
          ...this.h(),
          "content-type": "application/json",
          "x-csrf-token": this.csrf,
          cookie: `csrf-token=${this.csrf}`
        }
      });
      this.token = auth?.token;
      this.expiry = auth?.expiresAt || Date.now() + 3e5;
      this.ready = true;
      console.log(`[READY] Token expires at ${new Date(this.expiry).toLocaleTimeString()}\n`);
      return this;
    } catch (err) {
      console.error("[INIT ERROR]", err?.response?.data || err.message);
      throw err;
    }
  }
  async chat({
    model = "chat-model",
    prompt,
    messages,
    media,
    ...rest
  }) {
    await this.init();
    try {
      console.log(`[CHAT] Model: ${model}`);
      const parts = [];
      if (media) {
        const medias = Array.isArray(media) ? media : [media];
        for (const m of medias) {
          const b64 = await this.b64(m);
          const mime = m?.mediaType || m?.type || "image/webp";
          const name = m?.filename || m?.name || `image_${Date.now()}.webp`;
          parts.push({
            type: "file",
            url: b64,
            name: name,
            filename: name,
            mediaType: mime,
            previewUrl: `blob:${this.base}/${randomUUID()}`
          });
          console.log(`[MEDIA] ${name}`);
        }
      }
      if (prompt) {
        parts.push({
          type: "text",
          text: prompt
        });
        console.log(`[PROMPT] ${prompt.slice(0, 60)}...`);
      }
      const userMsg = {
        role: "user",
        parts: parts,
        id: randomUUID()
      };
      if (messages?.length) {
        for (const msg of messages) {
          if (msg?.parts) {
            for (const part of msg.parts) {
              if (part?.type === "file" && part?.url) part.url = await this.b64(part.url);
            }
          }
        }
        this.msgs = [...messages, userMsg];
      } else {
        this.msgs.push(userMsg);
      }
      console.log(`[SENDING] ${this.msgs.length} messages...`);
      const payload = {
        id: this.chatId,
        message: userMsg,
        messages: this.msgs.slice(0, -1),
        artifactSnapshots: {},
        selectedChatModel: model,
        selectedVisibilityType: "private",
        ...rest
      };
      const {
        data
      } = await this.client.post(`${this.base}/api/chat`, payload, {
        headers: {
          ...this.h(),
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          "x-csrf-token": this.csrf,
          cookie: `csrf-token=${this.csrf}`
        }
      });
      const p = this.parse(data);
      const assistantMsg = {
        id: p.messageId || randomUUID(),
        role: "assistant",
        parts: [{
          type: "text",
          text: p.final
        }]
      };
      if (p.isImage) assistantMsg.parts.push({
        type: "image",
        data: p.image,
        id: p.id,
        title: p.title
      });
      this.msgs.push(assistantMsg);
      const t = p.isImage ? "IMAGE" : p.isVision ? "VISION" : "CHAT";
      console.log(`[${t}] ${p.final.slice(0, 100)}${p.final.length > 100 ? "..." : ""}`);
      if (p.isImage) {
        console.log(`[IMAGE] ID: ${p.id || "N/A"}`);
        console.log(`[IMAGE] Title: ${p.title || "N/A"}`);
        console.log(`[IMAGE] Data: ${p.image?.slice(0, 50) || "N/A"}...`);
      }
      if (p.usage) console.log(`[USAGE] In: ${p.usage.inputTokens || 0} | Out: ${p.usage.outputTokens || 0} | Total: ${p.usage.totalTokens || 0}`);
      console.log("");
      return {
        text: p.final,
        type: t.toLowerCase(),
        ...p
      };
    } catch (err) {
      console.error("[CHAT ERROR]", err?.response?.data || err.message);
      throw err;
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
  const api = new GeminiChatly();
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