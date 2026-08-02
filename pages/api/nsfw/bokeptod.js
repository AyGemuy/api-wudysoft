import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Bokeptod {
  constructor() {
    this.baseUrl = "https://bokeptod.co";
    this.proxyUrl = proxy;
    this.client = axios.create({
      timeout: 3e4,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  _getSlug(link) {
    if (!link) return "";
    return link.replace(this.baseUrl, "").replace("https://bokeptod.co", "").replace("https://bokeptod.co", "").replace(/^\/+/g, "").replace(/\/+$/g, "");
  }
  _mapCards($, selector) {
    return $(selector).map((i, el) => {
      const item = $(el);
      const postId = item.attr("data-post-id") || "";
      const videoId = item.attr("data-video-id") || "";
      const link = item.find("a").first();
      const relativeUrl = link.attr("href") || "";
      const url = relativeUrl.startsWith("http") ? relativeUrl : `${this.baseUrl}${relativeUrl}`;
      const slug = this._getSlug(url);
      const title = link.attr("title")?.trim() || item.find(".entry-header span").text()?.trim() || "";
      const relativeThumb = item.attr("data-main-thumb") || item.find("img.video-main-thumb").attr("src") || item.find("img.video-main-thumb").attr("data-src") || "";
      const thumbnail = relativeThumb.startsWith("http") ? relativeThumb : `${this.baseUrl}${relativeThumb}`;
      const views = item.find(".views").text()?.replace(/[\r\n\t]/g, "")?.trim() || "0";
      const duration = item.find(".duration").text()?.replace(/[\r\n\t]/g, "")?.trim() || "";
      const rating = item.find(".rating-bar span").text()?.trim() || "";
      return {
        post_id: postId,
        video_id: videoId,
        title: title,
        slug: slug,
        url: url,
        thumbnail: thumbnail,
        views_count: views,
        duration: duration,
        rating: rating
      };
    }).get();
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Mengambil data halaman utama Bokeptod (Halaman: ${page})`);
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/page/${pageNum}/` : `${this.baseUrl}/`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const latestCards = this._mapCards($, "main article.loop-video");
      const trendingCards = this._mapCards($, "#sidebar article.loop-video");
      return {
        status: true,
        result: latestCards,
        trending: trendingCards
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses halaman utama: ${error.message}`);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async tag({
    slug = "",
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Mengambil data tag "${slug}" Bokeptod (Halaman: ${page})`);
    if (!slug || slug.trim() === "") {
      return {
        status: false,
        message: "Parameter 'slug' wajib disertakan."
      };
    }
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/tag/${slug}/page/${pageNum}/` : `${this.baseUrl}/tag/${slug}/`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const tagCards = this._mapCards($, "main article.loop-video");
      const trendingCards = this._mapCards($, "#sidebar article.loop-video");
      return {
        status: true,
        result: tagCards,
        trending: trendingCards
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses tag: ${error.message}`);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async search({
    query = "",
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Mencari query: "${query}" (Halaman: ${page})`);
    if (!query || query.trim() === "") {
      return {
        status: false,
        message: "Parameter 'query' wajib disertakan."
      };
    }
    try {
      const pageNum = page ? page : 1;
      const encodedQuery = encodeURIComponent(query);
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/page/${pageNum}/?s=${encodedQuery}` : `${this.baseUrl}/?s=${encodedQuery}`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const searchCards = this._mapCards($, "main article.loop-video");
      const trendingCards = this._mapCards($, "#sidebar article.loop-video");
      return {
        status: true,
        result: searchCards,
        trending: trendingCards
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses pencarian: ${error.message}`);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async detail({
    url = "",
    ...rest
  } = {}) {
    console.log(`[INFO] Mengekstrak detail dari URL: ${url}`);
    if (!url || url.trim() === "") {
      return {
        status: false,
        message: "Parameter 'url' (Slug atau URL lengkap) wajib disertakan."
      };
    }
    try {
      let targetUrl = url;
      if (targetUrl && !targetUrl.startsWith("http")) {
        const cleanedSlug = targetUrl.replace(/^\/+/g, "");
        targetUrl = `${this.baseUrl}/${cleanedSlug}`;
      }
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const postId = $("article.post").attr("id")?.replace("post-", "") || $("article.post").attr("data-post-id") || "";
      const title = $(".entry-title").text()?.trim() || $('meta[itemprop="name"]').attr("content") || "";
      const meta = {};
      [...$("head meta")].map(el => {
        const m = $(el);
        const name = m.attr("name") || m.attr("property") || m.attr("itemprop") || m.attr("charset") || "";
        const content = m.attr("content") || "";
        if (name) {
          const normalizedKey = name.replace(/:/g, "_").replace(/-/g, "_").toLowerCase();
          meta[normalizedKey] = content || true;
        }
      });
      meta["title"] = $("head title").text()?.trim() || "";
      const canonical = $('head link[rel="canonical"]').attr("href") || "";
      if (canonical) {
        meta["canonical"] = canonical;
      }
      const description = $(".video-description .desc").text()?.trim() || $('meta[itemprop="description"]').attr("content") || "";
      const videoUrl = $(".responsive-player iframe").attr("src") || $('meta[itemprop="embedURL"]').attr("content") || "";
      const poster = $('meta[itemprop="thumbnailUrl"]').attr("content") || $('meta[property="og:image"]').attr("content") || "";
      const uploader = $('meta[itemprop="author"]').attr("content") || $(".video-author a").text()?.trim() || "Admin";
      const views = $("#video-views span").first().text()?.trim() || $("#video-views").text()?.replace(/views/i, "")?.trim() || "0";
      const durationRaw = $('meta[itemprop="duration"]').attr("content") || "";
      const uploadDate = $('meta[itemprop="uploadDate"]').attr("content") || "";
      const likesRaw = $(".likes_count").text()?.replace(/[^\d]/g, "")?.trim();
      const likesCount = likesRaw ? parseInt(likesRaw, 10) : 0;
      const dislikesRaw = $(".dislikes_count").text()?.replace(/[^\d]/g, "")?.trim();
      const dislikesCount = dislikesRaw ? parseInt(dislikesRaw, 10) : 0;
      const ratingPercentage = $(".percentage").first().text()?.trim() || $(".rating-result .percentage").text()?.trim() || "0%";
      const categoriesAndTags = $(".tags-list a").map((i, el) => {
        const tagEl = $(el);
        const href = tagEl.attr("href") || "";
        const name = tagEl.text()?.trim() || "";
        const slug = this._getSlug(href);
        return {
          name: name,
          url: href,
          slug: slug
        };
      }).get();
      const categories = categoriesAndTags.filter(item => item.url.includes("/category/"));
      const tags = categoriesAndTags.filter(item => !item.url.includes("/category/"));
      const relatedPosts = this._mapCards($, ".under-video-block article.loop-video");
      const result = {
        post_id: postId,
        title: title,
        type: videoUrl ? "video" : "unknown",
        slug: this._getSlug(targetUrl),
        url: targetUrl,
        meta: meta || {},
        description: description,
        video_url: videoUrl,
        poster: poster,
        uploader: uploader,
        views_count: views,
        duration_raw: durationRaw,
        upload_date: uploadDate,
        likes: likesCount,
        dislikes: dislikesCount,
        rating: ratingPercentage,
        categories: categories,
        tags: tags,
        related_posts: relatedPosts
      };
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses detail konten: ${error.message}`);
      return {
        status: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "tag", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&page=1",
          tag: "/?action=tag&slug=bokep-bocil&page=1",
          search: "/?action=search&query=Andini&page=1",
          detail: "/?action=detail&url=bokep-andini-permata-viral-masih-pake-seragam/"
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
  const api = new Bokeptod();
  try {
    let response;
    switch (action) {
      case "home":
        const homeParams = {
          page: params.page ? parseInt(params.page, 10) : 1
        };
        response = await api.home(homeParams);
        break;
      case "tag":
        const targetTag = params.slug || params.tag || params.slug;
        if (!targetTag) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk melihat tag."
          });
        }
        const tagParams = {
          slug: targetTag,
          page: params.page ? parseInt(params.page, 10) : 1
        };
        response = await api.tag(tagParams);
        break;
      case "search":
        const searchQuery = params.query || params.keyword || params.q;
        if (!searchQuery) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk pencarian."
          });
        }
        const searchParams = {
          query: searchQuery,
          page: params.page ? parseInt(params.page, 10) : 1
        };
        response = await api.search(searchParams);
        break;
      case "detail":
        const targetDetail = params.url || params.slug;
        if (!targetDetail) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk melihat detail."
          });
        }
        const detailParams = {
          url: targetDetail
        };
        response = await api.detail(detailParams);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}