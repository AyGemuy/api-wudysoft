import axios from "axios";
import crypto from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class PageOn {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.base = "https://app.server.pageon.ai";
  }
  log(msg, data = "") {
    console.log(`[PageOn] ${msg}`, data);
  }
  decode(state) {
    try {
      return JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return {};
    }
  }
  encode(data) {
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }
  genName() {
    return crypto.randomBytes(4).toString("hex");
  }
  genPass() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    return Array.from(crypto.randomBytes(12)).map(b => chars[b % chars.length]).join("");
  }
  getHeaders(token = null, sess = null, ts = null) {
    const base = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://www.pageon.ai",
      priority: "u=1, i",
      referer: "https://www.pageon.ai/app",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
    if (token) {
      base["authorization"] = `Bearer ${token}`;
      base["jwtheader"] = token;
      base["baggage"] = "sentry-environment=prod,sentry-public_key=067558e770750b2189e1df3bc89f41fa,sentry-trace_id=5e8cec1cb897453cb65247ff46316c13,sentry-org_id=4509484299124736,sentry-sampled=true,sentry-sample_rand=0.6063635305775472,sentry-sample_rate=1";
      base["sentry-trace"] = "5e8cec1cb897453cb65247ff46316c13-8853b13a2a6b9d5b-1";
    }
    if (sess) base["x-session"] = sess;
    if (ts) base["x-ts"] = ts.toString();
    if (sess || ts) base["x-version"] = "app-v1.0.0-2026.02.06.17.00.56";
    return base;
  }
  async createMail() {
    try {
      this.log("Creating email...");
      const {
        data
      } = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.log("Email created:", data?.email);
      return data?.email || null;
    } catch (e) {
      this.log("Mail error:", e.message);
      return null;
    }
  }
  async getOtp(email) {
    try {
      this.log("Fetching OTP...");
      for (let i = 0; i < 60; i++) {
        const {
          data
        } = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const msg = data?.data?.[0]?.text_content || "";
        const otp = msg.match(/\b[A-Z0-9]{6}\b/)?.[0];
        if (otp) {
          this.log("OTP found:", otp);
          return otp;
        }
        await new Promise(r => setTimeout(r, 3e3));
      }
      return null;
    } catch (e) {
      this.log("OTP error:", e.message);
      return null;
    }
  }
  async register(email) {
    try {
      this.log("Registering account...");
      const sess = crypto.randomUUID();
      const ts = Date.now();
      const firstName = this.genName();
      const lastName = this.genName();
      const password = this.genPass();
      const body = {
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        utmSource: "DHWZ",
        utmMedium: "2505",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
        documentReferrer: "",
        inviteType: "",
        channel: "",
        refLinkUrl: "https://www.pageon.ai/auth",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        inviteeFingerprintId: "",
        fromProject: ""
      };
      await this.client.post(`${this.base}/api/iart/v1/email/register`, body, {
        headers: this.getHeaders(null, sess, ts)
      });
      this.log("Register sent");
      return {
        sess: sess,
        ts: ts,
        password: password
      };
    } catch (e) {
      this.log("Register error:", e.message);
      return null;
    }
  }
  async activate(email, code, sess, ts) {
    try {
      this.log("Activating account...");
      const {
        data
      } = await this.client.post(`${this.base}/api/iart/v1/email/registerActivation`, {
        email: email,
        code: code
      }, {
        headers: this.getHeaders(null, sess, ts)
      });
      const token = data?.data?.accessToken || data?.data?.jwt || null;
      if (token) this.log("Token:", token.slice(0, 30) + "...");
      return token;
    } catch (e) {
      this.log("Activate error:", e.message);
      return null;
    }
  }
  async getUserInfo(token, sess, ts) {
    try {
      this.log("Getting user info...");
      const {
        data
      } = await this.client.get(`${this.base}/api/iart/v1/thirdPartyLogin/getUserInfo`, {
        headers: this.getHeaders(token, sess, ts)
      });
      const userId = data?.data?.id || null;
      if (userId) this.log("UserId:", userId);
      return userId;
    } catch (e) {
      this.log("UserInfo error:", e.message);
      return null;
    }
  }
  async solveMedia(token, media) {
    try {
      const buf = Buffer.isBuffer(media) ? media : media.startsWith("http") ? Buffer.from((await this.client.get(media, {
        responseType: "arraybuffer"
      })).data) : Buffer.from(media.replace(/^data:image\/\w+;base64,/, ""), "base64");
      const {
        data: urlData
      } = await this.client.get(`${this.base}/api2/v1/upload/url?type=image%2Fjpeg&source_type=document`, {
        headers: this.getHeaders(token)
      });
      await this.client.put(urlData?.data?.upload, buf, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      return {
        cdn: urlData?.data?.cdn,
        key: urlData?.data?.key
      };
    } catch (e) {
      this.log("Solve media error:", e.message);
      return null;
    }
  }
  async uploadMedia(token, media) {
    try {
      if (!media) return [];
      const mediaList = Array.isArray(media) ? media : [media];
      const results = [];
      for (const m of mediaList) {
        this.log("Uploading media...");
        const upload = await this.solveMedia(token, m);
        if (upload) {
          results.push({
            type: "file",
            url: upload.cdn,
            mediaType: "image/jpeg",
            filename: "image.jpg"
          });
          this.log("Media uploaded:", upload.cdn);
        }
      }
      return results;
    } catch (e) {
      this.log("Upload error:", e.message);
      return [];
    }
  }
  async processMessages(token, messages) {
    try {
      const processed = [];
      for (const msg of messages) {
        if (msg.type === "file" && msg.url && !msg.url.startsWith("http")) {
          const upload = await this.solveMedia(token, msg.url);
          if (upload) {
            processed.push({
              ...msg,
              url: upload.cdn
            });
            this.log("Message media solved:", upload.cdn);
          }
        } else {
          processed.push(msg);
        }
      }
      return processed;
    } catch (e) {
      this.log("Process messages error:", e.message);
      return messages;
    }
  }
  async models({
    state,
    ...rest
  }) {
    try {
      const {
        token
      } = this.decode(state || "");
      if (!token) return {
        result: [],
        state: ""
      };
      this.log("Fetching models...");
      const {
        data
      } = await this.client.get("https://openrouter.ai/api/v1/models", {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          origin: "https://www.pageon.ai",
          priority: "u=1, i",
          referer: "https://www.pageon.ai/app",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Linux"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      const models = (data?.data || []).map(m => ({
        id: m.id,
        name: m.name
      }));
      return {
        result: models,
        state: state,
        models: models.length
      };
    } catch (e) {
      this.log("Models error:", e.message);
      return {
        result: [],
        state: "",
        error: e.message
      };
    }
  }
  async chat({
    state,
    model = "google/gemini-3-pro-preview",
    prompt,
    media,
    messages,
    ...rest
  }) {
    try {
      let stateData = this.decode(state || "");
      if (!stateData?.token) {
        this.log("No state, creating session...");
        const email = await this.createMail();
        if (!email) return {
          result: "Failed create email",
          state: ""
        };
        const reg = await this.register(email);
        if (!reg) return {
          result: "Failed register",
          state: ""
        };
        const otp = await this.getOtp(email);
        if (!otp) return {
          result: "Failed get OTP",
          state: ""
        };
        const token = await this.activate(email, otp, reg.sess, reg.ts);
        if (!token) return {
          result: "Failed activate",
          state: ""
        };
        const userId = await this.getUserInfo(token, reg.sess, reg.ts);
        stateData = {
          token: token,
          sess: reg.sess,
          ts: reg.ts,
          userId: userId,
          email: email
        };
      }
      let parts = [];
      if (messages) {
        const msgList = Array.isArray(messages) ? messages : [messages];
        parts = await this.processMessages(stateData.token, msgList);
      } else {
        if (media) {
          const uploaded = await this.uploadMedia(stateData.token, media);
          parts.push(...uploaded);
        }
        if (prompt) parts.push({
          type: "text",
          text: prompt
        });
      }
      const payload = {
        agentModel: "haiku",
        mcpModel: model,
        mcp: [],
        restore: false,
        id: crypto.randomUUID(),
        trigger: "submit-message",
        html: "",
        messages: [{
          parts: parts,
          id: crypto.randomUUID().slice(0, 16),
          role: "user"
        }],
        ...rest
      };
      this.log("Sending chat...");
      const {
        data
      } = await this.client.post(`${this.base}/api2/v1/ai/ccs/agent`, payload, {
        headers: this.getHeaders(stateData.token),
        responseType: "stream"
      });
      let result = "";
      for await (const chunk of data) {
        const lines = chunk.toString().split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const json = line.slice(6);
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            if (parsed.type === "text-delta") result += parsed.delta || "";
          } catch {}
        }
      }
      this.log("Response length:", result.length);
      return {
        result: result,
        state: this.encode(stateData),
        model: model,
        parts: parts.length
      };
    } catch (e) {
      this.log("Chat error:", e.message);
      return {
        result: e.message,
        state: state || "",
        error: e.message
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
        example: "/?action=chat&prompt=hello"
      }
    });
  }
  const api = new PageOn();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "chat":
        if (!params.prompt || !params.messages) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 'messages' wajib diisi untuk action 'search'."
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