import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
const proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v18?url=`;
console.log("CORS proxy", proxy);
class R34Scraper {
  constructor() {
    this.baseUrl = "https://rule34video.com";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: this.baseUrl
    };
  }
  cleanUrl(url) {
    return url?.replace(/^function\/\d+\//, "")?.trim() || null;
  }
  async req({
    url
  }) {
    console.log(`[LOG] Request: ${url}`);
    try {
      const {
        data
      } = await axios.get(`${proxy}${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      return cheerio.load(data);
    } catch (e) {
      console.error(`[ERR] ${e.message}`);
      return null;
    }
  }
  parseGrid($) {
    return $(".thumbs .item.thumb").map((i, el) => {
      const node = $(el);
      const a = node.find("a.th");
      const img = a.find("img");
      const info = node.find(".thumb_info");
      return {
        id: a.attr("href")?.split("/video/")?.[1]?.split("/")?.[0] || null,
        title: node.find(".thumb_title").text()?.trim(),
        link: a.attr("href")?.startsWith("http") ? a.attr("href") : `${this.baseUrl}${a.attr("href")}`,
        media: {
          thumb_static: img.attr("data-original") || img.attr("src"),
          thumb_webp: img.attr("data-webp"),
          preview_video: node.find(".wrap_image").attr("data-preview")
        },
        meta: {
          duration: node.find(".time").text()?.trim(),
          quality_hd: node.find(".quality .custom-hd").length > 0,
          is_futa: node.find(".futa").length > 0,
          views: info.find(".views").text()?.trim(),
          rating: info.find(".rating").text()?.trim(),
          uploaded: info.find(".added").text()?.trim()
        }
      };
    }).get();
  }
  async latest({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? `${this.baseUrl}/latest-updates/` : `${this.baseUrl}/latest-updates/${page}/`;
      const $ = await this.req({
        url: url
      });
      if (!$) return {
        success: false
      };
      return {
        success: true,
        source: "latest",
        page: page,
        pagination: {
          has_next: $(".pagination .next").length > 0,
          total_items_approx: $(".headline .total_results").text()?.replace(/\D/g, "") || "0"
        },
        results: this.parseGrid($)
      };
    } catch (e) {
      return {
        success: false,
        msg: e.message
      };
    }
  }
  async search({
    query,
    page = 1
  } = {}) {
    try {
      const q = query.replace(/\s+/g, "+");
      const url = `${this.baseUrl}/search/${q}/${page > 1 ? `?from_videos=${page}` : ""}`;
      const $ = await this.req({
        url: url
      });
      if (!$) return {
        success: false
      };
      return {
        success: true,
        source: "search",
        query: query,
        page: page,
        pagination: {
          total_found: $(".headline .total_results").text()?.replace(/\D/g, "") || "0"
        },
        results: this.parseGrid($)
      };
    } catch (e) {
      return {
        success: false,
        msg: e.message
      };
    }
  }
  async detail({
    url
  }) {
    console.log(`[LOG] Parsing Detail: ${url}`);
    try {
      const $ = await this.req({
        url: url
      });
      if (!$) return {
        success: false
      };
      const scriptData = $('script:contains("flashvars")').html() || "";
      const flashvars = [...scriptData.matchAll(/(\w+):\s*'([^']*)'/g)].reduce((acc, [_, key, val]) => ({
        ...acc,
        [key]: val
      }), {});
      const filesFromScript = Object.keys(flashvars).filter(key => key.endsWith("_text") && key.includes("video")).reduce((acc, textKey) => {
        const label = flashvars[textKey];
        const urlKey = textKey.replace("_text", "");
        if (flashvars[urlKey]) {
          acc[label] = this.cleanUrl(flashvars[urlKey]);
        }
        return acc;
      }, {});
      if (flashvars.video_url && !filesFromScript[flashvars.video_url_text || "360p"]) {
        const label = flashvars.video_url_text || "360p";
        filesFromScript[label] = this.cleanUrl(flashvars.video_url);
      }
      const filesFromButton = $('.label:contains("Download")').parent().find("a.tag_item").map((i, el) => ({
        label: $(el).text()?.replace("MP4", "")?.trim(),
        url: this.cleanUrl($(el).attr("href"))
      })).get().reduce((acc, item) => ({
        ...acc,
        [item.label]: item.url
      }), {});
      return {
        success: true,
        info: {
          id: flashvars.video_id || url.split("/video/")?.[1]?.split("/")?.[0],
          title: $(".title_video").text()?.trim(),
          duration: $(".item_info svg.custom-time").next("span").text()?.trim(),
          poster: flashvars.preview_url || $(".fp-poster img").attr("src"),
          preview_animation: flashvars.preview_url3 || null
        },
        meta: {
          artist: $('.col .label:contains("Artist")').next("a.item").text()?.trim() || "Unknown",
          uploader: $('.col .label:contains("Uploaded by")').next("a.item").text()?.trim() || "Unknown",
          views: $(".item_info svg.custom-eye").next("span").text()?.trim(),
          added: $(".item_info svg.custom-calendar").next("span").text()?.trim(),
          votes: $(".voters.count").text()?.trim()
        },
        taxonomies: {
          categories: $('.col .label:contains("Categories") ~ a.item').map((i, el) => ({
            name: $(el).text()?.trim(),
            url: $(el).attr("href")
          })).get(),
          tags: $('.label:contains("Tags") ~ a.tag_item').not(".tag_item_suggest").map((i, el) => $(el).text()?.trim()).get()
        },
        files: {
          ...filesFromButton,
          ...filesFromScript
        }
      };
    } catch (e) {
      console.error(`[ERR] Detail: ${e.message}`);
      return {
        success: false,
        msg: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["latest", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=isekai"
      }
    });
  }
  const api = new R34Scraper();
  try {
    let response;
    switch (action) {
      case "latest":
        response = await api.latest(params);
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
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://rule34video.com/video/4202561/ultimate-stellar-blade-compilation/"
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