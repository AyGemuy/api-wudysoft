import axios from "axios";
import ApiKey from "@/configs/api-key";
class TMDB {
  constructor() {
    this.apiKeys = ApiKey.tmdb;
    this.keyIndex = 0;
    this.baseUrl = "https://api.themoviedb.org/3";
    this.language = "pt-BR";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json",
        "Accept-Encoding": "gzip"
      }
    });
  }
  _getKey() {
    return this.apiKeys[this.keyIndex];
  }
  _rotateKey() {
    const oldKey = this._getKey();
    this.keyIndex = (this.keyIndex + 1) % this.apiKeys.length;
    console.log(`[TMDB] Rotate Key: ${oldKey.slice(0, 5)}*** -> ${this._getKey().slice(0, 5)}***`);
  }
  async _req(path, params = {}, attempt = 1) {
    try {
      const currentKey = this._getKey();
      console.log(`[TMDB] GET ${path} (Attempt ${attempt}/${this.apiKeys.length})`);
      const {
        data
      } = await this.client.get(path, {
        params: {
          api_key: currentKey,
          language: this.language,
          ...params
        }
      });
      console.log(`[TMDB] OK ${path}`);
      return data;
    } catch (err) {
      console.log(`[TMDB] FAILED ${path} (Attempt ${attempt}):`, err.message);
      if (attempt < this.apiKeys.length) {
        this._rotateKey();
        return await this._req(path, params, attempt + 1);
      }
      console.log(`[TMDB] ERROR ${path}: Semua API Key habis.`);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async _url(type, id, s = 1, e = 1) {
    try {
      return type === "tv" ? `https://vidsrcme.ru/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrcme.ru/embed/movie?tmdb=${id}`;
    } catch (err) {
      console.log("[TMDB] ERROR _url:", err.message);
      return null;
    }
  }
  async _rich(results, defaultType, {
    detail,
    stream
  }) {
    if (!results || !Array.isArray(results)) return [];
    if (!detail && !stream) return results;
    console.log(`[TMDB] Auto enriching ${results.length} items...`);
    const enriched = [];
    for (const item of results) {
      try {
        const type = item.media_type || defaultType;
        let enrichedItem = {
          ...item
        };
        if (detail) {
          const resDetail = await this._req(`/${type}/${item.id}`, {
            append_to_response: "videos,images,credits,similar,recommendations"
          });
          enrichedItem.detail = resDetail?.error ? null : resDetail;
        }
        if (stream) {
          if (type === "movie") {
            enrichedItem.streamUrl = await this._url("movie", item.id);
          } else if (type === "tv") {
            const tvInfo = enrichedItem.detail || await this._req(`/tv/${item.id}`);
            if (tvInfo && !tvInfo.error && tvInfo.seasons) {
              enrichedItem.seasons = [];
              for (const s of tvInfo.seasons) {
                if (s.season_number === 0) continue;
                console.log(`[TMDB] Fetching TV Season Details: id=${item.id} S=${s.season_number}`);
                const seasonData = await this._req(`/tv/${item.id}/season/${s.season_number}`);
                if (seasonData && !seasonData.error && seasonData.episodes) {
                  const episodesWithStream = [];
                  for (const e of seasonData.episodes) {
                    episodesWithStream.push({
                      ...e,
                      streamUrl: await this._url("tv", item.id, s.season_number, e.episode_number)
                    });
                  }
                  enrichedItem.seasons.push({
                    ...seasonData,
                    episodes: episodesWithStream
                  });
                }
              }
            }
          }
        }
        enriched.push(enrichedItem);
      } catch (err) {
        console.log("[TMDB] ERROR _rich item:", err.message);
        enriched.push(item);
      }
    }
    return enriched;
  }
  async search({
    query,
    limit = 5,
    type = "multi",
    detail = false,
    stream = false,
    ...rest
  } = {}) {
    try {
      if (!query) return {
        error: true,
        message: "query wajib diisi"
      };
      const data = await this._req(`/search/${type}`, {
        query: query,
        ...rest
      });
      if (data?.error) return data;
      const clipped = (data.results || []).slice(0, limit);
      const results = await this._rich(clipped, type === "multi" ? "movie" : type, {
        detail: detail,
        stream: stream
      });
      return {
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
        results: results
      };
    } catch (err) {
      console.log("[TMDB] ERROR search:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async home({
    query,
    limit = 5,
    type = "tv",
    detail = false,
    stream = false,
    ...rest
  } = {}) {
    try {
      const path = query ? `/discover/${type}` : `/trending/${type}/day`;
      const data = await this._req(path, rest);
      if (data?.error) return data;
      const clipped = (data.results || []).slice(0, limit);
      const results = await this._rich(clipped, type, {
        detail: detail,
        stream: stream
      });
      return {
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
        results: results
      };
    } catch (err) {
      console.log("[TMDB] ERROR home:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async discover({
    type = "movie",
    limit = 20,
    detail = false,
    stream = false,
    ...rest
  } = {}) {
    try {
      const data = await this._req(`/discover/${type}`, rest);
      if (data?.error) return data;
      const clipped = (data.results || []).slice(0, limit);
      const results = await this._rich(clipped, type, {
        detail: detail,
        stream: stream
      });
      return {
        ...data,
        results: results
      };
    } catch (err) {
      console.log("[TMDB] ERROR discover:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async trending({
    type = "all",
    window = "day",
    limit = 20,
    detail = false,
    stream = false,
    ...rest
  } = {}) {
    try {
      const data = await this._req(`/trending/${type}/${window}`, rest);
      if (data?.error) return data;
      const clipped = (data.results || []).slice(0, limit);
      const results = await this._rich(clipped, type, {
        detail: detail,
        stream: stream
      });
      return {
        ...data,
        results: results
      };
    } catch (err) {
      console.log("[TMDB] ERROR trending:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async detail({
    id,
    type = "movie",
    append = "videos,images,credits,similar,recommendations",
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      return await this._req(`/${type}/${id}`, {
        append_to_response: append,
        ...rest
      });
    } catch (err) {
      console.log("[TMDB] ERROR detail:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async credits({
    id,
    type = "movie",
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      return await this._req(`/${type}/${id}/credits`, rest);
    } catch (err) {
      console.log("[TMDB] ERROR credits:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async videos({
    id,
    type = "movie",
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      return await this._req(`/${type}/${id}/videos`, rest);
    } catch (err) {
      console.log("[TMDB] ERROR videos:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async images({
    id,
    type = "movie",
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      return await this._req(`/${type}/${id}/images`, rest);
    } catch (err) {
      console.log("[TMDB] ERROR images:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async similar({
    id,
    type = "movie",
    limit = 10,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      const data = await this._req(`/${type}/${id}/similar`, rest);
      if (data?.error) return data;
      return {
        ...data,
        results: (data.results || []).slice(0, limit)
      };
    } catch (err) {
      console.log("[TMDB] ERROR similar:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async recommend({
    id,
    type = "movie",
    limit = 10,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      const data = await this._req(`/${type}/${id}/recommendations`, rest);
      if (data?.error) return data;
      return {
        ...data,
        results: (data.results || []).slice(0, limit)
      };
    } catch (err) {
      console.log("[TMDB] ERROR recommend:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async season({
    id,
    season = 1,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      return await this._req(`/tv/${id}/season/${season}`, rest);
    } catch (err) {
      console.log("[TMDB] ERROR season:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async episode({
    id,
    season = 1,
    episode = 1,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      return await this._req(`/tv/${id}/season/${season}/episode/${episode}`, rest);
    } catch (err) {
      console.log("[TMDB] ERROR episode:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
  async stream({
    id,
    type = "movie",
    season = 1,
    episode = 1
  } = {}) {
    try {
      if (!id) return {
        error: true,
        message: "id wajib diisi"
      };
      const url = await this._url(type, id, season, episode);
      return {
        id: id,
        type: type,
        streamUrl: url
      };
    } catch (err) {
      console.log("[TMDB] ERROR stream:", err.message);
      return {
        error: true,
        message: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "home", "discover", "trending", "detail", "stream"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/tmdb?action=home&type=movie",
          search: "/tmdb?action=search&query=avengers&detail=true",
          stream: "/tmdb?action=stream&type=tv&id=1399&season=1&episode=1"
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
  const api = new TMDB();
  const parseBool = val => val === true || val === "true";
  if (params.detail !== undefined) params.detail = parseBool(params.detail);
  if (params.stream !== undefined) params.stream = parseBool(params.stream);
  if (params.limit) params.limit = parseInt(params.limit, 10);
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "home":
        response = await api.home(params);
        break;
      case "discover":
        response = await api.discover(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk melihat detail."
          });
        }
        response = await api.detail(params);
        break;
      case "stream":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk mendapatkan stream link."
          });
        }
        response = await api.stream(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (response?.error) {
      return res.status(500).json({
        status: false,
        action: action,
        message: response.message || "Gagal mengambil data dari TMDB."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server api wrapper.",
      error: error.message || "Unknown Error"
    });
  }
}