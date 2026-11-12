import axios from "axios";
import * as cheerio from "cheerio";
class Ruangkomiku {
  constructor() {
    this.base = "https://www.ruangkomiku.com";
    this.req = axios.create({
      baseURL: this.base,
      timeout: 25e3,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        referer: "https://www.ruangkomiku.com/"
      }
    });
  }
  cln(str) {
    return str ? str.replace(/\s+/g, " ").trim() : "";
  }
  extNextData(html) {
    try {
      const regex = /self\.__next_f\.push\(\[\d+,\s*"([\s\S]*?)"\]\)/g;
      let match;
      let combined = "";
      while ((match = regex.exec(html)) !== null) {
        combined += match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
      return combined;
    } catch {
      return "";
    }
  }
  parseCard(_, el) {
    const title = _("h3", el).text() || _("img", el).attr("alt") || "";
    const url = _(el).is("a") ? _(el).attr("href") : _("a", el).attr("href") || "";
    const thumbnail = _("img", el).attr("src") || "";
    const type = _(".font-semibold.uppercase", el).first().text() || _(".bg-amber-500", el).text() || "";
    const rating = _(".lucide-star", el).parent().text() || "";
    const latest_chapter = _(".text-amber-700", el).text() || _(".text-amber-400", el).text() || "";
    const slug = url ? url.replace(/^.*\/komik\//, "").replace(/\/$/, "") : "";
    return {
      title: this.cln(title),
      slug: slug || null,
      url: url?.startsWith("http") ? url : `${this.base}${url || ""}`,
      thumbnail: thumbnail || null,
      type: this.cln(type) || null,
      rating: parseFloat(this.cln(rating)) || null,
      latest_chapter: this.cln(latest_chapter) || null
    };
  }
  async getHome({
    ...rest
  } = {}) {
    console.log("[Ruangkomiku] Memulai getHome...");
    try {
      const {
        data
      } = await this.req.get("/", {
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Ruangkomiku] Parsing data hero slider...");
      const rawPayload = this.extNextData(data);
      let hero = [];
      const heroMatch = rawPayload.match(/"comics":(\[\{.*?\}\])/);
      if (heroMatch?.[1]) {
        try {
          const parsed = JSON.parse(heroMatch[1]);
          hero = parsed.map(item => ({
            id: item?.id || null,
            title: item?.title || "",
            slug: item?.slug || "",
            url: `${this.base}/komik/${item?.slug || ""}`,
            cover_url: item?.coverUrl || "",
            cover_landscape_url: item?.coverLandscapeUrl || "",
            rating: item?.rating || null,
            status: item?.status || null,
            type: item?.comicType || null,
            synopsis: item?.synopsis || null,
            latest_chapter: {
              title: item?.latestChapter?.title || "",
              slug: item?.latestChapter?.slug || "",
              url: `${this.base}/baca/${item?.latestChapter?.slug || ""}`,
              release_date: item?.latestChapter?.releaseDateText || ""
            }
          }));
        } catch {
          hero = [];
        }
      }
      console.log("[Ruangkomiku] Parsing bagian Sedang Tren...");
      const trending = _("section").filter((i, el) => _("h2", el).text().includes("Sedang Tren")).find(".grid > a").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Ruangkomiku] Parsing bagian Pembaruan Terkini...");
      const latest_updates = _("section").filter((i, el) => _("h2", el).text().includes("Pembaruan Terkini")).find(".grid > a").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Ruangkomiku] Sukses memuat homepage.");
      return {
        status: true,
        result: {
          hero_slider: hero || [],
          trending: trending || [],
          latest_updates: latest_updates || []
        }
      };
    } catch (err) {
      console.error(`[Ruangkomiku] Error getHome: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal mengambil data beranda"
      };
    }
  }
  async searchComic({
    query = "",
    ...rest
  } = {}) {
    console.log(`[Ruangkomiku] Memulai searchComic: "${query}"...`);
    try {
      if (!query) {
        throw new Error('Parameter "query" wajib disertakan.');
      }
      const {
        data
      } = await this.req.get("/search", {
        params: {
          q: query
        },
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Ruangkomiku] Mem-parsing hasil pencarian...");
      const items = _(".grid > a").map((i, el) => this.parseCard(_, el)).get();
      console.log(`[Ruangkomiku] searchComic selesai. Total item: ${items.length}`);
      return {
        status: true,
        result: {
          query: query,
          total: items.length,
          data: items || []
        }
      };
    } catch (err) {
      console.error(`[Ruangkomiku] Error searchComic: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal mencari komik"
      };
    }
  }
  async getDetail({
    slug,
    ...rest
  } = {}) {
    const cleanSlug = slug?.replace(/^.*\/komik\//, "")?.replace(/\/$/, "") || "";
    console.log(`[Ruangkomiku] Memulai getDetail untuk slug: "${cleanSlug}"...`);
    try {
      if (!cleanSlug) {
        throw new Error('Parameter "slug" wajib disertakan.');
      }
      const {
        data
      } = await this.req.get(`/komik/${cleanSlug}`, {
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Ruangkomiku] Ekstraksi metadata utama...");
      const rawPayload = this.extNextData(data);
      let comicData = null;
      const comicMatch = rawPayload.match(/"comic":(\{.*?"chapters":\[.*?\]\})/);
      if (comicMatch?.[1]) {
        try {
          comicData = JSON.parse(comicMatch[1]);
        } catch {}
      }
      const title = comicData?.title || this.cln(_("h1").first().text());
      const cover = comicData?.coverUrl || _('img[alt="' + title + '"]').attr("src") || "";
      const rating = comicData?.rating || parseFloat(this.cln(_(".lucide-star").parent().text())) || null;
      const author = comicData?.author || this.cln(_('span:contains("Oleh")').next().text()) || null;
      const status = comicData?.status || this.cln(_("span.bg-amber-500\\/90").text()) || null;
      const type = comicData?.comicType || this.cln(_('span:contains("MANGA"), span:contains("MANHWA"), span:contains("MANHUA")').first().text()) || null;
      const synopsis = comicData?.synopsis || this.cln(_(".relative.overflow-hidden p").text()) || null;
      const alternative_titles = comicData?.alternativeTitles || [];
      const genres = comicData?.genres?.map(g => g.name) || _('a[href*="genre="]').map((i, el) => this.cln(_(el).text())).get();
      console.log("[Ruangkomiku] Ekstraksi daftar chapter...");
      let chapters = [];
      if (comicData?.chapters?.length) {
        chapters = comicData.chapters.map(ch => ({
          chapter_number: ch.chapterNumber,
          title: ch.title,
          slug: ch.slug,
          url: `${this.base}/baca/${ch.slug}`,
          release_date: ch.releaseDateText || null
        }));
      } else {
        chapters = _('a[href*="/baca/"]').filter((i, el) => _(el).find(".font-mono").length > 0).map((i, el) => {
          const chTitle = _(el).find("span.truncate").text();
          const chSlug = _(el).attr("href")?.replace(/^\/baca\//, "");
          const chNum = parseFloat(_(el).find(".font-mono").first().text()) || null;
          const release = _(el).find(".font-mono").last().text() || "";
          return {
            chapter_number: chNum,
            title: this.cln(chTitle),
            slug: chSlug,
            url: `${this.base}/baca/${chSlug}`,
            release_date: this.cln(release) || null
          };
        }).get();
      }
      console.log("[Ruangkomiku] Ekstraksi rekomendasi pembaca...");
      const recommendations = _(".space-y-3 a.group").map((i, el) => this.parseCard(_, el)).get();
      console.log("[Ruangkomiku] Sukses memproses getDetail.");
      return {
        status: true,
        result: {
          title: title,
          slug: cleanSlug,
          alternative_titles: alternative_titles || [],
          cover_url: cover || null,
          rating: rating,
          author: author,
          status: status,
          type: type,
          synopsis: synopsis,
          genres: genres || [],
          total_chapters: chapters.length,
          chapters: chapters || [],
          recommendations: recommendations || []
        }
      };
    } catch (err) {
      console.error(`[Ruangkomiku] Error getDetail: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memuat detail komik"
      };
    }
  }
  async getChapter({
    slug,
    ...rest
  } = {}) {
    const cleanSlug = slug?.replace(/^.*\/baca\//, "")?.replace(/\/$/, "") || "";
    console.log(`[Ruangkomiku] Memulai getChapter: "${cleanSlug}"...`);
    try {
      if (!cleanSlug) {
        throw new Error('Parameter "slug" wajib disertakan.');
      }
      const {
        data
      } = await this.req.get(`/baca/${cleanSlug}`, {
        ...rest
      });
      const _ = cheerio.load(data);
      console.log("[Ruangkomiku] Mengekstrak data halaman...");
      const title = this.cln(_("header a span").text()) || null;
      const chapter_title = this.cln(_("header h2").text()) || null;
      const comic_url = _("header a").attr("href") || null;
      const images = _("main img").map((i, el) => {
        const src = _(el).attr("src") || "";
        return {
          page: i + 1,
          image_url: src
        };
      }).get();
      const prev_slug = _('a:contains("Bab Sebelumnya")').attr("href")?.replace(/^\/baca\//, "") || null;
      const next_slug = _('a:contains("Bab Selanjutnya")').attr("href")?.replace(/^\/baca\//, "") || null;
      console.log(`[Ruangkomiku] Sukses memuat chapter (${images.length} halaman).`);
      return {
        status: true,
        result: {
          comic_title: title,
          comic_slug: comic_url ? comic_url.replace("/komik/", "") : null,
          chapter_title: chapter_title,
          current_slug: cleanSlug,
          navigation: {
            prev_chapter: prev_slug ? `${this.base}/baca/${prev_slug}` : null,
            next_chapter: next_slug ? `${this.base}/baca/${next_slug}` : null
          },
          total_images: images.length,
          images: images || []
        }
      };
    } catch (err) {
      console.error(`[Ruangkomiku] Error getChapter: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Gagal memuat gambar chapter"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "chapter", "trending", "latestUpdates"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          trending: "/?action=trending",
          latestUpdates: "/?action=latestUpdates",
          search: "/?action=search&query=Kami",
          detail: "/?action=detail&slug=303-goushitsu-no-kami-sama",
          chapter: "/?action=chapter&slug=303-goushitsu-no-kami-sama-chapter-23"
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
  const api = new Ruangkomiku();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.getHome(params);
        break;
      case "trending": {
        const homeData = await api.getHome(params);
        response = homeData.status ? {
          status: true,
          result: homeData.result.trending
        } : homeData;
        break;
      }
      case "latestUpdates": {
        const homeData = await api.getHome(params);
        response = homeData.status ? {
          status: true,
          result: homeData.result.latest_updates
        } : homeData;
        break;
      }
      case "search": {
        const query = params.query || params.q || params.title;
        if (!query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 'title' wajib diisi untuk search."
          });
        }
        response = await api.searchComic({
          query: query,
          ...params
        });
        break;
      }
      case "detail": {
        const slug = params.slug || params.id;
        if (!slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk detail."
          });
        }
        response = await api.getDetail({
          slug: slug,
          ...params
        });
        break;
      }
      case "chapter": {
        const slug = params.slug || params.chapterSlug;
        if (!slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk chapter."
          });
        }
        response = await api.getChapter({
          slug: slug,
          ...params
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