import axios from "axios";
import * as cheerio from "cheerio";
class BestHdWallpaper {
  constructor() {
    this.base = "https://www.besthdwallpaper.com";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "en-US,en;q=0.9",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });
  }
  fixUrl(path) {
    try {
      return path ? path.startsWith("http") ? path : `${this.base}${path.startsWith("/") ? "" : "/"}${path}` : "";
    } catch (err) {
      console.error(`[BHDW] Error fixing URL: ${err?.message || err}`);
      return path || "";
    }
  }
  getSlug(path) {
    try {
      if (!path) return "";
      return path.replace(/^https?:\/\/[^/]+\/?/, "").replace(/^\/+/, "");
    } catch (err) {
      console.error(`[BHDW] Error generating slug: ${err?.message || err}`);
      return "";
    }
  }
  async req(url, params = {}) {
    try {
      console.log(`[BHDW] Requesting URL: ${url}`);
      const {
        data
      } = await this.client.get(url, {
        params: params
      });
      return data;
    } catch (err) {
      console.error(`[BHDW] HTTP request failed (${url}): ${err?.message || err}`);
      throw err;
    }
  }
  parseList(_) {
    try {
      return _(".grid-item").map((i, el) => {
        const item = _(el);
        const link = item.find("a").first();
        const sources = item.find("picture source");
        const img = item.find("picture img");
        const info = item.find(".info");
        const cat = info.find("a");
        const btn = info.find("button");
        const titleP = info.find("p");
        const rawUrl = link.attr("href") || titleP.attr("data-href") || btn.attr("data-href") || "";
        const url = this.fixUrl(rawUrl);
        const slug = this.getSlug(rawUrl);
        const altText = img.attr("alt") || "";
        const titleText = btn.attr("data-title") || titleP.text().trim() || altText.replace(/\s+(download|wallpaper)$/i, "").trim() || "Untitled";
        const fullTitle = titleP.attr("title") || link.attr("title") || (altText.toLowerCase().includes("wallpaper") ? altText : null) || null;
        const qualityMatch = (fullTitle || altText || titleText || "").match(/\b(8K|6K|5K|4K|2K|FHD|HD|UHD)\b/i);
        const quality = qualityMatch ? qualityMatch[1].toUpperCase() : null;
        const idMatch = url ? url.match(/-(\d+)\.html/) : null;
        const id = btn.attr("data-id") || (idMatch ? idMatch[1] : null);
        const catHref = cat.attr("href") || "";
        const catIdMatch = catHref.match(/-ct_[^-]+-(\d+)/i) || catHref.match(/-(\d+)$/);
        const thumbSmall = sources.filter('[media*="992px"]').attr("srcset") || sources.first().attr("srcset") || "";
        const thumbMedium = sources.filter('[media*="768px"]').attr("srcset") || "";
        const thumbLarge = img.attr("src") || "";
        return {
          id: id || null,
          title: titleText,
          full_title: fullTitle || (quality ? `${titleText} ${quality} wallpaper` : titleText),
          quality: quality || null,
          slug: slug || "",
          url: url || "",
          thumbnail: thumbLarge || thumbSmall || "",
          thumbnails: {
            small: thumbSmall || null,
            medium: thumbMedium || null,
            large: thumbLarge || null
          },
          dimensions: {
            width: Number(img.attr("width")) || null,
            height: Number(img.attr("height")) || null
          },
          alt: altText || null,
          category: {
            id: catIdMatch ? catIdMatch[1] : null,
            name: cat.text().trim() || null,
            slug: this.getSlug(catHref),
            url: this.fixUrl(catHref)
          },
          is_premium: item.hasClass("premium") || btn.hasClass("btn-download-premium")
        };
      }).get();
    } catch (err) {
      console.error(`[BHDW] Error parsing wallpaper list: ${err?.message || err}`);
      return [];
    }
  }
  async home({
    type = "most-popular",
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[BHDW] Fetching home wallpapers (type: ${type}, page: ${page})...`);
      const targetUrl = page > 1 ? `/${type}-wallpapers/${page}` : type === "home" ? "/" : `/${type}-wallpapers`;
      const html = await this.req(targetUrl, rest);
      const _ = cheerio.load(html);
      const wallpapers = this.parseList(_);
      console.log(`[BHDW] Successfully fetched ${wallpapers.length} home wallpapers`);
      return {
        status: true,
        result: {
          page: Number(page) || 1,
          type: type || "most-popular",
          wallpapers: wallpapers || []
        }
      };
    } catch (err) {
      console.error(`[BHDW] Error fetching home: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Failed to fetch home wallpapers"
      };
    }
  }
  async search({
    query = "",
    page = 1,
    sort_by,
    color,
    license,
    ...rest
  } = {}) {
    try {
      if (!query) throw new Error("Search query is required");
      console.log(`[BHDW] Searching wallpapers for: "${query}" (page: ${page})...`);
      const params = {
        q: query,
        ...sort_by ? {
          sortby: sort_by
        } : {},
        ...color ? {
          color: color
        } : {},
        ...license ? {
          license: license
        } : {},
        ...rest
      };
      const targetUrl = page > 1 ? `/search/${page}` : "/search";
      const html = await this.req(targetUrl, params);
      const _ = cheerio.load(html);
      const wallpapers = this.parseList(_);
      console.log(`[BHDW] Successfully found ${wallpapers.length} search results for "${query}"`);
      return {
        status: true,
        result: {
          query: query || "",
          page: Number(page) || 1,
          wallpapers: wallpapers || []
        }
      };
    } catch (err) {
      console.error(`[BHDW] Error searching: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Failed to search wallpapers"
      };
    }
  }
  async detail({
    url = "",
    slug = "",
    ...rest
  } = {}) {
    try {
      const targetInput = url || slug || "";
      if (!targetInput) throw new Error("Wallpaper detail URL or slug is required");
      console.log(`[BHDW] Fetching wallpaper details for: ${targetInput}...`);
      const targetUrl = targetInput.startsWith("http") ? targetInput : this.fixUrl(targetInput);
      const html = await this.req(targetUrl, rest);
      const _ = cheerio.load(html);
      const title = _("h1 strong").first().text().replace(/\s+wallpaper$/i, "").trim() || _('meta[property="og:title"]').attr("content") || "";
      const description = _("figure figcaption").text().trim() || _('meta[name="description"]').attr("content") || "";
      const detailImg = _("figure img.wpdetail");
      const mainImage = detailImg.attr("src") || _('meta[property="og:image"]').attr("content") || "";
      const authorName = _(".bg-light h2 strong").text().trim() || null;
      const authorHref = _('.bg-light a[aria-label*="wallpapers"]').attr("href") || "";
      const authorUrl = this.fixUrl(authorHref);
      const authorSlug = this.getSlug(authorHref);
      const statsText = _(".bg-light").text() || "";
      const downloadsMatch = statsText.match(/(\d+[\d,]*)\s+Downloads/i);
      const viewsMatch = statsText.match(/(\d+[\d,]*)\s+Views/i);
      const dateMatch = statsText.match(/Date of upload\s*:\s*([^<\n]+)/i);
      const breadcrumbs = _(".breadcrumb a").map((i, el) => ({
        name: _(el).text().trim(),
        slug: this.getSlug(_(el).attr("href") || ""),
        url: this.fixUrl(_(el).attr("href") || "")
      })).get();
      const tags = _(".tags a").map((i, el) => ({
        name: _(el).text().trim(),
        slug: this.getSlug(_(el).attr("href") || ""),
        url: this.fixUrl(_(el).attr("href") || "")
      })).get();
      const resolutions = _("#WallpaperSizes a.resolution-btn").map((i, el) => {
        const btn = _(el);
        const downloadUrl = btn.attr("href") || "";
        return {
          quality: btn.find(".resolution-info strong").text().trim() || "",
          resolution: btn.find(".resolution-info small").text().trim() || "",
          size_id: btn.attr("data-sizeid") || null,
          download_url: downloadUrl || "",
          title: btn.attr("title") || ""
        };
      }).get();
      const related = this.parseList(_);
      console.log(`[BHDW] Successfully fetched details for: ${title}`);
      return {
        status: true,
        result: {
          id: detailImg.attr("data-id") || (targetUrl.match(/-(\d+)\.html/) ? targetUrl.match(/-(\d+)\.html/)[1] : null),
          title: title || "Untitled",
          slug: this.getSlug(targetUrl),
          url: targetUrl,
          description: description || null,
          image: mainImage || "",
          dimensions: {
            width: Number(detailImg.attr("width")) || null,
            height: Number(detailImg.attr("height")) || null
          },
          author: {
            name: authorName,
            slug: authorSlug || null,
            url: authorUrl || null
          },
          downloads_count: downloadsMatch ? downloadsMatch[1].replace(/,/g, "") : "0",
          views_count: viewsMatch ? viewsMatch[1].replace(/,/g, "") : "0",
          upload_date: dateMatch ? dateMatch[1].trim() : null,
          breadcrumbs: breadcrumbs || [],
          tags: tags || [],
          resolutions: resolutions || [],
          related: related || []
        }
      };
    } catch (err) {
      console.error(`[BHDW] Error fetching detail: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Failed to fetch wallpaper detail"
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
          home: "/?action=home&type=most-popular&page=1",
          search: "/?action=search&query=cyberpunk&page=1",
          detail: "/?action=detail&slug=creative/math-and-geometry-flat-lay-backdrop-with-calculator-graph-paper-and-dt_en-US-139115.html"
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
  const api = new BestHdWallpaper();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home({
          type: params.type || "most-popular",
          page: params.page ? Number(params.page) : 1,
          ...params
        });
        break;
      case "search":
        if (!params.query && !params.q && !params.title) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 'q' wajib diisi untuk search."
          });
        }
        response = await api.search({
          query: params.query || params.q || params.title,
          page: params.page ? Number(params.page) : 1,
          sort_by: params.sort_by || params.sortby || null,
          color: params.color || null,
          license: params.license || null,
          ...params
        });
        break;
      case "detail":
        if (!params.url && !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk detail."
          });
        }
        response = await api.detail({
          url: params.url || "",
          slug: params.slug || "",
          ...params
        });
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
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}