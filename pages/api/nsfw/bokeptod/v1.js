import axios from "axios";
import * as cheerio from "cheerio";
import {
  URL
} from "url";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
const DEFAULT_PROXY = proxy;
const DEFAULT_ORIGIN = "https://bokeptod.pro";
class BokeptodScraper {
  constructor(options = {}) {
    try {
      const opts = options || {};
      this.proxy = String(opts.proxy || DEFAULT_PROXY);
      if (!/\/$/.test(this.proxy)) this.proxy += "/";
      this.origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/+$/, "");
      this.base = this.proxy + this.origin;
      this.timeout = Number(opts.timeout ?? 12e4);
      this.retries = Math.max(0, Number(opts.retries ?? 2));
      this.retryDelay = Math.max(0, Number(opts.retryDelay ?? 800));
      this.headers = Object.assign({}, {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }, opts.headers || {});
      this.http = axios.create({
        baseURL: this.base,
        timeout: this.timeout,
        headers: this.headers,
        maxRedirects: 5
      });
    } catch (e) {
      try {
        console.error("[bokeptod] constructor.error", e?.message || e);
      } catch {}
      throw e;
    }
  }
  log(...a) {
    try {
      console.log("[bokeptod]", ...a);
    } catch {}
  }
  _sleep(ms) {
    try {
      return new Promise(r => setTimeout(r, ms));
    } catch {
      return Promise.resolve();
    }
  }
  _proxy(u) {
    try {
      if (!u) return "";
      let s = String(u).trim();
      if (!s) return "";
      if (s.startsWith(this.proxy)) return s;
      if (/^https?:\/\//i.test(s)) return this.proxy + s;
      if (s.startsWith("//")) return this.proxy + "https:" + s;
      return this.proxy + this.origin + (s.startsWith("/") ? s : "/" + s);
    } catch (e) {
      this.log("_proxy.error", e?.message || e);
      return "";
    }
  }
  _unproxy(u) {
    try {
      if (!u) return "";
      let s = String(u).trim();
      if (s.startsWith(this.proxy)) s = s.slice(this.proxy.length);
      return s;
    } catch (e) {
      this.log("_unproxy.error", e?.message || e);
      return "";
    }
  }
  _abs(u) {
    try {
      if (!u) return "";
      let s = this._unproxy(u);
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
      const raw = this._unproxy(u);
      if (!raw) return "";
      const abs = /^https?:\/\//i.test(raw) ? raw : this.origin + (raw.startsWith("/") ? raw : "/" + raw);
      const parts = new URL(abs).pathname.split("/").filter(Boolean);
      return parts.at(-1) || "";
    } catch (e) {
      this.log("_slug.error", e?.message || e);
      return "";
    }
  }
  _views(t) {
    try {
      const s = String(t || "").replace(/[^\d.kmb]/gi, "").trim();
      if (!s) return null;
      const m = s.match(/^([\d.]+)([kmb]?)/i);
      if (!m) return null;
      const n = parseFloat(m[1]) || 0;
      const unit = (m[2] || "").toLowerCase();
      const mult = unit === "k" ? 1e3 : unit === "m" ? 1e6 : unit === "b" ? 1e9 : 1;
      return Math.round(n * mult);
    } catch (e) {
      this.log("_views.error", e?.message || e);
      return null;
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
  _jsonld(_, type) {
    try {
      const scripts = _('script.yoast-schema-graph, script[type="application/ld+json"]').get();
      for (const el of scripts) {
        try {
          const raw = _(el).contents().text();
          if (!raw) continue;
          const obj = JSON.parse(raw);
          const graph = Array.isArray(obj?.["@graph"]) ? obj["@graph"] : [obj];
          const found = graph.find(g => {
            const t = Array.isArray(g?.["@type"]) ? g["@type"] : [g?.["@type"]];
            return t?.includes(type);
          });
          if (found) return found;
        } catch {}
      }
      return null;
    } catch (e) {
      this.log("_jsonld.error", e?.message || e);
      return null;
    }
  }
  _numSel(_, sels) {
    try {
      const list = Array.isArray(sels) ? sels : [sels];
      for (const sel of list) {
        const raw = _(sel).first().text().replace(/\s+/g, " ").trim();
        const n = this._num(raw);
        if (n !== null) return n;
      }
      return null;
    } catch {
      return null;
    }
  }
  async _fetch(pathOrUrl, params) {
    try {
      const url = this._proxy(pathOrUrl || "/");
      if (!url) throw new Error("invalid url/path");
      const maxAttempt = Math.max(1, this.retries + 1);
      let lastErr = null;
      for (let attempt = 1; attempt <= maxAttempt; attempt++) {
        try {
          this.log("fetch →", url, `(attempt ${attempt}/${maxAttempt})`, params ? JSON.stringify(params) : "");
          const res = await this.http.get(url, {
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
  _items(_, scope) {
    try {
      const $scope = scope && typeof scope.find === "function" ? scope : _.root();
      const nodes = $scope.find("article.loop-video, article.thumb-block").get();
      const out = [];
      for (const el of nodes) {
        try {
          const _el = _(el);
          const a = _el.find("a").first();
          const href = a.attr("href") || "";
          const thumb = _el.find("img.video-main-thumb").attr("src") || _el.attr("data-main-thumb") || "";
          const views_text = _el.find("span.views").text().replace(/\s+/g, " ").trim();
          const classes = (_el.attr("class") || "").split(/\s+/);
          const categories = classes.filter(c => c.startsWith("category-")).map(c => c.slice(9)).filter(Boolean);
          const tags = classes.filter(c => c.startsWith("tag-")).map(c => c.slice(4)).filter(Boolean);
          const duration = _el.find("span.duration").text().trim() || "00:00";
          const rating = _el.find("div.rating-bar span").last().text().trim() || "0%";
          out.push({
            video_id: _el.attr("data-video-id") || "",
            post_id: _el.attr("data-post-id") || "",
            title: (a.attr("title") || _el.find("header.entry-header span").text() || "untitled").trim() || "untitled",
            url: this._abs(href),
            slug: this._slug(href),
            thumbnail: this._abs(thumb),
            views_text: views_text || null,
            views: this._views(views_text),
            duration: duration,
            rating: rating,
            categories: categories,
            tags: tags,
            is_hd: _el.find("span.hd-video").length > 0,
            quality: _el.find("span.hd-video").text().trim() || "SD"
          });
        } catch (itemErr) {
          this.log("_items.item.error", itemErr?.message || itemErr);
        }
      }
      return out;
    } catch (e) {
      this.log("_items.error", e?.message || e);
      return [];
    }
  }
  _pager(_) {
    const empty = {
      current_page: 1,
      total_pages: 1,
      next_page: null,
      prev_page: null,
      last_page: null,
      pages: []
    };
    try {
      const ul = _("div.pagination ul").first();
      if (!ul.length) return empty;
      const pages = [];
      let current_page = 1;
      let next_page = null;
      let prev_page = null;
      let last_page = null;
      ul.find("li a").get().forEach(el => {
        try {
          const _a = _(el);
          const t = _a.text().trim();
          const href = _a.attr("href");
          if (/^\d+$/.test(t)) {
            const p = parseInt(t, 10);
            pages.push({
              page: p,
              url: this._abs(href || "")
            });
            if (_a.hasClass("current")) current_page = p;
          } else if (/^next$/i.test(t) && href) {
            next_page = this._abs(href);
          } else if (/^(prev|previous)$/i.test(t) && href) {
            prev_page = this._abs(href);
          } else if (/^last$/i.test(t) && href) {
            last_page = this._abs(href);
          }
        } catch (pageErr) {
          this.log("_pager.item.error", pageErr?.message || pageErr);
        }
      });
      const total_pages = pages.length ? Math.max(...pages.map(p => p.page)) : 1;
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
      return _("div.filters-options span a").get().map(el => {
        const _a = _(el);
        return {
          label: _a.text().trim() || "",
          url: this._abs(_a.attr("href") || ""),
          active: _a.hasClass("active")
        };
      });
    } catch (e) {
      this.log("_filters.error", e?.message || e);
      return [];
    }
  }
  async home({
    filter,
    page,
    ...rest
  } = {}) {
    try {
      const f = filter || "latest";
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("home.start", {
        filter: f,
        page: p
      });
      const path = p > 1 ? `/page/${p}/` : "/";
      const html = await this._fetch(path, {
        filter: f
      });
      const _ = this._dom(html);
      const items = this._items(_, _.root());
      const pager = this._pager(_);
      const title = _("h2.widget-title").first().text().trim() || "Latest videos";
      this.log("home.done", items.length, "items · page", p);
      return {
        status: true,
        result: {
          filter: f,
          page: p,
          title: title,
          total_items: items.length,
          items: items,
          pagination: pager,
          filters_available: this._filters(_)
        }
      };
    } catch (e) {
      this.log("home.error", e?.message || e);
      return {
        status: false,
        result: {
          filter: filter || "latest",
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
    category,
    type,
    page,
    ...rest
  } = {}) {
    const emptyPager = {
      current_page: 1,
      total_pages: 1,
      next_page: null,
      prev_page: null,
      last_page: null,
      pages: []
    };
    try {
      const raw = slug || tag || category || rest?.path || "";
      if (!raw) throw new Error("slug/tag/category is required");
      const p = Number(page ?? rest?.page ?? 1) || 1;
      const clean = String(raw).replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "").replace(/^(tag|category)\//i, "");
      let primary = "tag";
      if (type === "category" || category) primary = "category";
      else if (type === "tag" || tag) primary = "tag";
      const alternate = primary === "tag" ? "category" : "tag";
      const buildPath = base => p > 1 ? `/${base}/${clean}/page/${p}/` : `/${base}/${clean}/`;
      this.log("tag.start", {
        slug: clean,
        page: p,
        base: primary
      });
      let html = await this._fetch(buildPath(primary));
      let _ = this._dom(html);
      let items = this._items(_, _.root());
      let usedBase = primary;
      if (!items.length) {
        const altPath = buildPath(alternate);
        this.log("tag.retry-alternate", altPath);
        try {
          const altHtml = await this._fetch(altPath);
          const _alt = this._dom(altHtml);
          const altItems = this._items(_, _alt.root());
          if (altItems.length) {
            html = altHtml;
            _ = _alt;
            items = altItems;
            usedBase = alternate;
          }
        } catch (altErr) {
          this.log("tag.alternate.error", altErr?.message || altErr);
        }
      }
      const pager = this._pager(_);
      const title = _("h1.widget-title").first().text().replace(/\s+/g, " ").trim() || _("header.page-header h1, header.page-header h2").first().text().replace(/\s+/g, " ").trim() || `${usedBase}: ${clean}`;
      this.log("tag.done", items.length, "items · base:", usedBase, "· page", p);
      return {
        status: true,
        result: {
          slug: clean,
          type: usedBase,
          page: p,
          title: title,
          total_items: items.length,
          items: items,
          pagination: pager,
          filters_available: this._filters(_)
        }
      };
    } catch (e) {
      this.log("tag.error", e?.message || e);
      return {
        status: false,
        result: {
          slug: "",
          type: "",
          page: Number(page ?? 1) || 1,
          title: "",
          total_items: 0,
          items: [],
          pagination: emptyPager,
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
      const p = Number(page ?? rest?.page ?? 1) || 1;
      this.log("search.start", {
        query: query,
        page: p
      });
      const path = p > 1 ? `/page/${p}/` : "/";
      const html = await this._fetch(path, {
        s: query
      });
      const _ = this._dom(html);
      const items = this._items(_, _.root());
      const pager = this._pager(_);
      const title = _("h1.widget-title").first().text().replace(/\s+/g, " ").trim() || `Search: ${query}`;
      this.log("search.done", items.length, "items · page", p);
      return {
        status: true,
        result: {
          query: query,
          page: p,
          title: title,
          total_items: items.length,
          items: items,
          pagination: pager,
          filters_available: this._filters(_)
        }
      };
    } catch (e) {
      this.log("search.error", e?.message || e);
      return {
        status: false,
        result: {
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
          filters_available: [],
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async detail({
    url,
    link,
    slug,
    ...rest
  } = {}) {
    try {
      let target = url || link || rest?.path || "";
      if (!target && slug) target = `/${String(slug).replace(/^\/+/, "")}/`;
      if (!target) throw new Error("url / link / slug is required");
      const fetchUrl = this._proxy(target);
      if (!fetchUrl) throw new Error("failed to build proxied url");
      this.log("detail.start", fetchUrl);
      const html = await this._fetch(fetchUrl);
      const _ = this._dom(html);
      const jsonld = this._jsonld(_, "Article");
      const title = _("h1.entry-title").first().text().trim() || "untitled";
      const iframe = _("div.responsive-player iframe").first();
      const embed_url = this._abs(iframe.attr("src") || "") || this._abs(this._meta(_, 'meta[itemprop="embedUrl"]'));
      const viewsRaw = _("div#video-views span").first().text().trim() || _('[itemprop="interactionCount"]').first().attr("content") || _('[itemprop="interactionCount"]').first().text().trim() || this._meta(_, 'meta[itemprop="interactionCount"]') || this._meta(_, 'meta[property="og:video:views"]');
      const views_text = viewsRaw || null;
      const views = this._views(views_text);
      const likesRaw = _(".rating-result .likes_count").first().text().trim() || _("span.likes_count").first().text().trim() || _('a[data-post_like="like"] .count').first().text().trim();
      const dislikesRaw = _(".rating-result .dislikes_count").first().text().trim() || _("span.dislikes_count").first().text().trim() || _('a[data-post_like="dislike"] .count').first().text().trim();
      const likes = this._num(likesRaw);
      const dislikes = this._num(dislikesRaw);
      let rating = _(".rating-result .percentage").first().text().trim() || "";
      let ratingNum = this._num(String(rating).replace("%", ""));
      if ((ratingNum === null || ratingNum === 0) && (likes ?? 0) + (dislikes ?? 0) > 0) {
        ratingNum = Math.round((likes ?? 0) / ((likes ?? 0) + (dislikes ?? 0)) * 100);
        rating = `${ratingNum}%`;
      }
      if (ratingNum === null) rating = null;
      const desc = _("div.video-description .desc").text().replace(/\s+/g, " ").trim();
      const author = _("div#video-author a").first().text().trim() || _("div#video-author").text().replace(/From:\s*/i, "").trim() || this._meta(_, 'meta[name="author"]') || "unknown";
      const date = _("div#video-date").text().replace(/Date:\s*/i, "").trim() || jsonld?.datePublished || this._meta(_, 'meta[property="article:published_time"]');
      const tags = [];
      try {
        _("div.tags-list a.label").get().forEach(el => {
          try {
            const _a = _(el);
            tags.push({
              name: _a.attr("title") || _a.text().trim() || "",
              text: _a.text().trim() || "",
              url: this._abs(_a.attr("href") || ""),
              type: _a.find("i.fa-folder-open").length ? "category" : "tag"
            });
          } catch (tagErr) {
            this.log("detail.tag.error", tagErr?.message || tagErr);
          }
        });
      } catch (tagListErr) {
        this.log("detail.tags.error", tagListErr?.message || tagListErr);
      }
      const categories = tags.filter(t => t.type === "category").map(t => t.text);
      const tag_list = tags.filter(t => t.type === "tag").map(t => t.text);
      let related = [];
      try {
        const related_scope = _("div.under-video-block");
        related = related_scope.length ? this._items(_, related_scope) : [];
      } catch (relErr) {
        this.log("detail.related.error", relErr?.message || relErr);
      }
      const meta_thumb = _('meta[property="og:image"]').attr("content") || this._meta(_, 'meta[itemprop="thumbnailUrl"]');
      const breadcrumbs = _("div#breadcrumbs a").get().map(el => {
        const _a = _(el);
        return {
          name: _a.text().trim() || "",
          url: this._abs(_a.attr("href") || "")
        };
      });
      const durationRaw = this._meta(_, 'meta[itemprop="duration"]', "");
      let duration_seconds = null;
      try {
        const m = durationRaw.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
        if (m && durationRaw) {
          const [, d, h, mi, s] = m;
          duration_seconds = (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(mi) || 0) * 60 + (Number(s) || 0);
        }
      } catch {}
      this.log("detail.done", title || "(no title)", "· related:", related.length);
      return {
        status: true,
        result: {
          title: title,
          url: this._abs(target),
          slug: this._slug(target),
          embed_url: embed_url,
          thumbnail: this._abs(meta_thumb),
          description: desc || "",
          author: author,
          date: date || "",
          views_text: views_text,
          views: views,
          likes: likes,
          dislikes: dislikes,
          rating: rating,
          rating_value: ratingNum,
          categories: categories,
          tags: tag_list,
          tags_detail: tags,
          related: related,
          total_related: related.length,
          breadcrumbs: breadcrumbs,
          duration: durationRaw || "",
          duration_seconds: duration_seconds,
          published_time: _('meta[property="article:published_time"]').attr("content") || jsonld?.datePublished || "",
          modified_time: _('meta[property="article:modified_time"]').attr("content") || jsonld?.dateModified || "",
          comment_count: this._num(jsonld?.commentCount),
          word_count: this._num(jsonld?.wordCount)
        }
      };
    } catch (e) {
      this.log("detail.error", e?.message || e);
      return {
        status: false,
        result: {
          title: "",
          url: "",
          slug: "",
          embed_url: "",
          thumbnail: "",
          description: "",
          author: "unknown",
          date: "",
          views_text: null,
          views: null,
          likes: null,
          dislikes: null,
          rating: null,
          rating_value: null,
          categories: [],
          tags: [],
          tags_detail: [],
          related: [],
          total_related: 0,
          breadcrumbs: [],
          duration: "",
          duration_seconds: null,
          published_time: "",
          modified_time: "",
          comment_count: null,
          word_count: null,
          error: e?.message || "unknown error"
        }
      };
    }
  }
}
export {
  BokeptodScraper
};
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body || {};
    const validActions = ["home", "tag", "search", "detail"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: {
            home: "/?action=home&page=1",
            tag: "/?action=tag&slug=bokep-bocil&page=1",
            search: "/?action=search&query=Andini&page=1",
            detail: "/?action=detail&url=bokep-smp-abg-bocil-mesum-ngewe-sambil-di-rekam/"
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
    const api = new BokeptodScraper();
    let response;
    switch (action) {
      case "home": {
        response = await api.home({
          filter: params.filter || "latest",
          page: params.page ? parseInt(params.page, 10) : 1
        });
        break;
      }
      case "tag": {
        const targetTag = params.slug || params.tag || params.category;
        if (!targetTag) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk melihat tag."
          });
        }
        response = await api.tag({
          slug: targetTag,
          type: params.type,
          page: params.page ? parseInt(params.page, 10) : 1
        });
        break;
      }
      case "search": {
        const searchQuery = params.query || params.keyword || params.q;
        if (!searchQuery) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk pencarian."
          });
        }
        response = await api.search({
          query: searchQuery,
          page: params.page ? parseInt(params.page, 10) : 1
        });
        break;
      }
      case "detail": {
        const targetDetail = params.url || params.slug || params.link;
        if (!targetDetail) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk melihat detail."
          });
        }
        response = await api.detail({
          url: targetDetail
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
    console.error(`[API ERROR] Exception:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}