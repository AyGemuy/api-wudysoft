import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class FdownWorld {
  constructor() {
    console.log("[Init] Initializing...");
    this.jar = new CookieJar();
    this.base = "https://fdown.world";
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: this.base,
        referer: `${this.base}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
    console.log("[Init] Done");
  }
  snake(str) {
    return (str || "")?.toLowerCase()?.replace(/^download\s+/i, "")?.replace(/[^a-z0-9]+/g, "_")?.replace(/^_+|_+$/g, "") || "";
  }
  async init() {
    try {
      console.log("[Cookie] Init from referer...");
      await this.client.get(this.base);
      console.log("[Cookie] Initialized");
    } catch (error) {
      console.error("[Cookie] Error:", error?.message || error);
      throw error;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[DL] Starting: ${url}`);
      await this.init();
      const {
        data
      } = await this.client.post(`${this.base}/result.php`, new URLSearchParams({
        codehap_link: url,
        codehap: "true",
        ...rest || {}
      }).toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      console.log("[Parse] Processing...");
      const $ = cheerio.load(data);
      const result = $("#re a.download-btn")?.map?.((i, el) => {
        const em = $(el);
        const href = em?.attr("href") || "";
        const text = em?.text()?.trim()?.split?.("\n")?.[0]?.trim() || "";
        const full = href?.startsWith?.("http") ? href : `${this.base}${href}`;
        const direct = full?.replace?.("/download.php", "/download") || full;
        return {
          label: this.snake(text) || `item_${i}`,
          text: text,
          url: full,
          direct: direct,
          type: href?.split?.("type=")?.[1]?.split?.("&")?.[0] || "",
          index: i
        };
      })?.get() || [];
      console.log(`[Parse] Found ${result?.length || 0} items`);
      const img = $("img")?.eq?.(0);
      console.log("[Done] Complete");
      return {
        result: result,
        title: $("title")?.text()?.trim() || "Unknown",
        desc: $('meta[name="description"]')?.attr("content") || "",
        thumb: img?.attr("src") || $('meta[property="og:image"]')?.attr("content") || "",
        author: $('meta[name="author"]')?.attr("content") || "",
        duration: $(".duration")?.text()?.trim() || "",
        views: $(".views")?.text()?.trim() || "",
        source: url,
        ts: new Date().toISOString()
      };
    } catch (error) {
      console.error("[Error]:", error?.message || error);
      throw error;
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
  const api = new FdownWorld();
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