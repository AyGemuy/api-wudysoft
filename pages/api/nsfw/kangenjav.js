import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class KangenJav {
  constructor() {
    this.baseUrl = "https://kangenjav.com";
    this.corsUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      Referer: "https://kangenjav.com/",
      Origin: "https://kangenjav.com",
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
  _decodeEmData(encoded) {
    if (!encoded) return null;
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const $ = cheerio.load(decoded);
      const src = $("iframe").attr("src") || "";
      return src || null;
    } catch (error) {
      console.warn("[WARN] Failed to decode data-em:", error.message);
      return null;
    }
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
    const link = $el.find("a.tip").attr("href") || $el.find("a").attr("href") || "";
    const title = $el.find(".entry-title").text().trim() || $el.find("h2.entry-title").text().trim() || "";
    const code = title.split(" ")[0] || "";
    const poster = $el.find("img").attr("src") || "";
    const quality = $el.find(".quality").text().trim() || "HD";
    const addyear = $el.find(".addyear").text().trim() || "";
    const duration = $el.find(".addinfox-text").text().replace(/[^\d:]/g, "").trim() || "";
    const type = $el.find(".type").text().trim() || "JAV";
    const genres = $el.find(".g a").map((i, a) => $(a).text().trim()).get().filter(Boolean);
    const country = $el.find(".c a").text().trim() || "";
    const release = $el.find(".note .t time").attr("datetime") || $el.find(".note .t").text().trim() || "";
    const actor = $el.find(".note .c a").text().trim() || "";
    return {
      code: code,
      title: title,
      url: link,
      slug: this._extractSlug(link),
      poster: poster?.split("?")[0] || poster,
      quality: quality,
      year: addyear,
      duration: duration,
      type: type,
      genres: genres,
      country: country,
      release: release,
      actor: actor,
      raw: {
        title_raw: $el.find(".entry-title").text().trim(),
        note_text: $el.find(".note").text().trim()
      }
    };
  }
  async home({
    page = 1
  }) {
    try {
      const url = page === 1 ? "/" : `/page/${page}/`;
      const $ = await this.req(url);
      const items = $("article.box").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const current = pagination.find(".current").text().trim() || "1";
      const totalPages = pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0] || current;
      const result = {
        page: page,
        items: items,
        pagination: {
          current: parseInt(current),
          total: parseInt(totalPages) || 1,
          prev: pagination.find(".prev").attr("href") || null,
          next: pagination.find(".next").attr("href") || null,
          last: pagination.find(".last").attr("href") || null
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
  async popular({
    page = 1
  }) {
    try {
      const url = page === 1 ? "/popular/" : `/popular/page/${page}/`;
      const $ = await this.req(url);
      const items = $("article.box").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null
        }
      };
      console.log(`[LOG] Popular: Found ${items.length} items on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] Popular:", error.message);
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
      const url = page === 1 ? `/?s=${encodeURIComponent(keyword)}` : `/page/${page}/?s=${encodeURIComponent(keyword)}`;
      const $ = await this.req(url);
      const noResult = $(".latest .more h1").text().includes("No Result");
      if (noResult) {
        console.log(`[LOG] Search: No results for "${keyword}"`);
        return {
          keyword: keyword,
          page: 1,
          items: [],
          pagination: {}
        };
      }
      const items = $("article.box").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        keyword: keyword,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]?.split("?")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null
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
      const $ = await this.req(fullUrl);
      const title = $(".entry-title").text().trim() || "";
      const code = title.split(" ")[0] || "";
      const poster = $(".limage img").attr("src") || "";
      const synopsis = $(".entry-content p").first().text().trim() || "";
      const slug = this._extractSlug(fullUrl);
      const metadata = {};
      $(".data li").each((i, el) => {
        const label = $(el).find("b").text().replace(":", "").trim().toLowerCase();
        const value = $(el).find(".colspan").text().trim() || $(el).clone().find("b").remove().end().text().trim();
        if (label && value) metadata[label] = value;
      });
      const genres = $('.entry-content .data a[rel="tag"]').map((i, a) => $(a).text().trim()).get().filter(Boolean);
      const actors = $('.data a[href*="/actor/"]').map((i, a) => ({
        name: $(a).text().trim(),
        url: $(a).attr("href"),
        slug: this._extractSlug($(a).attr("href"))
      })).get().filter(a => a.name);
      const tags = $("#tags a").map((i, a) => $(a).text().trim()).get().filter(Boolean);
      const ratingWidth = $(".rtb span").attr("style")?.match(/(\d+)%/)?.[1] || "0";
      const ratingValue = parseInt(ratingWidth) / 10 || 0;
      const ratingCount = parseInt($(".rtd span").text().trim()) || 0;
      const ratingText = $(".rtd").text().trim();
      const bookmarkText = $(".bmc").text().trim() || "";
      const bookmarkCount = parseInt(bookmarkText.match(/\d+/)?.[0]) || 0;
      let embedUrl = $(".player-embed iframe").attr("src") || $(".responsive-iframe iframe").attr("src") || "";
      if (!embedUrl) {
        const emElement = $(".server .mirror li a[data-em]").first();
        if (emElement.length) {
          const encoded = emElement.attr("data-em");
          const decodedSrc = this._decodeEmData(encoded);
          if (decodedSrc) embedUrl = decodedSrc;
        }
      }
      const gallery = $("#gallery .gallery_img a").map((i, a) => $(a).attr("href")).get().filter(Boolean);
      const related = $(".relat article.box").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const breadcrumb = $(".breadcrumb").text().trim() || "";
      const author = $(".mvinfo .author .fn").text().trim() || "";
      const updatedAt = $(".mvinfo .updated").attr("datetime") || $(".mvinfo .updated").text().trim() || "";
      const publishedAt = $(".mvinfo .published").attr("datetime") || $(".mvinfo .published").text().trim() || "";
      const metaTags = this._extractMetaTags($);
      const result = {
        code: code,
        slug: slug,
        title: title,
        poster: poster?.split("?")[0] || poster,
        synopsis: synopsis,
        metadata: {
          genre: metadata.genre || genres.join(", "),
          release: metadata.release || "",
          stars: metadata.stars || actors.map(a => a.name).join(", "),
          duration: metadata.duration || "",
          country: metadata.country || "",
          quality: metadata.quality || "HD"
        },
        genres: genres,
        actors: actors,
        tags: tags,
        rating: {
          value: ratingValue,
          count: ratingCount,
          text: ratingText
        },
        bookmarks: bookmarkCount,
        embed_url: embedUrl,
        gallery: gallery,
        related: related,
        author: author,
        published_at: publishedAt,
        updated_at: updatedAt,
        breadcrumb: breadcrumb,
        meta_tags: metaTags,
        raw: {
          title_full: title,
          meta_description: $('meta[name="description"]').attr("content") || "",
          meta_keywords: $('meta[name="keywords"]').attr("content") || ""
        }
      };
      console.log(`[LOG] Detail Success: ${code} - ${title}`);
      return result;
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
  }
  async actorList({
    page = 1
  }) {
    try {
      const url = page === 1 ? "/list-artis/" : `/list-artis/page/${page}/`;
      const $ = await this.req(url);
      const items = $(".taxindex li").map((i, el) => {
        const name = $(el).find("a span").text().trim() || "";
        const url = $(el).find("a").attr("href") || "";
        const count = $(el).find("a i").text().trim() || "0";
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          count: parseInt(count) || 0
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
          prev: pagination.find(".prev").attr("href") || null
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
      const name = $(".more h1").text().trim() || "";
      const description = $(".more .description").text().trim() || "";
      const slug = this._extractSlug(fullUrl);
      const items = $("article.box").map((i, el) => this._parseVideoItem($, el)).get().filter(item => item.url);
      const pagination = $(".pagination");
      const result = {
        name: name,
        slug: slug,
        description: description,
        page: page,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null
        }
      };
      console.log(`[LOG] ActorDetail: ${name} - Found ${items.length} videos on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] ActorDetail:", error.message);
      return {
        name: "",
        slug: "",
        description: "",
        page: 1,
        items: [],
        pagination: {}
      };
    }
  }
  async genreList() {
    try {
      const $ = await this.req("/list-genre/");
      const items = $(".taxindex li").map((i, el) => {
        const name = $(el).find("a span").text().trim() || "";
        const url = $(el).find("a").attr("href") || "";
        const count = $(el).find("a i").text().trim() || "0";
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          count: parseInt(count) || 0
        };
      }).get().filter(item => item.name);
      console.log(`[LOG] GenreList: Found ${items.length} genres`);
      return items;
    } catch (error) {
      console.error("[ERROR] GenreList:", error.message);
      return [];
    }
  }
  async yearList() {
    try {
      const $ = await this.req("/list-years/");
      const items = $(".taxindex li").map((i, el) => {
        const name = $(el).find("a span").text().trim() || "";
        const url = $(el).find("a").attr("href") || "";
        const count = $(el).find("a i").text().trim() || "0";
        return {
          name: name,
          url: url,
          slug: this._extractSlug(url),
          count: parseInt(count) || 0
        };
      }).get().filter(item => item.name);
      console.log(`[LOG] YearList: Found ${items.length} years`);
      return items;
    } catch (error) {
      console.error("[ERROR] YearList:", error.message);
      return [];
    }
  }
  async listJav({
    page = 1,
    letter = null
  }) {
    try {
      const url = page === 1 ? "/list-jav-sub-indo/" : `/list-jav-sub-indo/page/${page}/`;
      const $ = await this.req(url);
      const navLetters = $(".nav_apb a").map((i, a) => $(a).text().trim()).get().filter(Boolean);
      const items = $(".soralist .blc ul li").map((i, el) => {
        const title = $(el).find("a").text().trim() || "";
        const url = $(el).find("a").attr("href") || "";
        const code = title.split(" ")[0] || "";
        return {
          code: code,
          title: title,
          url: url,
          slug: this._extractSlug(url)
        };
      }).get().filter(item => item.title);
      const pagination = $(".pagination");
      const result = {
        page: page,
        letter: letter || "all",
        letters: navLetters,
        items: items,
        pagination: {
          current: parseInt(pagination.find(".current").text().trim()) || 1,
          total: parseInt(pagination.find("a").last().attr("href")?.split("/page/")?.[1]?.split("/")?.[0]) || 1,
          next: pagination.find(".next").attr("href") || null,
          prev: pagination.find(".prev").attr("href") || null
        }
      };
      console.log(`[LOG] ListJav: Found ${items.length} items on page ${page}`);
      return result;
    } catch (error) {
      console.error("[ERROR] ListJav:", error.message);
      return {
        page: 1,
        letter: "all",
        letters: [],
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
  const validActions = ["home", "popular", "search", "detail", "actor_list", "actor_detail", "genre_list", "year_list", "list_jav"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/kangenjav?action=search&keyword=hatano"
      }
    });
  }
  const api = new KangenJav();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "popular":
        response = await api.popular(params);
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
            error: "Parameter 'url' wajib diisi untuk action 'detail'. Bisa berupa URL penuh atau slug (contoh: dldss-078-pembantu-seksi-suzume-mino)."
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
            error: "Parameter 'url' wajib diisi untuk action 'actor_detail'. Bisa berupa URL penuh atau slug (contoh: actor/aki-sasaki/)."
          });
        }
        response = await api.actorDetail(params);
        break;
      case "genre_list":
        response = await api.genreList();
        break;
      case "year_list":
        response = await api.yearList();
        break;
      case "list_jav":
        response = await api.listJav(params);
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