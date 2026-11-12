import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const BASE_URL = "https://bandcamp.com";
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "Accept-Language": "id-ID",
  Accept: "application/json, text/plain, */*",
  Origin: "https://bandcamp.com",
  Referer: "https://bandcamp.com/"
};
const SEARCH_TYPE_MAP = {
  all: "a",
  artist: "b",
  track: "t"
};

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function cleanJsonKeys(data) {
  if (Array.isArray(data)) {
    return data.map(item => cleanJsonKeys(item));
  }
  if (typeof data === "object" && data !== null) {
    const cleaned = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (key.startsWith("@")) continue;
        const newKey = camelToSnakeCase(key);
        const value = data[key];
        cleaned[newKey] = cleanJsonKeys(value);
      }
    }
    return cleaned;
  }
  return data;
}
class BCClient {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: BASE_URL,
      jar: this.jar,
      timeout: 15e3,
      headers: DEFAULT_HEADERS
    }));
    this.log("BCClient berhasil diinisialisasi (ES6 Module).");
  }
  log(msg) {
    console.log(`[BCClient LOG]: ${msg}`);
  }
  async req({
    url,
    method = "get",
    data = null,
    customHeaders = {},
    ...rest
  }) {
    try {
      this.log(`Memulai ${method.toUpperCase()} request ke: ${url}`);
      const response = await this.client({
        method: method,
        url: url,
        data: data,
        headers: {
          ...DEFAULT_HEADERS,
          ...customHeaders
        },
        ...rest
      });
      this.log(`Respon diterima (Status: ${response.status}).`);
      return response;
    } catch (error) {
      const status = error.response?.status || "N/A";
      const msg = error.message || "Error Tidak Dikenal";
      const fallbackUrl = error.config?.url ? error.config.url : "URL tidak tersedia";
      console.error(`[BCClient ERROR] Request Gagal: Status ${status}, Pesan: ${msg}`);
      return {
        error: true,
        message: `Request gagal untuk ${fallbackUrl}. Status: ${status}.`,
        status: status
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    const itemUrl = url;
    if (!itemUrl) {
      return {
        error: true,
        message: "URL item tidak boleh kosong."
      };
    }
    this.log(`Mengambil detail dari URL: ${itemUrl}`);
    const response = await this.req({
      url: itemUrl,
      method: "get"
    });
    if (response.error) {
      return response;
    }
    try {
      const $ = cheerio.load(response.data);
      const jsonLdScript = $("#tralbum-jsonld").html();
      let cleanedJsonLd = {};
      if (jsonLdScript) {
        try {
          const rawJsonLd = JSON.parse(jsonLdScript);
          cleanedJsonLd = cleanJsonKeys(rawJsonLd);
        } catch (e) {
          this.log(`Gagal mengurai JSON-LD: ${e.message}`);
        }
      }
      const tralbumDataScript = $("script[data-tralbum]").attr("data-tralbum");
      let tralbumData = {};
      if (tralbumDataScript) {
        try {
          tralbumData = JSON.parse(tralbumDataScript);
        } catch (e) {
          this.log(`Gagal mengurai data-tralbum: ${e.message}`);
        }
      }
      const cartDataScript = $("script[data-cart]").attr("data-cart");
      let cartData = {};
      if (cartDataScript) {
        try {
          cartData = JSON.parse(cartDataScript);
        } catch (e) {
          this.log(`Gagal mengurai data-cart: ${e.message}`);
        }
      }
      const rawDescription = cleanedJsonLd.description || "No Description";
      const description = rawDescription.trim().replace(/\r?\n/g, " ").replace(/\s+/g, " ");
      const tracks = tralbumData.trackinfo ? tralbumData.trackinfo.map(t => ({
        id: t.id,
        title: t.title,
        stream_url: t.file && t.file["mp3-128"] ? t.file["mp3-128"].split("?")[0] : null,
        duration_s: t.duration,
        track_num: t.track_num,
        title_link: t.title_link ? BASE_URL + t.title_link : null
      })) : [];
      const currentData = tralbumData.current || {};
      const price = currentData.minimum_price !== undefined ? currentData.minimum_price : currentData.set_price || 0;
      const currency = cartData.currency || cleanedJsonLd.album_release?.[0]?.offers?.price_currency || "USD";
      let detailResult = {
        url: itemUrl,
        type: tralbumData.item_type === "album" ? "Album" : tralbumData.item_type === "track" ? "Track" : tralbumData.item_type === "band" ? "Artist/Band" : "N/A",
        ...cleanedJsonLd,
        name: cleanedJsonLd.name || "N/A",
        artist: cleanedJsonLd.by_artist?.name || "Unknown Artist",
        image: Array.isArray(cleanedJsonLd.image) ? cleanedJsonLd.image[0]?.url : cleanedJsonLd.image,
        tags: cleanedJsonLd.keywords ? cleanedJsonLd.keywords.join(", ") : "Tidak ada tags",
        description: description,
        price: price,
        currency: currency,
        tracks: tracks,
        total_tracks: tracks.length,
        keywords: undefined
      };
      Object.keys(detailResult).forEach(key => detailResult[key] === undefined && delete detailResult[key]);
      this.log(`Detail berhasil diurai: ${detailResult.name} (${detailResult.type})`);
      return detailResult;
    } catch (e) {
      return {
        error: true,
        message: `Kesalahan parsing detail untuk ${itemUrl}: ${e.message}`,
        status: "Parsing Error"
      };
    }
  }
  async search({
    type = "all",
    query,
    limit = 50,
    detail = false,
    ...rest
  }) {
    const searchFilter = SEARCH_TYPE_MAP[type] || "a";
    this.log(`Memulai pencarian untuk: "${query}" (Tipe: ${type})`);
    const url = "/api/bcsearch_public_api/1/autocomplete_elastic";
    const payload = {
      search_text: query,
      search_filter: searchFilter,
      fan_id: rest.fan_id || null,
      full_page: false,
      ...rest
    };
    const customHeaders = {
      "Content-Type": "application/json; charset=UTF-8"
    };
    const response = await this.req({
      url: url,
      method: "post",
      data: payload,
      customHeaders: customHeaders
    });
    if (response.error) {
      return response;
    }
    try {
      const allResults = response.data?.auto?.results || [];
      const results = allResults.slice(0, limit > 0 ? limit : 50);
      const total = results.length || 0;
      this.log(`Pencarian selesai. Ditemukan ${total} hasil.`);
      if (detail) {
        const fullDetails = [];
        let successCount = 0;
        for (const result of results) {
          let detailUrl = "";
          this.log(`[Search-Detail]: Memproses hasil: ${result.name} (${result.type})`);
          this.log(`[Search-Detail]: Tipe: ${result.type}, path: ${result.item_url_path}, root: ${result.item_url_root}`);
          if (result.type === "b") {
            detailUrl = result.item_url_root || result.item_url_path;
          } else if (result.item_url_path) {
            detailUrl = result.item_url_path;
          } else if (result.item_url_root) {
            detailUrl = result.item_url_root;
          }
          if (!detailUrl) {
            fullDetails.push({
              error: true,
              name: result.name,
              message: "Data pencarian tidak lengkap (item_url_root/item_url_path kosong)."
            });
            continue;
          }
          this.log(`[Search-Detail]: URL akhir: ${detailUrl}`);
          const fullDetail = await this.detail({
            url: detailUrl
          });
          if (fullDetail.error) {
            fullDetails.push({
              error: true,
              name: result.name,
              message: `Gagal mengambil detail. Pesan: ${fullDetail.message}`
            });
          } else {
            fullDetails.push(fullDetail);
            successCount++;
          }
        }
        return {
          total: successCount,
          result: fullDetails,
          total_searched: results.length
        };
      } else {
        return {
          total: total,
          result: results
        };
      }
    } catch (e) {
      return {
        error: true,
        message: `Kesalahan pemrosesan hasil pencarian: ${e.message}`,
        status: "Processing Error"
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
        example: "/?action=search&query=punk"
      }
    });
  }
  const api = new BCClient();
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
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://johnwiese.bandcamp.com/album/soft-punk"
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
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}