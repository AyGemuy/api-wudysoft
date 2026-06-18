import axios from "axios";
import * as cheerio from "cheerio";
class SaveIg {
  constructor() {
    this.baseUrl = "https://saveig.in";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        referer: `${this.baseUrl}/`
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
  async _getNonce() {
    console.log("[PROSES] Mencari token X-Visolix-Nonce dari halaman utama...");
    try {
      const html = await this._req({
        method: "GET",
        url: "/"
      });
      const nonceMatch = html.match(/"nonce"\s*:\s*"([a-zA-Z0-9]+)"/);
      const nonce = nonceMatch ? nonceMatch[1] : "";
      if (!nonce) {
        console.warn("[WARNING] Nonce tidak ditemukan di HTML, menggunakan fallback default.");
      } else {
        console.log(`[SUKSES] X-Visolix-Nonce didapatkan: ${nonce}`);
      }
      return nonce;
    } catch (err) {
      console.error(`[ERROR] Gagal mendapatkan token nonce dari landing page: ${err.message}`);
      return "";
    }
  }
  _par(htmlContent) {
    console.log("[PROSES] Memulai parsing data hasil download menggunakan Cheerio...");
    try {
      const $ = cheerio.load(htmlContent || "<div></div>");
      const container = $(".visolix-multi-content").eq(0);
      const links = container.find(".visolix-download-content").map((em, el) => {
        const item = $(el);
        const previewImg = item.find(".visolix-media-box img").eq(1);
        const thumbnail = previewImg.attr("src") || "";
        const downloadAnchor = item.find(".visolix-download-bottom a.visolix-download-media").eq(0);
        const url = downloadAnchor.attr("href") || "";
        const text = downloadAnchor.text().replace(/\s+/g, " ").trim() || "Download";
        let type = "video";
        if (text.toLowerCase().includes("photo") || text.toLowerCase().includes("image")) {
          type = "image";
        }
        return {
          type: type,
          text: text,
          thumbnail: thumbnail,
          url: url
        };
      }).get();
      const result = {
        success: links.length > 0,
        total_links: links.length,
        links: links
      };
      console.log(`[SUKSES] Parsing selesai. Menemukan ${result.total_links} media download link.`);
      return result;
    } catch (err) {
      console.error(`[ERROR] Gagal ekstraksi HTML data response: ${err?.message || err}`);
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
    console.log("[PROSES] Memulai alur download dari SaveIg...");
    try {
      const targetUrl = url || rest?.target || rest?.link || "";
      if (!targetUrl) throw new Error("URL Instagram tidak boleh kosong!");
      const activeNonce = await this._getNonce() || "36d958c8f8";
      const payload = {
        url: targetUrl,
        format: "",
        captcha_response: null
      };
      const responseJson = await this._req({
        method: "POST",
        url: "/wp-json/visolix/api/download",
        headers: {
          "X-Visolix-Nonce": activeNonce
        },
        data: payload
      });
      if (!responseJson || responseJson.status !== true) {
        throw new Error(responseJson?.message || "Server target menolak request atau status bernilai false.");
      }
      return this._par(responseJson.data);
    } catch (err) {
      console.error(`[ERROR] Alur download SaveIg terhenti: ${err?.message || err}`);
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
  const api = new SaveIg();
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