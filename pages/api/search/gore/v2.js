import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class XGore {
  constructor() {
    this.baseUrl = "https://xgore.net";
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
      const linkElement = item.find("h2.archive-title a, h2.entry-title a");
      const url = linkElement.attr("href") || "";
      const slug = this._getSlug(url);
      const title = linkElement.text()?.trim() || "";
      const thumbnail = item.find("img").attr("src") || "";
      const thumbnailSrcset = item.find("img").attr("srcset") || "";
      const excerpt = item.find(".archive-excerpt").text()?.trim() || "";
      const date = item.find(".archive-date, .posted-on, .entry-meta .posted-on").text()?.trim() || "";
      let category = item.find(".categories a").text()?.trim() || "";
      let categoryUrl = item.find(".categories a").attr("href") || "";
      if (!category) {
        const classList = item.attr("class")?.split(/\s+/) || [];
        const catClass = classList.find(cls => cls.startsWith("category-") && cls !== "category-bestgore" && cls !== "category-gore-video");
        if (catClass) {
          const rawCat = catClass.replace("category-", "");
          category = rawCat.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          categoryUrl = `${this.baseUrl}/category/bestgore/${rawCat}/`;
        }
      }
      return {
        title: title,
        slug: slug,
        url: url,
        thumbnail: thumbnail,
        thumbnail_srcset: thumbnailSrcset,
        excerpt: excerpt,
        uploaded_date: date,
        category: category,
        category_url: categoryUrl
      };
    });
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Memulai proses pengambilan konten terbaru XGore (Halaman: ${page})`);
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/category/bestgore/gore-video/page/${pageNum}/` : `${this.baseUrl}/category/bestgore/gore-video/`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const cards = this._mapCards($, ".archive-posts-container article.archive-post-item");
      console.log(`[SUCCESS] Ditemukan ${cards.length} data pada halaman utama XGore.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses halaman utama XGore: ${error.message}`);
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
    console.log(`[INFO] Memulai pencarian query XGore: "${query}" (Halaman: ${page})`);
    if (!query || query.trim() === "") {
      console.error("[ERROR] Gagal memproses pencarian: Parameter 'query' wajib disertakan.");
      return {
        status: false,
        message: "Parameter 'query' wajib disertakan dan tidak boleh kosong."
      };
    }
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/?paged=${pageNum}&s=${encodeURIComponent(query)}` : `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const cards = this._mapCards($, ".search-results article.search-result-item");
      console.log(`[SUCCESS] Pencarian selesai. Menemukan ${cards.length} data.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses pencarian XGore: ${error.message}`);
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
    console.log(`[INFO] Memulai ekstraksi detail konten XGore dari input: ${url}`);
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
      const postId = $("article").attr("id")?.replace("post-", "") || "";
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
      const descriptions = [...$("div.entry-content p.wp-block-paragraph")].map(el => $(el).text()?.trim() || "");
      const description = descriptions.join("\n\n");
      const uploadedDate = $("header.entry-header .posted-on").text()?.trim() || "";
      const videoUrl = $("video.easy-video-player source").attr("src") || "";
      const poster = $("figure.wp-block-image img").attr("src") || "";
      const categories = [...$("span.cat-links a")].map(el => {
        const cat = $(el);
        return {
          name: cat.text()?.trim() || "",
          url: cat.attr("href") || "",
          slug: this._getSlug(cat.attr("href"))
        };
      });
      const tags = [...$("span.tags-links a")].map(el => $(el).text()?.trim() || "");
      const recentPosts = [...$("ul.recent-posts-list li")].map(el => {
        const li = $(el);
        const a = li.find("a");
        return {
          title: a.text()?.trim() || "",
          url: a.attr("href") || "",
          slug: this._getSlug(a.attr("href")),
          date: li.find(".recent-post-date").text()?.trim() || ""
        };
      });
      const interestingArticles = [...$(".random-posts-slider .slide-item")].map(el => {
        const slide = $(el);
        const a = slide.find("a");
        return {
          title: slide.find(".slide-title").text()?.trim() || "",
          url: a.attr("href") || "",
          slug: this._getSlug(a.attr("href")),
          thumbnail: slide.find("img").attr("src") || ""
        };
      });
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
        categories: categories || [],
        tags: tags || [],
        recent_posts: recentPosts || [],
        interesting_articles: interestingArticles || []
      };
      console.log(`[SUCCESS] Detail konten berhasil didapatkan.`);
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses detail konten XGore: ${error.message}`);
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
          home: "/api/xgore?action=home&page=1",
          search: "/api/xgore?action=search&query=indonesia&page=1",
          detail: "/api/xgore?action=detail&url=elderly-indonesian-man-ends-his-days-by-lying-on-railway-tracks"
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
  const api = new XGore();
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