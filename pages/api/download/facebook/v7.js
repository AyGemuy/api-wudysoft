import axios from "axios";
import * as cheerio from "cheerio";
class ExistDownloader {
  constructor() {
    this.baseUrl = "https://download.solutionexist.com/";
  }
  prs(html) {
    console.log("[LOG] Parsing HTML dimulai.");
    const $ = cheerio.load(html);
    const title = $("h3.uvd-video-title").text().trim() || "Judul Video Tidak Ditemukan";
    const thumbEl = $(".uvd-thumbnail img").eq(0);
    const thumbUrl = thumbEl.attr("src") || thumbEl.attr("data-src") || "default_thumb.png";
    const downloadLinks = $("#uvdDownloadGrid").find(".uvd-download-item a.uvd-download-btn").map((i, el) => {
      const em = $(el);
      const link = em.attr("href") || "#";
      const quality = em.find("span").text().trim() || "Kualitas Tak Diketahui";
      const type = link.endsWith(".mp4") ? "Video (MP4)" : quality.toLowerCase().includes("audio") ? "Audio" : "File Lain";
      return {
        index: i,
        quality: quality,
        url: link,
        type: type
      };
    }).get();
    console.log(`[LOG] Ditemukan ${downloadLinks.length} tautan download.`);
    return {
      title: title,
      thumb: thumbUrl,
      links: downloadLinks
    };
  }
  async download({
    url,
    ...rest
  }) {
    const videoUrl = url?.trim() || "https://default.url.com/";
    console.log(`[LOG] Memulai proses untuk URL: ${videoUrl}`);
    const reqHeaders = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "id-ID",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: this.baseUrl.slice(0, -1),
      Referer: rest.referer || this.baseUrl,
      "User-Agent": "Mozilla/5.0 (Node.js/Axios)",
      ...rest.headers
    };
    const postData = `uvd_video_url=${encodeURIComponent(videoUrl)}`;
    try {
      console.log("[LOG] Mengirim request POST...");
      const response = await axios.post(this.baseUrl, postData, {
        headers: reqHeaders
      });
      console.log(`[LOG] Respons diterima, status: ${response.status}`);
      const result = this.prs(response.data);
      return {
        title: result.title,
        thumb: result.thumb,
        links: result.links.length > 0 ? result.links : []
      };
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan dalam proses.");
      const errorMessage = error?.response?.data?.message || error?.message || "Kesalahan tak terduga";
      console.error(`[ERROR DETAIL] ${errorMessage}`);
      return {
        title: "Error",
        thumb: "error.png",
        links: []
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
  const api = new ExistDownloader();
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