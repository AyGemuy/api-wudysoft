import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class SfileSearch {
  constructor() {
    this.h = wrapper(axios.create({
      jar: new CookieJar(),
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    }));
  }
  async search({
    query: q,
    page = 1
  }) {
    try {
      console.log(`[SEARCH] Query: ${q}, Page: ${page}`);
      const {
        data
      } = await this.h.get(`https://sfile.co/search?q=${encodeURIComponent(q)}&page=${page}`);
      const $ = cheerio.load(data);
      const results = $(".divide-y .group").map((_, el) => {
        const a = $(el).find("a.search-result-link").first();
        const info = $(el).find("p.text-xs").text().split("•").map(t => t.trim());
        return {
          title: a.text().trim() || "Unknown",
          link: a.attr("href") || a.attr("data-file-url"),
          size: info[0] || "0 KB",
          date: info[1] || "Unknown",
          icon: $(el).find("img").attr("src")
        };
      }).get();
      console.log(`[FOUND] ${results.length} files`);
      return {
        result: results,
        total: results.length
      };
    } catch (e) {
      console.error(`[SEARCH_ERR] ${e.message}`);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new SfileSearch();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}