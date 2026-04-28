import axios from "axios";
class LongCat {
  constructor() {
    this.keys = ["ak_2t79F73KI00S1hT4JZ51G9Fg7ut37"];
    this.idx = 0;
  }
  gK() {
    const k = this.keys[this.idx];
    this.idx = (this.idx + 1) % this.keys.length;
    return k;
  }
  fmt(m) {
    if (!m) return null;
    const t = m.includes(".wav") ? "audio" : m.includes(".mp4") ? "video" : "image";
    return {
      type: `input_${t}`,
      [`input_${t}`]: {
        type: "url",
        data: t === "image" ? [m] : m,
        ...t === "audio" ? {
          format: "wav"
        } : {}
      }
    };
  }
  async chat({
    style = "openai",
    prompt = "",
    messages = [],
    media = null,
    ...rest
  }) {
    console.log(`[Log] Requesting to ${style} with prompt: ${prompt.substring(0, 20)}...`);
    try {
      const content = [{
        type: "text",
        text: prompt
      }];
      const mObj = this.fmt(media);
      if (mObj) content.unshift(mObj);
      const payload = {
        model: rest.model || "LongCat-Flash-Omni-2603",
        messages: [...messages, {
          role: "user",
          content: content
        }],
        stream: rest.stream ?? false,
        sessionId: rest.sessionId ?? Date.now().toString(),
        topP: rest.topP ?? .1,
        topK: rest.topK ?? 1,
        ...rest
      };
      const url = `https://api.longcat.chat/${style}/v1/${style === "openai" ? "chat/completions" : "messages"}`;
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.gK()}`,
          "Content-Type": "application/json"
        }
      });
      console.log(`[Log] Success: Status ${res?.status}`);
      return res?.data ?? null;
    } catch (e) {
      console.error(`[Log] Error: ${e?.response?.data?.error?.message ?? e.message}`);
      return {
        error: e?.response?.data ?? "Request failed"
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
  const api = new LongCat();
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