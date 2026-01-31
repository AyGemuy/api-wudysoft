import axios from "axios";
import * as cheerio from "cheerio";
class Otakudesu {
  constructor() {
    this.base = "https://otakudesu.best";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async home({
    ...rest
  }) {
    try {
      console.log("Fetching home...");
      const {
        data
      } = await axios.get(this.base, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const ongoing = $(".venz ul li").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $el.find(".jdlflm").text().trim(),
          episode: $el.find(".epz").text().trim(),
          day: $el.find(".epztipe").text().trim(),
          date: $el.find(".newnime").text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          thumb: $el.find(".thumbz").css("background-image")?.replace(/url\(['"]?(.*?)['"]?\)/i, "$1") || $img.attr("src") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      const complete = $(".venser .detpost").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("h2 a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $a.text().trim(),
          episodes: $el.find(".epztipe").eq(0).text().trim(),
          rating: $el.find(".epztipe").eq(1).text().trim(),
          date: $el.find(".newnime").text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          thumb: $img.attr("src") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      console.log(`Ongoing: ${ongoing.length}, Complete: ${complete.length}`);
      return {
        success: true,
        ongoing: ongoing,
        complete: complete,
        total: {
          ongoing: ongoing.length,
          complete: complete.length
        }
      };
    } catch (err) {
      console.error("Error home:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        ongoing: [],
        complete: []
      };
    }
  }
  async list({
    page = 1,
    ...rest
  }) {
    try {
      console.log(`Fetching anime list page ${page}...`);
      const url = page > 1 ? `${this.base}/anime-list/page/${page}/` : `${this.base}/anime-list/`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const alphabets = {};
      $(".bariskelom").each((_, section) => {
        const $sec = $(section);
        const letter = $sec.find(".barispenz a").text().trim();
        const animes = $sec.find("ul li").map((_, el) => {
          const $a = $(el).find("a");
          const url = $a.attr("href") || "";
          return {
            title: $a.text().trim(),
            url: url,
            slug: url.split("/").filter(Boolean).pop() || ""
          };
        }).get().filter(x => x.title);
        if (letter) alphabets[letter] = animes;
      });
      const totalAnimes = Object.values(alphabets).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`Total anime: ${totalAnimes}`);
      return {
        success: true,
        alphabets: alphabets,
        total: totalAnimes,
        letters: Object.keys(alphabets).length
      };
    } catch (err) {
      console.error("Error list:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        alphabets: {}
      };
    }
  }
  async schedule({
    ...rest
  }) {
    try {
      console.log("Fetching schedule...");
      const {
        data
      } = await axios.get(`${this.base}/jadwal-rilis/`, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const days = {};
      $(".kglist321").each((_, section) => {
        const $sec = $(section);
        const day = $sec.find("h2").text().trim();
        const animes = $sec.find("ul li").map((_, el) => {
          const $a = $(el).find("a");
          const url = $a.attr("href") || "";
          return {
            title: $a.text().trim(),
            url: url,
            slug: url.split("/").filter(Boolean).pop() || ""
          };
        }).get().filter(x => x.title);
        if (day) days[day] = animes;
      });
      const totalSchedules = Object.values(days).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`Scheduled days: ${Object.keys(days).length}, Total: ${totalSchedules}`);
      return {
        success: true,
        schedule: days,
        total: totalSchedules,
        days: Object.keys(days).length
      };
    } catch (err) {
      console.error("Error schedule:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        schedule: {}
      };
    }
  }
  async ongoing({
    page = 1,
    ...rest
  }) {
    try {
      console.log(`Fetching ongoing page ${page}...`);
      const url = page > 1 ? `${this.base}/ongoing-anime/page/${page}/` : `${this.base}/ongoing-anime/`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const list = $(".venz ul li").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $el.find(".jdlflm").text().trim(),
          episode: $el.find(".epz").text().trim(),
          day: $el.find(".epztipe").text().trim(),
          date: $el.find(".newnime").text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          thumb: $el.find(".thumbz").css("background-image")?.replace(/url\(['"]?(.*?)['"]?\)/i, "$1") || $img.attr("src") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      console.log(`Ongoing found: ${list.length}`);
      return {
        success: true,
        data: list,
        pagination: {
          page: page,
          hasNext: hasNext,
          hasPrev: hasPrev
        },
        total: list.length
      };
    } catch (err) {
      console.error("Error ongoing:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        data: []
      };
    }
  }
  async complete({
    page = 1,
    ...rest
  }) {
    try {
      console.log(`Fetching complete page ${page}...`);
      const url = page > 1 ? `${this.base}/complete-anime/page/${page}/` : `${this.base}/complete-anime/`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const list = $(".venz ul li").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $el.find(".jdlflm").text().trim(),
          episodes: $el.find(".epz").text().trim(),
          rating: $el.find(".epztipe").text().trim(),
          date: $el.find(".newnime").text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          thumb: $el.find(".thumbz").css("background-image")?.replace(/url\(['"]?(.*?)['"]?\)/i, "$1") || $img.attr("src") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      console.log(`Complete found: ${list.length}`);
      return {
        success: true,
        data: list,
        pagination: {
          page: page,
          hasNext: hasNext,
          hasPrev: hasPrev
        },
        total: list.length
      };
    } catch (err) {
      console.error("Error complete:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        data: []
      };
    }
  }
  async genres({
    ...rest
  }) {
    try {
      console.log("Fetching genres...");
      const {
        data
      } = await axios.get(`${this.base}/genre-list/`, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const genres = $(".genres li a, .genre-list li a, ul li a").map((_, el) => {
        const $a = $(el);
        const url = $a.attr("href") || "";
        if (!url.includes("/genre/")) return null;
        return {
          name: $a.text().trim(),
          url: url,
          slug: url.split("/genre/").pop()?.replace("/", "") || ""
        };
      }).get().filter(x => x?.name);
      console.log(`Genres: ${genres.length}`);
      return {
        success: true,
        data: genres,
        total: genres.length
      };
    } catch (err) {
      console.error("Error genres:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        data: []
      };
    }
  }
  async genre({
    slug = "",
    page = 1,
    ...rest
  }) {
    try {
      console.log(`Fetching genre ${slug} page ${page}...`);
      const url = page > 1 ? `${this.base}/genre/${slug}/page/${page}/` : `${this.base}/genre/${slug}/`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const genreName = $(".venser h1").text().trim().replace("Genre: ", "") || slug;
      const list = $(".venz ul li").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $el.find(".jdlflm").text().trim(),
          episodes: $el.find(".epz").text().trim(),
          rating: $el.find(".epztipe").text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          thumb: $el.find(".thumbz").css("background-image")?.replace(/url\(['"]?(.*?)['"]?\)/i, "$1") || $img.attr("src") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      console.log(`Genre ${slug}: ${list.length}`);
      return {
        success: true,
        genre: genreName,
        data: list,
        pagination: {
          page: page,
          hasNext: hasNext,
          hasPrev: hasPrev
        },
        total: list.length
      };
    } catch (err) {
      console.error("Error genre:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        data: []
      };
    }
  }
  async search({
    q = "",
    page = 1,
    ...rest
  }) {
    try {
      console.log(`Searching: ${q} page ${page}...`);
      const url = page > 1 ? `${this.base}/page/${page}/?s=${encodeURIComponent(q)}&post_type=anime` : `${this.base}/?s=${encodeURIComponent(q)}&post_type=anime`;
      const {
        data
      } = await axios.get(url, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const results = $(".chivsrc li").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("h2 a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $a.text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || "",
          genres: $el.find('.set:contains("Genres")').text().replace("Genres :", "").trim(),
          status: $el.find('.set:contains("Status")').text().replace("Status :", "").trim(),
          rating: $el.find('.set:contains("Rating")').text().replace("Rating :", "").trim()
        };
      }).get().filter(x => x.title);
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      console.log(`Search results: ${results.length}`);
      return {
        success: true,
        query: q,
        data: results,
        pagination: {
          page: page,
          hasNext: hasNext,
          hasPrev: hasPrev
        },
        total: results.length
      };
    } catch (err) {
      console.error("Error search:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error",
        data: []
      };
    }
  }
  async detail({
    url = "",
    slug = "",
    ...rest
  }) {
    try {
      const finalUrl = url || `${this.base}/anime/${slug}/`;
      console.log(`Fetching detail: ${finalUrl}...`);
      const {
        data
      } = await axios.get(finalUrl, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const $img = $(".fotoanime img");
      const info = {};
      $(".infozingle p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes(":")) {
          const [key, ...val] = text.split(":");
          info[key.trim().toLowerCase().replace(/ /g, "_")] = val.join(":").trim();
        }
      });
      const episodes = $(".episodelist ul li").map((_, el) => {
        const $a = $(el).find("a");
        const url = $a.attr("href") || "";
        return {
          title: $a.text().trim(),
          url: url,
          slug: url.split("/").filter(Boolean).pop() || "",
          date: $(el).find(".zeebr").text().trim()
        };
      }).get().filter(x => x.title);
      const batch = $(".batchlink ul li").map((_, el) => {
        const $a = $(el).find("a");
        const url = $a.attr("href") || "";
        return {
          title: $a.text().trim(),
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      const related = $(".venz ul li").map((_, el) => {
        const $el = $(el);
        const $a = $el.find("a");
        const $img = $el.find("img");
        const url = $a.attr("href") || "";
        return {
          title: $el.find(".jdlflm").text().trim(),
          image: $img.attr("src") || "",
          imageAlt: $img.attr("alt") || "",
          url: url,
          slug: url.split("/").filter(Boolean).pop() || ""
        };
      }).get().filter(x => x.title);
      console.log(`Episodes: ${episodes.length}, Batch: ${batch.length}`);
      return {
        success: true,
        title: $(".jdlrx h1").text().trim(),
        image: $img.attr("src") || "",
        imageAlt: $img.attr("alt") || "",
        thumb: $img.attr("src") || "",
        synopsis: $(".sinopc p").text().trim() || $(".sinopc").text().trim(),
        ...info,
        episodes: episodes,
        batch: batch,
        related: related,
        total: {
          episodes: episodes.length,
          batch: batch.length,
          related: related.length
        }
      };
    } catch (err) {
      console.error("Error detail:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error"
      };
    }
  }
  async episode({
    url = "",
    slug = "",
    ...rest
  }) {
    try {
      const finalUrl = url || `${this.base}/episode/${slug}/`;
      console.log(`Fetching episode: ${finalUrl}...`);
      const {
        data
      } = await axios.get(finalUrl, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const streams = $(".mirrorstream ul li").map((_, el) => {
        const $el = $(el);
        const links = $el.find("a").map((_, a) => {
          const $a = $(a);
          return {
            server: $a.text().trim(),
            url: $a.attr("href") || ""
          };
        }).get().filter(x => x.server);
        return {
          quality: $el.find("strong").text().trim(),
          links: links,
          total: links.length
        };
      }).get().filter(x => x.quality);
      const downloads = $(".download ul li").map((_, el) => {
        const $el = $(el);
        const quality = $el.find("strong").text().trim();
        const links = $el.find("a").map((_, a) => {
          const $a = $(a);
          return {
            host: $a.text().trim(),
            url: $a.attr("href") || ""
          };
        }).get().filter(x => x.host);
        return {
          quality: quality,
          size: $el.find("i").text().trim(),
          format: quality.toLowerCase().includes("mkv") ? "mkv" : quality.toLowerCase().includes("mp4") ? "mp4" : "",
          links: links,
          total: links.length
        };
      }).get().filter(x => x.quality);
      const $prev = $('.flir a:contains("Episode Sebelumnya"), .prevnext a:contains("Sebelumnya")');
      const $next = $('.flir a:contains("Episode Selanjutnya"), .prevnext a:contains("Selanjutnya")');
      const $anime = $('.flir a:contains("Lihat Semua Episode"), .flir a:contains("See All Episodes")');
      const prevUrl = $prev.attr("href") || null;
      const nextUrl = $next.attr("href") || null;
      const animeUrl = $anime.attr("href") || null;
      console.log(`Streams: ${streams.length}, Downloads: ${downloads.length}`);
      return {
        success: true,
        title: $(".venutama h1").text().trim() || $(".posttl").text().trim(),
        animeTitle: $(".headpost h1").text().trim() || $(".posttl").text().trim(),
        info: $(".kategoz").text().trim(),
        credit: $('.kategoz:contains("Credit")').text().replace("Credit:", "").trim() || $('.posttl:contains("Credit")').text().replace("Credit:", "").trim(),
        streams: streams,
        downloads: downloads,
        navigation: {
          prev: {
            url: prevUrl,
            slug: prevUrl?.split("/").filter(Boolean).pop() || null
          },
          next: {
            url: nextUrl,
            slug: nextUrl?.split("/").filter(Boolean).pop() || null
          },
          anime: {
            url: animeUrl,
            slug: animeUrl?.split("/").filter(Boolean).pop() || null
          }
        },
        total: {
          streams: streams.length,
          downloads: downloads.length
        }
      };
    } catch (err) {
      console.error("Error episode:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error"
      };
    }
  }
  async batch({
    url = "",
    slug = "",
    ...rest
  }) {
    try {
      const finalUrl = url || `${this.base}/batch/${slug}/`;
      console.log(`Fetching batch: ${finalUrl}...`);
      const {
        data
      } = await axios.get(finalUrl, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const $img = $(".fotoanime img, .cukder img");
      const info = {};
      $(".infozin p, .infozingle p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes(":")) {
          const [key, ...val] = text.split(":");
          info[key.trim().toLowerCase().replace(/ /g, "_")] = val.join(":").trim();
        }
      });
      const downloads = $(".download ul li, .batchlink ul li, .downloadbatch ul li").map((_, el) => {
        const $el = $(el);
        const quality = $el.find("strong").text().trim();
        const links = $el.find("a").map((_, a) => {
          const $a = $(a);
          return {
            host: $a.text().trim(),
            url: $a.attr("href") || ""
          };
        }).get().filter(x => x.host);
        return {
          quality: quality,
          size: $el.find("i").text().trim(),
          format: quality.toLowerCase().includes("mkv") ? "mkv" : quality.toLowerCase().includes("mp4") ? "mp4" : "",
          links: links,
          total: links.length
        };
      }).get().filter(x => x.quality);
      console.log(`Batch downloads: ${downloads.length}`);
      return {
        success: true,
        title: $(".venutama h1, .posttl").text().trim(),
        animeTitle: $(".jdlrx h1, .posttl").text().trim(),
        image: $img.attr("src") || "",
        imageAlt: $img.attr("alt") || "",
        credit: $('.kategoz:contains("Credit")').text().replace("Credit:", "").trim(),
        synopsis: $(".sinopc p").text().trim() || $(".sinopc").text().trim(),
        ...info,
        downloads: downloads,
        total: downloads.length
      };
    } catch (err) {
      console.error("Error batch:", err?.message || err);
      return {
        success: false,
        error: err?.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "list", "schedule", "ongoing", "complete", "genres", "genre", "search", "detail", "episode", "batch"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/otakudesu?action=home",
          search: "/otakudesu?action=search&q=boku",
          detail: "/otakudesu?action=detail&url=https://otakudesu.best/anime/...",
          episode: "/otakudesu?action=episode&url=https://otakudesu.best/episode/...",
          ongoing: "/otakudesu?action=ongoing&page=1",
          genre: "/otakudesu?action=genre&slug=action&page=1"
        }
      }
    });
  }
  const api = new Otakudesu();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "list":
        response = await api.list(params);
        break;
      case "schedule":
        response = await api.schedule(params);
        break;
      case "ongoing":
        response = await api.ongoing(params);
        break;
      case "complete":
        response = await api.complete(params);
        break;
      case "genres":
        response = await api.genres(params);
        break;
      case "genre":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk action 'genre'.",
            example: "/otakudesu?action=genre&slug=action&page=1"
          });
        }
        response = await api.genre(params);
        break;
      case "search":
        if (!params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk action 'search'.",
            example: "/otakudesu?action=search&q=boku&page=1"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url && !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk action 'detail'.",
            examples: {
              url: "/otakudesu?action=detail&url=https://otakudesu.best/anime/vigilante-bnh-academia-illegals-s2-sub-indo/",
              slug: "/otakudesu?action=detail&slug=vigilante-bnh-academia-illegals-s2-sub-indo"
            }
          });
        }
        response = await api.detail(params);
        break;
      case "episode":
        if (!params.url && !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk action 'episode'.",
            examples: {
              url: "/otakudesu?action=episode&url=https://otakudesu.best/episode/myag-s2-episode-1-sub-indo/",
              slug: "/otakudesu?action=episode&slug=myag-s2-episode-1-sub-indo"
            }
          });
        }
        response = await api.episode(params);
        break;
      case "batch":
        if (!params.url && !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk action 'batch'.",
            examples: {
              url: "/otakudesu?action=batch&url=https://otakudesu.best/batch/vigilante-bnh-academia-illegals-s1-batch-sub-indo/",
              slug: "/otakudesu?action=batch&slug=vigilante-bnh-academia-illegals-s1-batch-sub-indo"
            }
          });
        }
        response = await api.batch(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}`,
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
      error: error.message || "Unknown Error",
      action: action
    });
  }
}