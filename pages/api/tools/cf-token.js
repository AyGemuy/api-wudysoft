import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class CaptchaSolver {
  constructor() {
    this.bases = [{
      baseUrl: act => {
        return act === "turnstile-max" ? "https://fgsi.dpdns.org/api/tools/cfclearance/turnstile-max" : "https://fgsi.dpdns.org/api/tools/cfclearance/turnstile-min";
      },
      method: "GET",
      headers: {
        apikey: "CircleNBTeam"
      },
      payload: (url, sitekey, act) => ({
        sitekey: sitekey,
        url: url
      }),
      extract: data => data?.data?.token
    }, {
      baseUrl: "https://cf.zenzxz.web.id/solve",
      method: "POST",
      payload: (url, sitekey, act) => ({
        url: url,
        siteKey: sitekey,
        mode: act === "turnstile-max" ? "turnstile-max" : "turnstile-min"
      }),
      extract: data => data?.data?.token
    }, {
      baseUrl: act => {
        return act === "turnstile-max" ? "https://cf.pitucode.com/solve-turnstile-max" : "https://cf.pitucode.com/solve-turnstile-min";
      },
      method: "POST",
      payload: (url, sitekey, act) => {
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
      baseUrl: act => {
        const path = act === "turnstile-max" ? "captcha-solver" : "captcha-solver";
        return `https://${apiConfig.DOMAIN_URL}/api/tools/${path}`;
      },
      method: "GET",
      payload: (url, sitekey, act) => ({
        url: url,
        sitekey: sitekey
      }),
      extract: data => data?.token
    }];
  }
  gen(url, sitekey, act) {
    try {
      console.log(`[GENERATE] Menyusun ${this.bases.length} generator dengan target mode: ${act}.`);
      return this.bases.map(({
        baseUrl,
        method,
        headers,
        payload,
        extract
      }) => {
        const resolvedUrl = typeof baseUrl === "function" ? baseUrl(act) : baseUrl;
        return {
          endpoint: resolvedUrl,
          method: method,
          headers: headers || {},
          payload: payload(url, sitekey, act),
          extract: extract
        };
      });
    } catch (err) {
      console.error(`[ERROR] Gagal menyusun konfigurasi generator: ${err.message}`);
      return [];
    }
  }
  decode(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString());
    } catch (err) {
      console.log(`[DECODE] Gagal parsing JSON, fallback ke plain string: ${err.message}`);
      try {
        return Buffer.from(str, "base64").toString();
      } catch (fallbackErr) {
        console.error(`[DECODE] Total kegagalan operasi base64: ${fallbackErr.message}`);
        return str;
      }
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
      console.log(`[RESPONSE] Menerima balasan dari ${gen.endpoint} dengan status: ${res.status}`);
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
      console.warn(`[WARN] ${gen.endpoint} selesai tanpa mengembalikan token: ${errMsg}`);
      return {
        error: errMsg
      };
    } catch (err) {
      const elapsed = ((Date.now() - t) / 1e3).toFixed(2);
      console.error(`[FAIL] ${gen.endpoint} (${elapsed}s) Error: ${err.message}`);
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
    const modeAct = rest.act || "turnstile-min";
    console.log(`[INFO] Memulai proses eksekusi captcha. Target URL: ${url} | Mode: ${modeAct}`);
    try {
      const gens = this.gen(url, sitekey, modeAct);
      if (gens.length === 0) {
        return {
          error: "Daftar susunan generator kosong."
        };
      }
      let lastErr = null;
      for (const [i, gen] of gens.entries()) {
        console.log(`[FLOW] Menjalankan rute ke-${i + 1}/${gens.length}: ${gen.endpoint}`);
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
          console.error(`[FLOW-ERROR] Kendala fatal internal pada rute ke-${i + 1}: ${innerErr.message}`);
        }
        if (i < gens.length - 1) {
          console.log(`[RETRY] Mencoba rute alternatif selanjutnya...`);
        }
      }
      console.error(`[FINAL-FAIL] Semua opsi base solver gagal menyelesaikan tantangan.`);
      return {
        error: lastErr || "Seluruh server pemroses gagal memvalidasi tantangan captcha"
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
    if (!params.sitekey || !params.url) {
      console.warn(`[HANDLER-WARN] Atribut pengiriman data tidak lengkap (sitekey/url kosong).`);
      return res.status(400).json({
        error: "Parameter 'sitekey' dan 'url' diperlukan"
      });
    }
    const api = new CaptchaSolver();
    const data = await api.solve(params);
    if (data && data.error) {
      console.log(`[HANDLER-RESPONSE] Mengirimkan status internal server error (500).`);
      return res.status(500).json({
        error: data.error
      });
    }
    console.log(`[HANDLER-RESPONSE] Pengolahan sukses (200).`);
    return res.status(200).json(data);
  } catch (handlerErr) {
    console.error(`[HANDLER-CRITICAL] Kegagalan total pada sistem routing API: ${handlerErr.message}`);
    return res.status(500).json({
      error: `Server Internal Error: ${handlerErr.message}`
    });
  }
}