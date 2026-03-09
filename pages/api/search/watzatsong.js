import axios from "axios";
import * as cheerio from "cheerio";
class WatzatSong {
  constructor() {
    this.base = "https://www.watzatsong.com";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this._genres_cache = null;
    this._sorts_cache = null;
  }
  log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
  url(path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${this.base}${path.startsWith("/") ? path : `/${path}`}`;
  }
  async genres() {
    try {
      if (this._genres_cache) {
        this.log(`Using cached genres (${this._genres_cache.length})`);
        return {
          ok: true,
          data: this._genres_cache
        };
      }
      this.log(`GET genres`);
      const {
        data
      } = await axios.get(this.url("/en"), {
        headers: {
          ...this.headers,
          referer: this.base,
          "sec-fetch-site": "same-origin"
        }
      });
      const $ = cheerio.load(data);
      const genres = $(".genres-menu-dropdown ul li").get().map((el, idx) => {
        const $el = $(el);
        const $link = $el.find("a");
        const href = $link.attr("href") || "";
        const slug = href.split("/").filter(Boolean).pop() || "";
        const name = $link.text()?.trim() || "";
        return {
          idx: idx + 1,
          name: name,
          slug: slug,
          link: this.url(href),
          is_quiz: name.toLowerCase().includes("quiz")
        };
      }).filter(g => g.slug && !g.is_quiz);
      this._genres_cache = genres;
      this.log(`Found ${genres.length} genres`);
      return {
        ok: true,
        data: genres
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async sorts({
    genre = ""
  } = {}) {
    try {
      if (this._sorts_cache) {
        this.log(`Using cached sorts (${this._sorts_cache.length})`);
        return {
          ok: true,
          data: this._sorts_cache
        };
      }
      const url = genre ? this.url(`/en/${genre}`) : this.url("/en");
      this.log(`GET sorts`);
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: this.base,
          "sec-fetch-site": "same-origin"
        }
      });
      const $ = cheerio.load(data);
      const sorts = $(".listened-menu-dropdown ul li").get().map((el, idx) => {
        const $el = $(el);
        const $link = $el.find("a");
        const href = $link.attr("href") || "";
        const parts = href.split("/").filter(Boolean);
        const slug = parts[parts.length - 1] || "";
        const name = $link.text()?.trim() || "";
        return {
          idx: idx + 1,
          name: name,
          slug: slug,
          link: this.url(href)
        };
      }).filter(s => s.slug);
      if (!sorts.find(s => s.slug === "last")) {
        sorts.unshift({
          idx: 0,
          name: "Newest",
          slug: "last",
          link: genre ? this.url(`/en/${genre}/last`) : this.url("/en/all/last")
        });
      }
      this._sorts_cache = sorts;
      this.log(`Found ${sorts.length} sorts`);
      return {
        ok: true,
        data: sorts
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async home({
    genre = "",
    sort = "last",
    page = 1
  } = {}) {
    try {
      const path = genre ? `/en/${genre}/${sort}${page > 1 ? `/${page}` : ""}` : "/en";
      const url = this.url(path);
      this.log(`GET home: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: this.base,
          "sec-fetch-site": "same-origin"
        }
      });
      const $ = cheerio.load(data);
      const songs = $(".sample-box").get().map((el, idx) => {
        const $el = $(el);
        const $genre = $el.find(".sample-box-genre");
        const $comment = $el.find(".sample-box-comment a");
        const $play = $el.find(".play");
        const $user = $el.find(".sample-box-by-line .user");
        const $user_img = $el.find(".sample-box-profile-pict");
        const $time = $el.find(".sample-box__posted-ago .italic");
        const $counters = $el.find(".sample-box-actions__counter");
        const $followers = $el.find(".nb-followers");
        const $comments = $el.find(".sample-box-actions-comments");
        const genre_text = $genre.text()?.trim() || "";
        const genre_parts = genre_text.split("-").map(p => p.trim());
        const bg_img = $user_img.css("background-image") || "";
        const img_match = bg_img.match(/url\(['"]?([^'"]+)['"]?\)/) || [];
        return {
          idx: idx + 1,
          id: $play.attr("sample_id")?.trim() || "",
          title: $comment.attr("title")?.trim() || "",
          title_short: $comment.text()?.trim().replace(/^"|"$/g, "") || "",
          link: this.url($comment.attr("href")),
          user_name: $user.text()?.trim() || "",
          user_link: this.url($user.attr("href")),
          user_img: img_match[1] || "",
          user_profile: this.url($user_img.attr("href")),
          genre_main: genre_parts[0] || "",
          genre_lang: genre_parts[1] || "",
          genre_full: genre_text,
          audio: $play.attr("sample")?.trim() || "",
          audio_id: $play.attr("sample_id")?.trim() || "",
          listens: $counters.eq(0).text()?.replace(/[()]/g, "").trim() || "0",
          answers: $counters.eq(1).text()?.replace(/[()]/g, "").trim() || "0",
          followers: $followers.text()?.trim() || "0",
          comments: $comments.text()?.match(/\d+/)?.[0] || "0",
          time_ago: $time.text()?.trim() || ""
        };
      });
      const pagination = $("#page-numbers li").get().map((el, idx) => {
        const $el = $(el);
        const $link = $el.find("a");
        return {
          idx: idx + 1,
          text: $el.text()?.trim() || "",
          page: $link.length ? $link.text()?.trim() : $el.text()?.trim(),
          link: this.url($link.attr("href")),
          active: $el.hasClass("selected")
        };
      });
      const genres = $(".genres-menu-dropdown ul li").get().map((el, idx) => {
        const $el = $(el);
        const $link = $el.find("a");
        const href = $link.attr("href") || "";
        const slug = href.split("/").filter(Boolean).pop() || "";
        return {
          idx: idx + 1,
          name: $link.text()?.trim() || "",
          slug: slug,
          link: this.url(href)
        };
      }).filter(g => g.slug && !g.name.toLowerCase().includes("quiz"));
      this.log(`Found ${songs.length} songs`);
      return {
        ok: true,
        data: songs,
        pagination: pagination,
        genres: genres,
        total: songs.length
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async search({
    q = "",
    limit = 50
  } = {}) {
    try {
      this.log(`Search: "${q}" (limit ${limit})`);
      const genres_result = await this.genres();
      if (!genres_result.ok) {
        return {
          ok: false,
          msg: "Failed to get genres"
        };
      }
      const genres = genres_result.data.map(g => g.slug);
      const q_lower = q.toLowerCase();
      const all_songs = [];
      for (const genre of genres) {
        if (all_songs.length >= limit * 2) break;
        for (let page = 1; page <= 3; page++) {
          if (all_songs.length >= limit * 2) break;
          try {
            const result = await this.home({
              genre: genre,
              sort: "last",
              page: page
            });
            if (result.ok && result.data) {
              all_songs.push(...result.data);
            }
            await new Promise(r => setTimeout(r, 300));
          } catch (err) {
            this.log(`Skip ${genre} p${page}: ${err.message}`);
          }
        }
      }
      const filtered = all_songs.filter(song => {
        const in_title = song.title?.toLowerCase().includes(q_lower);
        const in_short = song.title_short?.toLowerCase().includes(q_lower);
        const in_user = song.user_name?.toLowerCase().includes(q_lower);
        const in_genre = song.genre_full?.toLowerCase().includes(q_lower);
        return in_title || in_short || in_user || in_genre;
      });
      const unique = filtered.filter((item, idx, arr) => arr.findIndex(i => i.id === item.id) === idx);
      this.log(`Found ${unique.length} results from ${all_songs.length} songs`);
      return {
        ok: true,
        data: unique.slice(0, limit),
        query: q,
        total: unique.length,
        scanned: all_songs.length,
        genres_used: genres.length
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async detail({
    id = ""
  } = {}) {
    try {
      const url = this.url(`/en/name-that-tune/${id}.html`);
      this.log(`GET detail: ${id}`);
      const {
        data
      } = await axios.get(url, {
        headers: {
          ...this.headers,
          referer: this.url("/en"),
          "sec-fetch-site": "same-origin"
        }
      });
      const $ = cheerio.load(data);
      const proposals = $(".proposal").get().map((el, idx) => {
        const $el = $(el);
        const $artist = $el.find(".artist");
        const $song = $el.find(".song-title");
        const $user = $el.find(".proposal__user-name .user");
        const $user_link = $el.find(".proposal__author .profile-pict-medium");
        const $user_img = $user_link.find("img");
        const $cover = $el.find(".cover-medium img");
        const $yt = $el.find(".toggle-youtube-player");
        const $votes = $el.find(".thumb-up-counter");
        const $badge = $user_link.find(".ribbon");
        const $time = $el.find(".ago .italic");
        const yt_id = $yt.attr("data-youtube-id") || "";
        return {
          idx: idx + 1,
          artist: $artist.text()?.trim() || "",
          artist_link: this.url($artist.attr("href")),
          song: $song.text()?.trim().replace(/^"|"$/g, "") || "",
          song_link: this.url($song.attr("href")),
          user_name: $user.text()?.trim() || "",
          user_link: this.url($user.attr("href")),
          user_img: $user_img.attr("src") || "",
          user_badge: $badge.attr("title") || "",
          has_badge: $badge.length > 0,
          yt_id: yt_id,
          yt_url: yt_id ? `https://youtube.com/watch?v=${yt_id}` : "",
          yt_target: $yt.attr("data-target") || "",
          thumb: $cover.attr("src") || "",
          votes: parseInt($votes.text()?.trim() || "0", 10),
          time_ago: $time.text()?.trim() || ""
        };
      });
      const comments = $(".comments-list > li").get().map((el, idx) => {
        const $el = $(el);
        const $user = $el.find(".comment__author .user");
        const $user_img = $el.find(".comment__author img");
        const $content = $el.find(".comment__content");
        const $time = $el.find(".comment__ago .italic");
        return {
          idx: idx + 1,
          user_name: $user.text()?.trim() || "",
          user_link: this.url($user.attr("href")),
          user_img: $user_img.attr("src") || "",
          content_html: $content.html()?.trim() || "",
          content_text: $content.text()?.trim() || "",
          time_ago: $time.text()?.trim() || ""
        };
      });
      const $box = $(".sample-box").eq(0);
      const $genre = $box.find(".sample-box-genre");
      const $comment = $box.find(".sample-box-comment a");
      const $play = $box.find(".play");
      const $user = $box.find(".sample-box-by-line .user");
      const $user_img = $box.find(".sample-box-profile-pict");
      const $time = $box.find(".sample-box__posted-ago .italic");
      const $counters = $box.find(".sample-box-actions__counter");
      const $followers = $box.find(".nb-followers");
      const genre_text = $genre.text()?.trim() || "";
      const genre_parts = genre_text.split("-").map(p => p.trim());
      const bg_img = $user_img.css("background-image") || "";
      const img_match = bg_img.match(/url\(['"]?([^'"]+)['"]?\)/) || [];
      this.log(`Found ${proposals.length} proposals, ${comments.length} comments`);
      return {
        ok: true,
        data: {
          id: id,
          url: url,
          title: $comment.attr("title")?.trim() || "",
          title_short: $comment.text()?.trim().replace(/^"|"$/g, "") || "",
          user_name: $user.text()?.trim() || "",
          user_link: this.url($user.attr("href")),
          user_img: img_match[1] || "",
          user_profile: this.url($user_img.attr("href")),
          genre_main: genre_parts[0] || "",
          genre_lang: genre_parts[1] || "",
          genre_full: genre_text,
          audio: $play.attr("sample")?.trim() || "",
          audio_id: $play.attr("sample_id")?.trim() || "",
          listens: parseInt($counters.eq(0).text()?.replace(/[()]/g, "").trim() || "0", 10),
          answers: parseInt($counters.eq(1).text()?.replace(/[()]/g, "").trim() || "0", 10),
          followers: parseInt($followers.text()?.trim() || "0", 10),
          time_ago: $time.text()?.trim() || "",
          proposals: proposals,
          proposals_total: proposals.length,
          comments: comments,
          comments_total: comments.length,
          meta_title: $("title").text()?.trim() || "",
          meta_desc: $('meta[name="description"]').attr("content")?.trim() || "",
          og_title: $('meta[property="og:title"]').attr("content")?.trim() || "",
          og_url: $('meta[property="og:url"]').attr("content")?.trim() || "",
          og_img: $('meta[property="og:image"]').attr("content")?.trim() || ""
        }
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "genres", "sorts"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&q=hello"
      }
    });
  }
  const api = new WatzatSong();
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
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'detail'.",
            example: "12345678"
          });
        }
        response = await api.detail(params);
        break;
      case "genres":
        response = await api.genres(params);
        break;
      case "sorts":
        response = await api.sorts(params);
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