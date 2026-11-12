import axios from "axios";
class WaifuImAPI {
  constructor() {
    this.baseUrl = "https://api.waifu.im";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://www.waifu.im/",
      Origin: "https://www.waifu.im"
    };
  }
  async req(endpoint, method = "GET", params = {}, data = null) {
    try {
      const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
      console.log(`[LOG] ${method} ${url}`);
      const config = {
        method: method,
        url: url,
        headers: this.headers,
        params: method === "GET" ? params : undefined,
        timeout: 3e4
      };
      if (method === "POST" && data) {
        config.data = data;
        config.headers["Content-Type"] = "application/json";
      }
      const response = await axios(config);
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`[ERROR] Request Failed [${endpoint}]: ${errorMsg}`);
      throw new Error(`Failed to fetch ${endpoint}: ${errorMsg}`);
    }
  }
  async getTags({
    page = 1,
    pageSize = 30,
    name = ""
  } = {}) {
    try {
      const params = {
        page: page,
        pageSize: pageSize
      };
      if (name) params.name = name;
      const data = await this.req("/tags", "GET", params);
      console.log(`[LOG] Tags: Found ${data.items?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Get Tags:", error.message);
      return {
        items: [],
        totalCount: 0
      };
    }
  }
  async getArtists({
    page = 1,
    pageSize = 30,
    name = ""
  } = {}) {
    try {
      const params = {
        page: page,
        pageSize: pageSize
      };
      if (name) params.name = name;
      const data = await this.req("/artists", "GET", params);
      console.log(`[LOG] Artists: Found ${data.items?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Get Artists:", error.message);
      return {
        items: [],
        totalCount: 0
      };
    }
  }
  async getImages({
    isNsfw = false,
    orderBy = "Random",
    page = 1,
    pageSize = 30,
    includedTags = [],
    excludedTags = [],
    artistId = null
  } = {}) {
    try {
      const params = {
        isNsfw: isNsfw === true || isNsfw === "true" || isNsfw === "True",
        orderBy: orderBy,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
      if (includedTags && includedTags.length) {
        params.includedTags = Array.isArray(includedTags) ? includedTags : [includedTags];
      }
      if (excludedTags && excludedTags.length) {
        params.excludedTags = Array.isArray(excludedTags) ? excludedTags : [excludedTags];
      }
      if (artistId) {
        params.artistId = artistId;
      }
      const data = await this.req("/images", "GET", params);
      console.log(`[LOG] Images: Found ${data.items?.length || 0} items`);
      return data;
    } catch (error) {
      console.error("[ERROR] Get Images:", error.message);
      return {
        items: [],
        totalCount: 0
      };
    }
  }
  async getImageDetail({
    id
  }) {
    try {
      if (!id) throw new Error("Image 'id' is required");
      const data = await this.req(`/images/${id}`, "GET");
      console.log(`[LOG] Image Detail: Found image #${data.id}`);
      return data;
    } catch (error) {
      console.error("[ERROR] Get Image Detail:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["tags", "artists", "images", "image_detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: ["/?action=tags&pageSize=30", "/?action=artists&page=1", "/?action=images&isNsfw=false&orderBy=Random&pageSize=10", "/?action=image_detail&id=7444"]
      }
    });
  }
  const api = new WaifuImAPI();
  try {
    let response;
    switch (action) {
      case "tags":
        response = await api.getTags(params);
        break;
      case "artists":
        response = await api.getArtists(params);
        break;
      case "images":
        response = await api.getImages(params);
        break;
      case "image_detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'image_detail'.",
            example: {
              id: 7444
            }
          });
        }
        response = await api.getImageDetail(params);
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
      data: response
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