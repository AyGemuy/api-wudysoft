import axios from "axios";
import * as cheerio from "cheerio";
class AnimeKompi {
  constructor() {
    this.baseUrl = "https://v3.animekompi.fun";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    };
  }
  async _get(url) {
    try {
      console.log(`[LOG] Mengakses URL: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      return cheerio.load(data);
    } catch (error) {
      console.error(`[ERROR] Gagal mengakses ${url}:`, error.message);
      throw error;
    }
  }
  _img(element) {
    return element.attr("data-lazy-src") || element.attr("src") || element.attr("data-src") || null;
  }
  async home({
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Memulai scraping halaman Home Lengkap...");
      const $ = await this._get(this.baseUrl);
      const slider = [];
      $(".slide-item").each((i, el) => {
        const $el = $(el);
        slider.push({
          title: $el.find(".info-left .title .ellipsis a").text().trim(),
          url: $el.find(".info-left .title .ellipsis a").attr("href"),
          image: this._img($el.find(".slide-bg img")),
          releaseYear: $el.find(".release-year").text().trim() || "Unknown",
          genres: $el.find(".extras .extra-category a").map((_, g) => $(g).text().trim()).get(),
          summary: $el.find(".excerpt .story").text().trim(),
          status: $el.find(".cast .director").text().replace("Status:", "").trim(),
          type: $el.find(".cast .actor").text().replace("Tipe:", "").trim()
        });
      });
      const latest = [];
      $(".listupd.normal .excstf article.bs").each((i, el) => {
        const $el = $(el);
        latest.push({
          title: $el.find(".tt h2").text().trim(),
          url: $el.find("a.tip").attr("href"),
          image: this._img($el.find("img")),
          episode: $el.find(".bt .epx").text().trim() || "?",
          type: $el.find(".typez").text().trim(),
          isHot: $el.find(".hotbadge").length > 0,
          uploadTime: $el.find(".timeago").text().trim()
        });
      });
      const latestBatch = [];
      $(".listupd .bs").each((i, el) => {
        const $el = $(el);
        const label = $el.find(".bt .epx").text().trim();
        if (label.toLowerCase().includes("batch")) {
          latestBatch.push({
            title: $el.find(".tt h2").text().trim(),
            url: $el.find("a.tip").attr("href"),
            image: this._img($el.find("img")),
            status: $el.find(".status").text().trim(),
            type: $el.find(".typez").text().trim()
          });
        }
      });
      const trending = {};
      ["weekly", "monthly", "alltime"].forEach(range => {
        const list = [];
        $(`.wpop-${range} ul li`).each((i, el) => {
          const $el = $(el);
          list.push({
            rank: $el.find(".ctr").text().trim(),
            title: $el.find(".leftseries h4 a").text().trim(),
            url: $el.find(".leftseries h4 a").attr("href"),
            image: this._img($el.find(".imgseries img")),
            genres: $el.find(".leftseries span a").map((_, g) => $(g).text().trim()).get(),
            rating: $el.find(".numscore").text().trim()
          });
        });
        if (list.length > 0) trending[range] = list;
      });
      const newSeries = [];
      $(".section .serieslist ul li").each((i, el) => {
        const $el = $(el);
        if ($el.find(".ctr").length === 0) {
          newSeries.push({
            title: $el.find(".leftseries h4 a").text().trim(),
            url: $el.find(".leftseries h4 a").attr("href"),
            image: this._img($el.find(".imgseries img")),
            genres: $el.find(".leftseries span").first().text().replace("Genres:", "").trim(),
            studio: $el.find(".leftseries span").last().text().trim()
          });
        }
      });
      console.log(`[LOG] Selesai. Home parsed.`);
      return {
        status: true,
        result: {
          slider: slider,
          latest: latest,
          batch: latestBatch,
          trending: trending,
          series: newSeries
        }
      };
    } catch (error) {
      console.error("[ERROR] Home:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async search({
    query,
    ...rest
  }) {
    try {
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      console.log(`[LOG] Searching: "${query}"...`);
      const $ = await this._get(searchUrl);
      const results = [];
      $(".listupd article.bs").each((i, el) => {
        const $el = $(el);
        results.push({
          title: $el.find(".tt h2").text().trim(),
          url: $el.find("a.tip").attr("href"),
          image: this._img($el.find("img")),
          status: $el.find(".bt .epx").text().trim(),
          type: $el.find(".typez").text().trim(),
          rating: $el.find(".numscore").text().trim() || null
        });
      });
      const pagination = [];
      $(".pagination a").each((i, el) => {
        pagination.push({
          text: $(el).text().trim(),
          url: $(el).attr("href")
        });
      });
      console.log(`[LOG] Selesai. Ditemukan ${results.length} hasil.`);
      return {
        status: true,
        result: results,
        pagination: pagination
      };
    } catch (error) {
      console.error("[ERROR] Search:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      console.log(`[LOG] Mengambil detail anime...`);
      const $ = await this._get(url);
      const $content = $(".bixbox.animefull");
      const title = $content.find(".entry-title").text().trim();
      const image = this._img($content.find(".thumb img"));
      const synopsis = $('.entry-content[itemprop="description"] p').text().trim();
      const rating = $(".rating .numscore").text().trim();
      const info = {};
      $content.find(".info-content .spe span").each((i, el) => {
        const key = $(el).find("b").text().replace(":", "").trim();
        let value = $(el).clone().children().remove().end().text().trim();
        if (!value && $(el).find("a, time, i").length) {
          value = $(el).find("a, time, i").text().trim();
        }
        if (key) info[key.toLowerCase().replace(/\s/g, "_")] = value;
      });
      const genres = $(".genxed a").map((_, el) => $(el).text().trim()).get();
      const episodes = [];
      $(".eplister ul li").each((i, el) => {
        const $el = $(el);
        episodes.push({
          number: $el.find(".epl-num").text().trim(),
          title: $el.find(".epl-title").text().trim(),
          date: $el.find(".epl-date").text().trim(),
          url: $el.find("a").attr("href")
        });
      });
      const recommendations = [];
      $("#sidebar .listupd article.bs").each((i, el) => {
        const $el = $(el);
        recommendations.push({
          title: $el.find(".tt h2").text().trim(),
          url: $el.find("a").attr("href"),
          image: this._img($el.find("img")),
          status: $el.find(".status").text().trim()
        });
      });
      console.log(`[LOG] Selesai. Detail diambil.`);
      return {
        status: true,
        result: {
          title: title,
          image: image,
          rating: rating,
          synopsis: synopsis,
          info: info,
          genres: genres,
          episode: episodes,
          recommend: recommendations
        }
      };
    } catch (error) {
      console.error("[ERROR] Detail:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[LOG] Mengambil halaman nonton/download...`);
      const $ = await this._get(url);
      const title = $(".entry-title").text().trim();
      const updated = $(".updated").text().trim();
      const nav = {
        prev: $('.naveps .nvs a[rel="prev"]').attr("href") || null,
        next: $('.naveps .nvs a[rel="next"]').attr("href") || null,
        all: $(".naveps .nvsc a").attr("href") || null
      };
      const episodeList = [];
      const gridData = $("#episode-grid").attr("data-episodes");
      if (gridData) {
        try {
          const jsonEps = JSON.parse(gridData);
          jsonEps.forEach(ep => {
            episodeList.push({
              title: ep.episode_title,
              url: ep.episode_url,
              number: ep.episode_number,
              date: ep.time
            });
          });
        } catch (e) {
          console.error("Gagal parse JSON episode grid");
        }
      } else {
        $(".episode-scroll a").each((i, el) => {
          episodeList.push({
            number: $(el).text().trim(),
            url: $(el).attr("href"),
            isCurrent: $(el).hasClass("current")
          });
        });
      }
      const streams = [];
      $("select.mirror option").each((i, el) => {
        const name = $(el).text().trim();
        const value = $(el).val();
        if (value) {
          try {
            const decodedHtml = Buffer.from(value, "base64").toString("utf-8");
            const srcMatch = decodedHtml.match(/src="([^"]+)"/);
            if (srcMatch) {
              streams.push({
                server: name,
                url: srcMatch[1],
                original_encoding: value
              });
            }
          } catch (e) {
            console.log("Bukan base64 valid atau gagal decode");
          }
        }
      });
      const defaultEmbed = $("#pembed iframe").attr("src");
      if (defaultEmbed) {
        const exists = streams.find(s => s.url === defaultEmbed);
        if (!exists) streams.unshift({
          server: "Default",
          url: defaultEmbed
        });
      }
      const downloads = [];
      $(".soraddlx").each((i, el) => {
        const serverType = $(el).find(".sorattlx h3").text().trim();
        const links = [];
        $(el).find(".soraurlx a").each((j, al) => {
          links.push({
            label: $(al).text().trim() || $(al).find("strong").text().trim(),
            url: $(al).attr("href")
          });
        });
        if (links.length > 0) {
          downloads.push({
            category: serverType,
            links: links
          });
        }
      });
      console.log(`[LOG] Selesai. Download data lengkap.`);
      return {
        status: true,
        result: {
          title: title,
          updated: updated,
          navigation: nav,
          episode: episodeList,
          stream: streams,
          download: downloads
        }
      };
    } catch (error) {
      console.error("[ERROR] Download:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=isekai"
      }
    });
  }
  const api = new AnimeKompi();
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
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://v3.animekompi.fun/anime/mayonaka-heart-tune/"
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'chapter'.",
            example: "https://v3.animekompi.fun/piano-episode-1-english-subbed/"
          });
        }
        response = await api.download(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}