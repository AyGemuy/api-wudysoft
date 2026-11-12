import axios from "axios";
class DeepSeek {
  constructor() {
    this.api = axios.create({
      baseURL: "https://ark.cn-beijing.volces.com/api/v3",
      headers: {
        Authorization: "Bearer 937e9831-d15e-4674-8bd3-a30be3e148e9",
        "Content-Type": "application/json",
        "User-Agent": "okhttp/4.12.0"
      }
    });
    this.history = [];
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    console.log("--- Memulai Proses Chat ---");
    const msg = messages || this.history;
    const model = rest.model ? rest.model : "deepseek-v3-1-250821";
    msg.push({
      role: "user",
      content: prompt || ""
    });
    try {
      console.log(`Mengirim request ke model: ${model}...`);
      const {
        data
      } = await this.api.post("/chat/completions", {
        model: model,
        messages: msg,
        max_tokens: rest.max_tokens || 1024,
        temperature: rest.temperature ?? .1
      });
      const result = data?.choices?.[0]?.message?.content || "";
      if (result) msg.push({
        role: "assistant",
        content: result
      });
      console.log("Proses selesai berhasil.");
      return {
        result: result,
        history: msg,
        info: {
          id: data?.id,
          usage: data?.usage,
          model: data?.model
        }
      };
    } catch (error) {
      console.error("Terjadi kesalahan:", error?.response?.data || error.message);
      throw error;
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
  const api = new DeepSeek();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}