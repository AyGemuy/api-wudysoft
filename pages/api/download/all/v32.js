import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class FBSParser {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 12e4
    }));
    this.hd = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://savefbs.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://savefbs.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async pst(ep, py) {
    console.log(`[LOG] Requesting to: ${ep}`);
    return await this.client.post(ep, py, {
      headers: this.hd
    });
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[LOG] Start process...");
    try {
      const payload = {
        vid: url,
        prefix: rest?.prefix || "savefbs.com",
        ex: rest?.ex || "tik_ytb_ig_tw_pin",
        format: rest?.format || "",
        ...rest
      };
      console.log(`[LOG] Payload: ${JSON.stringify(payload)}`);
      const rsp = await this.pst("https://savefbs.com/api/v1/aio/html", payload);
      if (rsp?.status !== 200) throw new Error(`API Error: ${rsp?.status}`);
      console.log("[LOG] Parsing HTML response...");
      const $ = cheerio.load(rsp?.data || "");
      const title = $(".text-sm.wrap-break-word").first().text()?.trim() || "No Title Found";
      const thumbnail = $(".aio-thumbnail").attr("src") || null;
      const metaInfo = $(".text-gray-600").map((i, em) => {
        return $(em).text()?.trim();
      }).get();
      const ownerInfo = $(".text-gray-600").eq(0).text()?.replace("Owner:", "")?.trim() || "Unknown";
      console.log("[LOG] Extracting media links...");
      const media = $(".download-btn").map((i, el) => {
        const node = $(el);
        const href = node.attr("href");
        const label = node.text()?.trim();
        const id = node.attr("id");
        const isValid = href && !href.includes("javascript") && id !== "aio-download-another-btn";
        return isValid ? {
          type: "video",
          quality: label || "SD",
          size: null,
          url: href,
          is_hd: label?.toLowerCase().includes("hd") ? true : false
        } : null;
      }).get().filter(x => x !== null);
      const result = {
        success: true,
        source: url,
        title: title,
        thumb: thumbnail,
        owner: ownerInfo,
        meta: metaInfo,
        media: media,
        ts: new Date().toISOString()
      };
      console.log(`[LOG] Found ${media.length} download links.`);
      return result;
    } catch (err) {
      console.error(`[LOG] Error Catch: ${err?.message}`);
      return {
        success: false,
        message: err?.message || "Something went wrong"
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
  const api = new FBSParser();
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