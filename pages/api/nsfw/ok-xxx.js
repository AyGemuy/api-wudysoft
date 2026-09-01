import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class OkXxx {
  constructor() {
    this.baseUrl = "https://ok.xxx";
    this.corsUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      Referer: "https://ok.xxx/",
      Origin: "https://ok.xxx",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Cookie: "cookiesBanner=true; kt_tcookie=1;"
    };
  }
  _extractSlug(url) {
    if (!url) return "";
    let slug = url.replace(this.baseUrl, "").replace(/^\/+/, "").replace(/\/$/, "");
    if (slug.startsWith("http")) {
      try {
        const parsed = new URL(url);
        slug = parsed.pathname.replace(/^\/+/, "").replace(/\/$/, "");
      } catch {
        slug = url.split("/").filter(Boolean).pop() || "";
      }
    }
    return slug || "";
  }
  _formatUrl(input, type = "video") {
    if (!input) return "";
    const cleanInput = String(input).trim();
    if (cleanInput.startsWith("http")) return cleanInput;
    if (type === "video") {
      if (/^\d+$/.test(cleanInput)) {
        return `${this.baseUrl}/video/${cleanInput}/`;
      }
      const slug = cleanInput.replace(/^\/+/, "").replace(/\/+$/, "");
      if (slug.startsWith("video/")) {
        return `${this.baseUrl}/${slug}/`;
      }
      return `${this.baseUrl}/video/${slug}/`;
    }
    if (type === "model") {
      const slug = cleanInput.replace(/^\/+/, "").replace(/\/+$/, "");
      if (slug.startsWith("models/")) return `${this.baseUrl}/${slug}/`;
      return `${this.baseUrl}/models/${slug}/`;
    }
    if (type === "channel") {
      const slug = cleanInput.replace(/^\/+/, "").replace(/\/+$/, "");
      if (slug.startsWith("sites/") || slug.startsWith("channels/")) return `${this.baseUrl}/${slug}/`;
      return `${this.baseUrl}/sites/${slug}/`;
    }
    if (type === "tag") {
      const slug = cleanInput.replace(/^\/+/, "").replace(/\/+$/, "");
      if (slug.startsWith("tags/")) return `${this.baseUrl}/${slug}/`;
      return `${this.baseUrl}/tags/${slug}/`;
    }
    return `${this.baseUrl}/${cleanInput.replace(/^\/+/, "")}`;
  }
  async req(url, method = "GET", data = null) {
    try {
      const target = url.startsWith("http") ? url : `${this.baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      const finalUrl = `${this.corsUrl}${target}`;
      console.log(`[LOG] Fetching: ${target} (${method})`);
      const config = {
        method: method,
        url: finalUrl,
        headers: this.headers,
        timeout: 6e4,
        maxRedirects: 5
      };
      if (method === "POST" && data) {
        config.data = qs.stringify(data);
        config.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
        config.headers["X-Requested-With"] = "XMLHttpRequest";
      }
      const response = await axios(config);
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`[ERROR] Request Failed [${url}]: ${error.message}`);
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }
  _parseVideoItem($, el) {
    const $el = $(el);
    const linkEl = $el.find(".thumb-video a, a").first();
    const link = linkEl.attr("href") || "";
    const title = linkEl.attr("title") || $el.find("img").attr("alt") || $el.find(".thumb-bl-info a").first().text().trim() || "";
    const imgEl = $el.find("img");
    const poster = imgEl.attr("data-original") || imgEl.attr("data-src") || imgEl.attr("src") || "";
    const previewVideo = linkEl.attr("data-preview-custom") || "";
    const idMatch = link.match(/\/video\/(\d+)/);
    const id = idMatch ? idMatch[1] : "";
    const duration = $el.find(".video-meta li").filter((i, e) => $(e).find(".fa-clock-o").length > 0).find("span").first().text().trim();
    const uploaded = $el.find(".video-meta li").filter((i, e) => $(e).find(".fa-calendar-o").length > 0).find("span").first().text().trim();
    const views = $el.find(".video-meta li").filter((i, e) => $(e).find(".fa-eye").length > 0).find("span").first().text().trim();
    const channels = $el.find('.content_items a[href*="/sites/"]').map((i, a) => ({
      name: $(a).text().trim(),
      url: $(a).attr("href")?.startsWith("http") ? $(a).attr("href") : `${this.baseUrl}${$(a).attr("href")}`,
      slug: this._extractSlug($(a).attr("href"))
    })).get();
    const models = $el.find('.content_items a[href*="/models/"]').map((i, a) => ({
      name: $(a).text().trim(),
      url: $(a).attr("href")?.startsWith("http") ? $(a).attr("href") : `${this.baseUrl}${$(a).attr("href")}`,
      slug: this._extractSlug($(a).attr("href"))
    })).get();
    return {
      id: id,
      title: title,
      url: link.startsWith("http") ? link : `${this.baseUrl}${link}`,
      slug: this._extractSlug(link),
      poster: poster,
      preview_video: previewVideo,
      duration: duration,
      uploaded: uploaded,
      views: views,
      channels: channels,
      models: models
    };
  }
  _parsePagination($) {
    const pagination = $(".pagination");
    if (!pagination.length) return {};
    const current = parseInt(pagination.find(".pages li.active span, .pages li.active").first().text().trim()) || 1;
    let total = current;
    const lastHref = pagination.find(".pagination-last a").attr("href");
    if (lastHref) {
      const match = lastHref.match(/\/(\d+)\/?$/);
      if (match) total = parseInt(match[1]);
    } else {
      const pageNumbers = pagination.find(".pages li a").map((i, el) => {
        const num = parseInt($(el).text().trim());
        return isNaN(num) ? 0 : num;
      }).get();
      if (pageNumbers.length) total = Math.max(...pageNumbers, current);
    }
    const next = pagination.find(".pagination-next a").attr("href") || null;
    const prev = pagination.find(".pagination-prev a").attr("href") || null;
    return {
      current: current,
      total: total,
      next: next ? next.startsWith("http") ? next : `${this.baseUrl}${next}` : null,
      prev: prev ? prev.startsWith("http") ? prev : `${this.baseUrl}${prev}` : null
    };
  }
  async home({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/" : `/${page}/`;
      const $ = await this.req(url);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async popular({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/popular/" : `/popular/${page}/`;
      const $ = await this.req(url);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] Popular:", error.message);
      return {
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async trending({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/trending/" : `/trending/${page}/`;
      const $ = await this.req(url);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] Trending:", error.message);
      return {
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async search({
    keyword,
    page = 1
  }) {
    try {
      if (!keyword) throw new Error("Keyword is required");
      const url = page === 1 ? `/search/${encodeURIComponent(keyword)}/` : `/search/${encodeURIComponent(keyword)}/${page}/`;
      const $ = await this.req(url);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        keyword: keyword,
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        keyword: keyword,
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async detail({
    url
  }) {
    try {
      if (!url) throw new Error("URL is required");
      const targetUrl = this._formatUrl(url, "video");
      const $ = await this.req(targetUrl);
      const slug = this._extractSlug(targetUrl);
      const title = $("#player_wrap").attr("data-title") || $(".video-info .desc").first().text().trim() || $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim() || "";
      const poster = $("#my-video").attr("poster") || $(".kt-player img").attr("src") || $('meta[property="og:image"]').attr("content") || "";
      let hlsUrl = $(".kt-player").attr("data-url") || "";
      const scriptContent = $("script").text();
      if (!hlsUrl) {
        const hlsMatch = scriptContent.match(/(https?:\\\/\\\/[^"']+\.m3u8[^"']*)/i) || scriptContent.match(/["'](https?:\/\/[^"']+\/hls\/[^"']+)["']/i);
        if (hlsMatch) {
          hlsUrl = hlsMatch[1].replace(/\\\//g, "/");
        }
      }
      const sources = [];
      $("#my-video source").each((i, el) => {
        const src = $(el).attr("src");
        const label = $(el).attr("label") || $(el).attr("title") || "Auto";
        if (src && !sources.some(s => s.url === src)) {
          sources.push({
            label: label,
            url: src
          });
        }
      });
      const mainMeta = $(".video-info .video-meta").first();
      const views = mainMeta.find("li").filter((i, e) => $(e).find(".fa-eye").length > 0).find("span").first().text().trim() || "";
      const uploadDate = mainMeta.find("li").filter((i, e) => $(e).find(".fa-calendar-o").length > 0).find("span").first().text().trim() || "";
      const duration = mainMeta.find("li").filter((i, e) => $(e).find(".fa-clock-o").length > 0).find("span").first().text().trim() || "";
      const durationSeconds = parseInt($(".kt-player").attr("data-duration")) || 0;
      const channels = $('.video-info .video-link a[href*="/sites/"], .info-items a[href*="/sites/"]').map((i, a) => ({
        name: $(a).text().trim(),
        url: $(a).attr("href")?.startsWith("http") ? $(a).attr("href") : `${this.baseUrl}${$(a).attr("href")}`,
        slug: this._extractSlug($(a).attr("href"))
      })).get().filter((v, i, a) => a.findIndex(t => t.name === v.name) === i && v.name);
      const paysiteLink = $('.video-info a[href*="/paysite/"]').first();
      const paysite = paysiteLink.length ? {
        name: paysiteLink.text().trim(),
        url: paysiteLink.attr("href")?.startsWith("http") ? paysiteLink.attr("href") : `${this.baseUrl}${paysiteLink.attr("href")}`,
        slug: this._extractSlug(paysiteLink.attr("href"))
      } : null;
      const models = $('.video-info a[href*="/models/"], .info-items a[href*="/models/"]').map((i, a) => ({
        name: $(a).text().trim(),
        url: $(a).attr("href")?.startsWith("http") ? $(a).attr("href") : `${this.baseUrl}${$(a).attr("href")}`,
        slug: this._extractSlug($(a).attr("href"))
      })).get().filter((v, i, a) => a.findIndex(t => t.name === v.name) === i && v.name);
      const tags = $('.video-tags a, .info-items a[href*="/tags/"]').map((i, a) => ({
        name: $(a).text().replace(/^#/, "").trim(),
        url: $(a).attr("href")?.startsWith("http") ? $(a).attr("href") : `${this.baseUrl}${$(a).attr("href")}`,
        slug: this._extractSlug($(a).attr("href"))
      })).get().filter((v, i, a) => a.findIndex(t => t.name === v.name) === i && v.name);
      let description = "";
      $(".block-des .desc").each((i, el) => {
        const text = $(el).text().trim();
        if (text.startsWith("Description:")) {
          description = text.replace(/^Description:\s*/i, "").trim();
        }
      });
      if (!description) {
        description = $(".block-des .desc").first().text().trim();
      }
      const galleryHref = $(".video-link-gallery a, a.vodeo-gallery").attr("href") || "";
      const galleryUrl = galleryHref ? galleryHref.startsWith("http") ? galleryHref : `${this.baseUrl}${galleryHref}` : null;
      const screenshots = $(".swiper_screens .swiper-slide a.js-skip-to").map((i, a) => {
        const $a = $(a);
        return {
          time_second: parseFloat($a.attr("data-second")) || 0,
          image: $a.find("img").attr("data-src") || $a.find("img").attr("src") || ""
        };
      }).get().filter(s => s.image && !s.image.includes("data:image"));
      const timelineMatch = scriptContent.match(/let\s+\$timeline_screen\s*=\s*["']([^"']+)["']/);
      const timelineIntervalMatch = scriptContent.match(/let\s+\$timeline_screen_interval\s*=\s*(\d+)/);
      const related = $("#custom_list_videos_custom_related_videos_items .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        id: slug.replace(/[^0-9]/g, ""),
        slug: slug,
        title: title,
        poster: poster,
        description: description,
        duration: duration,
        duration_seconds: durationSeconds,
        views: views,
        upload_date: uploadDate,
        gallery_url: galleryUrl,
        media: {
          hls: hlsUrl,
          sources: sources
        },
        timeline: {
          base_url: timelineMatch ? timelineMatch[1] : "",
          interval: timelineIntervalMatch ? parseInt(timelineIntervalMatch[1]) : 20
        },
        paysite: paysite,
        channels: channels,
        models: models,
        tags: tags,
        screenshots: screenshots,
        related_videos: related
      };
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
  }
  async modelList({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/models/" : `/models/${page}/`;
      const $ = await this.req(url);
      const items = $(".thumb-bl").map((i, el) => {
        const $el = $(el);
        const link = $el.find("a").attr("href") || "";
        const name = $el.find("p").text().trim() || $el.find("a").attr("title") || "";
        const poster = $el.find("img").attr("data-original") || $el.find("img").attr("src") || "";
        const total = $el.find(".thumb-total").text().trim();
        return {
          name: name,
          url: link.startsWith("http") ? link : `${this.baseUrl}${link}`,
          slug: this._extractSlug(link),
          poster: poster,
          total_videos: total
        };
      }).get().filter(item => item.name && item.url.includes("/models/"));
      return {
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] ModelList:", error.message);
      return {
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async modelDetail({
    url,
    page = 1
  }) {
    try {
      if (!url) throw new Error("Model URL/slug is required");
      const targetUrl = this._formatUrl(url, "model");
      const finalTarget = page === 1 ? targetUrl : `${targetUrl.replace(/\/$/, "")}/${page}/`;
      const $ = await this.req(finalTarget);
      const name = $("h1").text().replace(/videos/i, "").trim() || this._extractSlug(targetUrl);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        name: name,
        slug: this._extractSlug(targetUrl),
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] ModelDetail:", error.message);
      return {
        name: "",
        slug: "",
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async channelList({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/channels/" : `/channels/${page}/`;
      const $ = await this.req(url);
      const items = $(".thumb-bl").map((i, el) => {
        const $el = $(el);
        const link = $el.find("a").attr("href") || "";
        const name = $el.find("p").text().trim() || $el.find("a").attr("title") || "";
        const poster = $el.find("img").attr("data-original") || $el.find("img").attr("src") || "";
        const total = $el.find(".thumb-total").text().trim();
        return {
          name: name,
          url: link.startsWith("http") ? link : `${this.baseUrl}${link}`,
          slug: this._extractSlug(link),
          poster: poster,
          total_videos: total
        };
      }).get().filter(item => item.name && (item.url.includes("/sites/") || item.url.includes("/channels/")));
      return {
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] ChannelList:", error.message);
      return {
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async channelDetail({
    url,
    page = 1
  }) {
    try {
      if (!url) throw new Error("Channel URL/slug is required");
      const targetUrl = this._formatUrl(url, "channel");
      const finalTarget = page === 1 ? targetUrl : `${targetUrl.replace(/\/$/, "")}/${page}/`;
      const $ = await this.req(finalTarget);
      const name = $("h1").text().replace(/videos/i, "").trim() || this._extractSlug(targetUrl);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        name: name,
        slug: this._extractSlug(targetUrl),
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] ChannelDetail:", error.message);
      return {
        name: "",
        slug: "",
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
  async tagList() {
    try {
      const $ = await this.req("/tags/");
      const items = $(".tags-list a, .tag-list a, ul.tags li a, .items.tags .thumb-bl a").map((i, el) => {
        const $el = $(el);
        const name = $el.text().replace(/^#/, "").trim();
        const url = $el.attr("href") || "";
        return {
          name: name,
          url: url.startsWith("http") ? url : `${this.baseUrl}${url}`,
          slug: this._extractSlug(url)
        };
      }).get().filter(item => item.name);
      return items;
    } catch (error) {
      console.error("[ERROR] TagList:", error.message);
      return [];
    }
  }
  async tagDetail({
    url,
    page = 1
  }) {
    try {
      if (!url) throw new Error("Tag URL/slug is required");
      const targetUrl = this._formatUrl(url, "tag");
      const finalTarget = page === 1 ? targetUrl : `${targetUrl.replace(/\/$/, "")}/${page}/`;
      const $ = await this.req(finalTarget);
      const name = $("h1").text().replace(/videos/i, "").trim() || this._extractSlug(targetUrl);
      const items = $(".list_video_wrapper .thumb-bl-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url && item.id);
      return {
        name: name,
        slug: this._extractSlug(targetUrl),
        page: page,
        items: items,
        pagination: this._parsePagination($)
      };
    } catch (error) {
      console.error("[ERROR] TagDetail:", error.message);
      return {
        name: "",
        slug: "",
        page: page,
        items: [],
        pagination: {}
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "popular", "trending", "search", "detail", "models", "model_detail", "channels", "channel_detail", "tags", "tag_detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/api/okxxx?action=detail&url=776554"
      }
    });
  }
  const api = new OkXxx();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail' (dapat berupa ID, slug, atau URL penuh)."
          });
        }
        response = await api.detail(params);
        break;
      case "models":
        response = await api.modelList(params);
        break;
      case "model_detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'model_detail'."
          });
        }
        response = await api.modelDetail(params);
        break;
      case "channels":
        response = await api.channelList(params);
        break;
      case "channel_detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'channel_detail'."
          });
        }
        response = await api.channelDetail(params);
        break;
      case "tags":
        response = await api.tagList();
        break;
      case "tag_detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'tag_detail'."
          });
        }
        response = await api.tagDetail(params);
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