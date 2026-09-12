import axios from "axios";
class MsaClient {
  constructor() {
    try {
      this.baseURL = "https://msa-api-tutor.azurewebsites.net/local/chats/stream/public";
      this.client = axios.create({
        baseURL: this.baseURL,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://medicalstudent.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://medicalstudent.ai/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      this._log("Init success");
    } catch (err) {
      this._log("init error", err.message);
      throw err;
    }
  }
  _log(msg, data = null) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
    if (data) console.log(data);
  }
  async chat({
    tutor = "study",
    prompt,
    messages = [],
    ...rest
  }) {
    this._log(`chat() called with prompt: "${prompt}", tutor: ${tutor}`);
    try {
      const validTutors = ["study", "query", "clinical"];
      const activeTutor = validTutors.includes(tutor.toLowerCase().trim()) ? tutor.toLowerCase().trim() : "study";
      const nowIso = new Date().toISOString();
      messages.push({
        role: "user",
        content: prompt,
        createdAt: nowIso
      });
      const payload = {
        chat: {
          title: prompt,
          createdAt: nowIso,
          updatedAt: nowIso
        },
        userId: "",
        messages: messages,
        tutor: activeTutor,
        webSearch: true,
        ...rest
      };
      const res = await this.client.post("", payload, {
        responseType: "stream"
      });
      let buffer = "";
      let reply = "";
      await new Promise((resolve, reject) => {
        res.data.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data:")) {
              reply += line.slice(5);
            } else if (line.trim()) {
              reply += line;
            }
          }
        });
        res.data.on("end", () => {
          if (buffer.startsWith("data:")) {
            reply += buffer.slice(5);
          } else if (buffer.trim()) {
            reply += buffer;
          }
          resolve();
        });
        res.data.on("error", err => reject(err));
      });
      this._log("Stream received and parsed successfully");
      messages.push({
        role: "assistant",
        content: reply,
        createdAt: new Date().toISOString()
      });
      return {
        status: true,
        result: reply,
        messages: messages
      };
    } catch (err) {
      this._log("chat() error", err.message);
      return {
        status: false,
        result: err.message,
        messages: messages
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
  const api = new MsaClient();
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