import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class SfileDownloader {
  constructor() {
    this.h = wrapper(axios.create({
      jar: new CookieJar(),
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    }));
  }
  async download({
    url,
    output = "url"
  }) {
    try {
      console.log(`[GET] Page: ${url}`);
      const r1 = await this.h.get(url);
      const info = this.p1(r1.data);
      console.log(`[GET] Downloader: ${info.dwUrl}`);
      const r2 = await this.h.get(info.dwUrl, {
        headers: {
          referer: url
        }
      });
      const cdn = this.p2(r2.data);
      await new Promise(r => setTimeout(r, 1e3));
      const targets = [cdn.cdnDirect, cdn.direct, cdn.base].filter(Boolean);
      console.log(`[RUN] Trying ${targets.length} links...`);
      const final = await this.run(targets, {
        referer: info.dwUrl,
        output: output
      });
      return {
        result: final.res,
        ...info.file,
        ...cdn,
        ...final.meta,
        trending: info.trending
      };
    } catch (e) {
      console.error(`[ERR] ${e.message}`);
      throw e;
    }
  }
  p1(h) {
    const $ = cheerio.load(h);
    const d = s => $(s).text().trim();
    return {
      file: {
        name: d("h1.truncate") || d("h1"),
        mime: d(".divide-y div:nth-child(1) span") || "unknown",
        user: d(".divide-y div:nth-child(2) a:first-child") || "unknown",
        date: d(".divide-y div:nth-child(3) span.font-semibold") || "unknown",
        dlCount: d(".divide-y div:nth-child(4) span.font-semibold") || "0"
      },
      trending: $(".grid .group").map((_, e) => ({
        name: $(e).find("a").text().trim(),
        link: $(e).find("a").attr("href")
      })).get(),
      dwUrl: $("#download").attr("data-dw-url") || $("#download").attr("href")
    };
  }
  p2(h) {
    const $ = cheerio.load(h);
    const sc = $("script").map((_, e) => $(e).html()).get().join("\n");
    const rx = re => (sc.match(re)?.[0] || "").replace(/\\\//g, "/");
    return {
      size: $("p.text-lg.text-white\\/90").text().trim() || "0 MB",
      base: ($("#download").attr("data-direct-download") || "").replace(/^([^?]+)&/, "$1?"),
      direct: rx(/https:\\\/\\\/sfile\.co\\\/download\\\/\d+\/\d+\/[a-f0-9]+\\\/[^"'\s]+/g) || null,
      cdnDirect: rx(/https:\\\/\\\/download\d+\.sfile\.co\\\/downloadfile\\\/[^"'\s]+/g) || null
    };
  }
  async run(urls, {
    referer,
    output
  }) {
    for (const link of urls) {
      try {
        console.log(`[TRY] Link: ${link.substring(0, 50)}...`);
        if (output === "url") return {
          res: link,
          meta: {
            direct: link
          }
        };
        const r = await this.h.get(link, {
          headers: {
            referer: referer
          },
          responseType: "arraybuffer"
        });
        if (r.headers["content-type"]?.includes("text/html")) continue;
        const buf = Buffer.from(r.data);
        return {
          res: output === "base64" ? buf.toString("base64") : buf,
          meta: {
            mime: r.headers["content-type"],
            bytes: buf.length
          }
        };
      } catch {
        continue;
      }
    }
    throw new Error("All links failed");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SfileDownloader();
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