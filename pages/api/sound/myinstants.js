import axios from "axios";
import * as cheerio from "cheerio";
class MyInstants {
  constructor() {
    this.baseUrl = "https://www.myinstants.com";
    this.cli = axios.create({
      baseURL: this.baseUrl,
      timeout: 3e4,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  abs(path) {
    if (!path || typeof path !== "string") return null;
    const clean = path.trim();
    if (!clean) return null;
    return clean.startsWith("http://") || clean.startsWith("https://") ? clean : `${this.baseUrl}${clean.startsWith("/") ? clean : `/${clean}`}`;
  }
  async get(url, params = {}) {
    try {
      console.log(`[HTTP GET] -> ${url}`);
      const res = await this.cli.get(url, {
        params: params
      });
      return res?.data || "";
    } catch (err) {
      console.error(`[HTTP ERROR] ${url} -> ${err?.message || "Request failed"}`);
      throw err;
    }
  }
  parseCard(_, el) {
    const title = _(el).find("a.instant-link")?.text()?.trim() || null;
    const href = _(el).find("a.instant-link")?.attr("href") || null;
    const slug = href ? href.replace(/^\/en\/instant\/|\/$/g, "") : null;
    const playAttr = _(el).find("button.small-button")?.attr("onclick") || "";
    const soundMatch = playAttr.match(/play\('([^']+)'/);
    const soundSrc = soundMatch ? soundMatch[1] : null;
    const favAttr = _(el).find('button[onclick*="favorite"]')?.attr("onclick") || "";
    const idMatch = favAttr.match(/favorite\('([^']+)'\)/);
    const soundId = idMatch ? idMatch[1] : null;
    const bgStyle = _(el).find(".circle.small-button-background")?.attr("style") || "";
    const colorMatch = bgStyle.match(/background-color:\s*([^;]+)/i);
    const color = colorMatch ? colorMatch[1].trim() : null;
    const loaderId = _(el).find(".loader")?.attr("id") || null;
    return {
      id: soundId || null,
      title: title || "",
      slug: slug || null,
      color: color || null,
      loader_id: loaderId || null,
      url: href ? this.abs(href) : null,
      sound_url: soundSrc ? this.abs(soundSrc) : null
    };
  }
  parseList(html) {
    const _ = cheerio.load(html || "");
    return _(".instants .instant").map((i, el) => this.parseCard(_, el)).get().filter(item => Boolean(item?.title && item?.sound_url));
  }
  async home({
    page,
    country = "id",
    ...rest
  } = {}) {
    try {
      const p = page ? Number(page) : 1;
      const c = country ? country.toString().trim().toLowerCase() : "id";
      const endpoint = p > 1 ? `/en/index/${c}/?page=${p}` : `/en/index/${c}/`;
      console.log(`[PROCESS] Fetching Home (Country: ${c}, Page: ${p})`);
      const html = await this.get(endpoint, rest);
      const sounds = this.parseList(html);
      return {
        status: true,
        result: {
          country: c,
          page: p,
          total_results: sounds?.length || 0,
          sounds: sounds || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] home(): ${err?.message || "Error fetching home"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to fetch home list"
        }
      };
    }
  }
  async trending({
    page,
    country = "id",
    ...rest
  } = {}) {
    try {
      const p = page ? Number(page) : 1;
      const c = country ? country.toString().trim().toLowerCase() : "id";
      const endpoint = p > 1 ? `/en/trending/${c}/?page=${p}` : `/en/trending/${c}/`;
      console.log(`[PROCESS] Fetching Trending (Country: ${c}, Page: ${p})`);
      const html = await this.get(endpoint, rest);
      const sounds = this.parseList(html);
      return {
        status: true,
        result: {
          country: c,
          page: p,
          total_results: sounds?.length || 0,
          sounds: sounds || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] trending(): ${err?.message || "Error fetching trending"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to fetch trending sounds"
        }
      };
    }
  }
  async recent({
    page,
    ...rest
  } = {}) {
    try {
      const p = page ? Number(page) : 1;
      const endpoint = p > 1 ? `/en/recent/?page=${p}` : "/en/recent/";
      console.log(`[PROCESS] Fetching Recent/Just Added (Page: ${p})`);
      const html = await this.get(endpoint, rest);
      const sounds = this.parseList(html);
      return {
        status: true,
        result: {
          page: p,
          total_results: sounds?.length || 0,
          sounds: sounds || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] recent(): ${err?.message || "Error fetching recent"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to fetch recent sounds"
        }
      };
    }
  }
  async categories() {
    try {
      console.log("[PROCESS] Fetching Categories list");
      const html = await this.get("/en/index/id/");
      const _ = cheerio.load(html || "");
      const categories = _('ul.dropdown-menu a[href*="/categories/"]').map((i, el) => {
        const name = _(el).text().trim() || "";
        const href = _(el).attr("href") || "";
        const slug = href ? decodeURIComponent(href.replace(/^\/en\/categories\/|\/$/g, "")) : "";
        return {
          name: name,
          slug: slug,
          url: href ? this.abs(href) : null
        };
      }).get().filter(cat => Boolean(cat?.name && cat?.slug));
      return {
        status: true,
        result: {
          total_categories: categories?.length || 0,
          categories: categories || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] categories(): ${err?.message || "Error fetching categories"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to fetch categories"
        }
      };
    }
  }
  async category({
    category,
    slug,
    page,
    ...rest
  } = {}) {
    try {
      const targetCategory = category || slug || "";
      const catClean = targetCategory.toString().trim().toLowerCase();
      if (!catClean) {
        return {
          status: false,
          result: {
            error: 'Parameter "category" atau "slug" wajib diisi.'
          }
        };
      }
      const p = page ? Number(page) : 1;
      const encodedCat = encodeURIComponent(catClean);
      const endpoint = p > 1 ? `/en/categories/${encodedCat}/?page=${p}` : `/en/categories/${encodedCat}/`;
      console.log(`[PROCESS] Fetching Category: "${catClean}" (Page: ${p})`);
      const html = await this.get(endpoint, rest);
      const sounds = this.parseList(html);
      return {
        status: true,
        result: {
          category: catClean,
          page: p,
          total_results: sounds?.length || 0,
          sounds: sounds || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] category(): ${err?.message || "Error fetching category"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to fetch category sounds"
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
      const q = query ? query.toString().trim() : "";
      if (!q) {
        return {
          status: false,
          result: {
            error: 'Parameter "query" wajib diisi.'
          }
        };
      }
      const p = page ? Number(page) : 1;
      const params = {
        name: q,
        ...p > 1 ? {
          page: p
        } : {},
        ...rest
      };
      console.log(`[PROCESS] Searching: "${q}" (Page: ${p})`);
      const html = await this.get("/en/search/", params);
      const sounds = this.parseList(html);
      return {
        status: true,
        result: {
          query: q,
          page: p,
          total_results: sounds?.length || 0,
          sounds: sounds || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] search(): ${err?.message || "Error searching sounds"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to search sounds"
        }
      };
    }
  }
  async detail({
    url,
    ...rest
  } = {}) {
    try {
      const targetUrl = url ? url.toString().trim() : "";
      if (!targetUrl) {
        return {
          status: false,
          result: {
            error: 'Parameter "url" atau slug suara wajib diisi.'
          }
        };
      }
      const path = targetUrl.startsWith("http") ? targetUrl.replace(this.baseUrl, "") : targetUrl.startsWith("/") ? targetUrl : `/en/instant/${targetUrl}/`;
      console.log(`[PROCESS] Fetching Sound Detail: ${path}`);
      const html = await this.get(path, rest);
      const _ = cheerio.load(html || "");
      const title = _("#instant-page-title")?.text()?.trim() || null;
      if (!title) {
        return {
          status: false,
          result: {
            error: "Sound not found or invalid page structure."
          }
        };
      }
      const soundPath = _("#instant-page-button-element")?.attr("data-url") || _("a[download]")?.attr("href") || null;
      const addBtnHref = _('a[href*="/add/"]')?.attr("href") || "";
      const idMatch = addBtnHref.match(/\/add\/(\d+)\//);
      const soundId = idMatch ? idMatch[1] : null;
      const description = _("#instant-page-description p")?.text()?.trim() || null;
      const category = _('#breadcrumbs a[href*="/categories/"]')?.text()?.trim() || null;
      const tags = _("#instant-page-tags a").map((i, el) => _(el).text().replace(/^#/, "").trim()).get().filter(Boolean);
      const likesText = _("#instant-page-likes")?.text()?.trim() || "";
      const likesMatch = likesText.match(/([\d,]+)\s+users/i);
      const likes = likesMatch ? Number(likesMatch[1].replace(/,/g, "")) : 0;
      const uploaderBlock = _("#instant-page-likes").next("div");
      const uploaderText = uploaderBlock?.text()?.trim() || "";
      const uploaderName = uploaderBlock.find("a")?.text()?.trim() || null;
      const uploaderHref = uploaderBlock.find("a")?.attr("href") || null;
      const viewsMatch = uploaderText.match(/([\d,]+)\s+views/i);
      const views = viewsMatch ? Number(viewsMatch[1].replace(/,/g, "")) : 0;
      const bgStyle = _("#instant-page-button .large-button-background")?.attr("style") || "";
      const colorMatch = bgStyle.match(/background-color:\s*([^;]+)/i);
      const color = colorMatch ? colorMatch[1].trim() : null;
      const embedCode = _("#instant-embed")?.text()?.trim() || null;
      const recommendations = _("#recommendations .instant").map((i, el) => this.parseCard(_, el)).get().filter(item => Boolean(item?.title && item?.sound_url));
      const slug = path.replace(/^\/en\/instant\/|\/$/g, "");
      return {
        status: true,
        result: {
          id: soundId || null,
          title: title || "",
          slug: slug || null,
          url: this.abs(path),
          sound_url: soundPath ? this.abs(soundPath) : null,
          category: category || null,
          color: color || null,
          description: description || null,
          tags: tags || [],
          likes: likes || 0,
          views: views || 0,
          uploader: {
            name: uploaderName || null,
            profile_url: uploaderHref ? this.abs(uploaderHref) : null
          },
          embed_code: embedCode || null,
          recommendations: recommendations || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] detail(): ${err?.message || "Failed to fetch detail"}`);
      return {
        status: false,
        result: {
          error: err?.message || "Failed to fetch sound detail"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "trending", "recent", "categories", "category", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: ["/?action=home&page=1&country=id", "/?action=trending&page=1&country=id", "/?action=recent&page=1", "/?action=categories", "/?action=category&category=memes&page=1", "/?action=search&query=jokowi&page=1", "/?action=detail&url=jokowi-saya-akan-lawan-23091"]
      }
    });
  }
  const api = new MyInstants();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "recent":
        response = await api.recent(params);
        break;
      case "categories":
        response = await api.categories();
        break;
      case "category":
        if (!params.category && !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'category' atau 'slug' wajib diisi untuk action 'category'."
          });
        }
        response = await api.category(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        const soundUrl = params.url || params.slug || params.id;
        if (!soundUrl) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url', 'slug', atau 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail({
          url: soundUrl,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    if (!response || response.status === false || response.result?.error) {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.error || response?.error || "Gagal memproses permintaan"
      });
    }
    const formattedData = Array.isArray(response.result) ? {
      results: response.result
    } : typeof response.result === "object" && response.result !== null ? response.result : {
      result: response.result
    };
    return res.status(200).json({
      status: true,
      action: action,
      ...formattedData
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}