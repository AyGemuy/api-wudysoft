import axios from "axios";
import * as cheerio from "cheerio";
class Manhwalist {
  constructor() {
    this.baseURL = "https://manhwalist02.asia";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://manhwalist02.asia/"
    };
    this.axios = axios.create({
      headers: this.headers
    });
  }
  async _req(url) {
    console.log(`[req] Fetching: ${url}`);
    try {
      const {
        data
      } = await this.axios.get(url);
      console.log(`[req] Success (${data.length} bytes)`);
      return {
        status: true,
        result: data
      };
    } catch (err) {
      console.error(`[req] Error: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  _snakeKeys(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => this._snakeKeys(v));
    const newObj = {};
    for (const [key, val] of Object.entries(obj)) {
      const snake = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      newObj[snake] = this._snakeKeys(val);
    }
    return newObj;
  }
  _parseRating($el) {
    const num = $el.find(".num, .numscore").text().trim();
    const bar = $el.find(".rtb span").attr("style") || "";
    const match = bar.match(/([\d.]+)%/);
    const percent = match ? parseFloat(match[1]) : null;
    return {
      value: num ? parseFloat(num) : null,
      percent: percent
    };
  }
  _parseCard($, el) {
    const $card = $(el);
    const title = $card.find(".tt, h4").text().trim();
    const link = $card.find("a.series, a[title]").attr("href") || $card.find("a").attr("href");
    const icon = $card.find(".limit img, .imgu img, .thumb img").attr("src") || null;
    const type = $card.find(".type").text().trim() || null;
    const colored = $card.find(".colored").length > 0;
    const hot = $card.find(".hotx, .hot").length > 0;
    const status = $card.find(".status").text().trim() || null;
    const chapter = $card.find(".epxs").text().trim() || null;
    const rating = this._parseRating($card);
    let slug = null;
    if (link) {
      const parts = link.split("/").filter(Boolean);
      slug = parts.pop();
    }
    const raw = {
      title: title,
      slug: slug,
      url: link ? link.startsWith("http") ? link : this.baseURL + link : null,
      icon: icon ? icon.startsWith("http") ? icon : this.baseURL + icon : null,
      type: type,
      colored: colored,
      hot: hot,
      status: status,
      chapter: chapter,
      rating: rating.value,
      rating_percent: rating.percent
    };
    return this._snakeKeys(raw);
  }
  _parseChapter($, el) {
    const $li = $(el);
    const link = $li.find("a").attr("href");
    const number = $li.data("num") || $li.find(".chapternum").text().trim().replace(/Chapter\s*/i, "") || null;
    const date = $li.find(".chapterdate").text().trim() || null;
    const title = $li.find(".chapternum").text().trim() || null;
    let slug = null;
    if (link) {
      const parts = link.split("/").filter(Boolean);
      slug = parts.pop();
    }
    return {
      number: number ? parseInt(number) : null,
      title: title,
      slug: slug,
      url: link ? link.startsWith("http") ? link : this.baseURL + link : null,
      date: date
    };
  }
  async home({
    page = 1,
    category = null,
    tab = null
  } = {}) {
    try {
      let url = this.baseURL;
      if (category) {
        url = page > 1 ? `${this.baseURL}/page/${page}/?s=${category}` : `${this.baseURL}/?s=${category}`;
      } else {
        url = page > 1 ? `${this.baseURL}/page/${page}/` : this.baseURL;
      }
      console.log(`[home] Fetching page: ${page}, category: ${category || "main"}`);
      const {
        status,
        result: html
      } = await this._req(url);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      const popular = $(".popconslide .bs").get().map(el => {
        const card = this._parseCard($, el);
        return card.title ? card : null;
      }).filter(Boolean);
      const updates = $(".listupd .utao").get().map(el => {
        const $utao = $(el);
        const title = $utao.find(".luf h4").text().trim();
        const link = $utao.find(".luf a.series").attr("href");
        const icon = $utao.find(".imgu img").attr("src") || null;
        const type = $utao.find(".luf ul").attr("class") || null;
        const chapters = $utao.find(".luf ul li").get().map(li => {
          const $li = $(li);
          const chLink = $li.find("a").attr("href");
          const chText = $li.find("a").text().trim();
          const chDate = $li.find("span").text().trim();
          return {
            chapter: chText,
            url: chLink ? chLink.startsWith("http") ? chLink : this.baseURL + chLink : null,
            date: chDate
          };
        });
        let slug = null;
        if (link) {
          const parts = link.split("/").filter(Boolean);
          slug = parts.pop();
        }
        return {
          title: title,
          slug: slug,
          url: link ? link.startsWith("http") ? link : this.baseURL + link : null,
          icon: icon ? icon.startsWith("http") ? icon : this.baseURL + icon : null,
          type: type,
          chapters: chapters
        };
      }).filter(Boolean);
      let recommendations = [];
      if (!tab) {
        $(".series-gen .tab-pane").each((_, pane) => {
          const $pane = $(pane);
          const tabId = $pane.attr("id");
          const items = $pane.find(".bs").get().map(el => {
            const card = this._parseCard($, el);
            return card.title ? {
              ...card,
              tab: tabId
            } : null;
          }).filter(Boolean);
          recommendations = [...recommendations, ...items];
        });
      } else {
        const $pane = $(`#${tab}`);
        if ($pane.length) {
          recommendations = $pane.find(".bs").get().map(el => {
            const card = this._parseCard($, el);
            return card.title ? {
              ...card,
              tab: tab
            } : null;
          }).filter(Boolean);
        }
      }
      const sidebarPopular = [];
      $(".serieslist.pop ul li").each((_, li) => {
        const $li = $(li);
        const title = $li.find(".leftseries h2 a").text().trim();
        const link = $li.find(".leftseries h2 a").attr("href");
        const icon = $li.find(".imgseries img").attr("src") || null;
        const rating = this._parseRating($li);
        const genres = $li.find(".leftseries span a").get().map(a => $(a).text().trim()).filter(Boolean);
        let slug = null;
        if (link) {
          const parts = link.split("/").filter(Boolean);
          slug = parts.pop();
        }
        sidebarPopular.push({
          title: title,
          slug: slug,
          url: link ? link.startsWith("http") ? link : this.baseURL + link : null,
          icon: icon ? icon.startsWith("http") ? icon : this.baseURL + icon : null,
          rating: rating.value,
          rating_percent: rating.percent,
          genres: genres
        });
      });
      const result = {
        popular: popular,
        updates: updates,
        recommendations: recommendations,
        sidebar_popular: sidebarPopular,
        page: page,
        category: category
      };
      return {
        status: true,
        result: this._snakeKeys(result)
      };
    } catch (err) {
      console.error(`[home] Error: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async search({
    query,
    page = 1,
    type = null,
    status = null,
    genre = null,
    order = null
  } = {}) {
    try {
      if (!query) {
        console.warn("[search] Query is empty");
        return {
          status: false,
          result: {
            error: 'Parameter "query" wajib'
          }
        };
      }
      const params = new URLSearchParams();
      params.set("s", query);
      if (page > 1) params.set("page", page);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (genre) params.set("genre[]", genre);
      if (order) params.set("order", order);
      const url = `${this.baseURL}/?${params.toString()}`;
      console.log(`[search] Searching: "${query}" page: ${page}`);
      const {
        status,
        result: html
      } = await this._req(url);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      const products = $(".listupd .bs").get().map(el => {
        const card = this._parseCard($, el);
        return card.title ? card : null;
      }).filter(Boolean);
      const paginationLinks = $(".pagination a.page-numbers, .pagination .page-numbers.current").get().map(el => {
        const $el = $(el);
        const text = $el.text().trim();
        const href = $el.attr("href");
        const isCurrent = $el.hasClass("current");
        return {
          label: text,
          url: href ? href.startsWith("http") ? href : this.baseURL + href : null,
          current: isCurrent
        };
      });
      const nextPage = $(".pagination .next").attr("href") ? page + 1 : null;
      const result = {
        products: products,
        total: products.length,
        query: query,
        page: page,
        next_page: nextPage,
        pagination: paginationLinks,
        filters: {
          type: type,
          status: status,
          genre: genre,
          order: order
        }
      };
      return {
        status: true,
        result: this._snakeKeys(result)
      };
    } catch (err) {
      console.error(`[search] Error: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async detail({
    url = null,
    slug = null
  } = {}) {
    try {
      let detailUrl = url;
      if (!detailUrl) {
        if (!slug) {
          console.warn("[detail] Slug is missing");
          return {
            status: false,
            result: {
              error: 'Parameter "slug" wajib'
            }
          };
        }
        detailUrl = `${this.baseURL}/manga/${slug}/`;
      }
      console.log(`[detail] Fetching: ${detailUrl}`);
      const {
        status,
        result: html
      } = await this._req(detailUrl);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      const title = $(".entry-title").text().trim() || $("h1.entry-title").text().trim();
      const alternative = $(".alternative").text().trim() || null;
      const synopsis = $(".entry-content-single p, .entry-content-single .wd-full p").text().trim() || null;
      const cover = $(".thumb img, .bigbanner").attr("src") || null;
      const statusText = $('.imptdt:contains("Status") i').text().trim() || null;
      const type = $('.imptdt:contains("Type") a').text().trim() || null;
      const released = $('.imptdt:contains("Released") i').text().trim() || null;
      const author = $('.imptdt:contains("Author") i').text().trim() || null;
      const artist = $('.imptdt:contains("Artist") i').text().trim() || null;
      const serialization = $('.imptdt:contains("Serialization") i').text().trim() || null;
      const views = $(".ts-views-count").text().trim() || null;
      const followers = $(".bmc").text().trim().replace(/Followed by\s*/, "") || null;
      const genres = $(".mgen a").get().map(a => $(a).text().trim()).filter(Boolean);
      const rating = this._parseRating($(".rating-prc, .rating"));
      const chapters = $("#chapterlist ul li").get().map(el => this._parseChapter($, el)).filter(ch => ch.number !== null);
      const firstChapter = chapters.length ? chapters[chapters.length - 1] : null;
      const lastChapter = chapters.length ? chapters[0] : null;
      const related = $(".listupd .bs").get().map(el => {
        const card = this._parseCard($, el);
        return card.title ? card : null;
      }).filter(Boolean);
      const sidebarPopular = [];
      $(".serieslist.pop ul li").each((_, li) => {
        const $li = $(li);
        const title = $li.find(".leftseries h2 a").text().trim();
        const link = $li.find(".leftseries h2 a").attr("href");
        const icon = $li.find(".imgseries img").attr("src") || null;
        const rating = this._parseRating($li);
        const genres = $li.find(".leftseries span a").get().map(a => $(a).text().trim()).filter(Boolean);
        let slug = null;
        if (link) {
          const parts = link.split("/").filter(Boolean);
          slug = parts.pop();
        }
        sidebarPopular.push({
          title: title,
          slug: slug,
          url: link ? link.startsWith("http") ? link : this.baseURL + link : null,
          icon: icon ? icon.startsWith("http") ? icon : this.baseURL + icon : null,
          rating: rating.value,
          rating_percent: rating.percent,
          genres: genres
        });
      });
      const breadcrumb = $(".ts-breadcrumb a").get().map(a => ({
        name: $(a).text().trim(),
        url: $(a).attr("href") ? $(a).attr("href").startsWith("http") ? $(a).attr("href") : this.baseURL + $(a).attr("href") : null
      }));
      const result = {
        title: title,
        alternative: alternative,
        synopsis: synopsis,
        cover: cover ? cover.startsWith("http") ? cover : this.baseURL + cover : null,
        status: statusText,
        type: type,
        released: released,
        author: author,
        artist: artist,
        serialization: serialization,
        views: views,
        followers: followers ? parseInt(followers.replace(/,/g, "")) : null,
        genres: genres,
        rating: rating.value,
        rating_percent: rating.percent,
        chapters: chapters,
        first_chapter: firstChapter,
        last_chapter: lastChapter,
        related: related,
        sidebar_popular: sidebarPopular,
        breadcrumb: breadcrumb,
        url: detailUrl
      };
      return {
        status: true,
        result: this._snakeKeys(result)
      };
    } catch (err) {
      console.error(`[detail] Error: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async chapter({
    url = null,
    slug = null,
    chapterSlug = null
  } = {}) {
    try {
      let chapterUrl = url;
      if (!chapterUrl) {
        if (!chapterSlug) {
          console.warn("[chapter] chapterSlug is missing");
          return {
            status: false,
            result: {
              error: 'Parameter "chapterSlug" wajib'
            }
          };
        }
        chapterUrl = `${this.baseURL}/${chapterSlug}/`;
      }
      console.log(`[chapter] Fetching: ${chapterUrl}`);
      const {
        status,
        result: html
      } = await this._req(chapterUrl);
      if (!status) return {
        status: false,
        result: {
          error: html.error
        }
      };
      const $ = cheerio.load(html);
      const title = $(".entry-title").text().trim() || $("h1.entry-title").text().trim();
      const images = $("#readerarea img.ts-main-image").get().map(img => $(img).attr("src")).filter(Boolean);
      const prevLink = $(".ch-prev-btn").attr("href") || null;
      const nextLink = $(".ch-next-btn").attr("href") || null;
      const chapterOptions = $("#chapter option").get().map(opt => {
        const $opt = $(opt);
        const value = $opt.val();
        const label = $opt.text().trim();
        const selected = $opt.prop("selected") || false;
        return {
          label: label,
          url: value && value !== "" ? value.startsWith("http") ? value : this.baseURL + value : null,
          selected: selected
        };
      }).filter(opt => opt.url !== null);
      const seriesLink = $(".allc a").attr("href") || null;
      const seriesTitle = $(".allc a").text().trim() || null;
      const breadcrumb = $(".ts-breadcrumb a").get().map(a => ({
        name: $(a).text().trim(),
        url: $(a).attr("href") ? $(a).attr("href").startsWith("http") ? $(a).attr("href") : this.baseURL + $(a).attr("href") : null
      }));
      const result = {
        title: title,
        images: images,
        total_pages: images.length,
        prev_url: prevLink ? prevLink.startsWith("http") ? prevLink : this.baseURL + prevLink : null,
        next_url: nextLink ? nextLink.startsWith("http") ? nextLink : this.baseURL + nextLink : null,
        chapter_options: chapterOptions,
        series_url: seriesLink ? seriesLink.startsWith("http") ? seriesLink : this.baseURL + seriesLink : null,
        series_title: seriesTitle,
        breadcrumb: breadcrumb,
        url: chapterUrl
      };
      return {
        status: true,
        result: this._snakeKeys(result)
      };
    } catch (err) {
      console.error(`[chapter] Error: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async download({
    url = null,
    slug = null,
    chapterSlug = null
  } = {}) {
    return this.chapter({
      url: url,
      slug: slug,
      chapterSlug: chapterSlug
    });
  }
}
export default async function handler(req, res) {
  const rawParams = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...params
  } = rawParams;
  const validActions = ["home", "search", "detail", "chapter", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&page=1",
          search: "/?action=search&query=nano+machine&type=manga",
          detail: "/?action=detail&slug=nano-machine",
          chapter: "/?action=chapter&chapterSlug=nano-machine-chapter-01"
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
  const options = {
    ...params
  };
  if (options.page) {
    options.page = parseInt(options.page, 10);
  }
  const api = new Manhwalist();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(options);
        break;
      case "search":
        if (!options.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=solo"
          });
        }
        response = await api.search(options);
        break;
      case "detail":
        if (!options.url && !options.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(options);
        break;
      case "chapter":
        if (!options.url && !options.chapterSlug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'chapterSlug' wajib diisi untuk action 'chapter'."
          });
        }
        response = await api.chapter(options);
        break;
      case "download":
        if (!options.url && !options.chapterSlug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'chapterSlug' wajib diisi untuk action 'download'."
          });
        }
        response = await api.download(options);
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
        error: "Tidak ada respons dari Manhwalist. Coba lagi nanti."
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