import axios from "axios";
import WebSocket from "ws";
import crypto from "crypto";
import {
  FormData,
  File
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class AlleAI {
  constructor() {
    try {
      this.tk = null;
      this.uid = null;
      this.em = null;
      this.cs = null;
      this.debug = true;
      this.bUrl = "https://api.alle-ai.com/api/v1";
      this.aUrl = "https://app.alle-ai.com/api";
      this.mUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.cookies = {};
      this.client = axios.create();
      this.client.interceptors.request.use(config => {
        try {
          const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
          if (cookieStr) {
            config.headers["Cookie"] = cookieStr;
          }
        } catch (_) {}
        return config;
      }, error => Promise.reject(error));
      this.client.interceptors.response.use(response => {
        this._cookies(response.headers?.["set-cookie"]);
        return response;
      }, error => {
        if (error.response?.headers?.["set-cookie"]) {
          this._cookies(error.response.headers["set-cookie"]);
        }
        return Promise.reject(error);
      });
      this.baseHeaders = {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "ngrok-skip-browser-warning": "true",
        origin: "https://app.alle-ai.com",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
    } catch (_) {}
  }
  _log(m) {
    try {
      console.log(`[AlleAI] ${m}`);
    } catch (_) {}
  }
  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  _pass() {
    try {
      return `Pass${crypto.randomBytes(4).toString("hex")}A!`;
    } catch (_) {
      return "PassDefault123!";
    }
  }
  _name() {
    try {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let result = "";
      const bytes = crypto.randomBytes(8);
      for (let i = 0; i < bytes.length; i++) {
        result += chars[bytes[i] % chars.length];
      }
      return result;
    } catch (_) {
      return "User";
    }
  }
  _cookies(setCookieHeaders) {
    try {
      if (!setCookieHeaders) return;
      const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      headers.forEach(cookieStr => {
        const parts = cookieStr.split(";")[0].split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim();
          this.cookies[key] = val;
        }
      });
    } catch (_) {}
  }
  async _req(method, url, data = null, token = null, fullUrl = null) {
    try {
      const headers = {
        ...this.baseHeaders
      };
      const authToken = token || this.tk;
      if (authToken) {
        headers["authorization"] = `Bearer ${authToken}`;
      }
      const isFormData = data && (data instanceof FormData || data.constructor?.name === "FormData");
      if (data && !isFormData) {
        headers["content-type"] = "application/json";
      }
      const config = {
        method: method,
        url: fullUrl || `${this.bUrl}${url}`,
        headers: headers,
        timeout: 6e4
      };
      if (data) {
        config.data = data;
      }
      if (this.debug) {
        console.log(`\n🔵 ${method.toUpperCase()} ${config.url}`);
        if (isFormData) {
          console.log("📦 FormData fields attached");
        } else if (data) {
          console.log("📦 Data:", data);
        }
      }
      const res = await this.client(config);
      if (this.debug) {
        console.log(`🟢 ${method.toUpperCase()} ${config.url} → ${res.status}`);
      }
      return res.data;
    } catch (err) {
      if (this.debug) {
        console.log(`🔴 ${method.toUpperCase()} ${fullUrl || url}`);
        if (err.response) {
          console.log("📦 Status:", err.response.status);
          console.log("📦 Data:", err.response.data);
        } else {
          console.log("📦 Error:", err.message);
        }
      }
      return {
        error: true,
        message: err.response?.data?.message || err.response?.data?.error || err.message,
        detail: err.response?.data
      };
    }
  }
  async _mail() {
    try {
      this._log("Buat email sementara...");
      const res = await this.client.get(`${this.mUrl}?action=create`);
      return res?.data?.email || null;
    } catch (_) {
      return null;
    }
  }
  async _otp(email) {
    try {
      this._log(`Cek OTP untuk ${email}...`);
      let code = null;
      for (let i = 0; i < 20; i++) {
        await this._sleep(3e3);
        try {
          const res = await this.client.get(`${this.mUrl}?action=message&email=${email}`);
          const list = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
          for (const item of list) {
            const txt = item?.text_content || item?.html_content || "";
            const m = txt.match(/([A-Z0-9]+-\d+)/i) || txt.match(/(\d{6})/);
            if (m) {
              code = m[1];
              break;
            }
          }
        } catch (_) {}
        if (code) break;
      }
      return code;
    } catch (_) {
      return null;
    }
  }
  async _media(input) {
    try {
      let buf = null,
        mime = "image/jpeg",
        fname = `${crypto.randomUUID()}.jpg`;
      if (Buffer.isBuffer(input)) {
        buf = input;
      } else if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          const res = await this.client.get(input, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(res.data);
          if (res.headers?.["content-type"]) mime = res.headers["content-type"];
          const parts = input.split("/");
          const last = parts[parts.length - 1];
          if (last && last.includes(".")) fname = last;
        } else if (input.startsWith("data:")) {
          const parts = input.split(",");
          const mm = parts[0]?.match(/:(.*?);/);
          if (mm) mime = mm[1];
          buf = Buffer.from(parts[1] || "", "base64");
          const ext = mime.split("/")[1] || "jpg";
          fname = `${crypto.randomUUID()}.${ext}`;
        } else {
          buf = Buffer.from(input, "base64");
        }
      }
      return {
        buffer: buf,
        mimeType: mime,
        fileName: fname
      };
    } catch (e) {
      this._log(`Proses media gagal: ${e.message}`);
      return {
        buffer: null,
        mimeType: "image/jpeg",
        fileName: ""
      };
    }
  }
  async _prefs() {
    try {
      await this.client.get(`${this.aUrl}/snowfall/preferences`, {
        headers: {
          ...this.baseHeaders,
          "sec-fetch-site": "same-origin"
        }
      });
    } catch (_) {}
  }
  async _verify(token) {
    try {
      const res = await this._req("post", "/auth", {}, token);
      if (res && res.error) return false;
      return res?.status === true;
    } catch (_) {
      return false;
    }
  }
  async _token(force = false) {
    try {
      await this._prefs();
      if (this.tk && this.uid && !force) {
        const valid = await this._verify(this.tk);
        if (valid) {
          return {
            status: true,
            result: "Token aktif",
            token: this.tk
          };
        } else {
          this._log("Token tidak valid, refresh...");
        }
      }
      const mail = await this._mail();
      if (!mail) return {
        status: false,
        result: "Gagal memperoleh email sementara",
        token: null
      };
      this.em = mail;
      const pass = this._pass();
      const firstName = this._name();
      const lastName = this._name();
      const reg = await this._req("post", "/register", {
        first_name: firstName,
        last_name: lastName,
        email: mail,
        password: pass,
        password_confirmation: pass
      });
      if (reg.error) return {
        status: false,
        result: reg.message || "Registrasi gagal",
        token: null
      };
      const token = reg?.token || reg?.data?.token;
      this.uid = reg?.data?.user?.id || reg?.user?.id || reg?.id;
      if (!token) return {
        status: false,
        result: "Registrasi gagal (no token)",
        token: null
      };
      this.tk = token;
      const code = await this._otp(mail);
      if (!code) return {
        status: false,
        result: "Kode OTP tidak ditemukan",
        token: null
      };
      const verif = await this._req("post", "/email/verify", {
        code: code,
        email: mail
      });
      if (verif.error) return {
        status: false,
        result: verif.message || "Verifikasi gagal",
        token: null
      };
      const postAuth = await this._req("post", "/auth", {});
      if (postAuth.error) return {
        status: false,
        result: postAuth.message || "Otentikasi pasca-verifikasi gagal",
        token: null
      };
      const fresh = postAuth?.token || postAuth?.data?.token;
      if (fresh) this.tk = fresh;
      const freshUid = postAuth?.data?.user?.id || postAuth?.user?.id || postAuth?.id;
      if (freshUid) this.uid = freshUid;
      try {
        await this._req("post", "/user-survey", {
          intents: [],
          remind_later: true
        });
      } catch (_) {}
      return {
        status: true,
        result: "Onboarding OK",
        token: this.tk
      };
    } catch (e) {
      return {
        status: false,
        result: e.message,
        token: null
      };
    }
  }
  async _models(token = null) {
    try {
      if (token) this.tk = token;
      const auth = await this._token();
      if (!auth.status) return auth;
      const res = await this._req("get", "/models/chat");
      if (res.error) return {
        status: false,
        result: res.message,
        token: this.tk
      };
      const list = Array.isArray(res) ? res : res?.data || [];
      return {
        status: true,
        result: list,
        token: this.tk
      };
    } catch (e) {
      return {
        status: false,
        result: e.message,
        token: this.tk
      };
    }
  }
  async _hist(session) {
    try {
      if (!session) return [];
      const res = await this._req("get", `/conversations/chat/${session}`);
      if (res.error) return [];
      return Array.isArray(res) ? res : res?.data || [];
    } catch (_) {
      return [];
    }
  }
  async _sess(session) {
    try {
      if (!session) return [];
      const res = await this._req("get", `/models/${session}`);
      if (res.error) return [];
      return Array.isArray(res) ? res : res?.data || [];
    } catch (_) {
      return [];
    }
  }
  async chat({
    prompt,
    messages,
    media,
    model,
    web_search = false,
    combine = false,
    compare = false,
    conversation = null,
    token = null,
    resetSession = false,
    onChunk = null
  }) {
    try {
      if (token) this.tk = token;
      if (resetSession) this.cs = null;
      const auth = await this._token();
      if (!auth.status) return auth;
      let pText = prompt || null;
      if (!pText && Array.isArray(messages)) {
        const last = messages[messages.length - 1];
        pText = last?.content || (typeof last === "string" ? last : null);
      }
      if (!pText) return {
        status: false,
        result: "Prompt kosong.",
        token: this.tk
      };
      const modelsRes = await this._models();
      if (!modelsRes.status) return modelsRes;
      const mList = Array.isArray(modelsRes?.result) ? modelsRes.result : [];
      const uids = mList.map(m => m?.model_uid).filter(Boolean);
      let targets = [];
      if (Array.isArray(model)) {
        targets = model.filter(m => uids.includes(m));
      } else if (typeof model === "string" && model.trim() !== "") {
        targets = model.split(",").map(m => m.trim()).filter(m => uids.includes(m));
      }
      if (targets.length < 2) {
        const fallbackDefaults = ["gemini-3-5-flash", "gemini-2-5-flash", "gpt-4o", "claude-3-5-sonnet"];
        const availableDefaults = fallbackDefaults.filter(d => uids.includes(d) && !targets.includes(d));
        targets = [...targets, ...availableDefaults].slice(0, 2);
        if (targets.length < 2) {
          const remaining = uids.filter(u => !targets.includes(u));
          targets = [...targets, ...remaining].slice(0, 2);
        }
      }
      if (targets.length === 0) {
        return {
          status: false,
          result: "Tidak ada model yang tersedia.",
          token: this.tk
        };
      }
      let session = conversation || this.cs;
      const isFirstPrompt = !session;
      let promptId = null;
      const mediaItems = [];
      if (media) {
        const items = Array.isArray(media) ? media : [media];
        for (const item of items) {
          const solved = await this._media(item);
          if (solved?.buffer) mediaItems.push(solved);
        }
      }
      if (isFirstPrompt) {
        this._log(`Buat sesi baru menggunakan model: ${targets.join(", ")}`);
        const form = new FormData();
        form.append("models", JSON.stringify(targets));
        form.append("type", "chat");
        form.append("prompt", pText);
        form.append("combine", String(combine));
        form.append("compare", String(compare));
        form.append("web_search", String(web_search));
        for (let i = 0; i < mediaItems.length; i++) {
          const f = mediaItems[i];
          const mime = f.mimeType || "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          const fname = f.fileName || `${crypto.randomUUID()}.${ext}`;
          const sizeKB = (f.buffer.length / 1024).toFixed(1);
          form.append(`input_content[uploaded_files][${i}][file_name]`, fname);
          form.append(`input_content[uploaded_files][${i}][file_size]`, `${sizeKB}KB`);
          form.append(`input_content[uploaded_files][${i}][file_type]`, "image");
          const fileObj = new File([f.buffer], fname, {
            type: mime
          });
          form.append(`input_content[uploaded_files][${i}][file_content]`, fileObj);
        }
        const first = await this._req("post", "/create/first-prompt", form);
        if (first.error) return {
          status: false,
          result: first.message,
          detail: first.detail,
          token: this.tk
        };
        promptId = first?.promptData?.id || first?.data?.promptData?.id;
        session = first?.conversation?.session || first?.data?.conversation?.session;
        this.cs = session;
      } else {
        this._log(`Lanjut sesi ${session} via /create/prompt`);
        const history = await this._hist(session);
        const position = history.length;
        await this._sess(session);
        const payload = {
          conversation: session,
          prompt: pText,
          position: [0, position],
          combine: combine,
          compare: compare,
          web_search: web_search
        };
        const next = await this._req("post", "/create/prompt", payload);
        if (next.error) return {
          status: false,
          result: next.message,
          detail: next.detail,
          token: this.tk
        };
        promptId = next?.id || next?.data?.id;
      }
      try {
        await this._req("post", "/get-title", {
          conversation: session,
          prompt: pText,
          type: "chat"
        });
      } catch (_) {}
      const channelName = `private-App.Models.User.${this.uid}`;
      const wsUrl = `wss://api.alle-ai.com/app/pb1ry0ntlug7dm2fga0s?protocol=7&client=js&version=8.4.0&flash=false`;
      const ws = new WebSocket(wsUrl);
      const streamPromise = new Promise(resolveStream => {
        try {
          const chunks = [];
          ws.on("open", () => {
            if (this.debug) this._log("Raw WebSocket Connected. Waiting handshake...");
          });
          ws.on("message", async dataStr => {
            try {
              const msg = JSON.parse(dataStr.toString());
              if (msg.event === "pusher:connection_established") {
                const connData = JSON.parse(msg.data);
                const socketId = connData.socket_id;
                this._log(`WS Handshake Berhasil. Socket ID: ${socketId}`);
                const authRes = await this._req("post", null, {
                  socket_id: socketId,
                  channel_name: channelName
                }, null, "https://api.alle-ai.com/broadcasting/auth");
                if (authRes.error || !authRes.auth) {
                  this._log(`Gagal auth Channel WS: ${authRes.message}`);
                  ws.close();
                  resolveStream(chunks);
                  return;
                }
                ws.send(JSON.stringify({
                  event: "pusher:subscribe",
                  data: {
                    auth: authRes.auth,
                    channel: channelName
                  }
                }));
              }
              if (msg.event === "chat.chunk") {
                const chunkData = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
                if (chunkData.prompt_id == promptId || !chunkData.prompt_id) {
                  chunks.push(chunkData);
                  if (typeof onChunk === "function") onChunk(chunkData);
                }
              }
              if (msg.event === "chat.stream.complete") {
                const chunkData = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
                if (chunkData.prompt_id == promptId || !chunkData.prompt_id) {
                  chunks.push(chunkData);
                  const completedCount = chunks.filter(c => c?.event === "complete" || c?.full_response).length;
                  if (completedCount >= targets.length) {
                    this._log("Seluruh model selesai me-stream respon.");
                    ws.close();
                    resolveStream(chunks);
                  }
                }
              }
            } catch (e) {
              if (this.debug) this._log(`WS Error parse: ${e.message}`);
            }
          });
          ws.on("error", err => {
            this._log(`WS Connection error: ${err.message}`);
            ws.close();
            resolveStream(chunks);
          });
          ws.on("close", () => {
            resolveStream(chunks);
          });
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
            resolveStream(chunks);
          }, 3e4);
        } catch (_) {
          resolveStream([]);
        }
      });
      this._log(`Memicu AI response untuk model: ${targets.join(", ")}...`);
      const aiResponses = [];
      for (const target of targets) {
        const res = await this._req("post", "/ai-response", {
          conversation: session,
          model: target,
          is_new: isFirstPrompt,
          prompt: promptId,
          combine: combine,
          compare: compare
        });
        aiResponses.push(res);
      }
      if (web_search && promptId && session) {
        const validResp = aiResponses.find(r => r && !r.error && (r?.data?.id || r?.id));
        const respId = validResp?.data?.id || validResp?.id;
        if (respId) {
          try {
            await this._req("post", "/web-search", {
              prompt_id: promptId,
              conversation_id: session,
              messages: [
                [promptId, String(respId)]
              ]
            });
          } catch (_) {}
        }
      }
      const wsChunks = await streamPromise;
      const modelOutputs = {};
      for (const target of targets) {
        const modelChunks = wsChunks.filter(c => c?.model_uid === target || c?.model === target);
        let raw = "";
        for (const c of modelChunks) {
          if (c && typeof c === "object" && c.full_response) {
            raw = c.full_response;
            break;
          }
        }
        if (!raw && modelChunks.length > 0) {
          raw = modelChunks.map(c => c?.chunk || c?.text || c?.content || c?.delta || "").join("");
        }
        if (!raw) {
          const matchResp = aiResponses.find(r => r && !r.error && ((r?.data?.model_uid || r?.model_uid) === target || r?.model === target));
          raw = matchResp?.response || matchResp?.full_response || matchResp?.data?.response || "";
        }
        const think = raw.match(/<think>([\s\S]*?)<\/think>/);
        const thinking = think ? think[1].trim() : null;
        const clean = thinking ? raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : raw;
        modelOutputs[target] = {
          response: clean || raw || "Tidak ada respon",
          thinking: thinking,
          raw_response: raw
        };
      }
      return {
        status: true,
        result: {
          conversation_session: session,
          prompt_id: promptId,
          models_used: targets,
          outputs: modelOutputs,
          response: modelOutputs[targets[0]]?.response || "Tidak ada respon",
          thinking: modelOutputs[targets[0]]?.thinking || null
        },
        token: this.tk
      };
    } catch (err) {
      this._log(`❌ Error: ${err.message}`);
      return {
        status: false,
        result: err.message || "Proses gagal",
        token: this.tk
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
  const api = new AlleAI();
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