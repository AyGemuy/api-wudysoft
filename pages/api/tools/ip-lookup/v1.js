import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class IPLookup {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        referer: "https://www.ip2location.com/demo"
      }
    }));
  }
  async gTk() {
    console.log("[LOG] Syncing session token...");
    const {
      data
    } = await this.client.get("https://www.ip2location.com/demo");
    const $ = cheerio.load(data);
    return $('input[name^="_NoCSRF_"]').val();
  }
  async gShr() {
    const {
      data
    } = await this.client.post("https://www.ip2location.com/share-ip-result.json", null, {
      headers: {
        "x-requested-with": "XMLHttpRequest"
      }
    });
    return data || {};
  }
  async lookup({
    ip,
    ...rest
  }) {
    try {
      const targetIp = ip || "8.8.8.8";
      console.log(`[LOG] Extracting data for: ${targetIp}`);
      const csrf = await this.gTk();
      const payload = new URLSearchParams({
        ipAddress: targetIp,
        [rest.csrfName || "_NoCSRF_RTCYJzsdgx"]: csrf || "",
        "cf-turnstile-response": ""
      });
      const {
        data: html
      } = await this.client.post("https://www.ip2location.com/demo", payload.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const $ = cheerio.load(html);
      const jsonRaw = $("#code2 code").text().trim();
      const share = await this.gShr();
      console.log("[LOG] Parsing raw JSON from element...");
      const finalData = JSON.parse(jsonRaw || "{}");
      return {
        ...finalData,
        share_link: share?.link || null,
        processed_at: new Date().toISOString()
      };
    } catch (err) {
      console.error("[ERR] Lookup failed:", err.message);
      return {
        status: "FAIL",
        msg: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.ip) {
    return res.status(400).json({
      error: "Parameter 'ip' diperlukan"
    });
  }
  const api = new IPLookup();
  try {
    const data = await api.lookup(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}