import axios from "axios";
import WebSocket from "ws";
import crypto from "crypto";
class MultiChatsClient {
  constructor() {
    try {
      console.log("[LOG] Memuat konfigurasi model dalam format Array...");
      this.models = [{
        id: "chat-latest",
        name: "ChatGPT Latest",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 4e5
      }, {
        id: "gpt-5.6-sol",
        name: "GPT-5.6 Sol",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 105e4
      }, {
        id: "gpt-5.6-terra",
        name: "GPT-5.6 Terra",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 105e4
      }, {
        id: "gpt-5.6-luna",
        name: "GPT-5.6 Luna",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 105e4
      }, {
        id: "gpt-5.5",
        name: "GPT-5.5",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 105e4
      }, {
        id: "gpt-5.4",
        name: "GPT-5.4",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 105e4
      }, {
        id: "gpt-5.4-mini",
        name: "GPT-5.4 Mini",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 4e5
      }, {
        id: "gpt-5.4-nano",
        name: "GPT-5.4 Nano",
        provider: "OpenAI",
        premium: false,
        enabled: true,
        category: "openai",
        context: 4e5
      }, {
        id: "gpt-5.3-chat-latest",
        name: "GPT-5.3 Instant",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5.2",
        name: "GPT-5.2",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5.2-chat-latest",
        name: "GPT-5.2 Instant",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5.1",
        name: "GPT-5.1",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5.1-chat-latest",
        name: "GPT-5.1 Instant",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5",
        name: "GPT-5",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5-chat-latest",
        name: "GPT-5 Instant",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-5-mini",
        name: "GPT-5 Mini",
        provider: "OpenAI",
        premium: true,
        enabled: false,
        category: "openai",
        context: 128e3
      }, {
        id: "gpt-4o",
        name: "GPT 4o",
        provider: "OpenAI",
        premium: true,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "openai/gpt-oss-120b:exacto",
        name: "GPT-OSS 120B",
        provider: "OpenAI",
        premium: false,
        enabled: true,
        category: "openai",
        context: 128e3
      }, {
        id: "claude-sonnet-5",
        name: "Claude Sonnet 5",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 1e6
      }, {
        id: "claude-opus-4-8",
        name: "Claude Opus 4.8",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 1e6
      }, {
        id: "claude-opus-4-7",
        name: "Claude Opus 4.7",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-opus-4-6",
        name: "Claude Opus 4.6",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-opus-4-5",
        name: "Claude Opus 4.5",
        provider: "Anthropic",
        premium: true,
        enabled: false,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-opus-4-1",
        name: "Claude Opus 4.1",
        provider: "Anthropic",
        premium: true,
        enabled: false,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-sonnet-4-5",
        name: "Claude Sonnet 4.5",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 2e5
      }, {
        id: "claude-sonnet-4-0",
        name: "Claude 4 Sonnet",
        provider: "Anthropic",
        premium: true,
        enabled: true,
        category: "anthropic",
        context: 2e5
      }, {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        provider: "Google",
        premium: true,
        enabled: true,
        category: "gemini",
        context: 2e6
      }, {
        id: "gemini-3.5-flash",
        name: "Gemini 3.5 Flash",
        provider: "Google",
        premium: true,
        enabled: true,
        category: "gemini",
        context: 1e6
      }, {
        id: "gemini-3-flash",
        name: "Gemini 3 Flash",
        provider: "Google",
        premium: true,
        enabled: true,
        category: "gemini",
        context: 1e6
      }, {
        id: "gemini-3.1-flash-lite",
        name: "Gemini 3.1 Flash Lite",
        provider: "Google",
        premium: false,
        enabled: true,
        category: "gemini",
        context: 1e6
      }, {
        id: "gemini-3.1-flash-lite-preview",
        name: "Gemini 3.1 Flash Lite",
        provider: "Google",
        premium: false,
        enabled: true,
        category: "gemini",
        context: 1e6
      }, {
        id: "gemini-3-pro-preview",
        name: "Gemini 3 Pro Preview",
        provider: "Google",
        premium: true,
        enabled: true,
        category: "gemini",
        context: 1e6
      }, {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "Google",
        premium: false,
        enabled: true,
        category: "gemini",
        context: 1e6
      }, {
        id: "grok-4.3-reasoning",
        name: "Grok 4.3 Reasoning",
        provider: "xAI",
        premium: true,
        enabled: true,
        category: "xAI",
        context: 1e6
      }, {
        id: "grok-4.3",
        name: "Grok 4.3",
        provider: "xAI",
        premium: true,
        enabled: true,
        category: "xAI",
        context: 1e6
      }, {
        id: "grok-4-1-fast-reasoning",
        name: "Grok 4.1 Fast Reasoning",
        provider: "xAI",
        premium: true,
        enabled: true,
        category: "xAI",
        context: 1e6
      }, {
        id: "grok-4-1-fast",
        name: "Grok 4.1 Fast",
        provider: "xAI",
        premium: true,
        enabled: true,
        category: "xAI",
        context: 1e6
      }, {
        id: "meta-llama/llama-4-maverick",
        name: "Llama 4 Maverick",
        provider: "Meta",
        premium: false,
        enabled: true,
        category: "llama",
        context: 1048576
      }, {
        id: "llama-4-scout",
        name: "Llama 4 Scout",
        provider: "Meta",
        premium: false,
        enabled: false,
        category: "llama"
      }, {
        id: "llama-3.3-70b",
        name: "Llama 3.3 70b",
        provider: "Meta",
        premium: false,
        enabled: false,
        category: "llama"
      }, {
        id: "mistralai/mistral-small-3.2-24b-instruct",
        name: "Mistral Small 3.2",
        provider: "Mistral",
        premium: false,
        enabled: true,
        category: "mistral",
        context: 128e3
      }, {
        id: "mistralai/mistral-small-2603",
        name: "Mistral Small 4",
        provider: "Mistral",
        premium: false,
        enabled: true,
        category: "mistral",
        context: 262144
      }];
      this.client = null;
      this._init();
    } catch (e) {
      console.error("[LOG] Gagal mengeksekusi constructor:", e.message);
    }
  }
  _init() {
    try {
      console.log("[LOG] Menginisialisasi HTTP Client...");
      this.client = axios.create({
        baseURL: "https://www.multichats.ai",
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://www.multichats.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.client.interceptors.response.use(res => {
        const activeState = res.config?.state;
        const sc = res.headers?.["set-cookie"] || res.headers?.["Set-Cookie"];
        if (sc && activeState) {
          activeState.cookies = activeState.cookies || {};
          sc.forEach(cookie => {
            const [part] = cookie.split(";");
            const [key, value] = part.split("=");
            if (key && value) {
              activeState.cookies[key.trim()] = value.trim();
            }
          });
        }
        return res;
      }, err => Promise.reject(err));
    } catch (e) {
      console.error("[LOG] Gagal menginisialisasi HTTP Client:", e.message);
    }
  }
  _ckStr(state) {
    try {
      const activeCookies = state?.cookies || {};
      return Object.entries(activeCookies).map(([k, v]) => `${k}=${v}`).join("; ") || "cookie_consent=accepted";
    } catch (e) {
      console.error("[LOG] Gagal menyusun string Cookie:", e.message);
      return "cookie_consent=accepted";
    }
  }
  _ensure(stateInput) {
    try {
      let s = {};
      if (typeof stateInput === "string" && stateInput.trim()) {
        try {
          const decoded = Buffer.from(stateInput, "base64").toString("utf-8");
          s = JSON.parse(decoded);
        } catch (e) {
          console.warn("[LOG] Gagal melakukan decode state base64, membuat state baru...");
          s = {};
        }
      } else if (stateInput && typeof stateInput === "object") {
        s = stateInput;
      }
      s.threadId = s.threadId || crypto.randomUUID();
      s.convexSessionId = s.convexSessionId || crypto.randomUUID();
      s.wsSessionId = s.wsSessionId || crypto.randomUUID();
      s.cookies = s.cookies || {};
      return s;
    } catch (e) {
      console.error("[LOG] Gagal pada state ensure:", e.message);
      return {};
    }
  }
  _encode(stateObj) {
    try {
      const str = JSON.stringify(stateObj);
      return Buffer.from(str, "utf-8").toString("base64");
    } catch (e) {
      console.error("[LOG] Gagal melakukan encode state ke base64:", e.message);
      return "";
    }
  }
  _wsConn(state, onMsg) {
    return new Promise((resolve, reject) => {
      try {
        console.log("[LOG] Membuka koneksi WebSocket Convex...");
        const wsUrl = "wss://wary-cuttlefish-113.convex.cloud/api/1.42.3/sync";
        const ws = new WebSocket(wsUrl, {
          headers: {
            Pragma: "no-cache",
            Origin: "https://www.multichats.ai",
            "Accept-Language": "id-ID",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            "Cache-Control": "no-cache"
          }
        });
        ws.on("open", () => {
          try {
            console.log("[LOG] WebSocket Convex terhubung. Mengirim Connect dan subscription query...");
            ws.send(JSON.stringify({
              connectionCount: 0,
              lastCloseReason: "InitialConnect",
              clientTs: Date.now(),
              type: "Connect",
              sessionId: state.wsSessionId
            }));
            ws.send(JSON.stringify({
              type: "ModifyQuerySet",
              baseVersion: 0,
              newVersion: 1,
              modifications: [{
                type: "Add",
                queryId: 36,
                udfPath: "messages:listByThreadIdPaginated",
                args: [{
                  paginationOpts: {
                    cursor: null,
                    id: 4,
                    numItems: 10
                  },
                  sessionId: state.convexSessionId,
                  threadId: state.threadId
                }]
              }]
            }));
            resolve(ws);
          } catch (e) {
            reject(e);
          }
        });
        ws.on("message", data => {
          try {
            const parsed = JSON.parse(data.toString());
            onMsg(parsed);
          } catch (e) {}
        });
        ws.on("error", err => {
          console.error("[LOG] Gagal pada koneksi WebSocket:", err.message);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  async chat({
    state,
    prompt,
    model = "gpt-5.4-nano",
    messages = [],
    image = false,
    files = [],
    ...rest
  }) {
    console.log("[LOG] Memulai pemrosesan chat...");
    const activeState = this._ensure(state);
    const foundModel = this.models.find(m => m.id === model);
    const validModel = foundModel && foundModel.enabled ? model : "gpt-5.4-nano";
    console.log(`[LOG] Menggunakan model validasi: ${validModel}`);
    if (messages && messages.length > 0) {
      console.log("[LOG] Memulai auto-push riwayat pesan secara berurutan...");
      for (const msg of messages) {
        try {
          const histUserMsgId = crypto.randomUUID();
          const histResponseMsgId = crypto.randomUUID();
          const histStreamId = crypto.randomUUID();
          const histPayload = {
            operation: "new",
            threadId: activeState.threadId,
            newUserMessage: {
              id: histUserMsgId,
              parts: [{
                type: "text",
                text: msg.content || msg.text || ""
              }],
              attachments: []
            },
            responseMessageId: histResponseMsgId,
            streamId: histStreamId,
            model: validModel,
            convexSessionId: activeState.convexSessionId,
            modelParams: {
              reasoningEffort: "none",
              includeSearch: false,
              includeImageGeneration: false
            },
            userInfo: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Makassar",
              languages: ["id-ID", "id", "en-US", "en"],
              viewport: "424x799"
            },
            selectedMemoryIds: [],
            ephemeral: false
          };
          console.log(`[LOG] Auto push pesan histori: "${msg.content || msg.text || ""}"`);
          await this.client.post("/api/chat", histPayload, {
            state: activeState,
            headers: {
              cookie: this._ckStr(activeState),
              referer: `https://www.multichats.ai/chat/${activeState.threadId}`
            }
          });
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (err) {
          console.error("[LOG] Gagal melakukan auto-push pesan histori:", err.message);
        }
      }
    }
    const userMsgId = crypto.randomUUID();
    const responseMsgId = crypto.randomUUID();
    const streamId = crypto.randomUUID();
    const chunks = [];
    let finalResult = "";
    let ws = null;
    const parts = [{
      type: "text",
      text: prompt || "Hai"
    }];
    const attachments = [];
    if (files && files.length > 0) {
      console.log("[LOG] Memproses lampiran berkas...");
      for (const file of files) {
        const mimeType = file.type || "application/octet-stream";
        const name = file.name || "file";
        const fileKey = file.fileKey || file.id || crypto.randomUUID();
        attachments.push({
          id: fileKey,
          name: name,
          type: mimeType,
          fileKey: fileKey
        });
        if (mimeType.startsWith("image/")) {
          parts.push({
            type: "image",
            image: fileKey,
            mimeType: mimeType
          });
        } else {
          parts.push({
            type: "file",
            data: fileKey,
            mimeType: mimeType,
            filename: name
          });
        }
      }
    }
    try {
      ws = await this._wsConn(activeState, msg => {
        chunks.push(msg);
        if (msg?.type === "Transition") {
          const mod = msg?.modifications?.find(m => m.type === "QueryUpdated" && m.queryId === 36);
          const page = mod?.value?.page || [];
          const assistantMsg = page.find(p => p.role === "assistant" && p.messageId === responseMsgId);
          if (assistantMsg) {
            const assistantParts = assistantMsg?.parts || [];
            let textAcc = "";
            let reasoningAcc = "";
            let imagesAcc = "";
            assistantParts.forEach(part => {
              if (part?.type === "text") {
                textAcc += part.text || "";
              } else if (part?.type === "reasoning") {
                reasoningAcc += part.reasoningText || "";
              } else if (part?.type === "generated-image" && part?.fileKey) {
                const imgModel = part.imageModel || "Google Nano Banana";
                const altText = part.alt || "";
                const fileKey = part.fileKey || "";
                imagesAcc += `\n\n🖼️ [Generated Image - ${imgModel}]\n- Prompt: "${altText}"\n- File Key: ${fileKey}\n- View URL: https://www.multichats.ai/api/generated-images/${encodeURIComponent(fileKey)}/url`;
              }
            });
            let compiled = "";
            if (reasoningAcc) {
              compiled += `🧠 [Thinking Process]\n${reasoningAcc}\n\n---\n\n`;
            }
            compiled += textAcc;
            if (imagesAcc) {
              compiled += imagesAcc;
            }
            if (compiled && compiled !== finalResult) {
              finalResult = compiled;
            }
            if (assistantMsg?.status === "done") {
              console.log("[LOG] WebSocket mendeteksi status done. Menutup sambungan...");
              ws.close();
            }
          }
        }
      });
      const defaultPayload = {
        operation: "new",
        threadId: activeState.threadId,
        newUserMessage: {
          id: userMsgId,
          parts: parts,
          attachments: attachments
        },
        responseMessageId: responseMsgId,
        streamId: streamId,
        model: validModel,
        convexSessionId: activeState.convexSessionId,
        modelParams: {
          reasoningEffort: "none",
          includeSearch: false,
          includeImageGeneration: image
        },
        userInfo: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Makassar",
          languages: ["id-ID", "id", "en-US", "en"],
          viewport: "424x799"
        },
        selectedMemoryIds: [],
        ephemeral: false
      };
      const payload = {
        ...defaultPayload,
        ...rest,
        modelParams: {
          ...defaultPayload.modelParams,
          ...rest.modelParams || {}
        },
        userInfo: {
          ...defaultPayload.userInfo,
          ...rest.userInfo || {}
        }
      };
      console.log("[LOG] Mengirim request HTTP POST chat...");
      await this.client.post("/api/chat", payload, {
        state: activeState,
        headers: {
          cookie: this._ckStr(activeState),
          referer: `https://www.multichats.ai/chat/${activeState.threadId}`
        }
      });
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (ws.readyState === WebSocket.CLOSED) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
      return {
        status: true,
        result: finalResult,
        chunks: chunks,
        state: this._encode(activeState)
      };
    } catch (error) {
      console.error("[LOG] Error pada fungsi utama chat:", error?.message || error);
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
      return {
        status: false,
        result: error?.message || "Internal Error",
        chunks: chunks,
        state: this._encode(activeState)
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
  const api = new MultiChatsClient();
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