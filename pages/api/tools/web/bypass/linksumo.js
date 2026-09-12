import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class Bypasser {
  constructor() {
    this.jar = new CookieJar();
    this.ax = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 3e4,
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s < 400,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "upgrade-insecure-requests": "1"
      }
    }));
  }
  rnd(b) {
    return crypto.randomBytes(b).toString("hex");
  }
  async solve({
    url
  }) {
    try {
      console.log(`[*] Init: ${url}`);
      const g1 = await this.ax.get(url);
      const $1 = cheerio.load(g1.data);
      const act = $1("form#form").attr("action");
      if (!act) throw new Error("Form missing");
      const bd = {};
      $1('input[type="hidden"]').each((_, el) => {
        const n = $1(el).attr("name");
        const v = $1(el).val();
        if (n) bd[n] = v;
      });
      const g2 = await this.ax.get(act, {
        params: bd,
        headers: {
          referer: url
        }
      }).catch(e => e.response);
      const land = g2.headers.location ? new URL(g2.headers.location, act).href : g2.request.res.responseUrl;
      const base = new URL(land).origin;
      await this.ax.get(land, {
        headers: {
          referer: url
        }
      });
      const ck = await this.jar.getCookies(base);
      const tok = decodeURIComponent(ck.find(c => c.key === "XSRF-TOKEN")?.value);
      console.log(`[*] Verifying: ${base}`);
      await this.ax.post(`${base}/api/verify`, {
        _a: 0
      }, {
        headers: {
          "x-xsrf-token": tok,
          "x-requested-with": "XMLHttpRequest",
          referer: land,
          origin: base
        }
      });
      console.log(`[*] Fetching Bridge...`);
      const g3 = await this.ax.post(`${base}/api/go`, {
        key: 47,
        size: "942.1692",
        _dvc: this.rnd(4)
      }, {
        headers: {
          "idempotency-key": this.rnd(16).toUpperCase(),
          "x-xsrf-token": tok,
          referer: land,
          origin: base
        }
      });
      const brdg = g3.data?.url;
      if (!brdg) throw new Error("Bridge empty");
      console.log(`[*] Jumping: ${brdg}`);
      const gf = await this.ax.get(brdg, {
        headers: {
          referer: land
        }
      }).catch(e => e.response);
      if (gf.status === 200 && gf.data) {
        const $f = cheerio.load(gf.data);
        let raw = "";
        $f("script").each((_, el) => {
          const code = $f(el).html();
          if (code && code.includes("window.location.href")) {
            const m = code.match(/window\.location\.href\s*=\s*"([^"]+)"/);
            if (m) raw = m[1];
          }
        });
        if (raw) {
          const clean = JSON.parse(`"${raw}"`);
          console.log(`\n✅ SUCCESS: ${clean}\n`);
          return {
            status: true,
            result: clean
          };
        }
      }
      throw new Error("Final link not found in bridge data");
    } catch (e) {
      console.error(`\n❌ ERROR: ${e.message}`);
      return {
        status: false,
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Bypasser();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat memproses URL"
    });
  }
}