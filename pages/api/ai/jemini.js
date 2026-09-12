import crypto from "crypto";
import axios from "axios";
const BASE_URL = "https://www.jmail.world";
const ANON_ID = `anon_${crypto.randomUUID()}`;
class JeminiChat {
  constructor() {
    this.id = crypto.randomUUID();
    this.messages = [];
    this.model = "gemini";
    this.anonUserId = ANON_ID;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      cookie: `jmail_anim_suppress=1; jsuite_user_id=${this.anonUserId}`,
      origin: BASE_URL,
      referer: `${BASE_URL}/jemini`,
      "user-agent": "Mozilla/5.0 (Node.js/Jemini) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.send = this.chat;
    this.suggest = this.getSuggestions;
    this.history = this.messages;
  }
  _toSnakeCase(obj) {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this._toSnakeCase(item));
    const newObj = {};
    for (const camel in obj) {
      if (Object.hasOwnProperty.call(obj, camel)) {
        const snake = camel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snake] = this._toSnakeCase(obj[camel]);
      }
    }
    return newObj;
  }
  hToO(headers) {
    const obj = {};
    if (headers && typeof headers === "object") {
      for (const key in headers) {
        if (Object.hasOwnProperty.call(headers, key)) {
          obj[key.toLowerCase()] = headers[key];
        }
      }
    }
    return obj;
  }
  isUrl(str) {
    try {
      return Boolean(new URL(str));
    } catch (e) {
      return false;
    }
  }
  async toPart(media, mediaTypeHint = "image/jpeg") {
    if (!media) return null;
    let buffer;
    let mediaType = mediaTypeHint;
    try {
      console.log("[JEMINI:LOG] Processing media input...");
      if (this.isUrl(media)) {
        console.log(`[JEMINI:LOG] Fetching media from URL: ${media.substring(0, 50)}...`);
        const response = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(response.data);
        mediaType = response.headers["content-type"] || mediaTypeHint;
      } else if (media instanceof Buffer || media instanceof Uint8Array) {
        buffer = Buffer.from(media);
      } else if (typeof media === "string") {
        if (media.startsWith("data:")) {
          const parts = media.split(",");
          const metadata = parts[0];
          mediaType = metadata.split(":")[1].split(";")[0];
          buffer = Buffer.from(parts[1], metadata.split(";").pop().toLowerCase() === "base64" ? "base64" : "binary");
        } else if (media.length > 100 && media.match(/^[A-Za-z0-9+/=]+$/)) {
          buffer = Buffer.from(media, "base64");
        } else {
          console.warn("[JEMINI:WARN] Media input tidak dikenali.");
          return null;
        }
      } else {
        console.warn("[JEMINI:WARN] Media input tidak valid.");
        return null;
      }
      if (!buffer) throw new Error("Could not convert media to buffer.");
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mediaType};base64,${base64}`;
      console.log(`[JEMINI:LOG] Media processed as ${mediaType}.`);
      return {
        type: "file",
        mediaType: mediaType,
        url: dataUrl
      };
    } catch (error) {
      console.error(`[JEMINI:ERROR] Media processing failed: ${error.message || error}`);
      return null;
    }
  }
  parseSSER(rawText) {
    const lines = rawText.split("\n").filter(line => line.trim() !== "");
    const events = [];
    for (const line of lines) {
      if (line.startsWith("data:")) {
        let jsonString = line.slice(5).trim();
        try {
          const eventData = JSON.parse(jsonString);
          events.push(eventData);
        } catch (e) {
          console.warn(`[JEMINI:WARN] Failed to parse event JSON: ${jsonString.substring(0, 50)}...`);
          if (jsonString === "[DONE]") {
            events.push({
              type: "stream-end"
            });
          }
        }
      }
    }
    return events;
  }
  async api(path, data, isSser = true) {
    const url = `${BASE_URL}${path}`;
    try {
      console.log(`[JEMINI:LOG] Sending request to ${url} (SSER: ${isSser})`);
      const response = await axios({
        method: "POST",
        url: url,
        headers: this.headers,
        data: data,
        responseType: isSser ? "text" : "json",
        validateStatus: () => true
      });
      const status = response.status || 500;
      let responseData;
      if (isSser) {
        const rawText = response.data;
        if (status < 200 || status >= 300) {
          try {
            responseData = JSON.parse(rawText);
          } catch {}
          const errorMessage = responseData?.error?.message || responseData?.message || rawText?.substring(0, 100) || `HTTP Error ${status}`;
          throw new Error(`API Call Failed (${status}): ${errorMessage}`);
        }
        const parsedEvents = this.parseSSER(rawText);
        let fullText = "";
        let finalMessage = {};
        for (const event of parsedEvents) {
          if (event.type === "text-delta") {
            fullText += event.delta;
          } else if (event.type === "start") {
            finalMessage.id = event.messageId;
          }
        }
        responseData = {
          messages: [{
            id: finalMessage.id || crypto.randomUUID(),
            role: "assistant",
            parts: [{
              type: "text",
              text: fullText
            }]
          }]
        };
      } else {
        responseData = response.data;
        if (status < 200 || status >= 300) {
          const errorMessage = responseData?.error?.message || responseData?.message || `HTTP Error ${status}`;
          throw new Error(`API Call Failed (${status}): ${errorMessage}`);
        }
      }
      console.log(`[JEMINI:LOG] Request successful (${status}).`);
      return {
        result: responseData,
        status: status
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || error;
      console.error(`[JEMINI:ERROR] API Call Exception on ${path}: ${msg}`);
      throw new Error(`Jemini API Error: ${msg}`);
    }
  }
  async chat({
    model,
    prompt,
    messages,
    history,
    media,
    suggest = true,
    ...rest
  }) {
    let userParts = [];
    const mediaArray = Array.isArray(media) ? media : media ? [media] : [];
    const currentMessages = messages || history || this.messages;
    const modelToUse = model || this.model;
    const updateInternalHistory = !(messages || history);
    for (const m of mediaArray) {
      let data = m;
      let typeHint = undefined;
      if (typeof m === "object" && m !== null && "data" in m) {
        data = m.data;
        typeHint = m.type;
      }
      const part = await this.toPart(data, typeHint);
      if (part) {
        userParts.push(part);
      }
    }
    if (prompt) {
      userParts.push({
        type: "text",
        text: prompt
      });
    }
    if (userParts.length === 0) {
      throw new Error("Chat input error: 'prompt' or valid 'media' is required.");
    }
    const newUserMessage = {
      parts: userParts,
      id: crypto.randomUUID(),
      role: "user"
    };
    const payload = {
      model: modelToUse,
      id: this.id,
      messages: [...currentMessages, newUserMessage].map(m => ({
        parts: m.parts.map(p => ({
          type: p.type,
          text: p.text || undefined,
          url: p.url || undefined,
          mediaType: p.mediaType || undefined
        })),
        id: m.id,
        role: m.role
      })),
      trigger: "submit-message",
      ...rest
    };
    try {
      const {
        result: apiResult,
        status
      } = await this.api("/api/chat", payload, true);
      if (updateInternalHistory) {
        this.messages = [...this.messages, newUserMessage];
      }
      const assistantMessage = apiResult?.messages?.[0];
      if (!assistantMessage) {
        const emptyResponse = "Oops! The assistant response was empty.";
        if (updateInternalHistory) {
          this.messages = [...this.messages, {
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [{
              type: "text",
              text: emptyResponse
            }]
          }];
        }
        return this._toSnakeCase({
          result: emptyResponse,
          fullMessage: null,
          suggestions: [],
          status: status
        });
      }
      const textPart = assistantMessage.parts?.find(p => p.type === "text");
      const text = textPart?.text || "";
      const finalAssistantMessage = {
        ...assistantMessage,
        id: assistantMessage.id || crypto.randomUUID(),
        role: "assistant",
        parts: assistantMessage.parts || []
      };
      if (updateInternalHistory) {
        this.messages = [...this.messages, finalAssistantMessage];
      }
      let chatResult = {
        result: text,
        fullMessage: finalAssistantMessage,
        suggestions: [],
        status: status
      };
      if (suggest) {
        const finalMessages = updateInternalHistory ? this.messages : [...currentMessages, newUserMessage, finalAssistantMessage];
        const suggestionsResult = await this.suggest({
          messages: finalMessages
        });
        chatResult.suggestions = suggestionsResult?.result || [];
      }
      return this._toSnakeCase(chatResult);
    } catch (error) {
      throw error;
    }
  }
  async getSuggestions({
    messages
  }) {
    const payload = {
      messages: messages.slice(-2).filter(m => m.role === "user" || m.role === "assistant").map(m => ({
        role: m.role,
        content: m.parts?.find(p => p.type === "text")?.text || ""
      }))
    };
    if (payload.messages[payload.messages.length - 1]?.role === "user") {
      payload.messages.push({
        role: "assistant",
        content: ""
      });
    }
    try {
      const {
        result: apiResult,
        status
      } = await this.api("/api/chat/suggestions", payload, false);
      const suggestions = apiResult?.suggestions?.length > 0 ? apiResult.suggestions : [];
      return this._toSnakeCase({
        result: suggestions,
        status: status
      });
    } catch (error) {
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
  const api = new JeminiChat();
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