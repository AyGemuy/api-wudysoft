import axios from "axios";
class SoundboardAPI {
  constructor() {
    this._bUrl = "https://play-v1.soundboard.cloud/api/my-instants.com";
    this._mUrl = "https://play-v1.soundboard.cloud/media";
    this._s3Url = "https://soundbuttons.s3.us-east-2.amazonaws.com";
    this._cli = axios.create({
      baseURL: this._bUrl,
      headers: {
        "User-Agent": "Dart/3.2 (dart:io)",
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      timeout: 6e4
    });
  }
  media_url(path) {
    try {
      if (!path || typeof path !== "string") return null;
      let p = path.trim();
      if (!p) return null;
      if (p.startsWith(this._s3Url)) p = p.substring(47);
      return p.startsWith("http://") || p.startsWith("https://") ? p : `${this._mUrl}${p.startsWith("/") ? p : `/${p}`}`;
    } catch (err) {
      return null;
    }
  }
  _direct(id) {
    try {
      const soundId = typeof id === "object" ? id?.id : id;
      if (!soundId) return null;
      return `${this._bUrl}/sounds/${soundId}/audio`;
    } catch (err) {
      return null;
    }
  }
  _fixMedia(data) {
    try {
      if (!data || typeof data !== "object") return data;
      if (Array.isArray(data)) {
        return data.map(item => this._fixMedia(item));
      }
      const item = {
        ...data
      };
      const mediaFields = ["sound_file", "image", "icon", "file", "sound"];
      for (const key of mediaFields) {
        if (typeof item[key] === "string" && item[key]) {
          item[key] = this.media_url(item[key]);
        }
      }
      if (item.id && (item.sound_file || item.sound || item.duration !== undefined)) {
        item.direct_url = this._direct(item.id);
      }
      if (Array.isArray(item.results)) {
        item.results = item.results.map(sub => this._fixMedia(sub));
      }
      if (Array.isArray(item.data)) {
        item.data = item.data.map(sub => this._fixMedia(sub));
      }
      return item;
    } catch {
      return data;
    }
  }
  async _req(cfg = {}) {
    try {
      console.log(`[LOG] ${cfg.method || "GET"} -> ${cfg.url}`);
      const res = await this._cli(cfg);
      return this._fixMedia(res.data);
    } catch (err) {
      const errData = err?.response?.data;
      const msg = errData?.message || errData?.error || err?.message || "Request failed";
      console.error(`[LOG ERROR] ${cfg.method || "GET"} ${cfg.url} -> ${msg}`);
      return errData || {
        error: msg
      };
    }
  }
  async sounds({
    page = 1,
    query = ""
  }) {
    try {
      const q = query ? query.toString().trim() : "";
      const p = Number(page) || 1;
      const url = q ? `/sounds/search?name=${encodeURIComponent(q)}&page=${p}` : `/sounds?page=${p}`;
      return await this._req({
        url: url,
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async trending({
    page = 1
  }) {
    try {
      const p = Number(page) || 1;
      return await this._req({
        url: `/sounds/trending?page=${p}`,
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async new_sounds({
    page = 1
  }) {
    try {
      const p = Number(page) || 1;
      return await this._req({
        url: `/sounds/new?page=${p}`,
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
    page = 1
  }) {
    try {
      if (!id) {
        return {
          error: 'Parameter "id" kategori wajib diisi'
        };
      }
      const p = Number(page) || 1;
      return await this._req({
        url: `/sounds?category=${id}&page=${p}`,
        method: "GET"
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
        url: `/sounds/${soundId}`,
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  direct(id) {
    return this._direct(id);
  }
  async related({
    id,
    page = 1
  }) {
    try {
      if (!id) {
        return {
          error: 'Parameter "id" suara wajib diisi'
        };
      }
      const p = Number(page) || 1;
      return await this._req({
        url: `/sounds/${id}/related?page=${p}`,
        method: "GET"
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
        url: "/user/categories",
        method: "GET"
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
  async views({
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
        url: "/sounds/views",
        method: "POST",
        data: {
          id: soundId
        }
      });
    } catch (err) {
      return {
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["sounds", "trending", "new_sounds", "category", "detail", "direct", "related", "categories", "views"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: ["/?action=sounds&query=anime&page=1", "/?action=trending", "/?action=category&id=1", "/?action=detail&id=12345"]
      }
    });
  }
  const api = new SoundboardAPI();
  try {
    let response;
    switch (action) {
      case "sounds":
        response = await api.sounds(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "new_sounds":
        response = await api.new_sounds(params);
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
      case "direct":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' suara wajib diisi untuk action 'direct'."
          });
        }
        response = {
          direct_url: api.direct(params.id)
        };
        break;
      case "related":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' suara wajib diisi untuk action 'related'."
          });
        }
        response = await api.related(params);
        break;
      case "categories":
        response = await api.categories();
        break;
      case "views":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' suara wajib diisi untuk action 'views'."
          });
        }
        response = await api.views(params);
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