import axios from "axios";
import * as cheerio from "cheerio";
class Shorten {
  constructor() {
    this.base = "https://l8.nu";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  cfg(data) {
    return {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: this.base,
        referer: `${this.base}/id/`,
        "user-agent": this.ua,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      },
      data: new URLSearchParams(data).toString()
    };
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log(`[Process] Menyingkat URL: ${url}`);
      const target = url || "";
      const keyword = rest?.keyword || "";
      if (!target) throw new Error("URL tidak boleh kosong");
      const {
        data,
        status
      } = await axios.post(`${this.base}/id/`, this.cfg({
        url: target,
        keyword: keyword
      }).data, {
        headers: this.cfg().headers
      });
      if (status !== 200) throw new Error(`HTTP Error: ${status}`);
      console.log("[Process] Memparsing data...");
      const $ = cheerio.load(data);
      const result = $(".short-url")?.val() || $("button.short-url-button")?.attr("data-clipboard-text");
      if (!result) throw new Error("Gagal mendapatkan URL singkat dari response");
      console.log("[Success] URL berhasil dibuat");
      return {
        success: true,
        original: target,
        short: result,
        stats: `${result}+`
      };
    } catch (e) {
      console.error(`[Error] ${e?.message || "Terjadi kesalahan sistem"}`);
      return {
        success: false,
        error: e?.message || "Unknown Error"
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
  const api = new Shorten();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}