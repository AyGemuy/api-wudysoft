import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class GoreCenter {
  constructor() {
    this.baseUrl = "https://www.gorecenter.com";
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
    const clean = link.replace(/\/+$/, "");
    const parts = clean.split("/");
    return parts[parts.length - 1] || "";
  }
  _mapCards($, selector) {
    return [...$(selector)].map(el => {
      const link = $(el);
      const url = link.attr("href") || "";
      const slug = this._getSlug(url);
      const article = link.find("article.article");
      const postId = article.attr("id")?.replace("post-", "") || "";
      const title = link.find("#header007").text()?.trim() || "";
      const thumbnail = link.find("#thumb007 img").attr("src") || "";
      const isBlur = article.hasClass("blur-effect");
      const uploader = link.find("#uploader007").text()?.trim() || "";
      const date = link.find("#date007").text()?.trim() || "";
      return {
        post_id: postId,
        title: title,
        slug: slug,
        url: url,
        thumbnail: thumbnail,
        is_blur: isBlur,
        uploader: uploader,
        uploaded_date: date
      };
    });
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Memulai proses pengambilan konten terbaru GoreCenter (Halaman: ${page})`);
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/page/${pageNum}/` : `${this.baseUrl}/`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const cards = this._mapCards($, "a#articlelink");
      console.log(`[SUCCESS] Ditemukan ${cards.length} data pada halaman utama GoreCenter.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses halaman utama GoreCenter: ${error.message}`);
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
    console.log(`[INFO] Memulai pencarian query GoreCenter: "${query}" (Halaman: ${page})`);
    if (!query || query.trim() === "") {
      console.error("[ERROR] Gagal memproses pencarian: Parameter 'query' wajib disertakan.");
      return {
        status: false,
        message: "Parameter 'query' wajib disertakan dan tidak boleh kosong."
      };
    }
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/page/${pageNum}/?s=${encodeURIComponent(query)}` : `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const cards = this._mapCards($, "a#articlelink");
      console.log(`[SUCCESS] Pencarian selesai. Menemukan ${cards.length} data.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses pencarian GoreCenter: ${error.message}`);
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
    console.log(`[INFO] Memulai ekstraksi detail konten GoreCenter dari input: ${url}`);
    if (!url || url.trim() === "") {
      console.error("[ERROR] Gagal memproses detail: Parameter 'url' (Slug atau URL lengkap) wajib disertakan.");
      return {
        status: false,
        message: "Parameter 'url' (Slug atau URL lengkap) wajib disertakan dan tidak boleh kosong."
      };
    }
    try {
      let targetUrl = url;
      if (targetUrl && !targetUrl.startsWith("http")) {
        const cleanedSlug = targetUrl.replace(/^\/+/g, "").replace(/\/+$/g, "");
        targetUrl = `${this.baseUrl}/${cleanedSlug}/`;
      }
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const postId = $('article[id^="post-"]').attr("id")?.replace("post-", "") || "";
      const title = $("h1.entry-title").text()?.trim() || "";
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
      const descriptions = [...$("div.entry-content > p, div.entry-content blockquote p")].map(el => $(el).text()?.trim() || "");
      const description = descriptions.filter(t => {
        return t && !t.startsWith("Date:") && !t.startsWith("Views:") && !t.startsWith("Comments:") && !t.startsWith("Votes:");
      }).join("\n\n");
      const videoUrl = $("video source").attr("src") || $("video").attr("src") || $('meta[itemprop="contentUrl"]').attr("content") || $(".kgvid-download-link").attr("href") || "";
      const poster = $("video").attr("poster") || $(".vjs-poster img").attr("src") || $('meta[itemprop="thumbnailUrl"]').attr("content") || "";
      const uploader = $(".main99-content h6").text()?.trim() || "";
      const date = $(".main99-content").find('.no-break:contains("Date:")').text()?.replace("Date:", "")?.trim() || "";
      const views = $(".main99-content").find('.no-break:contains("Views:")').text()?.replace("Views:", "")?.trim() || "0";
      const commentsCount = $(".main99-content").find('.no-break:contains("Comments:")').text()?.replace("Comments:", "")?.trim() || "0";
      const ratingScore = $("#count").text()?.split("/")?.[0]?.trim() || "";
      const ratingVotes = $(".main99-content").find('.no-break:contains("Votes:")').text()?.replace("Votes:", "")?.trim() || "0";
      const images = [...new Set([...$('div.entry-content img[src*="/uploads/"], div.entry-content a[href*="/uploads/"]')].map(el => {
        const item = $(el);
        const src = item.attr("href") || item.attr("src") || "";
        return /\.(jpg|jpeg|png|webp|gif)/i.test(src) ? src : null;
      }).filter(Boolean))];
      const categoriesSelectors = $('.cat-links a, .main99-content p:contains("Category:") a, span:contains("Category:") a, .entry-meta a[href*="/category/"]');
      const categories = [...new Set([...categoriesSelectors].map(el => {
        const cat = $(el);
        const href = cat.attr("href") || "";
        return JSON.stringify({
          name: cat.text()?.trim() || "",
          url: href,
          slug: this._getSlug(href)
        });
      }))].map(item => JSON.parse(item));
      const tags = [...new Set([...$('p:contains("Tags:") a, .tags-links a')].map(el => $(el).text()?.trim() || ""))];
      const relatedPosts = [...$(".related-post .owl-carousel .item")].map(el => {
        const item = $(el);
        const a = item.find("a.title");
        const relativeUrl = a.attr("href") || "";
        return {
          title: a.text()?.trim() || "",
          slug: this._getSlug(relativeUrl),
          url: relativeUrl,
          thumbnail: item.find("img").attr("src") || ""
        };
      });
      const type = videoUrl ? "video" : images.length > 0 ? "image" : "unknown";
      const result = {
        post_id: postId,
        title: title,
        type: type,
        slug: this._getSlug(targetUrl),
        url: targetUrl,
        meta: meta || {},
        description: description,
        video_url: videoUrl,
        poster: poster,
        images: images || [],
        uploader: uploader,
        uploaded_date: date,
        views_count: views,
        comments_count: commentsCount,
        rating: {
          score: ratingScore,
          total_votes: ratingVotes
        },
        categories: categories || [],
        tags: tags || [],
        related_posts: relatedPosts || []
      };
      console.log(`[SUCCESS] Detail konten berhasil didapatkan.`);
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses detail konten GoreCenter: ${error.message}`);
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
  const validActions = ["home", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/api/gorecenter?action=home&page=1",
          search: "/api/gorecenter?action=search&query=collision&page=1",
          detail: "/api/gorecenter?action=detail&url=indian-man-dies-in-head-on-collision-with-suv"
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
  const api = new GoreCenter();
  try {
    let response;
    switch (action) {
      case "home":
        const homeParams = {
          page: params.page ? parseInt(params.page, 10) : 1
        };
        response = await api.home(homeParams);
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
            error: "Parameter 'url' (Slug atau URL lengkap) wajib diisi untuk melihat detail."
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