import axios from "axios";
import * as cheerio from "cheerio";
class Carisinyal {
  constructor() {
    this.base_url = "https://carisinyal.com";
  }
  async _req(url) {
    console.log(`[_req] Memulai request ke: ${url}`);
    try {
      const fullUrl = url.startsWith("http") ? url : `${this.base_url}${url.startsWith("/") ? url : `/${url}`}`;
      console.log(`[_req] Full URL: ${fullUrl}`);
      const response = await axios.get(fullUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
        },
        timeout: 15e3
      });
      console.log(`[_req] Sukses mengambil HTML (${response.data.length} bytes)`);
      return response.data;
    } catch (err) {
      console.error(`[_req] Gagal request HTML: ${err.message}`);
      throw err;
    }
  }
  _bg(style) {
    return style ? style.match(/url\(["']?(.*?)["']?\)/)?.[1] || "" : "";
  }
  _slug(url) {
    return url ? url.replace(/\/$/, "").split("/").filter(Boolean).pop() || "" : "";
  }
  _fUrl(url) {
    return url ? url.startsWith("http") ? url : `${this.base_url}${url.startsWith("/") ? url : `/${url}`}` : "";
  }
  _snk(str) {
    return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "_").replace(/-+/g, "_");
  }
  _pSearch($) {
    return $("#_posts_grid-44-99285 .oxy-posts .oxy-post").get().map(el => {
      const $el = $(el),
        link = $el.find(".oxy-post-title"),
        url = link.attr("href") || "";
      const img = $el.find(".oxy-post-image-fixed-ratio-hp, .oxy-post-image-fixed-ratio");
      const price = $el.find(".harga").first().text().trim();
      return url ? {
        title: link.text().trim(),
        url: url,
        full_url: this._fUrl(url),
        slug: this._slug(url),
        type: $el.find(".oxy-post-meta").first().text().trim(),
        image: this._bg(img.attr("style")) || img.attr("data-bg") || "",
        price: price || undefined
      } : null;
    }).filter(Boolean);
  }
  _pPage($) {
    return $(".oxy-easy-posts-pages .page-numbers").get().map(el => {
      const $el = $(el),
        href = $el.attr("href") || "";
      return {
        text: $el.text().trim(),
        url: href ? this._fUrl(href) : "",
        current: $el.hasClass("current")
      };
    });
  }
  async search({
    query,
    page
  }) {
    console.log(`[search] Menjalankan pencarian query: "${query}" | Halaman: ${page || 1}...`);
    try {
      if (!query) throw new Error("Parameter query wajib diisi");
      const pNum = parseInt(page, 10);
      const path = pNum && pNum > 1 ? `/page/${pNum}/?s=${encodeURIComponent(query)}` : `/?s=${encodeURIComponent(query)}`;
      const html = await this._req(path);
      const $ = cheerio.load(html);
      const items = this._pSearch($);
      const pagination = this._pPage($);
      console.log(`[search] Ditemukan ${items.length} hasil untuk query: "${query}" (Halaman ${pNum || 1})`);
      return {
        status: true,
        result: {
          items: items,
          pagination: pagination,
          query: query,
          current_page: pNum || 1
        }
      };
    } catch (error) {
      console.error(`[search] Terjadi galat: ${error.message}`);
      return {
        status: false,
        result: null,
        error: error.message
      };
    }
  }
  _pBrief($) {
    const [sc, ch, cam, bR, bC] = ["#code_block-4031-114924", "#text_block-3155-114924", "#code_block-3248-114924", "#text_block-3162-114924", "#text_block-3309-114924"].map(sel => $(sel).text().trim());
    return {
      screen: sc,
      chipset: ch,
      camera: cam.replace(/\s+/g, " "),
      battery: bR && bC ? `${bR} ${bC}` : bR || bC
    };
  }
  _pFull($) {
    const container = $("div.ct-div-block").filter((_, el) => $(el).find("table.box-info").length > 0).first();
    let section = "informasi_lainnya";
    return container.children().get().reduce((specs, el) => {
      const $el = $(el);
      if ($el.hasClass("ct-text-block") || $el.is("h2")) {
        section = this._snk($el.text().trim()) || section;
      } else if ($el.find("table.box-info").length) {
        $el.find("tr.box-baris").get().map(row => {
          const $r = $(row),
            k = $r.find("td.kolom-satu").text().trim();
          const v = ($r.find("td.kolom-dua").text().trim() || $r.find("td.kolom-full").text().trim() || "").replace(/\s+/g, " ");
          if (k && v && !$r.find(".kolom-full").length) {
            specs[section] = {
              ...specs[section],
              [this._snk(k)]: v
            };
          }
        });
      }
      return specs;
    }, {});
  }
  _pPost($, selector) {
    return $(selector).find(".oxy-post").get().map(el => {
      const $el = $(el),
        url = $el.find(".oxy-post-title").attr("href") || "",
        img = $el.find(".oxy-post-image-fixed-ratio");
      return url ? {
        title: $el.find(".oxy-post-title").text().trim(),
        url: url,
        full_url: this._fUrl(url),
        slug: this._slug(url),
        image: this._bg(img.attr("style")) || img.attr("data-bg") || ""
      } : null;
    }).filter(Boolean);
  }
  async detail({
    url
  }) {
    console.log(`[detail] Membuka detail halaman: ${url}`);
    try {
      if (!url) throw new Error("Parameter URL wajib diisi");
      const targetUrl = !url.startsWith("http") && !url.startsWith("hp/") && !url.startsWith("/hp/") ? `/hp/${url}` : url;
      const html = await this._req(targetUrl);
      const $ = cheerio.load(html);
      const title = $("#headline-48-126638 .ct-span").text().trim() || $("#headline-48-126638").text().trim() || $("h1").text().trim() || "";
      const image = $("#image-3064-114924").attr("src") || $("img.ct-image").first().attr("src") || "";
      const brief_specs = this._pBrief($);
      const full_specs = this._pFull($);
      const related_articles = this._pPost($, "#code_block-1266-114924");
      const similar_phones = this._pPost($, "#_posts_grid-931-114924 .oxy-posts");
      const breadcrumb = $(".rank-math-breadcrumb p a").get().map(el => {
        const $el = $(el);
        return {
          name: $el.text().trim(),
          url: this._fUrl($el.attr("href"))
        };
      });
      console.log(`[detail] Sukses mengurai detail: "${title}"`);
      return {
        status: true,
        result: {
          title: title,
          image: image,
          slug: this._slug(url),
          brief_specs: brief_specs,
          full_specs: full_specs,
          related_articles: related_articles,
          similar_phones: similar_phones,
          breadcrumb: breadcrumb
        }
      };
    } catch (error) {
      console.error(`[detail] Terjadi galat: ${error.message}`);
      return {
        status: false,
        result: null,
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
  const validActions = ["search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=oppo",
          detail: "/?action=detail&url=https://"
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
  const api = new Carisinyal();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=oppo"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "/?action=detail&url=https://"
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
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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