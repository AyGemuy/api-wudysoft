import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
const proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v18?url=`;
console.log("CORS proxy", proxy);
class R34Scraper {
  constructor() {
    this.baseUrl = "https://rule34.xxx";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: this.baseUrl
    };
  }
  async req({
    url
  }) {
    try {
      console.log(`[LOG] Fetching: ${url}`);
      const {
        data
      } = await axios.get(`${proxy}${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      return cheerio.load(data);
    } catch (err) {
      console.error(`[ERR] Request Error: ${err.message}`);
      return null;
    }
  }
  parseList($, selector) {
    if (!$(selector).length) return [];
    return $(selector).map((i, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const $img = $el.find("img").first();
      const titleRaw = $img.attr("title") || "";
      const scoreMatch = titleRaw.match(/score:(\d+)/);
      const ratingMatch = titleRaw.match(/rating:([a-z]+)/);
      const tags = titleRaw.replace(/score:\d+/g, "").replace(/rating:[a-z]+/g, "").trim().split(" ");
      return {
        id: $a.attr("id")?.replace("p", "") || null,
        preview_url: $img.attr("src"),
        url: this.baseUrl + "/" + $a.attr("href"),
        type: $img.hasClass("webm-thumb") ? "video" : "image",
        stats: {
          score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
          rating: ratingMatch ? ratingMatch[1] : "unknown",
          tags_count: tags.length
        },
        tags: tags.slice(0, 5)
      };
    }).get();
  }
  parseTags($) {
    const tags = {
      copyright: [],
      character: [],
      artist: [],
      general: [],
      metadata: []
    };
    $("#tag-sidebar li").each((i, el) => {
      const $el = $(el);
      const className = $el.attr("class") || "";
      const tagName = $el.find('a[href*="tags="]').text().trim();
      const count = $el.find(".tag-count").text().trim();
      if (!tagName) return;
      const tagObj = {
        name: tagName,
        count: count
      };
      if (className.includes("copyright")) tags.copyright.push(tagObj);
      else if (className.includes("character")) tags.character.push(tagObj);
      else if (className.includes("artist")) tags.artist.push(tagObj);
      else if (className.includes("metadata")) tags.metadata.push(tagObj);
      else tags.general.push(tagObj);
    });
    return tags;
  }
  async home({
    page = 1
  } = {}) {
    const pid = (page - 1) * 42;
    const url = `${this.baseUrl}/index.php?page=post&s=list&tags=all&pid=${pid}`;
    const $ = await this.req({
      url: url
    });
    if (!$) return {
      status: false,
      message: "Failed to load home"
    };
    const posts = this.parseList($, ".image-list .thumb");
    return {
      status: true,
      page: page,
      count: posts.length,
      posts: posts
    };
  }
  async search({
    query,
    page = 1
  }) {
    const cleanQuery = query.replace(/\s+/g, "+");
    const pid = (page - 1) * 42;
    const url = `${this.baseUrl}/index.php?page=post&s=list&tags=${cleanQuery}&pid=${pid}`;
    const $ = await this.req({
      url: url
    });
    if (!$) return {
      status: false,
      message: "Search failed"
    };
    const posts = this.parseList($, ".image-list .thumb");
    return {
      status: true,
      query: query,
      page: page,
      results: posts
    };
  }
  async detail({
    id
  }) {
    if (!id) return {
      status: false,
      message: "ID required"
    };
    const url = `${this.baseUrl}/index.php?page=post&s=view&id=${id}`;
    const $ = await this.req({
      url: url
    });
    if (!$) return {
      status: false,
      message: "Failed to load detail"
    };
    console.log(`[LOG] Parsing Detail ID: ${id}`);
    let mediaInfo = {};
    let fileUrl = null;
    const scriptContent = $("script").map((i, el) => $(el).html()).get().find(s => s && s.includes("image = {") && s.includes("'domain'"));
    if (scriptContent) {
      try {
        const match = scriptContent.match(/image\s*=\s*({.*?});/);
        if (match && match[1]) {
          const jsonStr = match[1].replace(/'/g, '"');
          const domain = match[1].match(/'domain':'(.*?)'/)?.[1] || "";
          const baseDir = match[1].match(/'base_dir':'(.*?)'/)?.[1] || "";
          const imgFile = match[1].match(/'img':'(.*?)'/)?.[1] || "";
          const dir = match[1].match(/'dir':(\d+)/)?.[1];
        }
      } catch (e) {
        console.error("JS Parse error", e);
      }
    }
    let type = "image";
    let originalLink = $(".link-list li a").filter((i, el) => $(el).text().trim() === "Original image").attr("href");
    const videoElem = $("#gelcomVideoPlayer source");
    if (videoElem.length > 0) {
      type = "video";
      fileUrl = videoElem.attr("src");
    } else if (originalLink) {
      fileUrl = originalLink;
      if (fileUrl.endsWith(".mp4") || fileUrl.endsWith(".webm")) type = "video";
    } else {
      fileUrl = $("#image").attr("src");
    }
    const statsMap = {};
    $("#stats ul li").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Posted:")) {
        statsMap.posted = text.replace("Posted:", "").split("by")[0].trim();
        statsMap.uploader = $(el).find("a").text().trim();
      } else if (text.includes("Size:")) {
        statsMap.size = text.replace("Size:", "").trim();
      } else if (text.includes("Source:")) {
        statsMap.source = $(el).find("a").attr("href");
      } else if (text.includes("Rating:")) {
        statsMap.rating = text.replace("Rating:", "").trim();
      } else if (text.includes("Score:")) {
        statsMap.score = $(el).find("span").text().trim();
      }
    });
    const tags = this.parseTags($);
    return {
      status: true,
      data: {
        id: id,
        type: type,
        file_url: fileUrl,
        preview_url: $("#image").attr("src") || $("#gelcomVideoPlayer").attr("poster"),
        info: statsMap,
        tags: tags
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
        response = await api.home(params);
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
            example: "16368665"
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