import axios from "axios";
import crypto from "crypto";
import https from "https";
class ChatAssistantAPI {
  constructor(opts = {}) {
    this.baseUrl = "https://api.aichatbotassistant.top";
    this.bundleId = "com.chatassistant.aichatbot.gp";
    this.aesKey = "V7PbuImUgSzpo4Hx";
    this.iv = "yc0q2icx1oq4lijm";
    this.secretKey = "t6KeG6aKR5pm65oWn5aqS6LWE57O757ufS2V2aW4uWWFuZw";
    this.deviceMac = this._uuid();
    this.appVersion = "1.0.0";
    this.lang = "en-US";
    this.user = "Anonym";
    this.modelChat = "BOLATU:claude-haiku-4-5-20251001";
    this.timeout = 6e4;
    this.agent = new https.Agent({
      keepAlive: true
    });
    this._regd = false;
    this.validModes = ["chat", "models"];
  }
  _uuid() {
    return crypto.randomUUID();
  }
  _nonce() {
    return crypto.randomBytes(16).toString("hex");
  }
  _encrypt(plain) {
    const c = crypto.createCipheriv("aes-128-cbc", Buffer.from(this.aesKey), Buffer.from(this.iv));
    return c.update(plain, "utf8", "hex").toUpperCase() + c.final("hex").toUpperCase();
  }
  _sign(data, q) {
    const d = {
      ...data
    };
    if (q != null) d.question = q;
    if (!d.bundle) d.bundle = this.bundleId;
    if (!d.deviceMac && d.mac) d.deviceMac = d.mac;
    if (!d.deviceMac) d.deviceMac = this.deviceMac;
    if (!d.timestamp) d.timestamp = Math.floor(Date.now() / 1e3);
    if (!d.nonce) d.nonce = this._nonce();
    if (!d.aiVersion) d.aiVersion = this.modelChat;
    if (!d.userName) d.userName = this.user;
    const exclude = ["language", "imageUrls", "tonePrompt", "userName", "needSearch", "images"];
    const qs = Object.keys(d).filter(k => !exclude.includes(k)).sort().map(k => `${k}=${d[k]}`).join("&");
    d.signature = crypto.createHash("sha1").update(qs + this.secretKey).digest("hex");
    return d;
  }
  _prepPayload(data, q) {
    const signed = this._sign(data, q);
    return {
      bundle: this.bundleId,
      security: this._encrypt(JSON.stringify(signed))
    };
  }
  _headers(ct = "application/json") {
    return {
      "User-Agent": "ChatAssistant/1.0",
      DeviceId: this.deviceMac,
      AppVersion: this.appVersion,
      "Accept-Encoding": "gzip",
      NetworkType: "Other",
      UserType: "app_user",
      "Content-Type": ct,
      Country: "Hans",
      Language: this.lang,
      DeviceType: "android",
      SysVersion: "14",
      BundleId: this.bundleId,
      Host: "api.aichatbotassistant.top",
      Connection: "Keep-Alive"
    };
  }
  async _get(path, params = {}) {
    try {
      const res = await axios.get(this.baseUrl + path, {
        params: params,
        headers: this._headers(),
        httpsAgent: this.agent,
        timeout: this.timeout
      });
      return res.data;
    } catch (e) {
      console.log(`[GET] ${path} error:`, e.message);
      throw new Error(`GET ${path}: ${e.message}`);
    }
  }
  async _post(path, data, headersOverride = null) {
    try {
      const res = await axios.post(this.baseUrl + path, data, {
        headers: headersOverride || this._headers(),
        httpsAgent: this.agent,
        timeout: this.timeout
      });
      return res.data;
    } catch (e) {
      console.log(`[POST] ${path} error:`, e.message);
      throw new Error(`POST ${path}: ${e.message}`);
    }
  }
  async _reg() {
    if (this._regd) return;
    console.log("🔄 Registering device...");
    try {
      await this._post("/mb/createNewUser", {
        deviceMac: this.deviceMac,
        bundleId: this.bundleId,
        bundleVersion: this.appVersion
      }, this._headers("application/json;charset=UTF-8"));
      this._regd = true;
      console.log("✅ Registered");
    } catch (e) {
      console.log("❌ Registration failed:", e.message);
    }
  }
  _flatten(res) {
    if (!res || typeof res !== "object") return res;
    if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
      const flat = {
        ...res.data
      };
      if (res.code !== undefined && !("code" in flat)) flat.code = res.code;
      if (res.message !== undefined && !("message" in flat)) flat.message = res.message;
      if (res.msg !== undefined && !("msg" in flat)) flat.msg = res.msg;
      return flat;
    }
    if (Array.isArray(res.data)) return res.data;
    return res;
  }
  _validateMode(mode) {
    if (!this.validModes.includes(mode)) {
      return {
        valid: false,
        error: `Invalid mode: ${mode}. Allowed: ${this.validModes.join(", ")}`
      };
    }
    return {
      valid: true
    };
  }
  _validateInputs(mode, inputs) {
    const required = {
      chat: ["prompt"],
      models: []
    };
    const requiredFields = required[mode] || [];
    for (const field of requiredFields) {
      if (!inputs[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field} for mode ${mode}`
        };
      }
    }
    return {
      valid: true
    };
  }
  async generate({
    mode,
    model,
    ...rest
  }) {
    const modeValidation = this._validateMode(mode);
    if (!modeValidation.valid) {
      return {
        status: false,
        error: modeValidation.error
      };
    }
    const inputValidation = this._validateInputs(mode, rest);
    if (!inputValidation.valid) {
      return {
        status: false,
        error: inputValidation.error
      };
    }
    console.log(`🚀 Mode: ${mode}`);
    try {
      await this._reg();
    } catch (e) {
      return {
        status: false,
        error: `Reg failed: ${e.message}`
      };
    }
    try {
      switch (mode) {
        case "chat": {
          console.log("💬 Starting chat...");
          const {
            prompt,
            conversation_id = "",
            need_search = 0,
            bot_id = 0,
            tone_prompt,
            no_auth = false,
            ...extra
          } = rest;
          const data = {
            question: prompt,
            conversationId: conversation_id,
            bundle: this.bundleId,
            deviceMac: this.deviceMac,
            needSearch: need_search ? 1 : 0,
            botId: bot_id,
            aiVersion: model || this.modelChat,
            userName: this.user,
            ...extra
          };
          if (tone_prompt) data.tonePrompt = tone_prompt;
          const endpoint = no_auth ? "/botchat/noAuth/sse/chat" : "/common/sse/chat";
          let resp;
          try {
            resp = await axios({
              method: "post",
              url: this.baseUrl + endpoint,
              data: this._prepPayload(data, data.question),
              headers: this._headers(),
              httpsAgent: this.agent,
              timeout: this.timeout,
              responseType: "stream"
            });
          } catch (e) {
            console.log("❌ Request failed:", e.message);
            return {
              status: false,
              error: `Request failed: ${e.message}`
            };
          }
          const result = await new Promise(resolve => {
            let full = "",
              buf = "",
              convId = conversation_id || "",
              last = null,
              final = null;
            resp.data.on("data", chunk => {
              buf += chunk.toString("utf8");
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed === "data: [DONE]") {
                  if (last) final = last;
                  else final = {
                    code: 0,
                    message: "成功",
                    data: {
                      answer: full.trim(),
                      conversation_id: convId,
                      message_id: "",
                      agent_message_type: null,
                      references: ""
                    }
                  };
                  continue;
                }
                if (trimmed.startsWith("data: ")) {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6).trim());
                    last = parsed;
                    if (parsed.data?.answer) full += parsed.data.answer;
                    if (parsed.data?.conversation_id) convId = parsed.data.conversation_id;
                  } catch (e) {}
                }
              }
            });
            resp.data.on("end", () => {
              if (final) {
                final.data.answer = full.trim();
                resolve(final);
              } else if (last) {
                last.data.answer = full.trim();
                resolve(last);
              } else resolve({
                code: 0,
                message: "成功",
                data: {
                  answer: full.trim(),
                  conversation_id: convId,
                  message_id: "",
                  agent_message_type: null,
                  references: ""
                }
              });
            });
            resp.data.on("error", () => resolve(null));
          });
          if (!result) return {
            status: false,
            error: "Stream error"
          };
          console.log("✅ Chat complete");
          return {
            status: true,
            result: this._flatten(result)
          };
        }
        case "models": {
          let mt = (rest.model_type || "CHAT").toUpperCase();
          if (!["CHAT", "IMAGE"].includes(mt)) mt = "CHAT";
          console.log("⚙️ Fetching model config...");
          const res = await this._get("/model/modelConfig", {
            bundleId: this.bundleId,
            language: this.lang,
            modelType: mt
          });
          return {
            status: true,
            result: this._flatten(res)
          };
        }
        default:
          return {
            status: false,
              error: `Unhandled mode: ${mode}`
          };
      }
    } catch (e) {
      console.log("❌ Error:", e.message);
      return {
        status: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ChatAssistantAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}