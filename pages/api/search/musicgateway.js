import axios from "axios";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class MusicGateway {
  constructor() {
    this.proxy = proxy;
    this.target = "https://www.musicgateway.com";
    this.base = `${this.proxy}${this.target}`;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "x-inertia": "true",
      "x-inertia-version": "084b7a6e65ecbfc4ed3780f963622055",
      "x-requested-with": "XMLHttpRequest",
      referer: `${this.target}/song-lyrics`
    };
  }
  async search({
    query = "",
    page = 1
  }) {
    try {
      console.log(`🔍 Searching: "${query}" (Page ${page})`);
      const response = await axios.get(`${this.base}/song-lyrics`, {
        params: {
          search: query,
          page: page
        },
        headers: this.headers
      });
      return response?.data?.props || response?.data;
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  }
  async detail({
    slug = ""
  }) {
    try {
      console.log(`📄 Fetching Lyrics: ${slug}`);
      const response = await axios.get(`${this.base}/song-lyrics/${slug}`, {
        headers: this.headers
      });
      return response?.data?.props || response?.data;
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=hello"
      }
    });
  }
  const api = new MusicGateway();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk action 'detail'.",
            example: "adelle/hello"
          });
        }
        response = await api.detail(params);
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}