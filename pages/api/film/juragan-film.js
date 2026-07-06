import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class JuraganFilm {
  constructor() {
    this.baseUrl = "https://tv46.juragan.film";
    this.proxy = proxy;
  }
  async _fetch(url) {
    const proxyUrl = this.proxy + encodeURIComponent(url);
    console.log(`[FETCH] ${proxyUrl}`);
    try {
      const response = await axios.get(proxyUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "id-ID"
        },
        timeout: 6e4
      });
      console.log(`[FETCH] Success (status ${response.status})`);
      return response.data;
    } catch (error) {
      console.error(`[FETCH] Error: ${error.message}`);
      throw error;
    }
  }
  _toSnakeCase(title) {
    return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "_");
  }
  _extractSlug(url) {
    return url ? url.replace(/\/$/, "").substring(url.replace(/\/$/, "").lastIndexOf("/") + 1) : "";
  }
  _parseItem($el) {
    const titleEl = $el.find("h2.entry-title a, .gmr-slide-titlelink, .content-thumbnail a, a").first();
    const link = titleEl.attr("href") || "";
    if (!link) return null;
    const slug = this._extractSlug(link);
    const url = link.replace(this.baseUrl, "");
    const title = $el.find("h2.entry-title a").first().text().trim() || titleEl.find(".strokeme").text().trim() || titleEl.text().trim() || titleEl.attr("title") || "";
    const poster = $el.find(".content-thumbnail img, img").map((_, img) => this.$(img).attr("src") || this.$(img).attr("data-src")).get()[0] || "";
    const rating = $el.find(".gmr-rating-item").text().trim().replace(/[^0-9.]/g, "") || "0";
    const quality = $el.find(".gmr-quality-item a, .gmr-quality-item").first().text().trim() || "";
    const badgeTexts = $el.find(".strokeepisode, .gmr-episode-item, .gmr-pilihsub-item").map((_, b) => this.$(b).text().trim()).get().filter(Boolean);
    let subtitle = $el.find(".gmr-pilihsub-item").first().text().trim() || badgeTexts.find(t => /sub|eng/i.test(t)) || "";
    let episode = badgeTexts.find(t => /eps|ep\s*\d+|episode/i.test(t)) || "";
    if (!episode && badgeTexts.length > 0 && !subtitle) {
      if (badgeTexts.length === 1 && !/eps|ep\s*\d+/i.test(badgeTexts[0])) subtitle = badgeTexts[0];
      else if (/^\d+$/.test(badgeTexts[0])) episode = "Eps " + badgeTexts[0];
      else episode = badgeTexts[0];
    } else if (!episode && !subtitle && badgeTexts.length > 1) {
      episode = badgeTexts[0];
      subtitle = badgeTexts[1] || "";
    }
    const isComplete = $el.find(".gmr-episodecomplete-item, .gmr-complete-item").length > 0;
    const status = isComplete ? "completed" : episode ? "ongoing" : "released";
    const type = $el.find(".gmr-posttype-item").text().trim() || (episode ? "TV Series" : "Movie");
    const year = $el.find('time[itemprop="dateCreated"], time').attr("datetime")?.slice(0, 4) || "";
    const duration = $el.find(".gmr-duration-item").text().trim().replace(/[^0-9\s?a-zA-Z]/g, "").trim() || "";
    let views = $el.find(".gmr-movie-view").text().replace(/views|view/gi, "").trim() || ($el.text().match(/([\d.,]+)\s*views?/i)?.[1] || "");
    const genres = $el.find('.gmr-movie-on a[rel="category tag"], .gmr-movie-genre a').map((_, g) => this.$(g).text().trim()).get().filter(Boolean);
    const country = $el.find('.gmr-movie-on span[itemprop="contentLocation"] a, .gmr-movie-on a[rel="tag"]').map((_, c) => this.$(c).text().trim()).get().filter(c => c && !/^\d{4}$/.test(c));
    return {
      title: title,
      link: link,
      url: url,
      slug: slug,
      poster: poster,
      rating: rating,
      quality: quality,
      episode: episode,
      subtitle: subtitle,
      type: type,
      year: year,
      duration: duration,
      views: views,
      status: status,
      genres: genres,
      country: country
    };
  }
  _parseList(html) {
    this.$ = cheerio.load(html);
    return this.$(".gmr-box-content, .gmr-box-archive, article.item, .col-md-125").map((_, el) => this._parseItem(this.$(el))).get().filter(Boolean);
  }
  _parseHome(html) {
    this.$ = cheerio.load(html);
    const result = {};
    this.$(".home-widget.widget.muvipro-posts-module, .gmr-home-carousel").map((i, widget) => {
      const $widget = this.$(widget);
      const title = $widget.find(".homemodule-title, .widget-title").first().text().trim() || `Section ${i + 1}`;
      const items = $widget.find(".gmr-item-modulepost, .gmr-slider-content, .gmr-box-content, .gmr-box-archive, .col-md-125").map((_, el) => this._parseItem(this.$(el))).get().filter(Boolean);
      if (items.length > 0) result[this._toSnakeCase(title)] = items;
      return null;
    });
    const latestItems = this.$("#gmr-main-load .gmr-box-content, #main .gmr-box-content, .gmr-box-archive").map((_, el) => this._parseItem(this.$(el))).get().filter(Boolean);
    if (latestItems.length > 0) result["latest_movie"] = latestItems;
    return result;
  }
  async home({
    page
  }) {
    try {
      const html = await this._fetch(page && page > 1 ? `${this.baseUrl}/page/${page}/` : this.baseUrl);
      return {
        status: true,
        result: this._parseHome(html)
      };
    } catch (e) {
      return {
        status: false,
        result: e.message
      };
    }
  }
  async search({
    query,
    page
  }) {
    if (!query) return {
      status: false,
      result: "Query parameter is required"
    };
    try {
      const baseParams = `s=${encodeURIComponent(query)}&post_type[]=post&post_type[]=tv`;
      const url = page && page > 1 ? `${this.baseUrl}/page/${page}/?${baseParams}` : `${this.baseUrl}/?${baseParams}`;
      return {
        status: true,
        result: this._parseList(await this._fetch(url))
      };
    } catch (e) {
      return {
        status: false,
        result: e.message
      };
    }
  }
  async detail({
    url
  }) {
    if (!url) return {
      status: false,
      result: "URL or slug is required"
    };
    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    try {
      const html = await this._fetch(fullUrl);
      const $ = cheerio.load(html);
      const title = $("h1.entry-title, h3.entry-title").first().text().trim() || "";
      const poster = $(".poster img, figure img, img.attachment-thumbnail, .content-thumbnail img").first().map((_, img) => $(img).attr("src") || $(img).attr("data-src")).get()[0] || "";
      const synopsis = $('[itemprop="description"]').text().trim() || $("em p, .entry-content p, .gmr-content-movie p").map((_, p) => $(p).text().trim()).get().join("\n").trim();
      const genres = $('.gmr-movie-genre a, .gmr-movie-on a[rel="category tag"]').map((_, g) => $(g).text().trim()).get().filter(Boolean);
      const year = $('a[rel="tag"]').map((_, a) => $(a).text().trim()).get().find(t => /^\d{4}$/.test(t)) || "";
      const duration = $(".gmr-movie-runtime, .gmr-duration-item").first().text().trim() || "";
      const quality = $(".gmr-quality-item a, .gmr-quality-item").first().text().trim() || "";
      const rating = $('meta[itemprop="ratingValue"]').attr("content") || $(".gmr-meta-rating").text().trim().replace(/[^0-9.]/g, "") || "0";
      const views = $(".gmr-movie-view").text().trim() || ($(".gmr-movie-innermeta").text().match(/([\d.,]+)\s*views/i)?.[1] ? $(".gmr-movie-innermeta").text().match(/([\d.,]+)\s*views/i)[1] + " Views" : "");
      const additionalInfo = {};
      $(".gmr-moviedata, .content-moviedata div").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes(":")) {
          const parts = text.split(":");
          additionalInfo[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      });
      if (Object.keys(additionalInfo).length <= 2) {
        $("strong").each((_, el) => {
          const textKey = $(el).text().replace(":", "").trim();
          if (["Tagline", "Judul", "Country", "Language", "Budget", "Revenue", "Release", "Cast", "Director"].includes(textKey)) {
            let nextContent = [],
              nextNode = el.nextSibling;
            while (nextNode && nextNode.nodeName !== "STRONG") {
              if ($(nextNode).text().trim()) nextContent.push($(nextNode).text().trim());
              nextNode = nextNode.nextSibling;
            }
            additionalInfo[textKey] = nextContent.join(" ").replace(/^:\s*/, "").trim();
          }
        });
      }
      const extractMeta = key => additionalInfo[key] ? additionalInfo[key].split(",").map(v => v.trim()).filter(Boolean) : [];
      const episodeLinks = [];
      if ($(".jf-eps-wrap").length > 0) {
        $(".jf-eps-wrap a, .jf-eps-wrap span:not(.page-text)").each((_, el) => {
          episodeLinks.push({
            text: `Episode ${$(el).text().trim()}`,
            href: $(el).attr("href") || fullUrl,
            current: $(el).hasClass("current") || el.tagName === "span"
          });
        });
      } else {
        $('.gmr-server-wrap .gmr-pagi-player a, .gmr-listseries li a, .muvi-list-episodes a, select[name="gmr_select_episode"] option').each((_, el) => {
          const href = $(el).attr("href") || $(el).attr("value");
          if (href && href !== "#") episodeLinks.push({
            text: $(el).text().trim(),
            href: href,
            current: false
          });
        });
      }
      const result = {
        title: title,
        tagline: additionalInfo["Tagline"] || "",
        poster: poster,
        synopsis: synopsis,
        genres: genres,
        year: year,
        duration: duration,
        quality: quality,
        rating: rating,
        rating_count: $('meta[itemprop="ratingCount"]').attr("content") || "",
        rating_percent: $(".gmr-rating-bar span").attr("style")?.match(/(\d+)%?/)?.[1] || "",
        views: views,
        country: extractMeta("Country") || extractMeta("Country:"),
        language: additionalInfo["Language"] || "",
        budget: additionalInfo["Budget"] || "",
        revenue: additionalInfo["Revenue"] || "",
        cast: extractMeta("Cast"),
        director: extractMeta("Director"),
        iframe_src: $('iframe[id^="jf-frame-"], .gmr-embed-responsive iframe').first().attr("src") || "",
        iframe_id: $('iframe[id^="jf-frame-"]').first().attr("id") || "",
        episode_links: episodeLinks,
        tags: $(".tags-links p, .tags-links a, .gmr-movie-tags a").map((_, tag) => $(tag).text().trim()).get().filter(Boolean),
        additional_info: additionalInfo,
        release_date: additionalInfo["Release"] || $('time[itemprop="dateCreated"], time.entry-date').attr("datetime") || "",
        type: $(".gmr-movie-genre a").text().toLowerCase().includes("serial") || episodeLinks.length > 0 ? "TV Series" : "Movie"
      };
      console.log(`[DETAIL] success: "${title}" (${result.type})`);
      return {
        status: true,
        result: result
      };
    } catch (e) {
      return {
        status: false,
        result: e.message
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
          home: "/?action=home",
          search: "/?action=search&query=viral",
          detail: "/?action=detail&url=https://"
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
  const api = new JuraganFilm();
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
            example: "/?action=search&query=viral"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "/?action=detail&url=https://"
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
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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