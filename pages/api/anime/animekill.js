const axios = require("axios");
class AnimeKill {
  constructor() {
    this.baseURL = "https://apis.animekill.com";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "AnimeKill/2.0.0 (Dart)",
      version: "2.0.0",
      animeOrigin: "chinese",
      staticApiVersion: "2.0.0"
    };
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: this.headers
    });
  }
  async _req(method, endpoint, data = {}) {
    try {
      const config = {
        method: method,
        url: endpoint
      };
      if (method === "GET") config.params = data;
      else config.data = data;
      const res = await this.client(config);
      return res.data;
    } catch (e) {
      console.error(`[ERR] ${endpoint}:`, e.message);
      return null;
    }
  }
  async home() {
    return await this._req("GET", "/users/fetchHomePageAnimeTv");
  }
  async home_static() {
    return await this._req("GET", "/users/fetchHomeStatic");
  }
  async search({
    name,
    query
  }) {
    return await this._req("POST", "/users/fetchSearchResult", {
      name: name || query
    });
  }
  async detail({
    anime_id
  }) {
    return await this._req("POST", "/users/fetchDescription", {
      animeId: anime_id
    });
  }
  async episodes({
    anime_id,
    order = "asc"
  }) {
    return await this._req("POST", "/users/fetchVideos", {
      animeId: anime_id,
      order: order
    });
  }
  async stream({
    anime_id,
    ep_num
  }) {
    return await this._req("POST", "/dashboard/getEpisodeFromParser", {
      animeId: anime_id,
      episodeNumber: ep_num
    });
  }
  async comments({
    anime_id,
    offset = 0
  }) {
    return await this._req("POST", "/users/fetchAnimeComments", {
      animeId: anime_id,
      offset: offset
    });
  }
  async by_genre({
    genre,
    offset = 0
  }) {
    return await this._req("POST", "/users/fetchAnimeUsingGenre", {
      genre: genre,
      recordOffset: offset
    });
  }
  async genres() {
    return await this._req("GET", "/users/fetchGenres");
  }
  async schedule() {
    return await this._req("GET", "/users/fetchSchduleWiseAnime");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "home_static", "search", "detail", "episodes", "stream", "comments", "by_genre", "genres", "schedule"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          home_static: "/?action=home_static",
          search: "/?action=search&query=naruto",
          detail: "/?action=detail&anime_id=123",
          episodes: "/?action=episodes&anime_id=123&order=asc",
          stream: "/?action=stream&anime_id=123&ep_num=1",
          comments: "/?action=comments&anime_id=123&offset=0",
          by_genre: "/?action=by_genre&genre=action&offset=0",
          genres: "/?action=genres",
          schedule: "/?action=schedule"
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
  const api = new AnimeKill();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "home_static":
        response = await api.home_static();
        break;
      case "genres":
        response = await api.genres();
        break;
      case "schedule":
        response = await api.schedule();
        break;
      case "search":
        if (!params.query && !params.name) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=naruto"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.anime_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'anime_id' wajib diisi untuk action 'detail'.",
            example: "/?action=detail&anime_id=123"
          });
        }
        response = await api.detail(params);
        break;
      case "episodes":
        if (!params.anime_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'anime_id' wajib diisi untuk action 'episodes'.",
            example: "/?action=episodes&anime_id=123&order=asc"
          });
        }
        response = await api.episodes(params);
        break;
      case "comments":
        if (!params.anime_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'anime_id' wajib diisi untuk action 'comments'.",
            example: "/?action=comments&anime_id=123&offset=0"
          });
        }
        response = await api.comments(params);
        break;
      case "stream":
        if (!params.anime_id || !params.ep_num) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'anime_id' dan 'ep_num' wajib diisi untuk action 'stream'.",
            example: "/?action=stream&anime_id=123&ep_num=1"
          });
        }
        response = await api.stream(params);
        break;
      case "by_genre":
        if (!params.genre) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'genre' wajib diisi untuk action 'by_genre'.",
            example: "/?action=by_genre&genre=action&offset=0"
          });
        }
        response = await api.by_genre(params);
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
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}