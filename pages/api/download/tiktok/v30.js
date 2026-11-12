import axios from "axios";
import * as cheerio from "cheerio";
class SnaptikDownloader {
  constructor() {
    this.base = "https://snaptik.monster";
    this.jar = new Map();
    this.init();
  }
  init() {
    console.log("[Setup] Menginisialisasi client axios dan cookie interceptor");
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: this.base,
        pragma: "no-cache",
        priority: "u=0, i",
        referer: `${this.base}/id/`,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(cfg => {
      const cookieHeader = Array.from(this.jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieHeader) cfg.headers["Cookie"] = cookieHeader;
      return cfg;
    });
    this.client.interceptors.response.use(res => {
      const rawCookies = res.headers?.["set-cookie"] || [];
      const list = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      list.forEach(cookieStr => {
        const item = cookieStr?.split(";")?.[0] || "";
        const [k, v] = item.split("=");
        if (k && v) this.jar.set(k.trim(), v.trim());
      });
      return res;
    });
  }
  async poll(ticket, startEp, statusEp, fileEp) {
    try {
      console.log(`[Task] Memulai proses render slideshow task: ${ticket}`);
      const startUrl = startEp || "/download/slideshow/start/";
      const statusUrl = statusEp || "/download/slideshow/status/";
      const fileUrl = fileEp || "/download/slideshow/file/";
      await this.client.post(startUrl, new URLSearchParams({
        token: ticket
      }).toString(), {
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
        }
      });
      let tries = 0;
      const maxTries = 30;
      while (tries < maxTries) {
        tries++;
        console.log(`[Task] Memeriksa status task (${tries}/${maxTries})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const res = await this.client.get(`${statusUrl}?token=${encodeURIComponent(ticket)}`, {
          headers: {
            accept: "application/json",
            "content-type": "application/json"
          }
        });
        const data = res?.data || {};
        if (data?.state === "ready") {
          console.log("[Task] Task slideshow selesai dirender");
          const urls = data?.urls || {};
          return {
            photos_zip: urls?.photos ? `${this.base}${urls.photos}` : `${this.base}${fileUrl}?type=photos&token=${ticket}`,
            video_mp4: urls?.video ? `${this.base}${urls.video}` : `${this.base}${fileUrl}?type=video&token=${ticket}`,
            bundle_zip: urls?.bundle ? `${this.base}${urls.bundle}` : `${this.base}${fileUrl}?type=bundle&token=${ticket}`
          };
        }
        if (data?.state === "failed") {
          console.log("[Task] Task slideshow gagal pada server");
          return null;
        }
      }
      console.log("[Task] Polling task mencapai batas timeout");
      return null;
    } catch (err) {
      console.log(`[Task Error] ${err?.message || err}`);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[Process] Memulai unduhan untuk URL: ${url}`);
    try {
      console.log("[Request] Mengambil halaman utama untuk token CSRF");
      const pageRes = await this.client.get("/id/");
      const $home = cheerio.load(pageRes?.data || "");
      const csrf = $home('input[name="_csrf"]')?.val() || "";
      if (!csrf) {
        throw new Error("CSRF token tidak ditemukan pada halaman");
      }
      console.log(`[Request] Mengirim payload form dengan CSRF: ${csrf}`);
      const body = new URLSearchParams({
        _csrf: csrf,
        url: url
      }).toString();
      const postRes = await this.client.post("/id/", body, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      console.log("[Parse] Memproses elemen DOM hasil unduhan");
      const $ = cheerio.load(postRes?.data || "");
      const author = $(".res-author")?.text()?.trim() || "Unknown";
      const desc = $(".res-desc")?.text()?.trim() || "";
      const cover = $(".res-cover")?.attr("src") || "";
      const videoUrl = $("a[data-media-download]")?.attr("href") || null;
      const audioUrl = $("a[data-audio-download]")?.attr("href") || null;
      const images = $(".img-grid figure.image-item").map((i, el) => $(el).find("a[data-media-download]")?.attr("href") || $(el).find("img")?.attr("src")).get().filter(Boolean);
      let slideshow = null;
      const ssWrap = $("[data-server-slideshow]");
      const ticket = ssWrap?.attr("data-ticket") || "";
      if (ticket) {
        const startEp = ssWrap?.attr("data-start-endpoint") || "";
        const statusEp = ssWrap?.attr("data-status-endpoint") || "";
        const fileEp = ssWrap?.attr("data-file-endpoint") || "";
        slideshow = await this.poll(ticket, startEp, statusEp, fileEp);
      }
      const isSlideshow = images?.length > 0 || Boolean(slideshow);
      console.log("[Done] Berhasil mengekstrak data");
      return {
        status: true,
        result: {
          type: isSlideshow ? "slideshow" : "video",
          author: author,
          description: desc,
          cover: cover,
          video_url: videoUrl,
          audio_url: audioUrl,
          images: images?.length ? images : null,
          slideshow: slideshow
        }
      };
    } catch (err) {
      console.log(`[Error] Terjadi kesalahan: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Gagal memproses data"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SnaptikDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}