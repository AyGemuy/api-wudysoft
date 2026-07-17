import crypto from "crypto";
import axios from "axios";
class OpenAiChat {
  constructor() {
    try {
      console.log("🔄 Initializing OpenAiChat...");
      this.b_url = "https://chatapi.begamob.com";
      this.c_url = "https://chat-ai-iaa.begamob.com";
      this.sec_b64 = "wIX1xqLnKnprsmNMw/bMiA==";
      this.jwt_sec = "stteam-ikameglobal-chatapiopenai";
      this.b_id = "com.chatbot.ai.aichat.openaibot.chat";
      this.os = "Android";
      this.v_app = "35.2.7";
      this.os_v = "35";
      this.build = "352702";
      this.v_sdk = "35";
      this.model = "grok-3";
      this.max_tk = 1250;
      this.tools = [];
      this.conv_id = null;
      this.msgs = [];
      this.models = ["gpt-4o", "gpt-4o-mini", "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-o3-mini", "generate_art", "gpt-3.5-turbo", "deepseek", "grok-3", "ghibli", "gemini-2.5-flash", "gemini-3-pro", "llama-3.1", "llama4", "claude-3.7-sonnet", "claude-4.5-sonnet", "claude-4.5-opus", "nano-banana-pro"];
      this.uid = this._uid();
      this.did = this._did();
      this._validate_model(this.model);
      this.api = axios.create({
        baseURL: this.b_url
      });
      this.chat = axios.create({
        baseURL: this.c_url
      });
      console.log("✅ OpenAiChat Initialized:", {
        uid: this.uid,
        did: this.did
      });
    } catch (err) {
      console.error("❌ Constructor initialization crashed:", err.message);
      return;
    }
  }
  _validate_model(mdl) {
    try {
      console.log(`🔄 Validating model: ${mdl}...`);
      if (!this.models.includes(mdl)) {
        console.error(`❌ Model "${mdl}" tidak valid.`);
        return false;
      }
      console.log(`✅ Model "${mdl}" is valid.`);
      return true;
    } catch (err) {
      console.error("❌ _validate_model err:", err.message);
      return false;
    }
  }
  _uid() {
    try {
      console.log("🔄 Gen UID...");
      return crypto.randomUUID().replace(/-/g, "");
    } catch (err) {
      console.error("❌ _uid err:", err.message);
      return null;
    }
  }
  _did() {
    try {
      console.log("🔄 Gen DID...");
      return crypto.randomBytes(32).toString("hex").toUpperCase();
    } catch (err) {
      console.error("❌ _did err:", err.message);
      return null;
    }
  }
  _b64(buf) {
    try {
      return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (err) {
      console.error("❌ _b64 err:", err.message);
      return null;
    }
  }
  _jwt(pld, sec) {
    try {
      console.log("🔄 Enc JWT...");
      const hdr = this._b64(Buffer.from(JSON.stringify({
        alg: "HS256",
        typ: "JWT"
      }), "utf8"));
      if (!hdr) return null;
      const body = this._b64(Buffer.from(JSON.stringify(pld), "utf8"));
      if (!body) return null;
      const data = `${hdr}.${body}`;
      const signature_buf = crypto.createHmac("sha256", Buffer.from(sec, "utf8")).update(data).digest();
      const sig = this._b64(signature_buf);
      if (!sig) return null;
      return `${data}.${sig}`;
    } catch (err) {
      console.error("❌ _jwt err:", err.message);
      return null;
    }
  }
  _img(img) {
    try {
      if (Buffer.isBuffer(img)) return `data:image/jpeg;base64,${img.toString("base64")}`;
      if (typeof img === "string") {
        if (img.startsWith("data:image") || img.startsWith("http://") || img.startsWith("https://")) return img;
        return `data:image/jpeg;base64,${img}`;
      }
      return null;
    } catch (err) {
      console.error("❌ _img err:", err.message);
      return null;
    }
  }
  _hdrs(type, tk) {
    try {
      if (type === "time") {
        return {
          "User-Agent": `VersionApp:${this.v_app}/AppId:${this.b_id}/Build:${this.build}/VersionSDK:${this.v_sdk}/OS:${this.os}/UserAgent:okhttp/4.12.0userId:${this.uid}/deviceId:${this.did}`,
          "Accept-Encoding": "gzip",
          authorization: `Bearer ${tk}`
        };
      }
      if (type === "api") {
        return {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "user-header": `bundleId:${this.b_id}/versionApp:${this.v_app}/OS:${this.os}/osVersion:${this.os_v}/userId:${this.uid}/deviceId:${this.did}`,
          authorization: `Bearer ${tk}`
        };
      }
      return {};
    } catch (err) {
      console.error("❌ _hdrs err:", err.message);
      return {};
    }
  }
  async _gt() {
    try {
      console.log("⏳ Fetching timestamp...");
      const res = await this.api.get("/api/getTime", {
        headers: this._hdrs("time", this.sec_b64)
      });
      const tk = res?.data?.token;
      if (!tk) {
        console.error("❌ Missing token");
        return null;
      }
      return tk;
    } catch (err) {
      console.error("❌ _gt err:", err.message);
      return null;
    }
  }
  _btk() {
    try {
      console.log("🔑 Building Bearer JWT...");
      const ms = Date.now();
      return this._jwt({
        iat: ms,
        exp: Math.floor(ms / 1e3) + 900,
        bundleId: this.b_id,
        os: this.os,
        versionApp: this.v_app
      }, this.jwt_sec);
    } catch (err) {
      console.error("❌ _btk err:", err.message);
      return null;
    }
  }
  async _sgq(tk, msgs, mdl) {
    try {
      console.log("💬 Fetching suggestions...");
      const target_model = mdl || this.model;
      if (!this._validate_model(target_model)) {
        return [];
      }
      const res = await this.api.post("/api/v1/suggestChatQuestion", {
        messages: msgs,
        model: target_model
      }, {
        headers: this._hdrs("api", tk)
      });
      if (res?.data?.statusCode !== "200") {
        console.error("❌ suggestChatQuestion returned non-200 status code");
        return [];
      }
      return res?.data?.data?.data || [];
    } catch (err) {
      console.error("❌ _sgq err:", err.message);
      return [];
    }
  }
  async _ccm(tk, bodyPayload) {
    try {
      console.log("💬 Sending custom chat...");
      const res = await this.chat.post("/api/v3/chatCustom", bodyPayload, {
        headers: this._hdrs("api", tk)
      });
      if (!res?.data?.success) {
        console.error("❌ Custom chat request unsuccessful");
        return null;
      }
      return res?.data;
    } catch (err) {
      console.error("❌ _ccm err:", err.message);
      return null;
    }
  }
  async sendMessage({
    prompt,
    messages = null,
    image = null,
    suggest = false,
    model = null,
    maxToken = null,
    tools = null,
    ...rest
  }) {
    try {
      console.log("🚀 Executing active session stream...");
      const active_model = model || this.model;
      if (!this._validate_model(active_model)) {
        return {
          status: false,
          error: `Model "${active_model}" tidak valid. Pilihan yang tersedia: ${this.models.join(", ")}`
        };
      }
      let chat_msgs = messages ? [...messages] : [...this.msgs];
      if (prompt || image) {
        const user_msg = {
          role: "user",
          content: []
        };
        if (image) {
          const imgs = Array.isArray(image) ? image : [image];
          for (const img of imgs) {
            const url = this._img(img);
            if (url) user_msg.content.push({
              type: "image_url",
              image_url: {
                url: url
              }
            });
          }
        }
        if (prompt) {
          user_msg.content.push({
            type: "text",
            text: prompt
          });
        } else if (image && !prompt) {
          user_msg.content.push({
            type: "text",
            text: "apa ini"
          });
        }
        if (user_msg.content.length > 0) chat_msgs.push(user_msg);
      }
      const ts = await this._gt();
      if (!ts) {
        return {
          status: false,
          error: "Failed to retrieve validation timestamp."
        };
      }
      const tk = this._btk();
      if (!tk) {
        return {
          status: false,
          error: "Failed to build bearer token."
        };
      }
      if (!this.conv_id) {
        this.conv_id = this.uid + this.did + ts;
        console.log("📁 Context ID Initialized:", this.conv_id);
      }
      let sug = [];
      if (suggest) sug = await this._sgq(tk, chat_msgs, active_model);
      const api_res = await this._ccm(tk, {
        conversationId: this.conv_id,
        max_token: maxToken || this.max_tk,
        messages: chat_msgs,
        model: active_model,
        tools: tools || this.tools,
        ...rest
      });
      if (!api_res) {
        return {
          status: false,
          error: "No response received from chat API."
        };
      }
      this.msgs = chat_msgs;
      const reply_content = api_res?.data?.choices?.[0]?.message?.content || "";
      this.msgs.push({
        role: "assistant",
        content: [{
          type: "text",
          text: reply_content
        }]
      });
      return {
        status: true,
        ...api_res?.data,
        suggest: sug,
        history: this.msgs,
        model: active_model,
        models: this.models
      };
    } catch (err) {
      console.error("❌ Public flow crashed:", err.message);
      return {
        status: false,
        error: err.message
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
  const api = new OpenAiChat();
  try {
    const data = await api.sendMessage(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}