import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const BASE_CONFIGS = [{
  name: "zelapi",
  supports: ["turnstile", "cloudflare", "captchav3", "recaptchav2", "cloudflare-managed"],
  getUrl: (url, sitekey, act) => {
    const paths = {
      turnstile: "/api/turnstile",
      cloudflare: "/api/cloudflare",
      captchav3: "/api/captchav3",
      recaptchav2: "/api/recaptchav2",
      "cloudflare-managed": "/api/cloudflare-managed"
    };
    return paths[act] ? `https://cf.zelapi.eu.cc${paths[act]}` : null;
  },
  method: "POST",
  headers: {},
  getPayload: (url, sitekey, act) => {
    if (act === "cloudflare" || act === "cloudflare-managed") {
      return {
        url: url,
        headless: true
      };
    }
    return {
      sitekey: sitekey,
      siteurl: url
    };
  },
  extract: data => data?.token || data?.data?.token
}, {
  name: "fgsi",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  getUrl: (url, sitekey, act) => {
    return act === "turnstile-max" ? "https://fgsi.dpdns.org/api/tools/cfclearance/turnstile-max" : "https://fgsi.dpdns.org/api/tools/cfclearance/turnstile-min";
  },
  method: "GET",
  headers: {
    apikey: "CircleNBTeam"
  },
  getPayload: (url, sitekey) => ({
    sitekey: sitekey,
    url: url
  }),
  extract: data => data?.data?.token
}, {
  name: "zenzxz",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  getUrl: () => "https://cf.zenzxz.web.id/solve",
  method: "POST",
  headers: {},
  getPayload: (url, sitekey, act) => ({
    url: url,
    siteKey: sitekey,
    mode: act === "turnstile-max" ? "turnstile-max" : "turnstile-min"
  }),
  extract: data => data?.data?.token
}, {
  name: "pitucode",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  getUrl: (url, sitekey, act) => {
    return act === "turnstile-max" ? "https://cf.pitucode.com/solve-turnstile-max" : "https://cf.pitucode.com/solve-turnstile-min";
  },
  method: "POST",
  headers: {},
  getPayload: (url, sitekey, act) => {
    if (act === "turnstile-max") {
      return {
        url: url
      };
    }
    return {
      url: url,
      siteKey: sitekey
    };
  },
  extract: data => data?.token || data?.data?.token
}, {
  name: "local-domain",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  getUrl: (url, sitekey, act) => {
    const path = act === "turnstile-max" ? "captcha-solver" : "captcha-solver";
    return `https://${apiConfig.DOMAIN_URL}/api/tools/${path}`;
  },
  method: "GET",
  headers: {},
  getPayload: (url, sitekey) => ({
    url: url,
    sitekey: sitekey
  }),
  extract: data => data?.token
}];
class CaptchaSolver {
  constructor() {
    this.bases = BASE_CONFIGS;
  }
  gen(url, sitekey, act) {
    try {
      const activeBases = this.bases.filter(b => {
        const hasSupport = b.supports.includes(act);
        const resolvedUrl = b.getUrl(url, sitekey, act);
        return hasSupport && resolvedUrl !== null;
      });
      console.log(`[GENERATE] Menyusun ${activeBases.length} generator untuk target mode: ${act}.`);
      return activeBases.map(b => ({
        name: b.name,
        endpoint: b.getUrl(url, sitekey, act),
        method: b.method,
        headers: b.headers || {},
        payload: b.getPayload(url, sitekey, act),
        extract: b.extract
      }));
    } catch (err) {
      console.error(`[ERROR] Gagal menyusun konfigurasi generator: ${err.message}`);
      return [];
    }
  }
  async run(gen, act) {
    console.log(`[START] [${gen.name.toUpperCase()}] ${gen.method} ${gen.endpoint}`);
    const t = Date.now();
    try {
      const cfg = {
        method: gen.method,
        url: gen.endpoint,
        timeout: 45e3,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
          ...gen.headers
        }
      };
      if (gen.method === "GET") {
        cfg.params = gen.payload;
      } else {
        cfg.data = gen.payload;
        cfg.headers["Content-Type"] = "application/json";
      }
      console.log(`[REQUEST] Mengirim payload ke ${gen.endpoint}`);
      const res = await axios(cfg);
      const elapsed = ((Date.now() - t) / 1e3).toFixed(2);
      console.log(`[RESPONSE] Menerima balasan dengan status: ${res.status}`);
      const token = gen.extract(res.data);
      if (token) {
        console.log(`[SUCCESS] Token berhasil diekstrak (${elapsed}s)`);
        return {
          token: token,
          endpoint: gen.endpoint,
          act: act,
          elapsed: `${elapsed}s`
        };
      }
      const errMsg = res.data?.message || "Token tidak ditemukan dalam skema balasan";
      console.warn(`[WARN] Selesai tanpa mengembalikan token: ${errMsg}`);
      return {
        error: errMsg
      };
    } catch (err) {
      const elapsed = ((Date.now() - t) / 1e3).toFixed(2);
      console.error(`[FAIL] (${elapsed}s) Error: ${err.message}`);
      return {
        error: `[${gen.endpoint}]: ${err.message}`
      };
    }
  }
  async solve({
    url,
    sitekey,
    ...rest
  }) {
    const modeAct = rest.act || "turnstile";
    console.log(`[INFO] Memulai proses eksekusi. Target URL: ${url} | Mode: ${modeAct}`);
    try {
      const gens = this.gen(url, sitekey, modeAct);
      if (gens.length === 0) {
        return {
          error: `Tidak ada provider solver yang mendukung aksi '${modeAct}'.`
        };
      }
      let lastErr = null;
      for (const [i, gen] of gens.entries()) {
        console.log(`[FLOW] Menjalankan rute ke-${i + 1}/${gens.length} (${gen.name}): ${gen.endpoint}`);
        try {
          const result = await this.run(gen, modeAct);
          if (result && !result.error) {
            console.log(`[FLOW] Berhasil mendapatkan token di rute ke-${i + 1}.`);
            return result;
          }
          lastErr = result.error;
          console.log(`[FLOW] Rute ke-${i + 1} dilewati karena mengembalikan status error.`);
        } catch (innerErr) {
          lastErr = innerErr.message;
          console.error(`[FLOW-ERROR] Kendala internal pada rute ke-${i + 1}: ${innerErr.message}`);
        }
        if (i < gens.length - 1) {
          console.log(`[RETRY] Mencoba rute alternatif selanjutnya...`);
        }
      }
      console.error(`[FINAL-FAIL] Semua opsi base solver gagal menyelesaikan tantangan.`);
      return {
        error: lastErr || "Seluruh server pemroses gagal memvalidasi tantangan"
      };
    } catch (outerErr) {
      console.error(`[CRITICAL] Kegagalan tidak terduga pada fungsi solve(): ${outerErr.message}`);
      return {
        error: `Critical Solver Error: ${outerErr.message}`
      };
    }
  }
}
export default async function handler(req, res) {
  console.log(`[HANDLER] Inbound request terdeteksi via metode: ${req.method}`);
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const act = params.act || "turnstile";
    const allSupportedActs = [...new Set(BASE_CONFIGS.flatMap(b => b.supports))];
    if (!allSupportedActs.includes(act)) {
      return res.status(400).json({
        error: `Aksi '${act}' tidak valid. Pilihan: ${allSupportedActs.join(", ")}`
      });
    }
    const needsSitekey = ["turnstile", "turnstile-min", "turnstile-max", "captchav3", "recaptchav2"].includes(act);
    if (!params.url) {
      return res.status(400).json({
        error: "Parameter 'url' diperlukan"
      });
    }
    if (needsSitekey && !params.sitekey) {
      return res.status(400).json({
        error: `Parameter 'sitekey' wajib diisi untuk mode aksi '${act}'`
      });
    }
    const api = new CaptchaSolver();
    const data = await api.solve({
      ...params,
      act: act
    });
    if (data && data.error) {
      return res.status(500).json({
        error: data.error
      });
    }
    return res.status(200).json(data);
  } catch (handlerErr) {
    console.error(`[HANDLER-CRITICAL] Kegagalan total pada sistem routing API: ${handlerErr.message}`);
    return res.status(500).json({
      error: `Server Internal Error: ${handlerErr.message}`
    });
  }
}