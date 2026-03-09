import axios from "axios";
import * as cheerio from "cheerio";
class DoronimeScraper {
  constructor() {
    this.cfg = {
      proxy_url: "",
      target_domain: "https://doronime.id",
      endpoints: {
        home: "/",
        anime_list: "/anime?view=list",
        search: "/search?s=",
        batch: "/batch",
        movie: "/movie",
        ost: "/ost",
        genre: "/genre",
        season: "/season",
        schedule: "/schedule"
      }
    };
  }
  async req(input = "home") {
    let target_url;
    const input_str = String(input);
    if (input_str.startsWith("http")) {
      target_url = input_str.startsWith(this.cfg.proxy_url) ? input_str : `${this.cfg.proxy_url}${this.cfg.target_domain}${new URL(input_str).pathname}${new URL(input_str).search}`;
    } else if (this.cfg.endpoints[input_str]) {
      target_url = `${this.cfg.proxy_url}${this.cfg.target_domain}${this.cfg.endpoints[input_str]}`;
    } else if (input_str.startsWith("/")) {
      target_url = `${this.cfg.proxy_url}${this.cfg.target_domain}${input_str}`;
    } else {
      target_url = `${this.cfg.proxy_url}${this.cfg.target_domain}/anime/${input_str}`;
    }
    console.log(`[LOG] Memulai request ke: ${target_url}`);
    try {
      const {
        data
      } = await axios.get(target_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36"
        },
        timeout: 2e4
      });
      console.log(`[LOG] Berhasil mendapatkan data dari: ${target_url}`);
      return data;
    } catch (error) {
      const status_code = error.response?.status || "N/A";
      console.error(`[LOG] Gagal request ke ${target_url} (Status: ${status_code}): ${error.message}`);
      return {
        error: true,
        status_code: status_code,
        message: error.message
      };
    }
  }
  async home({
    ...rest
  } = {}) {
    console.log("[LOG] Memulai proses scraping home.");
    const html = await this.req("home");
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const carousel = $(".Content__tabs:eq(0) .owl-carousel a.Card").map((em, el) => {
        const $el = $(el);
        const title = $el.attr("title")?.trim() || "No Title";
        const url = $el.attr("href") || "#";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const status = $el.find(".Card__badge:eq(0) .Badge").text()?.trim() || "Unknown";
        const type = $el.find(".Card__badge--bottom .Badge").map((i, badge_el) => $(badge_el).text().trim()).get();
        const score_raw = $el.find(".Card__badge--right .Badge").text()?.trim().replace("★", "").trim();
        const score = score_raw || "N/A";
        return {
          title: title,
          url: url,
          image: image,
          status: status,
          type: type,
          score: score
        };
      }).get();
      const latest_episodes = $(".Content__tabs:eq(1) .Card").map((em, el) => {
        const $el = $(el);
        const link = $el.find(".Card__image a");
        const title = link.attr("title")?.trim() || "No Title";
        const url = link.attr("href") || "#";
        const episode_title = $el.find(".Card__caption-title a").text()?.trim() || "N/A";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const uploader = $el.find("small author").text()?.trim() || "N/A";
        const release = $el.find("small:last-child").text()?.trim().replace("Rilis:", "").trim() || "N/A";
        const anime_title = episode_title.substring(0, episode_title.lastIndexOf("Episode")).trim() || "N/A";
        return {
          anime_title: anime_title,
          episode_title: episode_title,
          url: url,
          image: image,
          uploader: uploader,
          release: release
        };
      }).get();
      const latest_ost = $(".Content__tabs:eq(2) .Card").map((em, el) => {
        const $el = $(el);
        const link = $el.find(".Card__image a");
        const title = link.attr("title")?.trim() || "No Title";
        const url = link.attr("href") || "#";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const uploader = $el.find("small author").text()?.trim() || "N/A";
        const release = $el.find("small:last-child").text()?.trim().replace("Rilis:", "").trim() || "N/A";
        return {
          title: title,
          url: url,
          image: image,
          uploader: uploader,
          release: release
        };
      }).get();
      console.log(`[LOG] Selesai parse data home.`);
      return {
        success: true,
        ...rest,
        data: {
          carousel: carousel,
          latest_episodes: latest_episodes,
          latest_ost: latest_ost
        }
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data home: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data home"
      };
    }
  }
  async anime_list({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[LOG] Memulai proses scraping anime_list (Page: ${page})`);
    const path = page === 1 ? "anime_list" : `/anime?view=list&page=${page}`;
    const html = await this.req(path);
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const anime_list_data = $(".List__item a").map((em, el) => {
        const $el = $(el);
        const title = $el.find("small").text()?.trim() || "No Title";
        const url = $el.attr("href") || "#";
        const cover = $el.attr("data-preview-image")?.trim() || "No Cover";
        const initial = $el.closest(".List").prevAll(".List__group").first().find("a").text().trim() || "0-9";
        return {
          title: title,
          url: url,
          cover: cover,
          initial: initial
        };
      }).get();
      const current_page = $(".Pagination__page-item.active .Pagination__page-link").text()?.trim() || "1";
      const has_next = $('.Pagination__page-item a[rel="next"]').length > 0;
      const pagination = $(".Pagination__page-link").not('.Pagination__page-item.active .Pagination__page-link, [rel="prev"], [rel="next"]').map((i, el) => $(el).attr("href")).get();
      const alphabet_index = $(".List__top-item a").map((i, el) => ({
        letter: $(el).text().trim(),
        target: $(el).attr("href") || "#"
      })).get();
      console.log(`[LOG] Selesai parse data anime_list.`);
      return {
        success: true,
        ...rest,
        current_page: parseInt(current_page) || 1,
        has_next: has_next,
        alphabet_index: alphabet_index,
        pagination_links: pagination,
        anime_list: anime_list_data
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data anime_list: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data anime_list"
      };
    }
  }
  async search({
    query,
    ...rest
  } = {}) {
    const q = query?.trim() || "";
    if (!q) {
      console.error("[LOG] Error: Query tidak boleh kosong untuk search.");
      return {
        error: true,
        message: "Query pencarian dibutuhkan"
      };
    }
    console.log(`[LOG] Memulai proses scraping search untuk: ${q}`);
    const path = `${this.cfg.endpoints.search}${encodeURIComponent(q)}`;
    const html = await this.req(path);
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const search_results = $(".Content__tabs-body.Card__container a.Card--column").map((em, el) => {
        const $el = $(el);
        const title = $el.attr("title")?.trim() || "No Title";
        const url = $el.attr("href") || "#";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const status = $el.find(".Card__badge:eq(0) .Badge").text()?.trim() || "Unknown";
        const type = $el.find(".Card__badge--bottom .Badge").map((i, badge_el) => $(badge_el).text().trim()).get();
        const score_raw = $el.find(".Card__badge--right .Badge").text()?.trim().replace("★", "").trim();
        const score = score_raw || "N/A";
        return {
          title: title,
          url: url,
          image: image,
          status: status,
          type: type,
          score: score
        };
      }).get();
      const result_title = $(".Content__tabs-header span").text()?.trim() || "Pencarian Anime";
      console.log(`[LOG] Selesai parse data search. Total Hasil: ${search_results.length}`);
      return {
        success: true,
        ...rest,
        query: q,
        result_title: result_title,
        results: search_results
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data search: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data search"
      };
    }
  }
  async detail({
    url: input,
    ...rest
  } = {}) {
    if (!input) {
      console.error("[LOG] Error: input (slug/path/url) dibutuhkan untuk get_details.");
      return {
        error: true,
        message: "Input (slug/path/url) dibutuhkan"
      };
    }
    console.log(`[LOG] Memulai proses scraping Detail/Episode untuk: ${input}`);
    const html = await this.req(input);
    if (html.error) return html;
    const $ = cheerio.load(html);
    const is_episode_page = $(".Content__link").length > 0;
    try {
      const result = {
        is_episode: is_episode_page
      };
      if (is_episode_page) {
        result.type = "episode_download";
        result.title = $(".Content__tabs-content-title .Content__title").text()?.trim() || "N/A";
        const info_text = $(".Content__tabs-content-title span:last-child").text()?.trim() || "N/A";
        result.uploader = info_text.match(/Oleh\s*(.*?)\s*,/)?.[1] || "N/A";
        result.release_date = info_text.match(/Rilis\s*(.*)\s*WIB/)?.[1] || "N/A";
        result.anime_source_image = $(".Content__image picture source:eq(0)").attr("srcset") || $(".Content__image img").attr("src") || "No Image";
        result.description = $(".Content__description-caption-synopsis p").text()?.trim() || "N/A";
        result.source_anime_genre = $('.Content__description-caption div:contains("Genre") a').map((i, el) => $(el).text().trim()).get();
        result.anime_season = $('.Content__description-caption div:contains("Anime Winter") a').text()?.trim() || "N/A";
        result.tags = $(".Content__tags").text()?.trim().split(",").map(t => t.trim()).filter(t => t) || [];
        result.downloads = $(".Download__container .Download__group").map((em, el) => {
          const $el = $(el);
          const quality = $el.find(".Download__group-title").text()?.trim() || "Unknown Quality";
          const links_by_server = $el.find(".Download__link span a").map((e, link_el) => {
            const $link = $(link_el);
            const server = $link.find(".d-none.d-md-block").text()?.trim() || $link.find(".d-block.d-md-none").text()?.trim() || "Unknown Server";
            const dl_url = $link.attr("href") || "#";
            return {
              server: server,
              url: dl_url
            };
          }).get();
          return {
            quality: quality,
            links: links_by_server
          };
        }).get();
        result.related_episodes = $(".Content__table-body").map((em, el) => {
          const $el = $(el);
          const ep_number = $el.find(".col:eq(0) a").text()?.trim() || "N/A";
          const ep_title = $el.find(".col-9 a").text()?.trim() || "N/A";
          const ep_url = $el.find(".col:eq(0) a").attr("href") || "#";
          const release = $el.find(".col:nth-child(3)").text()?.trim() || "N/A";
          return {
            number: ep_number,
            title: ep_title,
            url: ep_url,
            release: release
          };
        }).get();
      } else {
        result.type = "anime_details";
        const anime_info = {};
        $(".Content__header-caption-item").each((em, el) => {
          const $el = $(el);
          const raw_text = $el.text().trim();
          const parts = raw_text.split(/:\s*/);
          const key_raw = parts[0]?.trim() || "";
          const value_raw = parts[1]?.trim() || "N/A";
          const key = key_raw.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
          anime_info[key] = value_raw;
        });
        anime_info.genre = $('.Content__header-caption-item:contains("Genre") a').map((i, el) => $(el).text().trim()).get();
        anime_info.studio = $('.Content__header-caption-item:contains("Studio") a').map((i, el) => $(el).text().trim()).get();
        anime_info.season_link = $('.Content__header-caption-item:contains("Season") a').attr("href") || "N/A";
        result.synopsis = $(".Content__tabs-body .Content__tabs-content--small p").text()?.trim() || "Sinopsis tidak tersedia.";
        result.title = $(".Content__tabs-content-title .Content__title").text()?.trim() || "N/A";
        result.original_title = $(".Content__tabs-content-title span:not(.Content__title)").text()?.trim() || "N/A";
        result.image = $(".Content__header-image picture source:eq(0)").attr("srcset") || $(".Content__header-image img").attr("src") || "No Image";
        result.mal_score = anime_info.skor_mal || "N/A";
        result.episodes = $(".Content__table-body").map((em, el) => {
          const $el = $(el);
          const ep_number = $el.find(".col:eq(0) a").text()?.trim() || "N/A";
          const ep_title = $el.find(".col-9 a").text()?.trim() || "N/A";
          const ep_url = $el.find(".col:eq(0) a").attr("href") || "#";
          const release = $el.find(".col:nth-child(3)").text()?.trim() || "N/A";
          return {
            number: ep_number,
            title: ep_title,
            url: ep_url,
            release: release
          };
        }).get();
        result.info = anime_info;
      }
      console.log(`[LOG] Selesai parse data details: ${result.title || "N/A"}`);
      return {
        success: true,
        ...rest,
        data: result
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data details: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data details"
      };
    }
  }
  async batch({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[LOG] Memulai proses scraping batch (Page: ${page})`);
    const path = page === 1 ? "batch" : `/batch?page=${page}`;
    const html = await this.req(path);
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const batch_list = $(".Content__tabs-body.Card__container .Card").map((em, el) => {
        const $el = $(el);
        const link = $el.find(".Card__image a");
        const title = link.attr("title")?.trim() || "No Title";
        const url = link.attr("href") || "#";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const badges = $el.find(".Card__badge .Badge").map((i, badge_el) => $(badge_el).text().trim()).get();
        const uploader = $el.find("small author").text()?.trim() || "N/A";
        const release = $el.find("small:last-child").text()?.trim().replace("Rilis:", "").trim() || "N/A";
        return {
          title: title,
          url: url,
          image: image,
          badges: badges,
          uploader: uploader,
          release: release
        };
      }).get();
      const current_page = $(".Pagination__page-item.active .Pagination__page-link").text()?.trim() || "1";
      const has_next = $('.Pagination__page-item a[rel="next"]').length > 0;
      console.log(`[LOG] Selesai parse data batch. Total: ${batch_list.length}`);
      return {
        success: true,
        ...rest,
        current_page: parseInt(current_page) || 1,
        has_next: has_next,
        batch_list: batch_list
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data batch: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data batch"
      };
    }
  }
  async movie({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[LOG] Memulai proses scraping movie (Page: ${page})`);
    const path = page === 1 ? "movie" : `/movie?page=${page}`;
    const html = await this.req(path);
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const movie_list = $(".Content__tabs-body.Card__container .Card").map((em, el) => {
        const $el = $(el);
        const link = $el.find(".Card__image a");
        const title = link.attr("title")?.trim() || "No Title";
        const url = link.attr("href") || "#";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const type = $el.find(".Card__badge--bottom .Badge").text()?.trim() || "N/A";
        const uploader = $el.find("small author").text()?.trim() || "N/A";
        const release = $el.find("small:last-child").text()?.trim().replace("Rilis:", "").trim() || "N/A";
        return {
          title: title,
          url: url,
          image: image,
          type: type,
          uploader: uploader,
          release: release
        };
      }).get();
      const current_page = $(".Pagination__page-item.active .Pagination__page-link").text()?.trim() || "1";
      const has_next = $('.Pagination__page-item a[rel="next"]').length > 0;
      console.log(`[LOG] Selesai parse data movie. Total: ${movie_list.length}`);
      return {
        success: true,
        ...rest,
        current_page: parseInt(current_page) || 1,
        has_next: has_next,
        movie_list: movie_list
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data movie: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data movie"
      };
    }
  }
  async ost({
    page = 1,
    ...rest
  } = {}) {
    console.log(`[LOG] Memulai proses scraping ost (Page: ${page})`);
    const path = page === 1 ? "ost" : `/ost?page=${page}`;
    const html = await this.req(path);
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const ost_list = $(".Content__tabs-body.Card__container .Card").map((em, el) => {
        const $el = $(el);
        const link = $el.find(".Card__image a");
        const title = link.attr("title")?.trim() || "No Title";
        const url = link.attr("href") || "#";
        const image = $el.find("picture source:eq(0)").attr("srcset") || $el.find("img").attr("src") || "No Image";
        const uploader = $el.find("small author").text()?.trim() || "N/A";
        const release = $el.find("small:last-child").text()?.trim().replace("Rilis:", "").trim() || "N/A";
        return {
          title: title,
          url: url,
          image: image,
          uploader: uploader,
          release: release
        };
      }).get();
      const current_page = $(".Pagination__page-item.active .Pagination__page-link").text()?.trim() || "1";
      const has_next = $('.Pagination__page-item a[rel="next"]').length > 0;
      console.log(`[LOG] Selesai parse data ost. Total: ${ost_list.length}`);
      return {
        success: true,
        ...rest,
        current_page: parseInt(current_page) || 1,
        has_next: has_next,
        ost_list: ost_list
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data ost: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data ost"
      };
    }
  }
  async genre({
    ...rest
  } = {}) {
    console.log("[LOG] Memulai proses scraping genre.");
    const html = await this.req("genre");
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const genre_list = $(".Content__tabs-body.Content__pills a").map((em, el) => {
        const $el = $(el);
        const name = $el.find("span").text()?.trim() || "N/A";
        const url = $el.attr("href") || "#";
        return {
          name: name,
          url: url
        };
      }).get();
      const list_title = $(".Content__pills-title strong").text()?.trim() || "GENRE";
      const list_caption = $(".Content__pills-caption").text()?.trim() || "DAFTAR GENRE ANIME";
      console.log(`[LOG] Selesai parse data genre. Total: ${genre_list.length}`);
      return {
        success: true,
        ...rest,
        list_title: list_title,
        list_caption: list_caption,
        genre_list: genre_list
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data genre: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data genre"
      };
    }
  }
  async season({
    ...rest
  } = {}) {
    console.log("[LOG] Memulai proses scraping season.");
    const html = await this.req("season");
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const season_list = $(".Content__tabs-body.Content__pills a").map((em, el) => {
        const $el = $(el);
        const name = $el.find("span:eq(0)").text()?.trim() || "N/A";
        const count = $el.find("span:eq(1)").text()?.trim() || "0";
        const url = $el.attr("href") || "#";
        return {
          name: name,
          count: parseInt(count) || 0,
          url: url
        };
      }).get();
      const list_title = $(".Content__pills-title strong").text()?.trim() || "SEASON";
      const list_caption = $(".Content__pills-caption").text()?.trim() || "DAFTAR SEASON ANIME";
      console.log(`[LOG] Selesai parse data season. Total: ${season_list.length}`);
      return {
        success: true,
        ...rest,
        list_title: list_title,
        list_caption: list_caption,
        season_list: season_list
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data season: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data season"
      };
    }
  }
  async schedule({
    ...rest
  } = {}) {
    console.log("[LOG] Memulai proses scraping schedule.");
    const html = await this.req("schedule");
    if (html.error) return html;
    const $ = cheerio.load(html);
    try {
      const schedule_list = $(".Schedule__item a").map((em, el) => {
        const $el = $(el);
        const uploader = $el.find(".text-danger").text()?.trim() || "N/A";
        const title_span = $el.find("span:not(.text-danger)");
        const title = title_span.length > 0 ? title_span.text()?.trim() : $el.text()?.trim().replace(uploader, "").trim() || "No Title";
        const url = $el.attr("href") || "#";
        const preview_image = $el.attr("data-preview-image")?.trim() || "No Preview Image";
        return {
          title: title,
          url: url,
          uploader: uploader,
          preview_image: preview_image
        };
      }).get();
      const note_items = $(".Download__note-item span").map((i, el) => $(el).text().trim()).get();
      console.log(`[LOG] Selesai parse data schedule. Total: ${schedule_list.length}`);
      return {
        success: true,
        ...rest,
        schedule_list: schedule_list,
        notes: note_items
      };
    } catch (parse_error) {
      console.error(`[LOG] Gagal parse data schedule: ${parse_error.message}`);
      return {
        error: true,
        message: "Gagal melakukan parsing data schedule"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "anime_list", "search", "detail", "batch", "movie", "ost", "genre", "season", "schedule"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=gadis"
      }
    });
  }
  const api = new DoronimeScraper();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "anime_list":
        response = await api.anime_list(params);
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
            example: "https://doronime.id/anime/padahal-pengen-jadi-gadis-penyihir"
          });
        }
        response = await api.detail(params);
        break;
      case "batch":
        response = await api.batch(params);
        break;
      case "movie":
        response = await api.movie(params);
        break;
      case "ost":
        response = await api.ost(params);
        break;
      case "genre":
        response = await api.genre(params);
        break;
      case "season":
        response = await api.season(params);
        break;
      case "schedule":
        response = await api.schedule(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
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
      error: error.message || "Unknown Error"
    });
  }
}