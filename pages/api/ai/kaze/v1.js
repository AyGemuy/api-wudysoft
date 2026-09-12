import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class KazeAI {
  constructor() {
    try {
      this.baseUrl = "https://backend.kaze.ai";
      this.schedUrl = "https://scheduler-backend.kaze.ai";
      this.apiKey = "AIzaSyC3hx8Nwe1KldaC3rvbTvPAT4mzPI5-rPI";
      this.debug = true;
      this.tkn = null;
      this.session = null;
      this.deviceId = this._uid();
      this.userId = null;
      this.phSessionId = this._uid();
      this._init();
    } catch (err) {
      console.error("[KazeAI Init Error]:", err?.message);
    }
  }
  _log(msg) {
    try {
      if (this.debug) console.log(`[KazeAI] ${msg}`);
    } catch (_) {}
  }
  _uid() {
    try {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : r & 3 | 8).toString(16);
      });
    } catch (_) {
      return "e1a96d96-71b7-42c6-8b3d-e5776ef8c8ed";
    }
  }
  _enc(obj) {
    try {
      if (!obj) return null;
      const str = typeof obj === "string" ? obj : JSON.stringify(obj);
      return Buffer.from(str).toString("base64");
    } catch (_) {
      return null;
    }
  }
  _dec(str) {
    try {
      if (!str) return null;
      if (typeof str === "object") return str;
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch (_) {
      return null;
    }
  }
  _err(err) {
    try {
      if (!err) return "Unknown error";
      if (typeof err === "string") return err;
      const d = err?.response?.data;
      if (d) {
        if (typeof d === "string") return d;
        if (d?.message) return d.message;
        if (d?.detail) return typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail);
        if (d?.error) return typeof d.error === "string" ? d.error : JSON.stringify(d.error);
        return JSON.stringify(d);
      }
      return err?.message || "Request failed";
    } catch (_) {
      return "Request failed";
    }
  }
  _fmt(status = false, result = null, chunks = null, token = null, session = null) {
    try {
      const encSess = typeof session === "object" && session !== null ? this._enc(session) : session || null;
      if (encSess) this.session = encSess;
      return {
        status: Boolean(status),
        result: result || null,
        chunks: chunks || null,
        token: token || null,
        session: encSess
      };
    } catch (_) {
      return {
        status: false,
        result: null,
        chunks: null,
        token: null,
        session: null
      };
    }
  }
  _hdrs(extra = {}) {
    try {
      const sess = typeof this.session === "string" ? this._dec(this.session) : this.session;
      const token = sess?.token || null;
      const devId = sess?.device_id || this.deviceId;
      const uid = sess?.user_id || this.userId || devId;
      const phSess = sess?.posthog_session_id || this.phSessionId;
      const base = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://kaze.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://kaze.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-device-id": devId,
        "x-locale": "id",
        "x-posthog-distinct-id": uid,
        "x-posthog-session-id": phSess
      };
      if (token) base["authorization"] = `Bearer ${token}`;
      return {
        ...base,
        ...extra
      };
    } catch (_) {
      return extra || {};
    }
  }
  _init() {
    try {
      this.client = axios.create({
        timeout: 6e4
      });
      this.client.interceptors.request.use(cfg => {
        try {
          cfg.headers = this._hdrs(cfg?.headers || {});
          this._log(`HTTP Outgoing: [${cfg?.method?.toUpperCase()}] ${cfg?.url}`);
          return cfg;
        } catch (_) {
          return cfg;
        }
      }, err => Promise.reject(err));
      this.client.interceptors.response.use(res => res?.data, err => {
        this._log(`HTTP Error: ${err?.response?.status || err?.message}`);
        return Promise.reject(err);
      });
    } catch (err) {
      this._log(`Init Error: ${err?.message}`);
    }
  }
  async _visit() {
    try {
      this._log("Visiting main landing page...");
      await axios.get("https://kaze.ai/id/agent", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        timeout: 1e4
      }).catch(() => null);
    } catch (_) {}
  }
  async _anon() {
    try {
      this._log("Getting Firebase Anonymous Auth...");
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;
      const res = await axios.post(url, {
        returnSecureToken: true
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://kaze.ai",
          referer: "https://kaze.ai/"
        }
      });
      return {
        id_token: res?.data?.idToken || null,
        user_id: res?.data?.localId || null
      };
    } catch (err) {
      this._log(`Anon Auth Error: ${this._err(err)}`);
      return null;
    }
  }
  async _bVal(media) {
    try {
      if (!media) return null;
      let buf = null,
        mime = "image/jpeg",
        ext = "jpg";
      if (Buffer.isBuffer(media)) {
        buf = media;
      } else if (typeof media === "string") {
        if (/^https?:\/\//i.test(media)) {
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(res?.data);
          const ct = res?.headers?.["content-type"];
          mime = ct || mime;
          ext = mime.split("/")[1]?.split("+")[0] || "jpg";
        } else if (media.startsWith("data:")) {
          const m = media.match(/^data:(.*?);base64,(.*)$/);
          mime = m?.[1] || mime;
          ext = mime.split("/")[1] || "jpg";
          buf = Buffer.from(m?.[2] || "", "base64");
        } else {
          buf = Buffer.from(media, "base64");
        }
      }
      return buf ? {
        buf: buf,
        mime: mime,
        ext: ext
      } : null;
    } catch (_) {
      return null;
    }
  }
  async _uFile(mediaObj) {
    try {
      if (!mediaObj?.buf) return null;
      const url = `${this.schedUrl}/comm_api/file/v1/batch_get_upload_url`;
      const body = {
        upload_list: [{
          extension: mediaObj?.ext || "jpg",
          content_type: mediaObj?.mime || "image/jpeg",
          include_headers: true
        }]
      };
      const res = await this.client.post(url, body);
      const item = res?.upload_result?.[0];
      if (!item?.upload_url) return null;
      await axios.put(item.upload_url, mediaObj.buf, {
        headers: {
          "content-type": mediaObj?.mime || "image/jpeg",
          "cache-control": item?.headers?.["cache-control"] || "public, max-age=31536000"
        }
      });
      return item?.file_id || null;
    } catch (err) {
      this._log(`Upload error: ${this._err(err)}`);
      return null;
    }
  }
  async _poll(msgId, convId) {
    try {
      const url = `${this.baseUrl}/api/agent/v1/get_message_result`;
      const body = {
        message_id: msgId
      };
      if (convId) body.conversation_id = convId;
      for (let i = 0; i < 360; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const res = await this.client.post(url, body);
        const status = res?.message_status || res?.agent_status;
        if (status === "success" || res?.signal === "finished") {
          return res;
        }
        if (status === "failed") {
          throw new Error(res?.failed_reason || "Agent processing failed");
        }
      }
      throw new Error("Polling timeout reached");
    } catch (err) {
      throw err;
    }
  }
  async createMail() {
    try {
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v42?action=create`);
      const email = res?.data?.result?.address || null;
      this.tkn = res?.data?.token || null;
      return this._fmt(Boolean(email), {
        email: email
      });
    } catch (err) {
      return this._fmt(false, {
        error: this._err(err)
      });
    }
  }
  async checkOtp(email) {
    try {
      const url = `https://${apiConfig.DOMAIN_URL}/api/mails/v42?action=message&token=${this.tkn}`;
      const res = await axios.get(url);
      const list = res?.data?.result?.mails || [];
      let code = null;
      for (const item of list) {
        const text = item?.body_text || item?.body_html || "";
        const match = text.match(/"code"\s*:\s*"(\d+)"/) || text.match(/\b\d{6}\b/);
        if (match) {
          code = match[1] || match[0];
          break;
        }
      }
      return this._fmt(Boolean(code), {
        code: code,
        raw_data: list
      });
    } catch (err) {
      return this._fmt(false, {
        error: this._err(err)
      });
    }
  }
  async createSession(emailInput = null) {
    try {
      this.deviceId = this._uid();
      this.phSessionId = this._uid();
      await this._visit();
      const anon = await this._anon();
      if (!anon?.id_token || !anon?.user_id) throw new Error("Firebase Anonymous Auth failed");
      this.userId = anon.user_id;
      this.session = this._enc({
        token: anon.id_token,
        user_id: anon.user_id,
        device_id: this.deviceId,
        posthog_distinct_id: anon.user_id,
        posthog_session_id: this.phSessionId,
        is_anonymous: true
      });
      let email = emailInput;
      if (!email) {
        const mailRes = await this.createMail();
        email = mailRes?.result?.email;
      }
      if (!email) throw new Error("Failed to generate email");
      this._log(`Sending verification code to ${email}...`);
      await this.client.post(`${this.baseUrl}/api/users/v1/send_code`, {
        email: email
      });
      let code = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const otpRes = await this.checkOtp(email);
        if (otpRes?.status && otpRes?.result?.code) {
          code = otpRes.result.code;
          break;
        }
      }
      if (!code) throw new Error("Timeout waiting for OTP code");
      this._log(`OTP received: ${code}. Requesting Custom Token...`);
      const customUserRes = await this.client.post(`${this.baseUrl}/api/users/v1/create_custom_user`, {
        email: email,
        code: String(code),
        user_id: anon.user_id
      });
      const customToken = customUserRes?.custom_token;
      if (!customToken) throw new Error("Failed to obtain custom token");
      this._log("Exchanging custom token for verified ID Token...");
      const authRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${this.apiKey}`, {
        token: customToken,
        returnSecureToken: true
      }, {
        headers: {
          "content-type": "application/json",
          origin: "https://kaze.ai",
          referer: "https://kaze.ai/"
        }
      });
      const finalIdToken = authRes?.data?.idToken || null;
      if (!finalIdToken) throw new Error("Custom token exchange failed");
      this.session = this._enc({
        token: finalIdToken,
        user_id: anon.user_id,
        device_id: this.deviceId,
        posthog_distinct_id: anon.user_id,
        posthog_session_id: this.phSessionId,
        email: email,
        is_anonymous: false
      });
      await this.client.post(`${this.baseUrl}/api/users/v2/me`, {
        invite_code: null
      }).catch(() => null);
      const finalSessionObj = {
        token: finalIdToken,
        user_id: anon.user_id,
        device_id: this.deviceId,
        posthog_distinct_id: anon.user_id,
        posthog_session_id: this.phSessionId,
        email: email,
        is_anonymous: false
      };
      return this._fmt(true, {
        user_id: anon.user_id,
        email: email
      }, null, finalIdToken, finalSessionObj);
    } catch (err) {
      return this._fmt(false, {
        error: this._err(err)
      });
    }
  }
  async chat({
    token,
    prompt,
    messages,
    media,
    session,
    ...rest
  } = {}) {
    try {
      this._log("Processing chat request...");
      const activeSessStr = session || this.session;
      let sessObj = typeof activeSessStr === "string" ? this._dec(activeSessStr) : activeSessStr;
      let authToken = token || sessObj?.token || null;
      if (!authToken) {
        this._log("No active session found. Creating session automatically...");
        const newSess = await this.createSession();
        if (!newSess?.status || !newSess?.session) {
          throw new Error(newSess?.result?.error || "Session creation failed");
        }
        sessObj = this._dec(newSess.session);
        authToken = sessObj?.token || null;
      } else {
        this.session = activeSessStr;
      }
      const convId = sessObj?.conversation_id || rest?.conversation_id || null;
      if (Array.isArray(messages)) {
        if (prompt) messages.push({
          role: "user",
          content: prompt
        });
        if (media && typeof media === "string" && /^https?:\/\//i.test(media)) {
          messages.push({
            role: "user",
            content: media
          });
        }
      }
      const tagPromptList = [];
      if (media) {
        const mediaObj = await this._bVal(media);
        if (mediaObj) {
          const fileId = await this._uFile(mediaObj);
          if (fileId) {
            tagPromptList.push({
              type: "image",
              content: `image-${this._uid().substring(0, 8)}`,
              file_id: fileId,
              width: rest?.width || 2560,
              height: rest?.height || 2560
            });
          }
        }
      }
      if (prompt) {
        tagPromptList.push({
          type: "text",
          content: prompt
        });
      }
      const sendBody = {
        agent_id: rest?.agent_id || "chat",
        tag_prompt_list: tagPromptList
      };
      if (convId) {
        sendBody.conversation_id = convId;
      }
      for (const [k, v] of Object.entries(rest || {})) {
        if (v !== null && v !== undefined && k !== "conversation_id" && k !== "agent_id") {
          sendBody[k] = v;
        }
      }
      const initRes = await this.client.post(`${this.baseUrl}/api/agent/v1/send_message`, sendBody);
      const msgId = initRes?.message_id;
      const resConvId = initRes?.conversation_id || convId || null;
      if (!msgId) throw new Error("Failed to initiate agent message");
      const pollRes = await this._poll(msgId, resConvId);
      let textContent = "";
      const mediaUrls = [];
      const chunks = [];
      const rawResults = pollRes?.results || [];
      for (const item of rawResults) {
        if (item?.content_type === "text" && item?.text) {
          textContent = item.text;
          chunks.push({
            type: "text",
            content: item.text
          });
        }
        if (item?.files && Array.isArray(item.files)) {
          for (const file of item.files) {
            if (file?.access_url) {
              mediaUrls.push(file.access_url);
              chunks.push({
                type: "image",
                url: file.access_url,
                file_id: file.file_id
              });
            }
          }
        }
      }
      if (Array.isArray(messages)) {
        if (textContent) {
          messages.push({
            role: "assistant",
            content: textContent
          });
        }
        for (const url of mediaUrls) {
          messages.push({
            role: "assistant",
            content: url
          });
        }
      }
      const updatedSessionObj = {
        ...sessObj || {},
        token: authToken,
        conversation_id: resConvId
      };
      const result = {
        conversation_id: resConvId,
        message_id: msgId,
        message_status: pollRes?.message_status || "success",
        text_content: textContent,
        media_urls: mediaUrls,
        follow_up_suggestions: pollRes?.follow_up_suggestions || []
      };
      return this._fmt(true, result, chunks, authToken, updatedSessionObj);
    } catch (err) {
      return this._fmt(false, {
        error: this._err(err)
      }, null, token || null, session || this.session || null);
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
  const api = new KazeAI();
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