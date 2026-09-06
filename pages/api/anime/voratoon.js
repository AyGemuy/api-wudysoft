import axios from "axios";
class Voratoon {
  constructor() {
    this.baseUrl = "https://api.voratoon.com";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://voratoon.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://voratoon.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  _toSnake(str = "") {
    try {
      return str ? str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`) : "";
    } catch (e) {
      return str;
    }
  }
  _cleanData(item) {
    try {
      if (!item || typeof item !== "object") return item;
      if (Array.isArray(item)) {
        return item.map(el => this._cleanData(el));
      }
      const keys = Object.keys(item);
      const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
      if (isNumeric) {
        return Object.values(item).map(el => this._cleanData(el));
      }
      const target = item?.$attributes || item;
      const res = {};
      for (const key of Object.keys(target)) {
        if (key.startsWith("$") || ["modelOptions", "cachedGetters", "fillInvoked", "forceUpdate"].includes(key)) {
          continue;
        }
        const snakeKey = this._toSnake(key);
        const val = target[key];
        if (key === "data" && val && typeof val === "object" && !Array.isArray(val)) {
          const nested = this._cleanData(val);
          Object.assign(res, nested);
          continue;
        }
        res[snakeKey] = this._cleanData(val);
      }
      return res;
    } catch (e) {
      return item;
    }
  }
  async _req(endpoint = "", params = {}) {
    try {
      console.log(`[Voratoon] GET ${endpoint} | Params:`, params);
      const response = await this.client.get(endpoint, {
        params: params
      });
      const rawData = response?.data?.data !== undefined ? response?.data?.data : response?.data;
      return {
        status: response?.status === 200 || false,
        result: this._cleanData(rawData)
      };
    } catch (error) {
      console.log(`[Voratoon] Error on ${endpoint}:`, error?.response?.data || error?.message);
      return {
        status: false,
        result: error?.response?.data?.message || error?.message || "Internal Server Error"
      };
    }
  }
  async series({
    take = 30,
    page = 1,
    sort = "latest",
    sortOrder = "desc",
    includeMeta = true,
    takeChapter = 4,
    ...rest
  }) {
    try {
      const params = {
        take: take ? take : 30,
        page: page ? page : 1,
        sort: sort || "latest",
        sortOrder: sortOrder || "desc",
        includeMeta: includeMeta ? "true" : "false",
        takeChapter: takeChapter ? takeChapter : 4,
        ...rest
      };
      return await this._req("/series", params);
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing series"
      };
    }
  }
  async search({
    title = "",
    take = 30,
    page = 1,
    sort = "latest",
    sortOrder = "desc",
    includeMeta = true,
    takeChapter = 1,
    ...rest
  }) {
    try {
      if (!title) return {
        status: false,
        result: "Parameter 'title' wajib diisi."
      };
      return await this.series({
        title: title,
        take: take,
        page: page,
        sort: sort,
        sortOrder: sortOrder,
        includeMeta: includeMeta,
        takeChapter: takeChapter,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing search"
      };
    }
  }
  async detail({
    slug = "",
    take = 1,
    page = 1,
    includeMeta = true,
    takeChapter = 5,
    ...rest
  }) {
    try {
      if (!slug) return {
        status: false,
        result: "Parameter 'slug' wajib diisi."
      };
      const params = {
        take: take ? take : 1,
        page: page ? page : 1,
        includeMeta: includeMeta ? "true" : "false",
        takeChapter: takeChapter ? takeChapter : 5,
        filter: `slug==${encodeURIComponent(slug)}`,
        ...rest
      };
      const res = await this._req("/series", params);
      if (res?.status && Array.isArray(res?.result)) {
        res.result = res.result[0] || null;
      }
      return res;
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing detail"
      };
    }
  }
  async seriesById({
    id = "",
    ...rest
  }) {
    try {
      if (!id) return {
        status: false,
        result: "Parameter 'id' wajib diisi."
      };
      return await this._req(`/series/${id}`, {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing seriesById"
      };
    }
  }
  async banners({
    ...rest
  }) {
    try {
      return await this._req("/series/banners", {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing banners"
      };
    }
  }
  async presets({
    ...rest
  }) {
    try {
      return await this._req("/series/presets", {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing presets"
      };
    }
  }
  async animeAdaptations({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/anime-adaptations", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing animeAdaptations"
      };
    }
  }
  async bestManga({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/best-manga", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing bestManga"
      };
    }
  }
  async bestManhua({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/best-manhua", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing bestManhua"
      };
    }
  }
  async bestManhwa({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/best-manhwa", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing bestManhwa"
      };
    }
  }
  async mostBookmarked({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/most-bookmarked", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing mostBookmarked"
      };
    }
  }
  async mostRead({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/most-read", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing mostRead"
      };
    }
  }
  async recommendations({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/recommendations", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing recommendations"
      };
    }
  }
  async trending({
    take = 30,
    page = 1,
    includeMeta = true,
    ...rest
  }) {
    try {
      return await this._req("/series/trending", {
        take: take,
        page: page,
        includeMeta: includeMeta ? "true" : "false",
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing trending"
      };
    }
  }
  async popular({
    period = "today",
    take = 12,
    page = 1,
    includeMeta = 1,
    ...rest
  }) {
    try {
      const endpoint = period ? `/popular/${period}` : "/popular";
      return await this._req(endpoint, {
        take: take,
        page: page,
        includeMeta: includeMeta ? 1 : 0,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing popular"
      };
    }
  }
  async popularGenre({
    genre = "",
    take = 12,
    page = 1,
    includeMeta = 1,
    ...rest
  }) {
    try {
      if (!genre) return {
        status: false,
        result: "Parameter 'genre' wajib diisi."
      };
      return await this._req(`/popular/genre/${encodeURIComponent(genre)}`, {
        take: take,
        page: page,
        includeMeta: includeMeta ? 1 : 0,
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing popularGenre"
      };
    }
  }
  async genres({
    ...rest
  }) {
    try {
      return await this._req("/genres", {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing genres"
      };
    }
  }
  async genre({
    id = "",
    ...rest
  }) {
    try {
      if (!id) return {
        status: false,
        result: "Parameter 'id' wajib diisi."
      };
      return await this._req(`/genres/${id}`, {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing genre"
      };
    }
  }
  async chapters({
    slug = "",
    ...rest
  }) {
    try {
      if (!slug) return {
        status: false,
        result: "Parameter 'slug' wajib diisi."
      };
      return await this._req(`/series/${encodeURIComponent(slug)}/chapters`, {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing chapters"
      };
    }
  }
  async chapter({
    slug = "",
    index = "",
    ...rest
  }) {
    try {
      if (!slug || index === "" || index === null || index === undefined) {
        return {
          status: false,
          result: "Parameter 'slug' dan 'index' wajib diisi."
        };
      }
      return await this._req(`/series/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(index)}`, {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing chapter"
      };
    }
  }
  async chapterById({
    id = "",
    ...rest
  }) {
    try {
      if (!id) return {
        status: false,
        result: "Parameter 'id' wajib diisi."
      };
      return await this._req(`/chapters/${id}`, {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing chapterById"
      };
    }
  }
  async comments({
    seriesId = "",
    chapterId = null,
    ...rest
  }) {
    try {
      if (!seriesId) return {
        status: false,
        result: "Parameter 'seriesId' wajib diisi."
      };
      const params = {
        ...chapterId ? {
          chapterId: chapterId
        } : {},
        ...rest
      };
      return await this._req(`/series/${seriesId}/comments`, params);
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing comments"
      };
    }
  }
  async announcements({
    id = null,
    ...rest
  }) {
    try {
      const endpoint = id ? `/announcements/${id}` : "/announcements";
      return await this._req(endpoint, {
        ...rest
      });
    } catch (error) {
      return {
        status: false,
        result: error?.message || "Error processing announcements"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["series", "search", "detail", "seriesById", "banners", "presets", "animeAdaptations", "bestManga", "bestManhua", "bestManhwa", "mostBookmarked", "mostRead", "recommendations", "trending", "popular", "popularGenre", "genres", "genre", "chapters", "chapter", "chapterById", "comments", "announcements"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          series: "/?action=series&page=1&take=30",
          search: "/?action=search&title=Nano",
          detail: "/?action=detail&slug=nano-machine",
          banners: "/?action=banners",
          trending: "/?action=trending",
          bestManhwa: "/?action=bestManhwa",
          popular: "/?action=popular&period=today",
          popularGenre: "/?action=popularGenre&genre=Action",
          genres: "/?action=genres",
          chapters: "/?action=chapters&slug=nano-machine",
          chapter: "/?action=chapter&slug=nano-machine&index=1",
          comments: "/?action=comments&seriesId=5501"
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
  const api = new Voratoon();
  try {
    let response;
    switch (action) {
      case "series":
        response = await api.series(params);
        break;
      case "search":
        if (!params.title && !params.query && !params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'title' wajib diisi untuk search."
          });
        }
        response = await api.search({
          title: params.title || params.query || params.q,
          ...params
        });
        break;
      case "detail":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi."
          });
        }
        response = await api.detail(params);
        break;
      case "seriesById":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi."
          });
        }
        response = await api.seriesById(params);
        break;
      case "banners":
        response = await api.banners(params);
        break;
      case "presets":
        response = await api.presets(params);
        break;
      case "animeAdaptations":
        response = await api.animeAdaptations(params);
        break;
      case "bestManga":
        response = await api.bestManga(params);
        break;
      case "bestManhua":
        response = await api.bestManhua(params);
        break;
      case "bestManhwa":
        response = await api.bestManhwa(params);
        break;
      case "mostBookmarked":
        response = await api.mostBookmarked(params);
        break;
      case "mostRead":
        response = await api.mostRead(params);
        break;
      case "recommendations":
        response = await api.recommendations(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "popularGenre":
        if (!params.genre) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'genre' wajib diisi."
          });
        }
        response = await api.popularGenre(params);
        break;
      case "genres":
        response = await api.genres(params);
        break;
      case "genre":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi."
          });
        }
        response = await api.genre(params);
        break;
      case "chapters":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi."
          });
        }
        response = await api.chapters(params);
        break;
      case "chapter":
        if (!params.slug || params.index === undefined && params.chapter === undefined) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' dan 'index' wajib diisi."
          });
        }
        response = await api.chapter({
          slug: params.slug,
          index: params.index !== undefined ? params.index : params.chapter,
          ...params
        });
        break;
      case "chapterById":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi."
          });
        }
        response = await api.chapterById(params);
        break;
      case "comments":
        if (!params.seriesId && !params.series_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'seriesId' wajib diisi."
          });
        }
        response = await api.comments({
          seriesId: params.seriesId || params.series_id,
          chapterId: params.chapterId || params.chapter_id || null,
          ...params
        });
        break;
      case "announcements":
        response = await api.announcements(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}