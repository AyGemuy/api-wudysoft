import axios from "axios";
import * as cheerio from "cheerio";
class KlikXXIScraper {
  constructor() {
    this.baseURL = "https://klikxxi.me";
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate"
      }
    });
  }
  async search({
    query
  }) {
    const params = new URLSearchParams();
    params.append("s", query);
    params.append("post_type[]", "post");
    params.append("post_type[]", "tv");
    const response = await this.client.get(`${this.baseURL}/`, {
      params: params
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $("#gmr-main-load .item-infinite").each((index, element) => {
      const item = $(element);
      const title = item.find(".entry-title a").text().trim();
      const url = item.find(".entry-title a").attr("href");
      const thumbnail = item.find("img").attr("data-lazy-src") || item.find("img").attr("src");
      const rating = item.find(".gmr-rating-item").text().trim();
      const duration = item.find(".gmr-duration-item").text().trim();
      const quality = item.find(".gmr-quality-item").text().trim();
      const categories = [];
      const countries = [];
      item.find(".gmr-movie-on a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();
        if (href && href.includes("/country/")) {
          countries.push(text);
        } else if (href && href.includes("/category/")) {
          categories.push(text);
        }
      });
      const trailerBtn = item.find(".gmr-trailer-popup");
      const trailerUrl = trailerBtn.length ? trailerBtn.attr("href") : null;
      results.push({
        title: title,
        url: url,
        thumbnail: thumbnail ? this.baseURL + thumbnail : null,
        rating: rating.replace("icon_star", "").trim(),
        duration: duration,
        quality: quality,
        categories: categories,
        countries: countries,
        trailerUrl: trailerUrl,
        year: this.extractYear(title)
      });
    });
    return {
      success: true,
      query: query,
      total_results: results.length,
      results: results
    };
  }
  async getDetail({
    url
  }) {
    const response = await this.client.get(url);
    const $ = cheerio.load(response.data);
    const detail = {
      title: $(".entry-title").text().trim(),
      thumbnail: $(".gmr-movie-data figure img").attr("data-lazy-src") || $(".gmr-movie-data figure img").attr("src"),
      rating: {
        value: $('.gmr-meta-rating span[itemprop="ratingValue"]').text().trim(),
        votes: $('.gmr-meta-rating span[itemprop="ratingCount"]').text().trim(),
        average: $(".gmr-meta-rating").text().match(/average\s+([\d.]+)/)?.[1] || null
      },
      description: $(".entry-content p").first().text().trim(),
      metadata: {},
      downloadLinks: [],
      relatedMovies: [],
      servers: []
    };
    $(".gmr-moviedata").each((i, el) => {
      const $el = $(el);
      const label = $el.find("strong").text().replace(":", "").trim().toLowerCase();
      switch (label) {
        case "tagline":
          detail.metadata.tagline = $el.clone().children().remove().end().text().trim();
          break;
        case "rate":
          detail.metadata.rating = $el.clone().children().remove().end().text().trim();
          break;
        case "genre":
          detail.metadata.genres = $el.find('a[rel="category tag"]').map((i, el) => $(el).text().trim()).get();
          break;
        case "quality":
          detail.metadata.quality = $el.find('a[rel="tag"]').text().trim();
          break;
        case "year":
          detail.metadata.year = $el.find('a[rel="tag"]').text().trim();
          break;
        case "duration":
          detail.metadata.duration = $el.clone().children().remove().end().text().trim().replace("Min", "").trim();
          break;
        case "country":
          detail.metadata.countries = $el.find('a[rel="tag"]').map((i, el) => $(el).text().trim()).get();
          break;
        case "release":
          detail.metadata.releaseDate = $el.clone().children().remove().end().text().trim();
          break;
        case "language":
          detail.metadata.languages = $el.clone().children().remove().end().text().trim().split(",").map(lang => lang.trim());
          break;
        case "budget":
          detail.metadata.budget = $el.clone().children().remove().end().text().trim();
          break;
        case "revenue":
          detail.metadata.revenue = $el.clone().children().remove().end().text().trim();
          break;
        case "director":
          detail.metadata.director = $el.find('span[itemprop="name"] a').text().trim();
          break;
        case "cast":
          detail.metadata.cast = $el.find('span[itemprop="name"] a').map((i, el) => $(el).text().trim()).get();
          break;
        case "posted on":
          detail.metadata.postedDate = $el.clone().children().remove().end().text().trim();
          break;
        case "by":
          detail.metadata.author = $el.find('.entry-author span[itemprop="name"]').text().trim();
          break;
      }
    });
    $(".gmr-download-list li").each((i, el) => {
      const $el = $(el);
      const link = $el.find("a.button");
      if (link.length) {
        detail.downloadLinks.push({
          title: link.text().trim(),
          url: link.attr("href"),
          quality: this.extractQualityFromText(link.text())
        });
      }
    });
    $(".gmr-grid.idmuvi-core .item").each((i, el) => {
      const $el = $(el);
      const related = {
        title: $el.find(".entry-title a").text().trim(),
        url: $el.find(".entry-title a").attr("href"),
        thumbnail: $el.find("img").attr("data-lazy-src") || $el.find("img").attr("src"),
        rating: $el.find(".gmr-rating-item").text().replace("icon_star", "").trim(),
        duration: $el.find(".gmr-duration-item").text().replace("svg", "").trim(),
        quality: $el.find(".gmr-quality-item a").text().trim(),
        genres: $el.find('.gmr-movie-on a[rel="category tag"]').map((i, el) => $(el).text().trim()).get(),
        countries: $el.find('.gmr-movie-on a[rel="tag"]').map((i, el) => $(el).text().trim()).get(),
        year: this.extractYear($el.find(".entry-title a").text().trim())
      };
      detail.relatedMovies.push(related);
    });
    $(".muvipro-player-tabs li a").each((i, el) => {
      const $el = $(el);
      detail.servers.push({
        name: $el.text().trim(),
        id: $el.attr("id"),
        tabId: $el.attr("href")
      });
    });
    const trailerBtn = $('a.gmr-trailer-popup[title*="Trailer"]');
    if (trailerBtn.length) {
      detail.trailerUrl = trailerBtn.attr("href");
    }
    detail.tags = $('.tags-links-content a[rel="tag"]').map((i, el) => $(el).text().trim()).get();
    return {
      success: true,
      url: url,
      detail: detail
    };
  }
  extractYear(title) {
    const match = title.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : null;
  }
  extractQualityFromText(text) {
    const qualities = ["1080", "720", "480", "360", "HD", "HDTS", "WEB-DL", "BluRay"];
    for (const quality of qualities) {
      if (text.includes(quality)) {
        return quality;
      }
    }
    return "gtw";
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=gadis"
      }
    });
  }
  const api = new KlikXXIScraper();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://"
          });
        }
        response = await api.getDetail(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}