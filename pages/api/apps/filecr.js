import axios from "axios";
import * as cheerio from "cheerio";
class FileCR {
  constructor() {
    this.baseURL = "https://filecr.com";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.headers = {
      "User-Agent": this.userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: "https://filecr.com/"
    };
    this.axios = axios.create({
      headers: this.headers
    });
    console.log("[init] FileCR initialized successfully.");
  }
  async _req(url, customHeaders = {}) {
    console.log(`[_req] Fetching URL: ${url}`);
    try {
      const {
        data
      } = await this.axios.get(url, {
        headers: {
          ...this.headers,
          ...customHeaders
        }
      });
      return {
        status: true,
        result: data
      };
    } catch (err) {
      console.error(`[_req] Failed fetching URL: ${url}. Error: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  _snk(obj) {
    try {
      if (!obj || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(v => this._snk(v));
      const newObj = {};
      for (const [key, val] of Object.entries(obj)) {
        const snake = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        newObj[snake] = this._snk(val);
      }
      return newObj;
    } catch (err) {
      return obj;
    }
  }
  _card($, el) {
    try {
      const $card = $(el);
      const title = $card.find(".card_title__az7G7").text().trim();
      if (!title) return {};
      const link = $card.find(".card_title__az7G7").attr("href");
      const icon = $card.find(".card_icon__mmJ8V img").attr("src") || $card.find(".card_icon__mmJ8V img").attr("srcset")?.split(" ")[0] || null;
      const desc = $card.find(".card_desc__b66Ca").text().trim();
      const catName = $card.find(".card_category__4DBde").text().trim();
      const catLink = $card.find(".card_category__4DBde").attr("href");
      const sizeText = $card.find(".card_size__8bQyg").text().trim() || $card.find(".card_size__Th067").text().trim();
      const dlText = $card.find(".card_meta-text__KdSKY").text().trim();
      const ratingText = $card.find(".card_rating-text__SvgeU").text().trim();
      const badge = $card.find(".badge-latest").data("badge") || null;
      let size = null;
      if (sizeText) {
        const m = sizeText.match(/([\d.]+)\s*(\w+)/);
        if (m) size = {
          value: parseFloat(m[1]),
          unit: m[2]
        };
      }
      let downloads = null;
      if (dlText) downloads = parseInt(dlText.replace(/,/g, "")) || null;
      let rating = null;
      if (ratingText) rating = parseFloat(ratingText) || null;
      let slug = null;
      if (link) slug = link.split("/").filter(Boolean).pop();
      return {
        title: title,
        slug: slug,
        url: link ? this.baseURL + link : null,
        icon: icon,
        description: desc,
        category: {
          name: catName,
          slug: catLink ? catLink.split("/").filter(Boolean).pop() : null,
          url: catLink ? this.baseURL + catLink : null
        },
        size: size,
        downloads: downloads,
        rating: rating,
        badge: badge
      };
    } catch (err) {
      return {};
    }
  }
  _post(post, url) {
    try {
      const {
        categories,
        media_files,
        downloads,
        ...rest
      } = post;
      return {
        ...rest,
        categories: {
          primary: categories?.primary,
          subCategory: categories?.subCategory,
          category: categories?.category
        },
        media: {
          icon: media_files?.icon,
          feature: media_files?.feature,
          header: media_files?.header,
          screenshots: media_files?.screenshots || []
        },
        downloads: downloads?.map(d => ({
          ...d,
          links: d.links?.map(l => ({
            id: l.id,
            type: l.type,
            title: l.title,
            newTab: l.new_tab,
            size: l.size
          }))
        })) || [],
        url: url
      };
    } catch (err) {
      return {
        error: `Mapping error: ${err.message}`
      };
    }
  }
  async _api(linkId) {
    console.log(`[_api] Fetching download link for ID: ${linkId}`);
    const fakePageId = Math.floor(1e11 + Math.random() * 9e11);
    const apiHeaders = {
      Accept: "application/json, text/plain, */*",
      Referer: `${this.baseURL}/file-download/?id=${fakePageId}`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    const apiUrl = `${this.baseURL}/api/actions/downloadlink/?id=${linkId}`;
    const reqRes = await this._req(apiUrl, apiHeaders);
    if (reqRes.status && reqRes.result) {
      return {
        status: true,
        result: {
          ...reqRes.result
        }
      };
    }
    return {
      status: false,
      result: {
        error: reqRes.result?.error || "Gagal mendapatkan data dari API"
      }
    };
  }
  _extUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        return {
          categorySlug: pathParts[0],
          slug: pathParts.slice(1).join("/")
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }
  async home({
    category = null,
    page = 1
  }) {
    try {
      const url = category ? page > 1 ? `${this.baseURL}/${category}/page/${page}/` : `${this.baseURL}/${category}/` : page > 1 ? `${this.baseURL}/page/${page}/` : this.baseURL;
      const {
        status,
        result: html
      } = await this._req(url);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      const products = $(".card_wrap__S35wt, .card_card__Ik6jQ").get().map(el => {
        const prod = this._card($, el);
        return prod.title ? prod : null;
      }).filter(Boolean);
      return {
        status: true,
        result: this._snk({
          products: products,
          total: products.length,
          page: page,
          category: category
        })
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async search({
    query,
    page = 1,
    limit = null,
    detail = false,
    download = false,
    version = "all"
  }) {
    try {
      if (!query) return {
        status: false,
        result: {
          error: 'Parameter "query" wajib'
        }
      };
      const url = `${this.baseURL}/search?q=${encodeURIComponent(query)}&page=${page}`;
      const {
        status,
        result: html
      } = await this._req(url);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      let products = $(".card_wrap__S35wt, .card_card__Ik6jQ").get().map(el => {
        const prod = this._card($, el);
        return prod.title ? prod : null;
      }).filter(Boolean);
      if (limit) products = products.slice(0, limit);
      if (detail || download) {
        for (const prod of products) {
          if (prod.slug && prod.category?.slug) {
            const detailRes = await this.detail({
              slug: prod.slug,
              categorySlug: prod.category.slug,
              download: download,
              version: version,
              _internalRaw: true
            });
            if (detailRes.status) prod.detail_data = detailRes.result;
          }
        }
      }
      const nextLink = $("a.next, .pagination .next");
      return {
        status: true,
        result: this._snk({
          products: products,
          query: query,
          page: page,
          nextPage: nextLink.length ? page + 1 : null
        })
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async detail({
    url = null,
    slug = null,
    categorySlug = null,
    download = false,
    version = "all",
    _internalRaw = false
  }) {
    try {
      let detailUrl = url;
      if (detailUrl) {
        const extracted = this._extUrl(detailUrl);
        if (extracted) {
          categorySlug = extracted.categorySlug;
          slug = extracted.slug;
        } else {
          return {
            status: false,
            result: {
              error: "URL tidak valid"
            }
          };
        }
      }
      if (!detailUrl) {
        if (!slug) return {
          status: false,
          result: {
            error: 'Parameter "slug" wajib'
          }
        };
        if (!categorySlug) {
          const searchRes = await this.search({
            query: slug,
            page: 1
          });
          if (searchRes.status && searchRes.result.products?.length) {
            for (const p of searchRes.result.products) {
              if (p.slug === slug && p.category?.slug) {
                categorySlug = p.category.slug;
                break;
              }
            }
          }
          if (!categorySlug) return {
            status: false,
            result: {
              error: "CategorySlug tidak ditemukan"
            }
          };
        }
        detailUrl = `${this.baseURL}/${categorySlug}/${slug}/`;
      }
      const {
        status,
        result: html
      } = await this._req(detailUrl);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      const nextData = $("script#__NEXT_DATA__").html();
      if (nextData) {
        const json = JSON.parse(nextData);
        const post = json?.props?.pageProps?.post;
        if (post) {
          const mapped = this._post(post, detailUrl);
          if (download && mapped.downloads?.length) {
            let targets = [];
            if (version !== "all" && version !== null && version !== undefined) {
              const idx = parseInt(version);
              if (mapped.downloads[idx]) {
                targets = [mapped.downloads[idx]];
              }
            } else {
              targets = mapped.downloads;
            }
            for (const ver of targets) {
              if (ver.links?.length) {
                for (const link of ver.links) {
                  const apiRes = await this._api(link.id);
                  if (apiRes.status) {
                    Object.assign(link, apiRes.result);
                  } else {
                    link.download_error = apiRes.result.error;
                  }
                }
              }
            }
          }
          return {
            status: true,
            result: _internalRaw ? mapped : this._snk(mapped)
          };
        }
      }
      const manual = {
        title: $("h1").first().text().trim() || $("h2").first().text().trim(),
        description: $('meta[name="description"]').attr("content") || "",
        article: $(".article").html() || "",
        url: detailUrl
      };
      return {
        status: true,
        result: this._snk(manual)
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async download({
    id = null,
    linkId = null,
    slug = null,
    categorySlug = null,
    url = null,
    version = "all"
  }) {
    try {
      const targetId = id || linkId;
      if (targetId) {
        const apiRes = await this._api(targetId);
        if (!apiRes.status) return {
          status: false,
          result: {
            error: apiRes.result.error
          }
        };
        return {
          status: true,
          result: this._snk(apiRes.result)
        };
      }
      const detailRes = await this.detail({
        url: url,
        slug: slug,
        categorySlug: categorySlug,
        download: true,
        version: version,
        _internalRaw: true
      });
      if (!detailRes.status) return detailRes;
      if (detailRes.result.downloads?.length) {
        for (const ver of detailRes.result.downloads) {
          if (ver.links?.length) {
            for (const link of ver.links) {
              if (link.url) {
                const {
                  id: lId,
                  type,
                  title,
                  size,
                  ...apiData
                } = link;
                return {
                  status: true,
                  result: this._snk({
                    id: lId,
                    type: type,
                    title: title,
                    size: size,
                    ...apiData
                  })
                };
              }
            }
          }
        }
      }
      return {
        status: false,
        result: {
          error: "Gagal mendapatkan link download dari halaman/versi ini"
        }
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error: err.message
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
  const validActions = ["home", "search", "detail", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&category=windows&page=1",
          search: "/?action=search&query=photoshop&limit=2&download=true",
          detail: "/?action=detail&url=https://filecr.com/windows/adobe-photoshop-2024/&download=true&version=0",
          download: "/?action=download&slug=ccleaner&categorySlug=windows&version=0"
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
  if (options.limit) options.limit = parseInt(options.limit, 10);
  if (options.detail) options.detail = options.detail === "true";
  if (options.download) options.download = options.download === "true";
  if (options.version !== undefined && options.version !== null) {
    if (options.version !== "all" && !isNaN(options.version)) {
      options.version = parseInt(options.version, 10);
    }
  }
  const api = new FileCR();
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
            example: "/?action=search&query=office"
          });
        }
        response = await api.search(options);
        break;
      case "detail":
        if (!options.url && !options.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(options);
        break;
      case "download":
        if (!options.id && !options.linkId && !options.slug && !options.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id', 'slug', atau 'url' wajib diisi untuk action 'download'."
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
        error: "Tidak ada respons dari FileCR. Coba lagi nanti."
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