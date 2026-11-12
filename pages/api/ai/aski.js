import axios from "axios";
import crypto from "crypto";
class AskiChat {
  constructor(cfg = {}) {
    try {
      this.base_url = "https://vicuna.cognise.art";
      this.app_id = "com.aski.chatgpt.ai.chatbot";
      this.app_res_id = "restricto-45539aad-fddc-4abf-b314-1140cd8ad264";
      this.app_version = "1.5.14";
      this.version_number = "64";
      this.fb_api_key = "AIzaSyCu7iRZmvnbm_sdPn2gELearYLinxKM_W0";
      this.fb_app_id = "1:1000978637872:android:2f8b34a22c4ee03799b9f5";
      this.fb_project_id = "aski-88696";
      this.fb_project_num = "1000978637872";
      this.android_pkg = "com.aski.chatgpt.ai.chatbot";
      this.android_cert = "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81";
      this.android_ua = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
      this.fallback = {
        key: "c1hkM2dIVno3K0cmbWM2VA==",
        iv: "c2Zfb0soRnR4UERsZ2pTcg==",
        token: "a32cb83fd8fe437d42218b9c8ab5949225c9ce4c"
      };
      this.key_b64 = cfg?.key_b64 || null;
      this.iv_b64 = cfg?.iv_b64 || null;
      this.token = cfg?.token || null;
      this.mobile_id = cfg?.mobile_id || crypto.randomUUID();
      this.ut_token = cfg?.ut_token || null;
      this.session_id = cfg?.session_id || null;
      this.user = cfg?.user || null;
      this.last_auth_at = 0;
      this.server_offset = 0;
      this.valid_idx = cfg?.valid_idx ? cfg.valid_idx : 1;
      this.creds_ready = false;
      this.fis_cache = null;
      this.creds_cache = null;
      this.http = axios.create({
        baseURL: this.base_url,
        timeout: 35e3,
        validateStatus: () => true,
        headers: {
          "User-Agent": "okhttp/5.5.0",
          "Accept-Encoding": "gzip"
        }
      });
      this.http.interceptors.request.use(req => {
        console.log(`[LOG] HTTP Request -> [${req.method?.toUpperCase() || "GET"}] ${req.url || ""}`);
        return req;
      }, err => {
        console.log(`[LOG] Request Interceptor Error: ${err?.message || err}`);
        return Promise.reject(err);
      });
      this.http.interceptors.response.use(res => {
        console.log(`[LOG] HTTP Response <- [${res.status || 0}] ${res.config?.url || ""}`);
        return res;
      }, err => {
        console.log(`[LOG] Response Interceptor Error: ${err?.message || err}`);
        return Promise.reject(err);
      });
      if (cfg?.state) {
        this.unpack(cfg.state);
      }
    } catch (err) {
      console.log(`[LOG] Constructor Error: ${err?.message || err}`);
    }
  }
  pack() {
    try {
      const data = {
        mobile_id: this.mobile_id,
        ut_token: this.ut_token,
        session_id: this.session_id,
        valid_idx: this.valid_idx,
        key_b64: this.key_b64,
        iv_b64: this.iv_b64,
        token: this.token,
        server_offset: this.server_offset,
        user: this.user
      };
      return Buffer.from(JSON.stringify(data)).toString("base64");
    } catch (err) {
      console.log(`[LOG] Pack Error: ${err?.message || err}`);
      return "";
    }
  }
  unpack(b64) {
    try {
      if (!b64) return false;
      const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      this.mobile_id = parsed?.mobile_id || this.mobile_id;
      this.ut_token = parsed?.ut_token || this.ut_token;
      this.session_id = parsed?.session_id || this.session_id;
      this.valid_idx = parsed?.valid_idx ? parsed.valid_idx : this.valid_idx;
      this.key_b64 = parsed?.key_b64 || this.key_b64;
      this.iv_b64 = parsed?.iv_b64 || this.iv_b64;
      this.token = parsed?.token || this.token;
      this.server_offset = parsed?.server_offset ? parsed.server_offset : this.server_offset;
      this.user = parsed?.user || this.user;
      console.log(`[LOG] State unpacked -> session: ${this.session_id || "new"}`);
      return true;
    } catch (err) {
      console.log(`[LOG] Unpack Error: ${err?.message || err}`);
      return false;
    }
  }
  upd(d) {
    try {
      if (!d) return;
      const ms = new Date(d).getTime();
      if (isFinite(ms)) this.server_offset = Math.floor((ms - Date.now()) / 1e3);
    } catch (err) {
      console.log(`[LOG] upd error: ${err?.message || err}`);
    }
  }
  now() {
    try {
      return Math.floor(Date.now() / 1e3) + (this.server_offset || 0);
    } catch (err) {
      return Math.floor(Date.now() / 1e3);
    }
  }
  mrk() {
    this.last_auth_at = Date.now();
  }
  async tck(minMs = 0) {
    try {
      const e = Date.now() - (this.last_auth_at || 0);
      if (e < minMs) await new Promise(r => setTimeout(r, minMs - e));
    } catch (err) {
      console.log(`[LOG] tck error: ${err?.message || err}`);
    }
  }
  bld(idx = this.valid_idx, nowSec = this.now()) {
    try {
      const t1 = nowSec - 5;
      const t2 = nowSec + 300;
      const s1 = String(t1);
      const s2 = String(t2);
      const c1 = s1.charAt(idx);
      const c2 = s2.charAt(s2.length - idx);
      return `${t1}${this.token.substring(0, idx)}${c1}${c2}${this.token.substring(idx)}${c1}${c2}${t2}`;
    } catch (err) {
      console.log(`[LOG] bld error: ${err?.message || err}`);
      return "";
    }
  }
  aesE(text) {
    try {
      const key = Buffer.from(this.key_b64, "base64");
      const iv = Buffer.from(this.iv_b64, "base64");
      const c = crypto.createCipheriv("aes-128-cbc", key, iv);
      const enc = Buffer.concat([c.update(Buffer.from(text, "utf8")), c.final()]);
      return `${enc.toString("base64")}:${iv.toString("base64")}`;
    } catch (err) {
      console.log(`[LOG] aesE error: ${err?.message || err}`);
      return "";
    }
  }
  aesD(b64) {
    try {
      const blob = Buffer.from(b64, "base64");
      const iv = blob.subarray(0, 16);
      const ct = blob.subarray(16);
      const key = Buffer.from(this.key_b64, "base64");
      const d = crypto.createDecipheriv("aes-128-cbc", key, iv);
      return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
    } catch (err) {
      console.log(`[LOG] aesD error: ${err?.message || err}`);
      return "";
    }
  }
  auth(idx = this.valid_idx) {
    try {
      return `token ${this.aesE(this.bld(idx))}`;
    } catch (err) {
      console.log(`[LOG] auth header error: ${err?.message || err}`);
      return "";
    }
  }
  async solvM(m) {
    try {
      if (!m) return null;
      if (Buffer.isBuffer(m)) {
        console.log("[LOG] Media solved: Buffer to base64");
        return `data:image/jpeg;base64,${m.toString("base64")}`;
      }
      if (typeof m === "string" && (m.startsWith("http://") || m.startsWith("https://"))) {
        console.log(`[LOG] Media resolved: URL -> ${m}`);
        const res = await axios.get(m, {
          responseType: "arraybuffer",
          timeout: 15e3
        });
        const mime = res.headers?.["content-type"] || "image/jpeg";
        return `data:${mime};base64,${Buffer.from(res.data).toString("base64")}`;
      }
      if (typeof m === "string") {
        return m.startsWith("data:") ? m : `data:image/jpeg;base64,${m}`;
      }
      return null;
    } catch (err) {
      console.log(`[LOG] Media solve error: ${err?.message || err}`);
      return null;
    }
  }
  async fis(force = false) {
    try {
      if (!force && this.fis_cache && this.fis_cache.expires_at > Date.now() + 6e4) {
        return this.fis_cache;
      }
      const fid = crypto.randomUUID().replace(/-/g, "");
      const res = await axios.post(`https://firebaseinstallations.googleapis.com/v1/projects/${this.fb_project_id}/installations`, {
        fid: fid,
        appId: this.fb_app_id,
        authVersion: "FIS_v2",
        sdkVersion: "a:19.1.2"
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Android-Package": this.android_pkg,
          "X-Android-Cert": this.android_cert,
          "x-goog-api-key": this.fb_api_key,
          "User-Agent": this.android_ua
        },
        validateStatus: () => true,
        timeout: 2e4
      });
      if (res.status < 200 || res.status >= 300 || !res.data?.authToken?.token) {
        throw new Error(`FIS ${res.status}: ${JSON.stringify(res.data)}`);
      }
      const token = res.data.authToken.token;
      let expires_at = Date.now() + 36e5;
      try {
        expires_at = (JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8")).exp || 0) * 1e3 || expires_at;
      } catch (_) {}
      this.fis_cache = {
        fid: fid,
        token: token,
        expires_at: expires_at
      };
      return this.fis_cache;
    } catch (err) {
      console.log(`[LOG] fis error: ${err?.message || err}`);
      throw err;
    }
  }
  async rc() {
    try {
      let f = await this.fis();
      const req = inst => axios.post(`https://firebaseremoteconfig.googleapis.com/v1/projects/${this.fb_project_num}/namespaces/firebase:fetch`, {
        appVersion: this.app_version,
        appBuild: this.version_number,
        appId: this.fb_app_id,
        appInstanceId: inst.fid,
        appInstanceIdToken: inst.token,
        countryCode: "ID",
        languageCode: "id-ID",
        platformVersion: "35",
        packageName: this.android_pkg,
        sdkVersion: "23.1.0",
        timeZone: "Asia/Makassar",
        analyticsUserProperties: {},
        firstOpenTime: new Date().toISOString()
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.fb_api_key,
          "X-Android-Package": this.android_pkg,
          "X-Android-Cert": this.android_cert,
          "X-Goog-Firebase-Installations-Auth": inst.token,
          "X-Firebase-RC-Fetch-Type": "BASE/1",
          "X-Google-GFE-Can-Retry": "yes",
          "User-Agent": this.android_ua
        },
        validateStatus: () => true,
        timeout: 2e4
      });
      let res = await req(f);
      if (res.status === 401 || res.status === 403) {
        this.fis_cache = null;
        f = await this.fis(true);
        res = await req(f);
      }
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`RC ${res.status}: ${JSON.stringify(res.data)}`);
      }
      return res.data;
    } catch (err) {
      console.log(`[LOG] rc error: ${err?.message || err}`);
      throw err;
    }
  }
  async crd(force = false) {
    try {
      if (!force && this.creds_cache && this.creds_cache.expires_at > Date.now()) {
        return this.creds_cache;
      }
      const cfg = await this.rc();
      const raw = cfg?.entries?.vicuna_prod;
      if (!raw) throw new Error("vicuna_prod empty");
      const p = JSON.parse(raw);
      if (!p.key || !p.iv || !p.token) throw new Error("incomplete keys");
      this.creds_cache = {
        key: p.key,
        iv: p.iv,
        token: p.token,
        previous_key: p.previous_key || null,
        previous_iv: p.previous_iv || null,
        template_version: cfg.templateVersion || null,
        expires_at: Date.now() + 30 * 60 * 1e3
      };
      console.log(`[LOG] Remote credentials ready (template=${cfg.templateVersion || "n/a"})`);
      return this.creds_cache;
    } catch (err) {
      console.log(`[LOG] Remote credentials failed (${err?.message || err}), using fallback`);
      this.creds_cache = {
        ...this.fallback,
        expires_at: Date.now() + 6e4
      };
      return this.creds_cache;
    }
  }
  async ensC(force = false) {
    try {
      if (this.creds_ready && !force && this.key_b64 && this.iv_b64 && this.token) return;
      const c = await this.crd(force);
      this.key_b64 = this.key_b64 || c?.key;
      this.iv_b64 = this.iv_b64 || c?.iv;
      this.token = this.token || c?.token;
      this.creds_ready = true;
    } catch (err) {
      console.log(`[LOG] ensC error: ${err?.message || err}`);
    }
  }
  async tInit(idx) {
    try {
      const headers = {
        authorization: this.auth(idx),
        "x-app-id": this.app_id,
        "ut-token": this.ut_token
      };
      const res = await this.http.post("/v3/chat/session/init", undefined, {
        headers: headers
      });
      this.upd(res.headers?.date);
      this.mrk();
      return {
        ok: res.status >= 200 && res.status < 300 && !!res.data?.session_id,
        res: res,
        idx: idx
      };
    } catch (err) {
      return {
        ok: false,
        error: err,
        idx: idx
      };
    }
  }
  async models() {
    try {
      console.log("[LOG] Fetching models list...");
      const res = await this.http.get("/v3/models/");
      const ok = res.status >= 200 && res.status < 300;
      return {
        status: ok,
        result: res.data || null,
        state: this.pack()
      };
    } catch (err) {
      console.log(`[LOG] models error: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data?.detail || err?.message || "Models error"
        },
        state: this.pack()
      };
    }
  }
  async hs() {
    try {
      await this.ensC();
      await this.tck(1e3);
      console.log(`[LOG] Handshake mobile_id=${this.mobile_id} idx=${this.valid_idx}`);
      const headers = {
        "content-type": "application/json",
        authorization: this.auth(this.valid_idx),
        "x-res-app-id": this.app_res_id,
        "x-app-id": this.app_id,
        "x-app-version": this.app_version,
        "x-version-number": this.version_number
      };
      const res = await this.http.post("/handshake/", {
        mobile_id: this.mobile_id
      }, {
        headers: headers
      });
      this.upd(res.headers?.date);
      this.mrk();
      if (!(res.status >= 200 && res.status < 300) || !res.data?.data?.token) {
        throw new Error(`Handshake ${res.status}: ${JSON.stringify(res.data)}`);
      }
      this.ut_token = res.data.data.token;
      this.user = res.data.data;
      console.log(`[LOG] Handshake success ut_token=${this.ut_token}`);
      return {
        status: true,
        result: res.data,
        state: this.pack()
      };
    } catch (err) {
      console.log(`[LOG] hs error: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data?.detail || err?.message || "Handshake failed"
        },
        state: this.pack()
      };
    }
  }
  async init() {
    try {
      if (!this.ut_token) {
        const h = await this.hs();
        if (!h.status) throw new Error(h.result?.error_message || "HS failed");
      }
      const order = [this.valid_idx, 1, 7, 2, 3, 4, 5, 6, 8, 9, 10].filter((v, i, a) => a.indexOf(v) === i && v >= 1 && v <= 10);
      console.log(`[LOG] Init session (indices: ${order.join(", ")})`);
      for (const idx of order) {
        const {
          ok,
          res
        } = await this.tInit(idx);
        if (ok) {
          console.log(`[LOG] Init success with idx=${idx} -> session_id=${res.data.session_id}`);
          this.valid_idx = idx;
          this.session_id = res.data.session_id;
          return {
            status: true,
            result: res.data,
            state: this.pack()
          };
        }
        await new Promise(r => setTimeout(r, 400));
      }
      throw new Error("Session init failed across all indices 1..10");
    } catch (err) {
      console.log(`[LOG] init error: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data?.detail || err?.message || "Init failed"
        },
        state: this.pack()
      };
    }
  }
  async chat({
    state,
    prompt,
    messages,
    media,
    ...rest
  } = {}) {
    try {
      if (state) {
        this.unpack(state);
      }
      const msgList = [];
      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          msgList.push(m);
        }
      }
      const mediaParts = [];
      if (media) {
        const mediaList = Array.isArray(media) ? media : [media];
        for (const item of mediaList) {
          const solved = await this.solvM(item);
          if (solved) {
            mediaParts.push({
              type: "image_url",
              image_url: {
                url: solved
              }
            });
          }
        }
      }
      if (prompt || mediaParts.length > 0) {
        if (mediaParts.length > 0) {
          const content = [];
          if (prompt) content.push({
            type: "text",
            text: prompt
          });
          for (const mp of mediaParts) {
            content.push(mp);
          }
          msgList.push({
            role: "user",
            content: content
          });
        } else if (prompt) {
          msgList.push({
            role: "user",
            content: prompt
          });
        }
      }
      if (msgList.length === 0) {
        return {
          status: false,
          result: {
            error_message: "prompt/messages cannot be empty"
          },
          state: this.pack()
        };
      }
      if (!this.ut_token) {
        const h = await this.hs();
        if (!h.status) throw new Error(h.result?.error_message || "Handshake failed");
      }
      const sid = rest?.session_id || this.session_id || (await this.init())?.result?.session_id;
      if (!sid) throw new Error("Failed to acquire session_id");
      await this.tck(300);
      const body = {
        max_tokens: rest?.max_tokens ? rest.max_tokens : 300,
        messages: msgList,
        mode: rest?.mode || "auto",
        session_id: sid,
        temperature: rest?.temperature ? rest.temperature : .3
      };
      const headers = {
        "content-type": "application/json",
        authorization: this.auth(this.valid_idx),
        "x-app-id": this.app_id,
        "ut-token": this.ut_token
      };
      console.log(`[LOG] Sending completion for session: ${sid}`);
      const res = await this.http.post("/v3/chat/completions/", body, {
        headers: headers
      });
      this.upd(res.headers?.date);
      this.mrk();
      if (res.status < 200 || res.status >= 300) {
        return {
          status: false,
          result: {
            error_message: res.data?.detail || res.data?.message || `HTTP ${res.status}`,
            status_code: res.status
          },
          state: this.pack()
        };
      }
      let data = res.data;
      if (data?.encrypted && typeof data?.data === "string") {
        try {
          data = JSON.parse(this.aesD(data.data));
        } catch (_) {}
      }
      return {
        status: true,
        result: data,
        state: this.pack()
      };
    } catch (err) {
      console.log(`[LOG] chat error: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data?.detail || err?.message || "Chat error",
          status_code: err?.response?.status || 500
        },
        state: this.pack()
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["chat", "models", "hs", "init"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo%20siapa%20kamu? (Bisa pakai POST dengan { prompt, state, media, messages })",
          models: "/?action=models",
          hs: "/?action=hs (Handshake session)",
          init: "/?action=init (Inisialisasi session baru)"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new AskiChat(params);
  try {
    let response;
    switch (action) {
      case "chat": {
        const hasMessages = Array.isArray(params?.messages) && params.messages.length > 0;
        if (!params?.prompt && !hasMessages && !params?.media) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt', 'messages', atau 'media' wajib diisi untuk action chat."
          });
        }
        response = await api.chat({
          state: params?.state,
          prompt: params?.prompt,
          messages: params?.messages,
          media: params?.media,
          ...params
        });
        break;
      }
      case "models":
        response = await api.models();
        break;
      case "hs":
        response = await api.hs();
        break;
      case "init":
        response = await api.init();
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || !response.status) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error_message || "Gagal memproses permintaan ke server target.",
        result: response?.result || null,
        state: response?.state || null
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}