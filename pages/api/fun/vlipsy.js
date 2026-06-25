import axios from "axios";
import * as cheerio from "cheerio";
class VlipsyClient {
  constructor() {
    this.baseURL = "https://vlipsy.com";
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID"
      },
      timeout: 6e4
    });
    console.log("[VlipsyClient] Initialized:", this.baseURL);
  }
  async _req(path, params = {}) {
    try {
      console.log(`[REQ] GET -> ${path}`, params);
      const {
        data
      } = await this.axiosInstance.get(path, {
        params: params
      });
      return data;
    } catch (error) {
      console.error(`[REQ] ERROR -> ${path}:`, error.message);
      throw error;
    }
  }
  _parseList(html) {
    try {
      const $ = cheerio.load(html);
      return $(".grid-clip-item").get().map(el => {
        const $el = $(el);
        const href = $el.find('a[href^="/clips/"]').first().attr("href") || "";
        const titleLinks = $el.find('h3 a[href^="/clips/"]');
        let [source, title] = ["", ""];
        if (titleLinks.length === 1) title = titleLinks.first().text().trim();
        else if (titleLinks.length >= 2) {
          source = titleLinks.first().text().trim();
          title = titleLinks.last().text().trim();
        } else {
          const parts = $el.find("h3").text().trim().split(":").map(s => s.trim());
          parts.length === 2 ? [source, title] = parts : title = parts[0];
        }
        const match = $el.find(".vlip-thumb-duration-badge").first().text().trim().match(/(\d+)/);
        return {
          slug: href.split("/").pop() || "",
          title: title || "",
          source: source || "",
          duration: match ? parseInt(match[1], 10) : 0,
          thumbnail: $el.find('img[src*="/clips/"]').first().attr("src") || "",
          url: href ? `${this.baseURL.replace(/\/$/, "")}/${href.replace(/^\//, "")}` : null
        };
      });
    } catch (error) {
      console.error("[_parseList] Error:", error.message);
      return [];
    }
  }
  _extractCats($) {
    const res = $('a[href^="/category/"], button[role="radio"] a[href^="/category/"]').get().map(el => {
      const href = $(el).attr("href") || "";
      return {
        name: $(el).text().trim() || href.split("/").pop(),
        type: href.split("/").pop(),
        url: href ? `${this.baseURL.replace(/\/$/, "")}/${href.replace(/^\//, "")}` : null
      };
    }).filter(c => c.type && c.name);
    return Array.from(new Map((res.length ? res : [{
      name: "Trending",
      type: "trending"
    }, {
      name: "Popular",
      type: "popular"
    }, {
      name: "New",
      type: "new"
    }, {
      name: "Memes",
      type: "memes"
    }, {
      name: "Birthdays",
      type: "birthdays"
    }, {
      name: "Reactions",
      type: "reactions"
    }, {
      name: "Sports",
      type: "sports"
    }].map(c => ({
      ...c,
      url: `${this.baseURL}/category/${c.type}`
    }))).map(i => [i.type, i])).values());
  }
  _parseDetail(html, slug) {
    try {
      const $ = cheerio.load(html);
      let jsonData = null;
      try {
        const jsonText = $('script[type="application/ld+json"]').first().html();
        if (jsonText) jsonData = JSON.parse(jsonText);
      } catch (e) {}
      const title = $("h1").first().text().trim() || $('meta[property="og:title"]').attr("content") || jsonData?.name || "";
      const description = $('meta[name="description"]').attr("content") || jsonData?.description || "";
      const thumbnail = $('meta[property="og:image"]').attr("content") || jsonData?.thumbnailUrl || "";
      const contentUrl = jsonData?.contentUrl || $('meta[property="og:video"]').attr("content") || $("video[src]").attr("src") || "";
      const embedUrl = jsonData?.embedUrl || $('meta[name="twitter:player"]').attr("content") || "";
      const uploadDate = jsonData?.uploadDate || $('meta[property="og:video:release_date"]').attr("content") || "";
      const from = $('.clip-source, .source, [class*="source"]').first().text().trim() || jsonData?.from || "";
      let duration = 0;
      const matchDur = jsonData?.duration?.match(/PT(\d+)/) || $('.vlip-thumb-duration-badge, .duration, [class*="duration"]').first().text().trim().match(/(\d+)/);
      if (matchDur) duration = parseInt(matchDur[1], 10);
      else duration = parseInt($('meta[property="og:video:duration"]').attr("content") || $("video").attr("data-duration") || "0", 10);
      const keywords = (jsonData?.keywords || $('meta[name="keywords"]').attr("content") || "").split(",").map(k => k.trim()).filter(Boolean);
      const video_sources = [];
      $("video source").each((_, el) => {
        const src = $(el).attr("src");
        if (src) video_sources.push({
          src: src,
          type: $(el).attr("type") || "video/mp4"
        });
      });
      if (!video_sources.length && contentUrl) video_sources.push({
        src: contentUrl,
        type: "video/mp4"
      });
      return {
        ...jsonData || {},
        slug: slug,
        title: title,
        description: description,
        duration: duration,
        thumbnail: thumbnail,
        content_url: contentUrl,
        embed_url: embedUrl,
        upload_date: uploadDate,
        from: from,
        keywords: keywords,
        video_sources: video_sources
      };
    } catch (error) {
      console.error("[_parseDetail] Error:", error.message);
      throw error;
    }
  }
  async _fetch(html, limit, detail, label) {
    let clips = this._parseList(html).slice(0, limit);
    if (detail && clips.length > 0) {
      console.log(`[loop] Fetching ${clips.length} details for ${label}...`);
      const details = await Promise.all(clips.map(c => this.detail({
        url: c.slug
      }).catch(() => null)));
      clips = clips.map((c, idx) => ({
        ...c,
        detail: details[idx]
      }));
    }
    return {
      total: clips.length,
      data: clips
    };
  }
  async categories() {
    try {
      console.log("[PROCESS] Executing categories()...");
      const html = await this._req("/");
      const $ = cheerio.load(html);
      const uniqueCats = this._extractCats($);
      console.log(`[SUCCESS] categories() found ${uniqueCats.length} items`);
      return uniqueCats;
    } catch (error) {
      console.error("[ERROR] categories() failed:", error.message);
      throw error;
    }
  }
  async home({
    category,
    limit = 20,
    detail = false,
    ...rest
  } = {}) {
    try {
      if (category) {
        console.log(`[FORWARD] Redirecting home() to category() for type: "${category}"`);
        return await this.category({
          type: category,
          limit: limit,
          detail: detail,
          ...rest
        });
      }
      console.log("[PROCESS] Executing home()...");
      const html = await this._req("/", rest);
      const $ = cheerio.load(html);
      const catsList = this._extractCats($);
      const result = await this._fetch(html, limit, detail, "home");
      console.log(`[SUCCESS] home() completed. Total data: ${result.total}`);
      return {
        total: result.total,
        categories: catsList,
        data: result.data
      };
    } catch (error) {
      console.error("[ERROR] home() failed:", error.message);
      throw error;
    }
  }
  async category({
    type,
    limit = 20,
    detail = false,
    ...rest
  } = {}) {
    try {
      console.log(`[PROCESS] Executing category() untuk type: "${type}"`);
      if (!type) {
        console.warn("[WARN] category() dipanggil tanpa parameter type.");
        const html = await this._req("/");
        return {
          total: 0,
          data: [],
          available_categories: this._extractCats(cheerio.load(html))
        };
      }
      const html = await this._req(`/category/${type}`, rest);
      const $ = cheerio.load(html);
      const available = this._extractCats($);
      const clips = this._parseList(html);
      if (clips.length === 0 && !available.map(c => c.type).includes(type)) {
        console.warn(`[WARN] category() type "${type}" salah/tidak valid.`);
        return {
          total: 0,
          data: [],
          available_categories: available
        };
      }
      const result = await this._fetch(html, limit, detail, `category:${type}`);
      console.log(`[SUCCESS] category() untuk "${type}" completed. Total data: ${result.total}`);
      return result;
    } catch (error) {
      console.error(`[ERROR] category() untuk "${type}" failed:`, error.message);
      throw error;
    }
  }
  async search({
    query,
    limit = 20,
    detail = false,
    ...rest
  } = {}) {
    try {
      console.log(`[PROCESS] Executing search() untuk query: "${query}"`);
      if (!query) return console.warn("[WARN] search() dipanggil tanpa parameter query."), {
        total: 0,
        data: []
      };
      const result = await this._fetch(await this._req(`/search/${encodeURIComponent(query)}`, rest), limit, detail, `search:${query}`);
      console.log(`[SUCCESS] search() untuk "${query}" completed. Total data: ${result.total}`);
      return result;
    } catch (error) {
      console.error(`[ERROR] search() untuk "${query}" failed:`, error.message);
      throw error;
    }
  }
  async detail({
    url,
    ...rest
  } = {}) {
    try {
      console.log(`[PROCESS] Executing detail() untuk: ${url}`);
      if (!url) return console.warn("[WARN] detail() dipanggil tanpa parameter url."),
        null;
      const slug = url.startsWith("http") ? new URL(url).pathname.split("/").pop() || "" : url;
      const detailData = this._parseDetail(await this._req(`/clips/${slug}`, rest), slug);
      console.log(`[SUCCESS] detail() completed untuk slug: ${slug}`);
      return detailData;
    } catch (error) {
      console.error(`[ERROR] detail() untuk "${url}" failed:`, error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "category", "categories", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&limit=10",
          category: "/?action=category&type=memes",
          categories: "/?action=categories",
          search: "/?action=search&query=laugh",
          detail: "/?action=detail&url=https://vlipsy.com/clips/slug-atau-just-slug"
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
  const api = new VlipsyClient();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "categories":
        response = await api.categories();
        break;
      case "category":
        response = await api.category(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=funny"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url && !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk action 'detail'.",
            example: "/?action=detail&url=funny-clip-slug"
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
        error: "Tidak ada respons dari server Vlipsy atau data kosong. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau kegagalan scraping website target.",
      error: error.message || "Unknown Error"
    });
  }
}