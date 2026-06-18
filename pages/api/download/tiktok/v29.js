import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk TikSave:", proxy);
class TikSave {
  constructor() {
    this.baseUrl = `${proxy}https://tiksave.io`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-MM,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://tiksave.io",
      referer: "https://tiksave.io/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: this.headers
    });
  }
  async _req(cfg) {
    console.log(`[PROSES] Melakukan HTTP Request ke: ${cfg?.url || "/"}`);
    try {
      const res = await this.client(cfg);
      console.log(`[SUKSES] HTTP Status: ${res?.status || 200}`);
      return res?.data || null;
    } catch (err) {
      console.error(`[ERROR] Gagal saat melakukan request: ${err?.message || err}`);
      throw err;
    }
  }
  _par(htmlContent) {
    console.log("[PROSES] Memulai parsing data hasil download menggunakan Cheerio...");
    try {
      const $ = cheerio.load(htmlContent || "<div></div>");
      const title = $(".tik-video .content h3").eq(0).text().trim() || "No Title";
      const thumbnail = $(".thumbnail .image-tik img").eq(0).attr("src") || "";
      const tiktokId = $("#TikTokId").eq(0).val() || "";
      const links = $(".dl-action p a").map((em, el) => {
        const item = $(el);
        const text = item.text().replace(/\s+/g, " ").trim();
        const url = item.attr("href") || "";
        let type = "video";
        if (text.toLowerCase().includes("mp3") || text.toLowerCase().includes("audio")) {
          type = "audio";
        } else if (text.toLowerCase().includes("hd")) {
          type = "video_hd";
        }
        return {
          type: type,
          text: text,
          url: url
        };
      }).get();
      const images = $(".photo-list .download-items").map((em, item) => {
        const $item = $(item);
        return {
          thumbnail: $item.find("img").eq(0).attr("src") || "",
          dlink: $item.find("a").eq(0).attr("href") || ""
        };
      }).get();
      return {
        success: links.length > 0 || images.length > 0,
        tiktokId: tiktokId,
        title: title,
        thumbnail: thumbnail,
        links: links,
        images: images.length > 0 ? images : null
      };
    } catch (err) {
      console.error(`[ERROR] Gagal mengekstrak HTML template: ${err?.message || err}`);
      return {
        success: false,
        links: [],
        images: null
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[PROSES] Memulai alur download dari TikSave...");
    try {
      const targetUrl = url || rest?.target || rest?.link || rest?.q || "";
      if (!targetUrl) throw new Error("URL TikTok tidak boleh kosong!");
      const payload = new URLSearchParams({
        q: targetUrl,
        lang: "en"
      });
      const responseJson = await this._req({
        method: "POST",
        url: "/api/ajaxSearch",
        headers: {
          origin: "https://tiksave.io",
          referer: "https://tiksave.io/en"
        },
        data: payload.toString()
      });
      if (!responseJson || responseJson.status !== "ok" || !responseJson.data) {
        throw new Error("Server target memberikan response error atau data kosong.");
      }
      const parsedData = this._par(responseJson.data);
      return parsedData;
    } catch (err) {
      console.error(`[ERROR] Alur download TikSave terhenti: ${err?.message || err}`);
      return {
        success: false,
        message: err?.message || "Internal Error"
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
  const api = new TikSave();
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