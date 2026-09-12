import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class SeeGore {
  constructor() {
    this.baseUrl = "https://seegore.com";
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
      const item = $(el);
      const url = item.find("a.mm-card__media").attr("href") || "";
      const slug = this._getSlug(url);
      const title = item.find("h2.mm-card__title a").text()?.trim() || "";
      const thumbnail = item.find("img").attr("src") || "";
      const thumbnailSrcset = item.find("img").attr("srcset") || "";
      const category = item.find("a.mm-card__badge").text()?.trim() || "";
      const categoryUrl = item.find("a.mm-card__badge").attr("href") || "";
      const views = item.find('span[title="Views"] strong').text()?.trim() || "0";
      const upvotes = item.find('span[title="Upvotes"] strong').text()?.trim() || "0";
      const date = item.find(".mm-card__date").attr("datetime") || "";
      const reactions = [...item.find(".mm-card__reaction-badge")].map(badge => $(badge).attr("title") || "");
      const isFeatured = item.hasClass("mm-card--featured") || item.find(".mm-card__featured-ribbon").length > 0;
      return {
        title: title,
        slug: slug,
        url: url,
        thumbnail: thumbnail,
        thumbnail_srcset: thumbnailSrcset,
        category: category,
        category_url: categoryUrl,
        views: views,
        upvotes: upvotes,
        uploaded_date: date,
        reactions: reactions || [],
        is_featured: isFeatured
      };
    });
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Memulai proses pengambilan halaman utama (Halaman: ${page})`);
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/gore/page/${pageNum}/` : `${this.baseUrl}/gore/`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const cards = this._mapCards($, ".mm-feed__grid article.mm-card, .mm-posts-strip__track article.mm-card");
      console.log(`[SUCCESS] Ditemukan ${cards.length} data pada halaman utama.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses halaman utama: ${error.message}`);
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
    console.log(`[INFO] Memulai pencarian query: "${query}" (Halaman: ${page})`);
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
      const cards = this._mapCards($, ".mm-feed__grid article.mm-card");
      console.log(`[SUCCESS] Pencarian selesai. Menemukan ${cards.length} data.`);
      return {
        status: true,
        result: cards || []
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
    console.log(`[INFO] Memulai ekstraksi detail konten dari input: ${url}`);
    if (!url || url.trim() === "") {
      console.error("[ERROR] Gagal memproses detail konten: Parameter 'url' (Slug atau URL lengkap) wajib disertakan.");
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
      const postId = $("[data-mm-post-id]").attr("data-mm-post-id") || "";
      const title = $(".mm-single__header h1").text()?.trim() || "";
      const description = $(".mm-single__content p").text()?.trim() || "";
      const uploadedDate = $("time.mm-single-summary__item").attr("datetime") || "";
      const videoUrl = $("video source").attr("src") || $("video").attr("src") || "";
      const poster = $("video").attr("poster") || "";
      const commentsCount = $('.mm-single-summary__item[href="#comments"] span').text()?.trim() || "0";
      const upvotes = $('span[data-mm-vote-count="up"]').text()?.trim() || "0";
      const tags = [...$(".mm-post-tags__list li a")].map(el => $(el).text()?.replace("#", "")?.trim() || "");
      const breadcrumbs = [...$(".mm-breadcrumb ol li")].map(el => $(el).text()?.trim() || "");
      const ratingScore = $(".wpd-rating-value .wpdrv").text()?.trim() || "";
      const ratingVotes = $(".wpd-rating-value .wpdrc").text()?.trim() || "";
      const reactions = {};
      [...$(".mm-reaction-item")].map(el => {
        const rEl = $(el);
        const name = rEl.find(".reaction-stat-count").attr("data-mm-reaction-count") || "";
        const count = rEl.find(".reaction-stat-count").text()?.trim() || "0";
        if (name) {
          reactions[name] = count;
        }
      });
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
      const relatedPosts = this._mapCards($, ".mm-related .mm-feed__grid article.mm-card");
      const result = {
        post_id: postId,
        title: title,
        slug: this._getSlug(targetUrl),
        url: targetUrl,
        meta: meta || {},
        description: description,
        video_url: videoUrl,
        poster: poster,
        uploaded_date: uploadedDate,
        comments_count: commentsCount,
        upvotes: upvotes,
        breadcrumbs: breadcrumbs || [],
        tags: tags || [],
        rating: {
          score: ratingScore,
          total_votes: ratingVotes
        },
        reactions: reactions || {},
        related_posts: relatedPosts || []
      };
      console.log(`[SUCCESS] Detail konten berhasil didapatkan.`);
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
  const validActions = ["home", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/api/seegore?action=home&page=1",
          search: "/api/seegore?action=search&query=car&page=1",
          detail: "/api/seegore?action=detail&url=car-rolls-towards-a-woman-slowly"
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
  const api = new SeeGore();
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