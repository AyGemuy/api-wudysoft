import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk Snaptik:", proxy);
class Snaptik {
  constructor() {
    this.cookies = "";
    this.client = axios.create({
      baseURL: `${proxy}https://snaptik.kim`,
      timeout: 6e4
    });
    this.client.interceptors.request.use(config => {
      if (this.cookies) {
        config.headers["cookie"] = this.cookies;
      }
      return config;
    }, error => Promise.reject(error));
    this.client.interceptors.response.use(response => {
      const rawCookies = response.headers["set-cookie"];
      if (rawCookies?.length || 0 > 0) {
        const parsed = rawCookies.map(c => c.split(";")[0]).join("; ");
        this.cookies = this.cookies ? `${this.cookies}; ${parsed}` : parsed;
      }
      return response;
    }, error => Promise.reject(error));
  }
  async _req(cfg) {
    console.log(`[PROSES] Menuju URL: ${cfg?.url || "/"}`);
    try {
      const res = await this.client(cfg);
      console.log(`[SUKSES] HTTP Status: ${res?.status}`);
      return res?.data || "";
    } catch (err) {
      console.error(`[ERROR] Gagal saat request: ${err?.message}`);
      throw err;
    }
  }
  _par(html) {
    console.log("[PROSES] Memulai ekstraksi data HTML (Multi Tipe)...");
    try {
      const $ = cheerio.load(html || "<div></div>");
      const infoBlock = $(".video-info");
      const videoInfo = {
        title: infoBlock.find("h4").eq(0).text().trim() || $(".card-body .meta").text().trim() || "No Title",
        thumbnail: infoBlock.find(".thumb-container img").attr("src") || $(".card.icard img").eq(0).attr("src") || "",
        duration: infoBlock.find("span").eq(0).text().replace("Duration :", "").trim() || "N/A",
        views: infoBlock.find("span").eq(1).text().replace("Views :", "").trim() || "N/A"
      };
      let files = [];
      if ($(".files-table tbody tr").length > 0) {
        files = $(".files-table tbody tr").map((em, el) => {
          const row = $(el);
          const quality = row.find("td").eq(0).text().trim() || "Unknown";
          const type = row.find("td").eq(1).text().trim() || "mp4";
          const link = row.find("a.btn-dl").attr("href") || "";
          const text = row.find("a.btn-dl").eq(0).text().trim().replace(/\s+/g, " ") || "Download";
          return {
            quality: quality,
            type: type,
            link: link,
            text: `${text} (${quality} .${type})`
          };
        }).get();
      } else if ($(".card.icard").length > 0) {
        files = $(".card.icard").map((em, el) => {
          const card = $(el);
          const img = card.find("img.list_media").attr("src") || "";
          const link = card.find("a.btn-dl").attr("href") || "";
          const text = card.find("a.btn-dl").eq(em - em).text().trim().replace(/\s+/g, " ") || "Download";
          return {
            quality: "Original",
            type: "jpeg",
            link: link,
            img: img,
            text: text
          };
        }).get();
      }
      const result = {
        meta: videoInfo,
        total_files: files?.length || 0,
        files: files || []
      };
      console.log(`[SUKSES] Ekstraksi selesai. Menemukan ${result.total_files} file.`);
      return result;
    } catch (err) {
      console.error(`[ERROR] Gagal parsing HTML: ${err?.message}`);
      return {
        meta: {},
        total_files: 0,
        files: []
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[PROSES] Inisiasi full auto download via r2d2 proxy...`);
    const targetUrl = url || rest?.target || "https://vt.tiktok.com/";
    const baseHeaders = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    };
    try {
      console.log("[PROSES] [AUTO-GET] Mengambil session token awal dari server...");
      await this._req({
        method: "GET",
        url: "/",
        headers: baseHeaders
      });
      console.log(`[PROSES] [AUTO-POST] Mengirim payload URL TikTok: ${targetUrl}`);
      const payload = new URLSearchParams({
        page: targetUrl,
        ftype: "all",
        gres: "",
        ajax: "1"
      });
      const htmlResponse = await this._req({
        method: "POST",
        url: "/?sdl=1",
        headers: {
          ...baseHeaders,
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        },
        data: payload.toString()
      });
      return this._par(htmlResponse);
    } catch (err) {
      console.error(`[ERROR] Alur full auto download terputus: ${err?.message}`);
      return {
        meta: {},
        total_files: 0,
        files: []
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
  const api = new Snaptik();
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