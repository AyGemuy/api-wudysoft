import axios from "axios";
import * as cheerio from "cheerio";
import {
  URL
} from "url";
const DEFAULT_ORIGIN = "https://hdqwalls.com";
const IMG_ORIGIN = "https://images.hdqwalls.com";
const PATH = {
  home: "/",
  latest: "/latest-wallpapers",
  upcoming: "/upcoming-wallpapers",
  random: "/random-wallpapers",
  popular: "/popular-wallpapers",
  search: "/search"
};
class HdqwallsScraper {
  constructor(options = {}) {
    try {
      const opts = options || {};
      this.origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/+$/, "");
      this.imgOrigin = String(opts.imgOrigin || IMG_ORIGIN).replace(/\/+$/, "");
      this.timeout = Number(opts.timeout ?? 12e4);
      this.retries = Math.max(0, Number(opts.retries ?? 2));
      this.retryDelay = Math.max(0, Number(opts.retryDelay ?? 800));
      this.headers = Object.assign({}, {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }, opts.headers || {});
      this.http = axios.create({
        baseURL: this.origin,
        timeout: this.timeout,
        headers: this.headers,
        maxRedirects: 5
      });
    } catch (e) {
      try {
        console.error("[hdq] constructor.error", e?.message || e);
      } catch {}
      throw e;
    }
  }
  log(...a) {
    try {
      console.log("[hdq]", ...a);
    } catch {}
  }
  _sleep(ms) {
    try {
      return new Promise(r => setTimeout(r, ms));
    } catch {
      return Promise.resolve();
    }
  }
  _abs(u) {
    try {
      if (!u) return "";
      const s = String(u).trim();
      if (!s) return "";
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith("//")) return "https:" + s;
      return this.origin + (s.startsWith("/") ? s : "/" + s);
    } catch (e) {
      this.log("_abs.error", e?.message || e);
      return "";
    }
  }
  _img(u) {
    try {
      if (!u) return "";
      const s = String(u).trim();
      if (!s) return "";
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith("//")) return "https:" + s;
      return this.imgOrigin + (s.startsWith("/") ? s : "/" + s);
    } catch (e) {
      this.log("_img.error", e?.message || e);
      return "";
    }
  }
  _slug(u) {
    try {
      const abs = this._abs(u);
      if (!abs) return "";
      const parts = new URL(abs).pathname.split("/").filter(Boolean);
      return parts.at(-1) || "";
    } catch (e) {
      this.log("_slug.error", e?.message || e);
      return "";
    }
  }
  _slugBase(u) {
    try {
      const s = this._slug(u);
      return s.replace(/-wallpaper$/i, "");
    } catch {
      return "";
    }
  }
  _imgKey(u) {
    try {
      const s = this._img(u);
      if (!s) return "";
      const file = new URL(s).pathname.split("/").pop() || "";
      return file.replace(/\.(jpe?g|png|webp)$/i, "").replace(/-\d+x\d+$/, "");
    } catch {
      return "";
    }
  }
  _num(v) {
    try {
      if (v === undefined || v === null) return null;
      const s = String(v).replace(/[^\d.-]/g, "").trim();
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }
  _dom(html) {
    try {
      return cheerio.load(html || "");
    } catch (e) {
      this.log("_dom.error", e?.message || e);
      return cheerio.load("");
    }
  }
  _txt(_, sel, def = "") {
    try {
      const t = _(sel).first().text().replace(/\s+/g, " ").trim();
      return t || def;
    } catch {
      return def;
    }
  }
  _attr(_, sel, attr, def = "") {
    try {
      return _(sel).first().attr(attr) || def;
    } catch {
      return def;
    }
  }
  _meta(_, sel, def = "") {
    try {
      return _(sel).first().attr("content")?.trim() || def;
    } catch {
      return def;
    }
  }
  _jsConst(html, name) {
    try {
      const re = new RegExp(`const\\s+${name}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`, "i");
      const m = String(html || "").match(re);
      if (!m) return null;
      return m[2];
    } catch {
      return null;
    }
  }
  _json(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  async _fetch(pathOrUrl, params) {
    try {
      const url = this._abs(pathOrUrl || "/");
      if (!url) throw new Error("invalid path/url");
      const maxAttempt = Math.max(1, this.retries + 1);
      let lastErr = null;
      for (let attempt = 1; attempt <= maxAttempt; attempt++) {
        try {
          this.log("fetch →", url, `(attempt ${attempt}/${maxAttempt})`, params ? JSON.stringify(params) : "");
          const rel = url.startsWith(this.origin) ? url.slice(this.origin.length) || "/" : url;
          const res = await this.http.get(rel, {
            params: params || undefined
          });
          return res?.data ?? "";
        } catch (err) {
          lastErr = err;
          this.log("fetch.attempt.error", attempt, err?.message || err);
          if (attempt < maxAttempt) await this._sleep(this.retryDelay * attempt);
        }
      }
      throw new Error(`fetch failed after ${maxAttempt} attempt(s): ${lastErr?.message || lastErr}`);
    } catch (e) {
      this.log("_fetch.error", e?.message || e);
      throw e;
    }
  }
  _parseItem(_el, _) {
    try {
      const a1 = _el.find('a[href*="-wallpaper"]').first();
      const a2 = _el.find("a.caption").first();
      const img = _el.find("img.thumbnail, img.custom_width, img").first();
      const href = a1.attr("href") || a2.attr("href") || "";
      if (!href) return null;
      const thumb = img.attr("src") || img.attr("data-src") || "";
      const title = a2.text().trim() || (img.attr("title") || "").replace(/\s*Wallpaper\s*$/i, "").trim() || (img.attr("alt") || "").replace(/\s*Wallpaper\s*$/i, "").trim() || "untitled";
      return {
        slug: this._slugBase(href),
        slug_full: this._slug(href),
        title: title,
        url: this._abs(href),
        thumbnail: this._img(thumb)
      };
    } catch (e) {
      this.log("_parseItem.error", e?.message || e);
      return null;
    }
  }
  _items(_, scope) {
    try {
      const $scope = scope && typeof scope.find === "function" ? scope : _.root();
      const nodes = $scope.find("div.wall-resp, div.wall-resp.column_padding").get().filter(el => {
        const _el = _(el);
        return _el.closest("div.related_main_container").length === 0;
      });
      const out = [];
      for (const el of nodes) {
        const item = this._parseItem(_(el), _);
        if (item) out.push(item);
      }
      return out;
    } catch (e) {
      this.log("_items.error", e?.message || e);
      return [];
    }
  }
  _pager(_, basePath = "/") {
    const empty = {
      current_page: 1,
      total_pages: 1,
      next_page: null,
      prev_page: null,
      last_page: null,
      pages: []
    };
    try {
      const wrap = _("ul.pagination, p.pages").first();
      if (!wrap.length) return empty;
      const pages = [];
      let current_page = 1;
      let next_page = null;
      let prev_page = null;
      let last_page = null;
      wrap.find("a[href]").each((i, el) => {
        try {
          const _a = _(el);
          const t = _a.text().trim();
          const href = _a.attr("href");
          if (!href) return;
          const abs = this._abs(href);
          const m = href.match(/\/page\/(\d+)\/?/i) || href.match(/[?&]page=(\d+)/i);
          const pageNum = m ? parseInt(m[1], 10) : null;
          if (/^next/i.test(t) || _a.hasClass("ctrl-right")) {
            next_page = abs;
          } else if (/^prev/i.test(t) || _a.hasClass("ctrl-left")) {
            prev_page = abs;
          } else if (/^last/i.test(t)) {
            last_page = abs;
          } else if (/^\d+$/.test(t)) {
            const p = parseInt(t, 10);
            pages.push({
              page: p,
              url: abs
            });
            if (_a.parent().hasClass("active")) current_page = p;
          } else if (pageNum) {
            pages.push({
              page: pageNum,
              url: abs
            });
          }
        } catch (err) {
          this.log("_pager.a.error", err?.message || err);
        }
      });
      wrap.find("strong[data-page]").each((i, el) => {
        try {
          const _s = _(el);
          const p = parseInt(_s.attr("data-page"), 10);
          if (!Number.isFinite(p)) return;
          const label = _s.text().trim();
          if (/^\d+$/.test(label)) {
            pages.push({
              page: p,
              url: this._abs(`${basePath}${basePath.includes("?") ? "&" : "?"}page=${p}`)
            });
            if (_s.hasClass("active")) current_page = p;
          } else if (/^next/i.test(label) || _s.hasClass("ctrl-right")) {
            next_page = this._abs(`${basePath}${basePath.includes("?") ? "&" : "?"}page=${current_page + 1}`);
          }
        } catch (err) {
          this.log("_pager.strong.error", err?.message || err);
        }
      });
      if (current_page === 1) {
        const active = wrap.find("strong.active, li.active a").first();
        const p = parseInt(active.attr("data-page") || active.text(), 10);
        if (Number.isFinite(p)) current_page = p;
      }
      const total_pages = pages.length ? Math.max(...pages.map(p => p.page)) : current_page;
      return {
        current_page: current_page,
        total_pages: total_pages,
        next_page: next_page,
        prev_page: prev_page,
        last_page: last_page,
        pages: pages
      };
    } catch (e) {
      this.log("_pager.error", e?.message || e);
      return empty;
    }
  }
  _sidebar(_, html) {
    const empty = {
      categories: [],
      resolutions: []
    };
    try {
      const catsRaw = this._jsConst(html, "categoriesData");
      let categories = [];
      if (catsRaw) {
        const parsed = this._json(catsRaw);
        if (Array.isArray(parsed)) {
          categories = parsed.map(c => ({
            name: c?.cat || "",
            slug: c?.url || "",
            url: this._abs(`/category/${c?.url}-wallpapers`),
            count: this._num(c?.count)
          })).filter(c => c.slug);
        }
      }
      if (!categories.length) {
        _("div.cat-sidebar-panel a.list-group-item.cat_list").each((i, el) => {
          try {
            const _a = _(el);
            const href = _a.attr("href") || "";
            const name = _a.text().replace(/^\s*\d+\s*/, "").trim();
            const count = this._num(_a.find("span.badge").text());
            const m = href.match(/\/category\/([^/]+)-wallpapers/);
            categories.push({
              name: name,
              slug: m ? m[1] : "",
              url: this._abs(href),
              count: count
            });
          } catch (err) {
            this.log("_sidebar.cat.error", err?.message || err);
          }
        });
      }
      const resRaw = this._jsConst(html, "resolutionsData");
      let resolutions = [];
      if (resRaw) {
        const parsed = this._json(resRaw);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          resolutions = parsed.map(r => {
            const res = r?.resolution || "";
            if (!res || seen.has(res)) return null;
            seen.add(res);
            return {
              resolution: res,
              width: this._num(r?.width),
              height: this._num(r?.height),
              group: r?.category || "",
              url: this._abs(`/${res}-resolution-wallpapers`)
            };
          }).filter(Boolean);
        }
      }
      if (!resolutions.length) {
        let currentGroup = "";
        _("div.res-sidebar-panel .res-grid-wrap").children().each((i, el) => {
          try {
            const _el = _(el);
            if (_el.hasClass("res-group-label")) {
              currentGroup = _el.text().trim();
              return;
            }
            if (_el.hasClass("res-grid")) {
              _el.find("a.res-pill").each((j, a) => {
                const _a = _(a);
                const res = _a.text().trim();
                const m = res.match(/^(\d+)\s*x\s*(\d+)$/i);
                resolutions.push({
                  resolution: res,
                  width: m ? parseInt(m[1], 10) : null,
                  height: m ? parseInt(m[2], 10) : null,
                  group: currentGroup,
                  url: this._abs(_a.attr("href") || "")
                });
              });
            }
          } catch (err) {
            this.log("_sidebar.res.error", err?.message || err);
          }
        });
      }
      return {
        categories: categories,
        resolutions: resolutions
      };
    } catch (e) {
      this.log("_sidebar.error", e?.message || e);
      return empty;
    }
  }
  async _list({
    path,
    basePath,
    params,
    page,
    source,
    includeSidebar
  }) {
    try {
      const p = Number(page) > 0 ? Number(page) : 1;
      let finalPath = path;
      if (p > 1) {
        const clean = path.replace(/\/+$/, "");
        finalPath = `${clean}/page/${p}`;
      }
      const allParams = Object.assign({}, params || {});
      const html = await this._fetch(finalPath, allParams);
      const _ = this._dom(html);
      const items = this._items(_, _.root());
      const pager = this._pager(_, basePath || path);
      const title = _("h1").first().text().replace(/\s+/g, " ").trim() || _("title").first().text().trim() || "";
      const result = {
        source: source,
        page: p,
        title: title,
        total_items: items.length,
        items: items,
        pagination: pager
      };
      if (includeSidebar) {
        const sb = this._sidebar(_, html);
        result.categories = sb.categories;
        result.resolutions = sb.resolutions;
      }
      return result;
    } catch (e) {
      this.log("_list.error", e?.message || e);
      throw e;
    }
  }
  async home({
    page,
    ...rest
  } = {}) {
    try {
      this.log("home.start", {
        page: page
      });
      const r = await this._list({
        path: PATH.latest,
        basePath: PATH.latest,
        page: page ?? rest?.page ?? 1,
        source: "home",
        includeSidebar: true
      });
      this.log("home.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("home.error", e?.message || e);
      return this._emptyListResult("home", page, e);
    }
  }
  async latest({
    page,
    ...rest
  } = {}) {
    try {
      this.log("latest.start", {
        page: page
      });
      const r = await this._list({
        path: PATH.latest,
        basePath: PATH.latest,
        page: page ?? rest?.page ?? 1,
        source: "latest",
        includeSidebar: false
      });
      this.log("latest.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("latest.error", e?.message || e);
      return this._emptyListResult("latest", page, e);
    }
  }
  async upcoming({
    page,
    ...rest
  } = {}) {
    try {
      this.log("upcoming.start", {
        page: page
      });
      const r = await this._list({
        path: PATH.upcoming,
        basePath: PATH.upcoming,
        page: page ?? rest?.page ?? 1,
        source: "upcoming",
        includeSidebar: false
      });
      this.log("upcoming.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("upcoming.error", e?.message || e);
      return this._emptyListResult("upcoming", page, e);
    }
  }
  async random({
    page,
    ...rest
  } = {}) {
    try {
      this.log("random.start", {
        page: page
      });
      const r = await this._list({
        path: PATH.random,
        basePath: PATH.random,
        page: page ?? rest?.page ?? 1,
        source: "random",
        includeSidebar: false
      });
      this.log("random.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("random.error", e?.message || e);
      return this._emptyListResult("random", page, e);
    }
  }
  async popular({
    page,
    ...rest
  } = {}) {
    try {
      this.log("popular.start", {
        page: page
      });
      const r = await this._list({
        path: PATH.popular,
        basePath: PATH.popular,
        page: page ?? rest?.page ?? 1,
        source: "popular",
        includeSidebar: false
      });
      this.log("popular.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("popular.error", e?.message || e);
      return this._emptyListResult("popular", page, e);
    }
  }
  async category({
    slug,
    category,
    page,
    ...rest
  } = {}) {
    try {
      const raw = slug || category || "";
      if (!raw) throw new Error("slug/category is required");
      const clean = String(raw).replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "").replace(/^category\//i, "").replace(/-wallpapers$/i, "");
      const path = `/category/${clean}-wallpapers`;
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("category.start", {
        slug: clean,
        page: p
      });
      const r = await this._list({
        path: path,
        basePath: path,
        page: p,
        source: "category",
        includeSidebar: false
      });
      r.slug = clean;
      this.log("category.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("category.error", e?.message || e);
      return this._emptyListResult("category", page, e, {
        slug: slug || category || ""
      });
    }
  }
  async tag({
    slug,
    tag,
    page,
    ...rest
  } = {}) {
    try {
      const raw = slug || tag || "";
      if (!raw) throw new Error("slug/tag is required");
      const clean = String(raw).replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "").replace(/^category\//i, "").replace(/-wallpapers$/i, "");
      const path = `/${clean}-wallpapers`;
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("tag.start", {
        slug: clean,
        page: p
      });
      const r = await this._list({
        path: path,
        basePath: path,
        page: p,
        source: "tag",
        includeSidebar: false
      });
      r.slug = clean;
      this.log("tag.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("tag.error", e?.message || e);
      return this._emptyListResult("tag", page, e, {
        slug: slug || tag || ""
      });
    }
  }
  async resolution({
    res,
    resolution,
    page,
    ...rest
  } = {}) {
    try {
      const raw = res || resolution || "";
      if (!raw) throw new Error("res/resolution is required");
      const clean = String(raw).replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "").replace(/-resolution-wallpapers$/i, "").replace(/-wallpapers$/i, "").replace(/^resolution\//i, "");
      const path = `/${clean}-resolution-wallpapers`;
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("resolution.start", {
        resolution: clean,
        page: p
      });
      const r = await this._list({
        path: path,
        basePath: path,
        page: p,
        source: "resolution",
        includeSidebar: false
      });
      r.resolution = clean;
      this.log("resolution.done", r.items.length, "items");
      return {
        status: true,
        result: r
      };
    } catch (e) {
      this.log("resolution.error", e?.message || e);
      return this._emptyListResult("resolution", page, e, {
        resolution: res || resolution || ""
      });
    }
  }
  async search({
    query,
    page,
    sort,
    ...rest
  } = {}) {
    try {
      const q = String(query || "").trim();
      if (!q) throw new Error("query is required");
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("search.start", {
        query: q,
        page: p,
        sort: sort
      });
      const params = {
        q: q
      };
      if (sort) params.sort = sort;
      if (p > 1) params.page = p;
      const html = await this._fetch(PATH.search, params);
      const _ = this._dom(html);
      const items = this._items(_, _.root());
      const pager = this._pager(_, `${PATH.search}?q=${encodeURIComponent(q)}`);
      const title = _("h1").first().text().replace(/\s+/g, " ").trim() || _("ol#breadcrumb_search h1").first().text().trim() || `Search: ${q}`;
      const totalFoundEl = _("ol#breadcrumb_search h1 b").first().text();
      const total_found = this._num(totalFoundEl);
      this.log("search.done", items.length, "items");
      return {
        status: true,
        result: {
          source: "search",
          query: q,
          sort: sort || "date",
          page: p,
          title: title,
          total_found: total_found,
          total_items: items.length,
          items: items,
          pagination: pager
        }
      };
    } catch (e) {
      this.log("search.error", e?.message || e);
      return this._emptyListResult("search", page, e, {
        query: query || "",
        total_found: 0
      });
    }
  }
  async detail({
    url,
    link,
    slug,
    ...rest
  } = {}) {
    try {
      let target = url || link || slug || rest?.path || "";
      if (!target) throw new Error("url / slug is required");
      if (!/^https?:\/\//i.test(target) && !target.startsWith("/")) {
        target = `/${target.replace(/-wallpaper$/i, "")}-wallpaper`;
      }
      if (!/-wallpaper\/?$/i.test(target) && !/^https?:\/\//i.test(target)) {
        target = target.replace(/\/+$/, "") + "-wallpaper";
      }
      const full = this._abs(target);
      if (!full) throw new Error("failed to build absolute url");
      this.log("detail.start", full);
      const html = await this._fetch(full);
      const _ = this._dom(html);
      const title = _("h1").first().text().replace(/\s+/g, " ").trim() || this._meta(_, 'meta[property="og:title"]') || "untitled";
      const breadcrumbs = _("ol.breadcrumb li").get().map(el => {
        const _li = _(el);
        const a = _li.find("a").first();
        return {
          name: _li.text().replace(/\s+/g, " ").trim(),
          url: this._abs(a.attr("href") || "")
        };
      }).filter(b => b.name);
      const mainImg = _("img.d_img_holder, img.m_img_holder").first();
      const preview = this._img(mainImg.attr("src") || "");
      const mainLinkA = mainImg.closest("a");
      const original_url = this._img(mainLinkA.attr("href") || "");
      const og_image = this._meta(_, 'meta[property="og:image"]');
      const dynRaw = this._jsConst(html, "dynamic_resolution");
      const download_template = dynRaw ? this._img(dynRaw) : "";
      const dlBtn = _("a#dynamic_resolution").first();
      const data_original_url = this._img(dlBtn.attr("data-original-url") || "");
      const data_portrait_url = this._img(dlBtn.attr("data-portrait-url") || "");
      const data_filename = dlBtn.attr("data-filename") || "";
      const dlOrig = _("a#dl_original").first();
      const download_original = this._img(dlOrig.attr("href") || "");
      const dlOrigLabel = dlOrig.text().replace(/\s+/g, " ").trim();
      const origSizeMatch = dlOrigLabel.match(/\(([^)]+)\)/);
      const original_size = origSizeMatch ? origSizeMatch[1] : "";
      const blockquoteText = _("blockquote footer").first().text().replace(/\s+/g, " ").trim();
      let published_on = "";
      let original_resolution = "";
      let author = "";
      let author_url = "";
      try {
        const pubM = blockquoteText.match(/Published on\s*([^|]+)/i);
        if (pubM) published_on = pubM[1].trim();
        const origA = _("blockquote footer a").first();
        original_resolution = origA.text().trim();
        const authorA = _("blockquote footer a").last();
        author = authorA.text().trim();
        author_url = authorA.attr("href") || "";
        if (author_url === origA.attr("href")) author = "";
      } catch {}
      const downloads = this._num(_("span.label-default").filter((i, el) => /fa-download/.test(_(el).html() || "")).text());
      const tags = [];
      try {
        _('div.wallpaper_detail a[href$="-wallpapers"]').each((i, el) => {
          const _a = _(el);
          const href = _a.attr("href") || "";
          const name = _a.find("span.btn-link").text().replace(/,$/, "").trim() || _a.attr("title")?.replace(/\s*4k Wallpapers And Images$/i, "").trim() || "";
          const m = href.match(/\/([^/]+?)-wallpapers\/?$/i);
          tags.push({
            name: name || (m ? m[1] : ""),
            slug: m ? m[1] : "",
            url: this._abs(href)
          });
        });
        const seen = new Set();
        for (let i = tags.length - 1; i >= 0; i--) {
          const k = tags[i].slug;
          if (!k || seen.has(k)) tags.splice(i, 1);
          else seen.add(k);
        }
      } catch (tagErr) {
        this.log("detail.tags.error", tagErr?.message || tagErr);
      }
      const sidebar = this._sidebar(_, html);
      const sidebar_tags = [];
      try {
        _("div.panel.panel-default").filter((i, el) => /Tags?/i.test(_(el).find(".panel-heading").first().text())).first().find("a.list-group-item.cat_list").each((i, el) => {
          const _a = _(el);
          const href = _a.attr("href") || "";
          const m = href.match(/\/([^/]+?)-wallpapers\/?$/i);
          sidebar_tags.push({
            name: _a.text().replace(/^\s*\d+\s*/, "").trim(),
            slug: m ? m[1] : "",
            url: this._abs(href)
          });
        });
      } catch {}
      const resolution_links = [];
      try {
        let currentGroup = "";
        _("div#collapse_resolutions_side").children().each((i, el) => {
          const _el = _(el);
          if (_el.hasClass("collapse_panel_resolutions")) {
            currentGroup = _el.text().trim();
            return;
          }
          if (_el.is("a.resolution_links")) {
            const href = _el.attr("href") || "";
            const label = _el.find("button").text().trim() || _el.text().trim();
            const m = label.match(/^(\d+)\s*x\s*(\d+)$/i);
            const slugM = href.match(/\/wallpaper\/[^/]+\/([^/?#]+)/i);
            const baseSlug = slugM ? slugM[1] : "";
            const dlUrl = data_filename && baseSlug ? this._img(`/download/${data_filename}-${label}.jpg`) : "";
            resolution_links.push({
              resolution: label,
              width: m ? parseInt(m[1], 10) : null,
              height: m ? parseInt(m[2], 10) : null,
              group: currentGroup,
              redirect_url: this._abs(href),
              download_url: dlUrl
            });
          }
        });
      } catch (rErr) {
        this.log("detail.resolution_links.error", rErr?.message || rErr);
      }
      const download_map = {};
      for (const r of resolution_links) {
        if (r.download_url) download_map[r.resolution] = r.download_url;
      }
      const related = [];
      try {
        _("div.related_main_container").each((i, el) => {
          const _el = _(el);
          const a = _el.find('a[href*="-wallpaper"]').first();
          const img = _el.find("img.lazy-image, img").first();
          const caption = _el.find(".related_thumbd_c").text().trim();
          const keywords_raw = _el.find(".thumb_tags").text().trim();
          const title_attr = img.attr("data-title") || "";
          const m = title_attr.match(/^(.+?)\s*\((\d+x\d+)\)\s*$/);
          related.push({
            slug: this._slugBase(a.attr("href") || ""),
            slug_full: this._slug(a.attr("href") || ""),
            title: (caption || (m ? m[1] : "")).trim() || "untitled",
            url: this._abs(a.attr("href") || ""),
            thumbnail: this._img(img.attr("data-src") || img.attr("src") || ""),
            preview_resolution: m ? m[2] : "",
            keywords: keywords_raw ? keywords_raw.replace(/\s*resolution wallpapers?$/i, "").split(",").map(s => s.trim()).filter(Boolean) : []
          });
        });
      } catch (relErr) {
        this.log("detail.related.error", relErr?.message || relErr);
      }
      const slugBase = this._slugBase(target);
      const slugFull = this._slug(target);
      const thumbnail_og = this._img(og_image);
      const result = {
        slug: slugBase,
        slug_full: slugFull,
        title: title,
        url: full,
        thumbnail: thumbnail_og || preview || original_url,
        preview: preview,
        original_url: original_url,
        data_original_url: data_original_url,
        data_portrait_url: data_portrait_url,
        data_filename: data_filename,
        download_original: download_original,
        original_size: original_size,
        download_template: download_template,
        download_map: download_map,
        published_on: published_on,
        original_resolution: original_resolution,
        author: author || "",
        author_url: author_url,
        downloads: downloads,
        breadcrumbs: breadcrumbs,
        tags: tags,
        sidebar_tags: sidebar_tags,
        categories: sidebar.categories,
        resolutions: sidebar.resolutions,
        resolution_links: resolution_links,
        related: related,
        total_related: related.length
      };
      this.log("detail.done", title, "· resolutions:", resolution_links.length, "· related:", related.length);
      return {
        status: true,
        result: result
      };
    } catch (e) {
      this.log("detail.error", e?.message || e);
      return {
        status: false,
        result: {
          slug: "",
          slug_full: "",
          title: "",
          url: "",
          thumbnail: "",
          preview: "",
          original_url: "",
          data_original_url: "",
          data_portrait_url: "",
          data_filename: "",
          download_original: "",
          original_size: "",
          download_template: "",
          download_map: {},
          published_on: "",
          original_resolution: "",
          author: "",
          author_url: "",
          downloads: null,
          breadcrumbs: [],
          tags: [],
          sidebar_tags: [],
          categories: [],
          resolutions: [],
          resolution_links: [],
          related: [],
          total_related: 0,
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async meta() {
    try {
      this.log("meta.start");
      const html = await this._fetch(PATH.latest);
      const _ = this._dom(html);
      const sb = this._sidebar(_, html);
      this.log("meta.done", "categories:", sb.categories.length, "· resolutions:", sb.resolutions.length);
      return {
        status: true,
        result: {
          categories: sb.categories,
          resolutions: sb.resolutions
        }
      };
    } catch (e) {
      this.log("meta.error", e?.message || e);
      return {
        status: false,
        result: {
          categories: [],
          resolutions: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
  _emptyListResult(source, page, e, extra = {}) {
    return {
      status: false,
      result: Object.assign({
        source: source,
        page: Number(page ?? 1) || 1,
        title: "",
        total_items: 0,
        items: [],
        pagination: {
          current_page: 1,
          total_pages: 1,
          next_page: null,
          prev_page: null,
          last_page: null,
          pages: []
        },
        error: e?.message || "unknown error"
      }, extra)
    };
  }
}
export {
  HdqwallsScraper
};
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body || {};
    const validActions = ["home", "latest", "upcoming", "random", "popular", "category", "tag", "resolution", "search", "detail", "meta"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: {
            home: "/?action=home&page=1",
            latest: "/?action=latest&page=1",
            upcoming: "/?action=upcoming&page=1",
            random: "/?action=random&page=1",
            popular: "/?action=popular&page=1",
            category: "/?action=category&slug=superheroes&page=1",
            tag: "/?action=tag&slug=iron&page=1",
            resolution: "/?action=resolution&res=1920x1080&page=1",
            search: "/?action=search&query=Iron&page=1",
            detail: "/?action=detail&slug=iron-flash-artwork",
            meta: "/?action=meta"
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
    const pageNum = (v, def = 1) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : def;
    };
    const api = new HdqwallsScraper();
    let response;
    switch (action) {
      case "home":
        response = await api.home({
          page: pageNum(params.page)
        });
        break;
      case "latest":
        response = await api.latest({
          page: pageNum(params.page)
        });
        break;
      case "upcoming":
        response = await api.upcoming({
          page: pageNum(params.page)
        });
        break;
      case "random":
        response = await api.random({
          page: pageNum(params.page)
        });
        break;
      case "popular":
        response = await api.popular({
          page: pageNum(params.page)
        });
        break;
      case "category": {
        const target = params.slug || params.category;
        if (!target) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk kategori."
          });
        }
        response = await api.category({
          slug: target,
          page: pageNum(params.page)
        });
        break;
      }
      case "tag": {
        const target = params.slug || params.tag;
        if (!target) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk tag."
          });
        }
        response = await api.tag({
          slug: target,
          page: pageNum(params.page)
        });
        break;
      }
      case "resolution": {
        const target = params.res || params.resolution;
        if (!target) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'res' wajib diisi. Contoh: 1920x1080"
          });
        }
        response = await api.resolution({
          res: target,
          page: pageNum(params.page)
        });
        break;
      }
      case "search": {
        const q = params.query || params.q || params.keyword;
        if (!q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk pencarian."
          });
        }
        response = await api.search({
          query: q,
          sort: params.sort || undefined,
          page: pageNum(params.page)
        });
        break;
      }
      case "detail": {
        const target = params.url || params.slug || params.link;
        if (!target) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk detail."
          });
        }
        response = await api.detail({
          url: target
        });
        break;
      }
      case "meta":
        response = await api.meta();
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
    console.error("[API ERROR] Exception:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}