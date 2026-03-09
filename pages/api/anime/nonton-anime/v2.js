import axios from "axios";
import * as cheerio from "cheerio";
class NontonAnime {
  constructor() {
    this.base_url = "https://s9.nontonanimeid.boats";
    this.ajax_url = `${this.base_url}/wp-admin/admin-ajax.php`;
    this.u_agent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  async rq(url) {
    try {
      console.log(`[PROSES] Fetching: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: {
          "user-agent": this.u_agent,
          referer: this.base_url,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        }
      });
      return cheerio.load(data);
    } catch (e) {
      console.error(`[ERROR] Request Gagal: ${e.message}`);
      return null;
    }
  }
  async ajx(payload, ref) {
    try {
      console.log(`[PROSES] AJAX Player: ${payload.serverName || "default"}`);
      const params = new URLSearchParams();
      for (const k in payload) params.append(k, payload[k]);
      const {
        data
      } = await axios.post(this.ajax_url, params, {
        headers: {
          "user-agent": this.u_agent,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          origin: this.base_url,
          referer: ref || this.base_url,
          accept: "*/*"
        }
      });
      return data;
    } catch (e) {
      return "";
    }
  }
  async home({
    ...rest
  }) {
    try {
      const $ = await this.rq(this.base_url);
      if (!$) return {
        status: false,
        message: "Failed to fetch homepage"
      };
      const latest_episodes = $("#postbaru article").map((i, el) => ({
        title: $(el).find(".title span")?.text()?.trim() || "Unknown Title",
        url: $(el).find("a")?.attr("href") || "",
        episode: $(el).find(".episodes")?.text()?.trim() || "Episode 0",
        thumbnail: $(el).find("img")?.attr("src") || ""
      })).get();
      const popular_categories = {};
      $("#series-footer .tab-content1").each((i, el) => {
        const tab_id = $(el).attr("id")?.replace(/-/g, "_") || `category_${i}`;
        popular_categories[tab_id] = $(el).find(".animeseries").map((_, item) => ({
          title: $(item).find(".title span")?.text()?.trim() || "Unknown",
          score: parseFloat($(item).find(".kotakscore")?.text()?.trim()) || 0,
          url: $(item).find("a")?.attr("href") || "",
          thumbnail: $(item).find("img")?.attr("src") || ""
        })).get();
      });
      return {
        status: true,
        result: {
          latest_episodes: latest_episodes,
          popular_categories: popular_categories
        }
      };
    } catch (e) {
      return {
        status: false,
        message: e.message
      };
    }
  }
  async search({
    q,
    ...rest
  }) {
    try {
      const query = q || "Fate";
      const $ = await this.rq(`${this.base_url}/?s=${encodeURIComponent(query)}`);
      if (!$) return {
        status: false,
        message: "Failed to fetch search results"
      };
      const search_results = $(".result .as-anime-card").map((i, el) => ({
        title: $(el).find(".as-anime-title")?.text()?.trim() || "Unknown Title",
        score: parseFloat($(el).find(".as-rating")?.text()?.replace("⭐", "")?.trim()) || 0,
        url: $(el).attr("href") || "",
        thumbnail: $(el).find("img")?.attr("src") || "",
        genres: $(el).find(".as-genre-tag").map((_, g) => $(g).text().trim()).get(),
        type: $(el).find(".as-type")?.text()?.trim() || "Unknown",
        season: $(el).find(".as-season")?.text()?.trim() || "No Season"
      })).get();
      const nav = $(".wp-pagenavi");
      const pagination = {
        current_page: parseInt(nav.find(".current")?.text()?.trim()) || 1,
        total_pages: parseInt(nav.find(".pages")?.text()?.split("dari")?.[1]?.trim()) || 1,
        page_links: nav.find("a").map((_, a) => ({
          label: $(a).text().trim(),
          url: $(a).attr("href") || ""
        })).get()
      };
      return {
        status: true,
        query: query,
        total_results: search_results.length,
        result: {
          search_results: search_results,
          pagination: pagination
        }
      };
    } catch (e) {
      return {
        status: false,
        message: e.message
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      const $ = await this.rq(url || "");
      if (!$) return {
        status: false,
        message: "Failed to fetch detail page"
      };
      const metadata = {};
      $(".details-list li").each((i, el) => {
        const key = $(el).find(".detail-label")?.text()?.replace(":", "")?.trim()?.toLowerCase()?.replace(/\s+/g, "_");
        const value = $(el).contents()?.last()?.text()?.trim();
        if (key && value) metadata[key] = value;
      });
      const episode_list = $(".episode-item").map((i, el) => ({
        title: $(el).find(".ep-title")?.text()?.trim() || "Episode",
        release_date: $(el).find(".ep-date")?.text()?.trim() || "",
        url: $(el).attr("href") || ""
      })).get();
      return {
        status: true,
        result: {
          title: $(".entry-title")?.text()?.trim() || "Unknown Title",
          rating: parseFloat($(".value")?.text()?.trim()) || 0,
          synopsis: $(".synopsis-prose p")?.text()?.trim() || "No synopsis available",
          poster: $(".anime-card__sidebar img")?.attr("src") || "",
          metadata: metadata,
          episode_list: episode_list,
          total_episodes: episode_list.length
        }
      };
    } catch (e) {
      return {
        status: false,
        message: e.message
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      const $ = await this.rq(url || "");
      if (!$) return {
        status: false,
        message: "Failed to fetch episode page"
      };
      let ajax_nonce = "";
      let episode_metadata = {
        series_id: "",
        episode_number: ""
      };
      $("script").each((i, el) => {
        const script_content = $(el).html() || "";
        const script_src = $(el).attr("src") || "";
        let text = script_content;
        if (script_src.indexOf("base64,") !== -1) {
          try {
            text = Buffer.from(script_src.split("base64,")[1], "base64").toString("utf-8");
          } catch (err) {}
        }
        if (text.indexOf("nonce") !== -1) {
          const nonce_match = text.match(/"nonce"\s*:\s*"([^"]+)"/);
          if (nonce_match) ajax_nonce = nonce_match[1];
        }
        if (text.indexOf("seriesId") !== -1) {
          const series_match = text.match(/"seriesId"\s*:\s*"([^"]+)"/);
          const episode_match = text.match(/"episodeNumber"\s*:\s*"([^"]+)"/);
          if (series_match) episode_metadata.series_id = series_match[1];
          if (episode_match) episode_metadata.episode_number = episode_match[1];
        }
      });
      const server_elements = $(".player li");
      const video_servers = [];
      for (let i = 0; i < server_elements.length; i++) {
        const el = server_elements.eq(i);
        const server_name = el.find("span")?.text()?.trim() || `Server ${i + 1}`;
        const payload = {
          action: "player_ajax",
          nonce: ajax_nonce,
          serverName: el.attr("data-type") || "",
          nume: el.attr("data-nume") || "",
          post: el.attr("data-post") || ""
        };
        const html_response = await this.ajx(payload, url);
        if (html_response) {
          const $$ = cheerio.load(html_response);
          const iframe_url = $$("iframe")?.attr("src") || "";
          video_servers.push({
            server_name: server_name,
            iframe_url: iframe_url,
            server_type: payload.serverName,
            server_data: {
              nume: payload.nume,
              post: payload.post
            }
          });
        }
      }
      const download_options = $("#download_area .infovid").map((i, el) => {
        const quality_label = $(el).find(".vidspan")?.text()?.trim() || `Quality ${i + 1}`;
        const download_links = $(el).find("a").map((_, link) => ({
          resolution: $(link).text().trim() || "Unknown",
          url: $(link).attr("href") || ""
        })).get();
        return {
          quality_label: quality_label,
          download_links: download_links
        };
      }).get();
      const navigation = {
        previous_episode: $(".nvs a").eq(0)?.attr("href") || null,
        next_episode: $(".nvs a").eq(1)?.attr("href") || null
      };
      return {
        status: true,
        result: {
          episode_title: $(".entry-title")?.text()?.trim() || "Unknown Episode",
          episode_metadata: episode_metadata,
          video_servers: video_servers,
          total_servers: video_servers.length,
          download_options: download_options,
          navigation: navigation
        }
      };
    } catch (e) {
      return {
        status: false,
        message: e.message
      };
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
        example: "/?action=search&q=isekai"
      }
    });
  }
  const api = new NontonAnime();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}