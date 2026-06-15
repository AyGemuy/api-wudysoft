import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class SoundCloud {
  constructor() {
    try {
      this.ck = "";
      this.rf = "https://soundloadmate.com";
      this.cl = axios.create({
        baseURL: "https://soundloadmate.com",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
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
  async _init() {
    try {
      console.log("[PROSES] _init: Membuka landing page...");
      const r1 = await this.cl.get("/");
      let $ = cheerio.load(r1.data || "");
      const fl = $('link[rel="canonical"]').attr("href") || $('link[hreflang="en"]').attr("href") || "/enB14";
      this.rf = fl.startsWith("http") ? fl : `https://soundloadmate.com${fl}`;
      console.log(`[PROSES] _init: Mengikuti jalur -> ${this.rf}`);
      const r2 = await this.cl.get(this.rf, {
        headers: {
          referer: "https://soundloadmate.com/"
        }
      });
      $ = cheerio.load(r2.data || "");
      const hi = $('form[name="formurl"] input[type="hidden"]').eq(0);
      const k = hi.attr("name") || "iXnoW";
      const v = hi.attr("value") || "";
      console.log(`[SUKSES] _init: Mendapatkan token [${k}]`);
      return {
        k: k,
        v: v
      };
    } catch (err) {
      console.error("[ERROR] _init gagal:", err?.message || err);
      return {
        k: "iXnoW",
        v: ""
      };
    }
  }
  async _req(url, {
    k,
    v
  }) {
    try {
      console.log("[PROSES] _req: Mengirimkan URL ke /action...");
      const f = new FormData();
      f.append("url", url);
      f.append(k, v);
      const r = await this.cl.post("/action", f, {
        headers: {
          referer: this.rf,
          ...f.getHeaders()
        }
      });
      const $ = cheerio.load(r.data?.html || "");
      const d = $('input[name="data"]').attr("value") || "";
      const b = $('input[name="base"]').attr("value") || "";
      const t = $('input[name="token"]').attr("value") || "";
      console.log("[SUKSES] _req: Payload form internal diamankan");
      return {
        data: d,
        base: b,
        token: t
      };
    } catch (err) {
      console.error("[ERROR] _req gagal:", err?.message || err);
      return null;
    }
  }
  async _track(p) {
    try {
      console.log("[PROSES] _track: Membuka link download akhir dari /action/track...");
      const f = new FormData();
      f.append("data", p?.data || "");
      f.append("base", p?.base || "");
      f.append("token", p?.token || "");
      const r = await this.cl.post("/action/track", f, {
        headers: {
          referer: this.rf,
          ...f.getHeaders()
        }
      });
      const $ = cheerio.load(r.data?.data || "");
      console.log("[PROSES] _track: Parsing data element (map, get, eq)...");
      const l = $(".soundcloudmate-right .abuttons a").map((i, el) => {
        const item = $(el);
        return {
          text: item.find("span span").text()?.trim() || "Download",
          url: item.attr("href") || item.attr("onclick") || ""
        };
      }).get();
      const tt = $(".soundcloudmate-middle h3 div").eq(0).text()?.trim() || "Unknown Title";
      const au = $(".soundcloudmate-middle p span").eq(0).text()?.trim() || "Unknown Author";
      const cv = $(".soundcloudmate-left img").attr("src") || "";
      console.log("[SUKSES] _track: Struktur data berhasil dirakit");
      return {
        title: tt,
        author: au,
        cover: cv,
        downloads: l?.length ? l : []
      };
    } catch (err) {
      console.error("[ERROR] _track gagal:", err?.message || err);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[START] download: Memulai ekstraksi -> ${url}`);
      const cfg = await this._init();
      if (!cfg?.v) throw new Error("Konfigurasi token form utama kosong.");
      const p = await this._req(url, cfg);
      if (!p?.data) throw new Error("Gagal memproses muatan payload lagu.");
      const res = await this._track(p);
      console.log("[DONE] download: Ekstraksi selesai.");
      return res || {
        error: true,
        msg: "No data gathered"
      };
    } catch (err) {
      console.error("[FATAL] download terhenti:", err?.message || err);
      return {
        error: true,
        message: err?.message || "Error Internal"
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