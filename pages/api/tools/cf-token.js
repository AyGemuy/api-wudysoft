import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class CaptchaSolver {
  constructor() {
    this.bases = [{
      baseUrl: "https://fgsi.dpdns.org/api/tools/cfclearance/turnstile-min",
      method: "GET",
      payload: (url, sitekey) => ({
        apikey: "CircleNBTeam",
        sitekey: sitekey,
        url: url
      }),
      extract: data => data?.data?.token
    }, {
      baseUrl: "https://cf.zenzxz.web.id/solve",
      method: "POST",
      payload: (url, sitekey) => ({
        url: url,
        siteKey: sitekey,
        mode: "turnstile-min"
      }),
      extract: data => data?.data?.token
    }, {
      baseUrl: `https://${apiConfig.DOMAIN_URL}/api/tools/captcha-solver`,
      method: "GET",
      payload: (url, sitekey) => ({
        url: url,
        sitekey: sitekey
      }),
      extract: data => data?.token
    }];
  }
  gen(url, sitekey) {
    return this.bases.map(({
      baseUrl,
      method,
      payload,
      extract
    }) => ({
      endpoint: baseUrl,
      method: method,
      payload: payload(url, sitekey),
      extract: extract
    }));
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch {
      return Buffer.from(str, "base64").toString();
    }
  }
  async run(gen, act = "turnstile-min") {
    console.log(`[START] ${gen.method} ${gen.endpoint}`);
    const t = Date.now();
    try {
      const cfg = {
        method: gen.method,
        url: gen.endpoint,
        timeout: 45e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"
        }
      };
      gen.method === "GET" ? cfg.params = gen.payload : (cfg.data = gen.payload, cfg.headers["Content-Type"] = "application/json");
      const res = await axios(cfg);
      const elapsed = ((Date.now() - t) / 1e3).toFixed(2);
      const token = gen.extract(res.data);
      if (token) {
        console.log(`[SUCCESS] Token ditemukan (${elapsed}s)`);
        return {
          token: token,
          endpoint: gen.endpoint,
          act: act,
          elapsed: `${elapsed}s`
        };
      }
      throw new Error(res.data?.message || "Token tidak ditemukan");
    } catch (err) {
      console.log(`[FAIL] ${gen.endpoint} (${((Date.now() - t) / 1e3).toFixed(2)}s): ${err.message}`);
      throw new Error(`[${gen.endpoint}]: ${err.message}`);
    }
  }
  async solve({
    url,
    sitekey,
    ...rest
  }) {
    console.log(`[INFO] Solve captcha: ${url}`);
    const gens = this.gen(url, sitekey);
    let lastErr = null;
    for (const [i, gen] of gens.entries()) {
      try {
        return await this.run(gen, rest.act);
      } catch (err) {
        lastErr = err;
        if (i < gens.length - 1) console.log(`[RETRY] Mencoba base berikutnya...`);
      }
    }
    throw lastErr;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.sitekey || !params.url) {
    return res.status(400).json({
      error: "Parameter 'sitekey' dan 'url' diperlukan"
    });
  }
  const api = new CaptchaSolver();
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