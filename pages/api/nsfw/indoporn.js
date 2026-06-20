import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class IndoPorn {
  constructor() {
    this.baseUrl = "https://indoporn.mobi";
    this.proxyUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    };
  }
  _url(target) {
    return `${this.proxyUrl}${encodeURIComponent(target)}`;
  }
  _slug(url) {
    if (!url) return null;
    const clean = url.replace(this.baseUrl, "").replace(/^\/|\/$/g, "");
    return clean || null;
  }
  _actor(className) {
    const match = (className || "").match(/actors-([^\s"'\>]+)/);
    return match ? [match[1].replace(/-/g, " ")] : [];
  }
  _rate($el) {
    const raw = $el.find(".rating").text().trim() || $el.find(".rating-value").text().trim() || $el.find(".value").text().trim() || null;
    return raw ? raw.includes("%") ? raw : `${raw}%` : null;
  }
  async home({
    ...rest
  } = {}) {
    console.log("[LOG] Memproses halaman home...");
    try {
      const target = `${this.baseUrl}/`;
      const response = await axios.get(this._url(target), {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(response?.data || "");
      const videos = $('.thumb-block.video-preview-item, [class*="thumb-block"]').map((_, el) => {
        const $el = $(el);
        const rawLink = $el.find("a").attr("href") || null;
        const finalLink = rawLink ? rawLink.startsWith("http") ? rawLink : `${this.baseUrl}${rawLink}` : null;
        return {
          title: $el.find(".title").text().trim() || null,
          slug: this._slug(finalLink),
          link: finalLink,
          thumbnail: $el.find(".video-main-thumb").attr("src") || $el.attr("data-main-thumb") || null,
          duration: $el.find(".duration").text().trim() || null,
          rating: this._rate($el),
          post_id: $el.attr("data-post-id") || $el.data("post-id") || null,
          actors: this._actor($el.attr("class"))
        };
      }).get().filter(v => v.title && v.link);
      console.log(`[LOG] Sukses mendapatkan ${videos.length} video.`);
      return {
        status: true,
        result: videos
      };
    } catch (error) {
      console.error("[LOG ERROR] Gagal di fungsi home:", error?.message || null);
      return {
        status: false,
        result: error?.message || null
      };
    }
  }
  async search({
    query,
    limit,
    ...rest
  }) {
    const q = query || "";
    const max = limit ? parseInt(limit) : null;
    console.log(`[LOG] Memproses pencarian kata kunci: "${q}"`);
    try {
      const target = `${this.baseUrl}/?s=${encodeURIComponent(q)}`;
      const response = await axios.get(this._url(target), {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(response?.data || "");
      let elements = $('.thumb-block.video-preview-item, [class*="thumb-block"]');
      if (max) elements = elements.slice(0, max);
      const videos = elements.map((_, el) => {
        const $el = $(el);
        const rawLink = $el.find("a").attr("href") || null;
        const finalLink = rawLink ? rawLink.startsWith("http") ? rawLink : `${this.baseUrl}${rawLink}` : null;
        return {
          title: $el.find(".title").text().trim() || null,
          slug: this._slug(finalLink),
          link: finalLink,
          thumbnail: $el.find(".video-main-thumb").attr("src") || $el.attr("data-main-thumb") || null,
          duration: $el.find(".duration").text().trim() || null,
          rating: this._rate($el),
          post_id: $el.attr("data-post-id") || $el.data("post-id") || null,
          actors: this._actor($el.attr("class"))
        };
      }).get().filter(v => v.title && v.link);
      console.log(`[LOG] Sukses menemukan ${videos.length} video.`);
      return {
        status: true,
        result: videos
      };
    } catch (error) {
      console.error("[LOG ERROR] Gagal di fungsi search:", error?.message || null);
      return {
        status: false,
        result: error?.message || null
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    const targetUrl = url || "";
    console.log(`[LOG] Memproses detail URL/Slug: ${targetUrl}`);
    try {
      if (!targetUrl) throw new Error("URL atau Slug wajib disertakan.");
      const fullUrl = targetUrl.startsWith("http") ? targetUrl : `${this.baseUrl}/${targetUrl.replace(/^\//, "")}`;
      const response = await axios.get(this._url(fullUrl), {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(response?.data || "");
      const categories = [];
      const actors = [];
      $(".video-tags .tags-list a.label").each((_, el) => {
        const text = $(el).text().trim() || null;
        const href = $(el).attr("href") || "";
        if (text) {
          href.includes("/category/") ? categories.push(text) : href.includes("/actor/") ? actors.push(text) : null;
        }
      });
      const relatedVideos = $('.under-video-block .videos-list .thumb-block, .under-video-block [class*="thumb-block"]').map((_, el) => {
        const $el = $(el);
        const rawLink = $el.find("a").attr("href") || null;
        const finalLink = rawLink ? rawLink.startsWith("http") ? rawLink : `${this.baseUrl}${rawLink}` : null;
        return {
          title: $el.find(".title").text().trim() || null,
          slug: this._slug(finalLink),
          link: finalLink,
          thumbnail: $el.find(".video-main-thumb").attr("src") || $el.attr("data-main-thumb") || null,
          duration: $el.find(".duration").text().trim() || null,
          rating: this._rate($el),
          post_id: $el.attr("data-post-id") || $el.data("post-id") || null,
          actors: this._actor($el.attr("class"))
        };
      }).get().filter(v => v.title && v.link);
      const details = {
        title: $('meta[itemprop="name"]').attr("content") || $("h1").text().trim() || null,
        slug: this._slug(fullUrl),
        link: fullUrl,
        description: $('meta[itemprop="description"]').attr("content") || $('meta[name="description"]').attr("content") || null,
        duration: $('meta[itemprop="duration"]').attr("content") || null,
        video_url: $('meta[itemprop="contentURL"]').attr("content") || null,
        thumbnail: $('meta[property="og:image"]').attr("content") || $(".video-main-thumb").attr("src") || null,
        categories: categories,
        actors: actors,
        likes: parseInt($(".likes_count").text()) || 0,
        dislikes: parseInt($(".dislikes_count").text()) || 0,
        post_id: $("article").attr("data-post-id") || $("[data-post-id]").attr("data-post-id") || null,
        author: $('meta[itemprop="author"]').attr("content") || null,
        upload_date: $('meta[itemprop="uploadDate"]').attr("content") || null,
        related_videos: relatedVideos
      };
      console.log(`[LOG] Sukses mendapatkan detail: "${details.title}"`);
      return {
        status: true,
        result: details
      };
    } catch (error) {
      console.error("[LOG ERROR] Gagal di fungsi detail:", error?.message || null);
      return {
        status: false,
        result: error?.message || null
      };
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
        examples: {
          home: "/indoporn?action=home",
          search: "/indoporn?action=search&query=yuri&limit=5",
          detail: "/indoporn?action=detail&url=vina-sky-doggy-fucked-with-huge-dick-bg-porn-video"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new IndoPorn();
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
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/indoporn?action=search&query=yuri"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' (bisa berupa Full URL atau Slug) wajib diisi untuk action 'detail'.",
            example: "/indoporn?action=detail&url=vina-sky-doggy-fucked-with-huge-dick-bg-porn-video"
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari scraper IndoPorn. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server Next.js atau target proxy/website.",
      error: error?.message || "Unknown Error"
    });
  }
}