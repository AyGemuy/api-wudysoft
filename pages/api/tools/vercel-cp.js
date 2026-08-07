import axios from "axios";
import crypto from "crypto";
class VercelSolver {
  constructor() {
    this.ck = "";
    this.cli = axios.create({
      timeout: 15e3,
      validateStatus: s => s >= 200 && s < 500
    });
  }
  _sh(s2, ep) {
    try {
      while (true) {
        const n = crypto.randomBytes(8).toString("hex");
        const h = crypto.createHash("sha256").update(s2 + n).digest("hex");
        if (h.substring(0, 4) === ep) return {
          n: n,
          h: h
        };
      }
    } catch (err) {
      console.error(`[Error] _sh: ${err.message}`);
      return null;
    }
  }
  _pt(t) {
    try {
      const p = t.split(".");
      if (p.length < 4) return null;
      const rId = parseInt(p[1], 10);
      const df = parseInt(p[2], 10);
      const dec = Buffer.from(p[3], "base64").toString("utf-8").split(";");
      return {
        rId: rId,
        df: df,
        s2: dec[1],
        s3: dec[2],
        cnt: parseInt(dec[3], 10)
      };
    } catch (err) {
      console.error(`[Error] _pt: ${err.message}`);
      return null;
    }
  }
  _sc(t) {
    try {
      console.log("[Proses] Memulai PoW...");
      const K = [498787, 533737, 619763, 708403, 828071];
      const parsed = this._pt(t);
      if (!parsed) return null;
      const {
        rId,
        df,
        s2,
        s3,
        cnt
      } = parsed;
      const io = rId * K[rId % 5] % 36;
      const ncs = [];
      let ph = "";
      for (let i = 0; i < cnt; i++) {
        const px = i === 0 ? s3.substring(io, io + 4) : ph.substring(rId * K[(i - 1) % 5] % df, rId * K[(i - 1) % 5] % df + 4);
        const solved = this._sh(s2, px);
        if (!solved) return null;
        const {
          n,
          h
        } = solved;
        ph = h;
        ncs.push(n);
      }
      console.log("[Proses] PoW selesai.");
      return ncs.join(";");
    } catch (err) {
      console.error(`[Error] _sc: ${err.message}`);
      return null;
    }
  }
  async solve({
    url,
    userAgent
  }) {
    const ua = userAgent || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36";
    try {
      const parsedUrl = new URL(url);
      const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
      this.cli.defaults.baseURL = origin;
      console.log(`[Proses] GET: ${url}`);
      const h = {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "cache-control": "max-age=0",
        "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "upgrade-insecure-requests": "1",
        dnt: "1",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
        referer: url,
        "accept-language": "id,ms;q=0.9,en;q=0.8",
        priority: "u=0, i"
      };
      if (this.ck) h["Cookie"] = this.ck;
      let res = await this.cli.get(url, {
        headers: h
      });
      const tok = res.headers["x-vercel-challenge-token"];
      if (!tok) {
        console.log("[WAF] Tantangan tidak terdeteksi.");
        const sc = res.headers["set-cookie"];
        const rawCookie = sc ? Array.isArray(sc) ? sc.map(c => c.split(";")[0]).join("; ") : sc.split(";")[0] : "";
        this.ck = rawCookie;
        return {
          status: "no_challenge",
          result: {
            cookie: rawCookie,
            token: null,
            solution: null,
            curl: `curl -X GET '${url}' -H 'User-Agent: ${ua}' -H 'Cookie: ${rawCookie}'`
          }
        };
      }
      console.log("[WAF] Tantangan Vercel terdeteksi.");
      const sol = this._sc(tok);
      if (!sol) {
        return {
          status: "error",
          result: {
            message: "Gagal memproses perhitungan solusi PoW."
          }
        };
      }
      const chH = {
        "User-Agent": ua,
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "x-vercel-challenge-token": tok,
        "x-vercel-challenge-version": "2",
        dnt: "1",
        "x-vercel-challenge-solution": sol,
        origin: origin,
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        referer: `${origin}/.well-known/vercel/security/static/challenge.v2.min.js`,
        "accept-language": "id,ms;q=0.9,en;q=0.8",
        priority: "u=1, i"
      };
      console.log("[WAF] Mengirimkan solusi...");
      const chRes = await this.cli.post("/.well-known/vercel/security/request-challenge", null, {
        headers: chH
      });
      const sc = chRes.headers["set-cookie"];
      if (sc) {
        this.ck = Array.isArray(sc) ? sc.map(c => c.split(";")[0]).join("; ") : sc.split(";")[0];
        console.log(`[WAF] Cookie diperbarui.`);
      }
      return {
        status: "success",
        result: {
          cookie: this.ck,
          token: tok,
          solution: sol,
          curl: `curl -X GET '${url}' -H 'User-Agent: ${ua}' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' -H 'Accept-Encoding: gzip, deflate, br, zstd' -H 'cache-control: max-age=0' -H 'sec-ch-ua: "Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"' -H 'sec-ch-ua-mobile: ?1' -H 'sec-ch-ua-platform: "Android"' -H 'upgrade-insecure-requests: 1' -H 'dnt: 1' -H 'sec-fetch-site: same-origin' -H 'sec-fetch-mode: navigate' -H 'sec-fetch-dest: document' -H 'referer: ${url}' -H 'accept-language: id,ms;q=0.9,en;q=0.8' -H 'priority: u=0, i' -H 'Cookie: ${this.ck}'`
        }
      };
    } catch (err) {
      console.error(`[Error] solve: ${err.message}`);
      return {
        status: "error",
        result: {
          message: err.message
        }
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
  const api = new VercelSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}