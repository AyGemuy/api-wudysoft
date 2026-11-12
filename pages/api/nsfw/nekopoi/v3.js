import axios from "axios";
class NekoPoi {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.explorethefrontierforlimitlessimaginationanddiscov.com/330cceade91a6a9cd30fb8042222ed56/71b8acf33b508c7543592acd9d9eb70d",
      headers: {
        "User-Agent": "okhttp/4.10.0",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        token: "XbGSFkQsJYbFC6pcUMCFL4oNHULvHU7WdDAXYgpmqYlh7p5ZCQ4QZ13GDgowiOGvAejz9X5H6DYvEQBMrc3A17SO3qwLwVkbn6YY",
        appbuildcode: "25301",
        appsignature: "pOplm8IDEDGXN55IaYohQ8CzJFvWsfXyhGvwPRD9kWgzYSRuuvAOPfsE0AJbHVbAJyWGsGCNUIuQLJ7HbMbuFLMWwDgHNwxOrYMH"
      }
    });
    this.letters = ["0-9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    this.types = ["hentai", "2d_animation", "3d_hentai", "jav", "jav_cosplay"];
    this.genres = ["action", "ahegao", "anal", "armpit", "bdsm", "big_oppai", "blackmail", "blonde", "blowjob", "bondage", "comedy", "creampie", "dark_skin", "dilf", "elf", "exhibitionist", "fellatio", "female_monster", "femdom", "footjob", "forced", "furry", "futanari", "gangbang", "gore", "handjob", "harem", "horror", "housewife", "humilation", "humiliation", "hypnotize", "incest", "intercrural", "jav", "lactation", "loli", "maid", "male_monster", "masturbation", "megane", "milf", "mind_control", "monster", "netorare", "nurse", "old_man", "onee_san", "oral", "paizuri", "pantyhose", "pregnant", "prostitution", "rape", "romance", "saimin", "schoolgirl", "semi_hentai", "sex_toys", "shibari", "shota", "stocking", "succubus", "supranatural", "swimsuit", "tentacles", "threesome", "tsundere", "ugly_bastard", "uncensored", "vanilla", "virgin", "yaoi", "yuri"];
  }
  async _request({
    endpoint,
    method = "GET",
    ...rest
  } = {}) {
    try {
      if (!endpoint) return {
        status: false,
        message: "Endpoint is required."
      };
      const response = await this.client({
        url: endpoint,
        method: method,
        ...rest
      });
      return response.data;
    } catch (error) {
      return {
        status: false,
        message: error.response?.data?.message || error.message || "Request failed"
      };
    }
  }
  _validate({
    val,
    list,
    label,
    required = false
  } = {}) {
    try {
      if (required && (val === undefined || val === null || val === "")) {
        return `${label || "Value"} is required.`;
      }
      if (val !== undefined && val !== null && list && !list.includes(val)) {
        return `Invalid ${label}. Available options: ${list.join(", ")}.`;
      }
      return null;
    } catch (error) {
      return error.message;
    }
  }
  _buildParams(params = {}) {
    try {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          query.append(key, value);
        }
      }
      const queryString = query.toString();
      return queryString ? `?${queryString}` : "";
    } catch (error) {
      return "";
    }
  }
  async recent({
    ...rest
  } = {}) {
    try {
      return await this._request({
        endpoint: "/recent",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async latest({
    ...rest
  } = {}) {
    return this.recent(rest);
  }
  async genreList({
    ...rest
  } = {}) {
    try {
      return await this._request({
        endpoint: "/genre",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async comingsoon({
    ...rest
  } = {}) {
    try {
      return await this._request({
        endpoint: "/comingsoon",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async all({
    page = "1",
    category,
    ...rest
  } = {}) {
    try {
      const errCategory = this._validate({
        val: category,
        label: "Category",
        required: true
      });
      if (errCategory) return {
        status: false,
        message: errCategory
      };
      if (isNaN(page)) return {
        status: false,
        message: "Invalid page number."
      };
      const query = this._buildParams({
        page: page,
        category: category
      });
      return await this._request({
        endpoint: `/all${query}`,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async indeks({
    letter,
    type,
    page = "1",
    ...rest
  } = {}) {
    try {
      const errLetter = this._validate({
        val: letter,
        list: this.letters,
        label: "letter",
        required: true
      });
      if (errLetter) return {
        status: false,
        message: errLetter
      };
      const errType = this._validate({
        val: type,
        list: this.types,
        label: "type",
        required: true
      });
      if (errType) return {
        status: false,
        message: errType
      };
      if (isNaN(page)) return {
        status: false,
        message: "Invalid page number."
      };
      const query = this._buildParams({
        letter: letter,
        type: type,
        page: page
      });
      return await this._request({
        endpoint: `/listall${query}`,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async genre({
    genre,
    ...rest
  } = {}) {
    try {
      const errGenre = this._validate({
        val: genre,
        list: this.genres,
        label: "genre",
        required: true
      });
      if (errGenre) return {
        status: false,
        message: errGenre
      };
      const index = this.genres.indexOf(genre);
      const query = this._buildParams({
        term: index
      });
      return await this._request({
        endpoint: `/searchByGenre${query}`,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async search({
    query,
    page = "1",
    ...rest
  } = {}) {
    try {
      const errQuery = this._validate({
        val: query,
        label: "Query",
        required: true
      });
      if (errQuery) return {
        status: false,
        message: errQuery
      };
      if (isNaN(page)) return {
        status: false,
        message: "Invalid page number."
      };
      const queryParams = this._buildParams({
        q: query,
        page: page
      });
      return await this._request({
        endpoint: `/search${queryParams}`,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async detail({
    id,
    ...rest
  } = {}) {
    try {
      const errId = this._validate({
        val: id,
        label: "ID",
        required: true
      });
      if (errId) return {
        status: false,
        message: errId
      };
      if (isNaN(id)) return {
        status: false,
        message: "ID must be a number."
      };
      const query = this._buildParams({
        id: id
      });
      return await this._request({
        endpoint: `/post${query}`,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
  async series({
    id,
    ...rest
  } = {}) {
    try {
      const errId = this._validate({
        val: id,
        label: "ID",
        required: true
      });
      if (errId) return {
        status: false,
        message: errId
      };
      if (isNaN(id)) return {
        status: false,
        message: "ID must be a number."
      };
      const query = this._buildParams({
        id: id
      });
      return await this._request({
        endpoint: `/series${query}`,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["recent", "latest", "genre_list", "comingsoon", "all", "indeks", "genre", "search", "detail", "series"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/api/nekopoi?action=search&query=shoujo"
      }
    });
  }
  const api = new NekoPoi();
  try {
    let rawResponse;
    switch (action) {
      case "recent":
      case "latest":
        rawResponse = await api.recent(params);
        break;
      case "genre_list":
        rawResponse = await api.genreList(params);
        break;
      case "comingsoon":
        rawResponse = await api.comingsoon(params);
        break;
      case "all":
        if (!params.category) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'category' wajib diisi untuk action 'all'.",
            example: "/api/nekopoi?action=all&category=2&page=1"
          });
        }
        rawResponse = await api.all(params);
        break;
      case "indeks":
        if (!params.letter || !params.type) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'letter' dan 'type' wajib diisi untuk action 'indeks'.",
            example: "/api/nekopoi?action=indeks&letter=0-9&type=hentai&page=1"
          });
        }
        rawResponse = await api.indeks(params);
        break;
      case "genre":
        if (!params.genre) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'genre' wajib diisi untuk action 'genre'.",
            example: "/api/nekopoi?action=genre&genre=big_oppai"
          });
        }
        rawResponse = await api.genre(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/api/nekopoi?action=search&query=shoujo&page=1"
          });
        }
        rawResponse = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'detail'.",
            example: "/api/nekopoi?action=detail&id=36302"
          });
        }
        rawResponse = await api.detail(params);
        break;
      case "series":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'series'.",
            example: "/api/nekopoi?action=series&id=36299"
          });
        }
        rawResponse = await api.series(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    if (rawResponse && rawResponse.status === false) {
      return res.status(400).json({
        status: false,
        action: action,
        message: rawResponse.message || "Gagal memproses permintaan."
      });
    }
    const formattedData = Array.isArray(rawResponse) ? {
      result: rawResponse
    } : typeof rawResponse === "object" && rawResponse !== null ? rawResponse : {
      result: rawResponse
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}