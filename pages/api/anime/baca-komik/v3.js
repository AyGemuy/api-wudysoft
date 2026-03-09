import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Komiku {
  constructor() {
    this.baseURL = "https://komiku.org";
    this.baseAPI = "https://api.komiku.org";
    this.cors = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      Referer: this.baseURL,
      Origin: this.baseURL
    };
  }
  async req(url, options = {}) {
    const target = `${this.cors}${url}`;
    console.log(`[LOG] Fetching: ${url}`);
    try {
      const {
        data
      } = await axios.get(target, {
        headers: this.headers,
        ...options
      });
      return data;
    } catch (error) {
      console.error(`[ERROR] Fetch failed: ${error?.message}`);
      throw error;
    }
  }
  async home({
    ...rest
  } = {}) {
    console.log("[LOG] Memulai proses scraping Home...");
    try {
      const html = await this.req(this.baseURL, rest);
      const $ = cheerio.load(html);
      const result = {
        popular: [],
        latest: []
      };
      $("#Rekomendasi_Komik .ls2").each((i, el) => {
        const title = $(el).find("h3 a").text().trim();
        const link = $(el).find("h3 a").attr("href");
        const thumb = $(el).find("img").attr("src")?.split("?")[0] || $(el).find("img").attr("data-src")?.split("?")[0];
        const genre = $(el).find(".ls2t").text().trim();
        const up = $(el).find(".ls2l").text().trim();
        result.popular.push({
          title: title || "Tanpa Judul",
          link: link ? `${this.baseURL}${link}` : null,
          thumb: thumb || "",
          genre: genre || "Unknown",
          latest_chapter: up
        });
      });
      $("#Terbaru .ls4").each((i, el) => {
        const title = $(el).find("h3 a").text().trim();
        const link = $(el).find("h3 a").attr("href");
        const thumb = $(el).find("img").attr("data-src")?.split("?")[0] || $(el).find("img").attr("src")?.split("?")[0];
        const info = $(el).find(".ls4s").text().trim();
        const up_chapter = $(el).find(".ls24").text().trim();
        const is_colored = $(el).find(".warna").length > 0;
        result.latest.push({
          title: title || "Tanpa Judul",
          link: link ? `${this.baseURL}${link}` : null,
          thumb: thumb || "",
          info: info,
          chapter: up_chapter,
          is_colored: is_colored
        });
      });
      console.log(`[LOG] Home selesai. Populer: ${result.popular.length}, Terbaru: ${result.latest.length}`);
      return result;
    } catch (e) {
      console.error(`[ERROR] Home: ${e.message}`);
      return {};
    }
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`[LOG] Mencari komik dengan query: ${query}`);
    try {
      const url = `${this.baseAPI}/?post_type=manga&s=${encodeURIComponent(query)}`;
      const html = await this.req(url, rest);
      const $ = cheerio.load(html);
      const data = [];
      $(".daftar .bge, .daftar .kan, .list-update .bge, .bge").each((i, el) => {
        const title = $(el).find(".judul2 a, h3 a, .kan h3").text().trim();
        let link = $(el).find(".judul2 a, h3 a, .kan a").attr("href");
        const thumb = $(el).find("img").attr("src")?.split("?")[0] || $(el).find("img").attr("data-src");
        const type = $(el).find(".tipe, .type, .tpe1_inf b").text().trim();
        const desc = $(el).find("p, .kan p").text().trim();
        const latest = $(el).find(".new1").last().find("span").last().text().trim();
        if (link && !link.startsWith("http")) {
          link = `${this.baseURL}${link}`;
        }
        if (title) {
          data.push({
            title: title,
            link: link || "",
            thumb: thumb,
            type: type || "Manga",
            description: desc || "No description",
            latest_chapter: latest
          });
        }
      });
      console.log(`[LOG] Pencarian selesai. Ditemukan: ${data.length}`);
      return data;
    } catch (e) {
      console.error(`[ERROR] Search: ${e.message}`);
      return [];
    }
  }
  async detail({
    url,
    ...rest
  }) {
    console.log(`[LOG] Mengambil detail dari: ${url}`);
    try {
      const html = await this.req(url, rest);
      const $ = cheerio.load(html);
      const mainTitle = $("#Judul h1 span").first().text().trim() || $("#Judul h1").text().trim() || $("h1.entry-title").text().trim();
      const subTitle = $(".j2").text().trim().replace(":", "").trim();
      const desc = $(".desc, .sinopsis, .entry-content p").first().text().trim();
      const thumb = $(".ims img").attr("src")?.split("?")[0] || $(".thumb img").attr("src");
      const author = $('.inftable tr:contains("Pengarang") td:last-child, .inftable tr:contains("Author") td:last-child').text().trim();
      const status = $('.inftable tr:contains("Status") td:last-child').text().trim();
      const type = $('.inftable tr:contains("Jenis Komik") td:last-child, .inftable tr:contains("Type") td:last-child').text().trim();
      const genres = [];
      $(".genre li a, .genres a").each((i, el) => {
        const g = $(el).text().trim();
        if (g && !g.includes("Genre")) genres.push(g);
      });
      const chapters = [];
      $("#Daftar_Chapter tbody tr, #daftarChapter tr, .chapter-list li").each((i, el) => {
        if ($(el).is("tr") && $(el).find("th").length > 0) return;
        const chEl = $(el).find(".judulseries a, .chapter-title a, a");
        const chTitle = chEl.text().trim();
        let chLink = chEl.attr("href");
        const chDate = $(el).find(".tanggalseries, .date").text().trim();
        const chView = $(el).find(".pembaca i, .views").text().trim();
        if (chLink && !chLink.startsWith("http")) {
          chLink = `${this.baseURL}${chLink}`;
        }
        if (chTitle && chLink) {
          chapters.push({
            title: chTitle,
            url: chLink,
            date: chDate || "Unknown",
            views: chView ? parseInt(chView.replace(/[^0-9]/g, "")) || 0 : 0
          });
        }
      });
      chapters.sort((a, b) => {
        const numA = parseFloat(a.title.replace(/[^0-9.]/g, "")) || 0;
        const numB = parseFloat(b.title.replace(/[^0-9.]/g, "")) || 0;
        return numB - numA;
      });
      const firstChapterUrl = chapters.length > 0 ? chapters[chapters.length - 1].url : null;
      const latestChapterUrl = chapters.length > 0 ? chapters[0].url : null;
      console.log(`[LOG] Detail selesai. Total Chapter: ${chapters.length}`);
      return {
        title: mainTitle,
        alt_title: subTitle,
        thumbnail: thumb,
        description: desc,
        author: author || "Unknown",
        status: status || "Ongoing",
        type: type || "Manga",
        genres: [...new Set(genres)],
        chapters: chapters,
        total_chapters: chapters.length,
        first_chapter_url: firstChapterUrl,
        latest_chapter_url: latestChapterUrl
      };
    } catch (e) {
      console.error(`[ERROR] Detail: ${e.message}`);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[LOG] Mengambil gambar chapter: ${url}`);
    try {
      const html = await this.req(url, rest);
      const $ = cheerio.load(html);
      const title = $("#Judul h1").text().trim() || $("h1.entry-title").text().trim();
      const seriesTitle = $('a[rel="tag"]').first().text().trim() || $(".series a").first().text().trim();
      let seriesUrl = $('a[rel="tag"]').first().attr("href") || $(".series a").first().attr("href");
      if (seriesUrl && !seriesUrl.startsWith("http")) seriesUrl = `${this.baseURL}${seriesUrl}`;
      const images = [];
      $("#Baca_Komik img, .chapter-image img, .reader-area img").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
        const alt = $(el).attr("alt") || `Page ${i + 1}`;
        const id = $(el).attr("id");
        if (src && src.startsWith("http")) {
          images.push({
            id: id || i,
            alt: alt,
            url: src
          });
        }
      });
      let prev = $('.toolbar-group a[aria-label="Prev"], a.prev, a:contains("Sebelumnya")').attr("href");
      let next = $('.toolbar-group a[aria-label="Next"], a.next, a:contains("Selanjutnya")').attr("href");
      if (prev && !prev.startsWith("http")) prev = `${this.baseURL}${prev}`;
      if (next && !next.startsWith("http")) next = `${this.baseURL}${next}`;
      console.log(`[LOG] Download selesai. Gambar ditemukan: ${images.length}`);
      return {
        title: title,
        series: {
          title: seriesTitle,
          url: seriesUrl
        },
        images: images,
        total_images: images.length,
        nav: {
          prev: prev || null,
          next: next || null
        }
      };
    } catch (e) {
      console.error(`[ERROR] Download: ${e.message}`);
      return null;
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
        example: "/?action=search&query=boruto"
      }
    });
  }
  const api = new Komiku();
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
            example: "https://komiku.org/manga/boruto-id/"
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'.",
            example: "https://komiku.org/boruto-chapter-2/"
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
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}