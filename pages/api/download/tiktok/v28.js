import axios from "axios";
import * as cheerio from "cheerio";
class Ssstik {
  constructor() {
    this.cookies = "";
    this.client = axios.create({
      baseURL: "https://ssstik.io",
      timeout: 6e4,
      headers: {
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async _req(cfg) {
    console.log(`[PROSES] Melakukan HTTP Request ke: ${cfg?.url || "/"}`);
    try {
      const res = await this.client(cfg);
      console.log(`[SUKSES] HTTP Status: ${res?.status || 200}`);
      return res?.data || "";
    } catch (err) {
      console.error(`[ERROR] Gagal saat melakukan request: ${err?.message || err}`);
      throw err;
    }
  }
  _tk(html) {
    console.log("[PROSES] Mencari token internal dari halaman utama...");
    try {
      const $ = cheerio.load(html || "<div></div>");
      const scriptText = $("script").text() || "";
      const match = scriptText.match(/s_tt\s*=\s*['"]([^'"]+)['"]/) || [];
      const token = match[1] || "enRiYXBk";
      console.log(`[SUKSES] Token ditemukan: ${token}`);
      return token;
    } catch (err) {
      console.error(`[ERROR] Gagal mendapatkan token: ${err?.message || err}`);
      return "enRiYXBk";
    }
  }
  _par(html) {
    console.log("[PROSES] Memulai parsing data HTML menggunakan Cheerio...");
    try {
      const $ = cheerio.load(html || "<div></div>");
      const container = $("#avatarAndTextUsual");
      const author = container.find(".pure-u-18-24 h2").eq(0).text().trim() || "Unknown Author";
      const description = container.find(".maintext").eq(0).text().trim() || "No Description";
      const avatar = container.find("img.result_author").eq(0).attr("src") || "";
      const links = $(".result_overlay_buttons a.dl-button").map((em, el) => {
        const item = $(el);
        const text = item.text().replace(/\s+/g, " ").trim() || "Download Link";
        let href = item.attr("href") || item.attr("data-directurl") || "";
        href = href.startsWith("/") ? `https://ssstik.io${href}` : href;
        return {
          text: text,
          url: href
        };
      }).get();
      const result = {
        success: links?.length || 0 > 0 ? true : false,
        author: author,
        avatar: avatar,
        description: description,
        total_links: links?.length || 0,
        links: links || []
      };
      console.log(`[SUKSES] Parsing selesai. Menemukan ${result.total_links} link download.`);
      return result;
    } catch (err) {
      console.error(`[ERROR] Gagal ekstraksi HTML: ${err?.message || err}`);
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
    console.log("[PROSES] Memulai alur download full auto dari SSSTik...");
    try {
      const targetUrl = url || rest?.target || rest?.link || "";
      if (!targetUrl) throw new Error("URL TikTok tidak boleh kosong!");
      console.log("[PROSES] Step 1: Mengambil halaman utama ssstik.io...");
      const homeHtml = await this._req({
        method: "GET",
        url: "/"
      });
      const tokenTt = this._tk(homeHtml);
      console.log("[PROSES] Step 2: Mengirimkan payload data target URL...");
      const payload = new URLSearchParams({
        id: targetUrl,
        locale: "en",
        tt: tokenTt,
        debug: "ab=0&loc=ID&ip="
      });
      const responseHtml = await this._req({
        method: "POST",
        url: "/abc?url=dl",
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          "hx-current-url": "https://ssstik.io/",
          "hx-request": "true",
          "hx-target": "target",
          "hx-trigger": "_gcaptcha_pt",
          origin: "https://ssstik.io",
          referer: "https://ssstik.io/"
        },
        data: payload.toString()
      });
      return this._par(responseHtml);
    } catch (err) {
      console.error(`[ERROR] Alur download terhenti: ${err?.message || err}`);
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
  const api = new Ssstik();
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