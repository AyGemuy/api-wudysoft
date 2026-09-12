import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
class GrepSearch {
  constructor() {
    this.ck = "";
    this.cli = axios.create({
      baseURL: "https://grep.app",
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
      throw err;
    }
  }
  _pt(t) {
    try {
      const p = t.split(".");
      if (p.length < 4) throw new Error("Token tidak valid.");
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
      throw err;
    }
  }
  _sc(t) {
    try {
      console.log("[Proses] Memulai PoW...");
      const K = [498787, 533737, 619763, 708403, 828071];
      const {
        rId,
        df,
        s2,
        s3,
        cnt
      } = this._pt(t);
      const io = rId * K[rId % 5] % 36;
      const ncs = [];
      let ph = "";
      for (let i = 0; i < cnt; i++) {
        const px = i === 0 ? s3.substring(io, io + 4) : ph.substring(rId * K[(i - 1) % 5] % df, rId * K[(i - 1) % 5] % df + 4);
        const {
          n,
          h
        } = this._sh(s2, px);
        ph = h;
        ncs.push(n);
      }
      console.log("[Proses] PoW selesai.");
      return ncs.join(";");
    } catch (err) {
      console.error(`[Error] _sc: ${err.message}`);
      throw err;
    }
  }
  async req(url, params) {
    try {
      const qs = params ? `?${params.toString()}` : "";
      console.log(`[Proses] GET: ${url}${qs}`);
      const h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
        referer: `https://grep.app${url}${qs}`,
        "accept-language": "id,ms;q=0.9,en;q=0.8",
        priority: "u=0, i"
      };
      if (this.ck) h["Cookie"] = this.ck;
      let res = await this.cli.get(url, {
        params: params,
        headers: h
      });
      const tok = res.headers["x-vercel-challenge-token"];
      if (tok) {
        console.log("[WAF] Tantangan Vercel terdeteksi.");
        const sol = this._sc(tok);
        const chH = {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "x-vercel-challenge-token": tok,
          "x-vercel-challenge-version": "2",
          dnt: "1",
          "x-vercel-challenge-solution": sol,
          origin: "https://grep.app",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
          referer: "https://grep.app/.well-known/vercel/security/static/challenge.v2.min.js",
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
        h["Cookie"] = this.ck;
        res = await this.cli.get(url, {
          params: params,
          headers: h
        });
      }
      return res.data;
    } catch (err) {
      console.error(`[Error] req: ${err.message}`);
      throw err;
    }
  }
  _snip(html) {
    if (!html) return [];
    const $ = cheerio.load(html);
    return $("tr").map((_, el) => {
      const num = $(el).find(".lineno").text().trim();
      return num ? {
        line_number: parseInt(num, 10),
        code: $(el).find(".highlight").text()
      } : null;
    }).get().filter(Boolean);
  }
  async search({
    query,
    limit = 5,
    ...rest
  }) {
    try {
      const q = query || "";
      const max = limit || 5;
      console.log(`[Proses] Pencarian: "${q}"`);
      const p = new URLSearchParams();
      if (rest?.lang) {
        if (Array.isArray(rest.lang)) rest.lang.forEach(l => p.append("f.lang", l));
        else p.set("f.lang", rest.lang);
      }
      if (rest?.langPattern) p.set("f.lang.pattern", rest.langPattern);
      if (rest?.path) p.set("f.path", rest.path);
      if (rest?.pathPattern) p.set("f.path.pattern", rest.pathPattern);
      if (rest?.repo) p.set("f.repo", rest.repo);
      if (rest?.repoPattern) p.set("f.repo.pattern", rest.repoPattern);
      if (rest?.case) p.set("case", rest.case);
      if (rest?.words) p.set("words", rest.words);
      if (rest?.regexp) p.set("regexp", rest.regexp);
      p.set("q", q);
      if (rest?.page) p.set("page", rest.page);
      if (rest?.format) p.set("format", rest.format);
      if (rest?.scope) p.set("scope", rest.scope === "personal" ? "*" : rest.scope);
      const data = await this.req("/api/search", p);
      if (!data) throw new Error("Respons kosong.");
      const rawHits = data?.hits?.hits || [];
      const hits = rawHits.slice(0, max);
      console.log(`[Proses] Total: ${rawHits.length}. Mengurai ${hits.length} item...`);
      const results = hits.map(hit => {
        const repo = hit?.repo || "";
        const branch = hit?.branch || "";
        const path = hit?.path || "";
        const [owner, repoName] = repo.split("/");
        const fileName = path.split("/").pop() || "";
        const fileExt = fileName.includes(".") ? fileName.split(".").pop() : "";
        const snippets = this._snip(hit?.content?.snippet);
        const preview_code = snippets.map(s => s.code).join("\n");
        return {
          ...hit,
          owner_id: hit?.owner_id || "",
          total_matches: hit?.total_matches || 0,
          author: {
            username: owner || "",
            url: owner ? `https://github.com/${owner}` : ""
          },
          repository: {
            name: repoName || "",
            full_name: repo,
            url: repo ? `https://github.com/${repo}` : ""
          },
          file: {
            name: fileName,
            extension: fileExt,
            path: path,
            branch: branch,
            raw_url: repo && branch && path ? `https://raw.githubusercontent.com/${repo}/${branch}/${path}` : ""
          },
          snippets: snippets,
          preview_code: preview_code
        };
      });
      return {
        status: results.length > 0 ? "success" : "no_results",
        total: results.length,
        results: results
      };
    } catch (err) {
      console.error(`[Error] search: ${err.message}`);
      return {
        status: "error",
        total: 0,
        results: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new GrepSearch();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}