import axios from "axios";
import * as cheerio from "cheerio";
class KiryuuScraper {
  constructor() {
    this.baseUrl = "https://v7.kiryuu.to";
    this.cookies = "";
  }
  formatUrl(input) {
    if (!input) return "";
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return input;
    }
    const clean = input.replace(/^\/|\/$/g, "");
    if (clean.startsWith("manga/")) {
      return `${this.baseUrl}/${clean}/`;
    }
    return `${this.baseUrl}/manga/${clean}/`;
  }
  getSlug(link) {
    if (!link) return null;
    try {
      const clean = link.replace(/\/$/, "");
      const parts = clean.split("/");
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }
  getMetaTags($) {
    const meta = {};
    $("meta").each((_, el) => {
      const name = $(el).attr("name") || $(el).attr("property") || $(el).attr("itemprop");
      const content = $(el).attr("content");
      if (name && content) {
        const clean_name = name.replace(/[:\-]+/g, "_").toLowerCase();
        meta[clean_name] = content.trim();
      }
    });
    return meta;
  }
  async req(url, options = {}) {
    console.log(`[Request] Mengakses URL: ${url}`);
    try {
      const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": options.method === "POST" ? "empty" : "document",
        "sec-fetch-mode": options.method === "POST" ? "cors" : "navigate",
        "sec-fetch-site": options.method === "POST" ? "same-origin" : "none",
        cookie: this.cookies || "",
        ...options.headers
      };
      const res = await axios({
        url: url,
        method: options.method || "GET",
        headers: headers,
        ...options
      });
      if (res.headers["set-cookie"]) {
        const cookie_map = new Map();
        if (this.cookies) {
          this.cookies.split(";").forEach(c => {
            const [k, v] = c.split("=");
            if (k && v) cookie_map.set(k.trim(), v.trim());
          });
        }
        res.headers["set-cookie"].forEach(c => {
          const pair = c.split(";")[0];
          const [k, v] = pair.split("=");
          if (k && v) cookie_map.set(k.trim(), v.trim());
        });
        this.cookies = Array.from(cookie_map.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
      }
      return res.data;
    } catch (error) {
      console.error(`[Error] Request ke ${url} gagal: ${error.message}`);
      throw error;
    }
  }
  async getSearchNonce(options = {}) {
    console.log("[Process] Mengambil token nonce pencarian dinamis...");
    try {
      const html = await this.req(this.baseUrl, options);
      const $ = cheerio.load(html);
      const search_post_attr = $('[hx-post*="action=search"]').first().attr("hx-post") || "";
      const nonce_match = search_post_attr.match(/nonce=([a-zA-Z0-9]+)/);
      return nonce_match ? nonce_match[1] : "";
    } catch (error) {
      console.error(`[Error] Gagal menginisialisasi nonce: ${error.message}`);
      return "";
    }
  }
  async home({
    ...rest
  } = {}) {
    console.log("[Process] Memulai scraping halaman utama (Normal URL)...");
    try {
      const html = await this.req(this.baseUrl, rest);
      const $ = cheerio.load(html);
      const slider = $(".hero-slider .swiper-slide").map((_, el) => {
        const a = $(el).find("a.swiper-slide-transform");
        const url = a.attr("href") || "";
        const slug = this.getSlug(url);
        const title = a.find("h2").text().trim() || "";
        const cover = a.find("img").attr("src") || "";
        const type = $(el).find(".bg-gray-800").text().trim() || "";
        const hot_badge = a.find(".w-max").text().replace(/[\r\n\t]+/g, " ").trim() || "";
        const genres = a.find("span.text-xs").map((_, gen) => $(gen).text().trim()).get();
        return {
          title: title || null,
          url: url,
          slug: slug,
          cover: cover || null,
          type: type || null,
          hot_badge: hot_badge || null,
          genres: genres.length ? genres : null
        };
      }).get().filter(item => item.url);
      const announcements = $(".announcement-slider .swiper-slide").map((_, el) => {
        const a = $(el).find("a");
        const url = a.attr("href") || "";
        const slug = this.getSlug(url);
        const cover = a.find("img").attr("src") || "";
        const title = a.find(".text-white").text().replace(/[\r\n\t]+/g, " ").trim() || "";
        const date = a.find(".text-gray-400").text().trim() || "";
        return {
          title: title,
          url: url,
          slug: slug,
          cover: cover,
          date: date
        };
      }).get().filter(item => item.url);
      const popular_today = $(".trending-slider .swiper-slide").map((_, el) => {
        const a = $(el).find("a");
        const url = a.attr("href") || "";
        const slug = this.getSlug(url);
        const cover = a.find(".cover-image").attr("src") || "";
        const title = a.find("h4").text().trim() || "";
        const type = a.find("img[alt]").first().attr("alt") || "";
        const rating = a.find(".text-sm p").text().trim() || "";
        return {
          title: title,
          url: url,
          slug: slug,
          cover: cover,
          type: type,
          rating: rating
        };
      }).get().filter(item => item.url);
      const project_updates = $("#project-list > div").map((_, el) => {
        const visible_card = $(el).find(".group-data-\\[direction\\=horizontal\\]\\:hidden");
        const horizontal_card = $(el).find(".group-data-\\[direction\\=horizontal\\]\\:block");
        const url = visible_card.find("a").attr("href") || horizontal_card.find("a").attr("href") || "";
        const slug = this.getSlug(url);
        const title = visible_card.find("h1").text().trim() || horizontal_card.find("a.font-medium").text().trim() || "";
        const cover = visible_card.find("img.wp-post-image").attr("src") || horizontal_card.find("img").attr("src") || "";
        const rating = visible_card.find(".numscore").text().trim() || null;
        const status = visible_card.find(".numscore").parent().next().text().trim() || null;
        const type = visible_card.find("span.absolute img").attr("alt") || null;
        const chapters = $(el).find("a.link-self, a.link-first-div").map((_, ch) => {
          const chapter_url = $(ch).attr("href") || "";
          const chapter_slug = this.getSlug(chapter_url);
          const chapter_title = $(ch).find("p, .inline-block").first().text().trim() || "";
          const uploaded_at = $(ch).find("time").text().trim() || "";
          return {
            chapter_title: chapter_title,
            chapter_url: chapter_url,
            chapter_slug: chapter_slug,
            uploaded_at: uploaded_at
          };
        }).get();
        return {
          title: title,
          url: url,
          slug: slug,
          cover: cover,
          rating: rating,
          status: status,
          type: type,
          chapters: chapters
        };
      }).get().filter(item => item.title && item.url);
      const latest_updates = $("#latest-list > div").map((_, el) => {
        const visible_card = $(el).find(".group-data-\\[direction\\=horizontal\\]\\:hidden");
        const horizontal_card = $(el).find(".group-data-\\[direction\\=horizontal\\]\\:block");
        const url = visible_card.find("a").attr("href") || horizontal_card.find("a").attr("href") || "";
        const slug = this.getSlug(url);
        const title = visible_card.find("h1").text().trim() || horizontal_card.find("a.font-medium").text().trim() || "";
        const cover = visible_card.find("img.wp-post-image").attr("src") || horizontal_card.find("img").attr("src") || "";
        const rating = visible_card.find(".numscore").text().trim() || null;
        const status = visible_card.find(".numscore").parent().next().text().trim() || null;
        const type = visible_card.find("span.absolute img").attr("alt") || null;
        const chapters = $(el).find("a.link-self, a.link-first-div").map((_, ch) => {
          const chapter_url = $(ch).attr("href") || "";
          const chapter_slug = this.getSlug(chapter_url);
          const chapter_title = $(ch).find("p, .inline-block").first().text().trim() || "";
          const uploaded_at = $(ch).find("time").text().trim() || "";
          return {
            chapter_title: chapter_title,
            chapter_url: chapter_url,
            chapter_slug: chapter_slug,
            uploaded_at: uploaded_at
          };
        }).get();
        return {
          title: title,
          url: url,
          slug: slug,
          cover: cover,
          rating: rating,
          status: status,
          type: type,
          chapters: chapters
        };
      }).get().filter(item => item.title && item.url);
      const latest_novel_updates = $("#latest-novel-list .grid, #latest-novel-list > div").map((_, el) => {
        const url = $(el).find("a").first().attr("href") || "";
        const slug = this.getSlug(url);
        const cover = $(el).find("img").attr("src") || "";
        const title = $(el).find("a[title]").first().text().trim() || "";
        const chapter_title = $(el).find('a[href*="/chapter-"]').text().trim() || "";
        const chapter_url = $(el).find('a[href*="/chapter-"]').attr("href") || "";
        const chapter_slug = this.getSlug(chapter_url);
        const publisher = $(el).find(".text-text span").text().trim() || "";
        const uploaded_at = $(el).find(".text-gray-400 span").text().trim() || "";
        return {
          title: title,
          url: url,
          slug: slug,
          cover: cover,
          chapter_title: chapter_title,
          chapter_url: chapter_url,
          chapter_slug: chapter_slug,
          publisher: publisher,
          uploaded_at: uploaded_at
        };
      }).get().filter(item => item.title);
      const popular_serials = $('ul[data-trending-chart="daily"] li').map((_, el) => {
        const a = $(el).find("a");
        const url = a.attr("href") || "";
        const slug = this.getSlug(url);
        const cover = a.find("img").attr("src") || "";
        const rank = a.find("span[data-medal]").attr("data-medal") || a.find("span.rounded-xl").text().replace("#", "").trim() || "";
        const title = a.find("h3").text().trim() || "";
        return {
          rank: rank,
          title: title,
          url: url,
          slug: slug,
          cover: cover
        };
      }).get().filter(item => item.url);
      const top_series = $(".mx-0.py-3 a.group").map((_, el) => {
        const url = $(el).attr("href") || "";
        const slug = this.getSlug(url);
        const cover = $(el).find("img").attr("src") || "";
        const rank = $(el).find(".index-name").text().trim() || "";
        const title = $(el).find(".font-bold").text().trim() || "";
        const genres = $(el).find("span").map((_, gen) => $(gen).text().trim()).get();
        return {
          rank: rank,
          title: title,
          url: url,
          slug: slug,
          cover: cover,
          genres: genres
        };
      }).get().filter(item => item.url);
      return {
        status: true,
        result: {
          slider: slider.length ? slider : null,
          announcements: announcements.length ? announcements : null,
          popular_today: popular_today.length ? popular_today : null,
          project_updates: project_updates.length ? project_updates : null,
          latest_updates: latest_updates.length ? latest_updates : null,
          latest_novel_updates: latest_novel_updates.length ? latest_novel_updates : null,
          popular_serials: popular_serials.length ? popular_serials : null,
          top_series: top_series.length ? top_series : null
        }
      };
    } catch (error) {
      console.error(`[Error] Scraping home gagal: ${error.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`[Process] Menjalankan pencarian AJAX PHP untuk: "${query}"`);
    try {
      const nonce = await this.getSearchNonce(rest);
      const ajax_url = `${this.baseUrl}/wp-admin/admin-ajax.php?nonce=${nonce}&action=search`;
      const ajax_html = await this.req(ajax_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "HX-Request": "true",
          "HX-Target": "searchModalContent"
        },
        data: `query=${encodeURIComponent(query || "")}`,
        ...rest
      });
      const $ = cheerio.load(ajax_html);
      const results = $("#searchResults a, a").map((_, el) => {
        const url = $(el).attr("href") || "";
        if (url.includes("/advanced-search/")) {
          return null;
        }
        const slug = this.getSlug(url);
        const cover = $(el).find("img").attr("src") || "";
        const title = $(el).find("h3").text().trim() || "";
        const synopsis = $(el).find("p").text().trim() || "";
        return {
          title: title,
          url: url,
          slug: slug,
          cover: cover || null,
          synopsis: synopsis || null
        };
      }).get().filter(item => item !== null && item.title && item.url);
      return {
        status: true,
        result: {
          results: results.length ? results : null
        }
      };
    } catch (error) {
      console.error(`[Error] Pencarian AJAX gagal: ${error.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    const target_url = this.formatUrl(url);
    console.log(`[Process] Mengambil rincian manga dari (URL/Slug): ${target_url}`);
    try {
      const html = await this.req(target_url, rest);
      const $ = cheerio.load(html);
      const meta = this.getMetaTags($);
      let ld_json = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const parsed = JSON.parse($(el).html() || "{}");
          if (parsed && Object.keys(parsed).length) ld_json = parsed;
        } catch {}
      });
      const title = $('h1[itemprop="name"]').first().text().trim() || $("h1.entry-title").first().text().trim() || $(".manga-info h1").first().text().trim() || $("h1").first().text().trim() || null;
      const alt_title = $(".block.text-sm.text-text.line-clamp-1").text().trim() || null;
      const cover = $("img.wp-post-image").first().attr("src") || $(".thumb img").first().attr("src") || null;
      const slug = this.getSlug(target_url);
      let synopsis = null;
      $('[itemprop="description"], .entry-content[itemprop="description"], .summary__content, .description-summary').each((_, el) => {
        const text = $(el).text().trim();
        if (!synopsis || text.length > synopsis.length) {
          synopsis = text;
        }
      });
      const manga_id_match = html.match(/mangaId\s*=\s*(\d+)/i) || html.match(/manga_id\s*=\s*["']?(\d+)["']?/i) || html.match(/data-id=["'](\d+)["']/i) || html.match(/manga_id=(\d+)/i);
      const chapter_id_match = html.match(/chapterId\s*=\s*(\d+)/i) || html.match(/chapter_id\s*=\s*["']?(\d+)["']?/i);
      const manga_id = manga_id_match ? manga_id_match[1] : null;
      const chapter_id = chapter_id_match ? chapter_id_match[1] : null;
      let status = "Unknown";
      let author = "Unknown";
      let type = "Manga";
      let rating = null;
      let favorites = null;
      const rating_val_meta = $('div[itemprop="ratingValue"]').attr("content") || $('[itemprop="ratingValue"]').attr("content");
      if (rating_val_meta) {
        rating = rating_val_meta;
      } else {
        const rating_span = $('small:contains("Ratings")').prev("span").text().trim();
        if (rating_span) rating = rating_span;
      }
      const fav_span = $('small:contains("Favorites")').prev("span").text().trim();
      if (fav_span) {
        favorites = fav_span;
      }
      const dynamic_info = {};
      const metadata_list = $(".space-y-2 .flex, .post-content_item, table tr, .manga-info tr, .manga-info li, .info-cast tr").map((_, el) => {
        const heading = $(el).find("h4 span, .summary-heading, td, th, span").first().text().replace(":", "").trim().toLowerCase();
        const content = $(el).find(".inline p, .inline, .summary-content, td, span").last().text().trim();
        return {
          heading: heading,
          content: content
        };
      }).get();
      metadata_list.forEach(item => {
        if (item.heading && item.content) {
          const clean_key = item.heading.replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
          if (clean_key) {
            dynamic_info[clean_key] = item.content;
            if (clean_key.includes("status")) status = item.content;
            if (clean_key.includes("author") || clean_key.includes("penulis")) author = item.content;
            if (clean_key.includes("type") || clean_key.includes("jenis") || clean_key.includes("tipe")) type = item.content;
          }
        }
      });
      const genres = $('a[itemprop="genre"], .genre-info a, .genres-content a, a[href*="/genre/"]').map((_, el) => $(el).text().trim()).get();
      const unique_genres = [...new Set(genres)].filter(Boolean);
      let final_chapters = [];
      if (manga_id) {
        console.log(`[Process] Menjalankan fetch list chapter via AJAX untuk ID: ${manga_id}`);
        try {
          const ajax_chapters_url = `${this.baseUrl}/wp-admin/admin-ajax.php?action=get_chapters&manga_id=${manga_id}&chapter_id=${chapter_id || ""}`;
          const response_chapters = await this.req(ajax_chapters_url, rest);
          if (response_chapters && response_chapters.success && Array.isArray(response_chapters.data)) {
            final_chapters = response_chapters.data.map(ch => ({
              chapter_title: ch.title || null,
              chapter_url: ch.url || null,
              chapter_slug: this.getSlug(ch.url),
              is_current: ch.current || false
            }));
          }
        } catch (ajax_error) {
          console.warn(`[Warning] AJAX Chapter gagal, fallback ke scraping HTML: ${ajax_error.message}`);
        }
      }
      if (final_chapters.length === 0) {
        final_chapters = $("#chapter-list [data-chapter-number], #chapterlist li, .cl li, .chapter-list li").map((_, el) => {
          const a = $(el).find("a");
          const ch_url = a.attr("href") || "";
          const ch_title = $(el).attr("data-chapter-number") ? `Chapter ${$(el).attr("data-chapter-number")}` : a.find(".chapternum, .chapter-title, p, span").first().text().trim() || a.text().trim();
          const ch_date = $(el).find(".chapterdate, .chapter-date, time").first().text().trim() || "";
          if (ch_url) {
            return {
              chapter_title: ch_title || null,
              chapter_url: ch_url,
              chapter_slug: this.getSlug(ch_url),
              uploaded_at: ch_date || null
            };
          }
          return null;
        }).get().filter(Boolean);
      }
      let comments = [];
      const target_id = chapter_id || manga_id;
      if (target_id) {
        console.log(`[Process] Menjalankan fetch list komentar via AJAX untuk ID: ${target_id}`);
        try {
          const ajax_comments_url = `${this.baseUrl}/wp-admin/admin-ajax.php?chapter_id=${target_id}&utm_cid=0&action=get_comments`;
          const comments_html = await this.req(ajax_comments_url, rest);
          const $comments = cheerio.load(comments_html);
          comments = $comments(".comment-item, .comment, li.comment").map((_, el) => {
            const author_name = $comments(el).find(".comment-author, .fn, .author-name").first().text().trim() || null;
            const content = $comments(el).find(".comment-content, .comment-body, .comment-text").first().text().trim() || null;
            const date = $comments(el).find(".comment-metadata, .comment-date, time").first().text().trim() || null;
            return {
              author: author_name,
              content: content,
              date: date
            };
          }).get().filter(c => c.author || c.content);
        } catch (comment_error) {
          console.warn(`[Warning] AJAX Komentar gagal diambil: ${comment_error.message}`);
        }
      }
      return {
        status: true,
        result: {
          title: title,
          alt_title: alt_title,
          url: target_url,
          slug: slug,
          cover: cover,
          synopsis: synopsis,
          status: status,
          author: author,
          type: type,
          rating: rating || null,
          favorites: favorites || null,
          genres: unique_genres.length ? unique_genres : null,
          info: Object.keys(dynamic_info).length ? dynamic_info : null,
          meta: Object.keys(meta).length ? meta : null,
          schema: ld_json,
          chapters: final_chapters.length ? final_chapters : null,
          comments: comments.length ? comments : null
        }
      };
    } catch (error) {
      console.error(`[Error] Detail scraping gagal: ${error.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    const target_url = this.formatUrl(url);
    console.log(`[Process] Mengambil gambar chapter dari (URL/Slug): ${target_url}`);
    try {
      const html = await this.req(target_url, rest);
      const $ = cheerio.load(html);
      const meta = this.getMetaTags($);
      const cleanNavigationUrl = element => {
        if (!element || element.length === 0) return null;
        if (element.hasClass("pointer-events-none") || element.hasClass("opacity-50") || element.attr("disabled")) {
          return null;
        }
        const href = element.attr("href") || "";
        if (!href || href === "#" || href.endsWith("#")) {
          return null;
        }
        return href;
      };
      const images = $("section[data-image-data] img, #readerarea img, .reader-area img, .entry-content img").map((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || "";
        if (src && !src.includes("apps.png") && !src.includes("Kiryuu.IO.jpeg")) {
          return src.trim();
        }
        return null;
      }).get().filter(Boolean);
      const final_images = images.length ? images : $("img").map((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || "";
        const data_no = $(el).attr("data-no");
        if (src && (data_no || src.includes("/uploads/"))) {
          if (!src.includes("logo") && !src.includes("banner") && !src.includes("discord") && !src.includes("apps")) {
            return src.trim();
          }
        }
        return null;
      }).get().filter(Boolean);
      const prev_chapter_url = cleanNavigationUrl($('a[aria-label="Prev"]').first());
      const next_chapter_url = cleanNavigationUrl($('a[aria-label="Next"]').first());
      return {
        status: true,
        result: {
          url: target_url,
          slug: this.getSlug(target_url),
          prev_chapter_url: prev_chapter_url,
          next_chapter_url: next_chapter_url,
          images: final_images.length ? final_images : null,
          meta: Object.keys(meta).length ? meta : null
        }
      };
    } catch (error) {
      console.error(`[Error] Download scraping gagal: ${error.message}`);
      return {
        status: false,
        result: null
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
        examples: {
          home: "/?action=home",
          search: "/?action=search&query=martial-peak",
          detail: "/?action=detail&url=manga/martial-peak",
          download: "/?action=download&url=https://v7.kiryuu.to/martial-peak-chapter-3600/"
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
  const api = new KiryuuScraper();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        const searchQuery = params.query || params.keyword || params.q;
        if (!searchQuery) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk melakukan pencarian."
          });
        }
        response = await api.search({
          query: searchQuery,
          ...params
        });
        break;
      case "detail":
        const targetDetail = params.url || params.slug;
        if (!targetDetail) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk melihat detail."
          });
        }
        response = await api.detail({
          url: targetDetail,
          ...params
        });
        break;
      case "download":
        const targetDownload = params.url || params.slug;
        if (!targetDownload) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' atau 'slug' wajib diisi untuk mengambil gambar chapter."
          });
        }
        response = await api.download({
          url: targetDownload,
          ...params
        });
        break;
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
    if (response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
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
      error: error.message || "Unknown Error"
    });
  }
}