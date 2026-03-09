import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
const proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v18?url=`;
console.log("CORS proxy", proxy);
class R34Scraper {
  constructor() {
    this.baseUrl = "https://rule34.tube";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: this.baseUrl
    };
  }
  async req({
    url
  }) {
    try {
      console.log(`[LOG] Processing: ${url}`);
      const {
        data
      } = await axios.get(`${proxy}${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      return cheerio.load(data);
    } catch (err) {
      console.error(`[ERR] Failed to access ${url}: ${err?.message}`);
      return null;
    }
  }
  parseList($, selector) {
    if (!$(selector).length) return [];
    return $(selector).map((i, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const $img = $el.find("img").first();
      const $stats = $el.find(".thumb-bottom");
      const idData = $a.attr("data-fav-video-id") || $a.attr("data-rt")?.split(":")[3] || $a.attr("href")?.match(/\/video\/([^\/]+)/)?.[1] || null;
      return {
        id: idData,
        title: $el.find(".title").text().trim() || "Untitled",
        link: $a.attr("href") || "",
        thumbnail: {
          static: $img.attr("data-original") || $img.attr("src") || "",
          preview_video: $img.attr("data-preview") || null
        },
        meta: {
          duration: $el.find(".time").text().trim() || "00:00",
          quality: $el.find(".qualtiy").text().trim() || "SD",
          views: $stats.find(".thumb-item").eq(0).text().trim().replace(/\s+/g, "") || "0",
          rating: $stats.find(".thumb-item").eq(1).text().trim() || "0%",
          date: $stats.find(".thumb-item-date").text().trim() || ""
        }
      };
    }).get();
  }
  extractFlashvars($) {
    const config = {};
    const scriptHtml = $("script").map((i, el) => $(el).html()).get().find(html => html && html.includes("var flashvars ="));
    if (!scriptHtml) return config;
    const regex = /([a-zA-Z0-9_]+)\s*:\s*'([^']*)'/g;
    const matches = scriptHtml.matchAll(regex);
    for (const match of matches) {
      config[match[1]] = match[2];
    }
    return config;
  }
  buildSourceLink(rawUrl, rndCode) {
    if (!rawUrl) return null;
    let cleanUrl = rawUrl.replace(/^function\/0\//, "");
    if (rndCode) {
      const separator = cleanUrl.includes("?") ? "&" : "?";
      cleanUrl = `${cleanUrl}${separator}rnd=${rndCode}`;
    }
    return cleanUrl;
  }
  async home() {
    const $ = await this.req({
      url: this.baseUrl
    });
    if (!$) return {
      status: false,
      message: "Failed loading Home"
    };
    console.log("[LOG] Parsing Home Sections...");
    const tags = $(".tags-row .swiper-slide a").map((i, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr("href")
    })).get();
    const watching = this.parseList($, "#list_videos_videos_watched_right_now_items .thumb");
    const latest = this.parseList($, "#list_videos_most_recent_videos_items .thumb");
    const categories = $("#list_categories_categories_list_items .thumb").map((i, el) => ({
      name: $(el).find(".title").text().trim(),
      url: $(el).find("a").attr("href"),
      image: $(el).find("img").attr("src"),
      count: $(el).find(".thumb-item").eq(0).text().trim()
    })).get();
    return {
      status: true,
      data: {
        popular_tags: tags,
        videos_being_watched: watching,
        newest_videos: latest,
        top_categories: categories
      }
    };
  }
  async search({
    query,
    page = 1
  }) {
    if (!query) return {
      status: false,
      message: "Query empty"
    };
    const cleanQuery = query.trim().replace(/\s+/g, "-");
    const searchUrl = `${this.baseUrl}/search/${cleanQuery}/${page > 1 ? `?from_videos=${page}` : ""}`;
    const $ = await this.req({
      url: searchUrl
    });
    if (!$) return {
      status: false,
      message: "Search Request Error"
    };
    console.log(`[LOG] Parsing Search Results Page ${page}...`);
    const results = this.parseList($, "#list_videos_videos_list_search_result_items .thumb");
    const $pagination = $(".pagination");
    return {
      status: true,
      meta: {
        query: query,
        page: page,
        total_on_page: results.length
      },
      data: {
        results: results,
        pagination: {
          current: parseInt($pagination.find(".active").text()) || page,
          has_next: $pagination.find(".next").length > 0,
          next_url: $pagination.find(".next").attr("href") || null
        }
      }
    };
  }
  async detail({
    url
  }) {
    if (!url) return {
      status: false,
      message: "URL required"
    };
    const $ = await this.req({
      url: url
    });
    if (!$) return {
      status: false,
      message: "Detail Request Error"
    };
    console.log("[LOG] Extracting Full Video Metadata...");
    const title = $(".title-holder .title").text().trim();
    const uploader = $(".top-options .sub-btn .text em").text().trim();
    const model = $(".top-options .btn.gold").text().trim() || null;
    const tags = $(".block.tags-row a").map((i, el) => ({
      name: $(el).text().trim(),
      url: $(el).attr("href")
    })).get();
    const screenshots = $(".block-screenshots .screen-img").map((i, el) => ({
      full: $(el).attr("href") || $(el).find("img").attr("data-original"),
      thumb: $(el).find("img").attr("src")
    })).get();
    const vars = this.extractFlashvars($);
    const rnd = vars.rnd || "";
    const sources = [];
    if (vars.video_url) {
      sources.push({
        label: vars.video_url_text || "Default",
        type: "video/mp4",
        file: this.buildSourceLink(vars.video_url, rnd)
      });
    }
    Object.keys(vars).forEach(key => {
      if (key.startsWith("video_alt_url")) {
        const cleanLink = this.buildSourceLink(vars[key], rnd);
        const label = vars[`${key}_text`] || "HD";
        if (cleanLink && !sources.find(s => s.file === cleanLink)) {
          sources.push({
            label: label,
            type: "video/mp4",
            file: cleanLink
          });
        }
      }
    });
    return {
      status: true,
      result: {
        title: title,
        author: {
          uploader: uploader,
          model: model
        },
        tags: tags,
        stats: {
          duration: $(".title-holder .icon-oclock").parent().text().trim(),
          views: $(".title-holder .icon-eye").parent().text().trim(),
          likes: $(".rate-like").text().trim()
        },
        media: {
          poster: vars.preview_url || null,
          video_sources: sources,
          screenshots: screenshots
        },
        related_videos: this.parseList($, "#list_videos_related_videos_items .thumb")
      }
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail"];
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
      case "home":
        response = await api.home();
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
            example: "https://rule34.tube/video/the-futa-domination-world-rye-and-sister-act/"
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