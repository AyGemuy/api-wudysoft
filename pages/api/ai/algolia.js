import axios from "axios";
import crypto from "node:crypto";
class AlgoliaDoc {
  constructor() {
    this.app_id = "PMZUYBQDAK";
    this.api_key = "24b09689d5b4223813d9b8e48563c8f6";
    this.agent_id = "ccdec697-e3fe-465b-a1c3-657e7bf18aef";
    this.base_url = `https://${this.app_id.toLowerCase()}.algolia.net/agent-studio/1`;
    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 6e4,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/json",
        Origin: "https://docsearch.algolia.com",
        Referer: "https://docsearch.algolia.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "x-algolia-application-id": this.app_id,
        "x-algolia-api-key": this.api_key
      }
    });
    this.init();
  }
  init() {
    this.client.interceptors.request.use(config => {
      console.log(`[REQ] -> ${config?.method?.toUpperCase()} ${config?.url}`);
      return config;
    }, error => {
      console.log(`[REQ_ERR] -> ${error?.message}`);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      console.log(`[RES] -> Status: ${response?.status}`);
      return response;
    }, error => {
      console.log(`[RES_ERR] -> Status: ${error?.response?.status || "NO_RES"} - ${error?.message}`);
      return Promise.reject(error);
    });
  }
  genId(len = 16) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
  }
  dpPrs(val) {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          return this.dpPrs(JSON.parse(trimmed));
        } catch {
          return val;
        }
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(item => this.dpPrs(item));
    }
    if (val && typeof val === "object") {
      const res = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = this.dpPrs(v);
      }
      return res;
    }
    return val;
  }
  solvMed(media) {
    if (!media) return null;
    if (Buffer.isBuffer(media)) {
      return `data:image/jpeg;base64,${media.toString("base64")}`;
    }
    if (typeof media === "string") {
      return media.startsWith("data:") || media.startsWith("http") ? media : `data:image/jpeg;base64,${media}`;
    }
    return null;
  }
  bldPart(text, media) {
    const parts = [];
    const media_url = this.solvMed(media);
    if (media_url) {
      parts.push({
        type: "image",
        image: media_url
      });
    }
    if (text) {
      parts.push({
        type: "text",
        text: String(text)
      });
    }
    return parts;
  }
  decSse(raw_stream) {
    const lines = String(raw_stream || "").split("\n");
    const chunks = [];
    const suggestions = [];
    let full_text = "";
    let message_id = null;
    for (const raw_line of lines) {
      const line = raw_line.trim();
      if (!line) continue;
      let payload_raw = line;
      if (line.startsWith("data:")) {
        payload_raw = line.slice(5).trim();
      }
      if (payload_raw === "[DONE]") continue;
      const parsed_data = this.dpPrs(payload_raw);
      chunks.push(parsed_data);
      if (parsed_data && typeof parsed_data === "object") {
        if (parsed_data?.messageId || parsed_data?.id) {
          message_id = message_id || parsed_data?.messageId || parsed_data?.id;
        }
        if (parsed_data?.type === "text-delta" && parsed_data?.delta) {
          full_text += parsed_data.delta;
        } else if (parsed_data?.text) {
          full_text += parsed_data.text;
        }
        if (parsed_data?.type === "data-suggestions" && Array.isArray(parsed_data?.data?.suggestions)) {
          suggestions.push(...parsed_data.data.suggestions);
        } else if (Array.isArray(parsed_data?.suggestions)) {
          suggestions.push(...parsed_data.suggestions);
        }
      }
    }
    return {
      message_id: message_id,
      response: full_text,
      suggestions: suggestions,
      chunks: chunks
    };
  }
  async chat({
    prompt,
    messages = [],
    media = null,
    agent_id = null,
    ...rest
  }) {
    console.log("[PROCESS] Initializing chat session...");
    try {
      const current_agent_id = agent_id || this.agent_id;
      const chat_id = rest?.id || this.genId(16);
      const history = Array.isArray(messages) ? [...messages] : [];
      if (prompt || media) {
        console.log("[PROCESS] Pushing user prompt & media to message history...");
        history.push({
          id: this.genId(16),
          role: "user",
          parts: this.bldPart(prompt, media)
        });
      }
      const payload = {
        id: chat_id,
        messages: history,
        algolia: rest?.algolia || {}
      };
      console.log(`[PROCESS] Sending completion request to agent [${current_agent_id}]...`);
      const endpoint = `/agents/${current_agent_id}/completions?stream=true&compatibilityMode=ai-sdk-5`;
      const response = await this.client.post(endpoint, payload, {
        responseType: "text",
        headers: rest?.headers || {}
      });
      console.log("[PROCESS] Auto-flattening and deep parsing stream chunks...");
      const stream_result = this.decSse(response?.data);
      history.push({
        id: stream_result?.message_id || this.genId(16),
        role: "assistant",
        parts: [{
          type: "text",
          text: stream_result?.response || ""
        }]
      });
      console.log("[PROCESS] Chat process completed.");
      return {
        status: true,
        result: {
          chat_id: chat_id,
          message_id: stream_result?.message_id || null,
          response: stream_result?.response || "",
          suggestions: stream_result?.suggestions || [],
          chunks: stream_result?.chunks || [],
          messages: history
        }
      };
    } catch (error) {
      console.log(`[PROCESS_ERR] -> ${error?.message}`);
      return {
        status: false,
        result: {
          error_message: error?.response?.data || error?.message || "Unknown error occurred"
        }
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
  const api = new AlgoliaDoc();
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