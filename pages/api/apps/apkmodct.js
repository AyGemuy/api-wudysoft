import axios from "axios";
import * as cheerio from "cheerio";
const BASE = "https://apkmodct.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const hdrs = ref => ({
  "Accept-Language": "id-ID",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": UA,
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  ...ref ? {
    Referer: ref
  } : {}
});
const ax = axios.create({
  baseURL: BASE,
  headers: hdrs()
});
const imgSrc = (el, $) => $(el).attr("data-src") || $(el).attr("src") || null;
const parseItems = $ => $(".post.item").map((_, el) => {
  const a = $(el).closest("a");
  return {
    url: a.attr("href") || null,
    title: $(el).find(".item-title").text().trim() || null,
    img: imgSrc($(el).find("img"), $),
    cat: $(el).find(".item-cat").text().trim() || null,
    rate: $(el).find(".item-rate span").first().text().trim() || null,
    date: $(el).find(".item-rate span").last().text().trim() || null,
    badge: $(el).find(".mod").text().trim() || null
  };
}).get();
const parsePaging = $ => ({
  current: parseInt($(".page-numbers.current").text().trim()) || 1,
  next: $(".next.page-numbers").attr("href") || null,
  pages: $(".page-numbers:not(.dots):not(.next):not(.prev)").map((_, el) => ({
    num: parseInt($(el).text().trim()) || null,
    url: $(el).attr("href") || null
  })).get()
});
class ApkModCT {
  async home({
    ...rest
  } = {}) {
    console.log("[home] fetching...");
    try {
      const {
        data
      } = await ax.get("/", {
        params: rest
      });
      const $ = cheerio.load(data);
      const items = parseItems($);
      const paging = parsePaging($);
      const cats = $("section.xz ul li a").map((_, el) => ({
        title: $(el).text().trim() || null,
        url: $(el).attr("href") || null
      })).get();
      console.log(`[home] got ${items.length} items, ${cats.length} cats`);
      return {
        items: items,
        cats: cats,
        paging: paging
      };
    } catch (e) {
      console.error("[home] error:", e?.message);
      throw e;
    }
  }
  async search({
    query,
    page,
    ...rest
  } = {}) {
    const q = query || "";
    const pg = page || 1;
    const url = pg > 1 ? `/page/${pg}/` : "/";
    console.log(`[search] query="${q}" page=${pg}`);
    try {
      const {
        data
      } = await ax.get(url, {
        params: {
          s: q,
          ...rest
        },
        headers: hdrs(`${BASE}/?s=${q}`)
      });
      const $ = cheerio.load(data);
      const items = parseItems($);
      const paging = parsePaging($);
      const heading = $(".srach-ta h2").text().replace("Result for:", "").trim() || q;
      console.log(`[search] got ${items.length} results, total pages: ${paging.pages.length}`);
      return {
        query: heading,
        page: pg,
        total: paging.pages.length || 1,
        items: items,
        paging: paging
      };
    } catch (e) {
      console.error("[search] error:", e?.message);
      throw e;
    }
  }
  async detail({
    url,
    ...rest
  } = {}) {
    if (!url) throw new Error("url required");
    console.log(`[detail] url=${url}`);
    try {
      const {
        data
      } = await ax.get(url, {
        params: rest,
        headers: hdrs(`${BASE}/`)
      });
      const $ = cheerio.load(data);
      const info = {};
      $(".tbl-single table tr").each((_, tr) => {
        const key = $(tr).find("th").text().trim().toLowerCase().replace(/\s+/g, "_");
        const val = $(tr).find("td").text().trim();
        if (key) info[key] = val || null;
      });
      const screenshots = [];
      $(".content-single img").each((_, el) => {
        const src = $(el).attr("data-src") || $(el).attr("src") || "";
        if (!src || src.startsWith("data:") || src.includes("base64")) return;
        screenshots.push(src);
      });
      if (!screenshots.length) {
        $(".album-container img").each((_, el) => {
          const src = $(el).attr("data-src") || $(el).attr("src") || "";
          if (src && !src.startsWith("data:")) screenshots.push(src);
        });
      }
      const dlUrl = $("a.new-dl[href]").first().attr("href") || null;
      const modText = $(".dl-inz-mod p").text().replace("🚀 MOD:", "").trim() || null;
      const updatedStrong = $(".dl-inz-up strong");
      const version = updatedStrong.first().text().trim() || info?.version || null;
      const updatedOn = updatedStrong.last().text().trim() || info?.updated || null;
      const related = $("aside .item a, aside section.item a").map((_, el) => {
        const img = $(el).find("img");
        const label = $(el).find(".relaetd").text().trim();
        return {
          title: label || $(el).attr("title")?.replace(" Mod Apk", "").trim() || null,
          url: $(el).attr("href") || null,
          img: imgSrc(img, $)
        };
      }).get().filter(r => r.url);
      const result = {
        title: $("h1.title-single").text().trim() || null,
        img: imgSrc($(".main-pic img").first(), $),
        dlUrl: dlUrl,
        size: $(".newdl-size").first().text().trim() || info?.size || null,
        mod: modText,
        version: version,
        updatedOn: updatedOn,
        desc: $(".content-single > p").first().text().trim() || null,
        screenshots: screenshots,
        info: info,
        related: related
      };
      console.log(`[detail] title="${result.title}" screenshots=${screenshots.length} related=${related.length}`);
      return result;
    } catch (e) {
      console.error("[detail] error:", e?.message);
      throw e;
    }
  }
  async download({
    url,
    ...rest
  } = {}) {
    if (!url) throw new Error("url required");
    const dlUrl = url.endsWith("/download/") ? url : `${url.replace(/\/$/, "")}/download/`;
    console.log(`[download] url=${dlUrl}`);
    try {
      const {
        data
      } = await ax.get(dlUrl, {
        params: rest,
        headers: hdrs(url)
      });
      const $ = cheerio.load(data);
      const links = $('a[rel="nofollow"]#dllink').map((_, el) => ({
        label: $(el).find("button").text().trim() || null,
        url: $(el).attr("href") || null
      })).get().filter(l => l.url);
      const infoItems = $(".infodl li").map((_, el) => $(el).text().trim()).get();
      const size = infoItems.find(t => t.includes("Size"))?.replace(/File Size:/i, "").trim() || null;
      const requires = infoItems.find(t => t.includes("Requires"))?.replace(/Requires Android:/i, "").trim() || null;
      const modInfo = $(".modinfodl").map((_, el) => ({
        label: $(el).find("summary").text().trim() || null,
        content: $(el).find(".m").text().trim() || null
      })).get();
      const recommended = $(".yarpp .item a, .yarpp section.item a").map((_, el) => ({
        title: $(el).find(".relaetd").text().trim() || $(el).attr("title") || null,
        url: $(el).attr("href") || null,
        img: imgSrc($(el).find("img"), $)
      })).get().filter(r => r.url);
      const result = {
        title: $("h1.title-single").text().trim() || null,
        img: imgSrc($(".main-pic img").first(), $),
        links: links,
        size: size,
        requires: requires,
        modInfo: modInfo,
        recommended: recommended
      };
      console.log(`[download] title="${result.title}" links=${links.length} recommended=${recommended.length}`);
      return result;
    } catch (e) {
      console.error("[download] error:", e?.message);
      throw e;
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
        example: "/?action=search&query=lite"
      }
    });
  }
  const api = new ApkModCT();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
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
            example: "https://apkmodct.com/subway-surfers-city-apk/"
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'.",
            example: "https://apkmodct.com/subway-surfers-apk/download/"
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