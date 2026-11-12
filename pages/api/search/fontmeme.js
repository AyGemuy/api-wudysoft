import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class FontMeme {
  constructor() {
    this.baseURL = "https://fontmeme.com";
    this.proxy = proxy;
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _buildConfig(targetPath, customHeaders = {}) {
    const fullUrl = `${this.proxy}${encodeURIComponent(`${this.baseURL}${targetPath}`)}`;
    const headers = {
      ...this.baseHeaders,
      ...customHeaders
    };
    return {
      url: fullUrl,
      headers: headers
    };
  }
  _log(step, message, type = "info") {
    const symbols = {
      info: "✨",
      success: "🟢",
      error: "🚨",
      process: "⚡"
    };
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${symbols[type] || "▪️"} [${step.toUpperCase()}] → ${message}`);
  }
  async search({
    query,
    page = 1
  } = {}) {
    if (!query) return {
      status: false,
      result: "Query is required"
    };
    this._log("search", `Searching for "${query}" (page ${page})`, "process");
    const config = this._buildConfig("/fonts/search.html", {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      referer: `${this.baseURL}/`
    });
    try {
      const response = await axios.get(`${config.url}?q=${encodeURIComponent(query)}&page=${page}`, {
        headers: config.headers
      });
      const $ = cheerio.load(response.data);
      const items = $(".fontPreviewWrapper").map((i, el) => {
        const titleEl = $(el).find(".fontPreviewTitle a");
        const link = titleEl.attr("href")?.trim() || "";
        const title = titleEl.text()?.trim() || "";
        const designer = $(el).find(".fontdesigners a").text()?.trim() || "";
        const categories = $(el).find(".fontTopCategories a").map((_, a) => $(a).text().trim()).get().join(", ");
        const license = $(el).find(".license").text()?.trim() || "";
        const previewImg = $(el).find(".fontPreviewImageWrapper img").attr("src") || "";
        if (link && title) {
          return {
            title: title,
            link: link.startsWith("http") ? link : `${this.baseURL}${link}`,
            designer: designer,
            categories: categories,
            license: license,
            preview_img: previewImg.startsWith("http") ? previewImg : `${this.baseURL}${previewImg}`
          };
        }
        return null;
      }).get().filter(Boolean);
      this._log("search", `Found ${items.length} items`, "success");
      return {
        status: true,
        result: {
          items: items,
          current_page: page,
          query: query
        }
      };
    } catch (err) {
      this._log("search", err.message, "error");
      return {
        status: false,
        result: err.message
      };
    }
  }
  async assets({
    type,
    page = "_main",
    lang = "en",
    offset = 0
  } = {}) {
    if (!type || !["fonts", "effects"].includes(type)) {
      return {
        status: false,
        result: 'Type must be "fonts" or "effects"'
      };
    }
    this._log("assets", `Fetching ${type} (page=${page}, lang=${lang}, offset=${offset})`, "process");
    const targetPath = `/load_asset.php?type=${type}&page=${encodeURIComponent(page)}&lang=${encodeURIComponent(lang)}${offset ? `&offset=${offset}` : ""}`;
    const config = this._buildConfig(targetPath, {
      accept: "application/json, text/javascript, */*; q=0.01",
      "x-requested-with": "XMLHttpRequest",
      referer: `${this.baseURL}/`
    });
    try {
      const response = await axios.get(config.url, {
        headers: config.headers
      });
      this._log("assets", `Successfully fetched ${type} data`, "success");
      return {
        status: true,
        result: response.data
      };
    } catch (err) {
      this._log("assets", err.message, "error");
      return {
        status: false,
        result: err.message
      };
    }
  }
  async generate({
    text,
    slug,
    ...rest
  } = {}) {
    if (!text) return {
      status: false,
      result: "Text is required"
    };
    this._log("generate", `Generating image for "${text}"`, "process");
    try {
      let settings = {};
      if (slug) {
        const pageSettings = await this._settings(slug);
        if (pageSettings.status) {
          settings = pageSettings.result;
        }
      }
      const postData = {
        name: rest.font || rest.name || settings.font || "Honoria-Regular.otf",
        text: text,
        size: rest.size || settings.size || "277",
        style_color: rest.color || settings.color || "FFED03",
        style_effect: rest.effect || settings.effect || "Style-BoxLogo_main",
        style_pa: rest.effect_pa || settings.effect_pa || "",
        style_ol: rest.effect_ol || settings.effect_ol || "",
        style_col: rest.color2 || settings.color2 || "19CACA"
      };
      const config = this._buildConfig("/loadme_21.php", {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: this.baseURL,
        priority: "u=1, i",
        referer: slug ? `${this.baseURL}/${slug.startsWith("/") ? slug.slice(1) : slug}/` : `${this.baseURL}/beef-tv-series-font/`,
        "x-requested-with": "XMLHttpRequest"
      });
      const response = await axios.post(config.url, new URLSearchParams(postData).toString(), {
        headers: config.headers
      });
      const imageUrl = response.data?.trim() || "";
      if (!imageUrl || imageUrl.startsWith("<!DOCTYPE") || imageUrl === this.baseURL) {
        throw new Error("Server returned invalid image path");
      }
      const fullImageUrl = imageUrl.startsWith("http") ? imageUrl : `${this.baseURL}${imageUrl}`;
      this._log("generate", `Success: ${fullImageUrl}`, "success");
      return {
        status: true,
        result: {
          text: text,
          url: fullImageUrl
        }
      };
    } catch (err) {
      this._log("generate", err.message, "error");
      return {
        status: false,
        result: err.message
      };
    }
  }
  async font_use({
    page = 1
  } = {}) {
    const targetPath = page > 1 ? `/fonts-in-use/page/${page}/` : "/fonts-in-use/";
    this._log("font_use", `Fetching font usage examples (page ${page})`, "process");
    const config = this._buildConfig(targetPath, {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      priority: "u=0, i",
      referer: page > 1 ? `${this.baseURL}/fonts-in-use/page/${Number(page) - 1}/` : `${this.baseURL}/`
    });
    try {
      const response = await axios.get(config.url, {
        headers: config.headers
      });
      const $ = cheerio.load(response.data);
      const items = $("#blog-wrap article.blog-entry").map((i, el) => {
        const thumbnailAnchor = $(el).find(".blog-entry-thumbnail a");
        const imgEl = thumbnailAnchor.find("img");
        const headerAnchor = $(el).find(".entry-text header h3 a");
        const title = headerAnchor.attr("title")?.trim() || imgEl.attr("alt")?.trim() || "";
        const link = headerAnchor.attr("href")?.trim() || thumbnailAnchor.attr("href")?.trim() || "";
        const previewImg = imgEl.attr("src") || "";
        const classAttr = $(el).attr("class") || "";
        const tags = classAttr.split(" ").filter(cls => cls.startsWith("tag-")).map(cls => cls.replace("tag-", "").replace(/-/g, " "));
        const categories = classAttr.split(" ").filter(cls => cls.startsWith("category-") && cls !== "category-fonts-in-use").map(cls => cls.replace("category-", "").replace(/-/g, " "));
        if (title && link) {
          return {
            title: title,
            link: link.startsWith("http") ? link : `${this.baseURL}${link}`,
            preview_img: previewImg.startsWith("http") ? previewImg : `${this.baseURL}${previewImg}`,
            fonts_tagged: tags,
            categories: categories
          };
        }
        return null;
      }).get().filter(Boolean);
      const paginationText = $(".page-pagination .page-of-page").text().trim();
      let totalPages = page;
      if (paginationText.includes("/")) {
        totalPages = parseInt(paginationText.split("/")[1].trim()) || page;
      }
      this._log("font_use", `Loaded ${items.length} items`, "success");
      return {
        status: true,
        result: {
          items: items,
          current_page: Number(page),
          total_pages: totalPages
        }
      };
    } catch (err) {
      this._log("font_use", err.message, "error");
      return {
        status: false,
        result: err.message
      };
    }
  }
  async _settings(slug) {
    this._log("_settings", `Scraping settings for "${slug}"`, "process");
    const cleanSlug = slug.startsWith("/") ? slug : `/${slug}`;
    const config = this._buildConfig(cleanSlug, {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate"
    });
    try {
      const response = await axios.get(config.url, {
        headers: config.headers
      });
      const $ = cheerio.load(response.data);
      const payload = {
        font: $("#font").val() || "",
        effect: $("#effect").val() || "",
        size: $("#size").val() || "100",
        color: $("#jscolorr").val() || "FFFFFF",
        color2: $("#jscolorr2").val() || "",
        effect_ol: $("#effect_ol").val() || "",
        effect_pa: $("#effect_pa").val() || ""
      };
      this._log("_settings", `Settings extracted (font: ${payload.font || "default"})`, "success");
      return {
        status: true,
        result: payload
      };
    } catch (err) {
      this._log("_settings", err.message, "error");
      return {
        status: false,
        result: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "assets", "generate", "font_use"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=neon",
          generate: "/?action=generate&text=Hello&slug=beef-tv-series-font",
          assets: "/?action=assets&type=effects",
          font_use: "/?action=font_use&page=1"
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
  const api = new FontMeme();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=neon"
          });
        }
        response = await api.search(params);
        break;
      case "assets":
        if (!params.type) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'type' (fonts / effects) wajib diisi untuk action 'assets'.",
            example: "/?action=assets&type=effects"
          });
        }
        response = await api.assets(params);
        break;
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'generate'.",
            example: "/?action=generate&text=Smart&slug=beef-tv-series-font"
          });
        }
        response = await api.generate(params);
        break;
      case "font_use":
        response = await api.font_use(params);
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
        error: "Tidak ada respons. Coba lagi nanti."
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