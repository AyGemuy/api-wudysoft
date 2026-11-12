import axios from "axios";
import ApiKey from "@/configs/api-key";
const BASE_URL = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const DEFAULT_KEY = "d0b7f73c049d4f079d2c42e15f10568f:63a72d79d7744e33906c6fb0c048cb82";
const invalidKeys = new Set();
const tokenCache = new Map();
class Spotify {
  constructor() {
    const rawKeys = ApiKey?.spotify || DEFAULT_KEY;
    this.keys = Array.isArray(rawKeys) ? rawKeys.filter(Boolean) : rawKeys ? [rawKeys] : [DEFAULT_KEY];
    this.http = axios.create({
      baseURL: BASE_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "okhttp/4.12.0"
      },
      timeout: 15e3
    });
  }
  markInvalid(key) {
    if (typeof key !== "string" || !key) return;
    if (!invalidKeys.has(key)) {
      invalidKeys.add(key);
      console.warn(`[INVALID-KEY] Spotify Key di-blacklist (401): ${key.slice(0, 10)}...`);
    }
  }
  markRecovered(key) {
    if (typeof key !== "string" || !key) return;
    if (invalidKeys.has(key)) {
      invalidKeys.delete(key);
      console.log(`[RECOVERED] Spotify Key keluar dari blacklist: ${key.slice(0, 10)}...`);
    }
  }
  getAvailableKeys(customKey = "") {
    if (customKey && typeof customKey === "string" && customKey.trim()) {
      return [customKey.trim()];
    }
    return this.keys.filter(k => k && !invalidKeys.has(k));
  }
  async getAccessToken(rawKey) {
    const now = Date.now();
    const cached = tokenCache.get(rawKey);
    if (cached && now < cached.expiresAt - 6e4) {
      return cached.token;
    }
    const [clientId, clientSecret] = rawKey.split(":");
    if (!clientId || !clientSecret) {
      throw new Error("Format Spotify Key tidak valid. Format harus: 'clientId:clientSecret'");
    }
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString("base64");
    const {
      data
    } = await axios.post(TOKEN_URL, new URLSearchParams({
      grant_type: "client_credentials"
    }).toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authHeader}`
      },
      timeout: 1e4
    });
    if (!data?.access_token) {
      throw new Error("Gagal memperoleh access token dari Spotify API.");
    }
    tokenCache.set(rawKey, {
      token: data.access_token,
      expiresAt: now + (Number(data.expires_in) || 3600) * 1e3
    });
    return data.access_token;
  }
  async executeWithKey(endpoint, options = {}, keyOverride = "") {
    const keysToTry = this.getAvailableKeys(keyOverride);
    if (!keysToTry.length) {
      return {
        status: "error",
        message: "Semua Spotify API Key telah di-skip (401) atau tidak tersedia.",
        invalid_count: invalidKeys.size
      };
    }
    let lastErr;
    for (let i = 0; i < keysToTry.length; i++) {
      const currentKey = keysToTry[i];
      try {
        const token = await this.getAccessToken(currentKey);
        const {
          data
        } = await this.http({
          url: endpoint,
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
          }
        });
        this.markRecovered(currentKey);
        return {
          status: "success",
          key_used: currentKey.slice(0, 10) + "...",
          data: data
        };
      } catch (e) {
        lastErr = e;
        if (e.response?.status === 401) {
          this.markInvalid(currentKey);
          tokenCache.delete(currentKey);
          console.warn(`[SKIP-401 SPOTIFY] Key index ${i} gagal auth, mencoba key berikutnya...`);
          continue;
        }
        console.warn(`[RETRY SPOTIFY] Key index ${i} bermasalah: ${e.message}`);
      }
    }
    return {
      status: "error",
      message: lastErr?.response?.data?.error?.message || lastErr?.message || "Gagal memproses request ke Spotify."
    };
  }
  async search({
    q,
    query,
    type = "track",
    limit = 10,
    offset = 0,
    market = "ID",
    key = ""
  } = {}) {
    const searchQuery = q || query;
    const errors = [];
    if (!searchQuery) errors.push("query (atau q)");
    if (errors.length > 0) {
      return {
        status: "error",
        message: "Gagal memproses request. Komponen wajib hilang untuk action 'search'.",
        required: errors
      };
    }
    const cleanLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const cleanOffset = Number(offset) || 0;
    return await this.executeWithKey("/search", {
      params: {
        q: searchQuery,
        type: type,
        limit: cleanLimit,
        offset: cleanOffset,
        market: market
      }
    }, key);
  }
  async track({
    id,
    market = "ID",
    key = ""
  } = {}) {
    const errors = [];
    if (!id) errors.push("id (track id atau url)");
    if (errors.length > 0) {
      return {
        status: "error",
        message: "Gagal memproses request. Komponen wajib hilang untuk action 'track'.",
        required: errors
      };
    }
    const cleanId = String(id).replace(/.*track\//, "").split("?")[0].trim();
    return await this.executeWithKey(`/tracks/${cleanId}`, {
      params: {
        market: market
      }
    }, key);
  }
  async album({
    id,
    market = "ID",
    key = ""
  } = {}) {
    const errors = [];
    if (!id) errors.push("id (album id atau url)");
    if (errors.length > 0) {
      return {
        status: "error",
        message: "Gagal memproses request. Komponen wajib hilang untuk action 'album'.",
        required: errors
      };
    }
    const cleanId = String(id).replace(/.*album\//, "").split("?")[0].trim();
    return await this.executeWithKey(`/albums/${cleanId}`, {
      params: {
        market: market
      }
    }, key);
  }
  async artist({
    id,
    market = "ID",
    key = ""
  } = {}) {
    const errors = [];
    if (!id) errors.push("id (artist id atau url)");
    if (errors.length > 0) {
      return {
        status: "error",
        message: "Gagal memproses request. Komponen wajib hilang untuk action 'artist'.",
        required: errors
      };
    }
    const cleanId = String(id).replace(/.*artist\//, "").split("?")[0].trim();
    return await this.executeWithKey(`/artists/${cleanId}`, {
      params: {
        market: market
      }
    }, key);
  }
  async playlist({
    id,
    market = "ID",
    key = ""
  } = {}) {
    const errors = [];
    if (!id) errors.push("id (playlist id atau url)");
    if (errors.length > 0) {
      return {
        status: "error",
        message: "Gagal memproses request. Komponen wajib hilang untuk action 'playlist'.",
        required: errors
      };
    }
    const cleanId = String(id).replace(/.*playlist\//, "").split("?")[0].trim();
    return await this.executeWithKey(`/playlists/${cleanId}`, {
      params: {
        market: market
      }
    }, key);
  }
  async recommendations({
    seed_artists,
    seed_genres,
    seed_tracks,
    limit = 20,
    market = "ID",
    key = ""
  } = {}) {
    const errors = [];
    if (!seed_artists && !seed_genres && !seed_tracks) {
      errors.push("minimal salah satu dari: seed_artists, seed_genres, seed_tracks");
    }
    if (errors.length > 0) {
      return {
        status: "error",
        message: "Gagal memproses request. Komponen wajib hilang untuk action 'recommendations'.",
        required: errors
      };
    }
    const cleanLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return await this.executeWithKey("/recommendations", {
      params: {
        limit: cleanLimit,
        market: market,
        ...seed_artists ? {
          seed_artists: seed_artists
        } : {},
        ...seed_genres ? {
          seed_genres: seed_genres
        } : {},
        ...seed_tracks ? {
          seed_tracks: seed_tracks
        } : {}
      }
    }, key);
  }
  async status({
    key = ""
  } = {}) {
    const keys = this.getAvailableKeys(key);
    return {
      status: "success",
      available_keys_count: keys.length,
      invalid_keys_count: invalidKeys.size,
      active_key: keys[0] ? keys[0].slice(0, 10) + "..." : null
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "track", "album", "artist", "playlist", "recommendations", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib disertakan.",
      available_actions: validActions
    });
  }
  const api = new Spotify();
  try {
    let response;
    const customKey = params.key || params.api_key || "";
    switch (action.toLowerCase()) {
      case "search":
        response = await api.search({
          ...params,
          key: customKey
        });
        break;
      case "track":
        response = await api.track({
          ...params,
          key: customKey
        });
        break;
      case "album":
        response = await api.album({
          ...params,
          key: customKey
        });
        break;
      case "artist":
        response = await api.artist({
          ...params,
          key: customKey
        });
        break;
      case "playlist":
        response = await api.playlist({
          ...params,
          key: customKey
        });
        break;
      case "recommendations":
        response = await api.recommendations({
          ...params,
          key: customKey
        });
        break;
      case "status":
        response = await api.status({
          key: customKey
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Aksi '${action}' tidak dikenal.`,
          valid_actions: validActions
        });
    }
    if (response.status === "error") {
      return res.status(400).json({
        status: false,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Spotify Failure pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada struktur integrasi internal Spotify.",
      error: error.message || "Unknown Error"
    });
  }
}