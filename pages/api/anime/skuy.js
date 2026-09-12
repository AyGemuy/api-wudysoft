import axios from "axios";
import crypto from "crypto";
class SkuyAPI {
  constructor() {
    this.baseUrl = "https://api.skuy.co.id";
    this.playUrl = "https://play.skuy.co.id";
    this.deviceId = this.generateDeviceId();
    this.accessToken = null;
    this.qualityToken = null;
    this.headers = {
      "User-Agent": "SkuyApp-Android",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip",
      "x-client-type": "mobile",
      "x-device-id": this.deviceId
    };
  }
  generateDeviceId() {
    return crypto.randomBytes(8).toString("hex");
  }
  async req(endpoint, method = "GET", data = null, useAuth = true) {
    try {
      if (useAuth && !this.accessToken) {
        await this.guestLogin();
      }
      const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
      console.log(`[LOG] ${method} ${url}`);
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers
        },
        timeout: 6e4
      };
      if (useAuth && this.accessToken) {
        config.headers["authorization"] = `Bearer ${this.accessToken}`;
      }
      if (method === "POST" && data) {
        config.data = data;
        config.headers["Content-Type"] = "application/json";
      }
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`[ERROR] Request Failed [${endpoint}]: ${error.message}`);
      throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
    }
  }
  async guestLogin() {
    try {
      console.log(`[LOG] Guest Login with deviceId: ${this.deviceId}`);
      const response = await this.req("/api/auth/guest-login", "POST", {
        deviceId: this.deviceId
      }, false);
      if (response.accessToken) {
        this.accessToken = response.accessToken;
        console.log(`[LOG] Login Success: ${response.user.username}`);
        return {
          success: true,
          accessToken: response.accessToken,
          user: response.user
        };
      }
      throw new Error("Login failed: No access token");
    } catch (error) {
      console.error("[ERROR] Guest Login:", error.message);
      throw error;
    }
  }
  async spotlight() {
    try {
      const data = await this.req("/api/anime/spotlight");
      console.log(`[LOG] Spotlight: Found ${data.length} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Spotlight:", error.message);
      return [];
    }
  }
  async genres() {
    try {
      const data = await this.req("/api/anime/genres");
      console.log(`[LOG] Genres: Found ${data.genres?.length || 0} items`);
      return data.genres || [];
    } catch (error) {
      console.error("[ERROR] Genres:", error.message);
      return [];
    }
  }
  async latestUpdate({
    page = 1,
    limit = 20,
    origin = "jp"
  } = {}) {
    try {
      const data = await this.req(`/api/anime/latest-update?page=${page}&limit=${limit}&origin=${origin}`);
      console.log(`[LOG] Latest Update: Found ${data.anime?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Latest Update:", error.message);
      return {
        anime: []
      };
    }
  }
  async popular({
    page = 1,
    limit = 20,
    origin = "jp"
  } = {}) {
    try {
      const data = await this.req(`/api/anime/popular?page=${page}&limit=${limit}&origin=${origin}`);
      console.log(`[LOG] Popular: Found ${data.anime?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Popular:", error.message);
      return {
        anime: []
      };
    }
  }
  async upcoming({
    page = 1,
    limit = 20
  } = {}) {
    try {
      const data = await this.req(`/api/anime/upcoming?page=${page}&limit=${limit}`);
      console.log(`[LOG] Upcoming: Found ${data.anime?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Upcoming:", error.message);
      return {
        anime: []
      };
    }
  }
  async shortDrama({
    page = 1,
    limit = 20
  } = {}) {
    try {
      const data = await this.req(`/api/anime/short-drama?page=${page}&limit=${limit}`);
      console.log(`[LOG] Short Drama: Found ${data.anime?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Short Drama:", error.message);
      return {
        anime: []
      };
    }
  }
  async movies({
    page = 1,
    limit = 20
  } = {}) {
    try {
      const data = await this.req(`/api/movies?page=${page}&limit=${limit}`);
      console.log(`[LOG] Movies: Found ${data.movies?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Movies:", error.message);
      return {
        success: false,
        movies: []
      };
    }
  }
  async mangaPopular({
    page = 1,
    perPage = 20
  } = {}) {
    try {
      const data = await this.req(`/api/manga/popular?page=${page}&perPage=${perPage}`);
      console.log(`[LOG] Manga Popular: Found ${data.data?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Manga Popular:", error.message);
      return {
        success: false,
        data: []
      };
    }
  }
  async search({
    query,
    limit = 50
  } = {}) {
    try {
      if (!query) throw new Error("Query is required");
      const data = await this.req(`/api/search/meilisearch?q=${encodeURIComponent(query)}&limit=${limit}`);
      console.log(`[LOG] Search: Found ${data.data?.length || 0} results for "${query}"`);
      return data;
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        data: []
      };
    }
  }
  async searchManga({
    query,
    limit = 50
  } = {}) {
    try {
      if (!query) throw new Error("Query is required");
      const data = await this.req(`/api/manga/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      console.log(`[LOG] Manga Search: Found results for "${query}"`);
      return data;
    } catch (error) {
      console.error("[ERROR] Manga Search:", error.message);
      return {
        data: []
      };
    }
  }
  async animeDetail({
    animeId
  }) {
    try {
      if (!animeId) throw new Error("animeId is required");
      const data = await this.req(`/api/anime/${animeId}`);
      console.log(`[LOG] Anime Detail: ${data.bookName || animeId}`);
      return data;
    } catch (error) {
      console.error("[ERROR] Anime Detail:", error.message);
      throw error;
    }
  }
  async animeEpisodes({
    animeId,
    page = 1,
    limit = 24
  } = {}) {
    try {
      if (!animeId) throw new Error("animeId is required");
      const data = await this.req(`/api/anime-episodes/${animeId}?page=${page}&limit=${limit}`);
      console.log(`[LOG] Episodes: Found ${data.episodes?.length || 0} episodes`);
      return data;
    } catch (error) {
      console.error("[ERROR] Anime Episodes:", error.message);
      return {
        episodes: [],
        total: 0
      };
    }
  }
  async autoFetchMedia({
    animeId,
    episodeId
  }) {
    try {
      if (!animeId || !episodeId) {
        throw new Error("animeId and episodeId are required");
      }
      const data = await this.req("/api/media/auto-fetch", "POST", {
        animeId: animeId,
        episodeId: episodeId
      });
      console.log(`[LOG] Auto Fetch: ${data.message}`);
      return data;
    } catch (error) {
      console.error("[ERROR] Auto Fetch Media:", error.message);
      return {
        success: false
      };
    }
  }
  async getQualityToken({
    contentId,
    contentType = "anime",
    quality = "sd"
  } = {}) {
    try {
      if (!contentId) throw new Error("contentId is required");
      const data = await this.req("/api/auth/quality-token", "POST", {
        contentId: contentId,
        contentType: contentType,
        quality: quality
      });
      if (data.token) {
        this.qualityToken = data.token;
        console.log(`[LOG] Quality Token obtained for ${contentId}`);
      }
      return data;
    } catch (error) {
      console.error("[ERROR] Quality Token:", error.message);
      throw error;
    }
  }
  async refreshToken({
    key,
    contentType = "anime",
    qualityToken = null
  } = {}) {
    try {
      if (!key) throw new Error("key (s3_key) is required");
      const token = qualityToken || this.qualityToken;
      if (!token) {
        throw new Error("Quality token not found. Call getQualityToken() first");
      }
      const data = await this.req("/api/refresh-token", "POST", {
        key: key,
        contentType: contentType,
        sessionId: "",
        qualityToken: token,
        mobile: "skuy-app"
      });
      console.log(`[LOG] Refresh Token: URL obtained`);
      return data;
    } catch (error) {
      console.error("[ERROR] Refresh Token:", error.message);
      throw error;
    }
  }
  async getSubtitles({
    s3Key
  }) {
    try {
      if (!s3Key) throw new Error("s3Key is required");
      const url = `${this.baseUrl}/subtitles/${s3Key}?t=${Date.now()}`;
      const config = {
        method: "GET",
        url: url,
        headers: {
          ...this.headers,
          Accept: "text/vtt, text/plain, */*",
          "cache-control": "no-cache",
          authorization: `Bearer ${this.accessToken}`
        }
      };
      const response = await axios(config);
      console.log(`[LOG] Subtitles downloaded: ${s3Key}`);
      return response.data;
    } catch (error) {
      console.error("[ERROR] Get Subtitles:", error.message);
      throw error;
    }
  }
  async getEpisodeStream({
    animeId,
    episodeNumber,
    quality = "sd"
  } = {}) {
    try {
      console.log(`[LOG] Getting stream for ${animeId} episode ${episodeNumber}`);
      const detail = await this.animeDetail({
        animeId: animeId
      });
      const episodesData = await this.animeEpisodes({
        animeId: animeId
      });
      const episode = episodesData.episodes.find(ep => ep.episodeNumber === parseInt(episodeNumber));
      if (!episode) {
        throw new Error(`Episode ${episodeNumber} not found`);
      }
      await this.autoFetchMedia({
        animeId: animeId,
        episodeId: episodeNumber.toString()
      });
      const qualityData = await this.getQualityToken({
        contentId: animeId,
        contentType: "anime",
        quality: quality
      });
      const qualityMap = {
        sd: episode.s3Key_sd || episode.s3_keys?.["360p"],
        hd: episode.s3Key_hd || episode.s3_keys?.["720p"],
        fhd: episode.s3Key || episode.s3_keys?.["1080p"]
      };
      const s3Key = qualityMap[quality] || episode.s3Key_sd;
      const streamData = await this.refreshToken({
        key: s3Key,
        contentType: "anime",
        qualityToken: qualityData.token
      });
      let subtitles = [];
      if (episode.subtitles && episode.subtitles.length > 0) {
        for (const sub of episode.subtitles) {
          try {
            const subContent = await this.getSubtitles({
              s3Key: sub.s3_key
            });
            subtitles.push({
              ...sub,
              content: subContent
            });
          } catch (e) {
            console.warn(`[WARN] Failed to get subtitle: ${sub.lang}`);
          }
        }
      }
      return {
        success: true,
        anime: {
          id: detail.bookId,
          name: detail.bookName,
          cover: detail.coverUrl
        },
        episode: {
          number: episode.episodeNumber,
          title: episode.episodeTitle || episode.title,
          thumbnail: episode.thumbnail,
          duration: episode.s3_durations
        },
        stream: {
          url: streamData.url,
          quality: quality,
          expires: streamData.expires,
          available_qualities: episode.s3_keys
        },
        subtitles: subtitles
      };
    } catch (error) {
      console.error("[ERROR] Get Episode Stream:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["login", "spotlight", "genres", "latest", "popular", "upcoming", "short_drama", "movies", "manga_popular", "search", "search_manga", "anime_detail", "episodes", "stream"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/skuy?action=search&query=one piece"
      }
    });
  }
  const api = new SkuyAPI();
  try {
    let response;
    switch (action) {
      case "login":
        response = await api.guestLogin();
        break;
      case "spotlight":
        response = await api.spotlight();
        break;
      case "genres":
        response = await api.genres();
        break;
      case "latest":
        response = await api.latestUpdate(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "upcoming":
        response = await api.upcoming(params);
        break;
      case "short_drama":
        response = await api.shortDrama(params);
        break;
      case "movies":
        response = await api.movies(params);
        break;
      case "manga_popular":
        response = await api.mangaPopular(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "search_manga":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search_manga'."
          });
        }
        response = await api.searchManga(params);
        break;
      case "anime_detail":
        if (!params.animeId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'animeId' wajib diisi untuk action 'anime_detail'.",
            example: "girl-meets-girl"
          });
        }
        response = await api.animeDetail(params);
        break;
      case "episodes":
        if (!params.animeId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'animeId' wajib diisi untuk action 'episodes'."
          });
        }
        response = await api.animeEpisodes(params);
        break;
      case "stream":
        if (!params.animeId || !params.episodeNumber) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'animeId' dan 'episodeNumber' wajib diisi untuk action 'stream'.",
            example: {
              animeId: "girl-meets-girl",
              episodeNumber: 1,
              quality: "sd"
            }
          });
        }
        response = await api.getEpisodeStream(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}