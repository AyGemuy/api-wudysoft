import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const BASE_CONFIGS = [{
  name: "kanaa",
  supports: ["turnstile", "turnstile-min", "turnstile-max", "waf-session", "source"],
  method: "POST",
  url: "https://cf.kanaa.eu.cc/solve",
  payload: (url, sitekey, act) => ({
    url: url,
    siteKey: sitekey,
    mode: act === "turnstile" ? "turnstile-min" : act
  }),
  extract: d => d?.token
}, {
  name: "shannz",
  supports: ["turnstile", "turnstile-min"],
  method: "POST",
  url: "https://shannz.zone.id/api/solve-turnstile-min",
  headers: {
    "User-Agent": "node",
    "x-bycf-version": "1.0.5",
    "x-bycf-secret": "shannz-secret-key-123"
  },
  payload: (url, sitekey) => ({
    url: url,
    siteKey: sitekey,
    proxy: null
  }),
  extract: d => d?.data
}, {
  name: "zelapi",
  supports: ["turnstile", "cloudflare", "captchav3", "recaptchav2", "cloudflare-managed"],
  method: "POST",
  url: (url, sitekey, act) => `https://cf.zelapi.eu.cc/api/${act}`,
  payload: (url, sitekey, act) => ["cloudflare", "cloudflare-managed"].includes(act) ? {
    url: url,
    headless: true
  } : {
    sitekey: sitekey,
    siteurl: url
  },
  extract: d => d?.token || d?.data?.token
}, {
  name: "fgsi",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  method: "GET",
  headers: {
    apikey: "CircleNBTeam"
  },
  url: (url, sitekey, act) => `https://fgsi.dpdns.org/api/tools/cfclearance/${act === "turnstile-max" ? "turnstile-max" : "turnstile-min"}`,
  payload: (url, sitekey) => ({
    sitekey: sitekey,
    url: url
  }),
  extract: d => d?.data?.token
}, {
  name: "zenzxz",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  method: "POST",
  url: "https://cf.zenzxz.web.id/solve",
  payload: (url, sitekey, act) => ({
    url: url,
    siteKey: sitekey,
    mode: act === "turnstile-max" ? "turnstile-max" : "turnstile-min"
  }),
  extract: d => d?.data?.token
}, {
  name: "pitucode",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  method: "POST",
  url: (url, sitekey, act) => `https://cf.pitucode.com/${act === "turnstile-max" ? "solve-turnstile-max" : "solve-turnstile-min"}`,
  payload: (url, sitekey, act) => act === "turnstile-max" ? {
    url: url
  } : {
    url: url,
    siteKey: sitekey
  },
  extract: d => d?.token || d?.data?.token
}, {
  name: "local-domain",
  supports: ["turnstile", "turnstile-min", "turnstile-max"],
  method: "GET",
  url: `https://${apiConfig.DOMAIN_URL}/api/tools/captcha-solver`,
  payload: (url, sitekey) => ({
    url: url,
    sitekey: sitekey
  }),
  extract: d => d?.token
}];
class CaptchaSolver {
  constructor() {
    this.bases = BASE_CONFIGS;
    this.client = axios.create({
      timeout: 6e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  gen(url, sitekey, act, overrides = {}) {
    try {
      const activeBases = this.bases.filter(b => b.supports.includes(act));
      console.log(`[GENERATE] Menyusun ${activeBases.length} generator untuk target mode: ${act}.`);
      return activeBases.map(b => ({
        name: b.name,
        endpoint: typeof b.url === "function" ? b.url(url, sitekey, act) : b.url,
        method: b.method,
        headers: b.headers || {},
        payload: {
          ...b.payload(url, sitekey, act),
          ...overrides
        },
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
        headers: {
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
      const res = await this.client(cfg);
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
    act,
    ...rest
  } = {}) {
    const modeAct = act || "turnstile";
    console.log(`[INFO] Memulai proses eksekusi. Target URL: ${url || "undefined"} | Mode: ${modeAct}`);
    const allSupportedActs = [...new Set(this.bases.flatMap(b => b.supports))];
    if (!allSupportedActs.includes(modeAct)) {
      console.warn(`[VALIDATION] Aksi '${modeAct}' tidak didukung.`);
      return {
        error: `Aksi '${modeAct}' tidak valid. Pilihan yang didukung: ${allSupportedActs.join(", ")}`
      };
    }
    if (!url) {
      console.warn("[VALIDATION] Parameter 'url' kosong.");
      return {
        error: "Parameter 'url' diperlukan"
      };
    }
    const needsSitekey = ["turnstile", "turnstile-min", "turnstile-max", "captchav3", "recaptchav2"].includes(modeAct);
    if (needsSitekey && !sitekey) {
      console.warn(`[VALIDATION] Parameter 'sitekey' kosong untuk aksi '${modeAct}'.`);
      return {
        error: `Parameter 'sitekey' wajib diisi untuk mode aksi '${modeAct}'`
      };
    }
    try {
      const gens = this.gen(url, sitekey, modeAct, rest);
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
  const params = req.method === "GET" ? req.query : req.body;
  const api = new CaptchaSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}