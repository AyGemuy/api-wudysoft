import axios from "axios";
import crypto from "crypto";
class CloudChat {
  constructor() {
    this.url = "https://lkpmzvrveyocaodaixss.supabase.co/functions/v1/chat-proxy";
    this.cid = crypto.randomUUID();
    this.tok = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrcG16dnJ2ZXlvY2FvZGFpeHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MjIyMjAsImV4cCI6MjA3MzE5ODIyMH0.3JYpifirgKd_UjMz5oAgVDa8Q1YiPxr2ONmbheFTnZQ";
    this.sys = [{
      role: "system",
      content: 'Global rules:\n- Never claim to be ChatGPT or a language model; do not mention model details (knowledge cutoff, current date) unless the user asks.\n- Introduce yourself only if the user explicitly asks who you are; otherwise do not state your identity. If asked, reply: "I\'m your Obrolan Baru in ChatCloud."\n- Do not repeat your identity in subsequent messages unless asked again.\n- Skip greetings and fluff; start with the substance. Keep responses concise and actionable. Ask at most one clarifying question if the request is ambiguous.\n- STRUCTURE & FORMATTING:\n  1. FORMATTING: ALWAYS use Markdown. Never send plain text blocks.\n  2. HEADERS: Use ## or ### to break answers into distinct sections.\n  3. LISTS: Prefer bullet points (-) over long paragraphs for explanations.\n  4. EMPHASIS: Use **bold** for key concepts or vocabulary.\n  5. CODE: Always use fenced code blocks (```lang) for code.\n  6. QUOTES: Use > for important takeaways or summaries.\n- TONE: Proffesional but also kind and friendly. Often use emojis 🚀 sparingly to make the text visually engaging, but not overdo it'
    }, {
      role: "system",
      content: "You are a concise, helpful assistant. Prefer facts over speculation. If unsure, say so briefly. Use provided context faithfully."
    }];
  }
  async chat({
    prompt = "Halo",
    messages = [],
    image = null,
    model = "gpt-5.4-nano",
    ...rest
  }) {
    console.log(`[PROCESS] Memulai proses persiapan pesan AI Chat...`);
    try {
      const msgs = [];
      for (const s of this.sys) msgs.push(s);
      for (const m of messages) msgs.push(m);
      const ctx = [];
      if (prompt) ctx.push({
        type: "text",
        text: prompt
      });
      if (image) {
        console.log(`[PROCESS] Memproses berkas media / array image...`);
        const arr = Array.isArray(image) ? image : [image];
        for (const i of arr) {
          const url = i.startsWith("data:") || i.startsWith("http") ? i : `data:image/jpeg;base64,${i}`;
          ctx.push({
            type: "image_url",
            image_url: {
              url: url
            }
          });
        }
      }
      const userMessage = ctx.length > 0 ? {
        role: "user",
        content: ctx
      } : null;
      if (userMessage) msgs.push(userMessage);
      const payload = {
        messages: msgs,
        tools: [],
        capabilities: {
          supportsImages: true,
          supportsAudio: false,
          supportsVideo: false
        },
        webSearchConfig: {
          recencyDays: 30
        },
        model: model,
        ...rest
      };
      const headers = {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-client-id": rest.clientId || this.cid,
        "x-app-version": "1.0.0",
        authorization: `Bearer ${this.tok}`
      };
      console.log(`[POST] Mengirim request stream ke server proxy...`);
      const response = await axios.post(this.url, payload, {
        headers: headers,
        responseType: "stream"
      });
      return new Promise((resolve, reject) => {
        let result = "";
        const chunks = [];
        let buffer = "";
        response.data.on("data", chunk => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              chunks.push(parsed);
              if (parsed.type === "token" && parsed.delta) result += parsed.delta;
            } catch (_) {}
          }
        });
        response.data.on("end", () => {
          const trimmedBuffer = buffer.trim();
          if (trimmedBuffer.startsWith("data: ")) {
            const dataStr = trimmedBuffer.slice(6).trim();
            try {
              const parsed = JSON.parse(dataStr);
              chunks.push(parsed);
              if (parsed.type === "token" && parsed.delta) result += parsed.delta;
            } catch (_) {}
          }
          const assistantMessage = {
            role: "assistant",
            content: result
          };
          const history = [...messages, ...userMessage ? [userMessage] : [], assistantMessage];
          console.log(`[SUCCESS] Selesai memproses stream data.`);
          resolve({
            status: "success",
            result: result,
            history: history,
            chunks: chunks
          });
        });
        response.data.on("error", err => {
          console.error(`[ERROR] Gagal baca stream: ${err.message}`);
          reject(err);
        });
      });
    } catch (err) {
      console.error(`[ERROR] Komunikasi dengan API ChatCloud gagal:`);
      if (err.response) console.error(`-> Status: ${err.response.status}`);
      else console.error(`-> Pesan: ${err.message}`);
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
  const api = new CloudChat();
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