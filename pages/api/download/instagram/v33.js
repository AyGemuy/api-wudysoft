import axios from "axios";
import * as cheerio from "cheerio";
class ReelsVideo {
  constructor() {
    this.baseUrl = "https://reelsvideo.io";
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
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
    console.log("[PROSES] Mencari token internal (tt & ts) dari halaman utama...");
    try {
      const $ = cheerio.load(html || "<div></div>");
      const tt = $("#tt").val() || "";
      const ts = $("#ts").val() || "";
      console.log(`[SUKSES] Token didapatkan -> tt: ${tt}, ts: ${ts}`);
      return {
        tt: tt,
        ts: ts
      };
    } catch (err) {
      console.error(`[ERROR] Gagal mendapatkan token form: ${err?.message || err}`);
      return {
        tt: "",
        ts: ""
      };
    }
  }
  _par(html) {
    console.log("[PROSES] Memulai parsing data hasil download menggunakan Cheerio...");
    try {
      const $ = cheerio.load(html || "<div></div>");
      const profileContainer = $("#profile_grid").eq(0);
      const author = profileContainer.find("span.text-400-16-18").eq(0).text().trim() || "Unknown Author";
      const avatar = profileContainer.find("img.w-10").eq(0).attr("src") || "";
      const thumbnail = profileContainer.find(".h-\\[368px\\]").eq(0).attr("data-bg") || "";
      const links = $(".px-4.absolute.bottom-4.w-full.left-0 a").map((em, el) => {
        const item = $(el);
        const text = item.text().replace(/\s+/g, " ").trim();
        const url = item.attr("href") || "";
        let type = "unknown";
        if (item.hasClass("type_videos")) {
          type = "video";
        } else if (item.hasClass("type_audio") || item.hasClass("mp3")) {
          type = "audio";
        }
        return {
          type: type,
          text: text,
          url: url
        };
      }).get();
      const result = {
        success: links.length > 0,
        author: author,
        avatar: avatar,
        thumbnail: thumbnail,
        total_links: links.length,
        links: links
      };
      console.log(`[SUKSES] Parsing selesai. Menemukan ${result.total_links} media link.`);
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
    console.log("[PROSES] Memulai alur download dari ReelsVideo...");
    try {
      const targetUrl = url || rest?.target || rest?.link || "";
      if (!targetUrl) throw new Error("URL Instagram tidak boleh kosong!");
      console.log("[PROSES] Step 1: Mengambil token awal dari landing page...");
      const homeHtml = await this._req({
        method: "GET",
        url: "/"
      });
      const {
        tt,
        ts
      } = this._tk(homeHtml);
      console.log("[PROSES] Step 2: Mengirimkan payload url ke server target...");
      const payload = new URLSearchParams({
        id: targetUrl,
        locale: "en",
        tt: tt,
        ts: ts,
        "cf-turnstile-response": ""
      });
      const responseHtml = await this._req({
        method: "POST",
        url: "/",
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          "hx-current-url": `${this.baseUrl}/`,
          "hx-request": "true",
          "hx-target": "target",
          "hx-trigger": "main-form",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`
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
  const api = new ReelsVideo();
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