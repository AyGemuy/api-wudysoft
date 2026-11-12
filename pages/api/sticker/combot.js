import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class Combot {
  constructor() {
    this.target_base_url = "https://combot.org/stickers";
    this.proxy_base_url = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1`;
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/html, */*"
      }
    });
  }
  async req(path = "", params = {}) {
    try {
      const url_obj = new URL(`${this.target_base_url}${path}`);
      Object.entries(params || {}).forEach(([key, val]) => {
        if (key === "page" && (Number(val) === 1 || String(val) === "1")) {
          return;
        }
        if (val !== undefined && val !== null && val !== "") {
          url_obj.searchParams.set(key, String(val));
        }
      });
      const final_target_url = url_obj.toString();
      const proxy_url = `${this.proxy_base_url}?url=${encodeURIComponent(final_target_url)}`;
      console.log(`[LOG] Target URL: ${final_target_url}`);
      console.log(`[LOG] Request via Proxy: ${proxy_url}`);
      const res = await this.client.get(proxy_url);
      console.log(`[LOG] Respon proxy status: ${res?.status || 200}`);
      let raw_html = "";
      if (typeof res?.data === "string") {
        raw_html = res.data;
      } else if (typeof res?.data?.result === "string") {
        raw_html = res.data.result;
      } else if (typeof res?.data?.data === "string") {
        raw_html = res.data.data;
      } else {
        raw_html = JSON.stringify(res?.data || "");
      }
      return raw_html || "";
    } catch (err) {
      console.error(`[ERROR] Gagal pada req():`, err?.message || err);
      return "";
    }
  }
  prs(html = "") {
    try {
      if (!html || typeof html !== "string") {
        console.log("[LOG] HTML kosong/invalid, proses parsing dibatalkan.");
        return {
          total_available_packs: 0,
          current_page: 1,
          total_pages: 1,
          next_page: null,
          prev_page: null,
          stickers: []
        };
      }
      console.log("[LOG] Memulai parsing Cheerio untuk seluruh informasi...");
      const _ = cheerio.load(html);
      const total_packs_raw = _("[data-stickers-number]")?.first()?.attr("data-stickers-number") || _(".stickers-sidebar-total")?.first()?.text()?.trim() || "0";
      const total_available_packs = parseInt(total_packs_raw.replace(/\D/g, ""), 10) || 0;
      const current_page_text = _('.stickers-page-ellipsis[aria-current="page"], .stickers-page-link.active')?.first()?.text()?.trim() || "1";
      const page_match = current_page_text ? current_page_text.match(/\d+/) : null;
      const current_page = page_match ? parseInt(page_match[0], 10) : 1;
      let max_page = current_page;
      _(".stickers-page-link").each((i, el) => {
        const elem = _(el);
        const text_num = parseInt(elem.text().trim(), 10);
        const href = elem.attr("href") || "";
        const href_match = href ? href.match(/page=(\d+)/) : null;
        const page_val = text_num || (href_match ? parseInt(href_match[1], 10) : null);
        if (page_val && page_val > max_page) {
          max_page = page_val;
        }
      });
      const next_page = current_page < max_page ? current_page + 1 : null;
      const prev_page = current_page > 1 ? current_page - 1 : null;
      const stickers = _(".stickerset").map((i, el) => {
        const elem_id = _(el).attr("id")?.replace(/^stickerset-/, "") || "";
        if (elem_id === "list" || elem_id === "modal") return null;
        const data_attr = _(el).attr("data-data");
        if (!data_attr) return null;
        try {
          const data = JSON.parse(data_attr.replace(/&quot;/g, '"'));
          const preview_urls = _(el).find(".stickerset__image").get().map(img => _(img).attr("data-src") || _(img).find("img").attr("src") || _(img).attr("src") || "").filter(src => src && !src.startsWith("data:") && !src.endsWith("/telegram.svg"));
          return {
            id: data?._id || elem_id || "",
            title: data?.title || _(el).find(".stickers-card-title-wrap")?.first()?.text()?.trim() || "",
            created: data?.created_date || null,
            updated: data?.updated_date || null,
            uses: data?.uses !== undefined ? Number(data.uses) : 0,
            type: data?.sticker_type || null,
            is_nsfw: data?.is_porno !== undefined ? data.is_porno === 2 : false,
            total_stickers: Array.isArray(data?.stickers) ? data.stickers.length : preview_urls.length,
            emojis: Array.isArray(data?.stickers) ? data.stickers : [],
            url: preview_urls,
            telegram: data?._id ? `https://t.me/addstickers/${data._id}` : elem_id ? `https://t.me/addstickers/${elem_id}` : ""
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);
      console.log(`[LOG] Sukses mengekstrak ${stickers.length} paket stiker.`);
      return {
        total_available_packs: total_available_packs,
        current_page: current_page,
        total_pages: max_page,
        next_page: next_page,
        prev_page: prev_page,
        stickers: stickers
      };
    } catch (err) {
      console.error(`[ERROR] Gagal saat parsing Cheerio di prs():`, err?.message || err);
      return {
        total_available_packs: 0,
        current_page: 1,
        total_pages: 1,
        next_page: null,
        prev_page: null,
        stickers: []
      };
    }
  }
  async popular({
    page,
    ...rest
  }) {
    try {
      const p = page ? Number(page) : 1;
      console.log(`[LOG] [popular] Mengambil stiker terbaru - Halaman: ${p}`);
      const html = await this.req("", {
        page: p,
        ...rest
      });
      if (!html) {
        return {
          status: false,
          result: {
            message: "Gagal memuat data stiker populer dari proxy."
          }
        };
      }
      const parsed = this.prs(html);
      return {
        status: true,
        result: {
          page: p,
          current_page: parsed?.current_page || p,
          total_pages: parsed?.total_pages || 1,
          next_page: parsed?.next_page || null,
          prev_page: parsed?.prev_page || null,
          total_available_packs: parsed?.total_available_packs || 0,
          total_results: parsed?.stickers?.length || 0,
          stickers: parsed?.stickers || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] Error pada method popular():`, err?.message || err);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan pada method popular()"
        }
      };
    }
  }
  async trending({
    ...rest
  }) {
    try {
      console.log("[LOG] [trending] Mengambil stiker trending...");
      const html = await this.req("/trending", {
        ...rest
      });
      if (!html) {
        return {
          status: false,
          result: {
            message: "Gagal memuat data stiker trending dari proxy."
          }
        };
      }
      const parsed = this.prs(html);
      return {
        status: true,
        result: {
          total_available_packs: parsed?.total_available_packs || 0,
          total_results: parsed?.stickers?.length || 0,
          stickers: parsed?.stickers || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] Error pada method trending():`, err?.message || err);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan pada method trending()"
        }
      };
    }
  }
  async top({
    ...rest
  }) {
    try {
      console.log("[LOG] [top] Mengambil stiker Top 30...");
      const html = await this.req("/top30", {
        ...rest
      });
      if (!html) {
        return {
          status: false,
          result: {
            message: "Gagal memuat data stiker top30 dari proxy."
          }
        };
      }
      const parsed = this.prs(html);
      return {
        status: true,
        result: {
          total_available_packs: parsed?.total_available_packs || 0,
          total_results: parsed?.stickers?.length || 0,
          stickers: parsed?.stickers || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] Error pada method top():`, err?.message || err);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan pada method top()"
        }
      };
    }
  }
  async search({
    query,
    page,
    ...rest
  }) {
    try {
      const q = query ? String(query).trim() : "";
      const p = page ? Number(page) : 1;
      console.log(`[LOG] [search] Query: "${q}", Halaman: ${p}`);
      if (!q) {
        return {
          status: false,
          result: {
            message: 'Parameter "query" wajib diisi.'
          }
        };
      }
      const html = await this.req("", {
        q: q,
        page: p,
        ...rest
      });
      if (!html) {
        return {
          status: false,
          result: {
            message: "Gagal memuat hasil pencarian dari proxy."
          }
        };
      }
      const parsed = this.prs(html);
      return {
        status: true,
        result: {
          query: q,
          page: p,
          current_page: parsed?.current_page || p,
          total_pages: parsed?.total_pages || 1,
          next_page: parsed?.next_page || null,
          prev_page: parsed?.prev_page || null,
          total_available_packs: parsed?.total_available_packs || 0,
          total_results: parsed?.stickers?.length || 0,
          stickers: parsed?.stickers || []
        }
      };
    } catch (err) {
      console.error(`[ERROR] Error pada method search():`, err?.message || err);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan pada method search()"
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
  const validActions = ["popular", "trending", "top", "search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          popular: "/?action=popular&page=1",
          trending: "/?action=trending",
          top: "/?action=top",
          search: "/?action=search&query=cat&page=1"
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
  const api = new Combot();
  try {
    let response;
    switch (action) {
      case "popular":
        response = await api.popular(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "top":
        response = await api.top(params);
        break;
      case "search":
        if (!params.query && !params.q && !params.title) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' (atau 'q' / 'title') wajib diisi untuk pencarian stiker."
          });
        }
        response = await api.search({
          query: params.query || params.q || params.title,
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