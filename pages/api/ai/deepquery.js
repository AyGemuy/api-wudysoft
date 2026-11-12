import axios from "axios";
class DeepQuery {
  constructor() {
    this.model = "meta-llama/llama-4-scout-17b-16e-instruct";
    this.workerUrl = "https://exciting-deepquery.corp-exciting.workers.dev/chat";
    this.appToken = "exciting-deepquery-nhy0415";
  }
  async solve(file) {
    if (!file) return null;
    try {
      if (typeof file === "string" && file.startsWith("http")) {
        const res = await axios.get(file, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(file).origin
          }
        });
        const base64 = Buffer.from(res.data).toString("base64");
        return `data:${res.headers["content-type"] || "image/jpeg"};base64,${base64}`;
      }
      return Buffer.isBuffer(file) ? `data:image/jpeg;base64,${file.toString("base64")}` : file;
    } catch {
      return null;
    }
  }
  async chat({
    prompt,
    messages,
    history = [],
    file,
    stream = false,
    ...rest
  }) {
    const media = await this.solve(file);
    const sys = `You are a knowledgeable AI assistant for Deep Query — an app focused on deep, high-quality knowledge.
        Instructions:
        - Answer with depth and accuracy
        - Use plain text only (no LaTeX)
        - Format code blocks with triple backticks
        - Be conversational but substantive`;
    const payload = messages || [{
      role: "system",
      content: sys
    }, ...history, {
      role: "user",
      content: media ? [{
        type: "text",
        text: prompt
      }, {
        type: "image_url",
        image_url: {
          url: media
        }
      }] : prompt
    }];
    try {
      const res = await axios({
        method: "post",
        url: this.workerUrl,
        data: {
          model: this.model,
          messages: payload,
          stream: stream,
          temperature: .3,
          top_p: .9,
          max_completion_tokens: 3e3,
          ...rest
        },
        headers: {
          "x-app-token": this.appToken,
          Accept: stream ? "text/event-stream" : "application/json"
        },
        responseType: stream ? "stream" : "json"
      });
      return res.data;
    } catch (e) {
      return {
        error: true,
        msg: e.message
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
  const api = new DeepQuery();
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