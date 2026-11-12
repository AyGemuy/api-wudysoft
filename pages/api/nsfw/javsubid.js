import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class JavSubId {
  constructor() {
    this.baseUrl = "https://javsubid.tv";
    this.corsUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      Referer: "https://javsubid.tv/",
      Origin: "https://javsubid.tv",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      Priority: "u=0, i",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    };
    this.decryptionKey = "KmzWa8awaallakclnuamigiskhasdyudwjhwqw";
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
  _decodeDatalink(encoded) {
    if (!encoded) return null;
    try {
      const prefix = encoded.substring(0, 32);
      const rest = encoded.substring(32);
      const base64Len = rest.length - 64;
      let base64Part = rest.substring(0, base64Len);
      base64Part = base64Part.replace(/\//g, "=");
      const decodedBase64 = Buffer.from(base64Part, "base64").toString("binary");
      const key = this.decryptionKey;
      let result = "";
      for (let i = 0; i < decodedBase64.length; i++) {
        const charCode = decodedBase64.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result || null;
    } catch (error) {
      console.warn("[WARN] Failed to decode datalink:", error.message);
      return null;
    }
  }
  async req(url, method = "GET", data = null) {
    try {
      const target = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
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
    const link = $el.find("a").attr("href") || "";
    const title = $el.find(".entry-header span").text().trim() || $el.find(".entry-title").text().trim() || "";
    const code = title.split(" ")[0] || "";
    const poster = $el.find(".post-thumbnail-container img").attr("src") || $el.find(".post-thumbnail-container img").attr("data-src") || "";
    const views = $el.find(".views").text().trim().replace(/[^0-9K]/g, "") || "";
    const duration = $el.find(".duration").text().trim().replace(/[^0-9:]/g, "") || "";
    const tags = [];
    const classAttr = $el.attr("class") || "";
    const tagMatches = classAttr.match(/tag-([^\s]+)/g) || [];
    tagMatches.forEach(t => {
      const tag = t.replace("tag-", "").replace(/-/g, " ");
      if (tag && !tags.includes(tag)) tags.push(tag);
    });
    const actors = [];
    const actorMatches = classAttr.match(/actors-([^\s]+)/g) || [];
    actorMatches.forEach(a => {
      const actor = a.replace("actors-", "").replace(/-/g, " ");
      if (actor && !actors.includes(actor)) actors.push(actor);
    });
    const studioMatch = classAttr.match(/studio-([^\s]+)/);
    const studio = studioMatch ? studioMatch[1].replace(/-/g, " ") : "";
    const postId = $el.data("post-id") || $el.data("video-uid") || "";
    return {
      code: code,
      title: title,
      url: link,
      slug: this._extractSlug(link),
      poster: poster?.split("?")[0] || poster,
      views: views,
      duration: duration,
      studio: studio,
      actors: actors,
      tags: tags,
      post_id: postId,
      raw: {
        title_raw: title,
        classes: classAttr
      }
    };
  }
  _parseDetailMetadata($) {
    const metadata = {};
    metadata.title = $(".entry-title").text().trim() || "";
    metadata.code = metadata.title.split(" ")[0] || "";
    metadata.poster = $('meta[itemprop="thumbnailUrl"]').attr("content") || $(".responsive-player").css("background-image")?.replace(/url\(['"]?(.*?)['"]?\)/, "$1") || "";
    metadata.duration = $('meta[itemprop="duration"]').attr("content")?.replace("P0DT", "").replace(/H/g, ":").replace(/M/g, ":").replace(/S/g, "") || "";
    metadata.description = $('meta[itemprop="description"]').attr("content") || "";
    metadata.uploadDate = $('meta[itemprop="uploadDate"]').attr("content") || "";
    const dateDuration = $("#video-date").text().trim() || "";
    const dateMatch = dateDuration.match(/Date:\s*([^I]+)/);
    const durationMatch = dateDuration.match(/Duration:\s*([0-9:]+)/);
    if (dateMatch) metadata.date = dateMatch[1].trim();
    if (durationMatch) metadata.duration = durationMatch[1].trim();
    metadata.actors = $("#video-actors a").map((i, a) => {
      const name = $(a).text().trim();
      const url = $(a).attr("href");
      return {
        name: name,
        url: url,
        slug: this._extractSlug(url)
      };
    }).get().filter(a => a.name);
    const studioLink = $("#video-actors a").filter((i, a) => $(a).attr("href")?.includes("/studio/"));
    metadata.studio = {
      name: studioLink.text().trim() || "",
      url: studioLink.attr("href") || "",
      slug: this._extractSlug(studioLink.attr("href"))
    };
    metadata.tags = $(".tags-list a.label").map((i, a) => {
      const name = $(a).text().trim();
      const url = $(a).attr("href");
      const isCategory = $(a).find("i").hasClass("fa-folder-open");
      return {
        name: name,
        url: url,
        slug: this._extractSlug(url),
        type: isCategory ? "category" : "tag"
      };
    }).get().filter(t => t.name);
    metadata.synopsis = $(".video-description .desc p").text().trim() || "";
    metadata.player = {
      url: "",
      servers: []
    };
    const scriptContent = $("script").filter((i, s) => $(s).html()?.includes("defaultUrl")).html() || "";
    const defaultUrlMatch = scriptContent.match(/defaultUrl\s*=\s*"([^"]+)"/);
    if (defaultUrlMatch) {
      metadata.player.url = defaultUrlMatch[1];
    }
    $(".box-server a[datalink]").each((i, a) => {
      const label = $(a).text().trim() || "Server";
      const datalink = $(a).attr("datalink");
      const decoded = this._decodeDatalink(datalink);
      const isDownload = $(a).attr("href")?.includes("download");
      metadata.player.servers.push({
        label: label,
        datalink: datalink,
        url: decoded || datalink,
        is_download: !!isDownload
      });
    });
    return metadata;
  }
  async home({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/" : `/page/${page}/`;
      const $ = await this.req(url);
      const latestItems = $("#widget_videos_block-1 .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const randomItems = $("#widget_videos_block-15 .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const result = {
        page: page,
        latest: latestItems,
        random: randomItems
      };
      console.log(`[LOG] Home: Found ${latestItems.length} latest, ${randomItems.length} random videos`);
      return result;
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {
        page: 1,
        latest: [],
        random: []
      };
    }
  }
  async categoryList() {
    try {
      const $ = await this.req("/categories/");
      const items = $(".videos-list .thumb-block").map((i, el) => {
        const $el = $(el);
        const name = $el.find(".cat-title").text().trim() || "";
        const url = $el.find("a").attr("href") || "";
        const poster = $el.find(".post-thumbnail img").attr("src") || "";
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          poster: poster?.split("?")[0] || poster
        };
      }).get().filter(item => item.name);
      console.log(`[LOG] CategoryList: Found ${items.length} categories`);
      return items;
    } catch (error) {
      console.error("[ERROR] CategoryList:", error.message);
      return [];
    }
  }
  async categoryDetail({
    slug,
    page = 1,
    filter = "latest"
  }) {
    try {
      if (!slug) throw new Error("Category slug is required");
      let url = slug.startsWith("http") ? slug : `/category/${slug.replace(/^\/+/, "")}/`;
      if (page > 1) url = `${url}page/${page}/`;
      if (filter && filter !== "latest") {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}filter=${filter}`;
      }
      const $ = await this.req(url);
      const name = $(".page-header .widget-title span").text().trim() || slug;
      const items = $(".videos-list .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        name: name,
        slug: slug,
        filter: filter,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]?.split("?")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
        }
      };
      console.log(`[LOG] CategoryDetail: ${name} - Found ${items.length} items on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] CategoryDetail:", error.message);
      return {
        name: "",
        slug: slug,
        filter: filter,
        page: 1,
        items: [],
        pagination: {}
      };
    }
  }
  async search({
    keyword,
    page = 1,
    filter = "latest"
  }) {
    try {
      if (!keyword) throw new Error("Keyword is required");
      let url = `/?s=${encodeURIComponent(keyword)}`;
      if (page > 1) url = `/page/${page}/?s=${encodeURIComponent(keyword)}`;
      if (filter && filter !== "latest") {
        url = `${url}&filter=${filter}`;
      }
      const $ = await this.req(url);
      const items = $(".videos-list .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        keyword: keyword,
        filter: filter,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]?.split("?")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
        }
      };
      console.log(`[LOG] Search: Found ${items.length} items for "${keyword}"`);
      return result;
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        keyword: keyword,
        filter: filter,
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
      const $ = await this.req(fullUrl);
      const slug = this._extractSlug(fullUrl);
      const meta = this._parseDetailMetadata($);
      const sameActorItems = $(".under-video-block").first().find(".loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const relatedItems = $(".under-video-block").last().find(".loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const result = {
        code: meta.code,
        slug: slug,
        title: meta.title,
        poster: meta.poster,
        synopsis: meta.synopsis,
        duration: meta.duration,
        date: meta.date,
        upload_date: meta.uploadDate,
        actors: meta.actors,
        studio: meta.studio,
        tags: meta.tags,
        categories: meta.tags.filter(t => t.type === "category"),
        player: meta.player,
        same_actor_videos: sameActorItems,
        related_videos: relatedItems,
        raw: {
          description: meta.description,
          poster_raw: $('meta[itemprop="thumbnailUrl"]').attr("content") || ""
        }
      };
      console.log(`[LOG] Detail Success: ${meta.code} - ${meta.title}`);
      return result;
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
  }
  async actorList({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/actors/" : `/actors/page/${page}/`;
      const $ = await this.req(url);
      const items = $(".videos-list .thumb-block").map((i, el) => {
        const $el = $(el);
        const name = $el.find(".entry-header span").text().trim() || "";
        const url = $el.find("a").attr("href") || "";
        const poster = $el.find(".post-thumbnail img").attr("src") || "";
        const count = parseInt($el.find(".views").text().trim().replace(/[^0-9]/g, "")) || 0;
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          poster: poster?.split("?")[0] || poster,
          count: count
        };
      }).get().filter(item => item.name);
      const pagination = $(".pagination");
      const result = {
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
        }
      };
      console.log(`[LOG] ActorList: Found ${items.length} actors on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] ActorList:", error.message);
      return {
        page: 1,
        items: [],
        pagination: {}
      };
    }
  }
  async actorDetail({
    url,
    page = 1
  }) {
    try {
      if (!url) throw new Error("Actor URL is required");
      const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
      const target = page === 1 ? fullUrl : `${fullUrl}page/${page}/`;
      const $ = await this.req(target);
      const name = $(".page-header .widget-title span").text().trim() || "";
      const slug = this._extractSlug(fullUrl);
      const items = $(".videos-list .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        name: name,
        slug: slug,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
        }
      };
      console.log(`[LOG] ActorDetail: ${name} - Found ${items.length} videos on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] ActorDetail:", error.message);
      return {
        name: "",
        slug: "",
        page: 1,
        items: [],
        pagination: {}
      };
    }
  }
  async tagList() {
    try {
      const $ = await this.req("/tags/");
      const items = $(".videos-list .thumb-block").map((i, el) => {
        const $el = $(el);
        const name = $el.find(".entry-header span").text().trim() || "";
        const url = $el.find("a").attr("href") || "";
        const poster = $el.find(".post-thumbnail img").attr("src") || "";
        const count = parseInt($el.find(".views").text().trim().replace(/[^0-9]/g, "")) || 0;
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          poster: poster?.split("?")[0] || poster,
          count: count
        };
      }).get().filter(item => item.name);
      console.log(`[LOG] TagList: Found ${items.length} tags`);
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
      if (!url) throw new Error("Tag URL is required");
      const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
      const target = page === 1 ? fullUrl : `${fullUrl}page/${page}/`;
      const $ = await this.req(target);
      const name = $(".page-header .widget-title span").text().trim() || "";
      const slug = this._extractSlug(fullUrl);
      const items = $(".videos-list .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        name: name,
        slug: slug,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
        }
      };
      console.log(`[LOG] TagDetail: ${name} - Found ${items.length} videos on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] TagDetail:", error.message);
      return {
        name: "",
        slug: "",
        page: 1,
        items: [],
        pagination: {}
      };
    }
  }
  async studioList() {
    try {
      const $ = await this.req("/studios/");
      const items = $(".videos-list .thumb-block").map((i, el) => {
        const $el = $(el);
        const name = $el.find(".entry-header span").text().trim() || "";
        const url = $el.find("a").attr("href") || "";
        const poster = $el.find(".post-thumbnail img").attr("src") || "";
        const count = parseInt($el.find(".views").text().trim().replace(/[^0-9]/g, "")) || 0;
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          poster: poster?.split("?")[0] || poster,
          count: count
        };
      }).get().filter(item => item.name);
      console.log(`[LOG] StudioList: Found ${items.length} studios`);
      return items;
    } catch (error) {
      console.error("[ERROR] StudioList:", error.message);
      return [];
    }
  }
  async studioDetail({
    url,
    page = 1
  }) {
    try {
      if (!url) throw new Error("Studio URL is required");
      const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
      const target = page === 1 ? fullUrl : `${fullUrl}page/${page}/`;
      const $ = await this.req(target);
      const name = $(".page-header .widget-title span").text().trim() || "";
      const slug = this._extractSlug(fullUrl);
      const items = $(".videos-list .loop-video").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        name: name,
        slug: slug,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
        }
      };
      console.log(`[LOG] StudioDetail: ${name} - Found ${items.length} videos on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] StudioDetail:", error.message);
      return {
        name: "",
        slug: "",
        page: 1,
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
  const validActions = ["home", "category_list", "category_detail", "search", "detail", "actor_list", "actor_detail", "tag_list", "tag_detail", "studio_list", "studio_detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/javsubid?action=search&keyword=hatano"
      }
    });
  }
  const api = new JavSubId();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "category_list":
        response = await api.categoryList();
        break;
      case "category_detail":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk action 'category_detail'. (contoh: jav-sub-indo)"
          });
        }
        response = await api.categoryDetail(params);
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
            error: "Parameter 'url' wajib diisi untuk action 'detail'. Bisa berupa URL penuh atau slug."
          });
        }
        response = await api.detail(params);
        break;
      case "actor_list":
        response = await api.actorList(params);
        break;
      case "actor_detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'actor_detail'."
          });
        }
        response = await api.actorDetail(params);
        break;
      case "tag_list":
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
      case "studio_list":
        response = await api.studioList();
        break;
      case "studio_detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'studio_detail'."
          });
        }
        response = await api.studioDetail(params);
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