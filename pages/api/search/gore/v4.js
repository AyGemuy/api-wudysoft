import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class AliveGore {
  constructor() {
    this.baseUrl = "https://alivegore.com";
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
    return link.replace(this.baseUrl, "").replace(/^\/+/g, "").replace(/\/+$/g, "");
  }
  _mapCards($, selector) {
    return [...$(selector)].map(el => {
      const item = $(el);
      const link = item.find("a.th-img");
      const relativeUrl = link.attr("href") || "";
      const url = relativeUrl.startsWith("http") ? relativeUrl : `${this.baseUrl}${relativeUrl}`;
      const slug = this._getSlug(url);
      const title = item.find("a.th-title").text()?.trim() || item.find("img").attr("alt")?.trim() || "";
      const relativeThumb = item.find("img").attr("src") || "";
      const thumbnail = relativeThumb.startsWith("http") ? relativeThumb : `${this.baseUrl}${relativeThumb}`;
      const views = item.find(".th-rate").text()?.trim() || "0";
      return {
        title: title,
        slug: slug,
        url: url,
        thumbnail: thumbnail,
        views_count: views
      };
    });
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[INFO] Memulai proses pengambilan konten terbaru AliveGore (Halaman: ${page})`);
    try {
      const pageNum = page ? page : 1;
      const targetUrl = pageNum > 1 ? `${this.baseUrl}/page/${pageNum}/` : `${this.baseUrl}/`;
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const cards = this._mapCards($, "main .thumb");
      console.log(`[SUCCESS] Ditemukan ${cards.length} data pada halaman utama AliveGore.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses halaman utama AliveGore: ${error.message}`);
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
    console.log(`[INFO] Memulai pencarian query AliveGore: "${query}" (Halaman: ${page})`);
    if (!query || query.trim() === "") {
      console.error("[ERROR] Gagal memproses pencarian: Parameter 'query' wajib disertakan.");
      return {
        status: false,
        message: "Parameter 'query' wajib disertakan dan tidak boleh kosong."
      };
    }
    try {
      const pageNum = page ? page : 1;
      const searchStart = pageNum - 1;
      const resultFrom = (pageNum - 1) * 10 + 1;
      const payload = new URLSearchParams({
        do: "search",
        subaction: "search",
        search_start: searchStart.toString(),
        full_search: "0",
        result_from: resultFrom.toString(),
        story: query
      });
      const finalUrl = `${this.proxyUrl}${this.baseUrl}/index.php?do=search`;
      console.log(`[INFO] Mengirimkan POST Request ke: ${finalUrl}`);
      const {
        data
      } = await this.client.post(finalUrl, payload, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const $ = cheerio.load(data);
      const cards = this._mapCards($, "main .thumb");
      console.log(`[SUCCESS] Pencarian selesai. Menemukan ${cards.length} data.`);
      return {
        status: true,
        result: cards || []
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses pencarian AliveGore: ${error.message}`);
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
    console.log(`[INFO] Memulai ekstraksi detail konten AliveGore dari input: ${url}`);
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
        const cleanedSlug = targetUrl.replace(/^\/+/g, "");
        targetUrl = `${this.baseUrl}/${cleanedSlug}`;
      }
      const finalUrl = `${this.proxyUrl}${targetUrl}`;
      console.log(`[INFO] Menghubungi URL: ${finalUrl}`);
      const {
        data
      } = await this.client.get(finalUrl);
      const $ = cheerio.load(data);
      const postId = $(".f-rate").attr("id")?.replace("f-rate-", "") || data.match(/doRateLD\([^,]+,\s*['"](\d+)['"]/)?.[1] || "";
      const title = $(".full-in h1").text()?.trim() || "";
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
      const description = $(".f-desc").clone().find("script, video, source, style, .dleplyrplayer").remove().end().text()?.trim() || "";
      let relativeVideoUrl = $(".dleplyrplayer video source").attr("src") || $('meta[property="og:video"]').attr("content") || "";
      const videoUrl = relativeVideoUrl ? relativeVideoUrl.startsWith("http") ? relativeVideoUrl : `${this.baseUrl}${relativeVideoUrl}` : "";
      let relativePoster = $("video").attr("poster") || $('meta[property="og:image"]').attr("content") || "";
      const poster = relativePoster ? relativePoster.startsWith("http") ? relativePoster : `${this.baseUrl}${relativePoster}` : "";
      const categories = [...$(".full-tags a")].map(el => {
        const cat = $(el);
        const href = cat.attr("href") || "";
        return {
          name: cat.text()?.trim() || "",
          url: href,
          slug: this._getSlug(href)
        };
      }).filter(cat => cat.url && !cat.url.includes("AddComplaint"));
      const views = $(".f-views").text()?.trim() || "0";
      const relatedPosts = this._mapCards($, ".rels-t ~ .floats .thumb, .rels-t ~ .thumb");
      const type = videoUrl ? "video" : "unknown";
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
        uploader: "admin",
        views_count: views,
        categories: categories || [],
        related_posts: relatedPosts || []
      };
      console.log(`[SUCCESS] Detail konten berhasil didapatkan.`);
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error(`[ERROR] Gagal memproses detail konten AliveGore: ${error.message}`);
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
          home: "/api/alivegore?action=home&page=1",
          search: "/api/alivegore?action=search&query=landslide&page=1",
          detail: "/api/alivegore?action=detail&url=wtf/13602-video-a-completely-naked-dude-attacked-the-security-guards-of-a-residential-building-colombia.html"
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
  const api = new AliveGore();
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