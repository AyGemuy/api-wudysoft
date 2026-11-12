import axios from "axios";
import * as cheerio from "cheerio";
class Dracinema {
  constructor() {
    this.base = "https://www.dracinema.com";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.7871.181 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Android WebView";v="150"',
      "x-api-key": "xb3MdwdLrZrpaDXvrLLwfP==",
      "sec-ch-ua-mobile": "?1",
      "x-requested-with": "mark.via.gp",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      priority: "u=1, i"
    };
  }
  slug(str) {
    return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
  vtt(vttText) {
    if (!vttText) return [];
    return vttText.split(/\n\s*\n/).map(block => {
      const lines = block.split("\n").map(line => line.trim()).filter(Boolean);
      if (lines.length >= 2 && lines[0].includes("--\x3e")) {
        return {
          timestamp: lines[0],
          text: lines.slice(1).join(" ")
        };
      } else if (lines.length >= 3 && lines[1].includes("--\x3e")) {
        return {
          timestamp: lines[1],
          text: lines.slice(2).join(" ")
        };
      }
      return null;
    }).filter(Boolean);
  }
  url(path, prefix = "/movie/") {
    return path?.startsWith("http") ? path : `${this.base}${prefix}${path?.replace(/^\//, "")}`;
  }
  async home({
    ...rest
  } = {}) {
    console.log("[Scraper] Mengambil data Beranda...");
    try {
      const {
        data
      } = await axios.get(this.base, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const result = {};
      result.metadata = {
        title: $("title").text().trim() || "",
        description: $('meta[name="description"]').attr("content") || "",
        keywords: $('meta[name="keywords"]').attr("content") || ""
      };
      const heroSection = $('section[aria-label="Drama pilihan utama"]');
      result.hero = heroSection.length > 0 ? {
        title: heroSection.find("h3").first().text().trim() || "",
        description: heroSection.find("p.line-clamp-3").text().trim() || "",
        play_url: heroSection.find('a[href^="/play/"]').attr("href") || "",
        detail_url: heroSection.find('a:contains("Detail Info")').attr("href") || ""
      } : null;
      result.featured_dramas = $('[data-swipe-list="true"] div[data-index]').map((_, element) => {
        const linkEl = $(element).find("a");
        const imgEl = $(element).find("img");
        return {
          index: $(element).attr("data-index") || "",
          title: imgEl.attr("alt") || "",
          url: linkEl.attr("href") || "",
          poster: imgEl.attr("src") || ""
        };
      }).get();
      const popularSection = $('h2:contains("Pilihan drama populer")').next("div");
      result.popular_dramas = popularSection.length > 0 ? popularSection.find("article").map((_, element) => {
        const linkEl = $(element).find("a");
        const imgEl = $(element).find("img");
        const titleEl = $(element).find("p");
        return {
          title: titleEl.text().trim() || "",
          url: linkEl.attr("href") || "",
          poster: imgEl.attr("src") || ""
        };
      }).get() : [];
      const genreSection = $('h2:contains("Jelajahi Genre")').next("div");
      result.genres = genreSection.length > 0 ? genreSection.find("a").map((_, element) => ({
        name: $(element).text().replace("→", "").trim() || "",
        url: $(element).attr("href") || ""
      })).get() : [];
      result.schema_item_list = [];
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const json = JSON.parse($(element).html());
          if (json["@type"] === "ItemList") {
            result.schema_item_list = (json.itemListElement || []).map(item => ({
              position: item.position || 0,
              name: item.name || "",
              url: item.url || ""
            }));
          }
        } catch (e) {}
      });
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[Scraper] Error Beranda:", error.message);
      return {
        status: false,
        result: null
      };
    }
  }
  async category({
    type,
    page = 1,
    ...rest
  } = {}) {
    const categoryQuery = type ? `&categories=${encodeURIComponent(type)}` : "";
    const targetUrl = `${this.base}/api/movie?page=${page}${categoryQuery}`;
    console.log(`[Scraper] Mengambil Kategori (Halaman: ${page}, Kategori: ${type || "Semua"})...`);
    try {
      const {
        data
      } = await axios.get(targetUrl, {
        headers: this.headers,
        ...rest
      });
      const result = (data || []).map(book => {
        const slugName = this.slug(book.bookName || book.replacedBookName);
        const bookId = book.bookId || book.originalBookId;
        return {
          book_id: bookId || "",
          original_book_id: book.originalBookId || "",
          language_id: book.languageId || "",
          book_name: book.bookName || "",
          cover: book.cover || "",
          introduction: book.introduction || "",
          chapter_count: book.chapterCount || 0,
          categories: book.typeTwoNames || [],
          author: book.author || "",
          replaced_book_name: book.replacedBookName || "",
          detail_url: `${this.base}/movie/${slugName}-${bookId}`,
          play_url: `${this.base}/play/${slugName}-${bookId}`
        };
      });
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[Scraper] Error Kategori:", error.message);
      return {
        status: false,
        result: null
      };
    }
  }
  async search({
    query,
    ...rest
  } = {}) {
    const targetUrl = `${this.base}/api/search?keyword=${encodeURIComponent(query)}`;
    console.log(`[Scraper] Mencari drama dengan kata kunci: "${query}"...`);
    try {
      const {
        data: responseData
      } = await axios.get(targetUrl, {
        headers: this.headers,
        ...rest
      });
      const rawList = responseData?.data || [];
      const result = rawList.map(book => {
        const slugName = this.slug(book.bookName);
        const bookId = book.originalBookId;
        return {
          original_book_id: bookId || "",
          book_name: book.bookName || "",
          cover: book.cover || "",
          introduction: book.introduction || "",
          chapter_count: book.chapterCount || 0,
          sim: book.sim || 0,
          detail_url: `${this.base}/movie/${slugName}-${bookId}`,
          play_url: `${this.base}/play/${slugName}-${bookId}`
        };
      });
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[Scraper] Error Pencarian:", error.message);
      return {
        status: false,
        result: null
      };
    }
  }
  async detail({
    url,
    ...rest
  } = {}) {
    const targetUrl = this.url(url, "/movie/");
    console.log(`[Scraper] Mengambil Detail Drama: ${targetUrl}...`);
    try {
      const {
        data
      } = await axios.get(targetUrl, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const jsonLdData = $('script[type="application/ld+json"]').map((_, el) => {
        try {
          return JSON.parse($(el).html());
        } catch (e) {
          return null;
        }
      }).get().filter(Boolean);
      const structuredData = jsonLdData.find(data => data["@type"] === "TVSeries") || {};
      const title = $("h1.font-bold.text-2xl").first().text().trim() || structuredData.name || "";
      const synopsis = $('p[itemprop="description"]').text().trim() || structuredData.description || "";
      const poster = $("article").find("img").first().attr("src") || structuredData.image || "";
      const rawGenres = $('a[href^="/genre/"]').map((_, el) => $(el).text().trim()).get();
      const genres = [...new Set(rawGenres)];
      const totalEpisodesText = $('p:contains("Episodes")').find("span").text().trim();
      const totalEpisodes = totalEpisodesText ? parseInt(totalEpisodesText, 10) : structuredData.numberOfEpisodes || null;
      let episodes = [];
      const episodesHeading = $('h2:contains("Daftar Episode")');
      if (episodesHeading.length) {
        episodes = episodesHeading.next().find("a").map((_, el) => ({
          episode: $(el).text().trim(),
          title: $(el).attr("title") || "",
          link: $(el).attr("href") || ""
        })).get();
      }
      const getRecSection = sectionTitle => {
        const heading = $(`h2:contains("${sectionTitle}")`);
        if (!heading.length) return [];
        return heading.next().find("article").map((_, el) => {
          const link = $(el).find("a").attr("href") || "";
          const rawTitle = $(el).find("p").text().trim();
          const imgAlt = $(el).find("img").attr("alt") || "";
          const title = rawTitle || imgAlt.replace(" Full Episode Subtitle Indonesia - Dracinema", "");
          const poster = $(el).find("img").attr("src") || "";
          return {
            title: title,
            link: link,
            poster: poster
          };
        }).get();
      };
      const result = {
        title: title,
        synopsis: synopsis,
        poster: poster,
        genres: genres.length ? genres : structuredData.genre || [],
        total_episodes: totalEpisodes,
        metadata: {
          author: structuredData.author ? structuredData.author.name : "",
          content_rating: structuredData.contentRating || "",
          language: structuredData.inLanguage || "id",
          subtitle_language: structuredData.subtitleLanguage || []
        },
        episodes: episodes,
        recommendations: {
          similar_dramas: getRecSection("Drama Serupa"),
          costume_dramas: getRecSection("Drama Kostum"),
          sweet_love_dramas: getRecSection("Drama Cinta manis")
        }
      };
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[Scraper] Error Detail:", error.message);
      return {
        status: false,
        result: null
      };
    }
  }
  async download({
    url,
    ...rest
  } = {}) {
    const targetUrl = this.url(url, "/play/");
    console.log(`[Scraper] Mengambil URL Stream & Download dari: ${targetUrl}...`);
    try {
      const {
        data
      } = await axios.get(targetUrl, {
        headers: this.headers,
        ...rest
      });
      const $ = cheerio.load(data);
      const jsonLdData = $('script[type="application/ld+json"]').map((_, el) => {
        try {
          return JSON.parse($(el).html());
        } catch (e) {
          return null;
        }
      }).get().filter(Boolean);
      const videoObject = jsonLdData.find(d => d["@type"] === "VideoObject") || {};
      const title = $("h1.text-white.font-semibold.text-base.truncate").first().text().trim() || videoObject.name || "";
      const currentEpisode = $(".text-white.font-medium.text-base.tracking-widest").first().text().trim() || "EP.1";
      const synopsis = $("p.text-sm.text-justify.text-foreground\\/80").text().trim() || videoObject.description || "";
      const scriptsHtml = $("script").map((_, el) => $(el).html()).get().join("\n");
      let streams = [];
      const videoUrlsMatch = scriptsHtml.match(/\\?"videoUrls\\?":\s*(\[[\s\S]*?\])/);
      if (videoUrlsMatch) {
        try {
          const cleanJsonString = videoUrlsMatch[1].replace(/\\\\"/g, '"').replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\u0026/g, "&");
          const rawStreams = JSON.parse(cleanJsonString);
          streams = rawStreams.map(item => {
            let rawVttUrl = "";
            if (item.cdn) {
              const match = item.cdn.match(/[?&]cdn=([^&]+)/);
              if (match) {
                rawVttUrl = decodeURIComponent(match[1]);
              }
            }
            return {
              quality: item.quality ? `${item.quality}p` : "Unknown",
              video_url: item.url || "",
              subtitle_proxy_url: item.cdn || "",
              raw_vtt_url: rawVttUrl
            };
          });
        } catch (err) {
          console.error("[Scraper] Error parsing videoUrls JSON:", err.message);
        }
      }
      let rawEmbeddedVtt = "";
      const vttStartIndex = scriptsHtml.indexOf("WEBVTT");
      if (vttStartIndex !== -1) {
        const sliced = scriptsHtml.substring(vttStartIndex);
        const endQuoteIndex = sliced.indexOf('"]');
        if (endQuoteIndex !== -1) {
          rawEmbeddedVtt = sliced.substring(0, endQuoteIndex);
        } else {
          rawEmbeddedVtt = sliced;
        }
        rawEmbeddedVtt = rawEmbeddedVtt.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\u003c/g, "<").replace(/\\u003e/g, ">");
      }
      const transcript = this.vtt(rawEmbeddedVtt);
      const episodes = $('h2:contains("Semua Episode")').next().find("a").map((_, el) => {
        const epNum = $(el).text().trim();
        const isActive = $(el).hasClass("bg-primary/40");
        return {
          episode: parseInt(epNum, 10) || epNum,
          title: $(el).attr("title") || "",
          link: $(el).attr("href") || "",
          is_active: isActive
        };
      }).get();
      const result = {
        series_title: title,
        current_episode: currentEpisode,
        synopsis: synopsis,
        streams: streams,
        transcript: transcript,
        episodes: episodes
      };
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[Scraper] Error Download/Player:", error.message);
      return {
        status: false,
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "chapter", "category"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=Legend"
      }
    });
  }
  const api = new Dracinema();
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
            example: "https://www.dracinema.com/movie/rahasia-di-balik-wajah-pria-sw_695d02fd5ae5ce5b32def9b3"
          });
        }
        response = await api.detail(params);
        break;
      case "chapter":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'chapter'.",
            example: "https://www.dracinema.com/play/rahasia-di-balik-wajah-pria-sw_695d02fd5ae5ce5b32def9b3/1"
          });
        }
        response = await api.download(params);
        break;
      case "category":
        response = await api.category(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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