import axios from "axios";
import crypto from "crypto";
class MistralChat {
  constructor() {
    this.baseURL = "https://chat.mistral.ai";
    this.baseHeaders = {
      "User-Agent": "le-chat-mobile/2.3.0 (build:20300173; os_name:ios; device_category:smartphone; device_model:iPhone 14 Pro; device_manufacturer:Apple)",
      "Accept-Language": "en",
      Accept: "*/*",
      "Content-Type": "application/json"
    };
    this._cookie = "";
    this._stableId = null;
    this._chatId = null;
    this._setupInterceptors();
    this._initialized = false;
  }
  _setupInterceptors() {
    axios.interceptors.request.use(config => {
      if (this._cookie) {
        config.headers.Cookie = this._cookie;
      }
      return config;
    }, error => Promise.reject(error));
    axios.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const c of cookies) {
          const [keyVal] = c.split(";");
          const [key, val] = keyVal.split("=").map(s => s.trim());
          if (key && val !== undefined) {
            const regex = new RegExp(`(^|; )${key}=[^;]*`);
            if (this._cookie.match(regex)) {
              this._cookie = this._cookie.replace(regex, `$1${key}=${val}`);
            } else {
              this._cookie += (this._cookie ? "; " : "") + `${key}=${val}`;
            }
          }
        }
      }
      return response;
    }, error => Promise.reject(error));
  }
  _uuid() {
    return crypto.randomUUID();
  }
  _export() {
    const state = {
      cookie: this._cookie,
      stableId: this._stableId,
      chatId: this._chatId
    };
    return Buffer.from(JSON.stringify(state)).toString("base64");
  }
  _import(b64) {
    try {
      const json = Buffer.from(b64, "base64").toString("utf8");
      const state = JSON.parse(json);
      this._cookie = state.cookie || "";
      this._stableId = state.stableId || null;
      this._chatId = state.chatId || null;
      this._initialized = true;
    } catch (e) {
      throw new Error("Invalid state: " + e.message);
    }
  }
  async _req({
    method = "POST",
    path,
    data = null,
    params = null,
    headers = {},
    responseType = "json",
    stream = false
  }) {
    const url = `${this.baseURL}${path}`;
    const allHeaders = {
      ...this.baseHeaders,
      ...headers
    };
    const config = {
      method: method,
      url: url,
      headers: allHeaders,
      params: params,
      responseType: stream ? "stream" : responseType
    };
    if (data) config.data = data;
    console.log("[Mistral] Request:", method, url);
    try {
      return await axios(config);
    } catch (err) {
      console.error("[Mistral] Request error:", err.message);
      throw err;
    }
  }
  async _initSession() {
    if (this._initialized) return;
    try {
      console.log("[Mistral] Initialising anonymous session...");
      await this._req({
        path: "/api/trpc/event.sendEventToDatalake,event.sendEventToDatalake",
        params: {
          batch: 1
        },
        data: {
          0: {
            json: {
              name: "app_downloaded",
              properties: {}
            }
          },
          1: {
            json: {
              name: "app_started",
              properties: {
                os: "iOS",
                deviceManufacturer: "Apple"
              }
            }
          }
        },
        responseType: "text"
      });
      await this._req({
        path: "/api/trpc/user.acceptToS",
        params: {
          batch: 1
        },
        data: {
          0: {
            json: {}
          }
        },
        responseType: "text"
      });
      this._stableId = this._uuid();
      this._initialized = true;
      console.log("[Mistral] Session ready. stableId:", this._stableId);
    } catch (err) {
      console.error("[Mistral] Init failed:", err);
      throw err;
    }
  }
  async _newChat(prompt, features = ["beta-websearch"]) {
    console.log("[Mistral] Creating new chat...");
    const payload = {
      0: {
        json: {
          files: [],
          content: [{
            type: "text",
            text: prompt
          }],
          transcriptionsMetadata: null,
          agentId: null,
          agentsApiAgentId: null,
          features: features,
          integrations: [],
          libraries: [],
          productType: "chat",
          projectId: null,
          incognito: null,
          chatId: null,
          parentId: null,
          parentVersion: null
        },
        meta: {
          values: {
            transcriptionsMetadata: ["undefined"],
            agentId: ["undefined"],
            agentsApiAgentId: ["undefined"],
            projectId: ["undefined"],
            incognito: ["undefined"],
            chatId: ["undefined"],
            parentId: ["undefined"],
            parentVersion: ["undefined"]
          },
          v: 1
        }
      }
    };
    const resp = await this._req({
      path: "/api/trpc/message.newChat",
      params: {
        batch: 1
      },
      data: payload
    });
    let chatId = null;
    if (Array.isArray(resp.data)) {
      chatId = resp.data[0]?.result?.data?.json?.chatId;
    } else if (resp.data?.result?.data?.json?.chatId) {
      chatId = resp.data.result.data.json.chatId;
    } else if (resp.data?.json?.["0"]?.result?.data?.json?.chatId) {
      chatId = resp.data.json["0"].result.data.json.chatId;
    }
    if (!chatId && typeof resp.data === "string") {
      const lines = resp.data.split("\n").filter(Boolean);
      for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        try {
          const json = JSON.parse(line.substring(idx + 1));
          const data = json.json || json;
          chatId = data?.["0"]?.result?.data?.json?.chatId || data?.result?.data?.json?.chatId;
          if (chatId) break;
        } catch (_) {}
      }
    }
    if (!chatId) throw new Error("Could not extract chatId from newChat response");
    return chatId;
  }
  async chat({
    state,
    prompt,
    messages = [],
    think,
    chat_id,
    ...rest
  }) {
    try {
      if (state) {
        this._import(state);
      } else {
        if (!this._initialized) {
          await this._initSession();
        }
      }
      if (chat_id) {
        this._chatId = chat_id;
      }
      let userPrompt = prompt;
      if (!userPrompt && messages.length > 0) {
        const last = messages[messages.length - 1];
        if (typeof last === "string") userPrompt = last;
        else if (last?.content) userPrompt = last.content;
        else userPrompt = "Hello";
      }
      if (!userPrompt) throw new Error("No prompt provided");
      let chatId = this._chatId;
      if (!chatId) {
        const features = rest.features || ["beta-websearch"];
        chatId = await this._newChat(userPrompt, features);
        this._chatId = chatId;
      }
      const features = rest.features || ["beta-code-interpreter", "beta-imagegen", "beta-trampoline", "beta-websearch"];
      if (think && !features.includes("beta-reasoning")) {
        features.push("beta-reasoning");
      }
      const payload = {
        chatId: chatId,
        mode: "append",
        messageInput: [{
          type: "text",
          text: userPrompt
        }],
        messageFiles: [],
        messageId: this._uuid(),
        features: features,
        libraries: rest.libraries || [],
        integrations: rest.integrations || [],
        disabledFeatures: rest.disabledFeatures || [],
        preventFeaturesAndIntegrationsPersistence: rest.preventFeaturesAndIntegrationsPersistence || false,
        transcriptionsMetadata: rest.transcriptionsMetadata || [],
        clientPromptData: rest.clientPromptData || {
          currentDate: new Date().toISOString().slice(0, 10),
          userTimezone: "T+08:00 (Asia/Makassar)"
        },
        stableAnonymousIdentifier: this._stableId,
        supportedTaskCallbacks: rest.supportedTaskCallbacks || ["ask_user_question", "ask_user_confirmation", "enable_connector", "ask_retry_or_continue_rate_limit", "collect_workflow_input", "delegate_workflow_execution"],
        boostMode: rest.boostMode || false,
        shouldAwaitStreamBackgroundTasks: rest.shouldAwaitStreamBackgroundTasks ?? true,
        shouldUseMessagePatch: rest.shouldUseMessagePatch ?? true
      };
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined || payload[k] === null) delete payload[k];
      }
      console.log("[Mistral] Sending chat request...");
      const resp = await this._req({
        path: "/api/chat",
        method: "POST",
        data: payload,
        stream: true,
        headers: {
          Accept: "text/event-stream"
        }
      });
      return new Promise(resolve => {
        let fullText = "";
        let buffer = "";
        const chunks = [];
        const stream = resp.data;
        stream.on("data", chunk => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const colonIdx = line.indexOf(":");
            if (colonIdx === -1) continue;
            const jsonStr = line.substring(colonIdx + 1);
            try {
              const json = JSON.parse(jsonStr);
              const data = json.json || json;
              const patches = data?.patches || [];
              for (const p of patches) {
                if (p.path && p.path.includes("/text") && typeof p.value === "string") {
                  fullText += p.value;
                  chunks.push(p.value);
                } else {
                  const walk = v => {
                    if (Array.isArray(v)) {
                      for (const item of v) walk(item);
                    } else if (v && typeof v === "object") {
                      if (v.contentChunks) walk(v.contentChunks);
                      if (v.type === "text" && v.text) {
                        fullText += v.text;
                        chunks.push(v.text);
                      }
                      if (v.patches) walk(v.patches);
                    }
                  };
                  walk(p.value);
                }
              }
            } catch (_) {}
          }
        });
        stream.on("end", () => {
          console.log("[Mistral] Stream ended.");
          const newState = this._export();
          resolve({
            status: true,
            result: fullText.trim() || "No response content",
            chat_id: chatId,
            state: newState,
            chunks: chunks
          });
        });
        stream.on("error", err => {
          console.error("[Mistral] Stream error:", err);
          resolve({
            status: false,
            result: err.message,
            chat_id: chatId,
            state: this._export(),
            chunks: []
          });
        });
      });
    } catch (err) {
      console.error("[Mistral] Chat error:", err);
      return {
        status: false,
        result: err.message,
        chat_id: this._chatId || null,
        state: this._export(),
        chunks: []
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
  const api = new MistralChat();
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