import axios from "axios";
import * as cheerio from "cheerio";
class Perpus {
  constructor() {
    this.baseURL = "https://www.perpus.org";
    this.cookie = "";
    this.client = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="127", "Google Chrome";v="127"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    });
    this.client.interceptors.request.use(config => {
      if (this.cookie) config.headers["Cookie"] = this.cookie;
      return config;
    });
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        const newCookies = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
        this.cookie = this.cookie ? `${this.cookie}; ${newCookies}` : newCookies;
      }
      return response;
    });
  }
  async _req(method, path, data = null, extra = {}) {
    const url = path.startsWith("http") ? path : `${this.baseURL}${path}`;
    const cfg = {
      method: method,
      url: url,
      ...extra
    };
    if (data) cfg[method === "GET" ? "params" : "data"] = data;
    console.log(`[PERPUS] ${method} ${url}`, data || "");
    try {
      const resp = await this.client.request(cfg);
      console.log(`[PERPUS] status ${resp.status}`);
      return resp;
    } catch (err) {
      console.error(`[PERPUS] error: ${err.message}`);
      throw err;
    }
  }
  _parse($) {
    const books = $(".ebook-product-wrap, .ebook-mobile, .ebook-product").map((i, el) => {
      const link = $(el).find("a[href]").first();
      const img = $(el).find("img");
      const viewsText = $(el).find(".text-grey.small").text().trim();
      return {
        title: link.text().trim() || img.attr("alt") || "",
        href: link.attr("href") || "",
        src: img.attr("data-src") || img.attr("src") || "",
        views: parseInt(viewsText.replace(/\D/g, ""), 10) || 0,
        category: $(el).find("a[href]").last().text().trim() || ""
      };
    }).get();
    return books.filter((v, i, a) => a.findIndex(t => t.href === v.href) === i);
  }
  _snake(obj) {
    if (Array.isArray(obj)) return obj.map(v => this._snake(v));
    if (obj !== null && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        result[snakeKey] = this._snake(obj[key]);
        return result;
      }, {});
    }
    return obj;
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log("[PERPUS] Menjalankan home...");
      const homeResp = await this._req("GET", "/", null, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none"
        }
      });
      const $ = cheerio.load(homeResp.data);
      const menu = $("ul.mobile-quick-menu li").map((i, el) => {
        const a = $(el).find("a");
        return {
          href: a.attr("href") || "",
          label: a.clone().children().remove().end().text().trim() || a.text().trim() || "",
          badge: a.find("span.menu-badge-new").text().trim() || ""
        };
      }).get();
      const topResp = await this.top_read();
      const topRead = (topResp.status === "success" ? topResp.result : []).slice(0, 5);
      const pageResp = await this.page({
        attempt: page,
        ...rest
      });
      const pageData = pageResp.status === "success" ? pageResp.result : {};
      const popResp = await this.popular();
      const popular = popResp.status === "success" ? popResp.result : [];
      return {
        status: "success",
        result: this._snake({
          menu: menu,
          top_read: topRead,
          books: pageData.books || [],
          popular: popular,
          attempt: pageData.attempt ?? page,
          cached: pageData.cached ?? false
        })
      };
    } catch (err) {
      console.error("[PERPUS] home error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async search({
    query,
    page = 1,
    ...rest
  } = {}) {
    try {
      if (!query) throw new Error('Parameter "query" wajib diisi');
      console.log(`[PERPUS] Menjalankan search: ${query}...`);
      const searchResp = await this._req("GET", "/search", {
        q: query,
        page: page,
        ...rest
      }, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate"
        }
      });
      const results = this._parse(cheerio.load(searchResp.data));
      let autocomplete = [];
      try {
        const autoResp = await this._req("GET", "/api/search/autocomplete", {
          q: query
        }, {
          headers: {
            Accept: "application/json, text/plain, */*"
          }
        });
        autocomplete = autoResp.data || [];
      } catch (e) {
        console.warn("[PERPUS] autocomplete failed:", e.message);
      }
      return {
        status: "success",
        result: this._snake({
          query: query,
          page: page,
          results: results,
          autocomplete: autocomplete,
          total: results.length
        })
      };
    } catch (err) {
      console.error("[PERPUS] search error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async detail({
    url,
    page = 1,
    token = null,
    total = null,
    ...rest
  } = {}) {
    try {
      if (!url) throw new Error('Parameter "url" wajib diisi');
      console.log(`[PERPUS] Menjalankan detail: ${url} (Page: ${page})...`);
      let slug = url.startsWith("http") ? new URL(url).pathname.replace(/^\/|\/$/g, "") : url;
      if (slug.includes("/")) slug = slug.split("/").pop();
      if (!slug) throw new Error("Invalid url atau slug string");
      const fullUrl = url.startsWith("http") ? url : `${this.baseURL}/${slug}`;
      const resp = await this._req("GET", `/api/ebook/${slug}`, {
        page: page,
        token: token,
        url: fullUrl,
        ...total && {
          total: total
        },
        ...rest
      }, {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Referer: fullUrl
        }
      });
      const data = resp.data || {};
      const $ = cheerio.load(data.html || "");
      const images = $(".images-carousel img").map((i, el) => ({
        src: $(el).attr("src") || "",
        alt: $(el).attr("alt") || "",
        index: i
      })).get();
      let comments = [];
      const commentPanel = $('div[id^="comment-panel-"], .perpus-comment-panel');
      let postId = commentPanel.attr("id")?.replace(/\D/g, "") || data.postId || data.id;
      if (!postId) {
        const firstImgSrc = images[0]?.src || "";
        const match = firstImgSrc.match(/\/sketch\/([^/]+)/);
        if (match) postId = match[1];
      }
      if (postId) {
        try {
          const commResp = await this._req("GET", `/api/comment/${postId}`, null, {
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              "X-Requested-With": "XMLHttpRequest",
              Referer: fullUrl
            }
          });
          comments = commResp.data?.comment?.data || commResp.data?.comments || [];
        } catch (e) {
          console.warn(`[PERPUS] Gagal memuat komentar untuk postId ${postId}:`, e.message);
        }
      }
      return {
        status: "success",
        result: this._snake({
          title: $(".images-carousel img").first().attr("alt")?.replace(/\.jpg.*$/i, "") || slug,
          slug: slug,
          images: images,
          beginPage: data.beginPage ?? null,
          lastPage: parseInt(data.lastPage, 10) || null,
          totalPages: images.length,
          comments: comments,
          msg: data.msg || ""
        })
      };
    } catch (err) {
      console.error("[PERPUS] detail error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async top_read() {
    try {
      console.log("[PERPUS] Menjalankan top_read...");
      const resp = await this._req("GET", "/api/page/perpus/top-read-yesterday", null, {
        headers: {
          Accept: "application/json, text/plain, */*"
        }
      });
      return {
        status: "success",
        result: this._snake(resp.data?.items || [])
      };
    } catch (err) {
      console.error("[PERPUS] top_read error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async page({
    attempt = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[PERPUS] Menjalankan page attempt: ${attempt}...`);
      const resp = await this._req("GET", "/api/page/perpus", {
        attempt: attempt,
        ...rest
      }, {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      return {
        status: "success",
        result: this._snake({
          attempt: attempt,
          books: this._parse(cheerio.load(resp.data?.html || "")),
          cached: resp.data?.cached ?? false
        })
      };
    } catch (err) {
      console.error("[PERPUS] page error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async list({
    category = "",
    keyword = "",
    ...rest
  } = {}) {
    try {
      console.log(`[PERPUS] Menjalankan list (Cat: ${category}, Key: ${keyword})...`);
      const resp = await this._req("GET", "/api/get/ebook/list", {
        category: category,
        keyword: keyword,
        _: Date.now(),
        ...rest
      }, {
        headers: {
          Accept: "application/json, text/javascript, */*",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const items = (resp.data?.data || resp.data?.items || []).map(item => {
        if (!item.title) return item;
        const $ = cheerio.load(item.title);
        $(".title-cell").find("a").remove();
        const titleText = $(".title-cell").text().split("(")[0].trim();
        const readHref = $("a.btn-info").attr("href") || "";
        const $cat = cheerio.load(item.title);
        const catLink = $cat(".title-cell a");
        return {
          id: item.id || "",
          title: titleText || item.title,
          url: readHref,
          slug: item.slug || readHref.split("/").filter(Boolean).pop() || "",
          category: {
            name: catLink.text().trim(),
            slug: (catLink.attr("href") || "").split("/").filter(Boolean).pop() || "",
            url: catLink.attr("href") || ""
          },
          sc_name: item.sc_name || ""
        };
      });
      return {
        status: "success",
        result: this._snake(items)
      };
    } catch (err) {
      console.error("[PERPUS] list error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async popular() {
    try {
      console.log("[PERPUS] Menjalankan popular...");
      const resp = await this._req("GET", "/api/search/popular", null, {
        headers: {
          Accept: "application/json, text/plain, */*"
        }
      });
      return {
        status: "success",
        result: this._snake(resp.data?.popular || resp.data || [])
      };
    } catch (err) {
      console.error("[PERPUS] popular error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
  async autocomplete({
    query,
    ...rest
  } = {}) {
    try {
      if (!query) throw new Error('Parameter "query" wajib diisi');
      console.log(`[PERPUS] Menjalankan autocomplete: ${query}...`);
      const resp = await this._req("GET", "/api/search/autocomplete", {
        q: query,
        ...rest
      }, {
        headers: {
          Accept: "application/json, text/plain, */*"
        }
      });
      return {
        status: "success",
        result: this._snake(resp.data || [])
      };
    } catch (err) {
      console.error("[PERPUS] autocomplete error:", err.message);
      return {
        status: "error",
        result: {
          message: err.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const rawParams = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...params
  } = rawParams;
  const validActions = ["home", "search", "detail", "top_read", "page", "list", "popular", "autocomplete"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&page=1",
          search: "/?action=search&query=sejarah",
          detail: "/?action=detail&url=https://www.perpus.org/pengembangan-diri/buku-bagus",
          list: "/?action=list&category=pengembangan-diri"
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
  if (options.page) options.page = parseInt(options.page, 10);
  if (options.attempt) options.attempt = parseInt(options.attempt, 10);
  const api = new Perpus();
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
            error: "Parameter 'query' wajib diisi untuk action 'search'."
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
      case "top_read":
        response = await api.top_read();
        break;
      case "page":
        response = await api.page(options);
        break;
      case "list":
        response = await api.list(options);
        break;
      case "popular":
        response = await api.popular();
        break;
      case "autocomplete":
        if (!options.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'autocomplete'."
          });
        }
        response = await api.autocomplete(options);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server internal Perpus. Coba lagi nanti."
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