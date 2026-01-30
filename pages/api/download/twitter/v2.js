import fetch from "node-fetch";
import * as cheerio from "cheerio";
class TWMate {
  constructor() {
    this.baseUrl = "https://twmate.com/id2/";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      Referer: "https://twmate.com/id2/"
    };
  }
  async download({
    url
  }) {
    try {
      console.log(`[⏳] TWMate Fetching: ${url}`);
      const bodyData = new URLSearchParams({
        page: url,
        ftype: "all",
        ajax: "1"
      });
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        body: bodyData.toString()
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      const thumbnail = $(".card-img-top.card_media").attr("src");
      const downloadLinks = [];
      $(".btn-dl").each((_, el) => {
        const link = $(el).attr("href");
        const text = $(el).text().replace("Unduh ", "").trim();
        if (link) {
          downloadLinks.push({
            resolution: text,
            url: link
          });
        }
      });
      if (downloadLinks.length === 0) {
        throw new Error("No download links found. Make sure the URL is valid.");
      }
      return {
        status: "success",
        source: "TWMate",
        thumbnail: thumbnail,
        results: downloadLinks
      };
    } catch (error) {
      console.error("[❌] TWMate Error:", error.message);
      return {
        status: "error",
        message: error.message
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
  const api = new TWMate();
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