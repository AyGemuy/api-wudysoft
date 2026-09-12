import axios from "axios";
import * as cheerio from "cheerio";
class An1Client {
  constructor() {
    this.baseUrl = "https://an1.to";
    this.modradarApi = "https://link.modradar.com";
    this.axiosInstance = axios.create();
  }
  _bHead(tUrl, cOpts = {}) {
    try {
      const isMod = tUrl.includes("modradar.com");
      const inHead = cOpts.headers || {};
      const cRef = inHead.referer || inHead.Referer;
      const bHead = {
        accept: isMod ? "*/*" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const clHead = {
        ...inHead
      };
      delete clHead.referer;
      delete clHead.Referer;
      if (isMod) {
        return {
          ...bHead,
          origin: this.baseUrl,
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          referer: cRef || `${this.baseUrl}/`,
          ...clHead
        };
      }
      return {
        ...bHead,
        priority: "u=0, i",
        "upgrade-insecure-requests": "1",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": cRef ? "same-origin" : "none",
        "sec-fetch-user": "?1",
        referer: cRef || undefined,
        ...clHead
      };
    } catch (err) {
      console.error("[_bHead] Error building headers:", err.message);
      return {
        ...cOpts.headers
      };
    }
  }
  _toSnake(str) {
    return (str || "").toLowerCase().replace(/[^a-z0-9\s-_]/g, "").trim().replace(/[\s-_]+/g, "_");
  }
  _getSlug(url) {
    try {
      if (!url) return "";
      const clUrl = url.replace(this.baseUrl, "").replace(/^\/+|\/+$/g, "");
      return clUrl ? `${clUrl}/` : "";
    } catch {
      return "";
    }
  }
  async _fHtml(url, opts = {}) {
    try {
      console.log(`[FETCH] ${url}`);
      const headers = this._bHead(url, opts);
      const res = await this.axiosInstance.get(url, {
        ...opts,
        headers: headers
      });
      return cheerio.load(res.data);
    } catch (err) {
      console.error(`[_fHtml] Error:`, err.message);
      return null;
    }
  }
  _pItems($, cSel = ".apk-grid .apk-item") {
    try {
      return $(cSel).map((i, el) => {
        const $el = $(el);
        const lnk = $el.find("h3 a").attr("href") || "";
        return {
          title: $el.find("h3 a").text().trim(),
          url: lnk,
          slug: this._getSlug(lnk),
          category: $el.find(".apk-category a").map((_, a) => $(a).text().trim()).get(),
          rating: parseFloat($el.find(".rating").data("stars")) || 0,
          thumb: $el.find(".apk-thumbnail img").attr("src") || $el.find(".apk-thumbnail img").attr("data-lazy-src") || ""
        };
      }).get();
    } catch (err) {
      console.error(`[_pItems] Error:`, err.message);
      return [];
    }
  }
  async home({
    ...rest
  } = {}) {
    try {
      console.log("[home] Fetching home page...");
      const $ = await this._fHtml(`${this.baseUrl}`, rest);
      if (!$) return {
        status: false,
        result: null,
        error: "Failed to load HTML"
      };
      const sItems = this._pItems($, ".apk-slider-column .apk-item");
      const gGrid = $(".apk-grid").eq(0);
      const aGrid = $(".apk-grid").eq(1);
      const lGames = this._pItems($, gGrid.find(".apk-item"));
      const lApps = this._pItems($, aGrid.find(".apk-item"));
      const cats = $(".term-list a").map((i, el) => {
        const lnk = $(el).attr("href") || "";
        return {
          name: $(el).text().trim(),
          url: lnk,
          slug: this._getSlug(lnk)
        };
      }).get();
      const news = $(".blog-grid-home .blog-item").map((i, el) => {
        const lnk = $(el).find("h3 a").attr("href") || "";
        return {
          title: $(el).find("h3 a").text().trim(),
          url: lnk,
          slug: this._getSlug(lnk),
          date: $(el).find(".post-date").text().trim()
        };
      }).get();
      console.log("[home] Success");
      return {
        status: true,
        result: {
          slider_items: sItems,
          latest_games: lGames,
          latest_apps: lApps,
          categories: cats,
          news: news,
          ...rest
        }
      };
    } catch (err) {
      console.error("[home] Error:", err.message);
      return {
        status: false,
        result: null,
        error: err.message
      };
    }
  }
  async tags({
    type,
    tag = "",
    page = null,
    ...rest
  } = {}) {
    try {
      if (!type) {
        return {
          status: false,
          result: null,
          error: "Type is required (game, aplikasi, berita)"
        };
      }
      let segs = [this.baseUrl, type];
      if (tag) segs.push(tag);
      if (page) segs.push("page", page);
      const url = segs.join("/") + "/";
      console.log(`[tags] Fetching URL: ${url}`);
      const $ = await this._fHtml(url, rest);
      if (!$) return {
        status: false,
        result: null,
        error: "Failed to load HTML"
      };
      const items = this._pItems($, ".panel.active .apk-grid .apk-item");
      const pagen = {
        current: $(".page-numbers.current").text().trim() || String(page || 1),
        next: $(".next.page-numbers").attr("href") || null,
        prev: $(".prev.page-numbers").attr("href") || null
      };
      console.log("[tags] Success");
      return {
        status: true,
        result: {
          items: items,
          pagination: pagen,
          type: type,
          tag: tag,
          page: page,
          ...rest
        }
      };
    } catch (err) {
      console.error("[tags] Error:", err.message);
      return {
        status: false,
        result: null,
        error: err.message
      };
    }
  }
  async search({
    query,
    page = null,
    ...rest
  } = {}) {
    try {
      if (!query) {
        return {
          status: false,
          result: null,
          error: "Query is required"
        };
      }
      let url = this.baseUrl;
      if (page) url += `/page/${page}`;
      url += `/?s=${encodeURIComponent(query)}`;
      console.log(`[search] Searching with URL: ${url}`);
      const $ = await this._fHtml(url, rest);
      if (!$) return {
        status: false,
        result: null,
        error: "Failed to load HTML"
      };
      const items = this._pItems($, ".apk-section .apk-grid .apk-item");
      const pagen = {
        current: $(".page-numbers.current").text().trim() || String(page || 1),
        next: $(".next.page-numbers").attr("href") || null,
        prev: $(".prev.page-numbers").attr("href") || null
      };
      console.log("[search] Success");
      return {
        status: true,
        result: {
          query: query,
          page: page,
          items: items,
          pagination: pagen,
          ...rest
        }
      };
    } catch (err) {
      console.error("[search] Error:", err.message);
      return {
        status: false,
        result: null,
        error: err.message
      };
    }
  }
  async detail({
    url,
    ...rest
  } = {}) {
    try {
      if (!url) {
        return {
          status: false,
          result: null,
          error: "URL or slug is required"
        };
      }
      const fUrl = url.startsWith("http") ? url : `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
      console.log(`[detail] Fetching ${fUrl}...`);
      const opts = {
        ...rest,
        headers: {
          referer: `${this.baseUrl}/?s=To`,
          ...rest.headers || {}
        }
      };
      const $ = await this._fHtml(fUrl, opts);
      if (!$) return {
        status: false,
        result: null,
        error: "Failed to load HTML"
      };
      const title = $("h1.post-title").text().trim() || $(".post-title a").text().trim();
      const thumb = $(".post-thumbnail img").attr("src") || $(".post-thumbnail img").attr("data-lazy-src") || "";
      const desc = $(".post-content p").first().text().trim() || "";
      const info = Object.fromEntries($(".post-info-table tbody tr").map((i, tr) => {
        const rLab = $(tr).find("td.label").text().trim();
        if (!rLab) return null;
        const key = this._toSnake(rLab);
        const cLnk = $(tr).find("td:last-child .apk-cat a");
        const val = cLnk.length > 0 ? cLnk.map((_, a) => $(a).text().trim()).get() : $(tr).find("td:last-child").text().trim();
        return [
          [key, val]
        ];
      }).get().filter(Boolean));
      const pName = info.nama_paket || info.package_name || info.package || $(".modradar-download-container").data("sv") || null;
      let dload = null;
      if (pName) {
        console.log(`[detail] Fetching modradar data for package: ${pName}`);
        dload = await this._gModData(pName, fUrl, rest.headers);
      }
      console.log("[detail] Success");
      return {
        status: true,
        result: {
          title: title,
          thumbnail: thumb,
          description: desc,
          info: info,
          package_name: pName,
          download: dload,
          url: fUrl,
          slug: this._getSlug(fUrl),
          ...rest
        }
      };
    } catch (err) {
      console.error("[detail] Error:", err.message);
      return {
        status: false,
        result: null,
        error: err.message
      };
    }
  }
  async _gModData(pName, refUrl, cHead = {}) {
    try {
      const aUrl = `${this.modradarApi}/download/${pName}`;
      console.log(`[modradar] GET ${aUrl}`);
      const opts = {
        headers: {
          ...cHead,
          referer: refUrl
        }
      };
      const headers = this._bHead(aUrl, opts);
      const res = await axios.get(aUrl, {
        headers: headers
      });
      const data = res.data;
      if (!data?.success) return null;
      const files = data.data || [];
      const fList = [];
      for (const [idx, file] of files.entries()) {
        try {
          const fApiUrl = `${aUrl}/${idx}`;
          const fHeaders = this._bHead(fApiUrl, opts);
          const uRes = await axios.get(fApiUrl, {
            headers: fHeaders
          });
          fList.push({
            ...file,
            url: uRes.data?.data?.url || null
          });
        } catch (fErr) {
          console.error(`[modradar] Error fetching file index ${idx}:`, fErr.message);
          fList.push({
            ...file,
            url: null
          });
        }
      }
      return {
        package: {
          ...data.package
        },
        files: fList,
        total_size: data.package?.count_size || null,
        updated: data.package?.time_updated || null
      };
    } catch (err) {
      console.error("[modradar] Error:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "tags", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          tags: "/?action=tags&type=game&tag=action&page=1",
          search: "/?action=search&query=whatsapp",
          detail: "/?action=detail&url=whatsapp-messenger.html"
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
  const api = new An1Client();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "tags":
        if (!params.type) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'type' wajib diisi untuk action 'tags' (contoh: game, aplikasi, berita)."
          });
        }
        response = await api.tags(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=whatsapp"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' (atau slug url detail) wajib diisi untuk action 'detail'."
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
        error: "Tidak ada respons dari server AN1. Coba lagi nanti."
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