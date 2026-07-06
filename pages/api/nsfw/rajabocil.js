import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Rajabocil {
  constructor() {
    this.baseUrl = "https://rajabocil.com";
    this.proxy = proxy;
  }
  async _req(url) {
    try {
      const cleanUrl = url.startsWith("http") ? url : `${this.baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
      console.log(`[REQ] ${cleanUrl}`);
      const {
        data
      } = await axios.get(`${this.proxy}${encodeURIComponent(cleanUrl)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 3e4
      });
      return data;
    } catch (err) {
      console.error(`[ERR_REQ] ${err.message}`);
      throw err;
    }
  }
  _parse($, el) {
    try {
      const $el = $(el);
      const href = $el.attr("href") ?? $el.find("a").first().attr("href") ?? "";
      const slug = href.replace(this.baseUrl, "").replace(/^\/|\/$/g, "");
      const cleanNum = str => str ? str.replace(/[,.]/g, "").trim() : "0";
      const isHot = $el.find('[class*="hot"], .top-today-badge, [class*="today"]').length > 0;
      return {
        id: $el.attr("data-id") ?? "",
        slug: slug,
        title: $el.attr("data-title") ?? $el.find("h3, h4").first().text().trim(),
        thumb: $el.attr("data-thumb") ?? $el.find('img[alt^="Tonton"], img[alt^="Background"], img').first().attr("src") ?? "",
        views: cleanNum($el.attr("data-views-today") ?? $el.find('[id^="views-badge-"], .views-count').text()),
        duration: $el.find(".fa-clock").parent().text().trim(),
        quality: $el.find('.absolute.top-2.left-2 .rounded-md, [class*="quality"]').first().text().trim(),
        is_hot: isHot
      };
    } catch (err) {
      return null;
    }
  }
  async home({
    type = ""
  }) {
    try {
      const path = type ? `/${type.replace(/^\//, "")}` : "/";
      const $ = cheerio.load(await this._req(path));
      const trending = $('h2:contains("Trending Top 10")').closest(".mb-8").find(".post-card").get().map(el => this._parse($, el)).filter(Boolean);
      const posts = $("#posts-grid .post-card, .grid .post-card, .post-card").get().map(el => this._parse($, el)).filter(Boolean);
      console.log(`[HOME] Tipe: "${type || "default"}" - Trending: ${trending.length}, Posts: ${posts.length}`);
      return {
        status: true,
        result: {
          trending: trending,
          posts: posts
        }
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err.message
      };
    }
  }
  async search({
    query,
    page = 1
  }) {
    try {
      if (!query) throw new Error("Parameter query wajib diisi");
      const path = page > 1 ? `/search/${encodeURIComponent(query)}/page/${page}` : `/search/${encodeURIComponent(query)}`;
      const $ = cheerio.load(await this._req(path));
      const results = $("#posts-grid .post-card, .grid .post-card, .post-card").get().map(el => this._parse($, el)).filter(Boolean);
      console.log(`[SEARCH] "${query}" (Page ${page}) - Total: ${results.length}`);
      return {
        status: true,
        result: results
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err.message
      };
    }
  }
  async detail({
    url
  }) {
    try {
      if (!url) throw new Error("Parameter URL/Slug wajib diisi");
      const $ = cheerio.load(await this._req(url));
      const title = $("h1").text().trim();
      let thumb = $(".absolute.-inset-1.bg-cover").css("background-image")?.match(/url\(["']?(.*?)["']?\)/)?.[1] ?? $(".relative.w-full.aspect-video img").first().attr("src") ?? "";
      const descEl = $("#post-content");
      const cleanNum = str => str ? str.replace(/[,.]/g, "").trim() : "0";
      const result = {
        title: title,
        thumb: thumb,
        views: cleanNum($(".fa-eye").parent().text()),
        date: $(".text-gray-500").filter((_, el) => /\b(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Aug|Sep|Okt|Nov|Des)\b/i.test($(el).text())).first().text().trim(),
        description: descEl.clone().children().remove().end().text().trim(),
        desc_images: descEl.find("img").map((_, el) => $(el).attr("src")).get(),
        categories: $("#post-categories a").get().map(el => ({
          name: $(el).text().trim(),
          url: $(el).attr("href") ?? ""
        })),
        related: $('.lg\\:border-l .grid a, [class*="related"] a').get().map(el => {
          const $el = $(el);
          const href = $el.attr("href") ?? "";
          return {
            url: href,
            title: $el.find("h4, h5").first().text().trim(),
            thumb: $el.find("img").first().attr("src") ?? $el.find("img").first().attr("data-src") ?? "",
            views: cleanNum($el.find(".absolute.bottom-1.right-1, .views").text())
          };
        }),
        iframe_src: $("#video-frame-unlocked").attr("data-src") ?? $("iframe").first().attr("src") ?? "",
        download_link: $('a[href*="lulustream.com"]').attr("href") ?? ""
      };
      console.log(`[DETAIL] Sukses mengurai detail konten: "${title}"`);
      return {
        status: true,
        result: result
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err.message
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
          home: "/?action=home",
          search: "/?action=search&query=viral",
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
  const api = new Rajabocil();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=viral"
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