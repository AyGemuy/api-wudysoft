import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
console.log("HTML Source proxy:", proxy);
class MissAV {
  constructor() {
    this.baseUrl = "https://missav.ws";
    this.cdnUrl = "https://fourhoi.com";
    this.recombeeBaseUri = "https://client-rapi-missav.recombee.com";
    this.recombeeDb = "missav-default";
    this.recombeeToken = "Ikkg568nlM51RHvldlPvc2GzZPE9R4XGzaH9Qj4zK9npbbbTly1gj9K4mgRn0QlV";
    this.htmlProxy = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      Referer: "https://missav.ws/",
      Origin: "https://missav.ws",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    };
  }
  _clean(text) {
    try {
      return (text || "").replace(/\s+/g, " ").trim();
    } catch {
      return "";
    }
  }
  _toSnakeCase(text) {
    try {
      return (text || "").replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s\-:.]+/g, "_").toLowerCase().replace(/[^a-z0-9_]/g, "").replace(/^_+|_+$/g, "");
    } catch {
      return "";
    }
  }
  _extractSlug(url) {
    try {
      if (!url) return "";
      let slug = url.replace(this.baseUrl, "").replace(/^\/+/, "").replace(/\/$/, "");
      if (slug.startsWith("http")) {
        try {
          slug = new URL(url).pathname.replace(/^\/+/, "").replace(/\/$/, "");
        } catch {
          slug = url.split("/").filter(Boolean).pop() || "";
        }
      }
      return slug.replace(/^dm\d+\/?/, "").replace(/^(id|en|ja|cn|ko|ms|th|de|fr|vi|fil|pt)\/?/, "") || "";
    } catch {
      return "";
    }
  }
  _extractMetaTags($) {
    try {
      const meta = {};
      $("meta").map((_, el) => {
        try {
          const rawKey = $(el).attr("name") || $(el).attr("property") || "";
          const value = $(el).attr("content") || "";
          if (rawKey && value) {
            const k = this._toSnakeCase(rawKey.replace(/^(og|twitter):/, ""));
            meta[k] = meta[k] ? Array.isArray(meta[k]) ? [...meta[k], value] : [meta[k], value] : value;
          }
        } catch {}
      }).get();
      return meta;
    } catch {
      return {};
    }
  }
  _unpackJs(packed) {
    try {
      const match = packed.match(/eval\(function\((?:p,a,c,k,e,d|p,a,c,k,e,r)\)[\s\S]*?\}\(([\s\S]*?)\)\)/);
      if (!match) return "";
      const args = match[1].match(/^'([\s\S]*)',\s*(\d+),\s*(\d+),\s*'([\s\S]*)'\.split\('\|'\),\s*(\d+),\s*(\{.*\})/);
      if (!args) {
        return Function(`return (function(p,a,c,k,e,d){
          e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};
          if(!''.replace(/^/,String)){while(c--){d[e(c)]=k[c]||e(c)}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};
          while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}
          return p;
        }(${match[1]}))`)();
      }
      let [, p, a, c, k] = args;
      a = parseInt(a, 10);
      c = parseInt(c, 10);
      const dict = {},
        kArr = k.split("|");
      const e = val => (val < a ? "" : e(Math.floor(val / a))) + ((val %= a) > 35 ? String.fromCharCode(val + 29) : val.toString(36));
      while (c--) dict[e(c)] = kArr[c] || e(c);
      return p.replace(/\b\w+\b/g, m => dict[m] || m);
    } catch {
      return "";
    }
  }
  _extractStreams($) {
    try {
      const streamMap = new Map();
      let masterPlaylist = null;
      const seekThumbnails = [];
      $("script").map((_, el) => {
        try {
          const rawCode = $(el).html() || "";
          if (rawCode.includes("eval(function(p,a,c,k,e,d)") || rawCode.includes(".m3u8")) {
            const code = rawCode.includes("eval(") ? this._unpackJs(rawCode) : rawCode;
            const varMatches = [...code.matchAll(/(?:var|let|const)?\s*([a-zA-Z0-9_$]+)\s*=\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/gi)];
            varMatches.map(([, varName, url]) => {
              try {
                const labelMatch = url.match(/\/(\d+p)\//i) || varName.match(/(\d+)/) || url.match(/(playlist)/i);
                const label = labelMatch ? labelMatch[1].endsWith("p") ? labelMatch[1] : `${labelMatch[1]}p` : varName;
                const cleanKey = this._toSnakeCase(label);
                if (!streamMap.has(url)) {
                  streamMap.set(url, {
                    quality: label,
                    key: cleanKey,
                    url: url
                  });
                }
                if (!masterPlaylist || cleanKey.includes("playlist") || cleanKey.includes("auto")) {
                  masterPlaylist = url;
                }
              } catch {}
            });
            const allM3u8 = code.match(/https?:\/\/[^\s'"\\]+\.m3u8[^\s'"\\]*/g) || [];
            allM3u8.map(url => {
              try {
                const label = url.match(/\/(\d+p)\//i)?.[1] || (url.includes("playlist") ? "auto" : "default");
                const cleanKey = this._toSnakeCase(label);
                if (!streamMap.has(url)) {
                  streamMap.set(url, {
                    quality: label,
                    key: cleanKey,
                    url: url
                  });
                }
                if (!masterPlaylist) masterPlaylist = url;
              } catch {}
            });
          }
          if (rawCode.includes("seek") || rawCode.includes("urls:")) {
            const urlsMatch = rawCode.match(/urls:\s*(\[[^\]]+\])/i) || rawCode.match(/(\["https?:\\\/\\\/[^\]]+seek[^\]]+"\])/i);
            if (urlsMatch) {
              try {
                const parsed = JSON.parse(urlsMatch[1].replace(/\\/g, ""));
                if (Array.isArray(parsed) && parsed.length) {
                  seekThumbnails.push(...parsed);
                }
              } catch {}
            }
          }
        } catch {}
      }).get();
      const sources = Array.from(streamMap.values());
      return {
        master_playlist: masterPlaylist || (sources[0]?.url || null),
        sources: sources,
        seek_thumbnails: Array.from(new Set(seekThumbnails))
      };
    } catch {
      return {
        master_playlist: null,
        sources: [],
        seek_thumbnails: []
      };
    }
  }
  _signRecombeeUrl(path) {
    try {
      const ts = Math.floor(Date.now() / 1e3);
      const fullPath = `/${this.recombeeDb}${path}${path.includes("?") ? "&" : "?"}frontend_timestamp=${ts}`;
      const sign = crypto.createHmac("sha1", this.recombeeToken).update(fullPath).digest("hex");
      return `${this.recombeeBaseUri}${fullPath}&frontend_sign=${sign}`;
    } catch (e) {
      console.warn("[WARN] Failed to sign Recombee URL:", e.message);
      return `${this.recombeeBaseUri}/${this.recombeeDb}${path}`;
    }
  }
  _parseVideoItem($, el) {
    try {
      const $el = $(el);
      const linkEl = $el.find("a").first();
      const link = linkEl.attr("href") || "";
      const title = this._clean($el.find(".my-2.text-sm a, a.text-secondary").first().text()) || $el.find("img").attr("alt") || "";
      const poster = $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";
      const preview = $el.find("video").attr("data-src") || "";
      const duration = this._clean($el.find(".absolute.bottom-1.right-1 span").text());
      const slug = this._extractSlug(link);
      const code = (linkEl.attr("alt") || title.match(/^([a-zA-Z0-9_-]+)/)?.[1] || slug).toUpperCase();
      return {
        code: code,
        title: title,
        url: link.startsWith("http") ? link : `${this.baseUrl}${link.startsWith("/") ? "" : "/"}${link}`,
        slug: slug,
        poster: poster.startsWith("data:") ? `${this.cdnUrl}/${slug}/cover-t.jpg` : poster,
        preview_video: preview || `${this.cdnUrl}/${slug}/preview.mp4`,
        duration: duration,
        badges: {
          is_uncensored: $el.find("span:contains('Tanpa sensor'), span:contains('Uncensored')").length > 0 || title.toLowerCase().includes("uncensored"),
          has_chinese_sub: $el.find("span:contains('subjudul Cina'), span:contains('Chinese')").length > 0,
          has_english_sub: $el.find("span:contains('Subtitle bahasa inggris'), span:contains('English')").length > 0
        }
      };
    } catch {
      return {
        code: "",
        title: "",
        url: "",
        slug: "",
        poster: "",
        preview_video: "",
        duration: "",
        badges: {}
      };
    }
  }
  _parsePagination($, defaultPage = 1) {
    try {
      const nav = $("nav");
      const currentVal = nav.find("input[name='page']").val() || nav.find("span[aria-current='page']").text().trim();
      const totalMatch = nav.text().match(/\/\s*(\d+)/);
      const current = parseInt(currentVal, 10) || defaultPage;
      const total = totalMatch ? parseInt(totalMatch[1], 10) : current;
      return {
        current_page: current,
        total_pages: total,
        has_prev_page: !!nav.find("a[rel='prev']").length,
        has_next_page: !!nav.find("a[rel='next']").length,
        prev_page_url: nav.find("a[rel='prev']").attr("href") || null,
        next_page_url: nav.find("a[rel='next']").attr("href") || null
      };
    } catch {
      return {
        current_page: defaultPage,
        total_pages: defaultPage,
        has_prev_page: false,
        has_next_page: false,
        prev_page_url: null,
        next_page_url: null
      };
    }
  }
  async reqHtml(url) {
    try {
      const target = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
      const finalUrl = `${this.htmlProxy}${encodeURIComponent(target)}`;
      console.log(`[LOG] Fetching HTML via proxy: ${target}`);
      const response = await axios.get(finalUrl, {
        headers: this.headers,
        timeout: 6e4
      });
      let rawHtml = response.data;
      if (typeof rawHtml === "object" && rawHtml !== null) {
        rawHtml = rawHtml.result || rawHtml.data || rawHtml.html || rawHtml.content || JSON.stringify(rawHtml);
      }
      return cheerio.load(rawHtml || "");
    } catch (error) {
      console.error(`[ERROR] Request HTML Failed [${url}]: ${error.message}`);
      throw new Error(`Failed to fetch HTML from ${url}: ${error.message}`);
    }
  }
  async reqApi(url, method = "POST", data = null) {
    try {
      console.log(`[LOG] Fetching Direct API: ${url} (${method})`);
      const config = {
        method: method,
        url: url,
        timeout: 2e4,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: this.baseUrl,
          Referer: `${this.baseUrl}/`
        }
      };
      if (data) {
        config.data = typeof data === "object" ? JSON.stringify(data) : data;
      }
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`[ERROR] Direct API Failed [${url}]: ${error.message}`);
      throw error;
    }
  }
  async home({
    locale = "en"
  }) {
    try {
      const $ = await this.reqHtml(`/${locale}`);
      const sections = $(".sm\\:container.mx-auto.mb-5").map((_, sec) => {
        try {
          const title = this._clean($(sec).find("h2").text());
          const items = $(sec).find(".thumbnail.group").map((__, el) => this._parseVideoItem($, el)).get().filter(i => i.title);
          return title && items.length ? {
            title: title,
            key: this._toSnakeCase(title),
            items: items
          } : null;
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      return {
        locale: locale,
        total_sections: sections.length,
        sections: sections
      };
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {
        locale: locale,
        total_sections: 0,
        sections: [],
        error: error.message
      };
    }
  }
  async listVideos({
    type = "new",
    locale = "en",
    page = 1
  }) {
    try {
      const target = `/${locale}/${type}${page > 1 ? `?page=${page}` : ""}`;
      const $ = await this.reqHtml(target);
      const items = $(".grid .thumbnail.group, .grid > div").map((_, el) => this._parseVideoItem($, el)).get().filter(i => i.title || i.slug);
      return {
        type: type,
        locale: locale,
        page: parseInt(page, 10) || 1,
        total_items: items.length,
        items: items,
        pagination: this._parsePagination($, page)
      };
    } catch (error) {
      console.error(`[ERROR] ListVideos [${type}]:`, error.message);
      return {
        type: type,
        locale: locale,
        page: 1,
        total_items: 0,
        items: [],
        pagination: {},
        error: error.message
      };
    }
  }
  async search({
    keyword,
    locale = "en",
    page = 1
  }) {
    try {
      if (!keyword) throw new Error("Keyword is required");
      const cleanKeyword = keyword.trim().replace(/\\/g, "");
      const target = `/${locale}/search/${encodeURIComponent(cleanKeyword)}${page > 1 ? `?page=${page}` : ""}`;
      const $ = await this.reqHtml(target);
      const items = $(".thumbnail.group, .grid > div").map((_, el) => this._parseVideoItem($, el)).get().filter(i => i.title && i.slug);
      return {
        keyword: cleanKeyword,
        locale: locale,
        page: parseInt(page, 10) || 1,
        total_results: items.length,
        items: items,
        pagination: this._parsePagination($, page)
      };
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        keyword: keyword,
        locale: locale,
        page: 1,
        total_results: 0,
        items: [],
        pagination: {},
        error: error.message
      };
    }
  }
  async detail({
    url,
    locale = "en"
  }) {
    try {
      if (!url) throw new Error("URL/Slug is required");
      const cleanSlug = this._extractSlug(url);
      const target = cleanSlug.startsWith("http") ? cleanSlug : `/${locale}/${cleanSlug}`;
      const $ = await this.reqHtml(target);
      const title = this._clean($("h1.text-base, h1.text-nord6").first().text()) || $("title").text().trim();
      const metaTags = this._extractMetaTags($);
      const metadata = {};
      $(".text-secondary").map((_, el) => {
        try {
          const rawKey = $(el).find("span").first().text().replace(":", "");
          const k = this._toSnakeCase(rawKey);
          const v = this._clean($(el).clone().find("span").first().remove().end().text());
          if (k && v) metadata[k] = v;
        } catch {}
      }).get();
      const genres = $(".text-secondary a[href*='/genres/']").map((_, a) => {
        try {
          return {
            name: $(a).text().trim(),
            url: $(a).attr("href") || "",
            slug: this._extractSlug($(a).attr("href"))
          };
        } catch {
          return null;
        }
      }).get().filter(g => g && g.name);
      const actresses = $(".text-secondary a[href*='/actresses/']").map((_, a) => {
        try {
          return {
            name: $(a).text().trim(),
            url: $(a).attr("href") || "",
            slug: this._extractSlug($(a).attr("href"))
          };
        } catch {
          return null;
        }
      }).get().filter(a => a && a.name);
      const makerEl = $(".text-secondary a[href*='/makers/']").first();
      const directorEl = $(".text-secondary a[href*='/directors/']").first();
      const labelEl = $(".text-secondary a[href*='/labels/']").first();
      const streamData = this._extractStreams($);
      let related = $(".thumbnail.group").map((_, el) => this._parseVideoItem($, el)).get().filter(i => i.title && i.slug !== cleanSlug);
      if (!related.length) {
        try {
          const recRes = await this.recommendItemsToItem({
            dvd_id: cleanSlug,
            count: 16,
            locale: locale
          });
          if (recRes && recRes.recomms) {
            related = recRes.recomms.map(r => {
              try {
                const vals = r.values || {};
                const dId = r.id;
                const rTitle = vals[`title_${locale}`] || vals.title || dId;
                return {
                  code: dId.toUpperCase(),
                  title: rTitle,
                  url: `${this.baseUrl}/${locale}/${dId}`,
                  slug: dId,
                  poster: `${this.cdnUrl}/${dId}/cover-t.jpg`,
                  preview_video: `${this.cdnUrl}/${dId}/preview.mp4`,
                  duration: vals.duration ? `${Math.floor(vals.duration / 3600)}:${Math.floor(vals.duration % 3600 / 60).toString().padStart(2, "0")}:${(vals.duration % 60).toString().padStart(2, "0")}` : "",
                  badges: {
                    is_uncensored: !!vals.is_uncensored_leak,
                    has_chinese_sub: !!vals.has_chinese_subtitle,
                    has_english_sub: !!vals.has_english_subtitle
                  }
                };
              } catch {
                return null;
              }
            }).filter(Boolean);
          }
        } catch (e) {
          console.warn("[WARN] Recombee direct recommendation fallback skipped:", e.message);
        }
      }
      return {
        code: metadata.code || metadata.kode || cleanSlug.toUpperCase(),
        slug: cleanSlug,
        title: title,
        cover: metaTags.image || `${this.cdnUrl}/${cleanSlug}/cover-n.jpg`,
        poster_thumb: `${this.cdnUrl}/${cleanSlug}/cover-t.jpg`,
        preview_video: `${this.cdnUrl}/${cleanSlug}/preview.mp4`,
        release_date: metadata.release_date || metadata.tanggal_rilis || metaTags.video_release_date || "",
        duration: metadata.duration || metadata.durasi || metaTags.video_duration || "",
        director: directorEl.text().trim() || metadata.director || metadata.direktur || metaTags.video_director || "",
        maker: makerEl.length ? {
          name: makerEl.text().trim(),
          url: makerEl.attr("href") || "",
          slug: this._extractSlug(makerEl.attr("href"))
        } : null,
        label: labelEl.length ? labelEl.text().trim() : metadata.label || "",
        genres: genres,
        actresses: actresses,
        metadata: metadata,
        streams: streamData,
        related: related,
        meta_tags: metaTags
      };
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      throw error;
    }
  }
  async genreList({
    locale = "en",
    page = 1
  }) {
    try {
      const $ = await this.reqHtml(`/${locale}/genres${page > 1 ? `?page=${page}` : ""}`);
      const items = $(".grid > div").map((_, el) => {
        try {
          const a = $(el).find("a.text-nord13").first();
          const name = this._clean(a.text());
          const count = parseInt(this._clean($(el).find(".text-nord10").text()).replace(/[^\d]/g, ""), 10) || 0;
          return name ? {
            name: name,
            url: a.attr("href") || "",
            slug: this._extractSlug(a.attr("href")),
            count: count
          } : null;
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      return {
        locale: locale,
        page: parseInt(page, 10) || 1,
        total_items: items.length,
        items: items,
        pagination: this._parsePagination($, page)
      };
    } catch (error) {
      console.error("[ERROR] GenreList:", error.message);
      return {
        locale: locale,
        page: 1,
        total_items: 0,
        items: [],
        pagination: {},
        error: error.message
      };
    }
  }
  async actressList({
    locale = "en",
    page = 1,
    ranking = false
  }) {
    try {
      const $ = await this.reqHtml(`/${locale}/actresses${ranking ? "/ranking" : ""}${page > 1 ? `?page=${page}` : ""}`);
      const items = $(".grid > div").map((_, el) => {
        try {
          const a = $(el).find("a").first();
          const name = this._clean($(el).find("h4, .text-nord4, a").last().text());
          const avatar = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
          return name ? {
            name: name,
            url: a.attr("href") || "",
            slug: this._extractSlug(a.attr("href")),
            avatar: avatar.startsWith("data:") ? "" : avatar
          } : null;
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      return {
        locale: locale,
        is_ranking: !!ranking,
        page: parseInt(page, 10) || 1,
        total_items: items.length,
        items: items,
        pagination: this._parsePagination($, page)
      };
    } catch (error) {
      console.error("[ERROR] ActressList:", error.message);
      return {
        locale: locale,
        page: 1,
        total_items: 0,
        items: [],
        pagination: {},
        error: error.message
      };
    }
  }
  async makerList({
    locale = "en",
    page = 1
  }) {
    try {
      const $ = await this.reqHtml(`/${locale}/makers${page > 1 ? `?page=${page}` : ""}`);
      const items = $(".grid > div").map((_, el) => {
        try {
          const a = $(el).find("a.text-nord13, a").first();
          const name = this._clean(a.text());
          const count = parseInt(this._clean($(el).find(".text-nord10").text()).replace(/[^\d]/g, ""), 10) || 0;
          return name ? {
            name: name,
            url: a.attr("href") || "",
            slug: this._extractSlug(a.attr("href")),
            count: count
          } : null;
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      return {
        locale: locale,
        page: parseInt(page, 10) || 1,
        total_items: items.length,
        items: items,
        pagination: this._parsePagination($, page)
      };
    } catch (error) {
      console.error("[ERROR] MakerList:", error.message);
      return {
        locale: locale,
        page: 1,
        total_items: 0,
        items: [],
        pagination: {},
        error: error.message
      };
    }
  }
  async categoryDetail({
    category = "genres",
    slug,
    locale = "en",
    page = 1
  }) {
    try {
      if (!slug) throw new Error("Slug is required");
      const target = `/${locale}/${category}/${encodeURIComponent(slug)}${page > 1 ? `?page=${page}` : ""}`;
      const $ = await this.reqHtml(target);
      const title = this._clean($("h1").first().text()) || slug;
      const items = $(".grid .thumbnail.group, .grid > div").map((_, el) => this._parseVideoItem($, el)).get().filter(i => i.title || i.slug);
      return {
        category: category,
        slug: slug,
        title: title,
        locale: locale,
        page: parseInt(page, 10) || 1,
        total_items: items.length,
        items: items,
        pagination: this._parsePagination($, page)
      };
    } catch (error) {
      console.error(`[ERROR] CategoryDetail [${category}/${slug}]:`, error.message);
      return {
        category: category,
        slug: slug,
        locale: locale,
        page: 1,
        total_items: 0,
        items: [],
        pagination: {},
        error: error.message
      };
    }
  }
  async random({
    locale = "en"
  }) {
    try {
      const randNum = Math.floor(Math.random() * 99) + 2;
      const $ = await this.reqHtml(`/random/${randNum}`);
      const items = $("div").map((_, el) => this._parseVideoItem($, el)).get().filter(i => i.title && i.slug);
      return {
        locale: locale,
        random_seed: randNum,
        total_items: items.length,
        items: items
      };
    } catch (error) {
      console.error("[ERROR] Random:", error.message);
      return {
        locale: locale,
        total_items: 0,
        items: [],
        error: error.message
      };
    }
  }
  async recommendItemsToItem({
    dvd_id,
    user_id = null,
    count = 16,
    scenario = "mobile-watch-next",
    locale = "en"
  }) {
    try {
      const targetDvdId = dvd_id;
      if (!targetDvdId) throw new Error("dvd_id is required");
      const titleField = locale === "ja" ? "title" : `title_${locale}`;
      const signedUrl = this._signRecombeeUrl("/batch/");
      const body = {
        requests: [{
          method: "POST",
          path: `/recomms/items/${encodeURIComponent(targetDvdId)}/items/`,
          params: {
            targetUserId: user_id || crypto.randomUUID(),
            count: parseInt(count, 10) || 16,
            scenario: scenario,
            returnProperties: true,
            includedProperties: [titleField, "title_id", "title_en", "title", "duration", "has_chinese_subtitle", "has_english_subtitle", "is_uncensored_leak", "dm"],
            cascadeCreate: true
          }
        }],
        distinctRecomms: true
      };
      const res = await this.reqApi(signedUrl, "POST", body);
      if (Array.isArray(res) && res[0]?.json) {
        return res[0].json;
      }
      return res || {
        recomms: []
      };
    } catch (error) {
      console.warn("[WARN] Recombee direct fetch error:", error.message);
      return {
        recomms: [],
        error: error.message
      };
    }
  }
  async recommendNextItems({
    recomm_id,
    count = 8
  }) {
    try {
      if (!recomm_id) throw new Error("recomm_id is required");
      const signedUrl = this._signRecombeeUrl(`/recomms/next/items/${encodeURIComponent(recomm_id)}`);
      return await this.reqApi(signedUrl, "POST", {
        count: parseInt(count, 10) || 8,
        cascadeCreate: true
      });
    } catch (error) {
      console.error("[ERROR] RecommendNextItems:", error.message);
      return {
        recomm_id: recomm_id,
        recomms: [],
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const normalizedParams = {
    ...params,
    dvd_id: params.dvd_id || params.dvdId,
    recomm_id: params.recomm_id || params.recommId,
    user_id: params.user_id || params.userId
  };
  const validActions = ["home", "recent_update", "new_releases", "uncensored_leak", "english_subtitle", "today_hot", "weekly_hot", "monthly_hot", "search", "detail", "genre_list", "actress_list", "maker_list", "category_detail", "random", "studio_videos", "recombee_item", "recombee_next"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&keyword=ssis"
      }
    });
  }
  const api = new MissAV();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(normalizedParams);
        break;
      case "recent_update":
        response = await api.listVideos({
          type: "new",
          ...normalizedParams
        });
        break;
      case "new_releases":
        response = await api.listVideos({
          type: "release",
          ...normalizedParams
        });
        break;
      case "uncensored_leak":
        response = await api.listVideos({
          type: "uncensored-leak",
          ...normalizedParams
        });
        break;
      case "english_subtitle":
        response = await api.listVideos({
          type: "english-subtitle",
          ...normalizedParams
        });
        break;
      case "today_hot":
        response = await api.listVideos({
          type: "today-hot",
          ...normalizedParams
        });
        break;
      case "weekly_hot":
        response = await api.listVideos({
          type: "weekly-hot",
          ...normalizedParams
        });
        break;
      case "monthly_hot":
        response = await api.listVideos({
          type: "monthly-hot",
          ...normalizedParams
        });
        break;
      case "studio_videos":
        if (!normalizedParams.type) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'type' studio (fc2, heyzo, tokyohot, 1pondo, caribbeancom, madou, siro, luxu, dll.) wajib diisi."
          });
        }
        response = await api.listVideos(normalizedParams);
        break;
      case "search":
        if (!normalizedParams.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(normalizedParams);
        break;
      case "detail":
        if (!normalizedParams.url && !normalizedParams.dvd_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau slug/dvd_id (contoh: nhdtc-233-uncensored-leak) wajib diisi."
          });
        }
        response = await api.detail({
          url: normalizedParams.url || normalizedParams.dvd_id,
          ...normalizedParams
        });
        break;
      case "genre_list":
        response = await api.genreList(normalizedParams);
        break;
      case "actress_list":
        response = await api.actressList(normalizedParams);
        break;
      case "maker_list":
        response = await api.makerList(normalizedParams);
        break;
      case "category_detail":
        if (!normalizedParams.category || !normalizedParams.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'category' (genres/actresses/makers/directors/labels) dan 'slug' wajib diisi."
          });
        }
        response = await api.categoryDetail(normalizedParams);
        break;
      case "random":
        response = await api.random(normalizedParams);
        break;
      case "recombee_item":
        if (!normalizedParams.dvd_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'dvd_id' wajib diisi."
          });
        }
        response = await api.recommendItemsToItem(normalizedParams);
        break;
      case "recombee_next":
        if (!normalizedParams.recomm_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'recomm_id' wajib diisi."
          });
        }
        response = await api.recommendNextItems(normalizedParams);
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