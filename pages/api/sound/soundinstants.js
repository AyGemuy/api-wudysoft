import axios from "axios";
class SoundInstantsAPI {
  constructor() {
    this._bUrl = "https://api.soundinstants.com";
    this._sugUrl = "https://suggest.soundinstants.com";
    this._cli = axios.create({
      baseURL: this._bUrl,
      headers: {
        "User-Agent": "Dart/3.2 (dart:io)",
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-pvh-api-key": "LeeSunChe@12345$TaoCungChoi%CoNguoiYeu#TaoCungTan",
        "x-app-version": "1.0.12+12"
      },
      timeout: 6e4
    });
  }
  async _req(cfg = {}) {
    try {
      console.log(`[LOG] ${cfg.method || "GET"} -> ${cfg.url}`);
      const res = await this._cli(cfg);
      return res.data;
    } catch (err) {
      const errData = err?.response?.data;
      const msg = errData?.message || errData?.error || err?.message || "Request failed";
      console.error(`[LOG ERROR] ${cfg.method || "GET"} ${cfg.url} -> ${msg}`);
      return errData || {
        error: msg
      };
    }
  }
  async trending({
    country = "",
    page = 1,
    limit = 20
  }) {
    try {
      const c = country ? `${country.toString().trim()}` : "";
      const url = c ? `/api/trending/${c}` : "/api/trending/";
      const p = Number(page) || 1;
      return await this._req({
        url: url,
        method: "GET",
        params: {
          page: p,
          limit: limit
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async editor_choice({
    page = 1,
    limit = 20
  }) {
    try {
      const p = Number(page) || 1;
      return await this._req({
        url: "/api/editor-choice",
        method: "GET",
        params: {
          page: p,
          limit: limit
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async just_added({
    page = 1,
    limit = 20
  }) {
    try {
      const p = Number(page) || 1;
      return await this._req({
        url: "/api/just-added",
        method: "GET",
        params: {
          page: p,
          limit: limit
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async popular({
    page = 1,
    limit = 20
  }) {
    try {
      const p = Number(page) || 1;
      return await this._req({
        url: "/api/popular",
        method: "GET",
        params: {
          page: p,
          limit: limit
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async categories() {
    try {
      return await this._req({
        url: "/api/categories",
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async category({
    id,
    page = 1,
    limit = 20
  }) {
    try {
      const catId = typeof id === "object" ? id?.id : id;
      if (!catId) {
        return {
          error: 'Parameter "id" kategori wajib diisi'
        };
      }
      const p = Number(page) || 1;
      return await this._req({
        url: `/api/category/${catId}`,
        method: "GET",
        params: {
          page: p,
          limit: limit
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async detail({
    id
  }) {
    try {
      const soundId = typeof id === "object" ? id?.id : id;
      if (!soundId) {
        return {
          error: 'Parameter "id" suara wajib diisi'
        };
      }
      return await this._req({
        url: `/api/sound/${soundId}`,
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async search({
    query = "",
    page = 1,
    limit = 20
  }) {
    try {
      const q = query ? query.toString().trim() : "";
      if (!q) {
        return {
          error: 'Parameter "query" wajib diisi untuk pencarian'
        };
      }
      const p = Number(page) || 1;
      return await this._req({
        url: "/api/search",
        method: "GET",
        params: {
          q: q,
          page: p,
          limit: limit
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async trending_searches() {
    try {
      return await this._req({
        url: "/api/trending/searches",
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async suggestions({
    query = ""
  }) {
    try {
      const q = query ? query.toString().trim() : "";
      if (!q) {
        return {
          error: 'Parameter "query" wajib diisi'
        };
      }
      console.log(`[LOG] GET -> ${this._sugUrl}/?q=${encodeURIComponent(q)}`);
      const res = await axios.get(this._sugUrl, {
        params: {
          q: q
        },
        headers: {
          "User-Agent": "Dart/3.2 (dart:io)",
          Accept: "application/json"
        },
        timeout: 1e4
      });
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to fetch suggestions";
      console.error(`[LOG ERROR] Suggestions -> ${msg}`);
      return {
        error: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["trending", "editor_choice", "just_added", "popular", "categories", "category", "detail", "search", "trending_searches", "suggestions"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: ["/?action=trending&country=id&page=1", "/?action=editor_choice&page=1", "/?action=just_added&page=1", "/?action=popular&page=1", "/?action=categories", "/?action=category&id=1&page=1", "/?action=detail&id=12345", "/?action=search&query=anime&page=1", "/?action=trending_searches", "/?action=suggestions&query=anime"]
      }
    });
  }
  const api = new SoundInstantsAPI();
  try {
    let response;
    switch (action) {
      case "trending":
        response = await api.trending(params);
        break;
      case "editor_choice":
        response = await api.editor_choice(params);
        break;
      case "just_added":
        response = await api.just_added(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "categories":
        response = await api.categories();
        break;
      case "category":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' kategori wajib diisi untuk action 'category'."
          });
        }
        response = await api.category(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' suara wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "search":
        if (!params.query && !params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search({
          ...params,
          query: params.query || params.q
        });
        break;
      case "trending_searches":
        response = await api.trending_searches();
        break;
      case "suggestions":
        if (!params.query && !params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'suggestions'."
          });
        }
        response = await api.suggestions({
          ...params,
          query: params.query || params.q
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    if (response && response.error) {
      return res.status(400).json({
        status: false,
        action: action,
        error: response.error
      });
    }
    const formattedData = Array.isArray(response) ? {
      results: response
    } : typeof response === "object" && response !== null ? response : {
      result: response
    };
    return res.status(200).json({
      status: true,
      action: action,
      ...formattedData
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