import axios from "axios";
class SmartChat {
  constructor() {
    this.key = "sk-8d134604d7b141168053714e79726b40";
    this.url = "https://iz8asbyu66.execute-api.us-east-1.amazonaws.com/prod/aichatbot";
    this.sys = "You are a helpful AI assistant. Answer the user's request clearly and concisely.";
  }
  async chat({
    prompt,
    model = "deepseek-v4-flash",
    messages = [],
    ...rest
  }) {
    if (!this.key) return console.log("[ERR] Key missing."), null;
    try {
      if (!messages.length) {
        let systemInstruction = this.sys;
        if (!systemInstruction.toLowerCase().includes("reply in")) {
          systemInstruction += " Please reply in English.";
        }
        messages.push({
          role: "system",
          content: systemInstruction
        });
      }
      if (prompt) messages.push({
        role: "user",
        content: prompt
      });
      const res = await axios.post(this.url, {
        model: model,
        temperature: .6,
        stream: false,
        messages: messages,
        ...rest
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`
        },
        timeout: 6e4
      });
      const msg = res.data?.choices?.[0]?.message;
      if (msg) messages.push(msg);
      return {
        ...res.data,
        messages: messages
      };
    } catch (err) {
      return console.log(`[ERR] ${err.response?.status || "CONN"} - ${err.message}`),
        null;
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
  const api = new SmartChat();
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