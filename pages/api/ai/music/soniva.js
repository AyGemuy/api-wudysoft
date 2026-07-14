import axios from "axios";
import crypto from "crypto";
class Soniva {
  constructor() {
    this.userId = "";
    this.deviceId = this.uid();
    this.baseUrl = "https://api.sonivamusic.com/musicai/v1";
    this.ua = "SonivaMusic/1.5.2 (build:115; Android 15; realme RMX3890)";
    this.log = console.log;
  }
  uid() {
    return crypto.randomUUID();
  }
  _sg(deviceId, messageId, requestTime) {
    const J_KB = [9, -68, 74, 103, -109, 76, 23, -83, -95, -36, 42, 35, 77, 77, 59, 59, 16, -117, 112, 47, -109, 65, -74, -86, 60, -100, 22, 87, 22, 46, -78, 86, -34, -5, -56, -124, 31, 57, 72, 117, -22, -50, -92, 93, 29, 125, -11, 126, -13, 40, 51, -94, -69, -79, 17, -109, 25, 33, 100, -115, 27, 127, -47, 78];
    const DP1 = Uint8Array.from([94, 86, 68, 22, 67, 88, 1, 95, 13, 82, 30, 72, 8, 8, 91, 1]);
    const DP2 = Uint8Array.from([94, 81, 94, 10, 92, 28, 71, 87, 78, 2, 9, 10, 72, 14, 92, 27, 92, 14, 4, 15]);
    const EKB = J_KB.map(val => val < 0 ? 256 + val : val);
    const xor = inputBytes => {
      const key = Buffer.from("3a1c2ou68jox9dlj3v", "utf-8");
      const output = Buffer.alloc(inputBytes.length);
      for (let i = 0; i < inputBytes.length; i++) {
        output[i] = inputBytes[i] ^ key[i % key.length];
      }
      return output;
    };
    const dec = encryptedBytes => {
      const length = encryptedBytes.length;
      const xorParam1Decrypted = xor(DP1);
      const xorParam2Decrypted = xor(DP2);
      const stringForHash = xorParam1Decrypted.toString("utf-8") + xorParam2Decrypted.toString("utf-8") + "com.sonivamusic.ai";
      const hash = crypto.createHash("sha512").update(Buffer.from(stringForHash, "utf-8")).digest();
      const hashSlice = hash.slice(0, length);
      const result = Buffer.alloc(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        result[i] = encryptedBytes[i] ^ hashSlice[i];
      }
      return result;
    };
    const gDSP = () => {
      const part1 = xor([112, 49, 100, 47, 2, 63, 58, 71]).toString("utf-8");
      const part2 = xor([105, 88, 83, 59, 118, 11, 54, 80]).toString("utf-8");
      return part1 + part2;
    };
    const s2s = messageId + gDSP() + deviceId + requestTime;
    const sKey = dec(EKB);
    const mac = crypto.createHmac("sha256", sKey);
    return mac.update(Buffer.from(s2s, "utf-8")).digest("base64");
  }
  _hd(msgId, reqTime) {
    return {
      "User-Agent": this.ua,
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-signature-id": this._sg(this.deviceId, msgId, reqTime),
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
  async _esId(userId) {
    if (userId) {
      this.userId = userId;
      this.log(`✅ Using provided user ID: ${userId}`);
      return {
        success: true,
        userId: userId
      };
    }
    if (this.userId) {
      this.log(`✅ Using existing user ID: ${this.userId}`);
      return {
        success: true,
        userId: this.userId
      };
    }
    this.log("🔑 No user ID found – attempting automatic registration...");
    const result = await this.reg();
    if (result.success) {
      this.userId = result.userId;
      this.log(`✅ Auto‑registration successful. User ID: ${this.userId}`);
      return {
        success: true,
        userId: this.userId
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
        headers: this._hd(msgId, reqTime)
      });
      const userId = res?.data?.user_id || "";
      this.log(`✅ Registration successful. User ID: ${userId}`);
      return {
        success: true,
        userId: userId,
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
    userId
  }) {
    if (!prompt) {
      return {
        success: false,
        error: "Missing required field: prompt"
      };
    }
    const ensure = await this._esId(userId);
    if (!ensure.success) return ensure;
    const id = ensure.userId;
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
        headers: this._hd(msgId, reqTime)
      });
      this.log("✅ Lyrics generated.");
      return {
        success: true,
        data: res.data,
        userId: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Lyrics generation failed: ${error}`);
      return {
        success: false,
        error: error,
        userId: id
      };
    }
  }
  async generate({
    prompt,
    lyrics,
    userId,
    mood,
    genre,
    hasVocal,
    vocalGender,
    recordType,
    title,
    isDual
  }) {
    if (!prompt && !lyrics) {
      return {
        success: false,
        error: "Either 'prompt' or 'lyrics' must be provided."
      };
    }
    const ensure = await this._esId(userId);
    if (!ensure.success) return ensure;
    const id = ensure.userId;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      const basePayload = {
        mood: mood || "Happy",
        genre: genre || "Pop",
        has_vocal: hasVocal ?? true,
        vocal_gender: vocalGender || "random",
        record_type: recordType || "studio",
        is_dual_song_enabled: isDual ?? true,
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
        headers: this._hd(msgId, reqTime)
      });
      this.log("✅ Song generation queued successfully.");
      return {
        success: true,
        data: res.data,
        userId: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Song generation failed: ${error}`);
      return {
        success: false,
        error: error,
        userId: id
      };
    }
  }
  async status({
    songId,
    userId
  }) {
    if (!songId) {
      return {
        success: false,
        error: "Missing required field: songId"
      };
    }
    const ensure = await this._esId(userId);
    if (!ensure.success) return ensure;
    const id = ensure.userId;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`🔍 Fetching status for song ID: ${songId}`);
      const res = await axios.get(`${this.baseUrl}/songs/${songId}`, {
        headers: this._hd(msgId, reqTime)
      });
      this.log("✅ Song status retrieved.");
      return {
        success: true,
        data: res.data,
        userId: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Status fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        userId: id
      };
    }
  }
  async user_info({
    userId
  }) {
    const ensure = await this._esId(userId);
    if (!ensure.success) return ensure;
    const id = ensure.userId;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`ℹ️ Fetching user info for: ${id}`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/info`, {
        headers: this._hd(msgId, reqTime)
      });
      this.log("✅ User info retrieved.");
      return {
        success: true,
        data: res.data,
        userId: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Info fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        userId: id
      };
    }
  }
  async playlist({
    userId
  }) {
    const ensure = await this._esId(userId);
    if (!ensure.success) return ensure;
    const id = ensure.userId;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`📚 Fetching playlists for user: ${id}`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/playlists`, {
        headers: this._hd(msgId, reqTime)
      });
      this.log("✅ Playlists retrieved.");
      return {
        success: true,
        data: res.data,
        userId: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Playlist fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        userId: id
      };
    }
  }
  async library({
    userId,
    page = 1,
    limit = 90,
    sortAsc = false
  }) {
    const ensure = await this._esId(userId);
    if (!ensure.success) return ensure;
    const id = ensure.userId;
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      this.log(`📖 Fetching library for user: ${id} (page ${page}, limit ${limit})`);
      const res = await axios.get(`${this.baseUrl}/users/${id}/library`, {
        params: {
          page: page,
          limit: limit,
          sortAsc: sortAsc ? "true" : "false"
        },
        headers: this._hd(msgId, reqTime)
      });
      this.log("✅ Library retrieved.");
      return {
        success: true,
        data: res.data,
        userId: id
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Library fetch failed: ${error}`);
      return {
        success: false,
        error: error,
        userId: id
      };
    }
  }
  async explore({
    type = "clips",
    page = 1,
    limit = 160,
    range
  }) {
    try {
      const msgId = this.uid();
      const reqTime = Date.now().toString();
      const params = {
        page: page,
        limit: limit
      };
      if (type === "popular") params.range = range || "alltime";
      if (type === "trending") params.range = range || "weekly";
      this.log(`🌐 Exploring ${type} (page ${page}, limit ${limit})...`);
      const res = await axios.get(`${this.baseUrl}/explore/${type}`, {
        params: params,
        headers: this._hd(msgId, reqTime)
      });
      this.log(`✅ Explore ${type} retrieved.`);
      return {
        success: true,
        data: res.data
      };
    } catch (err) {
      const error = err?.response?.data || err.message;
      this.log(`❌ Explore ${type} failed: ${error}`);
      return {
        success: false,
        error: error
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["register", "lyrics", "generate", "status", "user_info", "playlist", "library", "explore"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          register: "/?action=register",
          lyrics: "/?action=lyrics&prompt=lirik+tentang+cinta",
          generate: "/?action=generate&prompt=song+description",
          status: "/?action=status&songId=SONG_ID",
          user_info: "/?action=user_info&userId=USER_ID",
          playlist: "/?action=playlist&userId=USER_ID",
          library: "/?action=library&userId=USER_ID&page=1&limit=90",
          explore: "/?action=explore&type=trending&page=1&limit=20"
        }
      }
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
    switch (action) {
      case "register":
        response = await api.reg(params.deviceId, params.pushToken);
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk membuat lirik."
          });
        }
        response = await api.lyrics(params);
        break;
      case "generate":
        if (!params.prompt && !params.lyrics) {
          return res.status(400).json({
            status: false,
            error: "Salah satu dari parameter 'prompt' atau 'lyrics' harus diisi."
          });
        }
        if (params.hasVocal !== undefined) params.hasVocal = params.hasVocal === true || params.hasVocal === "true";
        if (params.isDual !== undefined) params.isDual = params.isDual === true || params.isDual === "true";
        response = await api.generate(params);
        break;
      case "status":
        if (!params.userId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'userId' wajib diisi."
          });
        }
        if (!params.songId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'songId' wajib diisi."
          });
        }
        response = await api.status(params);
        break;
      case "user_info":
        if (!params.userId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'userId' wajib diisi."
          });
        }
        response = await api.user_info(params);
        break;
      case "playlist":
        if (!params.userId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'userId' wajib diisi."
          });
        }
        response = await api.playlist(params);
        break;
      case "library":
        if (params.page) params.page = parseInt(params.page, 10);
        if (params.limit) params.limit = parseInt(params.limit, 10);
        if (params.sortAsc !== undefined) params.sortAsc = params.sortAsc === true || params.sortAsc === "true";
        response = await api.library(params);
        break;
      case "explore":
        if (params.page) params.page = parseInt(params.page, 10);
        if (params.limit) params.limit = parseInt(params.limit, 10);
        response = await api.explore(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server Soniva. Coba lagi nanti."
      });
    }
    if (response.success === false) {
      return res.status(400).json({
        action: action,
        ...response
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
      message: "Terjadi kesalahan internal pada server api.",
      error: error.message || "Unknown Error"
    });
  }
}