import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
const proxyUrls = [`https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12?url=`];
const randomProxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
class LK21 {
  constructor() {
    this.baseUrl = "https://tv4.lk21official.life/search.php";
    this.proxy = randomProxyUrl;
    this.api = axios.create();
  }
  async init() {
    return true;
  }
  async req({
    url,
    ...rest
  }) {
    try {
      console.log(`[PROC] GET -> ${url}`);
      const targetUrl = this.proxy + url;
      const res = await this.api.get(targetUrl, {
        ...rest
      });
      if (res.status === 200 && typeof res.data === "string") {
        const isHtml = res.data.includes("<html") || res.data.includes("<!DOCTYPE");
        const result = isHtml ? cheerio.load(res.data) : res.data;
        console.log(`[DONE] ${url} | Status: ${res.status}`);
        return result;
      }
      return null;
    } catch (err) {
      console.log(`[FAIL] ${url} | ${err.message}`);
      return null;
    }
  }
  async search({
    query = "Hulk",
    ...rest
  } = {}) {
    const url = `${this.baseUrl}?s=${encodeURIComponent(query)}`;
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) {
      return [{
        message: "Tidak ada hasil yang ditemukan atau gagal memuat halaman."
      }];
    }
    const results = $(".search-item").map((_, el) => {
      const title = $(el).find(".search-content h3 a").text().trim();
      const link = $(el).find(".search-content h3 a").attr("href")?.trim();
      const director = $(el).find(".search-content p:contains('Sutradara')").text().replace("Sutradara:", "").trim();
      const stars = $(el).find(".search-content p:contains('Bintang')").text().replace("Bintang:", "").trim();
      const image = $(el).find(".search-poster a img").attr("src")?.trim();
      return {
        title: title,
        link: link,
        director: director,
        stars: stars,
        image: image
      };
    }).get();
    return results.length ? results : [{
      message: "Tidak ada hasil yang ditemukan untuk pencarian ini."
    }];
  }
  async download({
    url,
    ...rest
  } = {}) {
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) {
      return {
        video: "Failed to retrieve video source.",
        providers: ["Failed to retrieve providers."]
      };
    }
    const video = $("#player video").attr("src") || "No video source found.";
    const providers = $("#loadProviders a").map((_, el) => ({
      name: $(el).text().trim(),
      link: decodeURIComponent($(el).attr("href")?.replace("https://playeriframe.lol/iframe.php?url=", "") || "#"),
      alt: $(el).attr("class") || "N/A"
    })).get();
    return {
      video: video,
      download: providers.length ? providers : ["No providers found."]
    };
  }
  async detail({
    url,
    ...rest
  } = {}) {
    const $ = await this.req({
      url: url,
      ...rest
    });
    if (!$) {
      return {
        message: "Failed to retrieve movie details."
      };
    }
    const title = $(".post-header h2").eq(0).text().trim() || "No title";
    const poster = $(".content-wrapper .content-poster img").attr("src") || "No poster";
    const quality = $(".content-wrapper h2").eq(0).next().text().trim() || "N/A";
    const country = $(".content-wrapper h2").eq(1).next().text().trim() || "N/A";
    const stars = $(".content-wrapper h2").eq(2).next().find("a").map((_, el) => $(el).text().trim()).get() || ["N/A"];
    const director = $(".content-wrapper h2").eq(3).next().find("a").text().trim() || "N/A";
    const genres = $(".content-wrapper h2").eq(4).next().find("a").map((_, el) => $(el).text().trim()).get() || ["N/A"];
    const imdb = $(".content-wrapper h2").eq(5).next().text().trim() || "N/A";
    const releaseDate = $(".content-wrapper h2").eq(6).next().text().trim() || "N/A";
    const duration = $(".content-wrapper h2").eq(10).next().text().trim() || "N/A";
    const synopsis = $("blockquote").eq(0).text().trim() || "No synopsis";
    const downloadInfo = await this.download({
      url: url,
      ...rest
    });
    return {
      title: title,
      poster: poster,
      quality: quality,
      country: country,
      stars: stars,
      director: director,
      genres: genres,
      imdb: imdb,
      releaseDate: releaseDate,
      duration: duration,
      synopsis: synopsis,
      video: downloadInfo?.video || "N/A",
      download: downloadInfo?.download || []
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "detail", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/api?action=search&query=Hulk",
          detail: "/api?action=detail&url=https://tv4.lk21official.life/some-movie-url",
          download: "/api?action=download&url=https://tv4.lk21official.life/some-movie-url"
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
  const scraper = new LK21();
  try {
    let response;
    switch (action) {
      case "search":
        response = await scraper.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi."
          });
        }
        response = await scraper.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi."
          });
        }
        response = await scraper.download(params);
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
      status: true,
      action: action,
      result: response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}