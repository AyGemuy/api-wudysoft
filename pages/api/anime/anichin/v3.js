import axios from "axios";
import * as cheerio from "cheerio";
class AnichinScraper {
  constructor() {
    this.baseUrl = "https://anichin.tv";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 35e3,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9",
        referer: "https://anichin.tv/"
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
      return u?.startsWith("http") ? u : `${this.baseUrl}${u?.startsWith("/") ? "" : "/"}${u || ""}`;
    } catch {
      return "";
    }
  }
  bu(input) {
    try {
      if (!input) return this.baseUrl;
      if (input?.startsWith("http")) return input;
      const path = input.replace(/^\/+|\/+$/g, "");
      return `${this.baseUrl}/${path}/`;
    } catch {
      return this.baseUrl;
    }
  }
  pc(_, el, $) {
    try {
      const $el = $(el);
      const link = $el.find("a").first();
      const href = link.attr("href") || "";
      const img = $el.find("img").first();
      const thumb = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "";
      let title = this.cl($el.find('.tt h2[itemprop="headline"]').text());
      if (!title) {
        const tt = $el.find(".tt").clone();
        tt.find("h2").remove();
        title = this.cl(tt.text()) || this.cl(link.attr("title")) || "";
      }
      return {
        title: title || null,
        url: this.th(href),
        thumbnail: this.th(thumb),
        type: this.cl($el.find(".typez").text()) || null,
        episode: this.cl($el.find(".bt .epx").text()) || null,
        sub_status: this.cl($el.find(".bt .sb").text()) || null,
        status: this.cl($el.find(".status").text()) || null,
        is_hot: $el.find(".hotbadge").length > 0
      };
    } catch (e) {
      console.log(`[Helper pc] Error parsing item: ${e?.message || e}`);
      return {};
    }
  }
  ps(_, el, $) {
    try {
      const $el = $(el);
      const link = $el.find(".leftseries h4 a, h4 a, a.series").first();
      const href = link.attr("href") || $el.find("a").first().attr("href") || "";
      const img = $el.find("img").first();
      const title = this.cl(link.text()) || this.cl(link.attr("title")) || this.cl(img.attr("title")) || null;
      const genres = $el.find('.leftseries span a[rel="tag"]').map((__, g) => this.cl($(g).text())).get();
      const ratingText = this.cl($el.find(".numscore").text());
      return {
        rank: Number(this.cl($el.find(".ctr").text())) || null,
        title: title,
        url: this.th(href),
        thumbnail: this.th(img.attr("src") || img.attr("data-src") || ""),
        rating: ratingText ? parseFloat(ratingText) : null,
        genres: genres || []
      };
    } catch (e) {
      console.log(`[Helper ps] Error parsing series item: ${e?.message || e}`);
      return {};
    }
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[Anichin] Mengambil data halaman home - page: ${page}...`);
      const path = page > 1 ? `/page/${page}/` : "/";
      const {
        data
      } = await this.client.get(path, {
        params: rest
      });
      const $ = cheerio.load(data);
      console.log("[Anichin] Melakukan parsing komponen beranda...");
      const popular_today = $(".bixbox:has(.releases.hothome) .excstf article.bs").map((idx, el) => this.pc(idx, el, $)).get();
      const latest_releases = $(".bixbox:has(.releases.latesthome) .excstf article.bs").map((idx, el) => this.pc(idx, el, $)).get();
      const recommendations = {};
      $(".series-gen .tab-pane").each((_, pane) => {
        try {
          const $pane = $(pane);
          const tabId = $pane.attr("id") || "";
          const tabTitle = this.cl($(`.series-gen .nav-tabs li a[href="#${tabId}"]`).text()).toLowerCase().replace(/\s+/g, "_");
          const key = tabTitle || tabId;
          if (key) {
            recommendations[key] = $pane.find("article.bs").map((idx, el) => this.pc(idx, el, $)).get();
          }
        } catch {}
      });
      const ongoing_series = $("#sidebar .ongoingseries ul li").map((_, el) => {
        try {
          const a = $(el).find("a");
          return {
            title: this.cl(a.find(".l").text()),
            url: this.th(a.attr("href") || ""),
            episode: this.cl(a.find(".r").text())
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      const popular_rankings = {
        weekly: $("#sidebar .wpop-weekly ul li").map((idx, el) => this.ps(idx, el, $)).get(),
        monthly: $("#sidebar .wpop-monthly ul li").map((idx, el) => this.ps(idx, el, $)).get(),
        all_time: $("#sidebar .wpop-alltime ul li").map((idx, el) => this.ps(idx, el, $)).get()
      };
      console.log("[Anichin] Ekstraksi data beranda berhasil.");
      return {
        status: true,
        result: {
          pagination: {
            current_page: Number(page) || 1,
            has_next: $(".hpage a.r").length > 0,
            has_prev: $(".hpage a.l").length > 0
          },
          popular_today: popular_today,
          latest_releases: latest_releases,
          recommendations: recommendations,
          sidebar: {
            ongoing_series: ongoing_series,
            popular_rankings: popular_rankings
          }
        }
      };
    } catch (err) {
      console.log(`[Anichin Error] home(): ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal mengambil data beranda"
      };
    }
  }
  async search({
    s = "",
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[Anichin] Mencari keyword: '${s}' pada page: ${page}...`);
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
      console.log("[Anichin] Parsing hasil pencarian...");
      const items = $(".postbody .listupd article.bs").map((idx, el) => this.pc(idx, el, $)).get();
      const paginationEl = $(".pagination");
      const lastPageText = paginationEl.find(".page-numbers:not(.next):not(.prev)").last().text();
      console.log(`[Anichin] Ditemukan ${items.length} hasil pencarian.`);
      return {
        status: true,
        result: {
          query: s,
          current_page: Number(page) || 1,
          total_pages: Number(lastPageText) || Number(page) || 1,
          has_next: paginationEl.find(".next.page-numbers").length > 0,
          has_prev: paginationEl.find(".prev.page-numbers").length > 0,
          donghua_list: items
        }
      };
    } catch (err) {
      console.log(`[Anichin Error] search(): ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memproses pencarian"
      };
    }
  }
  async detail({
    url,
    slug,
    ...rest
  } = {}) {
    try {
      const target = url || slug;
      if (!target) {
        throw new Error('Parameter "url" atau "slug" dibutuhkan.');
      }
      const fullUrl = this.bu(target);
      console.log(`[Anichin] Mengambil detail series dari: ${fullUrl}...`);
      const {
        data
      } = await this.client.get(fullUrl, {
        params: rest
      });
      const $ = cheerio.load(data);
      console.log("[Anichin] Parsing informasi detail series...");
      const title = this.cl($("h1.entry-title").text()) || null;
      const alternative_title = this.cl($(".infox .alter").text()) || null;
      const synopsis = this.cl($(".bixbox.synp .entry-content").text()) || null;
      const thumbnail = this.th($(".thumbook .thumb img").attr("src"));
      const followers = this.cl($(".thumbook .bmc").text()) || null;
      const ratingText = this.cl($(".rating strong").text()).replace(/Rating\s*/i, "");
      const rating = ratingText ? parseFloat(ratingText) : null;
      const details = {};
      $(".spe span").each((_, el) => {
        try {
          const raw = $(el).text();
          const [k, ...v] = raw.split(":");
          if (k && v?.length) {
            const key = this.cl(k).toLowerCase().replace(/\s+/g, "_");
            details[key] = this.cl(v.join(":"));
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
      const batch_downloads = [];
      $(".soraddlx").each((_, el) => {
        try {
          const $batch = $(el);
          const batch_title = this.cl($batch.find(".sorattlx").text()) || null;
          const links = [];
          $batch.find(".soraurlx").each((__, sub) => {
            const $sub = $(sub);
            const resolution = this.cl($sub.find("strong").text()) || null;
            const servers = $sub.find("a").map((___, a) => ({
              server: this.cl($(a).text()),
              url: $(a).attr("href") || ""
            })).get();
            links.push({
              resolution: resolution,
              servers: servers
            });
          });
          batch_downloads.push({
            batch_title: batch_title,
            downloads: links
          });
        } catch {}
      });
      const recommended_series = $('.bixbox:has(.releases:contains("Recommended Series")) article.bs').map((idx, el) => this.pc(idx, el, $)).get();
      console.log(`[Anichin] Sukses mengambil detail series: ${title}`);
      return {
        status: true,
        result: {
          title: title,
          alternative_title: alternative_title,
          thumbnail: thumbnail,
          rating: rating,
          followers: followers,
          synopsis: synopsis,
          genres: genres,
          tags: tags,
          details: details,
          episodes: episodes,
          batch_downloads: batch_downloads,
          recommended_series: recommended_series
        }
      };
    } catch (err) {
      console.log(`[Anichin Error] detail(): ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memproses detail donghua"
      };
    }
  }
  async episode({
    url,
    slug,
    ...rest
  } = {}) {
    try {
      const target = url || slug;
      if (!target) {
        throw new Error('Parameter "url" atau "slug" dibutuhkan.');
      }
      const fullUrl = this.bu(target);
      console.log(`[Anichin] Mengambil data video episode dari: ${fullUrl}...`);
      const {
        data
      } = await this.client.get(fullUrl, {
        params: rest
      });
      const $ = cheerio.load(data);
      console.log("[Anichin] Parsing stream player & link download episode...");
      const title = this.cl($("h1.entry-title").text()) || null;
      const default_embed = $("#pembed iframe").attr("src") || null;
      const stream_servers = [];
      $("select.mirror option").each((_, el) => {
        try {
          const $opt = $(el);
          const name = this.cl($opt.text());
          const val = $opt.attr("value") || "";
          if (val && name && !name.toLowerCase().includes("select video server")) {
            let embed_url = val;
            try {
              const decoded = Buffer.from(val, "base64").toString("utf-8");
              const $frame = cheerio.load(decoded);
              embed_url = $frame("iframe").attr("src") || decoded;
            } catch {}
            stream_servers.push({
              server_name: name,
              embed_url: embed_url
            });
          }
        } catch {}
      });
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
      const navigation = {
        prev: $('.naveps .nvs a[rel="prev"]').attr("href") || null,
        all_episodes: $(".naveps .nvsc a").attr("href") || null,
        next: $('.naveps .nvs a[rel="next"]').attr("href") || null
      };
      const sidebar_episodes = $("#singlepisode .episodelist ul li").map((_, el) => {
        try {
          const $el = $(el);
          const a = $el.find("a");
          return {
            id: $el.attr("data-id") || null,
            title: this.cl($el.find(".playinfo h3").text()),
            url: this.th(a.attr("href") || ""),
            thumbnail: this.th($el.find("img").attr("src") || ""),
            release_info: this.cl($el.find(".playinfo span").text())
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      console.log(`[Anichin] Sukses mengekstrak data episode: ${title}`);
      return {
        status: true,
        result: {
          title: title,
          default_embed: default_embed,
          stream_servers: stream_servers,
          downloads: downloads,
          navigation: navigation,
          sidebar_episodes: sidebar_episodes
        }
      };
    } catch (err) {
      console.log(`[Anichin Error] episode(): ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memproses data episode"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req?.method === "GET" ? req?.query : req?.body || {};
  const {
    action,
    ...rest
  } = params;
  const validActions = ["home", "search", "detail", "episode"];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Parameter 'action' tidak valid atau kosong. Pilihan: ${validActions.join(", ")}`
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
      case "search": {
        const query = rest.query || rest.s || rest.q || "";
        if (!query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 's' wajib diisi."
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
        const slug = rest.slug || rest.url;
        if (!slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' atau 'url' wajib diisi."
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
        const slug = rest.slug || rest.url;
        if (!slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' atau 'url' wajib diisi."
          });
        }
        response = await api.episode({
          slug: slug,
          url: slug,
          ...rest
        });
        break;
      }
      default:
        response = {
          status: false,
          result: "Action tidak dikenal"
        };
    }
    return res.status(response?.status ? 200 : 500).json({
      action: action,
      ...response
    });
  } catch (err) {
    console.log(`[Handler Error]: ${err?.message || err}`);
    return res.status(500).json({
      status: false,
      result: err?.message || "Internal Server Error"
    });
  }
}