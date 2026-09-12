import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class MediaMister {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.mediamister.com/free-youtube-video-downloader",
        Origin: "https://www.mediamister.com",
        "X-Requested-With": "XMLHttpRequest"
      }
    }));
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[PROSES] Memulai fetch data untuk: ${url}`);
    try {
      const payload = new URLSearchParams({
        url: url
      });
      const {
        data
      } = await this.client.post(rest?.endpoint || "https://www.mediamister.com/get_youtube_video", payload.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      console.log("[PROSES] Parsing HTML response...");
      return this.parse(data);
    } catch (err) {
      console.error(`[ERROR] Gagal ambil data: ${err?.message || "Unknown Error"}`);
      return {
        status: false,
        msg: err?.message
      };
    }
  }
  parse(html) {
    try {
      const $ = cheerio.load(html || "");
      const thumb = $(".yt_thumb img")?.attr("src") || "";
      const title = $("h2")?.text()?.trim() || "No Title";
      const result = [];
      $("a.download-button").each((_, el) => {
        const rawUrl = $(el).attr("href");
        const isAudio = $(el).hasClass("audio");
        let quality = $(el).text().replace(/\s+/g, " ").trim();
        result.push({
          type: isAudio ? "audio" : "video",
          quality: quality || "unknown",
          url: rawUrl
        });
      });
      console.log(`[SUKSES] Berhasil mendapatkan ${result.length} link download`);
      return {
        status: true,
        title: title,
        thumbnail: thumb,
        result: result?.length > 0 ? result : null
      };
    } catch (err) {
      console.error(`[ERROR] Gagal parsing: ${err?.message}`);
      return {
        status: false,
        result: []
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
  const api = new MediaMister();
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