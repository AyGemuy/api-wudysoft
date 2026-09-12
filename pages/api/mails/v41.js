import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.base = "https://mail.dormammu.org/hub-api/api/v1";
    this.ua = "Dart/3.3 (dart:io)";
    this.installId = null;
    this.accessToken = null;
    this.clearanceToken = null;
    this.inboxId = null;
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip"
      }
    });
  }
  _dec(stateB64) {
    if (!stateB64) return {};
    try {
      const json = Buffer.from(stateB64, "base64").toString("utf-8");
      return JSON.parse(json);
    } catch (e) {
      console.error("[TempMail][State] Dekode Error:", e.message);
      return {};
    }
  }
  _enc() {
    try {
      const stateObj = {
        installId: this.installId,
        accessToken: this.accessToken,
        clearanceToken: this.clearanceToken,
        inboxId: this.inboxId
      };
      return Buffer.from(JSON.stringify(stateObj)).toString("base64");
    } catch (e) {
      console.error("[TempMail][State] Kode Error:", e.message);
      return null;
    }
  }
  _snake(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this._snake(item));
    }
    if (typeof obj === "object" && obj.constructor === Object) {
      const result = {};
      for (const key of Object.keys(obj)) {
        const snakeKey = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
        result[snakeKey] = this._snake(obj[key]);
      }
      return result;
    }
    return obj;
  }
  _genId() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
    let rand = "";
    for (let i = 0; i < 12; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const ts = Date.now().toString(36);
    return `vkrm-${ts}-${rand}`;
  }
  _isChal(res) {
    if (res.status === 403 || res.status === 429) {
      const data = res.data;
      const code = data?.code || data?.errorCode || data?.reason;
      if (code === "CHALLENGE_REQUIRED" || data?.challenge) {
        return true;
      }
    }
    return false;
  }
  async _solve(payload) {
    console.log("[TempMail] Memulai penyelesaian tantangan PoW...");
    try {
      const challenge = payload.challenge || payload;
      const token = challenge.challengeToken || challenge.token;
      const diff = parseInt(challenge.difficulty, 10) || 4;
      const path = challenge.solvePath || "/mobile/challenge/solve";
      if (!token) throw new Error("Token tantangan kosong.");
      console.log(`[TempMail] Menghitung nonce untuk difficulty: ${diff}...`);
      const prefix = "0".repeat(diff);
      let nonce = 0;
      let solved = false;
      while (!solved) {
        const input = `${token}:${nonce}`;
        const hash = crypto.createHash("sha256").update(input).digest("hex");
        if (hash.startsWith(prefix)) {
          solved = true;
          break;
        }
        nonce++;
      }
      console.log(`[TempMail] Nonce dipecahkan: ${nonce}`);
      const res = await this.client.post(path, {
        challengeToken: token,
        nonce: nonce
      });
      this.clearanceToken = res.data.clearanceToken || res.data.token;
      if (!this.clearanceToken) throw new Error("Gagal memperoleh token clearance.");
      console.log("[TempMail] Token clearance diperbarui.");
    } catch (e) {
      console.error("[TempMail][ERR] _solve:", e.message);
      throw e;
    }
  }
  async _sess() {
    if (this.accessToken) return;
    if (!this.installId) {
      this.installId = this._genId();
    }
    console.log("[TempMail] Mengambil bootstrap token baru...");
    let bToken;
    try {
      const res = await this.client.post("/mobile/token", {
        installId: this.installId,
        platform: "android",
        appVersion: "1.0.0",
        deviceName: "TempMail Flutter",
        clientTier: "free",
        workspaceSlug: "vkrm-mobile"
      }, {
        validateStatus: () => true
      });
      if (this._isChal(res)) {
        await this._solve(res.data);
        const retry = await this.client.post("/mobile/token", {
          installId: this.installId,
          platform: "android",
          appVersion: "1.0.0",
          deviceName: "TempMail Flutter",
          clientTier: "free",
          workspaceSlug: "vkrm-mobile"
        }, {
          headers: {
            "X-Tempmail-Challenge-Clearance": this.clearanceToken
          }
        });
        bToken = retry.data.bootstrapToken || retry.data.token;
      } else {
        bToken = res.data.bootstrapToken || res.data.token;
      }
    } catch (e) {
      console.error("[TempMail][ERR] Sesi bootstrap gagal:", e.message);
      throw e;
    }
    if (!bToken) throw new Error("Token bootstrap tidak valid.");
    console.log("[TempMail] Menukar bootstrap token ke mobile session...");
    try {
      const res = await this.client.post("/mobile/session", {
        bootstrapToken: bToken
      });
      const data = res.data.session || res.data;
      this.accessToken = data.accessToken || data.token;
      console.log("[TempMail] Sesi mobile berhasil aktif.");
    } catch (e) {
      console.error("[TempMail][ERR] Sesi mobile gagal:", e.message);
      throw e;
    }
  }
  async _req({
    method,
    url,
    data = null,
    headers = {},
    expected = [200, 201]
  }) {
    await this._sess();
    const reqHeaders = {
      ...headers
    };
    if (this.accessToken) reqHeaders["Authorization"] = `Bearer ${this.accessToken}`;
    if (this.clearanceToken) reqHeaders["X-Tempmail-Challenge-Clearance"] = this.clearanceToken;
    try {
      const res = await this.client({
        method: method,
        url: url,
        data: data,
        headers: reqHeaders,
        validateStatus: () => true
      });
      if (this._isChal(res)) {
        await this._solve(res.data);
        return this._req({
          method: method,
          url: url,
          data: data,
          headers: headers,
          expected: expected
        });
      }
      if (res.status === 401 && this.accessToken) {
        this.accessToken = null;
        this.clearanceToken = null;
        return this._req({
          method: method,
          url: url,
          data: data,
          headers: headers,
          expected: expected
        });
      }
      if (!expected.includes(res.status)) {
        const msg = res.data?.detail || res.data?.message || res.data?.error || "Kesalahan respon API.";
        throw new Error(`API Error [${res.status}]: ${msg}`);
      }
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.error(`[TempMail][ERR] Request '${url}' gagal:`, e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
  _rest(state) {
    if (state) {
      const dec = this._dec(state);
      this.installId = dec.installId || this.installId;
      this.accessToken = dec.accessToken || this.accessToken;
      this.clearanceToken = dec.clearanceToken || this.clearanceToken;
      this.inboxId = dec.inboxId || this.inboxId;
      console.log("[TempMail] State berhasil dipulihkan.");
    }
  }
  async domains({
    state
  } = {}) {
    console.log("[TempMail] Menjalankan 'domains'...");
    try {
      this._rest(state);
      const res = await this._req({
        method: "GET",
        url: "/mobile/domains"
      });
      return {
        status: res.status,
        result: this._snake(res.result),
        state: this._enc()
      };
    } catch (e) {
      console.error("[TempMail][ERR] domains:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._enc()
      };
    }
  }
  async create({
    state,
    domainId,
    name = "",
    password = "",
    previewToken = ""
  } = {}) {
    console.log("[TempMail] Menjalankan 'create'...");
    try {
      this._rest(state);
      let domId = domainId;
      if (!domId) {
        console.log("[TempMail] domainId tidak ditentukan. Mencari domain acak...");
        const domRes = await this._req({
          method: "GET",
          url: "/mobile/domains"
        });
        if (domRes.status && Array.isArray(domRes.result) && domRes.result.length > 0) {
          const actives = domRes.result.filter(d => d.isActive);
          const target = actives.length > 0 ? actives : domRes.result;
          const random = target[Math.floor(Math.random() * target.length)];
          domId = random.id;
          console.log(`[TempMail] Terpilih otomatis: ${random.domain} (${domId})`);
        } else {
          throw new Error("Gagal mengambil daftar domain.");
        }
      }
      const payload = {
        domainId: domId,
        retentionHours: 48
      };
      const trimName = (name || "").trim();
      if (trimName) {
        payload.name = trimName;
        payload.customAddress = trimName;
      }
      const trimPass = (password || "").trim();
      if (trimPass) payload.password = trimPass;
      const trimPrev = (previewToken || "").trim();
      if (trimPrev) payload.previewToken = trimPrev;
      const res = await this._req({
        method: "POST",
        url: "/inbox",
        data: payload
      });
      if (res.status) {
        const inboxObj = res.result?.inbox || res.result?.item || res.result || {};
        this.inboxId = inboxObj.id || null;
        console.log(`[TempMail] Sesi baru mendeteksi ID Inbox baru: ${this.inboxId}`);
      }
      return {
        status: res.status,
        result: this._snake(res.result),
        state: this._enc()
      };
    } catch (e) {
      console.error("[TempMail][ERR] create:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._enc()
      };
    }
  }
  async message({
    state
  } = {}) {
    console.log("[TempMail] Menjalankan 'message'...");
    try {
      this._rest(state);
      const targetId = this.inboxId;
      if (!targetId) {
        throw new Error("Sesi state tidak mendeteksi ID Inbox aktif. Silakan lakukan aksi 'create' terlebih dahulu.");
      }
      console.log(`[TempMail] Mengambil daftar inbox untuk ID: ${targetId}`);
      const inboxRes = await this._req({
        method: "GET",
        url: `/inbox/${encodeURIComponent(targetId)}`
      });
      if (!inboxRes.status) {
        return {
          status: false,
          result: inboxRes.result,
          state: this._enc()
        };
      }
      const data = inboxRes.result;
      const inner = data?.inbox || data?.item || data || {};
      const list = inner.emails || inner.messages || inner.items || data.items || [];
      console.log(`[TempMail] Ditemukan ${list.length} email. Memulai pemrosesan detail otomatis...`);
      const hydrated = [];
      for (const msg of list) {
        const id = msg.id || msg.messageId;
        if (id) {
          console.log(`[TempMail] Fetching detail untuk ID: ${id}`);
          const detail = await this._req({
            method: "GET",
            url: `/email/${encodeURIComponent(id)}`
          });
          hydrated.push({
            ...msg,
            detail: detail.status ? detail.result : null,
            error: detail.status ? null : detail.result
          });
        } else {
          hydrated.push(msg);
        }
      }
      const finalResult = {
        ...data,
        emails: hydrated,
        messages: hydrated
      };
      return {
        status: true,
        result: this._snake(finalResult),
        state: this._enc()
      };
    } catch (e) {
      console.error("[TempMail][ERR] message:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._enc()
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    state,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const valid = ["domains", "create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "domains":
        response = await api.domains({
          state: state,
          ...params
        });
        break;
      case "create":
        response = await api.create({
          state: state,
          ...params
        });
        break;
      case "message":
        response = await api.message({
          state: state,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}`,
          valid_actions: valid
        });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Sesi gagal pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal.",
      error: error.message || "Unknown Error",
      state: state || null
    });
  }
}