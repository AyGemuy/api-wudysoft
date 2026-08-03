import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class ChatexAI {
  constructor() {
    try {
      this.jar = {};
      this.cli = axios.create({
        baseURL: `${proxy}https://chat.chatex.ai`,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          baggage: "sentry-environment=production,sentry-release=7669599d495a2f7f8a39fe8dad27f25d15fecdae,sentry-public_key=880e3505fa2495c8dd95c43f87c2e15c,sentry-trace_id=0c2bdce0298144d4875ac95140fd1192,sentry-org_id=4507661611630592,sentry-transaction=%2F%3Alocale,sentry-sampled=false,sentry-sample_rand=0.25271584143783277,sentry-sample_rate=0.1",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://chat.chatex.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://chat.chatex.ai/en?_gl=1*1tedq31*_gcl_au*MTA0MzEwNTkyMi4xNzg1NzM4OTQx",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sentry-trace": "0c2bdce0298144d4875ac95140fd1192-85157b77c04863dd-0",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.cli.interceptors.request.use(cfg => {
        try {
          const c = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
          if (c) cfg.headers.Cookie = c;
        } catch (e) {
          this._log(`Req Interceptor Error: ${e?.message}`);
        }
        return cfg;
      });
      this.cli.interceptors.response.use(res => {
        try {
          const sc = res.headers["set-cookie"] || res.headers["Set-Cookie"];
          if (sc) {
            const arr = Array.isArray(sc) ? sc : [sc];
            arr.forEach(item => {
              const [kv] = item.split(";");
              const [k, ...v] = kv.split("=");
              if (k) this.jar[k.trim()] = v.join("=").trim();
            });
          }
        } catch (e) {
          this._log(`Res Interceptor Error: ${e?.message}`);
        }
        return res;
      });
    } catch (err) {
      console.error("[Chatex] Init Class Error:", err?.message);
    }
  }
  _log(m) {
    try {
      console.log(`[Chatex] ${m}`);
    } catch {
      return null;
    }
  }
  _sd(s) {
    try {
      return typeof s === "string" ? JSON.parse(Buffer.from(s, "base64").toString("utf-8")) : s || {};
    } catch {
      return {};
    }
  }
  _se(d) {
    try {
      return Buffer.from(JSON.stringify(d || {})).toString("base64");
    } catch {
      return "";
    }
  }
  async _img(src) {
    try {
      this._log("Resolving image data...");
      let buf = null,
        mime = "image/jpeg";
      if (Buffer.isBuffer(src)) {
        buf = src;
      } else if (typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"))) {
        const res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res.data);
        mime = res.headers?.["content-type"] || mime;
      } else if (typeof src === "string") {
        const match = src.match(/^data:(image\/\w+);base64,/);
        mime = match ? match[1] : mime;
        const b64 = match ? src.substring(match[0].length) : src;
        buf = Buffer.from(b64, "base64");
      } else {
        this._log("Format gambar tidak terdeteksi");
        return null;
      }
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const fn = `${crypto.randomUUID()}.${ext}`;
      return {
        buf: buf,
        mime: mime,
        fn: fn
      };
    } catch (e) {
      this._log(`Image process error: ${e?.message}`);
      return null;
    }
  }
  async _init() {
    try {
      this._log("Initializing session & fingerprint...");
      const vid = this.jar["cb_vid"] || crypto.randomUUID().replace(/-/g, "");
      this.jar["cb_vid"] = vid;
      await this.cli.post("/api/v/init", {
        tz: "Asia/Makassar",
        tzo: -480,
        ch: {
          brands: [{
            brand: "Chromium",
            version: "127"
          }, {
            brand: "Not)A;Brand",
            version: "99"
          }, {
            brand: "Microsoft Edge Simulate",
            version: "127"
          }, {
            brand: "Lemur",
            version: "127"
          }],
          mobile: true,
          platform: "Android",
          architecture: "",
          bitness: "",
          fullVersionList: [{
            brand: "Chromium",
            version: "127.0.6533.144"
          }, {
            brand: "Not)A;Brand",
            version: "99.0.0.0"
          }, {
            brand: "Microsoft Edge Simulate",
            version: "127.0.6533.144"
          }, {
            brand: "Lemur",
            version: "127.0.6533.144"
          }],
          model: "RMX3890",
          platformVersion: "15.0.0"
        }
      });
      await this.cli.post("/api/v/fingerprint", {
        fpid: vid,
        confidence: .4,
        version: "5.0.1"
      });
      return true;
    } catch (e) {
      this._log(`Init error: ${e?.message}`);
      return false;
    }
  }
  async _up(imgSrc) {
    try {
      const imgData = await this._img(imgSrc);
      if (!imgData || !imgData.buf) return null;
      const {
        buf,
        mime,
        fn
      } = imgData;
      const path = `chat-attachments/${fn}`;
      this._log(`Getting presign client-upload token for ${fn}...`);
      const tokenRes = await this.cli.post("/api/blob/client-upload", {
        payload: {
          clientPayload: JSON.stringify({
            fileName: fn,
            mediaType: mime,
            surface: "chat-attachment"
          }),
          multipart: false,
          pathname: path
        },
        type: "blob.generate-client-token"
      });
      const token = tokenRes?.data?.clientToken;
      if (!token) {
        this._log("Client upload token missing");
        return null;
      }
      this._log("Uploading binary blob to Vercel Storage...");
      const upRes = await axios.put(`https://vercel.com/api/blob/?pathname=${encodeURIComponent(path)}`, buf, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          authorization: `Bearer ${token}`,
          "cache-control": "no-cache",
          "content-length": buf.length,
          "content-type": mime,
          origin: "https://chat.chatex.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://chat.chatex.ai/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-api-blob-request-attempt": "0",
          "x-api-version": "12",
          "x-content-type": mime,
          "x-vercel-blob-access": "public"
        }
      });
      const url = upRes?.data?.url || `https://vrvzbhgjpa088lgv.public.blob.vercel-storage.com/${path}`;
      return {
        url: url,
        filename: fn,
        name: fn,
        mediaType: mime
      };
    } catch (e) {
      this._log(`Upload error: ${e?.message}`);
      return null;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    image,
    ...rest
  }) {
    try {
      this._log("Preparing chat request...");
      const savedState = this._sd(state);
      this.jar = savedState?.cookies ? {
        ...savedState.cookies
      } : this.jar;
      if (!this.jar["cb_vid"] || !this.jar["anon_session_id"]) {
        await this._init();
      }
      const parts = [];
      if (image) {
        const imgList = Array.isArray(image) ? image : [image];
        for (const imgItem of imgList) {
          this._log("Processing upload for image...");
          const fileObj = await this._up(imgItem);
          if (fileObj) {
            parts.push({
              type: "file",
              ...fileObj
            });
          }
        }
      }
      if (prompt) {
        parts.push({
          type: "text",
          text: prompt
        });
      }
      const defaultMsg = {
        role: "user",
        parts: parts,
        id: crypto.randomUUID()
      };
      let payload = {
        id: crypto.randomUUID(),
        message: defaultMsg,
        selectedChatModel: "chatex/auto",
        selectedVisibilityType: "private",
        webSearchEnabled: false,
        imageGenerationEnabled: false,
        isExistingChat: false
      };
      if (messages) {
        if (Array.isArray(messages)) {
          payload.messages = [...messages];
          if (parts.length > 0) payload.messages.push(defaultMsg);
        } else {
          payload.messages = messages;
        }
      }
      payload = {
        ...payload,
        ...rest
      };
      this._log("Posting request to /api/chat stream...");
      const response = await this.cli.post("/api/chat", payload, {
        responseType: "stream"
      });
      return new Promise(resolve => {
        try {
          let result = "";
          const chunks = [];
          let bufferStr = "";
          response.data.on("data", chunk => {
            try {
              bufferStr += chunk.toString("utf-8");
              const lines = bufferStr.split("\n");
              bufferStr = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;
                const rawData = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5).trim();
                if (rawData === "[DONE]") continue;
                try {
                  const json = JSON.parse(rawData);
                  chunks.push(json);
                  if (json?.type === "text-delta" && json?.delta) {
                    result += json.delta;
                  }
                } catch {}
              }
            } catch (e) {
              this._log(`Stream chunk error: ${e?.message}`);
            }
          });
          response.data.on("end", () => {
            try {
              this._log("Stream processing completed.");
              resolve({
                status: true,
                result: result,
                chunks: chunks,
                state: this._se({
                  cookies: this.jar
                })
              });
            } catch (e) {
              resolve({
                status: false,
                result: null,
                chunks: [],
                state: this._se({
                  cookies: this.jar
                })
              });
            }
          });
          response.data.on("error", err => {
            this._log(`Stream error event: ${err?.message}`);
            resolve({
              status: false,
              result: null,
              chunks: [],
              state: this._se({
                cookies: this.jar
              })
            });
          });
        } catch (e) {
          this._log(`Stream listener error: ${e?.message}`);
          resolve({
            status: false,
            result: null,
            chunks: [],
            state: this._se({
              cookies: this.jar
            })
          });
        }
      });
    } catch (err) {
      this._log(`Chat execution error: ${err?.message || "Unknown Error"}`);
      return {
        status: false,
        result: null,
        chunks: [],
        state: this._se({
          cookies: this.jar
        })
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
  const api = new ChatexAI();
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