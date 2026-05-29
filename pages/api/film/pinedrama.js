import axios from "axios";
import * as cheerio from "cheerio";
class PineDrama {
  constructor() {
    this.base = "https://pinedrama.com";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _rsc(html) {
    const $ = cheerio.load(html);
    const chunks = [];
    for (const el of $("script").toArray()) {
      const content = $(el).html();
      if (content?.includes("self.__next_f.push")) {
        const matches = [...content.matchAll(/self\.__next_f\.push\(\[\d+,\s*"([\s\S]*?)"\]\)/g)];
        matches.forEach(m => chunks.push(m[1]));
      }
    }
    return chunks.join("").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  _prs(buf, key) {
    const start = buf.indexOf(`"${key}":`);
    if (start === -1) return null;
    let i = start + key.length + 3;
    while (buf[i] === " ") i++;
    const open = buf[i];
    const close = open === "[" ? "]" : "}";
    let depth = 0,
      end = i;
    for (; end < buf.length; end++) {
      if (buf[end] === open) depth++;
      else if (buf[end] === close) depth--;
      if (depth === 0) break;
    }
    try {
      return JSON.parse(buf.substring(i, end + 1));
    } catch {
      return null;
    }
  }
  _snk(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._snk(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
        result[snakeKey] = this._snk(obj[key]);
        return result;
      }, {});
    }
    return obj;
  }
  _crd($, el) {
    const $el = $(el);
    const cover = $el.find("img").first().attr("src") || "";
    const dramaLink = $el.find("a").filter((_, a) => $(a).attr("href")?.includes("/dramas/")).first();
    const name = dramaLink.attr("aria-label")?.trim() || dramaLink.text().trim();
    const slug = dramaLink.attr("href")?.split("/").pop() || "";
    const rating = $el.find(".text-yellow-400.text-sm.font-bold").text().trim();
    const genre = $el.find(".w-full.inline-flex.h-6 a").text().trim();
    return {
      cover_url: cover,
      name: name,
      rating: rating,
      genre: genre,
      series_slug: slug
    };
  }
  async home() {
    try {
      const {
        data
      } = await axios.get(this.base, {
        headers: {
          ...this.headers,
          referer: this.base
        }
      });
      const $ = cheerio.load(data);
      const buf = this._rsc(data);
      const banner = this._prs(buf, "bannerList") || [];
      const popular = $('h2:contains("Popular Short Dramas")').closest(".max-w-7xl").find(".w-full.inline-flex.flex-col.gap-2").map((_, el) => this._crd($, el)).get();
      const newReleases = $('h3:contains("New Releases")').closest(".max-w-7xl").find(".self-stretch.min-w-82").map((_, el) => {
        const $el = $(el);
        const cover = $el.find("img").first().attr("src") || "";
        const dramaLink = $el.find("a").filter((_, a) => $(a).attr("href")?.includes("/dramas/")).first();
        const name = dramaLink.attr("aria-label")?.trim() || dramaLink.text().trim();
        const slug = dramaLink.attr("href")?.split("/").pop() || "";
        const genre = $el.find('a[href*="/genres/"]').text().trim();
        const desc = $el.find(".text-Text.text-sm.font-normal.leading-5.line-clamp-2").text().trim();
        return {
          cover_url: cover,
          name: name,
          genre: genre,
          description: desc,
          series_slug: slug
        };
      }).get();
      const editor = $('h3:contains("Editor\'s Pick")').closest(".max-w-7xl").find(".w-full.bg-white\\/5.rounded-xl").map((_, el) => {
        const $el = $(el);
        const cover = $el.find("img").first().attr("src") || "";
        const dramaLink = $el.find("a").filter((_, a) => $(a).attr("href")?.includes("/dramas/")).first();
        const name = dramaLink.attr("aria-label")?.trim() || dramaLink.text().trim();
        const slug = dramaLink.attr("href")?.split("/").pop() || "";
        const genre = $el.find('a[href*="/genres/"]').text().trim();
        const rating = $el.find(".text-yellow-400.text-sm.font-bold").text().trim();
        const desc = $el.find(".text-Text.text-base.font-normal.leading-5.line-clamp-3").text().trim();
        return {
          cover_url: cover,
          name: name,
          genre: genre,
          rating: rating,
          description: desc,
          series_slug: slug
        };
      }).get();
      const genres = $(".main-cont.mx-auto.w-full .self-stretch.bg-white\\/5.rounded-xl").map((_, el) => {
        const $el = $(el);
        const genreName = $el.find(".text-Title.text-lg.font-bold").first().text().trim();
        const count = $el.find(".text-Text.text-sm.font-normal.leading-4").text().trim();
        const dramas = $el.find(".w-full.relative.flex.flex-col.justify-center.items-center.gap-2").map((_, d) => {
          const $d = $(d);
          const cover = $d.find("img").first().attr("src") || "";
          const dramaLink = $d.find("a").filter((_, a) => $(a).attr("href")?.includes("/dramas/")).first();
          const name = dramaLink.attr("aria-label")?.trim() || dramaLink.text().trim();
          const slug = dramaLink.attr("href")?.split("/").pop() || "";
          return {
            cover_url: cover,
            name: name,
            series_slug: slug
          };
        }).get();
        return {
          genre: genreName,
          count: count,
          dramas: dramas
        };
      }).get();
      return this._snk({
        banner: banner,
        popular: popular,
        new: newReleases,
        editor: editor,
        genres: genres
      });
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async search({
    q = ""
  } = {}) {
    try {
      const url = `${this.base}/search?q=${encodeURIComponent(q)}`;
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: `${this.base}/search`
        }
      });
      const buf = this._rsc(data);
      const results = this._prs(buf, "searchList") || [];
      const newSeries = this._prs(buf, "newSeries") || [];
      return this._snk({
        q: q,
        total: results.length,
        results: results,
        new_series: newSeries
      });
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async detail({
    slug = ""
  } = {}) {
    try {
      const url = `${this.base}/dramas/${slug}`;
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: this.base
        }
      });
      const buf = this._rsc(data);
      const series = this._prs(buf, "seriesObj") || {};
      const episodes = series.episode_list || this._prs(buf, "episode_list") || [];
      const res = {
        ...series,
        episodes: episodes,
        trending: series.trending_series_slug_list || [],
        youlike: series.youlike_series_slug_list || []
      };
      return this._snk(res);
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async episode({
    slug = "",
    ep = 1
  } = {}) {
    try {
      const url = `${this.base}/dramas/${slug}/ep${ep}`;
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: `${this.base}/dramas/${slug}`
        }
      });
      const buf = this._rsc(data);
      const series = this._prs(buf, "seriesObj") || {};
      let episodes = series.episode_list || this._prs(buf, "episode_list") || [];
      const total = episodes.length || parseInt(this._prs(buf, "episode_num") || 0);
      const video = episodes.find(e => e.episode_id === ep)?.url || episodes[ep - 1]?.url || "";
      const res = {
        ...series,
        slug: slug,
        ep: parseInt(ep),
        video: video,
        total: total,
        next: ep < total ? `${this.base}/dramas/${slug}/ep${ep + 1}` : null,
        prev: ep > 1 ? `${this.base}/dramas/${slug}/ep${ep - 1}` : null
      };
      return this._snk(res);
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async genres() {
    try {
      const url = `${this.base}/genres`;
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: this.base
        }
      });
      const buf = this._rsc(data);
      const genreList = this._prs(buf, "genreList") || [];
      const list = genreList.map(g => ({
        name: g.name,
        slug: g.genre_slug,
        description: g.genre_detail || ""
      }));
      return this._snk({
        genres: list
      });
    } catch (e) {
      return {
        error: e.message,
        genres: []
      };
    }
  }
  async genre({
    slug = "",
    page = 1
  } = {}) {
    try {
      const url = page === 1 ? `${this.base}/genres/${slug}` : `${this.base}/genres/${slug}/${page}`;
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: `${this.base}/genres`
        }
      });
      const $ = cheerio.load(data);
      const buf = this._rsc(data);
      const genreList = this._prs(buf, "genreList") || [];
      const currentGenre = genreList.find(g => g.genre_slug === slug) || {};
      const genreInfo = {
        name: currentGenre.name || slug,
        description: currentGenre.genre_detail || $(".text-left.text-Text.text-sm.font-normal.leading-5.line-clamp-3").text().trim(),
        slug: slug
      };
      const hotDramas = $(".mt-1.lg\\:mt-4.mb-4.lg\\:mb-4.max-w-7xl.mx-auto.w-full .flex.overflow-x-auto.gap-3.lg\\:px-10.px-4 > .w-full.inline-flex.flex-col.gap-2").map((_, el) => this._crd($, el)).get();
      const latestDramas = $(".main-cont.self-stretch.flex.flex-col.mt-1.lg\\:mt-4.justify-start.items-center.gap-5 .grid.grid-cols-1.lg\\:grid-cols-2.gap-5 > .w-full.relative").map((_, el) => {
        const $el = $(el);
        const cover = $el.find("img").first().attr("src") || "";
        const dramaLink = $el.find('a[href*="/dramas/"]').first();
        const name = dramaLink.attr("aria-label")?.trim() || dramaLink.text().trim();
        const seriesSlug = dramaLink.attr("href")?.split("/").pop() || "";
        const rating = $el.find(".text-yellow-400.text-sm.font-bold").text().trim();
        const genreLink = $el.find('a[href*="/genres/"]').first();
        const genreName = genreLink.text().trim();
        const description = $el.find(".text-Text.text-base.font-normal.leading-5.line-clamp-2").text().trim();
        return {
          cover_url: cover,
          name: name,
          series_slug: seriesSlug,
          rating: rating,
          genre: genreName,
          description: description
        };
      }).get();
      const activePageEl = $(".p-2.group.hover\\:bg-teal-500.hover\\:outline-teal-500.rounded-lg.text-white.outline-teal-500.bg-teal-500").find("div");
      const currentPage = activePageEl.length ? parseInt(activePageEl.text().trim(), 10) || page : page;
      const pageNumbers = $('a[href*="/genres/"]').map((_, a) => parseInt($(a).text().trim(), 10)).get().filter(num => !isNaN(num));
      const totalPages = pageNumbers.length ? Math.max(...pageNumbers) : 1;
      const pagination = {
        currentPage: currentPage,
        totalPages: totalPages
      };
      return this._snk({
        genre: genreInfo,
        hotDramas: hotDramas,
        latestDramas: latestDramas,
        pagination: pagination
      });
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const payload = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...params
  } = payload;
  const scraper = new PineDrama();
  const availableActions = Object.getOwnPropertyNames(Object.getPrototypeOf(scraper)).filter(name => typeof scraper[name] === "function" && name !== "constructor" && !name.startsWith("_")).sort();
  if (!action) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'action' wajib diisi.",
      available_actions: availableActions
    });
  }
  if (action === "search" && !params.q?.trim()) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'q' (query pencarian) wajib diisi untuk action 'search'."
    });
  }
  if (["detail", "episode", "genre"].includes(action) && !params.slug?.trim()) {
    return res.status(400).json({
      status: false,
      message: `Parameter 'slug' wajib diisi untuk action '${action}'.`
    });
  }
  try {
    if (typeof scraper[action] === "function" && !action.startsWith("_")) {
      const result = await scraper[action](params);
      const finalData = result && typeof result === "object" ? result.data || result : {
        value: result
      };
      return res.status(200).json({
        status: true,
        action: action,
        ...finalData
      });
    } else {
      return res.status(404).json({
        status: false,
        error: `Action '${action}' tidak ditemukan atau bersifat internal.`,
        available_actions: availableActions
      });
    }
  } catch (error) {
    console.error(`[API Error] Action: ${action} |`, error.message);
    return res.status(500).json({
      status: false,
      action: action,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message
    });
  }
}