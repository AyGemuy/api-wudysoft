import axios from "axios";
import * as cheerio from "cheerio";
class Alqanime {
  constructor() {
    this.base = "https://alqanime.net";
    this.req = axios.create({
      baseURL: this.base,
      timeout: 25e3,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        referer: "https://alqanime.net/"
      }
    });
  }
  cln(str) {
    return str ? str.replace(/\s+/g, " ").trim() : "";
  }
  parseCard(_, el) {
    const title = _(".tt h2", el).text() || _(".tt .ntitle", el).text() || _(".eggtitle", el).text() || _("a", el).attr("title") || "";
    const url = _("a.tip", el).attr("href") || _("a", el).attr("href") || "";
    const thumbnail = _("img", el).attr("src") || _("img", el).attr("data-src") || _("img", el).attr("data-lazy-src") || "";
    const score = _(".numscore", el).text() || null;
    const type = _(".typez", el).text() || _(".eggtype", el).text() || "";
    const status = _(".status", el).text() || "";
    const episode = _(".bt .epx", el).text() || _(".eggepisode", el).text() || "";
    return {
      title: this.cln(title),
      url: url?.trim() || "",
      thumbnail: thumbnail?.trim() || "",
      score: score ? parseFloat(this.cln(score)) || null : null,
      type: this.cln(type) || null,
      status: this.cln(status) || null,
      episode: this.cln(episode) || null
    };
  }
  parseSidebarItem(_, el) {
    const title = _(".leftseries h4 a", el).text() || "";
    const url = _(".leftseries h4 a", el).attr("href") || _("a.series", el).attr("href") || "";
    const rank = parseInt(this.cln(_(".ctr", el).text()) || "0", 10) || null;
    const thumbnail = _(".imgseries img", el).attr("src") || "";
    const score = parseFloat(this.cln(_(".numscore", el).text())) || null;
    const genres = _('.leftseries span a[rel="tag"]', el).map((i, tag) => this.cln(_(tag).text())).get();
    return {
      rank: rank,
      title: this.cln(title),
      url: url?.trim() || "",
      thumbnail: thumbnail?.trim() || "",
      score: score,
      genres: genres || []
    };
  }
  async getHome({
    ...rest
  } = {}) {
    console.log("[Alqanime] Memulai proses getHome...");
    try {
      const {
        data
      } = await this.req.get("/", {
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Alqanime] Parsing bagian slider hangat...");
      const hot_slider = _(".popularslider .popconslide article.bs").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Alqanime] Parsing bagian rilisan terbaru...");
      const latest_releases = _(".latestdark .excstf article.bs").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Alqanime] Parsing bagian anime selesai tayang...");
      const completed_section = _(".bixbox").filter((i, el) => _(".releases h3", el).text().includes("Selesai Tayang")).find(".excstf article.bs").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Alqanime] Parsing bagian film layar lebar...");
      const movie_section = _(".bixbox").filter((i, el) => _(".releases h3", el).text().includes("Film Layar Lebar")).find(".excstf article.bs").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Alqanime] Parsing sidebar: ongoing anime...");
      const ongoing_sidebar = _(".ongoingseries ul li a").map((i, el) => ({
        title: this.cln(_(el).find(".l").text()),
        url: _(el).attr("href") || "",
        episode: this.cln(_(el).find(".r").text())
      })).get();
      console.log("[Alqanime] Parsing sidebar: tab populer...");
      const popular_weekly = _(".wpop-weekly ul li").map((i, el) => this.parseSidebarItem(_, el)).get();
      const popular_monthly = _(".wpop-monthly ul li").map((i, el) => this.parseSidebarItem(_, el)).get();
      const popular_alltime = _(".wpop-alltime ul li").map((i, el) => this.parseSidebarItem(_, el)).get();
      console.log("[Alqanime] Sukses memproses seluruh data getHome.");
      return {
        status: true,
        result: {
          hot_slider: hot_slider || [],
          latest_releases: latest_releases || [],
          completed: completed_section || [],
          movies: movie_section || [],
          ongoing: ongoing_sidebar || [],
          popular: {
            weekly: popular_weekly || [],
            monthly: popular_monthly || [],
            all_time: popular_alltime || []
          }
        }
      };
    } catch (err) {
      console.error(`[Alqanime] Error getHome: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memuat beranda"
      };
    }
  }
  async getLatest({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[Alqanime] Memulai getLatest - Halaman: ${page}...`);
    try {
      const endpoint = page > 1 ? `/page/${page}/` : "/";
      const {
        data
      } = await this.req.get(endpoint, {
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Alqanime] Mengekstrak list card rilisan...");
      const items = _(".latestdark .excstf article.bs").map((i, el) => this.parseCard(_, el)).get();
      const current_page = parseInt(this.cln(_(".pagination .page-numbers.current").text()) || `${page}`, 10);
      const total_pages = parseInt(this.cln(_(".pagination .page-numbers.last").text().replace(/[^0-9]/g, "")) || _(".pagination a.page-numbers").not(".next, .prev").last().text().trim() || "1", 10);
      const has_next_page = _(".pagination .page-numbers.next").length > 0;
      const has_prev_page = _(".pagination .page-numbers.prev").length > 0;
      console.log(`[Alqanime] getLatest berhasil dimuat (${items.length} item ditemukan).`);
      return {
        status: true,
        result: {
          current_page: current_page || 1,
          total_pages: total_pages || 1,
          has_next_page: has_next_page || false,
          has_prev_page: has_prev_page || false,
          data: items || []
        }
      };
    } catch (err) {
      console.error(`[Alqanime] Error getLatest: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal mengambil data rilisan terbaru"
      };
    }
  }
  async searchAnime({
    query = "",
    page = 1,
    ...rest
  } = {}) {
    console.log(`[Alqanime] Memulai searchAnime untuk keyword: "${query}" (Page: ${page})...`);
    try {
      const endpoint = page > 1 ? `/page/${page}/` : "/";
      const {
        data
      } = await this.req.get(endpoint, {
        params: {
          s: query
        },
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Alqanime] Mem-parsing hasil pencarian...");
      const results = _(".listupd article.bs").map((i, el) => this.parseCard(_, el)).get();
      const current_page = parseInt(this.cln(_(".pagination .page-numbers.current").text()) || `${page}`, 10);
      const total_pages = parseInt(this.cln(_(".pagination a.page-numbers").not(".next, .prev").last().text()) || `${current_page}`, 10);
      const has_next_page = _(".pagination .page-numbers.next").length > 0;
      const has_prev_page = _(".pagination .page-numbers.prev").length > 0;
      console.log(`[Alqanime] searchAnime selesai. Ditemukan: ${results.length} anime.`);
      return {
        status: true,
        result: {
          query: query,
          current_page: current_page || 1,
          total_pages: total_pages || 1,
          has_next_page: has_next_page || false,
          has_prev_page: has_prev_page || false,
          data: results || []
        }
      };
    } catch (err) {
      console.error(`[Alqanime] Error searchAnime: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal melakukan pencarian anime"
      };
    }
  }
  async getDetail({
    url,
    ...rest
  } = {}) {
    console.log(`[Alqanime] Memulai getDetail - Target: ${url}...`);
    try {
      if (!url) {
        throw new Error('Parameter "url" wajib disertakan.');
      }
      const {
        data
      } = await this.req.get(url, {
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Alqanime] Ekstraksi metadata utama...");
      const title = this.cln(_("h1.entry-title").text() || "");
      const thumbnail = _(".thumbook .thumb img").attr("src") || _(".thumbook .thumb img").attr("data-src") || "";
      const cover = _(".bigcover .ime img").attr("src") || null;
      const score = parseFloat(this.cln(_(".thumbook .rt .rating strong").text().replace(/score/i, ""))) || null;
      const synopsis = this.cln(_(".synp .entry-content").text() || "");
      const trailer = _(".thumbook a.trailerbutton").attr("href") || null;
      const alternative_title = this.cln(_(".infox .alter").text() || "");
      const followers = this.cln(_(".thumbook .bmc").text() || "");
      const meta = {};
      _(".spe span").each((i, el) => {
        const key = this.cln(_("b", el).text()?.replace(/:/g, "") || "").toLowerCase().replace(/\s+/g, "_");
        if (key) {
          const val = this.cln(_(el).clone().children("b").remove().end().text() || "");
          meta[key] = val;
        }
      });
      const genres = _(".genxed a").map((i, el) => ({
        title: this.cln(_(el).text()),
        url: _(el).attr("href") || ""
      })).get();
      const casts = _(".spe span.split a.casts").map((i, el) => ({
        name: this.cln(_(el).text()),
        url: _(el).attr("href") || ""
      })).get();
      console.log("[Alqanime] Ekstraksi semua resolusi dan mirror link download...");
      const downloads = [];
      _(".soraddl").each((i, block) => {
        const title = this.cln(_(".sorattl h3", block).text() || "");
        const items = [];
        _(".content table tr", block).each((j, row) => {
          const resolution = this.cln(_("td.reso .res", row).text() || "");
          const servers = [];
          _("td .slink a", row).each((k, anchor) => {
            const server_name = this.cln(_(anchor).text() || "");
            const server_url = _(anchor).attr("href") || "";
            if (server_name && server_url) {
              servers.push({
                server: server_name,
                url: server_url
              });
            }
          });
          if (resolution) {
            items.push({
              resolution: resolution,
              servers: servers
            });
          }
        });
        if (title) {
          downloads.push({
            title: title,
            items: items
          });
        }
      });
      console.log("[Alqanime] Mengekstrak daftar anime rekomendasi terkait...");
      const recommendations = _(".listupd article.bs").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Alqanime] Sukses memproses getDetail.");
      return {
        status: true,
        result: {
          title: title,
          alternative_title: alternative_title || null,
          thumbnail: thumbnail || null,
          cover: cover || null,
          score: score,
          followers: followers || null,
          synopsis: synopsis || null,
          trailer: trailer || null,
          status: meta?.status || null,
          studio: meta?.studio || null,
          released: meta?.dirilis || null,
          duration: meta?.durasi || null,
          season: meta?.musim || null,
          type: meta?.tipe || null,
          episodes_count: meta?.episode || null,
          subtitle: meta?.subtitle || null,
          credit: meta?.credit || null,
          genres: genres || [],
          casts: casts || [],
          downloads: downloads || [],
          recommendations: recommendations || []
        }
      };
    } catch (err) {
      console.error(`[Alqanime] Error getDetail: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memuat detail anime"
      };
    }
  }
  async getFilter({
    genre = [],
    season = [],
    studio = [],
    status = "",
    type = [],
    order = "",
    page = 1,
    ...rest
  } = {}) {
    console.log(`[Alqanime] Memulai getFilter (Halaman: ${page})...`);
    try {
      const endpoint = page > 1 ? `/page/${page}/` : "/";
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (order) params.append("order", order);
      genre.forEach(g => params.append("genre[]", g));
      season.forEach(s => params.append("season[]", s));
      studio.forEach(st => params.append("studio[]", st));
      type.forEach(t => params.append("type[]", t));
      console.log(`[Alqanime] Mengirim query filter: ${params.toString()}`);
      const {
        data
      } = await this.req.get(`/advanced-search${endpoint}`, {
        params: params,
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Alqanime] Mem-parsing hasil filter...");
      const results = _(".listupd article.bs").map((i, el) => this.parseCard(_, el)).get();
      const current_page = parseInt(this.cln(_(".pagination .page-numbers.current").text()) || `${page}`, 10);
      const total_pages = parseInt(this.cln(_(".pagination a.page-numbers").not(".next, .prev").last().text()) || `${current_page}`, 10);
      const has_next_page = _(".pagination .page-numbers.next").length > 0;
      const has_prev_page = _(".pagination .page-numbers.prev").length > 0;
      console.log(`[Alqanime] Filter berhasil dimuat. Total item: ${results.length}.`);
      return {
        status: true,
        result: {
          current_page: current_page || 1,
          total_pages: total_pages || 1,
          has_next_page: has_next_page || false,
          has_prev_page: has_prev_page || false,
          applied_filters: {
            genre: genre,
            season: season,
            studio: studio,
            status: status,
            type: type,
            order: order
          },
          data: results || []
        }
      };
    } catch (err) {
      console.error(`[Alqanime] Error getFilter: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memfilter anime"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "latest", "search", "detail", "filter", "completed", "movies", "popular", "ongoing"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          latest: "/?action=latest&page=1",
          search: "/?action=search&query=Kami&page=1",
          detail: "/?action=detail&url=https://alqanime.net/kamiina-botan-yoeru-sugata-wa-yuri-no-hana/",
          filter: "/?action=filter&status=completed&order=popular&type=tv&genre=action&page=1",
          completed: "/?action=completed&page=1",
          movies: "/?action=movies&page=1",
          popular: "/?action=popular&range=weekly",
          ongoing: "/?action=ongoing"
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
  const api = new Alqanime();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.getHome(params);
        break;
      case "latest":
        response = await api.getLatest({
          page: parseInt(params.page || "1", 10),
          ...params
        });
        break;
      case "search": {
        const query = params.query || params.q || params.title || params.s;
        if (!query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query', 'q', atau 'title' wajib diisi untuk search."
          });
        }
        response = await api.searchAnime({
          query: query,
          page: parseInt(params.page || "1", 10),
          ...params
        });
        break;
      }
      case "detail": {
        let targetUrl = params.url || params.link;
        if (!targetUrl && params.slug) {
          targetUrl = `https://alqanime.net/${params.slug.replace(/^\/+|\/+$/g, "")}/`;
        }
        if (!targetUrl) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk detail."
          });
        }
        response = await api.getDetail({
          url: targetUrl,
          ...params
        });
        break;
      }
      case "filter": {
        const toArray = val => {
          if (!val) return [];
          return Array.isArray(val) ? val : [val];
        };
        response = await api.getFilter({
          genre: toArray(params.genre || params["genre[]"]),
          season: toArray(params.season || params["season[]"]),
          studio: toArray(params.studio || params["studio[]"]),
          type: toArray(params.type || params["type[]"]),
          status: params.status || "",
          order: params.order || "",
          page: parseInt(params.page || "1", 10),
          ...params
        });
        break;
      }
      case "completed":
        response = await api.getFilter({
          status: "completed",
          order: params.order || "update",
          page: parseInt(params.page || "1", 10),
          ...params
        });
        break;
      case "movies":
        response = await api.getFilter({
          type: ["movie"],
          order: params.order || "update",
          page: parseInt(params.page || "1", 10),
          ...params
        });
        break;
      case "popular": {
        const homeData = await api.getHome(params);
        if (!homeData?.status) {
          response = homeData;
        } else {
          const range = (params.range || params.period || "all").toLowerCase();
          let list = homeData.result?.popular?.all_time || [];
          if (range === "weekly" || range === "week") {
            list = homeData.result?.popular?.weekly || [];
          } else if (range === "monthly" || range === "month") {
            list = homeData.result?.popular?.monthly || [];
          }
          response = {
            status: true,
            result: {
              range: range,
              data: list
            }
          };
        }
        break;
      }
      case "ongoing": {
        const homeData = await api.getHome(params);
        if (!homeData?.status) {
          response = homeData;
        } else {
          response = {
            status: true,
            result: {
              data: homeData.result?.ongoing || []
            }
          };
        }
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
    return res.status(200).json({
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