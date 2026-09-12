import axios from "axios";
import * as cheerio from "cheerio";
class NudeGals {
  constructor() {
    this.baseUrl = "https://nude-gals.com";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID",
      cookie: "age_verified=1",
      referer: "https://nude-gals.com/"
    };
  }
  async request({
    path,
    ...rest
  }) {
    const url = `${this.baseUrl}/${path}`;
    console.log(`[LOG] Fetching URL: ${url}`);
    const response = await axios.get(url, {
      headers: this.headers,
      timeout: rest.timeout || 1e4
    }) || {};
    return response.data || "";
  }
  async latest({
    ...rest
  }) {
    try {
      console.log("[LOG] Processing latest content...");
      const html = await this.request({
        path: "",
        ...rest
      });
      const $ = cheerio.load(html);
      const galleries = $('.left h2:contains("Latest Galleries")').nextAll("p.text-center").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("photoshoot_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || "",
          desc: a.text()?.replace(/\s+/g, " ")?.trim() || ""
        };
      }).get();
      const videos = $(".latestVideos div.nopaddingl").map((_, el) => {
        const a = $(el).find("p a");
        return {
          id: a.attr("href")?.split("video_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || "",
          desc: a.text()?.replace(/\s+/g, " ")?.trim() || ""
        };
      }).get();
      return {
        status: true,
        result: {
          galleries: galleries,
          videos: videos
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch latest content:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async photoshoot({
    id,
    ...rest
  }) {
    try {
      const pid = id || "";
      console.log(`[LOG] Processing photoshoot detail for ID: ${pid}`);
      const html = await this.request({
        path: `photoshoot.php?photoshoot_id=${pid}`,
        ...rest
      });
      const $ = cheerio.load(html);
      const title = $(".photoshoot-title").find("div").first().text()?.split("Title:")?.[1]?.trim() || "No Title";
      const magazine = $(".photoshoot-title").find('a[href*="magazine_id"]').text()?.trim() || "";
      const modelName = $(".photoshoot-title").find('a[href*="model_id"]').text()?.trim() || "";
      const views = $("#views").text()?.trim() || "";
      const rating = $(".votes").text()?.trim() || "";
      const photos = $(".row_margintop .text-center").map((_, el) => {
        const thumb = $(el).find("img.thumbnail");
        const fullLink = $(el).find('a[href^="galleries/"]').attr("href");
        return thumb.length ? {
          title: thumb.attr("title") || "",
          thumbUrl: thumb.attr("src") || "",
          fullUrl: fullLink || null
        } : null;
      }).get().filter(Boolean);
      return {
        status: true,
        result: {
          title: title,
          magazine: magazine,
          modelName: modelName,
          views: views,
          rating: rating,
          photos: photos
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch photoshoot:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async search({
    word,
    ...rest
  }) {
    try {
      const query = word || "";
      console.log(`[LOG] Processing search for query: "${query}"`);
      const html = await this.request({
        path: `search.php?word=${encodeURIComponent(query)}&type=simple&alias=1`,
        ...rest
      });
      const $ = cheerio.load(html);
      const models = $("#galleries .thumbnail").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("model_id=")?.[1] || null,
          name: a.find("strong").text()?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || ""
        };
      }).get();
      const photoshoots = $("#photoshoots .text-center").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("photoshoot_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || ""
        };
      }).get();
      const videos = $("#videos .thumbnail").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("video_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("src") || ""
        };
      }).get();
      return {
        status: true,
        result: {
          models: models,
          photoshoots: photoshoots,
          videos: videos
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to execute search:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async model({
    id,
    ...rest
  }) {
    try {
      const mid = id || "";
      console.log(`[LOG] Processing model profile ID: ${mid}`);
      const html = await this.request({
        path: `model_page.php?model_id=${mid}`,
        ...rest
      });
      const $ = cheerio.load(html);
      const name = $(".model table tr").filter((_, el) => $(el).text().includes("Name")).find("td").eq(1).text()?.trim() || "";
      const origin = $(".model table tr").filter((_, el) => $(el).text().includes("Origin")).find("td").eq(1).text()?.replace(/\s+/g, " ")?.trim() || "";
      const tags = $(".model table tr").filter((_, el) => $(el).text().includes("Tags")).find("td").eq(1).find("a").map((_, el) => $(el).text()?.trim()).get();
      const galleries = $("#galleries .text-center").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("photoshoot_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("src") || ""
        };
      }).get();
      return {
        status: true,
        result: {
          name: name,
          origin: origin,
          tags: tags,
          galleries: galleries
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch model profile:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async archive({
    id,
    ...rest
  }) {
    try {
      const aid = id || "";
      console.log(`[LOG] Processing archive ID: ${aid}`);
      const html = await this.request({
        path: `gal_archive.php?archive_id=${aid}`,
        ...rest
      });
      const $ = cheerio.load(html);
      const galleries = $("#grid_container .text-center").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("photoshoot_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || ""
        };
      }).get();
      return {
        status: true,
        result: galleries
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch archive:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async videos({
    page,
    ...rest
  }) {
    try {
      const p = page || 1;
      console.log(`[LOG] Processing videos list - Page: ${p}`);
      const html = await this.request({
        path: `all_videos.php?pp=${p}`,
        ...rest
      });
      const $ = cheerio.load(html);
      const list = $(".videos .thumbnail").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("video_id=")?.[1] || null,
          title: a.attr("title")?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || "",
          duration: a.find(".caption").text()?.trim() || ""
        };
      }).get();
      return {
        status: true,
        result: list
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch videos:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async models({
    letter,
    country,
    order,
    ...rest
  }) {
    try {
      const char = letter || "p";
      const c = country || "00";
      const ord = order || "1";
      console.log(`[LOG] Processing models list - Letter: ${char}, Country: ${c}`);
      const html = await this.request({
        path: `all_models.php?letter=${char}&countries=${c}&models_order=${ord}`,
        ...rest
      });
      const $ = cheerio.load(html);
      const list = $(".models .thumbnail").map((_, el) => {
        const a = $(el).find("a");
        return {
          id: a.attr("href")?.split("model_id=")?.[1] || null,
          name: a.find("strong").text()?.trim() || "",
          cover: a.find("img").attr("data-src") || a.find("img").attr("src") || "",
          stats: a.find(".caption").text()?.replace(/\s+/g, " ")?.trim() || ""
        };
      }).get();
      return {
        status: true,
        result: list
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch models list:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async topten({
    ...rest
  }) {
    try {
      console.log("[LOG] Processing top ten rated models and photoshoots...");
      const html = await this.request({
        path: "topten.php",
        ...rest
      });
      const $ = cheerio.load(html);
      const models = $(".topten_models_list ol li a").map((_, el) => {
        return {
          id: $(el).attr("href")?.split("model_id=")?.[1] || null,
          text: $(el).text()?.trim() || ""
        };
      }).get();
      const photoshoots = $(".topten_photoshoots_list ol li a").map((_, el) => {
        return {
          id: $(el).attr("href")?.split("photoshoot_id=")?.[1] || null,
          text: $(el).text()?.trim() || ""
        };
      }).get();
      return {
        status: true,
        result: {
          models: models,
          photoshoots: photoshoots
        }
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch top ten data:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async magazines({
    ...rest
  }) {
    try {
      console.log("[LOG] Processing magazines page...");
      const html = await this.request({
        path: "magazines.php",
        ...rest
      });
      const $ = cheerio.load(html);
      const list = $(".magazines.row").map((_, el) => {
        const aName = $(el).find('a[href^="magazine-photoshoots.php"]');
        const link = $(el).find('a[href^="go.php"]');
        return {
          id: aName.attr("href")?.split("magazine_id=")?.[1] || null,
          name: aName.text()?.trim() || "",
          cover: $(el).find("img").attr("src") || "",
          siteLink: link.attr("href") || "",
          desc: $(el).find('td:contains("Description")').next().text()?.trim() || ""
        };
      }).get();
      return {
        status: true,
        result: list
      };
    } catch (error) {
      console.error("[ERROR] Failed to fetch magazines:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["latest", "photoshoot", "search", "model", "archive", "videos", "models", "topten", "magazines"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          latest: "/?action=latest",
          search: "/?action=search&word=eva",
          photoshoot: "/?action=photoshoot&id=123",
          model: "/?action=model&id=456"
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
  const api = new NudeGals();
  try {
    let response;
    switch (action) {
      case "latest":
        response = await api.latest(params);
        break;
      case "photoshoot":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'photoshoot'."
          });
        }
        response = await api.photoshoot({
          id: params.id,
          ...params
        });
        break;
      case "search":
        if (!params.word) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'word' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search({
          word: params.word,
          ...params
        });
        break;
      case "model":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'model'."
          });
        }
        response = await api.model({
          id: params.id,
          ...params
        });
        break;
      case "archive":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'archive'."
          });
        }
        response = await api.archive({
          id: params.id,
          ...params
        });
        break;
      case "videos":
        response = await api.videos({
          page: params.page,
          ...params
        });
        break;
      case "models":
        response = await api.models({
          letter: params.letter,
          country: params.country,
          order: params.order,
          ...params
        });
        break;
      case "topten":
        response = await api.topten(params);
        break;
      case "magazines":
        response = await api.magazines(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak menerima respons yang valid dari server target."
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