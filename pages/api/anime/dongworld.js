import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class DongWorld {
  constructor() {
    this.proxy = proxy;
    this.base = "https://dongworld.top";
    this.api = axios.create({
      baseURL: this.proxy + this.base,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8",
        referer: this.base + "/"
      }
    });
  }
  async init({
    ...rest
  } = {}) {
    try {
      await this.api.get("/", {
        ...rest
      });
      return true;
    } catch (e) {
      console.log(`[ERR] Handshake Gagal: ${e.message}`);
      return false;
    }
  }
  async req({
    url,
    method = "GET",
    params = {},
    data = {},
    headers = {},
    ...rest
  }) {
    try {
      console.log(`[PROC] ${method} -> ${url}`);
      const isAbsolute = url.startsWith("http");
      const config = {
        url: isAbsolute ? this.proxy + url : url,
        method: method,
        params: params,
        data: data,
        headers: headers,
        ...rest
      };
      if (isAbsolute) {
        config.baseURL = "";
      }
      const res = await this.api(config);
      const isHtml = typeof res.data === "string" && (res.data.includes("<html") || res.data.includes("<!DOCTYPE"));
      const result = isHtml ? cheerio.load(res.data) : res.data;
      console.log(`[DONE] ${url} | Status: ${res.status}`);
      return result;
    } catch (err) {
      console.log(`[FAIL] ${url} | ${err.response?.status || err.message}`);
      return null;
    }
  }
  cleanImageUrl(imgSrc) {
    if (!imgSrc) return "";
    try {
      if (imgSrc.startsWith("/")) {
        if (imgSrc.includes("url=")) {
          const urlObj = new URL(imgSrc, this.base);
          const rawUrl = urlObj.searchParams.get("url");
          if (rawUrl) return rawUrl;
        }
        if (imgSrc.includes("path=")) {
          const urlObj = new URL(imgSrc, this.base);
          const rawPath = urlObj.searchParams.get("path");
          if (rawPath) return `${this.base}/${rawPath}`;
        }
        return `${this.base}${imgSrc}`;
      }
    } catch {}
    return imgSrc;
  }
  getBackgroundImage(styleStr) {
    if (!styleStr) return "";
    const match = styleStr.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? this.cleanImageUrl(match[1]) : "";
  }
  parseCard($, el) {
    const a = $(el).find("a").first();
    const href = a.attr("href") || "";
    const slug = href.replace(/^\/series\//, "").replace(/^\//, "");
    const img = $(el).find("img").first();
    const rawImg = img.attr("src") || img.attr("data-src") || "";
    const badge = $(el).find(".dl-card-badge").text().trim();
    const title = $(el).find(".dl-card-title").text().trim();
    const episodes = $(el).find(".dl-card-meta span").first().text().trim();
    const rating = $(el).find(".dl-card-rating").text().trim();
    return {
      title: title,
      slug: slug,
      url: `${this.base}${href}`,
      image: this.cleanImageUrl(rawImg),
      badge: badge || undefined,
      episodes: episodes,
      rating: rating || "N/A"
    };
  }
  async home({
    ...rest
  } = {}) {
    const $ = await this.req({
      url: "/",
      ...rest
    });
    if (!$) return null;
    const heroes = $(".dl-hero-slide").map((_, el) => {
      const bgStyle = $(el).attr("style") || "";
      const image = this.getBackgroundImage(bgStyle);
      const title = $(el).find(".dl-hero-title").text().trim();
      const synopsis = $(el).find(".dl-hero-synopsis").text().trim();
      const href = $(el).find(".dl-hero-watch-btn").attr("href") || "";
      return {
        title: title,
        synopsis: synopsis,
        image: image,
        slug: href.replace(/^\/series\//, "").replace(/^\//, ""),
        url: `${this.base}${href}`
      };
    }).get();
    const sections = $(".col-12.col-md-9 .dl-section").map((_, sectionEl) => {
      const sectionId = $(sectionEl).attr("id");
      if (sectionId === "dl-search-results") return null;
      const title = $(sectionEl).find(".dl-section-header h2").text().trim();
      const seeAll = $(sectionEl).find(".dl-see-all").attr("href") || "";
      const items = $(sectionEl).find(".dl-card").map((_, el) => this.parseCard($, el)).get();
      return {
        title: title,
        seeAll: seeAll ? `${this.base}${seeAll}` : undefined,
        items: items
      };
    }).get().filter(Boolean);
    return {
      heroes: heroes,
      sections: sections
    };
  }
  async browse({
    query = "",
    type = "",
    genre = "",
    status = "",
    ...rest
  } = {}) {
    const params = {};
    if (query) params.search = query;
    if (type) params.type = type;
    if (genre) params.genre = genre;
    if (status) params.status = status;
    const $ = await this.req({
      url: "/series",
      params: params,
      ...rest
    });
    if (!$) return null;
    const pageTitle = $(".dl-section-header h2").text().trim() || "Semua Donghua";
    const items = $(".dl-card").map((_, el) => this.parseCard($, el)).get();
    return {
      title: pageTitle,
      query: query || undefined,
      items: items
    };
  }
  async detail({
    slug = "",
    ...rest
  } = {}) {
    const url = `/series/${slug.replace(/^\//, "")}`;
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) return null;
    const title = $(".dl-details-title").text().trim();
    const rawPoster = $(".dl-details-poster img").attr("src") || "";
    const poster = this.cleanImageUrl(rawPoster);
    let rating = "N/A";
    let genres = [];
    let releaseDate = "N/A";
    let episodesInfo = "";
    let views = "";
    $(".dl-details-meta span").map((_, spanEl) => {
      const text = $(spanEl).text().trim();
      const html = $(spanEl).html() || "";
      if (html.includes("fa-star")) rating = text;
      else if (html.includes("fa-tags")) genres = text.split(",").map(g => g.trim()).filter(Boolean);
      else if (html.includes("fa-calendar")) releaseDate = text;
      else if (html.includes("fa-video")) episodesInfo = text;
      else if (html.includes("fa-eye")) views = text;
      return null;
    }).get();
    const synopsisEl = $(".dl-details-synopsis div p").clone();
    synopsisEl.find("button").remove();
    const synopsis = synopsisEl.text().trim();
    const episodes = $(".dl-mobile-episode-list a").map((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      return {
        title: text,
        slug: href.replace(/^\/watch\//, "").replace(/^\//, ""),
        url: `${this.base}${href}`
      };
    }).get();
    const recommendations = $(".dl-recommendation-container a").map((_, el) => {
      const href = $(el).attr("href") || "";
      const innerSlug = href.replace(/^\/series\//, "").replace(/^\//, "");
      const innerTitle = $(el).find(".dl-card-title").text().trim();
      const innerRating = $(el).find(".dl-card-rating").text().trim();
      const innerEpisodes = $(el).find(".dl-card-meta span").first().text().trim();
      const innerPoster = $(el).find("img").first().attr("src") || "";
      return {
        title: innerTitle,
        slug: innerSlug,
        url: `${this.base}${href}`,
        image: this.cleanImageUrl(innerPoster),
        rating: innerRating,
        episodes: innerEpisodes
      };
    }).get();
    return {
      title: title,
      poster: poster,
      rating: rating,
      genres: genres,
      releaseDate: releaseDate,
      episodesInfo: episodesInfo,
      views: views,
      synopsis: synopsis,
      episodes: episodes,
      recommendations: recommendations
    };
  }
  async watch({
    slug = "",
    ...rest
  } = {}) {
    const url = `/watch/${slug.replace(/^\//, "")}`;
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) return null;
    const title = $(".dl-stream-title").text().trim();
    const breadcrumbs = $(".dl-breadcrumb li").map((_, el) => $(el).text().trim()).get();
    const videoUrl = $(".dl-video-container iframe").attr("src") || "";
    const servers = $("#server-select option").map((_, el) => ({
      name: $(el).text().trim(),
      value: $(el).val() || ""
    })).get();
    const downloads = $(".dl-download-list a").map((_, el) => {
      const href = $(el).attr("href") || "";
      const serverName = $(el).find("span").text().trim();
      return {
        server: serverName,
        url: href
      };
    }).get();
    const navigation = $(".dl-server-selection .dl-server-nav").map((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      return {
        text: text,
        slug: href.replace(/^\/watch\//, "").replace(/^\//, ""),
        url: `${this.base}${href}`
      };
    }).get();
    const siblingEpisodes = $(".dl-mobile-episode-list a").map((_, el) => {
      const href = $(el).attr("href") || "";
      const epTitle = $(el).text().trim();
      const active = $(el).hasClass("active");
      return {
        title: epTitle,
        slug: href.replace(/^\/watch\//, "").replace(/^\//, ""),
        url: `${this.base}${href}`,
        active: active
      };
    }).get();
    return {
      title: title,
      breadcrumbs: breadcrumbs,
      videoUrl: videoUrl,
      servers: servers,
      downloads: downloads,
      navigation: navigation,
      siblingEpisodes: siblingEpisodes
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "browse", "detail", "watch"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/api?action=home",
          browse: "/api?action=browse&query=Azure",
          detail: "/api?action=detail&slug=azure-legacy",
          watch: "/api?action=watch&slug=ryplg-azure-legacy-85"
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
  const scraper = new DongWorld();
  try {
    let response;
    switch (action) {
      case "home":
        response = await scraper.home(params);
        break;
      case "browse":
        response = await scraper.browse(params);
        break;
      case "detail":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk detail."
          });
        }
        response = await scraper.detail(params);
        break;
      case "watch":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk watch."
          });
        }
        response = await scraper.watch(params);
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
    return res.status(200).json({
      status: true,
      action: action,
      result: response
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