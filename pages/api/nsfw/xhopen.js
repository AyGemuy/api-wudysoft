import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class Xhopen {
  constructor() {
    this.baseUrl = "https://xhopen.com";
    this.corsUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      Referer: "https://xhopen.com/",
      Origin: "https://xhopen.com",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      Priority: "u=0, i",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
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
  _formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const sec = parseInt(seconds, 10);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor(sec % 3600 / 60);
    const remSecs = sec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
  }
  _formatViews(views) {
    if (!views || isNaN(views)) return views || "0";
    const num = Number(views);
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toLocaleString();
  }
  _extractInitialsJson(htmlString) {
    if (!htmlString) return null;
    try {
      const match = htmlString.match(/window\.initials\s*=\s*(\{.+?\});\s*(?:<\/script>|\n)/s);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.warn("[WARN] Failed to parse window.initials JSON:", e.message);
    }
    return null;
  }
  _extractMetaTags($) {
    const meta = {};
    $("meta").each((i, el) => {
      const name = $(el).attr("name") || $(el).attr("property") || "";
      const content = $(el).attr("content") || "";
      if (name && content) {
        if (meta[name]) {
          if (Array.isArray(meta[name])) {
            meta[name].push(content);
          } else {
            meta[name] = [meta[name], content];
          }
        } else {
          meta[name] = content;
        }
      }
    });
    return meta;
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
      const html = response.data;
      const $ = cheerio.load(html);
      const jsonInitials = this._extractInitialsJson(html);
      return {
        $: $,
        html: html,
        jsonInitials: jsonInitials
      };
    } catch (error) {
      console.error(`[ERROR] Request Failed [${url}]: ${error.message}`);
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }
  _parseVideoJson(item) {
    if (!item || !item.pageURL && !item.url) return null;
    const pageUrl = item.pageURL || item.url || "";
    return {
      id: String(item.id || item.idHash || ""),
      title: item.title || "",
      url: pageUrl,
      slug: this._extractSlug(pageUrl),
      poster: item.imageURL || item.thumbBig || item.thumbURL || item.thumbUrl || "",
      preview_thumb: item.previewThumbURL || "",
      preview_video: {
        av1: item.trailerURL || "",
        mp4: item.trailerFallbackUrl || ""
      },
      sprite: item.spriteURL || "",
      duration: this._formatDuration(item.duration),
      duration_raw: item.duration || 0,
      quality: item.isUHD ? "4K" : item.isHD ? "HD" : "SD",
      views: this._formatViews(item.views),
      views_raw: item.views || 0,
      created_at: item.created ? new Date(item.created * 1e3).toISOString() : null,
      uploader: {
        type: item.landing?.type || (item.landingUrl ? "channel" : "creator"),
        name: item.landing?.name || item.landingName || "",
        url: item.landing?.link || item.landingUrl || "",
        slug: this._extractSlug(item.landing?.link || item.landingUrl),
        avatar: item.landing?.logo || item.landingThumbUrl || ""
      }
    };
  }
  _parseVideoHtml($, el) {
    const $el = $(el);
    if ($el.hasClass("thumb-list-mobile-item--widget") || $el.find(".nme-RDcam-thumb").length) {
      return null;
    }
    const linkEl = $el.find('a[data-role="thumb-link"]').first();
    const link = linkEl.attr("href") || $el.find("a.mobile-video-thumb__name").attr("href") || "";
    if (!link || link.includes("/ff/out") || link.includes("xham.live")) return null;
    const id = $el.attr("data-ecommerce-list-item") || $el.find(".mobile-video-thumb").attr("data-video-id") || "";
    const title = $el.find(".mobile-video-thumb__name").text().trim() || linkEl.attr("aria-label") || $el.find("img").attr("alt") || "";
    const imgEl = $el.find("img[data-role='thumb-preview-img'], img").first();
    let poster = imgEl.attr("src") || imgEl.attr("srcset")?.split(" ")?.[0] || "";
    const duration = $el.find(".time time").text().trim() || $el.find(".time").text().trim() || "";
    const is4k = $el.find('use[*|href*="4k"]').length > 0;
    const views = $el.find(".video-thumb-views").text().trim() || "";
    const uploaderEl = $el.find(".video-thumb-uploader");
    const uploaderName = uploaderEl.find(".video-uploader__name").text().trim() || "";
    const uploaderUrl = uploaderEl.find(".video-uploader__name").attr("href") || "";
    const uploaderAvatar = uploaderEl.find(".video-uploader-logo").attr("data-background-image") || "";
    return {
      id: id,
      title: title,
      url: link,
      slug: this._extractSlug(link),
      poster: poster?.split("?")[0] || poster,
      preview_thumb: "",
      preview_video: {
        av1: linkEl.attr("data-previewvideo") || "",
        mp4: linkEl.attr("data-previewvideo-fallback") || ""
      },
      sprite: $el.find(".thumb-image-container__sprite").attr("data-sprite") || "",
      duration: duration,
      quality: is4k ? "4K" : "HD",
      views: views,
      uploader: {
        type: "creator",
        name: uploaderName,
        url: uploaderUrl,
        slug: this._extractSlug(uploaderUrl),
        avatar: uploaderAvatar
      }
    };
  }
  async home({
    page = 1
  }) {
    try {
      const url = page === 1 ? "/" : `/${page}`;
      const {
        $,
        jsonInitials
      } = await this.req(url);
      let items = [];
      const jsonList = jsonInitials?.layoutPage?.videoListProps?.videoThumbProps || jsonInitials?.videoListProps?.videoThumbProps;
      if (Array.isArray(jsonList) && jsonList.length > 0) {
        items = jsonList.map(item => this._parseVideoJson(item)).filter(Boolean);
      } else {
        items = $("li.thumb-list-mobile-item--type-video").map((i, el) => this._parseVideoHtml($, el)).get().filter(Boolean);
      }
      const pagination = $(".mobile-pagination, .pagination");
      const current = jsonInitials?.paginationComponent?.currentPageNumber || pagination.find(".page-button-link--active").text().trim() || page;
      const totalPages = jsonInitials?.paginationComponent?.lastPageNumber || pagination.find(".page-button-link").last().text().trim() || current;
      const result = {
        page: parseInt(current) || 1,
        items: items,
        pagination: {
          current: parseInt(current) || 1,
          total: parseInt(totalPages) || 1,
          next: pagination.find(".prev-next-list-link--next").attr("href") || null,
          prev: pagination.find(".prev-next-list-link--prev").attr("href") || null
        }
      };
      console.log(`[LOG] Home: Found ${items.length} items on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {
        page: 1,
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
      const sanitized = encodeURIComponent(keyword.trim().replace(/\s+/g, "+"));
      const url = page === 1 ? `/search/${sanitized}` : `/search/${sanitized}?page=${page}`;
      const {
        $,
        jsonInitials
      } = await this.req(url);
      let items = [];
      const jsonList = jsonInitials?.searchResult?.videoThumbProps || jsonInitials?.searchPage?.videoListProps?.videoThumbProps || jsonInitials?.layoutPage?.videoListProps?.videoThumbProps;
      if (Array.isArray(jsonList) && jsonList.length > 0) {
        items = jsonList.map(item => this._parseVideoJson(item)).filter(Boolean);
      } else {
        items = $("li.thumb-list-mobile-item--type-video").map((i, el) => this._parseVideoHtml($, el)).get().filter(Boolean);
      }
      const resultCountText = jsonInitials?.searchTitleSummaryComponent?.resultCount || jsonInitials?.entity?.total || $('[data-role="search-result-count"]').text().trim() || "";
      const pagination = $(".mobile-pagination");
      const current = jsonInitials?.paginationComponent?.currentPageNumber || jsonInitials?.entity?.paging?.active || pagination.find(".page-button-link--active").text().trim() || page;
      const totalPages = jsonInitials?.paginationComponent?.lastPageNumber || jsonInitials?.entity?.paging?.maxPages || pagination.find(".page-limit-button--right a").text().trim() || current;
      const suggestions = jsonInitials?.filterSearchSuggestions?.filterSuggestionsProps?.suggestions?.map(s => s.text) || jsonInitials?.entity?.searchSuggestions?.map(s => s.text) || [];
      const suggestionCreators = jsonInitials?.filterSearchSuggestions?.searchSuggestionsProps?.creators || jsonInitials?.entity?.suggestionCreators || [];
      const result = {
        keyword: keyword,
        page: parseInt(current) || 1,
        total_results: resultCountText,
        suggestions: suggestions,
        creators: suggestionCreators,
        items: items,
        pagination: {
          current: parseInt(current) || 1,
          total: parseInt(totalPages) || 1,
          next: pagination.find(".prev-next-list-link--next").attr("href") || null,
          prev: pagination.find(".prev-next-list-link--prev").attr("href") || null
        }
      };
      console.log(`[LOG] Search: Found ${items.length} items for "${keyword}"`);
      return result;
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        keyword: keyword,
        page: 1,
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
      const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
      const {
        $,
        jsonInitials
      } = await this.req(fullUrl);
      const entity = jsonInitials?.videoEntity || jsonInitials?.videoControlsBlock?.video || {};
      const videoInfo = jsonInitials?.videoInfo || {};
      const videoModel = jsonInitials?.videoModel || {};
      const title = entity.title || videoInfo.title || $("h1.title-3e2be").text().trim() || $("h1").first().text().trim() || "";
      const description = entity.description || $('meta[name="description"]').attr("content") || "";
      const slug = this._extractSlug(fullUrl);
      const hlsPreload = $('link[as="fetch"][href*=".m3u8"]').attr("href") || "";
      const directVideoUrl = $("video.video_container__no-script-video, video#xplayer__video").attr("src") || hlsPreload;
      const poster = entity.thumbBig || videoInfo.thumbUrl || $('meta[property="og:image"]').attr("content") || "";
      const views = entity.views ? this._formatViews(entity.views) : videoInfo.views ? this._formatViews(videoInfo.views) : $(".xplayer-views-info").first().text().trim();
      const viewsRaw = entity.views || videoInfo.views || 0;
      const durationSec = entity.duration || videoInfo.duration || videoModel.duration || 0;
      const duration = this._formatDuration(durationSec);
      const dateAgo = entity.dateAgo || $("time.date-ago").text().trim() || "";
      const commentsCount = entity.commentsCount || parseInt($('[data-testid="video-controls-comments-counter"]').text().trim()) || 0;
      const rating = {
        likes: entity.rating?.likes ?? parseInt($(".rateYes .rate-counter").text().trim()) ?? 0,
        dislikes: entity.rating?.dislikes ?? parseInt($(".rateNo .rate-counter").text().trim()) ?? 0,
        percentage: entity.rating?.value ? `${entity.rating.value}%` : ""
      };
      const channelObj = videoModel.channelModel || {};
      const authorObj = videoModel.author || {};
      const uploader = {
        name: channelObj.channelName || authorObj.name || videoInfo.landingName || $(".subscribe-block__name").text().trim() || "",
        url: channelObj.channelURL || authorObj.pageURL || videoInfo.landingUrl || $(".subscribe-block__info").attr("href") || "",
        avatar: channelObj.siteLogoURL || videoInfo.landingThumbUrl || $(".subscribe-block__thumb img").attr("src") || "",
        type: channelObj.channelName ? "channel" : "creator"
      };
      const pornstars = (entity.pornstarModels || []).map(p => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        avatar: p.thumb?.avatar1 ? `https://ic-tt-nss.xhcdn.com/000/${String(p.id).padStart(6, "0").slice(0, 3)}/${String(p.id).padStart(6, "0").slice(3)}/avatar1.${p.thumb.avatar1}` : "",
        url: `${this.baseUrl}/pornstars/${p.inurl || p.slug}`
      }));
      const tagsList = jsonInitials?.videoTagsComponent?.tags || [];
      const tags = tagsList.map(t => ({
        id: t.id,
        name: t.name || t.nameEn,
        slug: t.slug,
        url: t.url,
        type: t.isPornstar ? "pornstar" : t.isChannel ? "channel" : t.isCategory ? "category" : "tag"
      }));
      const subtitles = (jsonInitials?.xplayerPluginSettings?.subtitles?.tracks || []).map(s => ({
        label: s.label,
        lang: s.lang,
        src: s.urls?.vtt || "",
        is_original: !!s.isOriginal
      }));
      const capturedFrames = entity.capturedFrames || [];
      let related = [];
      const jsonRelated = jsonInitials?.xplayerPluginSettings?.relatedVideos;
      if (Array.isArray(jsonRelated) && jsonRelated.length > 0) {
        related = jsonRelated.map(item => this._parseVideoJson(item)).filter(Boolean);
      } else {
        related = $('.video_block[data-ecommerce-list-name="related"] li.thumb-list-mobile-item--type-video').map((i, el) => this._parseVideoHtml($, el)).get().filter(Boolean);
      }
      const metaTags = this._extractMetaTags($);
      const result = {
        id: String(entity.id || videoModel.id || ""),
        title: title,
        description: description,
        slug: slug,
        url: fullUrl,
        poster: poster?.split("?")[0] || poster,
        video_src: directVideoUrl,
        hls_stream: hlsPreload,
        duration: duration,
        duration_raw: durationSec,
        views: views,
        views_raw: viewsRaw,
        published: dateAgo,
        rating: rating,
        comments_count: commentsCount,
        max_resolution: entity.maxResolution || "1080p",
        subtitles: subtitles,
        uploader: uploader,
        pornstars: pornstars,
        tags: tags,
        timeline_frames: capturedFrames,
        related: related,
        meta_tags: metaTags,
        raw: {
          title_full: title,
          meta_description: $('meta[name="description"]').attr("content") || "",
          meta_keywords: $('meta[name="keywords"]').attr("content") || ""
        }
      };
      console.log(`[LOG] Detail Success: ${title}`);
      return result;
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
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
        example: "/api/xhopen?action=search&keyword=coco"
      }
    });
  }
  const api = new Xhopen();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
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
            error: "Parameter 'url' wajib diisi untuk action 'detail'. Bisa berupa URL penuh atau slug (contoh: videos/coco-lovelock-confesses-desire-and-turns-up-the-heat-at-home-xhETlaJ)."
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