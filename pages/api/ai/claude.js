import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class ClaudeClient {
  constructor(options) {
    options = options || {};
    this._utcOffset = options.utcOffset !== undefined ? options.utcOffset : -420;
    this._locale = options.locale || "id-ID";
    this._model = options.model || "claude-sonnet-4-6";
    this._authenticated = false;
    this._account = null;
    this._orgId = null;
    this._convId = null;
    this._conversations = new Map();
    this.cookies = new Map();
    this.anonymousId = "claudeai.v1." + crypto.randomUUID();
    this.deviceId = crypto.randomUUID();
    this.activitySessionId = crypto.randomUUID();
    this.BASE_URL = "https://claude.ai";
    this.CLIENT_SHA = "e6d5ac949ef7d8040d371aa4d26d342f240308cb";
    this.CLIENT_VERSION = "1.0.0";
    this.CLIENT_PLATFORM = "web_claude_ai";
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";
    this.MIME_MAP = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      txt: "text/plain",
      csv: "text/csv",
      html: "text/html",
      md: "text/markdown",
      json: "application/json"
    };
    this.ARKOSE_CONFIG = {
      PUBLIC_KEY: "EEA5F558-D6AC-4C03-B678-AABF639EE69A",
      BASE_URL: "https://a-cdn.claude.ai",
      BUILD_ID: "37965111-f202-48f7-80e6-5bc6c82d268e",
      CAPI_VERSION: "4.2.2",
      SITE: "https://claude.ai"
    };
    this.API = {
      SEND_MAGIC_LINK: "/api/auth/send_magic_link",
      VERIFY_MAGIC_LINK: "/api/auth/verify_magic_link",
      EXCHANGE_NONCE: "/api/auth/exchange_nonce_for_code",
      LOGOUT: "/api/auth/logout",
      ORG: orgId => "/api/organizations/" + orgId,
      CONVERSATIONS: orgId => "/api/organizations/" + orgId + "/chat_conversations",
      CONVERSATION: (orgId, convId) => "/api/organizations/" + orgId + "/chat_conversations/" + convId,
      COMPLETION: (orgId, convId) => "/api/organizations/" + orgId + "/chat_conversations/" + convId + "/completion",
      UPLOAD_FILE: (orgId, convId) => "/api/organizations/" + orgId + "/conversations/" + convId + "/wiggle/upload-file"
    };
    this.SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain", "text/csv", "text/html", "text/markdown", "application/json"]);
  }
  exportState() {
    const stateData = {
      cookies: Array.from(this.cookies.entries()),
      orgId: this._orgId,
      convId: this._convId,
      model: this._model,
      anonymousId: this.anonymousId,
      deviceId: this.deviceId,
      activitySessionId: this.activitySessionId,
      authenticated: this._authenticated,
      account: this._account
    };
    return Buffer.from(JSON.stringify(stateData)).toString("base64");
  }
  importState(stateStr) {
    if (!stateStr) return;
    try {
      const stateData = JSON.parse(Buffer.from(stateStr, "base64").toString("utf8"));
      if (stateData.cookies) this.cookies = new Map(stateData.cookies);
      if (stateData.orgId) this._orgId = stateData.orgId;
      if (stateData.convId) this._convId = stateData.convId;
      if (stateData.model) this._model = stateData.model;
      if (stateData.anonymousId) this.anonymousId = stateData.anonymousId;
      if (stateData.deviceId) this.deviceId = stateData.deviceId;
      if (stateData.activitySessionId) this.activitySessionId = stateData.activitySessionId;
      if (stateData.authenticated) this._authenticated = stateData.authenticated;
      if (stateData.account) this._account = stateData.account;
    } catch (e) {
      console.error("[ClaudeClient] Gagal memuat state session:", e.message);
    }
  }
  setCookies(raw) {
    const arr = Array.isArray(raw) ? raw : [raw];
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      const pair = c.split(";")[0];
      const idx = pair.indexOf("=");
      if (idx < 0) continue;
      const name = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1);
      if (name) this.cookies.set(name, val || "");
    }
  }
  serializeCookies() {
    const parts = [];
    for (const [k, v] of this.cookies.entries()) parts.push(k + "=" + v);
    return parts.join("; ");
  }
  clearCookies() {
    this.cookies.clear();
  }
  mimeLookup(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    return this.MIME_MAP[ext] || null;
  }
  generateTraceHeaders() {
    const hex = n => crypto.randomBytes(n).toString("hex");
    return {
      traceparent: "00-0000000000000000" + hex(8) + "-" + hex(8) + "-01",
      tracestate: "dd=s:1;o:rum",
      "x-datadog-origin": "rum",
      "x-datadog-parent-id": crypto.randomBytes(8).readBigUInt64BE().toString(),
      "x-datadog-sampling-priority": "1",
      "x-datadog-trace-id": crypto.randomBytes(8).readBigUInt64BE().toString()
    };
  }
  buildHeaders(extra) {
    extra = extra || {};
    const h = {
      authority: "claude.ai",
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "anthropic-anonymous-id": this.anonymousId,
      "anthropic-client-platform": this.CLIENT_PLATFORM,
      "anthropic-client-sha": this.CLIENT_SHA,
      "anthropic-client-version": this.CLIENT_VERSION,
      "anthropic-device-id": this.deviceId,
      "content-type": "application/json",
      origin: this.BASE_URL,
      referer: this.BASE_URL + "/",
      "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.UA,
      "x-activity-session-id": this.activitySessionId,
      ...this.generateTraceHeaders()
    };
    const c = this.serializeCookies();
    if (c) h["Cookie"] = c;
    return Object.assign(h, extra);
  }
  async request(method, urlPath, options) {
    options = options || {};
    const body = options.body || null;
    const extraHeaders = options.headers || {};
    let bodyBuf = null;
    if (body) bodyBuf = JSON.stringify(body);
    const headers = this.buildHeaders({
      ...bodyBuf ? {
        "Content-Length": String(Buffer.byteLength(bodyBuf))
      } : {},
      ...extraHeaders
    });
    const url = this.BASE_URL + urlPath;
    try {
      const response = await axios({
        method: method,
        url: url,
        data: bodyBuf,
        headers: headers,
        timeout: 6e4
      });
      if (response.headers["set-cookie"]) this.setCookies(response.headers["set-cookie"]);
      return response.data;
    } catch (err) {
      if (err.response) {
        if (err.response.headers["set-cookie"]) this.setCookies(err.response.headers["set-cookie"]);
        throw new Error("HTTP_" + err.response.status + ": " + JSON.stringify(err.response.data));
      }
      throw err;
    }
  }
  async streamRequest(urlPath, body, extraHeaders) {
    extraHeaders = extraHeaders || {};
    const bodyStr = JSON.stringify(body);
    const headers = this.buildHeaders({
      accept: "text/event-stream",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
      ...extraHeaders
    });
    const url = this.BASE_URL + urlPath;
    try {
      const response = await axios({
        method: "POST",
        url: url,
        data: bodyStr,
        headers: headers,
        responseType: "stream",
        timeout: 12e4
      });
      if (response.headers["set-cookie"]) this.setCookies(response.headers["set-cookie"]);
      if (response.status >= 400) {
        let errData = "";
        await new Promise((resolve, reject) => {
          response.data.on("data", chunk => {
            errData += chunk.toString();
          });
          response.data.on("end", resolve);
          response.data.on("error", reject);
        });
        throw new Error("HTTP " + response.status + ": " + errData.slice(0, 300));
      }
      return response.data;
    } catch (err) {
      if (err.isAxiosError) throw new Error(err.message);
      throw err;
    }
  }
  async parseSSE(stream, onChunk) {
    return new Promise((resolve, reject) => {
      let buffer = "";
      let fullText = "";
      const collectedChunks = [];
      stream.on("data", chunk => {
        buffer += chunk.toString("utf8");
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          let evt;
          try {
            evt = JSON.parse(raw);
          } catch (e) {
            continue;
          }
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            const text = evt.delta.text || "";
            fullText += text;
            collectedChunks.push(text);
            if (onChunk) onChunk(text);
          }
          if (evt.type === "error") {
            reject(new Error("Stream error: " + JSON.stringify(evt.error)));
            return;
          }
        }
      });
      stream.on("end", () => resolve({
        text: fullText,
        chunks: collectedChunks
      }));
      stream.on("error", err => reject(err));
    });
  }
  async getArkoseToken(options) {
    const publicKey = options?.publicKey || this.ARKOSE_CONFIG.PUBLIC_KEY;
    const baseUrl = options?.baseUrl || this.ARKOSE_CONFIG.BASE_URL;
    const esyncValue = String(Math.floor(Date.now() / 1e3) - 1e5);
    const r = () => crypto.randomBytes(32).toString("base64");
    const params = new URLSearchParams();
    params.append("c", r() + "==" + r() + "==" + r() + "==" + r());
    params.append("public_key", publicKey);
    params.append("site", this.ARKOSE_CONFIG.SITE);
    params.append("userbrowser", this.UA);
    params.append("capi_version", this.ARKOSE_CONFIG.CAPI_VERSION);
    params.append("capi_mode", "lightbox");
    params.append("style_theme", "default");
    params.append("rnd", Math.random().toString());
    try {
      const response = await axios({
        method: "POST",
        url: baseUrl + "/fc/gt2/public_key/" + publicKey,
        data: params.toString(),
        headers: {
          authority: "a-cdn.claude.ai",
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "ark-build-id": this.ARKOSE_CONFIG.BUILD_ID,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://claude.ai",
          referer: "https://claude.ai/",
          "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "user-agent": this.UA,
          "x-ark-esync-value": esyncValue
        },
        timeout: 15e3
      });
      if (response.data.token) return response.data.token;
      throw new Error("Arkose memerlukan penyelesaian validasi manual tantangan visual.");
    } catch (err) {
      throw new Error("Arkose Fetch Gagal: " + err.message);
    }
  }
  async sendMagicLink(email) {
    const res = await this.request("POST", this.API.SEND_MAGIC_LINK, {
      body: {
        utc_offset: this._utcOffset,
        email_address: email,
        login_intent: null,
        locale: this._locale,
        return_to: null,
        source: "claude"
      }
    });
    if (!res.sent) throw new Error("Gagal mengirim magic link");
    return res;
  }
  async verifyMagicLink(email, code) {
    const arkoseToken = await this.getArkoseToken();
    const res = await this.request("POST", this.API.VERIFY_MAGIC_LINK, {
      body: {
        credentials: {
          method: "code",
          email_address: email,
          code: String(code)
        },
        locale: this._locale,
        arkose_session_token: arkoseToken,
        source: "claude"
      }
    });
    if (!res.success) throw new Error("Verifikasi kode OTP gagal.");
    this._authenticated = true;
    this._account = res.account;
    const memberships = res.account.memberships || [];
    const chatOrg = memberships.find(m => m.organization.capabilities?.includes("chat"));
    this._orgId = chatOrg?.organization.uuid || memberships[0]?.organization.uuid || null;
    return res;
  }
  async exchangeNonceForCode(nonce, encodedEmailAddress) {
    const res = await this.request("POST", this.API.EXCHANGE_NONCE, {
      body: {
        nonce: nonce,
        encoded_email_address: encodedEmailAddress,
        source: "claude"
      }
    });
    if (!res.code) throw new Error("Gagal menukarkan fragment nonce ke kode verifikasi.");
    return res.code;
  }
  async loginWithMagicLink(magicLinkUrl) {
    const hashIndex = magicLinkUrl.indexOf("#");
    if (hashIndex === -1) throw new Error("Fragment tautan login tidak ditemukan.");
    const fragment = magicLinkUrl.slice(hashIndex + 1);
    const colonIndex = fragment.indexOf(":");
    if (colonIndex === -1) throw new Error("Format fragment tautan tidak valid.");
    const nonce = fragment.slice(0, colonIndex);
    const encodedEmail = fragment.slice(colonIndex + 1);
    const email = Buffer.from(encodedEmail, "base64").toString("utf8");
    const code = await this.exchangeNonceForCode(nonce, encodedEmail);
    return this.verifyMagicLink(email, code);
  }
  extractMagicLinkFromEmail(textContent) {
    const match = textContent.match(/https:\/\/claude\.ai\/magic-link#[a-f0-9]+:[A-Za-z0-9%+=]+/);
    return match ? match[0] : null;
  }
  async waitForMagicLink(emailAddress, maxAttempts, intervalMs) {
    maxAttempts = maxAttempts || 30;
    intervalMs = intervalMs || 3e3;
    for (let i = 0; i < maxAttempts; i++) {
      console.log("[ClaudeClient] Polling email pasif (" + (i + 1) + "/" + maxAttempts + ")...");
      const response = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9`, {
        params: {
          action: "message",
          email: emailAddress
        }
      });
      const messages = response.data?.data || [];
      if (messages.length > 0) {
        const textContent = messages[0].text_content || messages[0].html_content || "";
        const magicLink = this.extractMagicLinkFromEmail(textContent);
        if (magicLink) {
          console.log("[ClaudeClient] Link ditemukan. Mengekstrak parameter fragment...");
          return magicLink;
        }
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error("Timeout: Tidak mendapatkan magic link dalam batas waktu.");
  }
  async ensureAuth() {
    console.log("[ClaudeClient] Memeriksa validasi sesi aktif...");
    try {
      const orgs = await this.request("GET", "/api/organizations");
      if (orgs && orgs.length > 0) {
        this._orgId = orgs[0].uuid;
        this._authenticated = true;
        console.log("[ClaudeClient] Sesi aktif valid. OrgId:", this._orgId);
        return;
      }
    } catch (e) {
      console.log("[ClaudeClient] Sesi mati atau tidak ditemukan. Memulai pendaftaran otomatis...");
    }
    console.log("[ClaudeClient] Membuat email temp baru...");
    const createRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9`, {
      params: {
        action: "create"
      }
    });
    const email = createRes.data.email;
    console.log("[ClaudeClient] Email terbuat: " + email + ". Mengirim Magic Link...");
    await this.sendMagicLink(email);
    const magicLinkUrl = await this.waitForMagicLink(email);
    console.log("[ClaudeClient] Menukarkan nonce ke kode login...");
    await this.loginWithMagicLink(magicLinkUrl);
    console.log("[ClaudeClient] Otentikasi sukses otomatis dilakukan. OrgId:", this._orgId);
  }
  async createConversation(name) {
    name = name || "";
    if (!this._orgId) throw new Error("No organization selected");
    const res = await this.request("POST", this.API.CONVERSATIONS(this._orgId), {
      body: {
        name: name,
        model: this._model
      },
      headers: {
        accept: "application/json"
      }
    });
    if (!res.uuid) throw new Error("Gagal menginisialisasi UUID percakapan");
    this._conversations.set(res.uuid, {
      name: name
    });
    return res.uuid;
  }
  async uploadFile(conversationId, fileBuffer, filename, mimeType) {
    if (!this._orgId) throw new Error("No organization selected");
    const name = filename || "upload.bin";
    let mime = mimeType;
    if (!mime && filename) mime = this.mimeLookup(filename);
    if (!mime) mime = "application/octet-stream";
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: name,
      contentType: mime
    });
    const headers = {
      ...this.buildHeaders({
        referer: this.BASE_URL + "/chat/" + conversationId
      }),
      ...form.getHeaders()
    };
    const url = this.BASE_URL + this.API.UPLOAD_FILE(this._orgId, conversationId);
    try {
      const response = await axios({
        method: "POST",
        url: url,
        data: form,
        headers: headers,
        timeout: 6e4
      });
      return response.data.file_uuid || response.data.uuid || response.data.id;
    } catch (err) {
      if (err.response) throw new Error("Gagal unggah berkas: " + JSON.stringify(err.response.data));
      throw new Error("Gagal unggah berkas: " + err.message);
    }
  }
  async sendMessage(conversationId, prompt, options) {
    options = options || {};
    const onChunk = options.onChunk || null;
    const newConv = options.newConv || false;
    const files = options.files || [];
    const parentMsgUUID = options.parentMsgUUID || null;
    const thinkingMode = options.thinkingMode || null;
    const payloadOverride = options.payloadOverride || {};
    if (!this._orgId) throw new Error("No organization selected");
    const humanUUID = crypto.randomUUID();
    const assistantUUID = crypto.randomUUID();
    const body = {
      prompt: prompt,
      timezone: "Asia/Jakarta",
      locale: this._locale,
      model: this._model,
      personalized_styles: [{
        type: "default",
        key: "Default",
        name: "Normal",
        nameKey: "normal_style_name",
        prompt: "Normal\n",
        summary: "Default responses from Claude",
        summaryKey: "normal_style_summary",
        isDefault: true
      }],
      tools: [{
        type: "web_search_v0",
        name: "web_search"
      }, {
        type: "artifacts_v0",
        name: "artifacts"
      }, {
        type: "repl_v0",
        name: "repl"
      }],
      turn_message_uuids: {
        human_message_uuid: humanUUID,
        assistant_message_uuid: assistantUUID
      },
      attachments: [],
      files: files,
      sync_sources: [],
      rendering_mode: "messages",
      ...payloadOverride
    };
    if (parentMsgUUID) body.parent_message_uuid = parentMsgUUID;
    if (thinkingMode) body.thinking_mode = thinkingMode;
    if (newConv) {
      body.create_conversation_params = {
        name: "",
        model: this._model,
        include_conversation_preferences: true,
        is_temporary: false
      };
    }
    const stream = await this.streamRequest(this.API.COMPLETION(this._orgId, conversationId), body, {
      referer: this.BASE_URL + "/chat/" + conversationId
    });
    const resData = await this.parseSSE(stream, onChunk);
    return {
      text: resData.text,
      chunks: resData.chunks,
      assistantUUID: assistantUUID,
      humanUUID: humanUUID
    };
  }
  async chat({
    state,
    prompt = "",
    conv_id,
    model,
    files = [],
    ...rest
  } = {}) {
    console.log("[ClaudeClient] Memulai aksi instruksi chat...");
    const {
      onChunk,
      ...payloadOverride
    } = rest;
    try {
      if (state) this.importState(state);
      if (model) this._model = model;
      await this.ensureAuth();
      let conversationId = conv_id || this._convId;
      if (!conversationId) {
        console.log("[ClaudeClient] Tidak ada conv_id, membuat percakapan baru...");
        conversationId = await this.createConversation();
      } else {
        console.log("[ClaudeClient] Menggunakan conv_id:", conversationId);
      }
      this._convId = conversationId;
      const result = await this.sendMessage(conversationId, prompt, {
        onChunk: onChunk,
        newConv: false,
        files: files,
        payloadOverride: payloadOverride
      });
      return {
        success: true,
        conversationId: conversationId,
        text: result.text,
        chunks: result.chunks,
        assistantUUID: result.assistantUUID,
        humanUUID: result.humanUUID,
        state: this.exportState()
      };
    } catch (error) {
      console.error("[ClaudeClient] Proses internal chat error:", error.message);
      return {
        success: false,
        error: error.message,
        chunks: [],
        state: this.exportState()
      };
    }
  }
  async logout() {
    if (this._authenticated) {
      try {
        await this.request("POST", this.API.LOGOUT);
      } catch (e) {}
    }
    this._authenticated = false;
    this._account = null;
    this._orgId = null;
    this._convId = null;
    this.clearCookies();
  }
  get activeOrgId() {
    return this._orgId;
  }
  get activeConvId() {
    return this._convId;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ClaudeClient();
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