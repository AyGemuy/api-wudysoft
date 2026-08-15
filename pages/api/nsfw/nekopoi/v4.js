import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class NontonHentai {
  constructor() {
    this.baseUrl = "https://nontonhentai.org";
    this.corsUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://nontonhentai.org/",
      Origin: "https://nontonhentai.org",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=0, i"
    };
  }
  async req(url, method = "GET", data = null) {
    try {
      const target = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
      const finalUrl = `${this.corsUrl}${target}`;
      console.log(`[LOG] Fetching: ${target} (${method})`);
      const config = {
        method: method,
        url: finalUrl,
        headers: this.headers,
        timeout: 6e4
      };
      if (method === "POST" && data) {
        config.data = qs.stringify(data);
        config.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
        config.headers["X-Requested-With"] = "XMLHttpRequest";
      }
      const response = await axios(config);
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`[ERROR] Request Failed [${url}]: ${error.message}`);
      throw new Error(`Failed to fetch ${url}`);
    }
  }
  async home() {
    try {
      const $ = await this.req("/");
      const result = {
        latest_episodes: []
      };
      $(".listupd .bs").each((i, el) => {
        const link = $(el).find(".bsx a").first();
        const url = link.attr("href") || null;
        const title = link.find(".tt h2").text()?.trim() || link.find(".tt").text()?.trim() || "Unknown";
        const cover = link.find(".limit img").attr("src") || link.find(".limit img").attr("data-src") || null;
        const type = link.find(".limit .typez").text()?.trim() || null;
        const episode = link.find(".limit .bt .epx").text()?.trim() || null;
        const subtitle = link.find(".limit .bt .sb").text()?.trim() || null;
        const hot = link.find(".limit .hotbadge").length > 0;
        result.latest_episodes.push({
          title: title,
          url: url,
          cover: cover,
          type: type,
          episode: episode,
          subtitle: subtitle,
          hot: hot
        });
      });
      console.log(`[LOG] Home: Found ${result.latest_episodes.length} latest episodes.`);
      return result;
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {
        latest_episodes: []
      };
    }
  }
  async search({
    keyword,
    page = 1,
    limit = 10
  }) {
    try {
      if (!keyword) throw new Error("Keyword is required");
      const searchUrl = page === 1 ? `/?s=${encodeURIComponent(keyword)}` : `/page/${page}/?s=${encodeURIComponent(keyword)}`;
      const $ = await this.req(searchUrl);
      const results = [];
      $(".listupd .bs").each((i, el) => {
        const link = $(el).find(".bsx a").first();
        const url = link.attr("href") || null;
        const title = link.find(".tt h2").text()?.trim() || link.find(".tt").text()?.trim() || "Unknown";
        const cover = link.find(".limit img").attr("src") || link.find(".limit img").attr("data-src") || null;
        const type = link.find(".limit .typez").text()?.trim() || null;
        const status = link.find(".limit .bt .epx").text()?.trim() || null;
        const subtitle = link.find(".limit .bt .sb").text()?.trim() || null;
        results.push({
          title: title,
          url: url,
          cover: cover,
          type: type,
          status: status,
          subtitle: subtitle
        });
      });
      const limited = results.slice(0, limit);
      console.log(`[LOG] Search: Found ${results.length} results, returning ${limited.length}`);
      return {
        results: limited,
        total: results.length
      };
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        results: []
      };
    }
  }
  async detail({
    url
  }) {
    try {
      const $ = await this.req(url);
      const title = $(".animefull .infox h1.entry-title").text()?.trim() || "Unknown";
      const cover = $(".animefull .thumb img").attr("src") || $(".animefull .thumb img").attr("data-src") || null;
      const rating = $(".animefull .rating strong").text()?.trim() || null;
      const altTitle = $(".animefull .ninfo .alter").text()?.trim() || null;
      const info = {};
      $(".animefull .infox .spe span").each((i, el) => {
        const text = $(el).text()?.trim() || "";
        const parts = text.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const value = parts.slice(1).join(":").trim();
          info[key] = value;
        }
      });
      const genres = [];
      $(".animefull .infox .genxed a").each((i, el) => {
        genres.push($(el).text()?.trim());
      });
      let synopsis = "";
      $(".synp .entry-content p").each((i, el) => {
        synopsis += $(el).text()?.trim() + "\n";
      });
      synopsis = synopsis.trim();
      const episodes = [];
      $(".eplister ul li").each((i, el) => {
        const a = $(el).find("a");
        const epUrl = a.attr("href") || null;
        const epNum = $(el).find(".epl-num").text()?.trim() || null;
        const epTitle = $(el).find(".epl-title").text()?.trim() || null;
        const epSub = $(el).find(".epl-sub .status").text()?.trim() || null;
        const epDate = $(el).find(".epl-date").text()?.trim() || null;
        if (epUrl) {
          episodes.push({
            number: epNum,
            title: epTitle,
            url: epUrl,
            subtitle: epSub,
            date: epDate
          });
        }
      });
      const data = {
        title: title,
        alt_title: altTitle,
        cover: cover,
        rating: rating,
        synopsis: synopsis,
        metadata: info,
        genres: genres,
        episodes_count: episodes.length,
        episodes: episodes
      };
      console.log(`[LOG] Detail Series: ${data.title} (${data.episodes_count} episodes)`);
      return data;
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
  }
  async episode({
    url
  }) {
    try {
      const $ = await this.req(url);
      const title = $(".megavid .title-section h1.entry-title").text()?.trim() || "Unknown";
      const metaText = $(".megavid .lm .year").text()?.trim() || "";
      const seriesLink = $(".megavid .lm .year a").attr("href") || null;
      const seriesName = $(".megavid .lm .year a").text()?.trim() || null;
      const views = $(".megavid .lm .year #ts-ep-view").text()?.trim() || null;
      let embedUrl = null;
      const iframe = $(".video-content .player-embed iframe");
      if (iframe.length) {
        embedUrl = iframe.attr("src") || null;
      }
      const nav = {
        prev: $(".naveps .nvs a[rel='prev']").attr("href") || null,
        next: $(".naveps .nvs a[rel='next']").attr("href") || null,
        toc: $(".naveps .nvs a[href*='/series/']").attr("href") || null
      };
      const episodeList = [];
      $("#mobilepisode .episodelist ul li").each((i, el) => {
        const a = $(el).find("a");
        const epUrl = a.attr("href") || null;
        const epTitle = a.find(".playinfo h3").text()?.trim() || null;
        const epNumber = a.find(".playinfo span").text()?.trim() || null;
        if (epUrl) {
          episodeList.push({
            title: epTitle,
            url: epUrl,
            info: epNumber
          });
        }
      });
      const data = {
        title: title,
        series: {
          name: seriesName,
          url: seriesLink
        },
        views: views,
        embed_url: embedUrl,
        navigation: nav,
        episode_list: episodeList
      };
      console.log(`[LOG] Episode: ${data.title}`);
      return data;
    } catch (error) {
      console.error("[ERROR] Episode:", error.message);
      throw error;
    }
  }
  async popular({
    range = "weekly"
  } = {}) {
    try {
      const $ = await this.req("/");
      const mapRange = {
        weekly: ".wpop-weekly",
        monthly: ".wpop-monthly",
        alltime: ".wpop-alltime"
      };
      const selector = mapRange[range] || ".wpop-weekly";
      const container = $(`#wpop-items ${selector}`);
      const items = [];
      container.find("ul li").each((i, el) => {
        const rank = $(el).find(".ctr").text()?.trim() || null;
        const link = $(el).find(".imgseries a").first();
        const url = link.attr("href") || null;
        const title = $(el).find(".leftseries h4 a").text()?.trim() || null;
        const cover = $(el).find(".imgseries img").attr("src") || $(el).find(".imgseries img").attr("data-src") || null;
        const genres = [];
        $(el).find(".leftseries span a").each((j, a) => {
          genres.push($(a).text()?.trim());
        });
        const rating = $(el).find(".numscore").text()?.trim() || null;
        items.push({
          rank: parseInt(rank, 10) || i + 1,
          title: title,
          url: url,
          cover: cover,
          genres: genres,
          rating: rating
        });
      });
      console.log(`[LOG] Popular (${range}): Found ${items.length} items`);
      return {
        range: range,
        items: items
      };
    } catch (error) {
      console.error("[ERROR] Popular:", error.message);
      return {
        range: range,
        items: []
      };
    }
  }
  async genres() {
    try {
      const $ = await this.req("/genre/");
      const genres = [];
      $(".achlist li a").each((i, el) => {
        const name = $(el).contents().filter((_, t) => t.type === "text").text()?.trim();
        const count = $(el).find("span").text()?.trim() || "0";
        const url = $(el).attr("href") || null;
        if (name) {
          genres.push({
            name: name,
            count: count,
            url: url
          });
        }
      });
      console.log(`[LOG] Genres: Found ${genres.length} genres`);
      return genres;
    } catch (error) {
      console.error("[ERROR] Genres:", error.message);
      return [];
    }
  }
  async seriesList({
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? "/hentai-sub-indo/" : `/hentai-sub-indo/page/${page}/`;
      const $ = await this.req(url);
      const series = [];
      $(".listupd .bs").each((i, el) => {
        const link = $(el).find(".bsx a").first();
        const url = link.attr("href") || null;
        const title = link.find(".tt h2").text()?.trim() || link.find(".tt").text()?.trim() || "Unknown";
        const cover = link.find(".limit img").attr("src") || link.find(".limit img").attr("data-src") || null;
        const type = link.find(".limit .typez").text()?.trim() || null;
        const status = link.find(".limit .bt .epx").text()?.trim() || null;
        const subtitle = link.find(".limit .bt .sb").text()?.trim() || null;
        series.push({
          title: title,
          url: url,
          cover: cover,
          type: type,
          status: status,
          subtitle: subtitle
        });
      });
      let totalPages = 1;
      const lastPageLink = $(".pagination .page-numbers:not(.next):not(.prev)").last();
      if (lastPageLink.length) {
        const lastPageHref = lastPageLink.attr("href");
        if (lastPageHref) {
          const match = lastPageHref.match(/\/page\/(\d+)/);
          if (match) totalPages = parseInt(match[1], 10);
        }
      }
      console.log(`[LOG] Series List: Page ${page} of ${totalPages}, found ${series.length} items`);
      return {
        page: page,
        total_pages: totalPages,
        series: series
      };
    } catch (error) {
      console.error("[ERROR] Series List:", error.message);
      return {
        page: page,
        total_pages: 0,
        series: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "episode", "popular", "genres", "series_list"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/nontonhentai?action=search&keyword=kano"
      }
    });
  }
  const api = new NontonHentai();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search({
          keyword: params.keyword,
          page: parseInt(params.page, 10) || 1,
          limit: parseInt(params.limit, 10) || 10
        });
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://nontonhentai.org/series/kanochi-x-netorare-kazoku-the-animation/"
          });
        }
        response = await api.detail({
          url: params.url
        });
        break;
      case "episode":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'episode'.",
            example: "https://nontonhentai.org/kanochi-x-netorare-kazoku-the-animation-episode-2-subtitle-indonesia/"
          });
        }
        response = await api.episode({
          url: params.url
        });
        break;
      case "popular":
        const range = params.range || "weekly";
        if (!["weekly", "monthly", "alltime"].includes(range)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'range' harus salah satu dari: weekly, monthly, alltime."
          });
        }
        response = await api.popular({
          range: range
        });
        break;
      case "genres":
        response = await api.genres();
        break;
      case "series_list":
        const page = parseInt(params.page, 10) || 1;
        response = await api.seriesList({
          page: page
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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