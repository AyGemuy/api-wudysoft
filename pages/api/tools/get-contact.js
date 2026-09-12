import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class TurnstileSolver {
  constructor() {
    this.cli = axios.create({
      timeout: 12e4,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36"
      }
    });
    this.provs = [{
      name: "shannz",
      sup: ["turnstile", "turnstile-min"],
      run: (url, siteKey, mode, rest) => this.cli.post("https://shannz.zone.id/api/solve-turnstile-min", {
        url: url,
        siteKey: siteKey,
        proxy: null,
        ...rest
      }, {
        headers: {
          "User-Agent": "node",
          "x-bycf-version": "1.0.5",
          "x-bycf-secret": "shannz-secret-key-123"
        }
      }).then(res => res.data?.data)
    }, {
      name: "kanaa",
      sup: ["turnstile", "turnstile-min", "turnstile-max", "waf-session", "source"],
      run: (url, siteKey, mode, rest) => this.cli.post("https://cf.kanaa.eu.cc/solve", {
        url: url,
        siteKey: siteKey,
        mode: mode === "turnstile" ? "turnstile-min" : mode,
        ...rest
      }).then(res => res.data?.token)
    }];
  }
  async solve({
    url,
    sitekey,
    mode = "turnstile-min",
    ...rest
  } = {}) {
    if (!url || !sitekey) {
      return {
        error: "Parameter 'url' dan 'sitekey' wajib diisi."
      };
    }
    const active = this.provs.filter(p => p.sup.includes(mode));
    if (!active.length) {
      return {
        error: `Mode '${mode}' tidak didukung oleh provider manapun.`
      };
    }
    const rotated = [...active].sort(() => Math.random() - .5);
    let lastErr = "Unknown error";
    for (const p of rotated) {
      const t = Date.now();
      console.log(`[SOLVER] Mencoba provider: ${p.name.toUpperCase()} (Mode: ${mode})`);
      try {
        const token = await p.run(url, sitekey, mode, rest);
        if (token) {
          const elapsed = ((Date.now() - t) / 1e3).toFixed(2) + "s";
          console.log(`[SOLVER] Sukses via [${p.name.toUpperCase()}] dalam ${elapsed}`);
          return {
            provider: p.name,
            token: token,
            elapsed: elapsed
          };
        }
        lastErr = "Response API tidak mengembalikan token";
      } catch (err) {
        lastErr = err.response?.data?.message || err.response?.data?.error || err.message;
        console.warn(`[SOLVER] Provider [${p.name.toUpperCase()}] gagal: ${lastErr}`);
      }
    }
    return {
      error: `Semua provider gagal memproses request. Detail: ${lastErr}`
    };
  }
}
class GetContact {
  constructor(config = {}) {
    this.base = `${proxy}https://tools.naufalist.com`;
    this.cleanBase = "https://tools.naufalist.com";
    this.siteKey = "0x4AAAAAABut31SL98evGtHx";
    this.client = axios.create({
      baseURL: this.base
    });
    this.solver = new TurnstileSolver();
    this.initInterceptors();
  }
  initInterceptors() {
    this.client.interceptors.request.use(config => {
      console.log(`[HTTP Request] Mengirim ${config.method?.toUpperCase()} ke: ${config.url}`);
      return config;
    }, error => {
      console.error("[HTTP Request Error]", error?.message || error);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      console.log(`[HTTP Response] Status ${response.status} dari: ${response.config?.url}`);
      return response;
    }, error => {
      console.error("[HTTP Response Error]", error?.message || error);
      return Promise.reject(error);
    });
  }
  _hd(extraHeaders = {}) {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "sec-ch-ua-platform": '"Android"',
      "x-requested-with": "XMLHttpRequest",
      "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
      dnt: "1",
      "sec-ch-ua-mobile": "?1",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer: "https://tools.naufalist.com/getcontact",
      "accept-language": "id,ms;q=0.9,en;q=0.8",
      priority: "u=1, i",
      ...extraHeaders
    };
  }
  async _cred() {
    try {
      console.log("[Process] Mengambil data kredensial aktif...");
      const res = await this.client.get("/getcontact/api/credentials", {
        headers: this._hd()
      });
      const creds = res?.data?.data || [];
      console.log(`[Process] Sukses mendeteksi ${creds.length} kredensial`);
      return {
        status: true,
        result: creds
      };
    } catch (err) {
      console.error("[Error] Proses pengambilan kredensial gagal:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async _sub(credId) {
    try {
      console.log(`[Process] Memeriksa status subskripsi kredensial...`);
      const res = await this.client.post("/getcontact/api/subscription", {
        id: credId
      }, {
        headers: this._hd({
          "Content-Type": "application/json",
          origin: "https://tools.naufalist.com"
        })
      });
      const info = res?.data?.data?.info || {};
      return {
        status: true,
        result: info
      };
    } catch (err) {
      console.warn("[Warning] Gagal memeriksa status subskripsi:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async _ec() {
    try {
      console.log("[Process] Mengambil token EC dinamis dari form utama...");
      const res = await this.client.get("/getcontact", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          referer: "https://tools.naufalist.com/getcontact",
          "accept-language": "id,ms;q=0.9,en;q=0.8"
        }
      });
      const $ = cheerio.load(res?.data || "");
      const ec = $('input[name="ec"]').val();
      if (!ec) {
        return {
          status: false,
          error: 'Element token "ec" tidak ditemukan di dalam HTML halaman pencarian.'
        };
      }
      console.log("[Process] Token EC berhasil didapatkan secara dinamis");
      return {
        status: true,
        result: ec
      };
    } catch (err) {
      console.error("[Error] Ekstraksi token EC dinamis gagal:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async _sol(pageUrl) {
    const targetUrl = pageUrl || `${this.cleanBase}/getcontact`;
    console.log(`[Process] Menyelesaikan bypass Turnstile dengan TurnstileSolver untuk URL: ${targetUrl}...`);
    const solRes = await this.solver.solve({
      url: targetUrl,
      sitekey: this.siteKey,
      mode: "turnstile-min"
    });
    if (solRes && solRes.token) {
      return {
        status: true,
        result: solRes.token
      };
    }
    return {
      status: false,
      error: solRes.error || "Semua provider solver gagal memproses Turnstile."
    };
  }
  _p(html) {
    try {
      console.log("[Process] Memulai parsing dokumen HTML dengan Cheerio (.map/.get)...");
      const $ = cheerio.load(html || "");
      const profile = {
        image: $('img[alt="Profile Image"]').attr("src") || null
      };
      $("dl.row dt").map((_, elem) => {
        const key = $(elem).text().trim().toLowerCase().replace(/\s+/g, "_");
        const val = $(elem).next("dd").text().trim() || "-";
        profile[key] = val;
      }).get();
      const tags = $("table tbody tr").map((_, elem) => {
        const $tr = $(elem);
        return {
          index: parseInt($tr.find("th").text().trim(), 10) || 0,
          tag_name: $tr.find("td").first().text().trim(),
          tag_count: parseInt($tr.find("td h6.fw-bold").text().trim(), 10) || 0
        };
      }).get();
      console.log(`[Process] Selesai melakukan parsing. Menemukan ${tags.length} tag.`);
      return {
        status: true,
        result: {
          profile: profile,
          tags: tags
        }
      };
    } catch (err) {
      console.error("[Error] Parsing HTML gagal:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async search({
    number,
    ...rest
  }) {
    if (!number) {
      return {
        status: false,
        error: 'Parameter "number" wajib disediakan.'
      };
    }
    const cleanNum = String(number).replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 5) {
      return {
        status: false,
        error: "Format nomor telepon tidak valid atau terlalu pendek."
      };
    }
    console.log(`[Process] Mengawali alur pencarian nomor: ${cleanNum}`);
    const credsRes = await this._cred();
    if (!credsRes.status) return credsRes;
    const creds = credsRes.result;
    let activeCredId = rest?.credentialId;
    if (!activeCredId) {
      console.log("[Process] Memilih otomatis kredensial aktif dengan sisa limit kuota terbaik...");
      for (const cred of creds) {
        const subRes = await this._sub(cred.id);
        if (!subRes.status) continue;
        const subInfo = subRes.result;
        const remainingSearch = subInfo?.search?.remainingCount || 0;
        const remainingProfile = subInfo?.numberDetail?.remainingCount || 0;
        if (remainingSearch > 0 || remainingProfile > 0) {
          activeCredId = cred.id;
          console.log(`[Process] Kredensial terpilih secara otomatis: "${cred.description}"`);
          break;
        }
      }
    }
    const finalCredId = activeCredId ? activeCredId : creds?.[0]?.id || "";
    if (!finalCredId) {
      return {
        status: false,
        error: "Tidak ada kredensial GetContact yang tersedia untuk digunakan."
      };
    }
    let ecToken = rest?.ec;
    if (!ecToken) {
      const ecRes = await this._ec();
      if (!ecRes.status) return ecRes;
      ecToken = ecRes.result;
    }
    let turnstileToken = rest?.cfToken;
    if (!turnstileToken) {
      const solRes = await this._sol(`${this.cleanBase}/getcontact`);
      if (!solRes.status) return solRes;
      turnstileToken = solRes.result;
    }
    const sourceType = rest?.sourceType ? rest.sourceType : "search";
    console.log("[Process] Mengirimkan data pencarian...");
    const params = new URLSearchParams();
    params.append("ec", ecToken);
    params.append("phone_number", cleanNum);
    params.append("credential", finalCredId);
    params.append("source_type", sourceType);
    params.append("cf-turnstile-response", turnstileToken);
    try {
      const res = await this.client.post("/getcontact", params.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/x-www-form-urlencoded",
          "cache-control": "max-age=0",
          "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          dnt: "1",
          "upgrade-insecure-requests": "1",
          origin: "https://tools.naufalist.com",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1",
          "sec-fetch-dest": "document",
          referer: "https://tools.naufalist.com/getcontact",
          "accept-language": "id,ms;q=0.9,en;q=0.8",
          priority: "u=0, i"
        }
      });
      const parsedRes = this._p(res?.data);
      if (!parsedRes.status) return parsedRes;
      return {
        status: true,
        result: parsedRes.result
      };
    } catch (err) {
      console.error("[Error] Kesalahan pada operasi pengiriman data pencarian:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.number) {
    return res.status(400).json({
      error: "Parameter 'number' diperlukan"
    });
  }
  const api = new GetContact();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}