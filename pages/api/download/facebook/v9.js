import axios from "axios";
import * as cheerio from "cheerio";
class Likee {
  constructor() {
    this.baseUrl = "https://likeedownloader.com";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
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
      const description = $(".tweet_compiled p.infotext").eq(0).text().trim() || "No Description";
      const thumbnail = $(".img_thumb img").eq(0).attr("src") || "";
      const links = $(".result-links-item").map((em, el) => {
        const item = $(el);
        const label = item.find("div").eq(0).text().trim() || "Download";
        const anchor = item.find("a.download_link").eq(0);
        const url = anchor.attr("href") || "";
        let type = "unknown";
        if (anchor.hasClass("with_watermark")) {
          type = "watermark";
        } else if (anchor.hasClass("without_watermark")) {
          type = "render_clean";
        }
        return {
          type: type,
          label: label,
          url: url
        };
      }).get();
      const result = {
        success: links.length > 0,
        description: description,
        thumbnail: thumbnail,
        total_links: links.length,
        links: links
      };
      console.log(`[SUKSES] Parsing selesai. Menemukan ${result.total_links} link media.`);
      return result;
    } catch (err) {
      console.error(`[ERROR] Gagal ekstraksi HTML template: ${err?.message || err}`);
      return {
        success: false,
        links: []
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[PROSES] Memulai alur download dari Likee...");
    try {
      const targetUrl = url || rest?.target || rest?.link || "";
      if (!targetUrl) throw new Error("URL Likee tidak boleh kosong!");
      const payload = new URLSearchParams({
        id: targetUrl,
        locale: "en"
      });
      const responseJson = await this._req({
        method: "POST",
        url: "/process",
        headers: {
          origin: this.baseUrl,
          referer: `${this.baseUrl}/en`
        },
        data: payload.toString()
      });
      if (!responseJson || !responseJson.template) {
        throw new Error("Gagal mendapatkan html template dari server target!");
      }
      return this._par(responseJson.template);
    } catch (err) {
      console.error(`[ERROR] Alur download Likee terhenti: ${err?.message || err}`);
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
  const api = new Likee();
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