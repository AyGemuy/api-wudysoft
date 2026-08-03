import axios from "axios";
import * as cheerio from "cheerio";
class AlkitabClient {
  constructor() {
    try {
      console.log("[Sistem] Menginisialisasi Alkitab...");
      this.client = axios.create({
        baseURL: "https://alkitab.me",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "id-ID",
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
        timeout: 6e3
      });
    } catch (err) {
      console.log(`[Error] Inisialisasi gagal: ${err?.message || err}`);
    }
  }
  async r(url, params = {}, customHeaders = {}) {
    try {
      console.log(`[Proses] Mengakses: ${url}`);
      const res = await this.client.get(url, {
        params: params,
        headers: {
          ...customHeaders
        }
      });
      return res?.data || "";
    } catch (err) {
      console.log(`[Error] Request ke ${url} gagal: ${err?.message || err}`);
      return "";
    }
  }
  o($, selector) {
    try {
      return $(selector).map((idx, el) => {
        const element = $(el);
        return {
          value: element.attr("value") || "",
          label: element.text().trim() || "",
          is_selected: element.attr("selected") === "selected" || element.prop("selected") || false
        };
      }).get();
    } catch (err) {
      console.log(`[Error] Parsing selektor ${selector} gagal: ${err?.message || err}`);
      return [];
    }
  }
  l($) {
    return {
      versions: this.o($, "#version-options option") || [],
      books: this.o($, "#book-options option") || [],
      chapters: this.o($, "#chapter-options option") || [],
      verses_list: this.o($, "#verse-options option") || []
    };
  }
  async list({
    ...rest
  } = {}) {
    try {
      console.log("[Proses] Membuka halaman utama");
      const html = await this.r("/", {}, {
        "Sec-Fetch-Site": "none"
      });
      if (!html) {
        return {
          status: false,
          result: {
            error: "Gagal mengambil data halaman utama"
          }
        };
      }
      const _ = cheerio.load(html);
      const dataLists = this.l(_);
      if (dataLists.versions.length === 0 || dataLists.books.length === 0) {
        console.log("[Peringatan] Validasi data dropdown halaman utama gagal");
        return {
          status: false,
          result: {
            error: "Daftar menu utama kosong"
          }
        };
      }
      console.log("[Sukses] Memuat data list");
      return {
        status: true,
        result: dataLists
      };
    } catch (err) {
      console.log(`[Error] Kegagalan fungsi list(): ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Gagal memproses data"
        }
      };
    }
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`[Proses] Validasi query pencarian: "${query}"`);
      const q = query || "";
      if (typeof q !== "string" || q.trim() === "") {
        return {
          status: false,
          result: {
            error: "Parameter pencarian kosong"
          }
        };
      }
      const pl = rest?.pl || "1";
      const pb = rest?.pb || "1";
      const searchHeaders = {
        Referer: `https://alkitab.me/search?q=${encodeURIComponent(q)}&pl=${pl}&pb=${pb}`,
        "Sec-Fetch-Site": "same-origin"
      };
      const html = await this.r("/search", {
        q: q,
        pl: pl,
        pb: pb
      }, searchHeaders);
      if (!html) {
        return {
          status: false,
          result: {
            error: "Layanan pencarian tidak merespons"
          }
        };
      }
      const _ = cheerio.load(html);
      const results = _(".search-results .vw, #main.search-results .vw").map((idx, el) => {
        const container = _(el);
        const anchor = container.find("a");
        const title = anchor.text().trim() || "";
        const url = anchor.attr("href") || "";
        const contentText = container.find("p.vc").text().trim() || "";
        let version = "";
        let book = "";
        let chapter = "";
        let verse_id = "";
        try {
          const clean_path = url.split("#")[0] || "";
          const path_parts = clean_path.split("/").filter(Boolean);
          version = path_parts[0] || "";
          book = path_parts[1] || "";
          chapter = path_parts[2] || "";
          verse_id = (url.split("#")[1] || "").replace("verse-", "");
        } catch {}
        return {
          passage_reference: title,
          passage_url: url,
          passage_text: contentText,
          passage_components: {
            version_code: version || null,
            book_name: decodeURIComponent(book) || null,
            chapter_number: parseInt(chapter, 10) || chapter || null,
            verse_id: verse_id || null
          }
        };
      }).get();
      console.log(`[Sukses] Pencarian selesai, memperoleh ${results.length} baris data`);
      return {
        status: true,
        result: {
          search_results: results
        }
      };
    } catch (err) {
      console.log(`[Error] Gagal pada fungsi search(): ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Gagal mencari"
        }
      };
    }
  }
  async detail({
    ...rest
  }) {
    try {
      const version = rest?.version || "in-tb";
      const book = rest?.book || "Kejadian";
      const chapter = rest?.chapter || 1;
      const verse = rest?.verse || "";
      console.log(`[Proses] Menyiapkan detail kitab: ${version}/${book}/${chapter}`);
      let path = `/${encodeURIComponent(version)}/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`;
      if (verse) {
        path += `/${encodeURIComponent(verse)}`;
      }
      const detailHeaders = {
        Referer: "https://alkitab.me/search?q=Manusia",
        "Sec-Fetch-Site": "same-origin"
      };
      const html = await this.r(path, {}, detailHeaders);
      if (!html) {
        return {
          status: false,
          result: {
            error: "Gagal memuat halaman detail karena kesalahan request"
          }
        };
      }
      const _ = cheerio.load(html);
      const dataLists = this.l(_);
      const isVersionValid = dataLists.versions.some(v => v.value.toLowerCase() === version.toLowerCase());
      if (!isVersionValid && dataLists.versions.length > 0) {
        console.log(`[Peringatan] Validasi Gagal: Versi "${version}" tidak tersedia.`);
        return {
          status: false,
          result: {
            error: `Versi "${version}" tidak tersedia`
          }
        };
      }
      const isBookValid = dataLists.books.some(b => b.value.toLowerCase() === book.toLowerCase() || b.label.toLowerCase() === book.toLowerCase());
      if (!isBookValid && dataLists.books.length > 0) {
        console.log(`[Peringatan] Validasi Gagal: Kitab "${book}" tidak tersedia.`);
        return {
          status: false,
          result: {
            error: `Kitab "${book}" tidak tersedia`
          }
        };
      }
      const isChapterValid = dataLists.chapters.some(c => c.value === String(chapter));
      if (!isChapterValid && dataLists.chapters.length > 0) {
        console.log(`[Peringatan] Validasi Gagal: Pasal "${chapter}" tidak tersedia.`);
        return {
          status: false,
          result: {
            error: `Pasal "${chapter}" tidak tersedia`
          }
        };
      }
      const pageTitle = _("#the-content header h1").text().trim() || "";
      const verses = _("#the-content .vw").map((idx, el) => {
        const item = _(el);
        const id_attr = item.attr("id") || "";
        const verse_id = id_attr.replace("verse-", "") || "";
        const verse_num = parseInt(item.attr("data-verse") || "", 10) || parseInt(item.find(".vn").text().trim(), 10) || 0;
        const paragraphs = item.find("p").map((i, p) => _(p).text().trim()).get();
        const text_content = paragraphs.join(" ") || "";
        const xrefs = item.find("span.xref").map((i, xr) => _(xr).attr("id") || "").get().filter(Boolean);
        return {
          verse_id: verse_id || null,
          verse_number: verse_num || null,
          verse_text: text_content,
          cross_references: xrefs || []
        };
      }).get();
      if (verses.length === 0) {
        console.log("[Peringatan] Validasi Gagal: Data ayat kosong.");
        return {
          status: false,
          result: {
            error: "Data ayat tidak ditemukan untuk pasal ini"
          }
        };
      }
      const nextLink = _(".next-chapter a").attr("href") || "";
      const prevLink = _(".prev-chapter a").attr("href") || "";
      console.log(`[Sukses] Berhasil memproses data detail untuk "${pageTitle}"`);
      return {
        status: true,
        result: {
          chapter_title: pageTitle,
          verses_count: verses.length,
          verses: verses,
          prev: prevLink || null,
          next: nextLink || null
        }
      };
    } catch (err) {
      console.log(`[Error] Gagal pada fungsi detail(): ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: `Gagal memproses rincian ayat: ${err?.message || err}`
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
          list: "/?action=list",
          detail: "/?action=detail&book=Kejadian&chapter=1",
          search: "/?action=search&query=Manusia"
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
  const api = new AlkitabClient();
  try {
    let response;
    switch (action) {
      case "list":
        response = await api.list();
        break;
      case "detail":
        response = await api.detail(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=Manusia"
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
        error: "Tidak ada respons dari server Alkitab. Coba lagi nanti."
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