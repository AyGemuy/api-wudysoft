import axios from "axios";
import * as cheerio from "cheerio";
class Doroni {
  constructor() {
    this.BASE = "https://doroni.me";
    this.HEADERS = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cookies = {};
    this.ax = axios.create({
      baseURL: this.BASE,
      headers: this.HEADERS,
      timeout: 15e3,
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    this.ax.interceptors.request.use(config => {
      const cookieHeader = this._getC();
      if (cookieHeader) config.headers["Cookie"] = cookieHeader;
      return config;
    }, error => Promise.reject(error));
    this.ax.interceptors.response.use(async response => {
      this._saveC(response.headers["set-cookie"]);
      const status = response.status;
      if (status >= 300 && status < 400 && response.headers.location) {
        const config = response.config;
        config.__redirectCount = (config.__redirectCount || 0) + 1;
        if (config.__redirectCount > 5) throw new Error("Max redirects exceeded");
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith("http")) redirectUrl = this._toA(redirectUrl);
        try {
          const urlObj = new URL(redirectUrl);
          if (urlObj.pathname === "/" || urlObj.pathname === "") {
            console.log(`[REDIRECT STOP] -> ${redirectUrl} (${status}) – berhenti di root`);
            return response;
          }
        } catch (e) {}
        console.log(`[REDIRECT] -> ${redirectUrl} (${status})`);
        if ((status === 302 || status === 303) && config.method?.toLowerCase() === "post") {
          config.method = "get";
          delete config.data;
          ["content-type", "Content-Type", "content-length", "Content-Length"].forEach(h => delete config.headers[h]);
        }
        config.url = redirectUrl;
        config.headers = config.headers || {};
        config.headers["Cookie"] = this._getC();
        return this.ax(config);
      }
      return response;
    }, error => {
      if (error.response) this._saveC(error.response.headers["set-cookie"]);
      return Promise.reject(error);
    });
  }
  _saveC(setCookieHeader) {
    if (!setCookieHeader) return;
    const cookiesArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    cookiesArray.forEach(cookieStr => {
      const parts = cookieStr.split(";")[0].split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        this.cookies[key] = value;
      }
    });
  }
  _getC() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  _toU(val) {
    return val?.startsWith("http") ? val : `${this.BASE}/${val?.replace(/^\//, "") || ""}`;
  }
  _toA(val) {
    return val?.startsWith("http") ? val : val ? `${this.BASE}${val.startsWith("/") ? "" : "/"}${val}` : null;
  }
  _clean(s) {
    return s?.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || null;
  }
  async _get(url) {
    try {
      console.log(`[GET] ${url}`);
      const res = await this.ax.get(url);
      console.log(`[OK] ${url} status=${res.status}`);
      return cheerio.load(res.data);
    } catch (err) {
      console.error(`[_get] Gagal memuat ${url}: ${err.message}`);
      throw err;
    }
  }
  async _resolveSafelink(downloadUrl) {
    const maxRetries = 3;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[resolve] Percobaan ${attempt}/${maxRetries}: ${downloadUrl}`);
        const downloadHeaders = {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": this.HEADERS["user-agent"],
          referer: this.BASE
        };
        const res = await this.ax.get(downloadUrl, {
          headers: downloadHeaders
        });
        const $ = cheerio.load(res.data);
        const checker = $("#SafelinkChecker");
        const safelinkUrl = checker.attr("data-url");
        const safelinkId = checker.attr("data-id");
        if (!safelinkUrl || !safelinkId) throw new Error("data-url or data-id not found");
        const csrfToken = $('meta[name="csrf-token"]').attr("content") || $('input[name="_token"]').val() || this.cookies["XSRF-TOKEN"];
        if (!csrfToken) throw new Error("CSRF token not found");
        const postHeaders = {
          accept: "application/json, text/javascript, */*; q=0.01",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: this.BASE,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: downloadUrl,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": this.HEADERS["user-agent"],
          "x-csrf-token": decodeURIComponent(csrfToken),
          "x-requested-with": "XMLHttpRequest"
        };
        const postRes = await this.ax.post(this._toA(safelinkUrl), `id=${encodeURIComponent(safelinkId)}`, {
          headers: postHeaders
        });
        const json = postRes.data;
        if (!json.data?.url) throw new Error("Safelink response missing data.url");
        const goUrl = json.data.url;
        console.log(`[resolve] goUrl: ${goUrl}`);
        const goHeaders = {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          referer: downloadUrl,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": this.HEADERS["user-agent"]
        };
        const goRes = await this.ax.get(goUrl, {
          headers: goHeaders
        });
        const $go = cheerio.load(goRes.data);
        const metaRefresh = $go('meta[http-equiv="refresh"]').attr("content");
        if (metaRefresh) {
          const match = metaRefresh.match(/url=['"]?(.*?)['"]?$/);
          if (match) {
            console.log(`[resolve] Ekstrak dari meta refresh: ${match[1]}`);
            return match[1].trim();
          }
        }
        const link = $go("#SafelinkGenerate").attr("href");
        if (link && link.startsWith("http")) {
          console.log(`[resolve] Ekstrak dari #SafelinkGenerate: ${link}`);
          return link;
        }
        console.log(`[resolve] Fallback ke URL akhir: ${goRes.config.url}`);
        return goRes.config.url;
      } catch (err) {
        console.error(`[resolve] Percobaan ${attempt} gagal: ${err.message}`);
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1e3));
        }
      }
    }
    throw lastError;
  }
  _parsePagination($) {
    const nums = $(".Pagination__page-item .Pagination__page-link").map((_, el) => parseInt($(el).text().trim())).get().filter(n => !isNaN(n));
    const active = parseInt($(".Pagination__page-item.active .Pagination__page-link").text().trim()) || 1;
    const next_url = $('a[rel="next"]').attr("href") || null;
    const prev_url = $('a[rel="prev"]').attr("href") || null;
    return {
      current_page: active,
      total_page: Math.max(...nums, 1),
      has_next: !!next_url,
      has_prev: !!prev_url,
      next_url: next_url,
      prev_url: prev_url
    };
  }
  _parseCarousel($) {
    return $(".owl-item:not(.cloned) a.Card").map((_, el) => {
      const $el = $(el);
      const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
      const status = $el.find(".Card__badge:not(.Card__badge--bottom):not(.Card__badge--right) .Badge").first().text().trim() || null;
      const types = $el.find(".Card__badge--bottom .Badge").map((_, b) => $(b).text().trim()).get();
      const score_raw = $el.find(".Card__badge--right .Badge--warning").text().trim().replace(/[^\d.]/g, "");
      return {
        title: $el.attr("title") || $el.find(".Card__caption small").text().trim() || null,
        url: $el.attr("href") || null,
        thumbnail: img,
        status: status || null,
        types: types,
        score: score_raw ? parseFloat(score_raw) : null
      };
    }).get();
  }
  _parseSidebarOngoing($) {
    return $(".Sidebar__card ul li[data-preview-image]").map((_, el) => {
      const $el = $(el);
      const title_a = $el.find(".Sidebar__card-title");
      const badge_a = $el.find(".Sidebar__card-badge");
      return {
        title: title_a.attr("title") || title_a.find("small").text().trim() || null,
        url: this._toA(title_a.attr("href")),
        preview_image: $el.attr("data-preview-image") || null,
        latest_episode: badge_a.find("small").text().trim() || null,
        latest_url: this._toA(badge_a.attr("href"))
      };
    }).get();
  }
  _parseSidebarMovies($) {
    return $(".Sidebar__card-container").map((_, el) => {
      const $el = $(el);
      const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
      const release = $el.find("small").text().replace(/.*Rilis:\s*/i, "").trim() || null;
      return {
        title: $el.attr("title") || $el.find(".Sidebar__card-caption span").text().trim() || null,
        url: this._toA($el.attr("href")),
        thumbnail: img,
        release: release
      };
    }).get();
  }
  _parseSidebarSeasons($) {
    return $(".Sidebar__season ul li a").map((_, el) => {
      const $el = $(el);
      const count_raw = $el.find("span").text().trim();
      const label = $el.text().replace(count_raw, "").trim();
      return {
        label: label,
        url: this._toA($el.attr("href")),
        count: count_raw ? parseInt(count_raw) : null
      };
    }).get();
  }
  async home({
    ost = false,
    page = null,
    ...rest
  } = {}) {
    try {
      console.log(`[home] ost=${ost}, page=${page || 1}`);
      const path = ost ? "/ost" : "/";
      const params = page > 1 ? `?page=${page}` : "";
      const $ = await this._get(`${path}${params}`);
      const featured = ost ? [] : this._parseCarousel($);
      const section = ost ? "OST Terbaru" : "Anime Terbaru";
      const tabHeader = $(".Content__tabs-header span").filter((_, el) => $(el).text().trim() === section).first();
      const tabBody = tabHeader.closest(".Content__tabs").find(".Content__tabs-body");
      const items = tabBody.find(".Card").map((_, el) => {
        const $el = $(el);
        const cap_a = $el.find(".Card__caption a, h6 a").first();
        const img_a = $el.find(".Card__image a").first();
        const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
        const badge = $el.find(".Card__image .Card__badge .Badge").first().text().trim() || null;
        const release = $el.find("small").filter((_, s) => $(s).text().includes("Rilis")).text().replace(/.*Rilis:\s*/i, "").trim() || null;
        const author = $el.find("author").text().trim() || null;
        const ep_url = this._toA(img_a.attr("href"));
        const anime_url = this._toA(cap_a.attr("href") || img_a.attr("href"));
        return {
          title: cap_a.attr("title") || cap_a.text().trim() || img_a.attr("title") || null,
          url: anime_url,
          episode_url: ep_url !== anime_url ? ep_url : null,
          thumbnail: img,
          badge: badge,
          author: author,
          release: release
        };
      }).get();
      let ost_latest = [];
      if (!ost) {
        const ostH = $(".Content__tabs-header span").filter((_, el) => $(el).text().trim() === "OST Terbaru").first();
        if (ostH.length) {
          ost_latest = ostH.closest(".Content__tabs").find(".Card").map((_, el) => {
            const $el = $(el);
            const a = $el.find(".Card__caption a, h6 a").first();
            const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
            const release = $el.find("small").filter((_, s) => $(s).text().includes("Rilis")).text().replace(/.*Rilis:\s*/i, "").trim() || null;
            const author = $el.find("author").text().trim() || null;
            return {
              title: a.attr("title") || a.text().trim() || null,
              url: this._toA(a.attr("href")),
              thumbnail: img,
              author: author,
              release: release
            };
          }).get();
        }
      }
      const pg = this._parsePagination($);
      pg.current_page = page || 1;
      return {
        status: true,
        result: {
          ...pg,
          featured: featured,
          items: items,
          ...ost ? {} : {
            ost_latest: ost_latest
          },
          sidebar: {
            ongoing: this._parseSidebarOngoing($),
            recent_movies: this._parseSidebarMovies($),
            seasons: this._parseSidebarSeasons($)
          }
        }
      };
    } catch (err) {
      console.error(`[home] error: ${err.message}`);
      return {
        status: false,
        result: err.message
      };
    }
  }
  async search({
    query = "",
    page = null,
    ...rest
  } = {}) {
    try {
      console.log(`[search] query="${query}", page=${page || 1}`);
      const qp = new URLSearchParams();
      if (query) qp.set("s", query);
      if (page > 1) qp.set("page", page);
      const qs = qp.toString() ? `?${qp}` : "";
      const $ = await this._get(`/search${qs}`);
      const parseSection = label => {
        const h = $(".Content__tabs-header span").filter((_, el) => $(el).text().includes(label)).first();
        if (!h.length) return {
          items: [],
          total_page: 1,
          has_next: false,
          has_prev: false,
          next_url: null,
          prev_url: null
        };
        const tab = h.closest(".Content__tabs");
        const items = tab.find(".Card--column").map((_, el) => {
          const $el = $(el);
          const link = $el.is("a") ? $el : $el.find("a").first();
          const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
          const status = $el.find(".Card__badge:not(.Card__badge--bottom):not(.Card__badge--right) .Badge").first().text().trim() || null;
          const types = $el.find(".Card__badge--bottom .Badge").map((_, b) => $(b).text().trim()).get();
          const score_raw = $el.find(".Card__badge--right .Badge--warning").text().trim().replace(/[^\d.]/g, "");
          return {
            title: link.attr("title") || $el.find(".Card__caption small").text().trim() || null,
            url: this._toA(link.attr("href")),
            thumbnail: img,
            status: status || null,
            types: types,
            score: score_raw ? parseFloat(score_raw) : null
          };
        }).get();
        const pag = tab.find(".Content__tabs-pagination");
        const nums = pag.find(".Pagination__page-link").map((_, el) => parseInt($(el).text().trim())).get().filter(n => !isNaN(n));
        const next = pag.find('a[rel="next"]').attr("href") || null;
        const prev = pag.find('a[rel="prev"]').attr("href") || null;
        return {
          items: items,
          total_page: Math.max(...nums, 1),
          has_next: !!next,
          has_prev: !!prev,
          next_url: next,
          prev_url: prev
        };
      };
      const search_query = $(".Content__tabs-header span").filter((_, el) => $(el).text().includes("Pencarian Anime")).first().text().replace("Pencarian Anime:", "").replace("Pencarian Anime", "").trim() || query || null;
      const anime = parseSection("Pencarian Anime");
      const ost = parseSection("Pencarian OST");
      return {
        status: true,
        result: {
          query: search_query,
          current_page: page || 1,
          anime: anime,
          ost: ost,
          sidebar: {
            ongoing: this._parseSidebarOngoing($),
            recent_movies: this._parseSidebarMovies($),
            seasons: this._parseSidebarSeasons($)
          }
        }
      };
    } catch (err) {
      console.error(`[search] error: ${err.message}`);
      return {
        status: false,
        result: err.message
      };
    }
  }
  async detail({
    url,
    ...rest
  } = {}) {
    try {
      console.log(`[detail] url=${url}`);
      const target = this._toU(url);
      const $ = await this._get(target);
      const article = $("article.Content__tabs-content").first();
      const title = article.find(".Content__title").text().trim() || null;
      const native_title = article.find(".Content__tabs-content-title > span").first().text().trim() || null;
      const thumbnail = article.find('.Content__header-image picture source[type="image/jpeg"]').attr("srcset") || article.find(".Content__header-image img").attr("src") || null;
      const meta = {};
      article.find(".Content__header-caption-item").each((_, el) => {
        const $el = $(el);
        const raw_key = $el.find("b").text().replace(":", "").trim();
        const key = this._clean(raw_key);
        if (!key) return;
        const links = $el.find("a");
        if (links.length) {
          meta[key] = links.map((__, a) => ({
            name: $(a).text().trim() || null,
            url: this._toA($(a).attr("href"))
          })).get();
        } else {
          meta[key] = $el.find("span").text().trim() || null;
        }
      });
      const date_published = $('meta[itemprop="datePublished"]').attr("content") || null;
      const date_modified = $('meta[itemprop="dateModified"]').attr("content") || null;
      const synopsis = $(".Content__tabs-header span").filter((_, el) => $(el).text().trim() === "Sinopsis").closest(".Content__tabs").find(".Content__tabs-content--small p").map((_, el) => $(el).text().trim()).get().join("\n") || null;
      const episodes = $(".Content__table-body").map((_, el) => {
        const $el = $(el);
        const cols = $el.find("> div");
        const label_a = cols.eq(0).find("a").first();
        const title_a = cols.eq(1).find("a").first();
        const release = cols.eq(2).text().trim() || null;
        const dl_a = cols.eq(3).find("a").first();
        return {
          label: label_a.text().trim() || null,
          title: title_a.text().trim() || label_a.text().trim() || null,
          url: this._toA(label_a.attr("href")),
          release: release,
          download_url: this._toA(dl_a.attr("href"))
        };
      }).get();
      const related = $(".Content__tabs-header span").filter((_, el) => $(el).text().trim() === "Anime Lainnya").closest(".Content__tabs").find(".Card--column").map((_, el) => {
        const $el = $(el);
        const link = $el.is("a") ? $el : $el.find("a").first();
        const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
        const status = $el.find(".Card__badge:not(.Card__badge--bottom):not(.Card__badge--right) .Badge").first().text().trim() || null;
        const types = $el.find(".Card__badge--bottom .Badge").map((_, b) => $(b).text().trim()).get();
        const score_raw = $el.find(".Card__badge--right .Badge--warning").text().trim().replace(/[^\d.]/g, "");
        return {
          title: link.attr("title") || $el.find(".Card__caption small").text().trim() || null,
          url: this._toA(link.attr("href")),
          thumbnail: img,
          status: status || null,
          types: types,
          score: score_raw ? parseFloat(score_raw) : null
        };
      }).get();
      const breadcrumb = $(".Content__breadcrumb .Content__breadcrumb-item").map((_, el) => {
        const a = $(el).find("a");
        return a.length ? {
          label: a.text().trim(),
          url: this._toA(a.attr("href"))
        } : {
          label: $(el).text().trim(),
          url: null
        };
      }).get();
      return {
        status: true,
        result: {
          title: title,
          native_title: native_title,
          thumbnail: thumbnail,
          ...meta,
          date_published: date_published,
          date_modified: date_modified,
          synopsis: synopsis,
          episodes: episodes,
          related: related,
          breadcrumb: breadcrumb,
          sidebar: {
            ongoing: this._parseSidebarOngoing($),
            recent_movies: this._parseSidebarMovies($),
            seasons: this._parseSidebarSeasons($)
          }
        }
      };
    } catch (err) {
      console.error(`[detail] error: ${err.message}`);
      return {
        status: false,
        result: err.message
      };
    }
  }
  async download({
    url,
    ...rest
  } = {}) {
    try {
      console.log(`[download] url=${url}`);
      const target = this._toU(url);
      const $ = await this._get(target);
      const article = $("article.Content__tabs-content").first();
      const title = article.find(".Content__title").text().trim() || null;
      const uploader_span = article.find(".Content__tabs-content-title > span");
      const uploader = uploader_span.find('span[itemprop="name"]').text().trim() || null;
      const release_time = uploader_span.find("time").text().trim() || null;
      const date_published = $('meta[itemprop="datePublished"]').attr("content") || null;
      const date_modified = $('meta[itemprop="dateModified"]').attr("content") || null;
      const thumbnail = $('meta[itemprop="url"][content*="/images/episode/"]').attr("content") || article.find('.Content__image picture source[type="image/jpeg"]').attr("srcset") || article.find(".Content__image img").attr("src") || null;
      const note = article.find(".Content__description-caption > div strong.text-danger").text().trim() || null;
      const ep_title = article.find(".Content__description-title").text().trim() || null;
      const synopsis = article.find(".Content__description-caption-synopsis p").map((_, el) => $(el).text().trim()).get().join("\n") || null;
      const credits = {};
      article.find(".List .d-flex").each((_, el) => {
        const k = this._clean($(el).find(".text-right").text().trim());
        const v = $(el).find(".text-left b, .text-left").first().text().trim() || null;
        if (k) credits[k] = v;
      });
      const genres = article.find('.Content__description-caption a[href*="/genre/"]').map((_, a) => ({
        name: $(a).text().trim() || null,
        url: this._toA($(a).attr("href"))
      })).get();
      const season_a = article.find('.Content__description-caption a[href*="/season/"]').first();
      const season = season_a.length ? {
        name: season_a.text().trim() || null,
        url: this._toA(season_a.attr("href"))
      } : null;
      const links = [];
      let cur_fmt = null;
      $("#contentLink").children().each((_, node) => {
        const $n = $(node);
        if ($n.hasClass("Download__title")) {
          cur_fmt = $n.text().trim() || null;
        } else if ($n.hasClass("Download__container")) {
          $n.find(".Download__group").each((_, grp) => {
            const quality = $(grp).find(".Download__group-title").text().trim() || null;
            const hosts = $(grp).find(".Download__link span a").map((_, a) => {
              const host = $(a).find(".d-none.d-md-block").text().trim() || $(a).find(".d-block.d-md-none").text().trim() || $(a).text().trim() || null;
              return {
                host: host,
                url: $(a).attr("href") || null
              };
            }).get();
            if (hosts.length) links.push({
              format: cur_fmt,
              quality: quality,
              hosts: hosts
            });
          });
        }
      });
      for (const linkGroup of links) {
        for (const host of linkGroup.hosts) {
          if (host.url && host.url.includes("/download?id=")) {
            try {
              const finalUrl = await this._resolveSafelink(host.url);
              host.url = finalUrl;
            } catch (err) {
              console.warn(`[download] Gagal resolve ${host.url} setelah 3 percobaan: ${err.message}`);
            }
          }
        }
      }
      const episodes = $(".Content__table-body").map((_, el) => {
        const $el = $(el);
        const cols = $el.find("> div");
        const label_a = cols.eq(0).find("a").first();
        const title_a = cols.eq(1).find("a").first();
        const release = cols.eq(2).text().trim() || null;
        return {
          label: label_a.text().trim() || null,
          title: title_a.text().trim() || label_a.text().trim() || null,
          url: this._toA(label_a.attr("href")),
          release: release
        };
      }).get();
      const related = $(".Content__tabs-header span").filter((_, el) => $(el).text().trim() === "Anime Lainnya").closest(".Content__tabs").find(".Card--column").map((_, el) => {
        const $el = $(el);
        const link = $el.is("a") ? $el : $el.find("a").first();
        const img = $el.find('picture source[type="image/jpeg"]').attr("srcset") || $el.find("img").attr("src") || null;
        const status = $el.find(".Card__badge:not(.Card__badge--bottom):not(.Card__badge--right) .Badge").first().text().trim() || null;
        const types = $el.find(".Card__badge--bottom .Badge").map((_, b) => $(b).text().trim()).get();
        const score_raw = $el.find(".Card__badge--right .Badge--warning").text().trim().replace(/[^\d.]/g, "");
        return {
          title: link.attr("title") || $el.find(".Card__caption small").text().trim() || null,
          url: this._toA(link.attr("href")),
          thumbnail: img,
          status: status || null,
          types: types,
          score: score_raw ? parseFloat(score_raw) : null
        };
      }).get();
      const breadcrumb = $(".Content__breadcrumb .Content__breadcrumb-item").map((_, el) => {
        const a = $(el).find("a");
        return a.length ? {
          label: a.text().trim(),
          url: this._toA(a.attr("href"))
        } : {
          label: $(el).text().trim(),
          url: null
        };
      }).get();
      return {
        status: true,
        result: {
          title: title,
          ep_title: ep_title,
          thumbnail: thumbnail,
          uploader: uploader,
          release_time: release_time,
          date_published: date_published,
          date_modified: date_modified,
          note: note,
          synopsis: synopsis,
          credits: credits,
          genres: genres,
          season: season,
          links: links,
          episodes: episodes,
          related: related,
          breadcrumb: breadcrumb,
          sidebar: {
            ongoing: this._parseSidebarOngoing($),
            recent_movies: this._parseSidebarMovies($),
            seasons: this._parseSidebarSeasons($)
          }
        }
      };
    } catch (err) {
      console.error(`[download] error: ${err.message}`);
      return {
        status: false,
        result: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&page=1",
          search: "/?action=search&query=nano+machine",
          detail: "/?action=detail&url=nano-machine",
          download: "/?action=download&url=nano-machine-chapter-01"
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
  const options = {
    ...params
  };
  if (options.page) {
    options.page = parseInt(options.page, 10);
  }
  const api = new Doroni();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(options);
        break;
      case "search":
        if (!options.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=solo"
          });
        }
        response = await api.search(options);
        break;
      case "detail":
        if (!options.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(options);
        break;
      case "download":
        if (!options.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'."
          });
        }
        response = await api.download(options);
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
        error: "Tidak ada respons. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server scraper.",
      error: error.message || "Unknown Error"
    });
  }
}