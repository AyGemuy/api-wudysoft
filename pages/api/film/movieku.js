import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
const BASE = "https://movieku.fit";
const agent = new https.Agent({
  rejectUnauthorized: false
});
const get = async (url, params = {}) => {
  console.log(`[GET] ${url}`, Object.keys(params).length ? params : "");
  return axios.get(url, {
    params: params,
    httpsAgent: agent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: BASE
    }
  });
};
const txt = el => el?.text()?.trim() || null;
const href = el => el?.attr("href")?.trim() || null;
const src = el => el?.attr("data-lazy-src") || el?.attr("data-src") || el?.attr("src") || null;
const parseCard = ($, el) => {
  const em = $(el);
  const link = em.find("a").first();
  const rawTitle = txt(link.find(".entry-title")) || link.attr("title");
  const itemType = em.attr("itemtype") || "";
  let type = "Movie";
  if (itemType.includes("TVSeries")) type = "Series";
  const overlay = link.find(".overlay");
  const quality = txt(overlay.find(".quality")) || "HD";
  let status = txt(overlay.find(".status")) || null;
  if (!status) {
    status = type === "Movie" ? "Completed" : "On-going";
    if (rawTitle.toLowerCase().includes("end")) status = "Completed";
  }
  const yearMatch = rawTitle.match(/\((\d{4})\)/);
  const year = yearMatch ? yearMatch[1] : null;
  return {
    title: rawTitle,
    url: href(link),
    thumb: src(link.find("img")),
    type: type,
    quality: quality,
    status: status,
    year: year,
    is_hot: em.closest(".los").prev().find("h3 span").text().includes("Hot")
  };
};
class Movieku {
  async home() {
    console.log("[home] fetching...");
    try {
      const {
        data
      } = await get(BASE);
      const $ = cheerio.load(data);
      const hot_updates = [];
      const latest_movies = [];
      const latest_episodes = [];
      $(".latest.polar").each((i, section) => {
        const sec = $(section);
        const heading = txt(sec.find("h3 span, h2")).toLowerCase();
        const items = sec.find(".los article.box").map((j, el) => parseCard($, el)).get();
        if (heading.includes("hot updates")) {
          hot_updates.push(...items);
        } else if (heading.includes("latest movies")) {
          latest_movies.push(...items);
        } else if (heading.includes("latest episodes") || heading.includes("series")) {
          latest_episodes.push(...items);
        }
      });
      return {
        result: {
          hot_updates: hot_updates,
          latest_movies: latest_movies,
          latest_episodes: latest_episodes
        }
      };
    } catch (e) {
      console.error("[home] error:", e.message);
      throw e;
    }
  }
  async search({
    query,
    page = 1
  }) {
    const url = page > 1 ? `${BASE}/page/${page}/` : BASE;
    console.log(`[search] query="${query}" page=${page}`);
    try {
      const {
        data
      } = await get(url, {
        s: query
      });
      const $ = cheerio.load(data);
      const result = $(".latest.polar .los article.box").map((i, el) => parseCard($, el)).get();
      const pagination = $(".pagination");
      const lastPageUrl = href(pagination.find("a.page-numbers:not(.next)").last());
      const total_pages = lastPageUrl ? parseInt(lastPageUrl.split("/page/")[1]) : page;
      return {
        result: result,
        page: page,
        total_pages: total_pages,
        has_next: !!href(pagination.find("a.next")),
        has_prev: !!href(pagination.find("a.prev"))
      };
    } catch (e) {
      console.error("[search] error:", e.message);
      throw e;
    }
  }
  async detail({
    url
  }) {
    console.log(`[detail] fetching: ${url}`);
    try {
      const {
        data
      } = await get(url);
      const $ = cheerio.load(data);
      const infoBox = $(".infodb");
      const title = txt(infoBox.find(".entry-title"));
      const thumb = src(infoBox.find(".limage img"));
      const meta = {
        genre: [],
        stars: [],
        director: [],
        country: [],
        release: null,
        duration: null,
        quality: null,
        score: null
      };
      infoBox.find("ul.data li").each((i, el) => {
        const row = $(el);
        const label = txt(row.find("b")).replace(":", "").toLowerCase();
        const valContainer = row.find(".colspan");
        if (label === "genre") {
          meta.genre = valContainer.find("a").map((i, a) => txt($(a))).get();
        } else if (label === "stars" || label === "cast") {
          meta.stars = valContainer.find("a").map((i, a) => txt($(a))).get();
        } else if (label === "director") {
          meta.director = valContainer.find("a").map((i, a) => txt($(a))).get();
        } else if (label === "country") {
          meta.country = valContainer.find("a").map((i, a) => txt($(a))).get();
        } else if (label === "release") {
          meta.release = txt(valContainer.find("time")) || txt(valContainer);
        } else if (label === "duration") {
          meta.duration = txt(valContainer);
        } else if (label === "quality") {
          meta.quality = txt(valContainer);
        } else if (label === "score") {
          meta.score = txt(valContainer);
        }
      });
      const synopsis = txt($("#snps .synops .entry-content")).replace("Sinopsis", "").trim();
      const stream_embed = $("#pembed iframe").attr("src") || null;
      const download_links = [];
      $("#smokeddl .smokeurl p").each((i, el) => {
        const p = $(el);
        const resolution = txt(p.find("strong"));
        const links = p.find("a").map((j, a) => ({
          host: txt($(a)),
          url: href($(a))
        })).get();
        if (links.length > 0) {
          download_links.push({
            resolution: resolution || "Unknown",
            links: links
          });
        }
      });
      const recommendations = $("#rkms .los article.box").map((i, el) => parseCard($, el)).get();
      return {
        result: {
          title: title,
          thumb: thumb,
          ...meta,
          synopsis: synopsis,
          stream_embed: stream_embed,
          download_links: download_links,
          recommendations: recommendations
        },
        url: url
      };
    } catch (e) {
      console.error("[detail] error:", e.message);
      throw e;
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
        example: "/?action=search&query=Art"
      }
    });
  }
  const api = new Movieku();
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
            example: "https://"
          });
        }
        response = await api.detail(params);
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
      status: true,
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