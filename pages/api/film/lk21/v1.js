import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class LK21 {
  constructor() {
    this.proxy = proxy;
    this.base = "https://tv10.lk21official.cc";
    this.dramamu = "https://dramamu.lk21.de";
    this.cover = "https://cover.showcdnx.com/wp-content/uploads/";
    this.searchApi = "https://gudangvape.com/search.php";
    this.api = axios.create({
      baseURL: this.proxy + this.base,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
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
  parseItem($, el) {
    const a = $(el).find('a[itemprop="url"], a').first();
    const img = $(el).find("img").first();
    const poster = img.attr("src") || img.attr("data-src") || "";
    return {
      title: $(el).find(".poster-title").text().trim(),
      slug: (a.attr("href") || "").replace(/^\//, "").replace(/\/$/, ""),
      url: a.attr("href")?.startsWith("http") ? a.attr("href") : `${this.base}${a.attr("href") || ""}`,
      year: $(el).find(".year").text().trim(),
      rating: $(el).find('.poster .rating [itemprop="ratingValue"]').text().trim() || ($(el).find(".poster .rating").text().match(/\d+(\.\d+)?/) || [""])[0],
      quality: $(el).find(".poster .label").text().trim(),
      episode: $(el).find(".episode strong").text().trim(),
      season: ($(el).find(".duration:not([itemprop])").text().trim() || "").replace("S.", ""),
      runtime: $(el).find('.duration[itemprop="duration"]').text().trim(),
      genre: $(el).find('meta[itemprop="genre"]').attr("content") || "",
      poster: poster.startsWith("http") ? poster : poster ? this.cover + poster : ""
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
    const sections = $(".widget[data-type]").map((_, w) => {
      const id = $(w).attr("id");
      if (id === "you-may-wrapper") return null;
      const type = $(w).attr("data-type") || "";
      const title = $(w).find(".header h2").text().trim();
      const seeAll = $(w).find(".header a").attr("href") || "";
      const items = $(w).find("li.slider, #you-may-also-like li").map((_, el) => this.parseItem($, el)).get();
      return {
        type: type,
        title: title,
        seeAll: seeAll.startsWith("http") ? seeAll : `${this.base}${seeAll}`,
        items: items
      };
    }).get().filter(Boolean);
    const latest = $("#post-container article, .gallery-grid article").map((_, el) => this.parseItem($, el)).get();
    return {
      sections: sections,
      latest: latest
    };
  }
  async browse({
    path = "/populer",
    page = 1,
    type = "",
    ...rest
  } = {}) {
    let url = path.startsWith("http") ? path : `${this.base}/${path.replace(/^\//, "")}`;
    if (page > 1) url += `${url.endsWith("/") ? "" : "/"}page/${page}`;
    if (type && ["movie", "series", "both"].includes(type)) {
      url += `${url.includes("?") ? "&" : "?"}type=${type}`;
    }
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) return null;
    const title = $("h1").first().text().trim();
    const items = $(".gallery-grid article, #post-container article").map((_, el) => this.parseItem($, el)).get();
    const totalPages = $(".pagination li:not(.active) a").map((_, a) => parseInt($(a).attr("href")?.match(/page\/(\d+)/)?.[1] || $(a).text(), 10)).get().filter(n => !isNaN(n));
    const last = totalPages.length ? Math.max(...totalPages) : 1;
    return {
      title: title,
      page: parseInt(page),
      totalPages: last,
      items: items
    };
  }
  async getGenres({
    ...rest
  } = {}) {
    const $ = await this.req({
      url: "/genre/",
      ...rest
    });
    if (!$) return [];
    const raw = $('a[href^="/genre/"]').map((_, a) => ({
      slug: $(a).attr("href").split("/").filter(Boolean)[1],
      name: $(a).text().trim()
    })).get();
    const seen = new Set();
    return raw.filter(g => {
      if (!g.name || seen.has(g.slug)) return false;
      seen.add(g.slug);
      return true;
    });
  }
  async getCountries({
    ...rest
  } = {}) {
    const $ = await this.req({
      url: "/country/",
      ...rest
    });
    if (!$) return [];
    const map = new Map();
    $('a[href^="/country/"]').map((_, a) => {
      const s = $(a).attr("href").split("/").filter(Boolean)[1];
      if (s) {
        map.set(s, {
          slug: s,
          name: $(a).text().trim()
        });
      }
    });
    return [...map.values()];
  }
  async getYears({
    ...rest
  } = {}) {
    const $ = await this.req({
      url: "/year/",
      ...rest
    });
    if (!$) return [];
    const raw = $('a[href^="/year/"]').map((_, a) => $(a).attr("href").split("/").filter(Boolean)[1]).get();
    return [...new Set(raw)].filter(Boolean);
  }
  async search({
    query = "",
    page = 1,
    ...rest
  } = {}) {
    const url = `${this.searchApi}?s=${encodeURIComponent(query)}&page=${page}`;
    const data = await this.req({
      url: url,
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "x-requested-with": "XMLHttpRequest"
      },
      ...rest
    });
    if (!data) return null;
    const rawItems = data.data || data.items || [];
    const items = rawItems.map(it => ({
      title: it.title,
      slug: it.slug,
      url: `${this.base}/${it.slug}`,
      year: it.year,
      rating: it.rating,
      quality: it.quality,
      episode: it.episode || undefined,
      season: it.season || undefined,
      runtime: it.runtime || undefined,
      type: it.type || undefined,
      poster: it.poster?.startsWith("http") ? it.poster : it.poster ? this.cover + it.poster : ""
    }));
    return {
      query: query,
      page: parseInt(page),
      totalPages: data.totalPages || data.total_pages || 1,
      items: items
    };
  }
  async detail({
    url = "",
    ...rest
  } = {}) {
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) return null;
    const openNow = $("#openNow").attr("href");
    if (openNow) {
      return this.detailSeries({
        url: openNow,
        ...rest
      });
    }
    return this.detailMovie({
      $: $,
      url: url,
      ...rest
    });
  }
  parseDetailCore($) {
    const infoTag = $(".info-tag span").map((_, el) => $(el).text().trim()).get();
    const tags = $(".tag-list .tag a").map((_, el) => ({
      type: $(el).attr("href").split("/").filter(Boolean)[0],
      slug: $(el).attr("href").split("/").filter(Boolean)[1],
      name: $(el).text().trim()
    })).get();
    const meta = {};
    $(".detail p").map((_, el) => {
      const label = $(el).find("span").text().replace(":", "").trim();
      const val = $(el).clone().find("span").remove().end().text().trim();
      if (label) meta[label] = val;
    });
    const terbaru = $(".meta-info > p").first().find("a").text().trim();
    return {
      title: $("h1").first().text().trim(),
      infoTag: infoTag,
      rating: $(".rating-number").attr("data-base-rating") || "",
      votes: $(".rating-users").attr("data-base-votes") || "",
      genres: tags.filter(t => t.type === "genre").map(t => t.name),
      country: tags.filter(t => t.type === "country").map(t => t.name),
      director: meta["Sutradara"] || "",
      cast: (meta["Bintang Film"] || "").split(",").map(s => s.trim()).filter(Boolean),
      release: meta["Release"] || "",
      updated: meta["Updated"] || "",
      votesMeta: meta["Votes"] || "",
      synopsis: $(".synopsis").text().trim(),
      latestEpisode: terbaru,
      poster: $(".detail img").attr("src") || $(".detail img").attr("data-src") || "",
      trailer: $(".trailer-series iframe, .simple-box iframe").attr("src") || ""
    };
  }
  async detailMovie({
    $,
    url,
    ...rest
  } = {}) {
    if (!$) {
      $ = await this.req({
        url: url,
        ...rest
      });
      if (!$) return null;
    }
    const core = this.parseDetailCore($);
    const playLinks = $(".movie-action a").map((_, a) => {
      const href = $(a).attr("href") || "";
      const text = $(a).text().replace(/\s+/g, " ").trim();
      if (/^\/|^https?:\/\//.test(href) && !/^#/.test(href)) {
        return {
          text: text,
          url: href
        };
      }
      return null;
    }).get().filter(Boolean);
    const players = $("#player-list a[data-url], #player-list li a").map((_, a) => {
      const u = $(a).attr("data-url") || $(a).attr("href");
      if (u) {
        return {
          server: $(a).attr("data-server") || $(a).text().trim().toLowerCase(),
          url: u
        };
      }
      return null;
    }).get().filter(Boolean);
    return {
      type: "movie",
      url: url,
      ...core,
      download: $('a[title^="Download"]').attr("href") || "",
      playAwal: playLinks[0]?.url || "",
      playTerbaru: playLinks[1]?.url || "",
      players: players,
      related: []
    };
  }
  async detailSeries({
    url,
    ...rest
  } = {}) {
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) return null;
    const core = this.parseDetailCore($);
    const seasons = {};
    const sd = $("#season-data").text();
    if (sd) {
      try {
        const parsed = JSON.parse(sd);
        for (const [s, eps] of Object.entries(parsed)) {
          seasons[s] = eps.map(e => ({
            episode: e.episode_no,
            title: e.title,
            slug: e.slug,
            url: `${this.dramamu}/${e.slug}`
          }));
        }
      } catch {}
    }
    const playLinks = $(".movie-action a").map((_, a) => {
      const href = $(a).attr("href") || "";
      const text = $(a).text().replace(/\s+/g, " ").trim();
      if (!/^(#|\/country|\/genre)/.test(href)) {
        return {
          text: text,
          url: href
        };
      }
      return null;
    }).get().filter(Boolean);
    const related = $(".widget[data-type] li.slider").map((_, el) => this.parseItem($, el)).get();
    return {
      type: "series",
      url: url,
      ...core,
      seasons: seasons,
      totalEpisodes: Object.values(seasons).reduce((n, e) => n + e.length, 0),
      playAwal: playLinks[0]?.url || "",
      playTerbaru: playLinks[1]?.url || "",
      related: related
    };
  }
  async stream({
    url = "",
    ...rest
  } = {}) {
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) return null;
    const players = $("#player-list a[data-url], #player-list li a").map((_, a) => {
      const server = $(a).attr("data-server") || $(a).text().trim().toLowerCase();
      const u = $(a).attr("data-url") || $(a).attr("href");
      if (u && u !== "#") {
        return {
          server: server,
          url: u,
          active: $(a).hasClass("active")
        };
      }
      return null;
    }).get().filter(Boolean);
    if (!players.length) {
      const src = $("#main-player").attr("src");
      if (src) players.push({
        server: "p2p",
        url: src,
        active: true
      });
    }
    const nav = $('a:contains("EPISODE SEBELUMNYA"), a:contains("EPISODE BERIKUTNYA"), .prev-episode a, .next-episode a').map((_, a) => {
      const href = $(a).attr("href");
      if (href && /^\/|^https?:/.test(href)) {
        return {
          text: $(a).text().trim(),
          url: href
        };
      }
      return null;
    }).get().filter(Boolean);
    return {
      url: url,
      title: $("h1").first().text().trim(),
      players: players,
      nav: nav
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "browse", "genres", "countries", "years", "search", "detail", "stream"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/api?action=home",
          browse: "/api?action=browse&path=/populer&page=1",
          genres: "/api?action=genres",
          countries: "/api?action=countries",
          years: "/api?action=years",
          search: "/api?action=search&query=agent&page=1",
          detail: "/api?action=detail&url=https://tv10.lk21official.cc/agent-shaan-elite-pursuit-2026",
          stream: "/api?action=stream&url=https://tv10.lk21official.cc/agent-shaan-elite-pursuit-2026"
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
  const api = new LK21();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "browse":
        response = await api.browse(params);
        break;
      case "genres":
        response = await api.getGenres(params);
        break;
      case "countries":
        response = await api.getCountries(params);
        break;
      case "years":
        response = await api.getYears(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi."
          });
        }
        response = await api.detail(params);
        break;
      case "stream":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi."
          });
        }
        response = await api.stream(params);
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