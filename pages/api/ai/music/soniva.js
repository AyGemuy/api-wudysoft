import axios from "axios";
import crypto from "crypto";
class Soniva {
  constructor() {
    this.user_id = "";
    this.deviceId = this.uid();
    this.baseUrl = "https://api.sonivamusic.com/musicai/v1";
    this.ua = "SonivaMusic/1.5.2 (build:115; Android 15; realme RMX3890)";
    this.log = console.log;
  }
  uid() {
    return crypto.randomUUID();
  }
  _sign(deviceId, messageId, requestTime) {
    const JAVA_BYTE_KEY = [9, -68, 74, 103, -109, 76, 23, -83, -95, -36, 42, 35, 77, 77, 59, 59, 16, -117, 112, 47, -109, 65, -74, -86, 60, -100, 22, 87, 22, 46, -78, 86, -34, -5, -56, -124, 31, 57, 72, 117, -22, -50, -92, 93, 29, 125, -11, 126, -13, 40, 51, -94, -69, -79, 17, -109, 25, 33, 100, -115, 27, 127, -47, 78];
    const DECRYPTION_PARAM_1 = Uint8Array.from([94, 86, 68, 22, 67, 88, 1, 95, 13, 82, 30, 72, 8, 8, 91, 1]);
    const DECRYPTION_PARAM_2 = Uint8Array.from([94, 81, 94, 10, 92, 28, 71, 87, 78, 2, 9, 10, 72, 14, 92, 27, 92, 14, 4, 15]);
    const ENCRYPTED_KEY_BYTES = JAVA_BYTE_KEY.map(val => val < 0 ? 256 + val : val);
    const xorWithStaticKey = inputBytes => {
      const key = Buffer.from("3a1c2ou68jox9dlj3v", "utf-8");
      const output = Buffer.alloc(inputBytes.length);
      for (let i = 0; i < inputBytes.length; i++) {
        output[i] = inputBytes[i] ^ key[i % key.length];
      }
      return output;
    };
    const decryptBytes = encryptedBytes => {
      const length = encryptedBytes.length;
      const xorParam1Decrypted = xorWithStaticKey(DECRYPTION_PARAM_1);
      const xorParam2Decrypted = xorWithStaticKey(DECRYPTION_PARAM_2);
      const stringForHash = xorParam1Decrypted.toString("utf-8") + xorParam2Decrypted.toString("utf-8") + "com.sonivamusic.ai";
      const hash = crypto.createHash("sha512").update(Buffer.from(stringForHash, "utf-8")).digest();
      const hashSlice = hash.slice(0, length);
      const result = Buffer.alloc(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        result[i] = encryptedBytes[i] ^ hashSlice[i];
      }
      return result;
    };
    const getDecryptedStringPart = () => {
      const part1 = xorWithStaticKey([112, 49, 100, 47, 2, 63, 58, 71]).toString("utf-8");
      const part2 = xorWithStaticKey([105, 88, 83, 59, 118, 11, 54, 80]).toString("utf-8");
      return part1 + part2;
    };
    const stringToSign = messageId + getDecryptedStringPart() + deviceId + requestTime;
    const secretKey = decryptBytes(ENCRYPTED_KEY_BYTES);
    const mac = crypto.createHmac("sha256", secretKey);
    return mac.update(Buffer.from(stringToSign, "utf-8")).digest("base64");
  }
  _headers(msgId, reqTime) {
    return {
      "User-Agent": this.ua,
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-signature-id": this._sign(this.deviceId, msgId, reqTime),
      "x-device-id": this.deviceId,
      "x-request-time": reqTime,
      "x-message-id": msgId,
      platform: "android",
      "x-app-version": "1.5.2",
      "x-version-code": "115",
      "x-country": "ID",
      "accept-language": "id-ID"
    };
  }
  async _ensureUserId(user_id) {
    if (user_id) {
      this.user_id = user_id;
      this.log(`✅ Using provided user ID: ${user_id}`);
      return {
        success: true,
        user_id: user_id
      };
    }
    if (this.user_id) {
      this.log(`✅ Using existing user ID: ${this.user_id}`);
      return {
        success: true,
        user_id: this.user_id
      };
    }
    this.log("🔑 No user ID found – attempting automatic registration...");
    const result = await this.reg();
    if (result.success) {
      this.user_id = result.user_id;
      this.log(`✅ Auto‑registration successful. User ID: ${this.user_id}`);
      return {
        success: true,
        user_id: this.user_id
      };
    }
    return result;
  }
  async reg(deviceId, pushToken = null) {
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      const payload = {
        device_id: deviceId || this.deviceId,
        push_token: pushToken,
        message_id: msgId
      };
      this.log("📡 Sending registration request...");
      const res = await axios.post(`${this.baseUrl}/register`, payload, {
        headers: this._headers(msgId, reqTime)
      });
      const user_id = res?.data?.user_id || "";
      this.log(`✅ Registration successful. User ID: ${user_id}`);
      return {
        success: true,
        user_id: user_id,
        data: res.data
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Registration error: ${error}`);
      return {
        success: false,
        error: error
      };
    }
  }
  async lyrics({
    prompt,
    user_id
  }) {
    if (!prompt) {
      return {
        success: false,
        error: "Missing required field: prompt"
      };
    }
    const ensure = await this._ensureUserId(user_id);
    if (!ensure.success) return ensure;
    const id = ensure.user_id;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      const payload = {
        task: "askai",
        content: prompt,
        messageId: msgId
      };
      this.log(`🎵 Generating lyrics for prompt: "${prompt.substring(0, 30)}..."`);
      const res = await axios.post(`${this.baseUrl}/lyrics/generate`, payload, {
        headers: this._headers(msgId, reqTime)
      });
      this.log("✅ Lyrics generated.");
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Lyrics generation failed: ${error}`);
      return {
        success: false,
        error: error,
        user_id: id
      };
    }
  }
  async generate({
    prompt,
    lyrics,
    user_id,
    mood,
    genre,
    has_vocal,
    vocal_gender,
    record_type,
    title,
    is_dual
  }) {
    if (!prompt && !lyrics) {
      return {
        success: false,
        error: "Either 'prompt' or 'lyrics' must be provided."
      };
    }
    const ensure = await this._ensureUserId(user_id);
    if (!ensure.success) return ensure;
    const id = ensure.user_id;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      const basePayload = {
        mood: mood || "Happy",
        genre: genre || "Pop",
        has_vocal: has_vocal ?? true,
        vocal_gender: vocal_gender || "random",
        record_type: record_type || "studio",
        is_dual_song_enabled: is_dual ?? true,
        message_id: msgId
      };
      let endpoint, payload;
      if (prompt) {
        endpoint = `/users/${id}/songs/prompt`;
        payload = {
          ...basePayload,
          prompt: prompt
        };
        this.log(`🎶 Creating song from prompt: "${prompt.substring(0, 30)}..."`);
      } else {
        endpoint = `/users/${id}/songs/lyrics`;
        payload = {
          ...basePayload,
          lyrics: lyrics,
          title: title || ""
        };
        this.log(`🎶 Creating song from provided lyrics (${lyrics.length} chars)...`);
      }
      const res = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
        headers: this._headers(msgId, reqTime)
      });
      this.log("✅ Song generation queued successfully.");
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Song generation failed: ${error}`);
      return {
        success: false,
        error: error,
        user_id: id
      };
    }
  }
  async status({
    job_id,
    user_id
  }) {
    if (!job_id) {
      return {
        success: false,
        error: "Missing required field: job_id"
      };
    }
    const ensure = await this._ensureUserId(user_id);
    if (!ensure.success) return ensure;
    const id = ensure.user_id;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`🔍 Fetching status for song ID: ${job_id}`);
      const res = await axios.get(`${this.baseUrl}/songs/${job_id}`, {
        headers: this._headers(msgId, reqTime)
      });
      this.log("✅ Song status retrieved.");
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Status fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        user_id: id
      };
    }
  }
  async info({
    user_id
  }) {
    const ensure = await this._ensureUserId(user_id);
    if (!ensure.success) return ensure;
    const id = ensure.user_id;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`ℹ️ Fetching user info for: ${id}`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/info`, {
        headers: this._headers(msgId, reqTime)
      });
      this.log("✅ User info retrieved.");
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Info fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        user_id: id
      };
    }
  }
  async playlist({
    user_id
  }) {
    const ensure = await this._ensureUserId(user_id);
    if (!ensure.success) return ensure;
    const id = ensure.user_id;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`📚 Fetching playlists for user: ${id}`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/playlists`, {
        headers: this._headers(msgId, reqTime)
      });
      this.log("✅ Playlists retrieved.");
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Playlist fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        user_id: id
      };
    }
  }
  async library({
    user_id,
    page = 1,
    limit = 90,
    sort_asc = false
  }) {
    const ensure = await this._ensureUserId(user_id);
    if (!ensure.success) return ensure;
    const id = ensure.user_id;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`📖 Fetching library for user: ${id} (page ${page}, limit ${limit})`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/library`, {
        params: {
          page: page,
          limit: limit,
          sortAsc: sort_asc ? "true" : "false"
        },
        headers: this._headers(msgId, reqTime)
      });
      this.log("✅ Library retrieved.");
      return {
        success: true,
        data: res.data,
        user_id: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Library fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        user_id: id
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["register", "lyrics", "generate", "status", "user_info", "playlist", "library"];
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
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new Soniva();
  try {
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
      case "lyrics":
        if (!payload.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi."
          });
        }
        response = await api.lyrics(payload);
        break;
      case "generate":
        if (!payload.prompt && !payload.lyrics) {
          return res.status(400).json({
            status: false,
            error: "Salah satu dari 'prompt' atau 'lyrics' harus diisi."
          });
        }
        response = await api.generate(payload);
        break;
      case "status":
        if (!payload.user_id) return res.status(400).json({
          status: false,
          error: "Parameter 'userId' wajib diisi."
        });
        if (!payload.job_id) return res.status(400).json({
          status: false,
          error: "Parameter 'songId' wajib diisi."
        });
        response = await api.status(payload);
        break;
      case "user_info":
        if (!payload.user_id) return res.status(400).json({
          status: false,
          error: "Parameter 'userId' wajib diisi."
        });
        response = await api.info(payload);
        break;
      case "playlist":
        if (!payload.user_id) return res.status(400).json({
          status: false,
          error: "Parameter 'userId' wajib diisi."
        });
        response = await api.playlist(payload);
        break;
      case "library":
        if (!payload.user_id) return res.status(400).json({
          status: false,
          error: "Parameter 'userId' wajib diisi."
        });
        payload.page = params.page ? parseInt(params.page, 10) : 1;
        payload.limit = params.limit ? parseInt(params.limit, 10) : 90;
        response = await api.library(payload);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server Soniva."
      });
    }
    return res.status(response.success === false ? 400 : 200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal.",
      error: error.message
    });
  }
}