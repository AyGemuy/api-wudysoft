import axios from "axios";
import crypto from "crypto";
class SurfClient {
  constructor() {
    this.base = "https://www.surfsense.com";
    this.api = "https://api.surfsense.com";
    this.models = ["gpt-5.4-mini-no-login", "gpt-o4-mini-no-login"];
    this.cookie = "";
    this.http = axios.create({
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID",
        pragma: "no-cache",
        "cache-control": "no-cache"
      }
    });
  }
  _enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (e) {
      return "";
    }
  }
  _dec(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch (e) {
      return null;
    }
  }
  _gen() {
    console.log("[LOG] Membuat session token anonim secara lokal...");
    const token = crypto.randomBytes(32).toString("base64url");
    return `surfsense_anon_session=t-${token}`;
  }
  _hdr(customState) {
    const activeCookies = customState?.cookie || this.cookie;
    return {
      cookie: activeCookies || undefined,
      ...customState
    };
  }
  async chat({
    state,
    prompt,
    messages,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai chat stream...");
      const targetModel = this.models.includes(rest?.model_slug) ? rest.model_slug : this.models[0];
      let decodedState = null;
      if (typeof state === "string") {
        decodedState = this._dec(state);
        this.cookie = decodedState?.cookie || this.cookie;
      } else if (state && typeof state === "object") {
        decodedState = state;
        this.cookie = state?.cookie || this.cookie;
      }
      if (!decodedState && !this.cookie) {
        this.cookie = this._gen();
        decodedState = {
          cookie: this.cookie
        };
      }
      const activeState = decodedState || {
        cookie: this.cookie
      };
      let finalMessages = messages ? [...messages] : [];
      if (prompt) {
        finalMessages.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        model_slug: targetModel,
        messages: finalMessages,
        ...rest
      };
      const calculatedHeaders = this._hdr(activeState);
      const reqHeaders = {
        ...calculatedHeaders,
        accept: "*/*",
        "content-type": "application/json",
        origin: this.base,
        referer: `${this.base}/`,
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      };
      const response = await this.http.post(`${this.api}/api/v1/public/anon-chat/stream`, payload, {
        headers: reqHeaders,
        responseType: "stream"
      });
      if (response?.status !== 200) {
        return {
          status: response?.status || 400,
          result: "",
          chunks: [],
          state: this._enc(activeState),
          messages: finalMessages
        };
      }
      let fullText = "";
      const totalChunks = [];
      return new Promise(resolve => {
        response.data.on("data", chunk => {
          const bufferStr = chunk.toString();
          const lines = bufferStr.split("\n");
          for (let line of lines) {
            line = line.trim();
            if (!line || line.slice(0, 6) !== "data: ") continue;
            const rawData = line.slice(6).trim();
            if (rawData === "[DONE]") continue;
            try {
              const json = JSON.parse(rawData);
              totalChunks.push(json);
              const textDelta = json?.type === "text-delta" ? json?.delta : "";
              if (textDelta) {
                fullText += textDelta;
                process.stdout.write(textDelta);
              }
            } catch (e) {}
          }
        });
        response.data.on("end", () => {
          console.log("\n[LOG] Stream selesai.");
          finalMessages.push({
            role: "assistant",
            content: fullText
          });
          resolve({
            status: response?.status || 200,
            result: fullText,
            chunks: totalChunks,
            state: this._enc(activeState),
            messages: finalMessages
          });
        });
        response.data.on("error", err => {
          resolve({
            status: 500,
            result: "",
            chunks: totalChunks,
            state: this._enc(activeState),
            messages: finalMessages,
            error: err?.message
          });
        });
      });
    } catch (err) {
      console.error("[ERR] Terjadi kesalahan saat chat:", err?.response?.data || err?.message || err);
      return {
        status: err?.response?.status || 500,
        result: "",
        chunks: [],
        state: typeof state === "string" ? state : this._enc(state || {}),
        messages: messages || []
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
  const api = new SurfClient();
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