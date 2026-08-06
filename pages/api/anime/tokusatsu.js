import axios from "axios";
import * as cheerio from "cheerio";
class TokusatsuClient {
  constructor() {
    try {
      console.log("[Sistem] Menginisialisasi TokusatsuClient...");
      this.client = axios.create({
        baseURL: "https://www.tokusatsuindo.com",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "id-ID,id;q=0.9",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Pragma: "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        timeout: 1e4
      });
    } catch (err) {
      console.log(`[Error] Inisialisasi TokusatsuClient gagal: ${err?.message || err}`);
    }
  }
  async r(url, params = {}, customHeaders = {}) {
    try {
      console.log(`[Proses] Mengakses GET: ${url}`);
      const res = await this.client.get(url, {
        params: params,
        headers: {
          ...customHeaders
        }
      });
      return res?.data || "";
    } catch (err) {
      console.log(`[Error] Gagal mengakses GET ${url}: ${err?.message || err}`);
      return "";
    }
  }
  async p(data) {
    try {
      console.log(`[Proses] Mengirim request POST AJAX untuk action: ${data?.action}`);
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(data)) {
        params.append(key, val);
      }
      const res = await this.client.post("/wp-admin/admin-ajax.php", params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Referer: "https://www.tokusatsuindo.com/"
        }
      });
      return res?.data || "";
    } catch (err) {
      console.log(`[Error] Request POST AJAX gagal: ${err?.message || err}`);
      return "";
    }
  }
  async home({
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log(`[Proses] Memuat halaman utama (Halaman ${page})`);
      const path = page > 1 ? `/page/${page}/` : "/";
      const html = await this.r(path);
      if (!html) {
        return {
          status: false,
          result: {
            error: "Gagal memuat halaman utama TokusatsuIndo"
          }
        };
      }
      const _ = cheerio.load(html);
      const updates = _("#gmr-main-load article, .site-main article").map((idx, el) => {
        const item = _(el);
        const anchor = item.find(".entry-title a");
        const title = anchor.text().trim() || "";
        const url = anchor.attr("href") || "";
        const image = item.find(".content-thumbnail img").attr("src") || "";
        const categories = item.find(".gmr-movie-on a").map((i, cat) => ({
          name: _(cat).text().trim() || "",
          url: _(cat).attr("href") || ""
        })).get();
        return {
          title: title,
          url: url,
          image: image,
          categories: categories
        };
      }).get();
      const movies = _(".muvipro-posts-module .gmr-item-modulepost").map((idx, el) => {
        const item = _(el);
        const anchor = item.find(".entry-title a");
        const title = anchor.text().trim() || "";
        const url = anchor.attr("href") || "";
        const image = item.find("a img").attr("src") || "";
        return {
          title: title,
          url: url,
          image: image
        };
      }).get();
      const pagination = _(".pagination ul.page-numbers li").map((idx, el) => {
        const item = _(el);
        return {
          label: item.text().trim() || "",
          url: item.find("a").attr("href") || ""
        };
      }).get();
      if (updates.length === 0 && movies.length === 0) {
        console.log("[Peringatan] Validasi list gagal: Konten kosong");
        return {
          status: false,
          result: {
            error: "Struktur web berubah atau data tidak ditemukan"
          }
        };
      }
      console.log(`[Sukses] Berhasil mengekstrak ${updates.length} update baru dan ${movies.length} film`);
      return {
        status: true,
        result: {
          current_page: page,
          tokusatsu_updates: updates,
          movies_and_specials: movies,
          pagination: pagination
        }
      };
    } catch (err) {
      console.log(`[Error] Gagal memuat data home(): ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Terjadi kesalahan sistem"
        }
      };
    }
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`[Proses] Melakukan pencarian video: "${query}"`);
      const q = query || "";
      if (typeof q !== "string" || q.trim() === "") {
        return {
          status: false,
          result: {
            error: "Kata kunci pencarian tidak boleh kosong"
          }
        };
      }
      const homeHtml = await this.r("/");
      const security = homeHtml.match(/"security"\s*:\s*"([a-f0-9]+)"/i)?.[1] || "f41f11638d";
      const searchData = await this.p({
        action: "muvipro_core_ajax_search_movie",
        security: security,
        query: q
      });
      let suggestions = [];
      try {
        const parsed = typeof searchData === "string" ? JSON.parse(searchData) : searchData;
        suggestions = parsed?.suggestions || [];
      } catch {}
      const results = suggestions.map(item => {
        const $thumb = cheerio.load(item.thumb || "");
        const imageUrl = $thumb("img").attr("src") || "";
        return {
          post_id: item.id || null,
          title: item.value || "",
          url: item.url || "",
          thumbnail: imageUrl
        };
      });
      console.log(`[Sukses] Menemukan ${results.length} hasil untuk query: "${q}"`);
      return {
        status: true,
        result: {
          query: q,
          search_results: results
        }
      };
    } catch (err) {
      console.log(`[Error] Gagal pada fungsi search(): ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Pencarian gagal diproses"
        }
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      console.log(`[Proses] Membuka halaman detail: ${url}`);
      if (!url || !url.startsWith("http")) {
        return {
          status: false,
          result: {
            error: "URL target tidak valid"
          }
        };
      }
      const html = await this.r(url);
      if (!html) {
        return {
          status: false,
          result: {
            error: "Halaman detail tidak merespons"
          }
        };
      }
      const _ = cheerio.load(html);
      const postIdAttr = _('article[id^="post-"]').attr("id") || "";
      const postId = postIdAttr.replace("post-", "") || _(".muvipro_player_content").attr("data-id") || "";
      if (!postId) {
        return {
          status: false,
          result: {
            error: "ID konten tidak dapat terdeteksi"
          }
        };
      }
      const title = _("h1.entry-title").text().trim() || _(".gmr-movie-data h1").text().trim() || "";
      const postedOn = _("time.entry-date.published").text().trim() || "";
      const genres = _(".gmr-moviedata").text().includes("Genre") ? _('.gmr-moviedata:contains("Genre") a').map((i, el) => _(el).text().trim()).get() : [];
      let views = 0;
      const viewsNonce = html.match(/"nonce"\s*:\s*"([a-f0-9]+)"/i)?.[1] || html.match(/nonce\s*=\s*["']([a-f0-9]+)["']/i)?.[1] || "";
      if (viewsNonce) {
        const viewsRes = await this.p({
          action: "postviews",
          nonce: viewsNonce,
          postviews_id: postId,
          cache: "false"
        });
        try {
          const parsedViews = typeof viewsRes === "string" ? JSON.parse(viewsRes) : viewsRes;
          views = parsedViews?.data?.views || 0;
        } catch {}
      }
      const playerTabs = _("#gmr-tab li a").map((i, el) => ({
        id: _(el).attr("href")?.replace("#", "") || "",
        name: _(el).text().trim() || ""
      })).get();
      const players = [];
      for (const tab of playerTabs) {
        const playerHtml = await this.p({
          action: "muvipro_player_content",
          tab: tab.id,
          post_id: postId
        });
        if (playerHtml) {
          const $player = cheerio.load(playerHtml);
          let videoUrl = $player("iframe").attr("src") || "";
          if (!videoUrl) {
            const linkMatch = playerHtml.match(/link="([^"]+)"/);
            videoUrl = linkMatch ? linkMatch[1] : "";
          }
          players.push({
            server_name: tab.name,
            video_url: videoUrl
          });
        }
      }
      const downloads = _("#download .gmr-download-list li a").map((i, el) => ({
        label: _(el).text().trim() || "",
        url: _(el).attr("href") || ""
      })).get();
      if (!title) {
        return {
          status: false,
          result: {
            error: "Gagal mengekstrak struktur detail video"
          }
        };
      }
      console.log(`[Sukses] Berhasil menyusun data video untuk "${title}"`);
      return {
        status: true,
        result: {
          post_id: parseInt(postId, 10) || postId,
          title: title,
          posted_on: postedOn,
          views_count: parseInt(views, 10) || 0,
          genres: genres,
          players: players,
          downloads: downloads
        }
      };
    } catch (err) {
      console.log(`[Error] Gagal mengekstrak detail(): ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Gagal mengekstrak rincian video"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["list", "detail", "search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          list: "/?action=list&page=1",
          detail: "/?action=detail&url=https://www.tokusatsuindo.com/forticus-stream-the-heirs-to-their-favorite-hero-sub-indonesia/",
          search: "/?action=search&query=kamen"
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
  const api = new TokusatsuClient();
  try {
    let response;
    switch (action) {
      case "list":
        response = await api.home(params);
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
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
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
        error: "Tidak ada respons dari server TokusatsuIndo."
      });
    }
    if (response.status === false) {
      return res.status(400).json({
        status: false,
        action: action,
        ...response
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