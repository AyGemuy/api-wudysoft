import axios from "axios";
class SoundCloud {
  constructor() {
    try {
      this.ck = "";
      this.cl = axios.create({
        baseURL: "https://cdnscld.site/api",
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://soundloadmate.net",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://soundloadmate.net/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.cl.interceptors.request.use(c => {
        try {
          c.headers["cookie"] = this.ck || "";
          return c;
        } catch (e) {
          console.error("[ERR_REQ_INTERCEPT]", e?.message);
          return c;
        }
      }, e => Promise.reject(e));
      this.cl.interceptors.response.use(r => {
        try {
          const sc = r.headers?.["set-cookie"];
          if (sc) {
            const p = sc.map(c => c.split(";")[0]).join("; ");
            this.ck = this.ck ? `${this.ck}; ${p}` : p;
          }
          return r;
        } catch (e) {
          console.error("[ERR_RES_INTERCEPT]", e?.message);
          return r;
        }
      }, e => Promise.reject(e));
    } catch (err) {
      console.error("[ERR_CONSTRUCTOR]", err?.message);
    }
  }
  _toSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, "");
  }
  _clean(obj) {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(v => this._clean(v)).filter(v => v !== null);
    }
    if (typeof obj === "object") {
      const res = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) continue;
        const snakeKey = this._toSnake(k);
        const cleanedVal = this._clean(v);
        if (cleanedVal !== null) {
          res[snakeKey] = cleanedVal;
        }
      }
      return Object.keys(res).length > 0 ? res : null;
    }
    return obj;
  }
  async _job(url) {
    try {
      console.log("[PROSES] _job: Mendaftarkan URL antrean ke API download...");
      const r = await this.cl.get("/download", {
        params: {
          url: url,
          client: "soundloadmate.net"
        }
      });
      const id = r.data?.jobId;
      console.log(`[SUKSES] _job: Job ID didapatkan -> ${id}`);
      return id || null;
    } catch (err) {
      console.error("[ERROR] _job gagal:", err?.message || err);
      return null;
    }
  }
  async _poll(id, max = 60, delay = 3e3) {
    try {
      console.log(`[PROSES] _poll: Memulai polling status untuk Job [${id}]...`);
      for (let i = 1; i <= max; i++) {
        console.log(`[PROSES] _poll: Percobaan ke-${i}...`);
        const r = await this.cl.get(`/download/${id}`);
        const d = r.data || {};
        if (d.status === "Completed" && d.trackModel?.length > 0) {
          console.log("[SUKSES] _poll: Job selesai diproses server.");
          return d;
        }
        if (d.status === "Failed" || d.errorMessage) {
          throw new Error(d.errorMessage || "Server internal job failed.");
        }
        await new Promise(res => setTimeout(res, delay));
      }
      throw new Error("Timeout menunggu penyelesaian pemrosesan audio.");
    } catch (err) {
      console.error("[ERROR] _poll gagal:", err?.message || err);
      return null;
    }
  }
  async _stat(url) {
    try {
      console.log("[PROSES] _stat: Mengirimkan log CompletedInfo ke statistik server...");
      await axios.get("https://soundloadmate.net/api/log/statistics", {
        params: {
          status: "CompletedInfo",
          url: url
        },
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          referer: "https://soundloadmate.net/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          cookie: this.ck || ""
        }
      });
      console.log("[SUKSES] _stat: Log statistik terkirim.");
    } catch (err) {
      console.warn("[WARN] _stat gagal (diabaikan):", err?.message);
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[START] download: Memulai ekstraksi stream API -> ${url}`);
      const id = await this._job(url);
      if (!id) throw new Error("Gagal menginisialisasi Job ID dari cdnscld.site.");
      const jRes = await this._poll(id);
      if (!jRes) throw new Error("Gagal mendapatkan respon valid saat memeriksa status job.");
      await this._stat(url);
      console.log("[PROSES] download: Memproses filtering null & konversi snake_case data original...");
      const cleanedData = this._clean(jRes);
      console.log("[DONE] download: Pemrosesan data original selesai.");
      return cleanedData || {
        error: true,
        message: "Cleaned data is empty"
      };
    } catch (err) {
      console.error("[FATAL] download terhenti:", err?.message || err);
      return {
        error: true,
        message: err?.message || "Error Internal API"
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
  const api = new SoundCloud();
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