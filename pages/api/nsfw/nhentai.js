import axios from "axios";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class NHentai {
  constructor() {
    this.baseUrl = "https://nhentai.net";
    this.proxy = url => `${proxy}${this.baseUrl}${url}`;
    this.client = axios.create({
      timeout: 6e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://nhentai.net/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-arch": '""',
        "sec-ch-ua-bitness": '""',
        "sec-ch-ua-full-version": '"127.0.6533.144"',
        "sec-ch-ua-full-version-list": '"Chromium";v="127.0.6533.144", "Not)A;Brand";v="99.0.0.0", "Microsoft Edge Simulate";v="127.0.6533.144", "Lemur";v="127.0.6533.144"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-model": '"RMX3890"',
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua-platform-version": '"15.0.0"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  _id(input) {
    try {
      if (!input) return "";
      if (typeof input === "string") {
        const match = input.match(/\/g\/(\d+)/) || input.match(/^(\d+)$/);
        return match ? match[1] : input;
      }
      return String(input);
    } catch (err) {
      console.error(`[NHentai] _id error: ${err.message}`);
      return input;
    }
  }
  async req({
    url,
    method = "GET",
    headers = {},
    data = null,
    params = null,
    ...rest
  } = {}) {
    if (!url) {
      return {
        error: "Parameter 'url' is required for requests."
      };
    }
    const proxied = this.proxy(url);
    console.log(`[NHentai] Dispatching [${method}] request to: ${proxied}`);
    try {
      const response = await this.client({
        url: proxied,
        method: method,
        headers: headers,
        data: data,
        params: params,
        ...rest
      });
      return response.data;
    } catch (err) {
      console.error(`[NHentai] Request [${method}] failed for ${url}: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async cdn({
    ...rest
  } = {}) {
    console.log("[NHentai] Fetching CDN config...");
    try {
      return await this.req({
        url: "/api/v2/cdn",
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] cdn error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async config({
    ...rest
  } = {}) {
    console.log("[NHentai] Fetching site configuration...");
    try {
      return await this.req({
        url: "/api/v2/config",
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] conf error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async zones({
    ...rest
  } = {}) {
    console.log("[NHentai] Fetching zones...");
    try {
      return await this.req({
        url: "/api/v2/zones",
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] zones error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async galleries({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[NHentai] Fetching galleries (Page: ${page})...`);
    try {
      return await this.req({
        url: "/api/v2/galleries",
        method: "GET",
        params: {
          page: page
        },
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] galls error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async popular({
    ...rest
  } = {}) {
    console.log("[NHentai] Fetching popular galleries...");
    try {
      return await this.req({
        url: "/api/v2/galleries/popular",
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] pop_galls error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async tagged({
    tag_id,
    sort = "recent",
    page = 1,
    ...rest
  } = {}) {
    if (!tag_id) {
      return {
        error: "Parameter 'tag_id' is required."
      };
    }
    console.log(`[NHentai] Fetching galleries for Tag ID: ${tag_id}...`);
    try {
      return await this.req({
        url: "/api/v2/galleries/tagged",
        method: "GET",
        params: {
          tag_id: tag_id,
          sort: sort,
          page: page
        },
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] galls_by_tag error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async random({
    ...rest
  } = {}) {
    console.log("[NHentai] Fetching random gallery...");
    try {
      return await this.req({
        url: "/api/v2/galleries/random",
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] rand_gall error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async search({
    query,
    page = 1,
    sort = "recent",
    ...rest
  } = {}) {
    if (!query) {
      return {
        error: "Parameter 'query' is required."
      };
    }
    console.log(`[NHentai] Searching for "${query}" (Page: ${page})...`);
    try {
      return await this.req({
        url: "/api/v2/search",
        method: "GET",
        params: {
          query: query,
          page: page,
          sort: sort
        },
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] search error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async detail({
    id,
    ...rest
  } = {}) {
    if (!id) {
      return {
        error: "Parameter 'id' is required."
      };
    }
    console.log(`[NHentai] Fetching gallery detail: ${id}...`);
    try {
      const galleryId = this._id(id);
      return await this.req({
        url: `/api/v2/galleries/${galleryId}`,
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] detail error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async related({
    id,
    ...rest
  } = {}) {
    if (!id) {
      return {
        error: "Parameter 'id' is required."
      };
    }
    console.log(`[NHentai] Fetching related galleries for: ${id}...`);
    try {
      const galleryId = this._id(id);
      return await this.req({
        url: `/api/v2/galleries/${galleryId}/related`,
        method: "GET",
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] related error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async comments({
    id,
    page = 1,
    per_page = 25,
    ...rest
  } = {}) {
    if (!id) {
      return {
        error: "Parameter 'id' is required."
      };
    }
    console.log(`[NHentai] Fetching comments for gallery: ${id}...`);
    try {
      const galleryId = this._id(id);
      return await this.req({
        url: `/api/v2/galleries/${galleryId}/comments`,
        method: "GET",
        params: {
          page: page,
          per_page: per_page
        },
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] comments error: ${err.message}`);
      return {
        error: err.message
      };
    }
  }
  async tags({
    body = {},
    ...rest
  } = {}) {
    console.log("[NHentai] Requesting autocomplete tags...");
    try {
      return await this.req({
        url: "/api/v2/tags/search",
        method: "POST",
        data: {
          limit: 10,
          ...body
        },
        ...rest
      });
    } catch (err) {
      console.error(`[NHentai] ac error: ${err.message}`);
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
  const validActions = ["cdn", "config", "zones", "galleries", "popular", "tagged", "random", "search", "detail", "related", "comments", "tags"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/api/nhentai?action=search&query=english"
      }
    });
  }
  const api = new NHentai();
  try {
    let response;
    switch (action) {
      case "cdn":
        response = await api.cdn(params);
        break;
      case "config":
        response = await api.config(params);
        break;
      case "zones":
        response = await api.zones(params);
        break;
      case "galleries":
        response = await api.galleries(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "tagged":
        if (!params.tag_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'tag_id' wajib diisi untuk action 'tagged'."
          });
        }
        response = await api.tagged(params);
        break;
      case "random":
        response = await api.random(params);
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
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'detail'.",
            example: "123456"
          });
        }
        response = await api.detail(params);
        break;
      case "related":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'related'.",
            example: "123456"
          });
        }
        response = await api.related(params);
        break;
      case "comments":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'comments'.",
            example: "123456"
          });
        }
        response = await api.comments(params);
        break;
      case "tags":
        response = await api.tags({
          body: params
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