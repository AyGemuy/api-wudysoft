import axios from "axios";
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
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new TurnstileSolver();
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