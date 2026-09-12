import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
const proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
console.log("CORS proxy", proxy);
class NekoPoi {
  constructor() {
    this.host = "https://nekopoi.care";
    this.proxy = proxy;
    this.source = "nekopoi";
  }
  proxyUrl(url) {
    return `${this.proxy}${encodeURIComponent(url)}`;
  }
  extractId(url) {
    return url.replace(this.host, "").replace(/^\/|\/$/g, "");
  }
  extractTooltipInfo($el) {
    const tooltip = $el.attr("original-title") || "";
    if (!tooltip) return {};
    const info = {};
    const $tooltip = cheerio.load(tooltip);
    $tooltip("p").each((_, p) => {
      const text = $tooltip(p).text().trim();
      if (text.includes("Nama Jepang")) {
        info.japanName = text.replace(/Nama Jepang\s*:\s*/i, "").trim();
      }
      if (text.includes("Produser")) {
        info.producers = text.replace(/Produser\s*:\s*/i, "").trim();
      }
      if (text.includes("Tipe")) {
        info.type = text.replace(/Tipe\s*:\s*/i, "").trim();
      }
      if (text.includes("Status")) {
        info.status = text.replace(/Status\s*:\s*/i, "").trim();
      }
      if (text.includes("Durasi")) {
        info.duration = text.replace(/Durasi\s*:\s*/i, "").trim();
      }
      if (text.includes("Skor")) {
        const score = text.replace(/Skor\s*:\s*/i, "").trim();
        info.score = parseFloat(score) || 0;
      }
    });
    const genres = [];
    $tooltip("a[href*='/genres/']").each((_, a) => {
      genres.push($tooltip(a).text().trim());
    });
    if (genres.length > 0) info.genres = genres;
    return info;
  }
  async home({
    page = 1
  } = {}) {
    try {
      console.log(`Fetching home page: ${page}`);
      const url = page === 1 ? this.host : `${this.host}/page/${page}/`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const extractBgImage = style => {
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : "";
      };
      const parseTooltip = el => {
        const tooltipHtml = $(el).attr("original-title") || "";
        if (!tooltipHtml) return {
          image: "",
          info: {}
        };
        const $tooltip = cheerio.load(tooltipHtml);
        const image = $tooltip("img").attr("src") || "";
        const info = {};
        $tooltip("p").each((_, p) => {
          const text = $tooltip(p).text().trim();
          if (text.includes("Nama Jepang")) info.japanName = text.replace(/Nama Jepang\s*:\s*/i, "").trim();
          if (text.includes("Produser")) info.producers = text.replace(/Produser\s*:\s*/i, "").trim();
          if (text.includes("Tipe")) info.type = text.replace(/Tipe\s*:\s*/i, "").trim();
          if (text.includes("Status")) info.status = text.replace(/Status\s*:\s*/i, "").trim();
          if (text.includes("Durasi")) info.duration = text.replace(/Durasi\s*:\s*/i, "").trim();
          if (text.includes("Skor")) {
            const score = text.replace(/Skor\s*:\s*/i, "").trim();
            info.score = parseFloat(score) || 0;
          }
        });
        const genres = [];
        $tooltip("a[href*='/genres/']").each((_, a) => {
          genres.push($tooltip(a).text().trim());
        });
        if (genres.length > 0) info.genres = genres;
        return {
          image: image,
          info: info
        };
      };
      const recommended = [];
      $(".nk-recommended .nk-ticker ul li a.nk-series-link").each((_, el) => {
        const $el = $(el);
        const link = $el.attr("href") || "";
        const id = this.extractId(link);
        const title = $el.text().trim();
        const {
          image,
          info
        } = parseTooltip(el);
        if (id && title) {
          recommended.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link,
            ...info
          });
        }
      });
      const episodes = [];
      $("#nk-episode-grid .nk-post-card").each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find(".nk-post-meta h2 a");
        const link = linkEl.attr("href") || "";
        const id = this.extractId(link);
        const title = linkEl.text().trim() || "Untitled";
        const thumbStyle = $el.find(".nk-post-thumb .nk-thumb-crop").attr("style") || "";
        const image = extractBgImage(thumbStyle);
        const dateSpan = $el.find(".nk-post-meta span:has(.dashicons-calendar-alt)");
        const date = dateSpan.text().trim() || "";
        const seriesLink = $el.find(".nk-post-meta span a").attr("href") || "";
        const seriesTitle = $el.find(".nk-post-meta span a").text().trim() || "";
        const seriesId = seriesLink ? this.extractId(seriesLink) : "";
        if (id) {
          episodes.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            date: date,
            series: seriesTitle ? {
              id: seriesId,
              title: seriesTitle,
              link: seriesLink
            } : null,
            link: link
          });
        }
      });
      const latestHentai = [];
      $(".nk-hentai-grid ul li").each((_, el) => {
        const $el = $(el);
        const $link = $el.find("a.nk-series-link");
        const link = $link.attr("href") || "";
        const id = this.extractId(link);
        const title = $el.find(".title").text().trim();
        const thumbStyle = $el.find(".nk-hentai-thumb").attr("style") || "";
        const image = extractBgImage(thumbStyle);
        const {
          info
        } = parseTooltip($link[0]);
        if (id && title) {
          latestHentai.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link,
            ...info
          });
        }
      });
      const jav = [];
      $(".nk-jav-grid ul li").each((_, el) => {
        const $el = $(el);
        const $metaLink = $el.find(".nk-jav-meta a");
        const link = $metaLink.attr("href") || "";
        const id = this.extractId(link);
        const title = $metaLink.find("h2").text().trim() || "Untitled";
        const thumbStyle = $el.find(".nk-grid-thumb").attr("style") || "";
        const image = extractBgImage(thumbStyle);
        const dateSpan = $el.find(".nk-jav-meta span:has(.dashicons-calendar-alt)");
        const date = dateSpan.text().trim() || "";
        if (id && title) {
          jav.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: image,
            link: link,
            date: date
          });
        }
      });
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      const currentPage = parseInt($(".pagination .current").text()) || page;
      const totalPages = parseInt($(".pagination .page-numbers").not(".dots, .next, .prev").last().text()) || 1;
      console.log(`Fetched home: ${episodes.length} episodes, ${recommended.length} recommended, ${latestHentai.length} hentai, ${jav.length} jav`);
      return {
        recommended: recommended,
        episodes: episodes,
        latestHentai: latestHentai,
        jav: jav,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev
        }
      };
    } catch (err) {
      console.error("Error fetching home:", err.message);
      return {
        recommended: [],
        episodes: [],
        latestHentai: [],
        jav: [],
        pagination: {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }
  async getCategories() {
    try {
      const {
        data
      } = await axios.get(this.proxyUrl(this.host), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const categories = [];
      $("#menu-menu-1 li").each((_, li) => {
        const $li = $(li);
        const link = $li.find("a").attr("href") || "";
        const title = $li.find("a").text().trim();
        if (link && title && link.includes("/category/")) {
          const slugMatch = link.match(/\/category\/([^\/]+)/);
          const slug = slugMatch ? slugMatch[1] : "";
          if (slug) {
            categories.push({
              title: title,
              link: link,
              slug: slug
            });
          }
        }
      });
      return categories;
    } catch (err) {
      console.error("Error fetching category list:", err.message);
      return [];
    }
  }
  async category({
    slug = "",
    page = 1
  } = {}) {
    if (!slug) {
      const categories = await this.getCategories();
      return {
        categories: categories,
        message: "List of available categories. Use 'slug' parameter to browse a specific category."
      };
    }
    try {
      console.log(`Fetching category: ${slug}, page: ${page}`);
      const url = page === 1 ? `${this.host}/category/${slug}/` : `${this.host}/category/${slug}/page/${page}/`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const extractBgImage = style => {
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : "";
      };
      const items = [];
      $(".nk-search-results ul li").each((_, el) => {
        const $li = $(el);
        const $link = $li.find("a.nk-search-item");
        const link = $link.attr("href") || "";
        const id = this.extractId(link);
        const thumbStyle = $link.find(".nk-search-thumb").attr("style") || "";
        const coverImage = extractBgImage(thumbStyle);
        const title = $link.find(".nk-search-info h2").text().trim() || "Untitled";
        const genreText = $link.find(".nk-search-info .nk-search-genres").text().trim() || "";
        const desc = $link.find(".nk-search-info .nk-search-desc").text().trim() || "";
        const info = {};
        const descLines = desc.split(/\s*[;,]\s*/);
        descLines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith("Original Title")) {
            info.originalTitle = trimmed.replace(/Original Title\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Parody")) {
            info.parody = trimmed.replace(/Parody\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Producers")) {
            info.producers = trimmed.replace(/Producers?\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Duration")) {
            info.duration = trimmed.replace(/Duration\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Genre")) {
            info.genres = trimmed.replace(/Genre\s*:\s*/i, "").trim();
          }
        });
        const genre = genreText || (info.genres ? info.genres : "");
        if (id && title) {
          items.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: coverImage,
            genre: genre,
            description: desc,
            info: info,
            link: link,
            type: "post"
          });
        }
      });
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      const currentPage = parseInt($(".pagination .current").text()) || page;
      const totalPages = parseInt($(".pagination .page-numbers").not(".dots, .next, .prev").last().text()) || 1;
      console.log(`Fetched ${items.length} items from category: ${slug}`);
      return {
        category: slug,
        items: items,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev
        }
      };
    } catch (err) {
      console.error("Error fetching category:", err.message);
      return {
        category: slug,
        items: [],
        pagination: {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }
  async search({
    query = "",
    page = 1
  } = {}) {
    try {
      console.log(`Searching: ${query}, page: ${page}`);
      const q = encodeURIComponent(query);
      const url = page === 1 ? `${this.host}/?s=${q}&post_type=anime` : `${this.host}/search/${q}/page/${page}/`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const extractBgImage = style => {
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : "";
      };
      const items = [];
      $(".nk-search-results ul li").each((_, el) => {
        const $li = $(el);
        const $link = $li.find("a.nk-search-item");
        const link = $link.attr("href") || "";
        const id = this.extractId(link);
        const thumbStyle = $link.find(".nk-search-thumb").attr("style") || "";
        const coverImage = extractBgImage(thumbStyle);
        const title = $link.find(".nk-search-info h2").text().trim() || "Untitled";
        const genreText = $link.find(".nk-search-info .nk-search-genres").text().trim() || "";
        const desc = $link.find(".nk-search-info .nk-search-desc").text().trim() || "";
        const info = {};
        const descLines = desc.split(/\s*[;,]\s*/);
        descLines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith("Original Title")) {
            info.originalTitle = trimmed.replace(/Original Title\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Parody")) {
            info.parody = trimmed.replace(/Parody\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Producers")) {
            info.producers = trimmed.replace(/Producers?\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Duration")) {
            info.duration = trimmed.replace(/Duration\s*:\s*/i, "").trim();
          } else if (trimmed.startsWith("Genre")) {
            info.genres = trimmed.replace(/Genre\s*:\s*/i, "").trim();
          }
        });
        const genre = genreText || (info.genres ? info.genres : "");
        if (id && title) {
          items.push({
            id: id,
            source: this.source,
            title: title,
            coverImage: coverImage,
            genre: genre,
            description: desc,
            info: info,
            link: link
          });
        }
      });
      const hasNext = $(".pagination .next").length > 0;
      const hasPrev = $(".pagination .prev").length > 0;
      const currentPage = parseInt($(".pagination .current").text()) || page;
      const totalPages = parseInt($(".pagination .page-numbers").not(".dots, .next, .prev").last().text()) || 1;
      console.log(`Found ${items.length} results for: ${query}`);
      return {
        query: query,
        items: items,
        pagination: {
          current: currentPage,
          total: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev
        }
      };
    } catch (err) {
      console.error("Error searching:", err.message);
      return {
        query: query,
        items: [],
        pagination: {
          current: 1,
          total: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }
  async detail({
    id = ""
  } = {}) {
    try {
      console.log(`Fetching detail: ${id}`);
      const url = `${this.host}/${id}`;
      const {
        data
      } = await axios.get(this.proxyUrl(url), {
        timeout: 6e4
      });
      const $ = cheerio.load(data);
      const extractBgImage = style => {
        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : "";
      };
      const title = $(".nk-post-header h1").text().trim() || "Untitled";
      const image = $(".nk-featured-img img").attr("src") || "";
      const metaSpans = $(".nk-post-header-meta span");
      let views = 0;
      let date = "";
      metaSpans.each((_, span) => {
        const text = $(span).text().trim();
        if (text.includes("kali")) {
          const match = text.match(/(\d+)\s*kali/i);
          if (match) views = parseInt(match[1]) || 0;
        } else {
          date = text;
        }
      });
      const info = {};
      $(".konten p").each((_, el) => {
        const text = $(el).text().trim();
        const patterns = [{
          key: "originalTitle",
          label: "Original Title"
        }, {
          key: "parody",
          label: "Parody"
        }, {
          key: "producers",
          label: "Producers"
        }, {
          key: "artist",
          label: "Artist"
        }, {
          key: "genre",
          label: "Genre"
        }, {
          key: "duration",
          label: "Duration"
        }, {
          key: "size",
          label: "Size"
        }];
        patterns.forEach(({
          key,
          label
        }) => {
          const strong = $(el).find(`strong:contains("${label}:")`);
          if (strong.length) {
            const value = strong.parent().contents().filter((_, node) => node.type === "text").text().trim();
            if (value) info[key] = value;
          } else {
            const regex = new RegExp(`${label}\\s*:\\s*(.+)`, "i");
            const match = text.match(regex);
            if (match) info[key] = match[1].trim();
          }
        });
      });
      const notes = $(".konten h3").text().trim() || "";
      const streams = [];
      const streamIds = [];
      $("[id^='nk-stream-']").each((_, el) => {
        const idAttr = $(el).attr("id");
        if (idAttr) streamIds.push(idAttr);
      });
      streamIds.sort((a, b) => parseInt(a.split("-")[2]) - parseInt(b.split("-")[2]));
      streamIds.forEach((sid, idx) => {
        const $container = $(`#${sid}`);
        const iframe = $container.find("iframe");
        const src = iframe.attr("src") || "";
        const tabLink = $(`#nk-player-tabs a[href="#${sid}"]`);
        let label = tabLink.text().trim() || `Server ${idx + 1}`;
        let resolution = "Unknown";
        if (notes) {
          if (sid === "nk-stream-1") resolution = "360p/480p";
          else if (sid === "nk-stream-2") resolution = "720p";
          else if (sid === "nk-stream-3") resolution = "Alternatif";
        } else {
          const resMap = ["360p/480p", "720p", "Alternatif"];
          resolution = resMap[idx] || "Unknown";
        }
        if (src) {
          streams.push({
            index: idx + 1,
            id: sid,
            url: src,
            label: label,
            resolution: resolution
          });
        }
      });
      const downloads = [];
      $(".nk-download-box .nk-download-row").each((_, row) => {
        const $row = $(row);
        const qualityText = $row.find(".nk-download-name").text().trim();
        const resMatch = qualityText.match(/\[(\d+p)\]/i);
        const resolution = resMatch ? resMatch[1] : "";
        const links = [];
        $row.find(".nk-download-links p a").each((_, linkEl) => {
          const $link = $(linkEl);
          const href = $link.attr("href") || "";
          const text = $link.text().trim();
          if (href) {
            const isShortened = href.includes("ouo.io") || href.includes("linkpoi.me") || href.includes("bit.ly") || href.includes("short");
            const category = text || "Direct";
            links.push({
              label: text,
              url: href,
              category: category,
              shortened: isShortened
            });
          }
        });
        if (qualityText && links.length > 0) {
          downloads.push({
            quality: qualityText,
            resolution: resolution,
            links: links
          });
        }
      });
      const related = [];
      $(".nk-related-list--info li").each((_, el) => {
        const $li = $(el);
        const link = $li.find(".nf h2 a").attr("href") || "";
        const relatedId = this.extractId(link);
        const relatedTitle = $li.find(".nf h2 a").text().trim() || "";
        const bgStyle = $li.find(".img .ltd").attr("style") || "";
        const coverImage = extractBgImage(bgStyle);
        if (relatedId && relatedTitle) {
          related.push({
            id: relatedId,
            title: relatedTitle,
            coverImage: coverImage,
            link: link,
            type: "related"
          });
        }
      });
      const similarSeries = [];
      $(".nk-related-section .nk-related-list li").each((_, el) => {
        const $li = $(el);
        const $link = $li.find(".nk-related-info .nk-related-title a.nk-series-link");
        const link = $link.attr("href") || "";
        const seriesId = this.extractId(link);
        const seriesTitle = $link.text().trim() || "";
        const bgStyle = $li.find(".nk-related-thumb-crop").attr("style") || "";
        const coverImage = extractBgImage(bgStyle);
        const tooltipInfo = this.extractTooltipInfo($link);
        if (seriesId && seriesTitle) {
          similarSeries.push({
            id: seriesId,
            title: seriesTitle,
            coverImage: coverImage,
            link: link,
            type: "series",
            ...tooltipInfo
          });
        }
      });
      const recommended = [];
      const navigation = {
        prev: null,
        next: null
      };
      const categories = [];
      console.log(`Fetched detail for: ${title}`);
      return {
        id: id,
        source: this.source,
        title: title,
        coverImage: image,
        date: date,
        views: views,
        info: info,
        notes: notes,
        streams: streams,
        downloads: downloads,
        related: related,
        similarSeries: similarSeries,
        recommended: recommended,
        navigation: navigation,
        categories: categories
      };
    } catch (err) {
      console.error("Error fetching detail:", err.message);
      return {
        id: id,
        source: this.source,
        title: "Error",
        description: err.message,
        date: "",
        views: 0,
        info: {},
        notes: "",
        streams: [],
        downloads: [],
        related: [],
        similarSeries: [],
        recommended: [],
        navigation: {
          prev: null,
          next: null
        },
        categories: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi.",
      actions: ["home", "category", "search", "detail"]
    });
  }
  const api = new NekoPoi();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "category":
        response = await api.category(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Paramenter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          actions: ["home", "category", "search", "detail"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}