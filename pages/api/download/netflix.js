import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class NetflixParser {
  constructor() {
    this.proxy = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1"
    };
  }
  _parseUrl(inputUrl) {
    try {
      let cleanUrl = inputUrl.startsWith(this.proxy) ? decodeURIComponent(inputUrl.replace(this.proxy, "")) : inputUrl;
      const match = cleanUrl.match(/(?:netflix\.com\/)?(?:([a-z]{2})\/)?title\/(\d+)/i);
      if (!match) {
        console.error("[Error] titleId tidak ditemukan");
        return {
          error: "titleId tidak ditemukan dalam URL"
        };
      }
      return {
        url: `https://www.netflix.com/${match[1] || "en"}/title/${match[2]}`
      };
    } catch (e) {
      console.error("[Error URL]", e.message);
      return {
        error: `URL Invalid: ${e.message}`
      };
    }
  }
  _snake(s) {
    return s.replace(/[@:\-]/g, "_").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/__+/g, "_").replace(/^_|_$/g, "");
  }
  _decode(str) {
    try {
      return decodeURIComponent(str);
    } catch (_) {
      return str;
    }
  }
  _clean(o) {
    try {
      if (Array.isArray(o)) return o.map(i => this._clean(i));
      if (o && typeof o === "object" && o.constructor === Object) {
        return Object.fromEntries(Object.entries(o).map(([k, v]) => [this._snake(k), typeof v === "string" && v.includes("%") ? this._decode(v) : this._clean(v)]));
      }
      return o;
    } catch (e) {
      console.error("[Error Clean]", e.message);
      return o;
    }
  }
  async _fetch(url, opt, retries = 1) {
    console.log("[Fetch]", url);
    try {
      return await axios({
        ...opt,
        url: url
      });
    } catch (err) {
      console.error("[Fetch Error]", err.message);
      if (retries > 0) return await new Promise(r => setTimeout(r, 1e3)).then(() => this._fetch(url, opt, retries - 1));
      return {
        error: err.message
      };
    }
  }
  _parse(html) {
    console.log("[Parse] Memulai parsing HTML...");
    try {
      const $ = cheerio.load(html);
      const metaObj = Object.fromEntries($("meta").get().map(el => [$(el).attr("property") || $(el).attr("name"), $(el).attr("content")]).filter(([k, v]) => k && v));
      const jsonLd = $('script[type="application/ld+json"]').get().map(el => {
        try {
          return JSON.parse($(el).html());
        } catch (_) {
          return null;
        }
      }).find(d => d?.["@type"] === "Movie") || {};
      let react = {};
      const scripts = $("script").get().map(el => $(el).html() || "").join("\n");
      const contextMatch = [...scripts.matchAll(/netflix\.reactContext\s*=\s*({.+?});/g)][0];
      if (contextMatch) {
        try {
          react = JSON.parse(contextMatch[1].replace(/\\x/g, "%"));
        } catch (_) {
          const gqlMatch = [...contextMatch[1].matchAll(/"nmTitleGQL"\s*:\s*\{"data"\s*:\s*(\{.*?\})\s*\}\s*\}\s*\}/g)][0];
          if (gqlMatch) react = {
            models: {
              nmTitleGQL: {
                data: JSON.parse(gqlMatch[1])
              }
            }
          };
        }
      }
      const reactData = react?.models?.nmTitleGQL?.data || {};
      const details = Object.fromEntries($(".default-ltr-iqcdef-cache-wulkos").find("div").get().map(div => [$(div).find("h4").text().trim(), $(div).find("span").text().trim()]).filter(([k, v]) => k && v));
      const direct = {
        title: $("h2.default-ltr-iqcdef-cache-1bve57t, h2.e1cwop5t0").first().text().trim(),
        synopsis: $("span.default-ltr-iqcdef-cache-1ih9tgf, span.e1cwop5t0").first().text().trim(),
        ...details
      };
      return this._clean({
        ...metaObj,
        ...jsonLd,
        ...reactData,
        ...direct
      });
    } catch (e) {
      console.error("[Parse Error]", e.message);
      return {
        error: `Parsing failed: ${e.message}`
      };
    }
  }
  async download({
    url,
    titleId,
    locale
  }) {
    console.log("[Process] Start download");
    try {
      let targetUrl = "";
      if (url) {
        const parsed = this._parseUrl(url);
        if (parsed.error) return parsed;
        targetUrl = parsed.url;
      } else if (titleId) {
        targetUrl = `https://www.netflix.com/${locale || "en"}/title/${titleId}`;
      } else {
        return {
          error: "URL atau titleId wajib diberikan"
        };
      }
      const res = await this._fetch(this.proxy + encodeURIComponent(targetUrl), {
        method: "get",
        headers: this.headers,
        maxRedirects: 5,
        timeout: 3e4
      });
      if (res.error) return res;
      if (!res?.data) return {
        error: "Respons invalid atau data kosong"
      };
      return this._parse(res.data);
    } catch (e) {
      console.error("[Process Error]", e.message);
      return {
        error: `Execution failed: ${e.message}`
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
  const api = new NetflixParser();
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