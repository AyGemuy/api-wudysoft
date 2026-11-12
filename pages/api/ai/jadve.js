import axios from "axios";
class Jadve {
  constructor() {
    this.base = "https://ai-api.jadve.com/api";
    this.token = "pRFp5izrZVXgBoWsRjTBVklJ6c4ub0fM";
    this.msgs = [];
    this.api = axios.create({
      timeout: 6e4,
      headers: {
        "User-Agent": "okhttp/5.3.2",
        "x-waf-token": this.token,
        source: "android",
        "Accept-Encoding": "gzip"
      }
    });
  }
  log(m) {
    console.log(`[${new Date().toLocaleTimeString()}] [Jadve] ${m}`);
  }
  async models({
    ...rest
  }) {
    this.log("Fetching models...");
    try {
      const {
        data
      } = await this.api.get(`${this.base}/models`, {
        params: {
          ...rest
        }
      });
      return {
        result: data?.models || []
      };
    } catch (e) {
      this.log(`Models Error: ${e.message}`);
      throw e;
    }
  }
  async chat({
    model,
    prompt,
    messages,
    ...rest
  }) {
    this.log(`Chatting with model: ${model || "gpt-5-mini"}`);
    try {
      const input = prompt || "Hello";
      const targetModel = model ? model : "gpt-5-mini";
      if (messages) this.msgs = messages;
      this.msgs.push({
        content: [{
          text: input,
          type: "text"
        }],
        role: "user"
      });
      const {
        data
      } = await this.api.post(`${this.base}/chat`, {
        messages: this.msgs,
        model: targetModel,
        returnTokensUsage: true,
        stream: true,
        temperature: rest?.temp ?? .7,
        useTools: false,
        ...rest
      });
      const lines = data?.split("\n") || [];
      let fullText = "";
      let info = {};
      for (const line of lines) {
        if (!line) continue;
        const prefix = line.slice(0, 2);
        const content = line.slice(2);
        if (prefix === "0:") {
          try {
            fullText += JSON.parse(content);
          } catch {
            fullText += content;
          }
        } else if (prefix === "e:" || prefix === "f:" || prefix === "d:") {
          try {
            Object.assign(info, JSON.parse(content));
          } catch {
            info[prefix[0]] = content;
          }
        }
      }
      this.msgs.push({
        content: [{
          text: fullText,
          type: "text"
        }],
        role: "assistant"
      });
      return {
        result: fullText,
        status: true,
        ...info
      };
    } catch (e) {
      const errMsg = e.response?.data || e.message;
      this.log(`Chat Error: ${errMsg}`);
      return {
        result: null,
        status: false,
        error: errMsg
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=chat&prompt=hai"
      }
    });
  }
  const api = new Jadve();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}