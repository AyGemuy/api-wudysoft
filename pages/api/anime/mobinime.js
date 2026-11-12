import axios from "axios";
class Mobinime {
  constructor() {
    this.instance = axios.create({
      baseURL: "https://air.vunime.my.id/mobinime",
      headers: {
        "accept-encoding": "gzip",
        "content-type": "application/x-www-form-urlencoded; charset=utf-8",
        host: "air.vunime.my.id",
        "user-agent": "Dart/3.3 (dart:io)",
        "x-api-key": "ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8"
      }
    });
  }
  async home() {
    try {
      console.log("[home] Fetching homepage...");
      const {
        data
      } = await this.instance.get("/pages/homepage");
      console.log("[home] Success");
      return data;
    } catch (error) {
      console.error("[home] Error:", error?.message);
      return {
        success: false,
        error: error?.message || "Failed to fetch homepage"
      };
    }
  }
  async list({
    type,
    page = "0",
    count = "15",
    genre = "",
    ...rest
  } = {}) {
    try {
      console.log(`[list] Fetching type: ${type}, page: ${page}, count: ${count}`);
      const animeTypes = {
        series: "1",
        movie: "3",
        ova: "2",
        "live-action": "4"
      };
      const typeId = animeTypes[type] || null;
      const genresData = await this.genres();
      const genreSlug = genre?.toLowerCase()?.replace(/\s+/g, "-");
      const genreId = genresData?.find(x => x?.title?.toLowerCase()?.replace(/\s+/g, "-") === genreSlug)?.id || "";
      const payload = {
        perpage: count?.toString(),
        startpage: page?.toString(),
        userid: "",
        sort: "",
        genre: genreId,
        jenisanime: typeId,
        ...rest
      };
      const {
        data
      } = await this.instance.post("/anime/list", payload);
      console.log("[list] Success");
      return data;
    } catch (error) {
      console.error("[list] Error:", error?.message);
      return {
        success: false,
        error: error?.message || "Failed to fetch list"
      };
    }
  }
  async genres() {
    try {
      console.log("[genres] Fetching genres...");
      const {
        data
      } = await this.instance.get("/anime/genre");
      console.log("[genres] Success");
      return data;
    } catch (error) {
      console.error("[genres] Error:", error?.message);
      return {
        success: false,
        error: error?.message || "Failed to fetch genres"
      };
    }
  }
  async search({
    query,
    page = "0",
    count = "25",
    ...rest
  } = {}) {
    try {
      console.log(`[search] Searching: ${query}, page: ${page}`);
      const payload = {
        perpage: count?.toString(),
        startpage: page?.toString(),
        q: query,
        ...rest
      };
      const {
        data
      } = await this.instance.post("/anime/search", payload);
      console.log("[search] Success");
      return data;
    } catch (error) {
      console.error("[search] Error:", error?.message);
      return {
        success: false,
        error: error?.message || "Failed to search"
      };
    }
  }
  async detail({
    id,
    ...rest
  } = {}) {
    try {
      console.log(`[detail] Fetching ID: ${id}`);
      const payload = {
        id: id?.toString(),
        ...rest
      };
      const {
        data
      } = await this.instance.post("/anime/detail", payload);
      console.log("[detail] Success");
      return data;
    } catch (error) {
      console.error("[detail] Error:", error?.message);
      return {
        success: false,
        error: error?.message || "Failed to fetch detail"
      };
    }
  }
  async stream({
    anime_id,
    episode_id,
    quality = "HD",
    ...rest
  } = {}) {
    try {
      console.log(`[stream] Fetching AnimeID: ${anime_id}, EpisodeID: ${episode_id}, Quality: ${quality}`);
      const {
        data: res
      } = await this.instance.post("/anime/get-server-list", {
        id: episode_id?.toString(),
        animeId: anime_id?.toString(),
        jenisAnime: "1",
        userId: ""
      });
      const list = res?.list || [];
      let selected = list.find(x => x?.quality?.toUpperCase() === quality?.toUpperCase()) || list[0];
      if (selected) {
        console.log(`[stream] Get final URL for quality: ${selected.quality}`);
        const {
          data: video
        } = await this.instance.post("/anime/get-url-video", {
          url: selected.url,
          quality: selected.quality,
          position: "0",
          ...rest
        });
        selected = {
          ...selected,
          url: video?.url || selected.url
        };
      }
      console.log("[stream] Success");
      return {
        status: true,
        selected: selected || null,
        list: list
      };
    } catch (err) {
      console.error("[stream] Error:", err?.message);
      return {
        status: false,
        selected: null,
        list: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "list", "genres", "search", "detail", "stream"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/mobinime?action=home",
          list: "/mobinime?action=list&type=series&page=0&count=15",
          genres: "/mobinime?action=genres",
          search: "/mobinime?action=search&query=naruto&page=0",
          detail: "/mobinime?action=detail&id=123",
          stream: "/mobinime?action=stream&anime_id=123&episode_id=456&quality=HD"
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
  const api = new Mobinime();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "list":
        response = await api.list(params);
        break;
      case "genres":
        response = await api.genres();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk detail."
          });
        }
        response = await api.detail(params);
        break;
      case "stream":
        if (!params.anime_id || !params.episode_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'anime_id' dan 'episode_id' wajib diisi untuk stream."
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
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}