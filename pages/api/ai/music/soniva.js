import axios from "axios";
import crypto from "crypto";
class Soniva {
  constructor() {
    try {
      this.log = (tag, msg) => console.log(`[Soniva::${tag}] ${msg}`);
      this.logError = (tag, msg, err) => console.error(`[Soniva::${tag}::ERROR] ${msg}`, err || "");
      this.baseUrl = "https://api.sonivamusic.com/musicai/v1";
      this.logEventUrl = "https://us-central1-musicai-82274.cloudfunctions.net/logAppEvent";
      this.DELIMITER = "CPUL0POqZ9bXDdCf";
      this.SIGN_KEY = "05zeodm72h4wenx7p9x1rx37vxdu8o0la7cnje6a8spka78qon9xg1q1a0aby4x1";
      this.REQ_ID_KEY = "kcz5pzvtabrjg561i98qjt9ydghtbp0i2c0z5xoih505rmu0ot2ki1";
      this.deviceId = "";
      this.user_id = "";
      this.ua = "SonivaMusic/1.5.20 (build:133; Android 15; realme RMX3890)";
      this.appVersion = "1.5.20";
      this.versionCode = "133";
      this.log("INIT", `Ready. DeviceID: ${this.deviceId} | UserID: ${this.user_id}`);
    } catch (err) {
      console.error("[Soniva::INIT::FATAL] Constructor error:", err.message);
    }
  }
  _uid() {
    try {
      return crypto.randomUUID();
    } catch (err) {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16));
    }
  }
  _sign(deviceId, msgId, reqTime) {
    try {
      const stringToSign = `${msgId}${this.DELIMITER}${deviceId}${reqTime}`;
      return crypto.createHmac("sha256", this.SIGN_KEY).update(Buffer.from(stringToSign, "utf-8")).digest("base64");
    } catch (err) {
      this.logError("_sign", "HMAC-SHA256 signature failed", err.message);
      throw err;
    }
  }
  _reqId(deviceId, msgId, reqTime) {
    try {
      const stringToReqId = `${deviceId}${msgId}${reqTime}`;
      return crypto.createHmac("sha256", this.REQ_ID_KEY).update(Buffer.from(stringToReqId, "utf-8")).digest("base64");
    } catch (err) {
      this.logError("_reqId", "HMAC-SHA256 request-id failed", err.message);
      throw err;
    }
  }
  _headers(msgId, reqTime) {
    try {
      return {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-signature-id": this._sign(this.deviceId, msgId, reqTime),
        "x-device-id": this.deviceId,
        "x-request-time": reqTime.toString(),
        "x-message-id": msgId,
        platform: "android",
        "x-app-version": this.appVersion,
        "x-version-code": this.versionCode,
        "x-country": "ID",
        "accept-language": "id-ID"
      };
    } catch (err) {
      this.logError("_headers", "Header generation error", err.message);
      throw err;
    }
  }
  async _ensureUserId(user_id) {
    try {
      if (user_id) {
        this.user_id = user_id;
        return {
          success: true,
          user_id: user_id
        };
      }
      if (this.user_id) {
        return {
          success: true,
          user_id: this.user_id
        };
      }
      this.log("_ensureUserId", "User ID kosong, memicu register...");
      const reg = await this.reg();
      if (reg.success) {
        this.user_id = reg.user_id;
        return {
          success: true,
          user_id: this.user_id
        };
      }
      return reg;
    } catch (err) {
      this.logError("_ensureUserId", "User ID check error", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async reg(deviceId = null, pushToken = null) {
    try {
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      if (deviceId) this.deviceId = deviceId;
      const payload = {
        device_id: this.deviceId,
        push_token: pushToken,
        message_id: msgId
      };
      this.log("REG", `Registering device: ${this.deviceId}`);
      const res = await axios.post(`${this.baseUrl}/register`, payload, {
        headers: this._headers(msgId, reqTime)
      });
      const user_id = res?.data?.user_id || "";
      if (user_id) this.user_id = user_id;
      this.log("REG", `Registered successfully -> User ID: ${user_id}`);
      return {
        success: true,
        user_id: user_id,
        data: res.data
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("REG", "Register failed", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async info({
    user_id
  } = {}) {
    try {
      const ensure = await this._ensureUserId(user_id);
      if (!ensure.success) return ensure;
      const id = ensure.user_id;
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      this.log("INFO", `Fetching info for user: ${id}`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/info`, {
        headers: this._headers(msgId, reqTime)
      });
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("INFO", "Info fetch error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async playlists({
    user_id
  } = {}) {
    try {
      const ensure = await this._ensureUserId(user_id);
      if (!ensure.success) return ensure;
      const id = ensure.user_id;
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      this.log("PLAYLISTS", `Fetching playlists for user: ${id}`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/playlists`, {
        headers: this._headers(msgId, reqTime)
      });
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("PLAYLISTS", "Playlists fetch error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async generate({
    prompt,
    lyrics,
    title = "",
    user_id,
    mood = "Happy,Romantic",
    genre = "Pop",
    has_vocal = true,
    vocal_gender = "random",
    record_type = null,
    is_dual = true
  }) {
    try {
      if (!prompt && !lyrics) {
        return {
          success: false,
          error: "Either 'prompt' or 'lyrics' is required."
        };
      }
      const ensure = await this._ensureUserId(user_id);
      if (!ensure.success) return ensure;
      const id = ensure.user_id;
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      let endpoint, payload;
      if (prompt) {
        endpoint = `/users/${id}/songs/prompt`;
        payload = {
          mood: mood,
          genre: genre,
          has_vocal: has_vocal,
          vocal_gender: vocal_gender,
          record_type: record_type,
          prompt: prompt,
          is_dual_song_enabled: is_dual,
          message_id: msgId
        };
        this.log("GENERATE", `Generating song via Prompt for User: ${id}`);
      } else {
        endpoint = `/users/${id}/songs/lyrics`;
        payload = {
          mood: mood,
          genre: genre,
          has_vocal: has_vocal,
          vocal_gender: vocal_gender,
          record_type: record_type,
          lyrics: lyrics,
          title: title || "Song Title",
          is_dual_song_enabled: is_dual,
          message_id: msgId
        };
        this.log("GENERATE", `Generating song via Lyrics for User: ${id}`);
      }
      const res = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
        headers: this._headers(msgId, reqTime)
      });
      this.log("GENERATE", `Job Created. Job ID: ${res.data?.job_id || "N/A"}`);
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("GENERATE", "Song generation error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async status({
    job_id,
    user_id
  }) {
    try {
      if (!job_id) return {
        success: false,
        error: "Missing required field: job_id"
      };
      const ensure = await this._ensureUserId(user_id);
      if (!ensure.success) return ensure;
      const id = ensure.user_id;
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      this.log("STATUS", `Polling song status for Job ID: ${job_id}`);
      const res = await axios.get(`${this.baseUrl}/songs/${job_id}`, {
        headers: this._headers(msgId, reqTime)
      });
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("STATUS", "Polling status error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async library({
    user_id,
    page = 1,
    limit = 60,
    sort_asc = false
  }) {
    try {
      const ensure = await this._ensureUserId(user_id);
      if (!ensure.success) return ensure;
      const id = ensure.user_id;
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      this.log("LIBRARY", `Fetching library [Page: ${page}, Limit: ${limit}]`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/library`, {
        params: {
          page: page,
          limit: limit,
          sortAsc: sort_asc ? "true" : "false"
        },
        headers: this._headers(msgId, reqTime)
      });
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("LIBRARY", "Library fetch error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async explore({
    section = "trending",
    page = 1,
    limit = 80,
    range = "weekly"
  }) {
    try {
      const validSections = ["trending", "popular", "recent", "clips"];
      const targetSection = validSections.includes(section) ? section : "trending";
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      const params = {
        page: page,
        limit: limit
      };
      if (targetSection === "trending") params.range = range || "weekly";
      if (targetSection === "popular") params.range = range || "alltime";
      this.log("EXPLORE", `Fetching explore/${targetSection}`);
      const res = await axios.get(`${this.baseUrl}/explore/${targetSection}`, {
        params: params,
        headers: this._headers(msgId, reqTime)
      });
      return {
        success: true,
        section: targetSection,
        data: res.data
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("EXPLORE", "Explore fetch error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
  async logEvent(eventType = "integrityCheck", message = "", operation = "unexpectedError") {
    try {
      const msgId = this._uid();
      const reqTime = Date.now().toString();
      const payload = {
        userId: this.user_id || "",
        eventType: eventType,
        message: message,
        operation: operation
      };
      const headers = {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-request-id": this._reqId(this.deviceId, msgId, reqTime),
        "x-device-id": this.deviceId,
        "x-request-time": reqTime,
        "x-message-id": msgId,
        "x-platform": "android",
        "x-app-version": this.appVersion,
        "x-country": "ID",
        "accept-language": "id-ID"
      };
      this.log("LOG_EVENT", `Logging event to Cloud Functions: ${eventType}`);
      const res = await axios.post(this.logEventUrl, payload, {
        headers: headers
      });
      return {
        success: true,
        data: res.data
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.logError("LOG_EVENT", "Cloud function log error", JSON.stringify(error));
      return {
        success: false,
        error: error
      };
    }
  }
}
export default async function handler(req, res) {
  const method = req.method;
  const {
    action,
    ...params
  } = method === "GET" ? req.query : req.body;
  const validActions = ["register", "generate", "status", "user_info", "playlists", "library", "explore", "log_event"];
  try {
    console.log(`[Handler] Method: ${method} | Action: ${action || "NONE"}`);
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions
      });
    }
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        error: `Action '${action}' tidak valid.`,
        valid_actions: validActions
      });
    }
    const api = new Soniva();
    let response;
    const payload = {
      ...params,
      user_id: params.userId || params.user_id,
      job_id: params.songId || params.job_id,
      has_vocal: params.hasVocal !== undefined ? params.hasVocal === true || params.hasVocal === "true" : undefined,
      is_dual: params.isDual !== undefined ? params.isDual === true || params.isDual === "true" : undefined,
      sort_asc: params.sortAsc !== undefined ? params.sortAsc === true || params.sortAsc === "true" : undefined
    };
    switch (action) {
      case "register":
        response = await api.reg(params.deviceId, params.pushToken);
        break;
      case "generate":
        response = await api.generate(payload);
        break;
      case "status":
        response = await api.status(payload);
        break;
      case "user_info":
        response = await api.info(payload);
        break;
      case "playlists":
        response = await api.playlists(payload);
        break;
      case "library":
        payload.page = params.page ? parseInt(params.page, 10) : 1;
        payload.limit = params.limit ? parseInt(params.limit, 10) : 60;
        response = await api.library(payload);
        break;
      case "explore":
        payload.page = params.page ? parseInt(params.page, 10) : 1;
        payload.limit = params.limit ? parseInt(params.limit, 10) : 80;
        response = await api.explore(payload);
        break;
      case "log_event":
        response = await api.logEvent(params.eventType, params.message, params.operation);
        break;
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari Soniva Server."
      });
    }
    return res.status(response.success === false ? 400 : 200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[Handler::FATAL] Action '${action}' error:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal server.",
      error: error.message
    });
  }
}