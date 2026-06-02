import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.url = "https://fakemail.app/v1/api";
    this.key = "bulubulu321";
    this.devId = crypto.randomBytes(32).toString("hex");
    this.token = null;
    this.tokenHour = null;
    console.log(`[INIT] FakemailAPI siap. Device ID: ${this.devId}`);
  }
  setToken(b64Token) {
    if (!b64Token) return;
    try {
      const decrypted = this._dec(b64Token);
      const [pref, hourStr, hash] = decrypted.split("|");
      if (pref === "Y2hhbWVfaHR0ZDE=" && hourStr && hash) {
        this.token = b64Token;
        this.tokenHour = parseInt(hourStr, 10);
        console.log(`[MANUAL] Token Base64 berhasil di-dec & di-set. Jam Token (UTC): ${hourStr}`);
      } else {
        throw new Error("Format isi token tidak valid.");
      }
    } catch (err) {
      console.error("[ERROR_SET_TOKEN] Gagal memproses token Base64 input:", err.message);
      this.token = null;
      this.tokenHour = null;
    }
  }
  _padKey() {
    return this.key.padEnd(32, "0");
  }
  _enc(text) {
    try {
      const key = Buffer.from(this._padKey(), "utf-8");
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
      return Buffer.concat([iv, enc]).toString("base64");
    } catch (err) {
      console.error("[ERROR_ENC] Gagal mengenkripsi token:", err.message);
      throw err;
    }
  }
  _dec(b64Text) {
    try {
      const key = Buffer.from(this._padKey(), "utf-8");
      const bData = Buffer.from(b64Text, "base64");
      const iv = bData.subarray(0, 16);
      const encryptedText = bData.subarray(16);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      const dec = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
      return dec.toString("utf8");
    } catch (err) {
      console.error("[ERROR_DEC] Gagal mendekripsi token:", err.message);
      throw err;
    }
  }
  _genToken(currentHour) {
    try {
      console.log("[PROCESS] Membuat token baru...");
      const pref = "Y2hhbWVfaHR0ZDE=";
      const hourStr = currentHour.toString().padStart(2, "0");
      const hash = crypto.createHash("sha256").update(this.devId, "utf8").digest("hex");
      this.tokenHour = currentHour;
      return this._enc(`${pref}|${hourStr}|${hash}`);
    } catch (err) {
      console.error("[ERROR_GEN_TOKEN] Gagal generate token:", err.message);
      throw err;
    }
  }
  _getToken() {
    const currentHour = new Date().getUTCHours();
    if (!this.token || this.tokenHour !== currentHour) {
      console.log(`[EXPIRED/NEW] Token lama expired/belum ada (Jam saat ini UTC: ${currentHour}).`);
      this.token = this._genToken(currentHour);
    }
    return this.token;
  }
  async _req(method, path, data = null, headers = {}) {
    console.log(`[HTTP] ${method} -> ${this.url}${path}`);
    try {
      const activeToken = this._getToken();
      const res = await axios({
        method: method,
        url: `${this.url}${path}`,
        headers: {
          Referer: "App",
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
          ...headers
        },
        data: data,
        timeout: 1e4
      });
      console.log(`[SUCCESS] Respon dari ${path} diterima.`);
      return {
        success: true,
        token: activeToken,
        data: res.data
      };
    } catch (err) {
      console.error(`[ERROR_REQ] Gagal pada path ${path}:`);
      const errorData = err.response ? err.response.data : err.message;
      return {
        success: false,
        token: this.token,
        error: errorData
      };
    }
  }
  async message({
    token
  } = {}) {
    if (token) {
      this.setToken(token);
    } else {
      this._getToken();
    }
    console.log("[API] Mengambil daftar inbox...");
    const result = await this._req("GET", "/inbox");
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      console.log(`[AUTO] Terdeteksi ${result.data.length} email masuk. Menarik isi HTML pesan...`);
      const enrichedEmails = await Promise.all(result.data.map(async email => {
        const id = email.id || email.hash_email;
        if (id) {
          const viewDetail = await this.view({
            id: id
          });
          return {
            ...email,
            content: viewDetail.success ? viewDetail.data : null
          };
        }
        return email;
      }));
      result.data = enrichedEmails;
    }
    return result;
  }
  async domain({
    token
  } = {}) {
    if (token) this.setToken(token);
    else this._getToken();
    console.log("[API] Mengambil daftar domain...");
    return await this._req("GET", "/inbox/domains");
  }
  async create({
    domain = "anowt.com",
    token
  } = {}) {
    if (token) this.setToken(token);
    else this._getToken();
    console.log(`[API] Membuat email baru dengan domain: ${domain}...`);
    return await this._req("POST", "/inbox/create", {
      domain: domain
    });
  }
  async view({
    id,
    token
  } = {}) {
    if (token) this.setToken(token);
    else this._getToken();
    console.log(`[API] Mengambil isi pesan untuk ID/Hash: ${id}...`);
    return await this._req("GET", `/inbox/view/${id}`);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["domain", "create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create"
      }
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "domain":
        response = await api.domain(params);
        break;
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
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
      status: true,
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