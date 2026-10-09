import axios from "axios";
import * as cheerio from "cheerio";
class AnichinScraper {
  constructor() {
    this.baseUrl = "https://anichin.moe";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 35e3,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        referer: "https://anichin.care/"
      }
    });
  }
  cl(str) {
    try {
      return (str || "").replace(/\s+/g, " ").trim();
    } catch {
      return "";
    }
  }
  th(u) {
    try {
      if (!u) return "";
      return u.startsWith("http") ? u : `${this.baseUrl}${u.startsWith("/") ? "" : "/"}${u}`;
    } catch {
      return "";
    }
  }
  buildUrl(input) {
    try {
      if (!input) return this.baseUrl;
      if (input.startsWith("http")) return input;
      const cleanPath = input.replace(/^\/+|\/+$/g, "");
      return `${this.baseUrl}/${cleanPath}/`;
    } catch {
      return this.baseUrl;
    }
  }
  parseCardTitle($el) {
    try {
      const headline = this.cl($el.find('.tt [itemprop="headline"], h2[itemprop="headline"]').text());
      if (headline) return headline;
      const tt = $el.find(".tt");
      if (tt.length) {
        const clone = tt.clone();
        clone.find("h2").remove();
        const baseTitle = this.cl(clone.text());
        if (baseTitle) return baseTitle;
      }
      return this.cl($el.find("a").first().attr("title")) || null;
    } catch {
      return null;
    }
  }
  parseCard(_, el, $) {
    try {
      const $el = $(el);
      const linkEl = $el.find("a").first();
      const href = linkEl.attr("href") || "";
      const imgEl = $el.find("img").first();
      const imgUrl = imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src") || "";
      return {
        title: this.parseCardTitle($el),
        url: this.th(href),
        thumbnail: this.th(imgUrl),
        type: this.cl($el.find(".typez").text()) || null,
        episode: this.cl($el.find(".bt .epx").text()) || null,
        sub_status: this.cl($el.find(".bt .sb").text()) || null,
        status: this.cl($el.find(".status").text()) || null,
        is_hot: $el.find(".hotbadge").length > 0
      };
    } catch (err) {
      console.error("[Anichin Helper Error] parseCard:", err?.message || err);
      return {};
    }
  }
  parseSeriesItem(_, el, $) {
    try {
      const $el = $(el);
      const titleLink = $el.find(".leftseries h4 a, h4 a, .series, .imgseries a, a.series").first();
      const href = titleLink.attr("href") || $el.find("a").first().attr("href") || "";
      const img = $el.find("img").first();
      let title = this.cl(titleLink.text());
      if (!title) {
        title = this.cl(titleLink.attr("title")) || this.cl(img.attr("title")) || this.cl(img.attr("alt")) || this.cl($el.find(".leftseries h4").text()) || null;
      }
      const genres = $el.find('.leftseries span a[rel="tag"]').map((__, g) => this.cl($(g).text())).get();
      return {
        rank: Number(this.cl($el.find(".ctr").text())) || null,
        title: title,
        url: this.th(href),
        thumbnail: this.th(img.attr("src") || img.attr("data-src") || ""),
        rating: parseFloat(this.cl($el.find(".numscore").text())) || null,
        genres: genres || [],
        extra_info: this.cl($el.find(".leftseries > span:last-child").not(":has(a)").text()) || null
      };
    } catch (err) {
      console.error("[Anichin Helper Error] parseSeriesItem:", err?.message || err);
      return {};
    }
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[Anichin] Mengambil data lengkap Homepage - Page ${page}...`);
      const path = page > 1 ? `/page/${page}/` : "/";
      const {
        data
      } = await this.client.get(path, {
        params: rest
      });
      const $ = cheerio.load(data);
      const slider = $("#slidertwo .swiper-slide").map((_, el) => {
        try {
          const $el = $(el);
          const bgStyle = $el.find(".backdrop").attr("style") || "";
          const bgMatch = bgStyle.match(/url\('(.*?)'\)/);
          const backdrop = bgMatch ? bgMatch[1] : "";
          const a = $el.find(".info h2 a");
          return {
            title: this.cl(a.text()),
            url: this.th(a.attr("href") || ""),
            backdrop: this.th(backdrop),
            synopsis: this.cl($el.find(".info p").text())
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      const popularToday = $(".bixbox:has(.releases.hothome) .popularslider article.bs").map((idx, el) => this.parseCard(idx, el, $)).get();
      const latestReleases = $(".bixbox:has(.releases.latesthome) .listupd.normal article.bs").map((idx, el) => this.parseCard(idx, el, $)).get();
      const movies = $('.bixbox:has(.releases:contains("Movie"))').first().find("article.bs").map((idx, el) => this.parseCard(idx, el, $)).get();
      const upcoming = $('.bixbox:has(.releases:contains("Upcoming Donghua")) article.bs').map((idx, el) => this.parseCard(idx, el, $)).get();
      const dropped = $('.bixbox:has(.releases:contains("Dropped Project")) article.bs').map((idx, el) => this.parseCard(idx, el, $)).get();
      const recommendations = {};
      $(".series-gen .nav-tabs li a").each((_, tab) => {
        try {
          const genreName = this.cl($(tab).text()).toLowerCase().replace(/\s+/g, "_");
          const targetId = $(tab).attr("href");
          if (targetId) {
            recommendations[genreName] = $(`${targetId} article.bs`).map((idx, el) => this.parseCard(idx, el, $)).get();
          }
        } catch {}
      });
      const blogs = $(".bloglist article.blogbox").map((_, el) => {
        try {
          const $el = $(el);
          const a = $el.find(".entry-title a");
          return {
            title: this.cl(a.text()),
            url: this.th(a.attr("href") || ""),
            thumbnail: this.th($el.find(".thumb img").attr("src") || ""),
            category: this.cl($el.find(".btags").text()) || null,
            excerpt: this.cl($el.find(".entry-content").text()) || null,
            author: this.cl($el.find(".author .fn").text()) || null,
            published_date: this.cl($el.find('time[itemprop="datePublished"]').text()) || null
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      const ongoingSeries = $("#sidebar .ongoingseries ul li").map((_, el) => {
        try {
          const a = $(el).find("a");
          return {
            title: this.cl(a.find(".l").text()),
            url: this.th(a.attr("href") || ""),
            latest_episode: this.cl(a.find(".r").text())
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      const popularRankings = {
        weekly: $("#sidebar .wpop-weekly ul li").map((idx, el) => this.parseSeriesItem(idx, el, $)).get(),
        monthly: $("#sidebar .wpop-monthly ul li").map((idx, el) => this.parseSeriesItem(idx, el, $)).get(),
        all_time: $("#sidebar .wpop-alltime ul li").map((idx, el) => this.parseSeriesItem(idx, el, $)).get()
      };
      const newDonghua = $('#sidebar .section:has(h3:contains("Donghua Baru")) .serieslist ul li').map((idx, el) => this.parseSeriesItem(idx, el, $)).get();
      const newMovies = $('#sidebar .section:has(h3:contains("Movie Baru")) .serieslist ul li').map((idx, el) => this.parseSeriesItem(idx, el, $)).get();
      console.log(`[Anichin] Berhasil mengekstrak semua elemen homepage.`);
      return {
        status: true,
        result: {
          pagination: {
            current_page: Number(page) || 1,
            has_next: $(".hpage a.r").length > 0,
            has_prev: $(".hpage a.l").length > 0
          },
          slider: slider,
          popular_today: popularToday,
          latest_releases: latestReleases,
          movies: movies,
          upcoming: upcoming,
          dropped_projects: dropped,
          recommendations: recommendations,
          blogs: blogs,
          sidebar: {
            ongoing_series: ongoingSeries,
            popular_rankings: popularRankings,
            new_donghua: newDonghua,
            new_movies: newMovies
          }
        }
      };
    } catch (err) {
      console.error(`[Anichin Error] home():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal memproses beranda"
      };
    }
  }
  async filters({
    ...rest
  } = {}) {
    try {
      console.log("[Anichin] Mengambil metadata filter...");
      const {
        data
      } = await this.client.get("/anime/", {
        params: rest
      });
      const $ = cheerio.load(data);
      const parseDropdown = (selector, inputName) => {
        try {
          return $(selector).find(`input[name^="${inputName}"]`).map((_, el) => ({
            name: this.cl($(el).next("label").text()),
            value: $(el).attr("value") || ""
          })).get();
        } catch {
          return [];
        }
      };
      const genres = parseDropdown('.quickfilter .filter:has(button:contains("Genre"))', "genre");
      const seasons = parseDropdown('.quickfilter .filter:has(button:contains("Season"))', "season");
      const studios = parseDropdown('.quickfilter .filter:has(button:contains("Studio"))', "studio");
      const statuses = parseDropdown('.quickfilter .filter:has(button:contains("Status"))', "status");
      const types = parseDropdown('.quickfilter .filter:has(button:contains("Type"))', "type");
      const order = parseDropdown('.quickfilter .filter:has(button:contains("Order"))', "order");
      console.log("[Anichin] Berhasil mendapatkan parameter filter.");
      return {
        status: true,
        result: {
          genres: genres,
          seasons: seasons,
          studios: studios,
          statuses: statuses,
          types: types,
          order: order
        }
      };
    } catch (err) {
      console.error(`[Anichin Error] filters():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal memuat filter pencarian"
      };
    }
  }
  async filter({
    page = 1,
    genre = [],
    season = [],
    studio = [],
    status = "",
    type = "",
    order = "",
    ...rest
  } = {}) {
    try {
      console.log(`[Anichin] Filtering donghua (Page ${page})...`);
      const path = page > 1 ? `/anime/page/${page}/` : "/anime/";
      const params = {
        "genre[]": Array.isArray(genre) ? genre : [genre],
        "season[]": Array.isArray(season) ? season : [season],
        "studio[]": Array.isArray(studio) ? studio : [studio],
        status: status,
        type: type,
        order: order,
        ...rest
      };
      const {
        data
      } = await this.client.get(path, {
        params: params
      });
      const $ = cheerio.load(data);
      const items = $(".postbody .listupd article.bs").map((idx, el) => this.parseCard(idx, el, $)).get();
      const paginationEl = $(".pagination");
      const totalPages = paginationEl.find(".page-numbers:not(.next):not(.prev)").last().text() || page;
      console.log(`[Anichin] Filter selesai. Total item: ${items?.length || 0}`);
      return {
        status: true,
        result: {
          current_page: Number(page) || 1,
          total_pages: Number(totalPages) || 1,
          has_next: paginationEl.find(".next.page-numbers").length > 0,
          has_prev: paginationEl.find(".prev.page-numbers").length > 0,
          donghua_list: items || []
        }
      };
    } catch (err) {
      console.error(`[Anichin Error] filter():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal memproses filter"
      };
    }
  }
  async search({
    s = "",
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[Anichin] Searching for '${s}' - Page ${page}...`);
      const path = page > 1 ? `/page/${page}/` : "/";
      const {
        data
      } = await this.client.get(path, {
        params: {
          s: s,
          ...rest
        }
      });
      const $ = cheerio.load(data);
      const items = $(".postbody .listupd article.bs").map((idx, el) => this.parseCard(idx, el, $)).get();
      const paginationEl = $(".pagination");
      const totalPages = paginationEl.find(".page-numbers:not(.next):not(.prev)").last().text() || page;
      console.log(`[Anichin] Pencarian selesai. Ditemukan ${items?.length || 0} hasil.`);
      return {
        status: true,
        result: {
          query: s,
          current_page: Number(page) || 1,
          total_pages: Number(totalPages) || 1,
          has_next: paginationEl.find(".next.page-numbers").length > 0,
          has_prev: paginationEl.find(".prev.page-numbers").length > 0,
          donghua_list: items || []
        }
      };
    } catch (err) {
      console.error(`[Anichin Error] search():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal melakukan pencarian"
      };
    }
  }
  async detail({
    url,
    slug,
    ...rest
  } = {}) {
    try {
      const targetInput = url || slug;
      if (!targetInput) throw new Error('Parameter "url" atau "slug" wajib diisi.');
      const targetUrl = this.buildUrl(targetInput);
      console.log(`[Anichin] Mendapatkan detail dari: ${targetUrl}...`);
      const {
        data
      } = await this.client.get(targetUrl, {
        params: rest
      });
      const $ = cheerio.load(data);
      const title = this.cl($("h1.entry-title").text()) || null;
      const alternativeTitle = this.cl($(".infox .alter").text()) || null;
      const synopsis = this.cl($(".bixbox.synp .entry-content").text()) || null;
      const thumbnail = this.th($(".thumbook .thumb img").attr("src") || $(".bigcontent .thumb img").attr("src"));
      const cover = this.th($(".bigcover img").attr("src") || "");
      const rating = parseFloat(this.cl($(".rating strong").text()).replace(/Rating\s*/i, "")) || null;
      const followers = this.cl($(".thumbook .bmc").text()) || null;
      const trailer = $(".trailerbutton").attr("href") || null;
      const info = {};
      $(".spe span").each((_, el) => {
        try {
          const text = $(el).text();
          const [k, ...v] = text.split(":");
          if (k && v?.length) {
            const key = this.cl(k).toLowerCase().replace(/\s+/g, "_");
            info[key] = this.cl(v.join(":"));
          }
        } catch {}
      });
      const genres = $(".genxed a").map((_, el) => this.cl($(el).text())).get();
      const tags = $(".bottom.tags a").map((_, el) => this.cl($(el).text())).get();
      const episodes = $(".eplister ul li").map((_, el) => {
        try {
          const $li = $(el);
          const a = $li.find("a");
          return {
            episode_number: this.cl($li.find(".epl-num").text()) || null,
            title: this.cl($li.find(".epl-title").text()) || null,
            url: this.th(a.attr("href") || ""),
            sub_status: this.cl($li.find(".epl-sub").text()) || null,
            release_date: this.cl($li.find(".epl-date").text()) || null
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      const batches = [];
      $(".soraddlx").each((_, el) => {
        try {
          const $batch = $(el);
          const batchTitle = this.cl($batch.find(".sorattlx").text()) || null;
          const links = [];
          $batch.find(".soraurlx").each((_, sub) => {
            const $sub = $(sub);
            const resolution = this.cl($sub.find("strong").text()) || null;
            const servers = $sub.find("a").map((__, a) => ({
              server: this.cl($(a).text()),
              url: $(a).attr("href") || ""
            })).get();
            links.push({
              resolution: resolution,
              servers: servers
            });
          });
          batches.push({
            batch_title: batchTitle,
            downloads: links
          });
        } catch {}
      });
      const relatedSeries = $('.bixbox:has(.releases:contains("Rekomendasi Series")) article.bs').map((idx, el) => this.parseCard(idx, el, $)).get();
      console.log(`[Anichin] Detail '${title}' selesai diproses.`);
      return {
        status: true,
        result: {
          title: title,
          alternative_title: alternativeTitle,
          thumbnail: thumbnail,
          cover: cover,
          rating: rating,
          followers: followers,
          trailer_url: trailer,
          synopsis: synopsis,
          genres: genres,
          tags: tags,
          details: info,
          episodes: episodes,
          batch_downloads: batches,
          related_series: relatedSeries
        }
      };
    } catch (err) {
      console.error(`[Anichin Error] detail():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal memproses detail series"
      };
    }
  }
  async episode({
    url,
    slug,
    ...rest
  } = {}) {
    try {
      const targetInput = url || slug;
      if (!targetInput) throw new Error('Parameter "url" atau "slug" wajib diisi.');
      const targetUrl = this.buildUrl(targetInput);
      console.log(`[Anichin] Mengambil data pemutar video: ${targetUrl}...`);
      const {
        data
      } = await this.client.get(targetUrl, {
        params: rest
      });
      const $ = cheerio.load(data);
      const title = this.cl($("h1.entry-title").text()) || null;
      const defaultIframe = $("#pembed iframe").attr("src") || null;
      const streamServers = [];
      $("select.mirror option").each((_, el) => {
        try {
          const $opt = $(el);
          const name = this.cl($opt.text());
          const rawValue = $opt.attr("value") || "";
          if (rawValue && name && !name.toLowerCase().includes("pilih server")) {
            let embedUrl = rawValue;
            try {
              const decoded = Buffer.from(rawValue, "base64").toString("utf-8");
              const $frame = cheerio.load(decoded);
              embedUrl = $frame("iframe").attr("src") || decoded;
            } catch {}
            streamServers.push({
              server_name: name,
              embed_url: embedUrl
            });
          }
        } catch {}
      });
      const nav = {
        prev: $('.naveps .nvs a[rel="prev"]').attr("href") || null,
        all_episodes: $(".naveps .nvsc a").attr("href") || null,
        next: $('.naveps .nvs a[rel="next"]').attr("href") || null
      };
      const downloads = [];
      $(".soraddlx .soraurlx").each((_, el) => {
        try {
          const $dl = $(el);
          const resolution = this.cl($dl.find("strong").text()) || null;
          const servers = $dl.find("a").map((__, a) => ({
            server: this.cl($(a).text()),
            url: $(a).attr("href") || ""
          })).get();
          downloads.push({
            resolution: resolution,
            servers: servers
          });
        } catch {}
      });
      const sidebarEpisodes = $("#singlepisode .episodelist ul li").map((_, el) => {
        try {
          const $el = $(el);
          const a = $el.find("a");
          return {
            id: $el.attr("data-id") || null,
            title: this.cl($el.find(".playinfo h3").text()),
            url: this.th(a.attr("href") || ""),
            thumbnail: this.th($el.find("img").attr("src") || ""),
            info: this.cl($el.find(".playinfo span").text())
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      console.log(`[Anichin] Episode '${title}' berhasil diambil.`);
      return {
        status: true,
        result: {
          title: title,
          default_embed: defaultIframe,
          stream_servers: streamServers,
          downloads: downloads,
          navigation: nav,
          sidebar_episodes: sidebarEpisodes
        }
      };
    } catch (err) {
      console.error(`[Anichin Error] episode():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal memproses episode"
      };
    }
  }
  async schedule({
    ...rest
  } = {}) {
    try {
      console.log(`[Anichin] Mengambil data jadwal rilis...`);
      const {
        data
      } = await this.client.get("/schedule/", {
        params: rest
      });
      const $ = cheerio.load(data);
      const daysMapping = {
        sch_monday: "senin",
        sch_tuesday: "selasa",
        sch_wednesday: "rabu",
        sch_thursday: "kamis",
        sch_friday: "jumat",
        sch_saturday: "sabtu",
        sch_sunday: "minggu"
      };
      const schedules = {};
      Object.entries(daysMapping).forEach(([cls, day]) => {
        try {
          schedules[day] = $(`.bixbox.schedulepage.${cls} .listupd .bs`).map((_, el) => {
            const $el = $(el);
            const a = $el.find("a");
            const href = a.attr("href") || "";
            const img = $el.find("img").attr("src") || "";
            const countdownEl = $el.find(".bt .epx");
            return {
              title: this.cl($el.find(".tt").text()),
              url: this.th(href),
              thumbnail: this.th(img),
              time: this.cl(countdownEl.text()),
              countdown_seconds: Number(countdownEl.attr("data-cndwn")) || null,
              latest_episode: this.cl($el.find(".bt .sb").text()) || null
            };
          }).get();
        } catch {
          schedules[day] = [];
        }
      });
      console.log(`[Anichin] Jadwal berhasil didapatkan.`);
      return {
        status: true,
        result: schedules
      };
    } catch (err) {
      console.error(`[Anichin Error] schedule():`, err?.message || err);
      return {
        status: false,
        result: err?.message || "Gagal memproses jadwal"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body || {};
  const {
    action,
    ...rest
  } = params;
  const validActions = ["home", "latest", "popular", "search", "detail", "episode", "schedule", "filters", "filter"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&page=1",
          latest: "/?action=latest&page=1",
          popular: "/?action=popular",
          search: "/?action=search&query=Ding&page=1",
          detail: "/?action=detail&slug=ancient-war-soul",
          episode: "/?action=episode&slug=ancient-war-soul-episode-01-subtitle-indonesia",
          schedule: "/?action=schedule",
          filters: "/?action=filters",
          filter: "/?action=filter&genre=action&status=completed&order=popular&page=1"
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
  const api = new AnichinScraper();
  try {
    let response;
    switch (action) {
      case "home": {
        const page = Number(rest.page) || 1;
        response = await api.home({
          page: page,
          ...rest
        });
        break;
      }
      case "latest": {
        const page = Number(rest.page) || 1;
        const homeData = await api.home({
          page: page,
          ...rest
        });
        response = homeData.status ? {
          status: true,
          result: {
            pagination: homeData.result.pagination,
            donghua_list: homeData.result.latest_releases
          }
        } : homeData;
        break;
      }
      case "popular": {
        const homeData = await api.home(rest);
        response = homeData.status ? {
          status: true,
          result: {
            today: homeData.result.popular_today,
            rankings: homeData.result.sidebar.popular_rankings
          }
        } : homeData;
        break;
      }
      case "search": {
        const query = rest.query || rest.q || rest.s || rest.title;
        if (!query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query', 'q', atau 's' wajib diisi untuk search."
          });
        }
        const page = Number(rest.page) || 1;
        response = await api.search({
          s: query,
          page: page,
          ...rest
        });
        break;
      }
      case "detail": {
        const slug = rest.slug || rest.id || rest.url;
        if (!slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' atau 'url' wajib diisi untuk detail."
          });
        }
        response = await api.detail({
          slug: slug,
          url: slug,
          ...rest
        });
        break;
      }
      case "episode": {
        const slug = rest.slug || rest.id || rest.url || rest.episodeSlug;
        if (!slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' atau 'url' wajib diisi untuk episode."
          });
        }
        response = await api.episode({
          slug: slug,
          url: slug,
          ...rest
        });
        break;
      }
      case "schedule": {
        response = await api.schedule(rest);
        break;
      }
      case "filters": {
        response = await api.filters(rest);
        break;
      }
      case "filter": {
        const page = Number(rest.page) || 1;
        response = await api.filter({
          page: page,
          ...rest
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    return res.status(response.status ? 200 : 500).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}