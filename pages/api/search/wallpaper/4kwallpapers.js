import axios from "axios";
import * as cheerio from "cheerio";
import {
  URL
} from "url";
const DEFAULT_ORIGIN = "https://4kwallpapers.com";
const PATH = {
  home: "/",
  popular: "/most-popular-4k-wallpapers/",
  featured: "/best-4k-wallpapers/",
  random: "/random-wallpapers/",
  collections: "/collections-packs/",
  search: "/search/"
};
class Wallpapers4kScraper {
  constructor(options = {}) {
    try {
      const opts = options || {};
      this.origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/+$/, "");
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
        console.error("[4kw] constructor.error", e?.message || e);
      } catch {}
      throw e;
    }
  }
  log(...a) {
    try {
      console.log("[4kw]", ...a);
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
  _idFromSlug(u) {
    try {
      const slug = this._slug(u);
      const m = slug.match(/-(\d+)\.html?$/i);
      return m ? parseInt(m[1], 10) : null;
    } catch {
      return null;
    }
  }
  _catFromSlug(u) {
    try {
      const abs = this._abs(u);
      const parts = new URL(abs).pathname.split("/").filter(Boolean);
      return parts.length > 1 ? parts[0] : "";
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
      const isPackOnly = _el.hasClass("pack-only");
      const a = _el.find("a.wallpapers__canvas_image").first();
      const href = a.attr("href") || "";
      const img = _el.find('img[itemprop="thumbnail"], img').first();
      const thumbSrc = img.attr("src") || "";
      const srcset = img.attr("srcset") || "";
      const alt = img.attr("alt") || "";
      const keywordsRaw = _el.find('meta[itemprop="keywords"]').attr("content") || "";
      const contentUrl = _el.find('link[itemprop="contentUrl"]').attr("href") || "";
      const title = a.attr("title") || _el.find(".title2 span").first().text().trim() || alt.split(",")[0].trim() || "untitled";
      const tags = [];
      _el.find(".title2 a").get().forEach(el => {
        try {
          const _a = _(el);
          tags.push({
            name: _a.text().trim() || "",
            url: this._abs(_a.attr("href") || "")
          });
        } catch (tagErr) {
          this.log("_parseItem.tag.error", tagErr?.message || tagErr);
        }
      });
      let thumbHd = this._abs(contentUrl);
      if (!thumbHd && srcset) {
        const m = srcset.match(/(\S+)\s+800w/);
        if (m) thumbHd = this._abs(m[1]);
      }
      const directDownload = isPackOnly ? this._abs(_el.find('a[href*="/images/wallpapers/"]').first().attr("href") || "") : "";
      const keywords = keywordsRaw ? keywordsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
      return {
        id: this._idFromSlug(href),
        slug: this._slug(href),
        title: title,
        url: this._abs(href),
        category: this._catFromSlug(href),
        thumbnail: this._abs(thumbSrc),
        thumbnail_hd: thumbHd,
        keywords: keywords,
        tags: tags,
        is_pack_only: isPackOnly,
        download_url: directDownload
      };
    } catch (e) {
      this.log("_parseItem.error", e?.message || e);
      return null;
    }
  }
  _parseCollection(_el, _) {
    try {
      const a = _el.find("a.wallpapers__canvas_image").first();
      const href = a.attr("href") || "";
      const img = _el.find("img").first();
      const fullTitle = a.attr("title") || "";
      const name = _el.find(".collection-name").text().trim() || fullTitle;
      return {
        slug: this._slug(href),
        title: name || "untitled",
        full_title: fullTitle || name || "",
        url: this._abs(href),
        thumbnail: this._abs(img.attr("src") || "")
      };
    } catch (e) {
      this.log("_parseCollection.error", e?.message || e);
      return null;
    }
  }
  _items(_, scope) {
    try {
      const $scope = scope && typeof scope.find === "function" ? scope : _.root();
      const nodes = $scope.find("p.wallpapers__item").get().filter(el => !_(el).hasClass("collection-card"));
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
  _collections(_, scope) {
    try {
      const $scope = scope && typeof scope.find === "function" ? scope : _.root();
      const nodes = $scope.find("p.wallpapers__item.collection-card").get();
      const out = [];
      for (const el of nodes) {
        const col = this._parseCollection(_(el), _);
        if (col) out.push(col);
      }
      return out;
    } catch (e) {
      this.log("_collections.error", e?.message || e);
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
      const wrap = _("p.pages").first();
      if (!wrap.length) return empty;
      const pages = [];
      let current_page = 1;
      let next_page = null;
      let prev_page = null;
      let last_page = null;
      wrap.find("a").get().forEach(el => {
        try {
          const _a = _(el);
          const t = _a.text().trim();
          const href = _a.attr("href");
          if (!href) return;
          const abs = this._abs(href);
          if (/^\d+$/.test(t)) {
            const p = parseInt(t, 10);
            pages.push({
              page: p,
              url: abs
            });
          } else if (/^next/i.test(t) || _a.hasClass("ctrl-right")) {
            next_page = abs;
          } else if (/^prev/i.test(t) || _a.hasClass("ctrl-left")) {
            prev_page = abs;
          } else if (/^last/i.test(t)) {
            last_page = abs;
          }
        } catch (err) {
          this.log("_pager.a.error", err?.message || err);
        }
      });
      wrap.find("strong[data-page]").get().forEach(el => {
        try {
          const _s = _(el);
          const p = parseInt(_s.attr("data-page"), 10);
          if (!Number.isFinite(p)) return;
          const label = _s.text().trim();
          if (/^\d+$/.test(label)) {
            pages.push({
              page: p,
              url: this._abs(`${basePath}?page=${p}`)
            });
            if (_s.hasClass("active")) current_page = p;
          } else if (/^next/i.test(label) || _s.hasClass("ctrl-right")) {
            next_page = this._abs(`${basePath}?page=${current_page + 1}`);
          }
        } catch (err) {
          this.log("_pager.strong.error", err?.message || err);
        }
      });
      if (current_page === 1) {
        const active = wrap.find("strong.active, a.current, strong.current").first();
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
  _filters(_) {
    try {
      return _("ul.main-menu li a").get().map(el => {
        const _a = _(el);
        return {
          label: (_a.find("span").text() || _a.text()).trim(),
          url: this._abs(_a.attr("href") || ""),
          active: _a.hasClass("selected")
        };
      });
    } catch (e) {
      this.log("_filters.error", e?.message || e);
      return [];
    }
  }
  _categories(_) {
    try {
      return _("div#categories-menu a").get().map(el => {
        const _a = _(el);
        return {
          name: _a.text().replace(/\s+/g, " ").trim() || "",
          url: this._abs(_a.attr("href") || ""),
          title: _a.attr("title") || ""
        };
      });
    } catch (e) {
      this.log("_categories.error", e?.message || e);
      return [];
    }
  }
  _popularTags(_) {
    try {
      return _("div.tags-list div.tags-right a").get().map(el => {
        const _a = _(el);
        return {
          name: _a.text().trim() || "",
          url: this._abs(_a.attr("href") || ""),
          title: _a.attr("title") || ""
        };
      });
    } catch (e) {
      this.log("_popularTags.error", e?.message || e);
      return [];
    }
  }
  async _list({
    path,
    basePath,
    params,
    page,
    titleDefault,
    includeCollections
  }) {
    try {
      const p = Number(page) > 0 ? Number(page) : 1;
      const allParams = Object.assign({}, params || {});
      if (p > 1) allParams.page = p;
      const html = await this._fetch(path, allParams);
      const _ = this._dom(html);
      const items = this._items(_, _.root());
      const pager = this._pager(_, basePath || path);
      const title = _("h1 span.main").first().text().replace(/\s+/g, " ").trim() || _("h1").first().text().replace(/\s+/g, " ").trim() || titleDefault || "";
      return {
        title: title,
        page: p,
        total_items: items.length,
        items: items,
        pagination: pager,
        filters_available: this._filters(_),
        categories_available: this._categories(_),
        popular_tags: this._popularTags(_),
        collections: includeCollections ? this._collections(_, _.root()) : []
      };
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
        path: PATH.home,
        basePath: "/",
        page: page ?? rest?.page ?? 1,
        titleDefault: "Recent Wallpapers",
        includeCollections: true
      });
      this.log("home.done", r.items.length, "items");
      return {
        status: true,
        result: {
          source: "home",
          page: r.page,
          title: r.title,
          total_items: r.total_items,
          items: r.items,
          pagination: r.pagination,
          collections: r.collections,
          categories_available: r.categories_available,
          filters_available: r.filters_available,
          popular_tags: r.popular_tags
        }
      };
    } catch (e) {
      this.log("home.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "home",
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
          collections: [],
          categories_available: [],
          filters_available: [],
          popular_tags: [],
          error: e?.message || "unknown error"
        }
      };
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
        titleDefault: "Popular Wallpapers",
        includeCollections: true
      });
      this.log("popular.done", r.items.length, "items");
      return {
        status: true,
        result: {
          source: "popular",
          page: r.page,
          title: r.title,
          total_items: r.total_items,
          items: r.items,
          pagination: r.pagination,
          collections: r.collections,
          filters_available: r.filters_available,
          popular_tags: r.popular_tags
        }
      };
    } catch (e) {
      this.log("popular.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "popular",
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
          collections: [],
          filters_available: [],
          popular_tags: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async featured({
    page,
    ...rest
  } = {}) {
    try {
      this.log("featured.start", {
        page: page
      });
      const r = await this._list({
        path: PATH.featured,
        basePath: PATH.featured,
        page: page ?? rest?.page ?? 1,
        titleDefault: "Featured Wallpapers",
        includeCollections: true
      });
      this.log("featured.done", r.items.length, "items");
      return {
        status: true,
        result: {
          source: "featured",
          page: r.page,
          title: r.title,
          total_items: r.total_items,
          items: r.items,
          pagination: r.pagination,
          collections: r.collections,
          filters_available: r.filters_available,
          popular_tags: r.popular_tags
        }
      };
    } catch (e) {
      this.log("featured.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "featured",
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
          collections: [],
          filters_available: [],
          popular_tags: [],
          error: e?.message || "unknown error"
        }
      };
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
        titleDefault: "Random Wallpapers",
        includeCollections: false
      });
      this.log("random.done", r.items.length, "items");
      return {
        status: true,
        result: {
          source: "random",
          page: r.page,
          title: r.title,
          total_items: r.total_items,
          items: r.items,
          pagination: r.pagination,
          filters_available: r.filters_available
        }
      };
    } catch (e) {
      this.log("random.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "random",
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
          filters_available: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async collections({
    page,
    ...rest
  } = {}) {
    try {
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("collections.start", {
        page: p
      });
      const params = p > 1 ? {
        page: p
      } : undefined;
      const html = await this._fetch(PATH.collections, params);
      const _ = this._dom(html);
      const list = this._collections(_, _.root());
      const pager = this._pager(_, PATH.collections);
      const title = _("h1 span.main").first().text().trim() || "Collections Wallpapers";
      const description = _("span.packs-content").first().text().replace(/\s+/g, " ").trim() || "";
      this.log("collections.done", list.length, "collections");
      return {
        status: true,
        result: {
          source: "collections",
          page: p,
          title: title,
          description: description,
          total_items: list.length,
          items: list,
          pagination: pager,
          filters_available: this._filters(_)
        }
      };
    } catch (e) {
      this.log("collections.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "collections",
          page: Number(page ?? 1) || 1,
          title: "",
          description: "",
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
          filters_available: [],
          error: e?.message || "unknown error"
        }
      };
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
      const clean = String(raw).replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "");
      const basePath = `/${clean}/`;
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("category.start", {
        slug: clean,
        page: p
      });
      const r = await this._list({
        path: basePath,
        basePath: basePath,
        page: p,
        titleDefault: `Category: ${clean}`,
        includeCollections: false
      });
      this.log("category.done", r.items.length, "items");
      return {
        status: true,
        result: {
          source: "category",
          slug: clean,
          page: p,
          title: r.title,
          total_items: r.total_items,
          items: r.items,
          pagination: r.pagination,
          filters_available: r.filters_available
        }
      };
    } catch (e) {
      this.log("category.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "category",
          slug: slug || category || "",
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
          filters_available: [],
          error: e?.message || "unknown error"
        }
      };
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
      const clean = String(raw).replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "");
      const basePath = `/${clean}`;
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("tag.start", {
        slug: clean,
        page: p
      });
      const r = await this._list({
        path: basePath,
        basePath: basePath,
        page: p,
        titleDefault: `Tag: ${clean}`,
        includeCollections: false
      });
      this.log("tag.done", r.items.length, "items");
      return {
        status: true,
        result: {
          source: "tag",
          slug: clean,
          page: p,
          title: r.title,
          total_items: r.total_items,
          items: r.items,
          pagination: r.pagination,
          filters_available: r.filters_available
        }
      };
    } catch (e) {
      this.log("tag.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "tag",
          slug: slug || tag || "",
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
          filters_available: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async search({
    query,
    page,
    ...rest
  } = {}) {
    try {
      if (!query) throw new Error("query is required");
      const q = String(query).trim();
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("search.start", {
        query: q,
        page: p
      });
      const params = {
        q: q
      };
      if (p > 1) params.page = p;
      const html = await this._fetch(PATH.search, params);
      const _ = this._dom(html);
      const items = this._items(_, _.root());
      const pager = this._pager(_, PATH.search);
      const title = _("h1 span.main").first().text().replace(/\s+/g, " ").trim() || `Search: ${q}`;
      this.log("search.done", items.length, "items");
      return {
        status: true,
        result: {
          source: "search",
          query: q,
          page: p,
          title: title,
          total_items: items.length,
          items: items,
          pagination: pager,
          popular_tags: this._popularTags(_)
        }
      };
    } catch (e) {
      this.log("search.error", e?.message || e);
      return {
        status: false,
        result: {
          source: "search",
          query: query || "",
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
          popular_tags: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async detail({
    url,
    link,
    slug,
    id,
    ...rest
  } = {}) {
    try {
      let target = url || link || slug || rest?.path || "";
      if (!target && id) {
        throw new Error("id saja tidak cukup — sertakan juga url/slug (kategori dibutuhkan)");
      }
      if (!target) throw new Error("url / link / slug is required");
      const full = this._abs(target);
      if (!full) throw new Error("failed to build absolute url");
      this.log("detail.start", full);
      const html = await this._fetch(full);
      const _ = this._dom(html);
      const title = _("h1.selected").first().text().replace(/\s+/g, " ").trim() || _("div.main-id").text().replace(/\s+/g, " ").trim() || "untitled";
      const category = _("div.main-id a").first().text().trim() || this._catFromSlug(target) || "";
      const intro = _("p.wall-intro").first().text().replace(/\s+/g, " ").trim() || "";
      const mainPic = _("div#main-pic");
      const mainImg = mainPic.find("img").first();
      const preview = this._abs(mainImg.attr("src") || "");
      const preview_srcset = mainImg.attr("srcset") || "";
      const ogImage = this._meta(_, 'meta[property="og:image"]');
      const officialThumb = this._abs(mainPic.find('link[itemprop="thumbnail"]').attr("href") || "");
      const prevLink = mainPic.find("a.ctrl-left").first();
      const nextLink = mainPic.find("a.ctrl-right").first();
      const prev = prevLink.length ? {
        title: prevLink.attr("title") || "",
        url: this._abs(prevLink.attr("href") || ""),
        id: this._idFromSlug(prevLink.attr("href") || "")
      } : null;
      const next = nextLink.length ? {
        title: nextLink.attr("title") || "",
        url: this._abs(nextLink.attr("href") || ""),
        id: this._idFromSlug(nextLink.attr("href") || "")
      } : null;
      const categories = [];
      try {
        _("div.pic-right p.tags").each((i, el) => {
          const _p = _(el);
          const label = _p.find("span.right-tags").text().trim();
          if (!/^Categories?$/i.test(label)) return;
          _p.find("a").each((j, a) => {
            const _a = _(a);
            categories.push({
              name: _a.text().trim() || "",
              url: this._abs(_a.attr("href") || ""),
              title: _a.attr("title") || ""
            });
          });
        });
      } catch (catErr) {
        this.log("detail.categories.error", catErr?.message || catErr);
      }
      const tags = [];
      try {
        _("div.pic-right p.tags").each((i, el) => {
          const _p = _(el);
          const label = _p.find("span.right-tags").text().trim();
          if (!/^Tags?$/i.test(label)) return;
          _p.find("a").each((j, a) => {
            const _a = _(a);
            tags.push({
              name: _a.text().trim() || "",
              url: this._abs(_a.attr("href") || ""),
              title: _a.attr("title") || ""
            });
          });
        });
      } catch (tagErr) {
        this.log("detail.tags.error", tagErr?.message || tagErr);
      }
      const download_4k = this._abs(_("a#resolution.current").filter((i, el) => /4K|3840x2160/i.test(_(el).text())).first().attr("href") || "");
      const download_original = this._abs(_("a#resolution.current").filter((i, el) => /Original|5120x2880/i.test(_(el).text())).first().attr("href") || "");
      const groupNameMap = {};
      try {
        _("span#available a, #available a").each((i, el) => {
          const _a = _(el);
          const href = _a.attr("href") || "";
          const m = href.match(/#?(\d+)$/);
          if (m) groupNameMap[`res-${m[1]}`] = _a.text().trim();
        });
      } catch (gErr) {
        this.log("detail.groupMap.error", gErr?.message || gErr);
      }
      const resolutions = [];
      const resolution_groups = [];
      try {
        _('span#res-list > span[id^="res-"]').each((i, groupEl) => {
          const _g = _(groupEl);
          const group_id = _g.attr("id") || "";
          const group_name = groupNameMap[group_id] || group_id;
          const groupItems = [];
          _g.find("a").each((j, a) => {
            try {
              const _a = _(a);
              const href = _a.attr("href") || "";
              const aTitle = _a.attr("title") || "";
              const infoEl = _a.find("span#info").first();
              const infoText = infoEl.text().replace(/\s+/g, " ").trim();
              const label = _a.clone().children("span#info").remove().end().text().replace(/\s+/g, " ").trim();
              let width = null;
              let height = null;
              const dim = label.match(/(\d+)\s*[x×]\s*(\d+)/i);
              if (dim) {
                width = parseInt(dim[1], 10);
                height = parseInt(dim[2], 10);
              }
              let quality = "";
              let compatible = [];
              if (infoText) {
                const stripped = infoText.replace(/^\(|\)$/g, "").trim();
                const parts = stripped.split("|").map(s => s.trim()).filter(Boolean);
                for (const part of parts) {
                  if (/Compatible Resolutions?/i.test(part)) {
                    compatible = part.replace(/Compatible Resolutions?\s*/i, "").split(",").map(s => s.trim()).filter(Boolean);
                  } else if (!quality) {
                    quality = part;
                  }
                }
              }
              const item = {
                group_id: group_id,
                group_name: group_name,
                label: label,
                width: width,
                height: height,
                resolution: width && height ? `${width}x${height}` : label,
                quality: quality,
                compatible: compatible,
                info: infoText,
                url: this._abs(href),
                title: aTitle
              };
              groupItems.push(item);
              resolutions.push(item);
            } catch (aErr) {
              this.log("detail.resolution.item.error", aErr?.message || aErr);
            }
          });
          resolution_groups.push({
            group_id: group_id,
            group_name: group_name,
            total: groupItems.length,
            items: groupItems
          });
        });
      } catch (resErr) {
        this.log("detail.resolutions.error", resErr?.message || resErr);
      }
      const total_resolutions = resolutions.length;
      const relatedScope = _("div.pics.related");
      const related = relatedScope.length ? this._items(_, relatedScope) : [];
      const popular_tags = this._popularTags(_);
      this.log("detail.done", title, "· resolutions:", total_resolutions, "· groups:", resolution_groups.length, "· related:", related.length);
      return {
        status: true,
        result: {
          id: this._idFromSlug(target),
          slug: this._slug(target),
          title: title,
          url: full,
          category: category,
          intro: intro,
          thumbnail: officialThumb || preview || this._abs(ogImage),
          preview: preview,
          preview_srcset: preview_srcset,
          download_4k: download_4k,
          download_original: download_original,
          total_resolutions: total_resolutions,
          resolutions: resolutions,
          resolution_groups: resolution_groups,
          categories: categories,
          tags: tags,
          prev: prev,
          next: next,
          related: related,
          total_related: related.length,
          popular_tags: popular_tags
        }
      };
    } catch (e) {
      this.log("detail.error", e?.message || e);
      return {
        status: false,
        result: {
          id: null,
          slug: "",
          title: "",
          url: "",
          category: "",
          intro: "",
          thumbnail: "",
          preview: "",
          preview_srcset: "",
          download_4k: "",
          download_original: "",
          total_resolutions: 0,
          resolutions: [],
          resolution_groups: [],
          categories: [],
          tags: [],
          prev: null,
          next: null,
          related: [],
          total_related: 0,
          popular_tags: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body || {};
    const validActions = ["home", "popular", "featured", "random", "collections", "category", "tag", "search", "detail"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: {
            home: "/?action=home&page=1",
            popular: "/?action=popular&page=1",
            featured: "/?action=featured&page=1",
            random: "/?action=random&page=1",
            collections: "/?action=collections&page=1",
            category: "/?action=category&slug=games&page=1",
            tag: "/?action=tag&slug=key-art&page=1",
            search: "/?action=search&query=Car&page=1",
            detail: "/?action=detail&url=/games/the-legend-of-zelda-27236.html"
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
    const api = new Wallpapers4kScraper();
    let response;
    switch (action) {
      case "home": {
        response = await api.home({
          page: pageNum(params.page)
        });
        break;
      }
      case "popular": {
        response = await api.popular({
          page: pageNum(params.page)
        });
        break;
      }
      case "featured": {
        response = await api.featured({
          page: pageNum(params.page)
        });
        break;
      }
      case "random": {
        response = await api.random({
          page: pageNum(params.page)
        });
        break;
      }
      case "collections": {
        response = await api.collections({
          page: pageNum(params.page)
        });
        break;
      }
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
          page: pageNum(params.page)
        });
        break;
      }
      case "detail": {
        const target = params.url || params.slug || params.link;
        if (!target) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk melihat detail."
          });
        }
        response = await api.detail({
          url: target
        });
        break;
      }
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