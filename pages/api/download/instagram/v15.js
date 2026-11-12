import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
import qs from "qs";
import {
  wrapper
} from "axios-cookiejar-support";
const BASE_URL = "https://snapinsta.to";
const BASE_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
class InstaDownloader {
  constructor() {
    this.jar = new CookieJar();
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.client = wrapper(axios.create({
      baseURL: BASE_URL,
      jar: this.jar,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "User-Agent": this.ua,
        Origin: BASE_URL,
        Referer: `${BASE_URL}/en2`,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s < 303
    }));
  }
  b64(d, e, f) {
    const h = BASE_CHARS.slice(0, e);
    const j = d.split("").reverse().reduce((acc, char, i) => {
      const ci = h.indexOf(char);
      return ci !== -1 ? acc + ci * (Math.pow(e, i) || 0) : acc;
    }, 0);
    let t = j || 0;
    if (f !== 10) {
      let k = "";
      const s = BASE_CHARS.slice(0, f);
      while (t > 0) {
        k = s[t % f] + k;
        t = (t - t % f) / f;
      }
      return k || "0";
    }
    return j;
  }
  dec(h) {
    console.log(">>> [Log] Decode payload...");
    const m = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    const sc = m[2];
    let r = "";
    try {
      for (let i = 0, l = h.length; i < l; i++) {
        let s = "";
        while (h[i] !== sc && i < l) {
          s += h[i];
          i++;
        }
        for (let j = 0; j < m.length; j++) {
          s = s.replace(new RegExp(m[j], "g"), j);
        }
        r += String.fromCharCode(this.b64(s, 2, 10) - 1);
      }
      const dr = decodeURIComponent(r);
      console.log(">>> [Log] Decode OK:", dr.length);
      return dr;
    } catch (e) {
      console.error("!!! [Log] Decode fail:", e.message);
      return null;
    }
  }
  async tkn(url) {
    console.log(">>> [Log] Get token...");
    try {
      const r = await this.client.post("/api/userverify", qs.stringify({
        url: url
      }));
      const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      const t = d?.token || null;
      console.log(`>>> [Log] Token ${t ? "OK" : "FAIL"}`);
      return t;
    } catch (e) {
      console.error("!!! [Log] Token error:", e.message);
      return null;
    }
  }
  parse(html) {
    console.log(">>> [Log] Parse HTML...");
    const clean = html.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const $ = cheerio.load(clean, {
      decodeEntities: false,
      normalizeWhitespace: false
    });
    const res = {
      media: [],
      thumb: []
    };
    $(".download-items").each((i, el) => {
      const $i = $(el);
      const $t = $i.find(".download-items__thumb img");
      const ts = $t.attr("src") || "";
      let $d = $i.find(".download-items__btn a").first();
      if (!$d.length) $d = $i.find("a.abutton").first();
      if (!$d.length) $d = $i.find("a[href]").first();
      const url = $d.attr("href") || "";
      const ttl = $d.attr("title") || $d.find("span").text().trim() || "";
      const fc = $i.find(".format-icon i, .format-icon").attr("class") || "";
      let typ = "unknown";
      if (fc.includes("dlvideo") || url.includes(".mp4") || ttl.toLowerCase().includes("video")) {
        typ = "video";
      } else if (fc.includes("dlimage") || fc.includes("dlphoto") || url.includes(".jpg") || url.includes(".png")) {
        typ = "image";
      }
      if (url) {
        res.media.push({
          i: res.media.length,
          typ: typ,
          url: url,
          ttl: ttl,
          thumb: ts,
          ico: fc,
          size: null,
          ext: url.split(".").pop().split("?")[0] || null
        });
        if (ts) res.thumb.push(ts);
      }
    });
    $("ul.download-box li").each((i, el) => {
      const $li = $(el);
      $li.find("a[href]").each((j, le) => {
        const $l = $(le);
        const h = $l.attr("href") || "";
        if (h && (h.includes("dl.snapcdn.app") || h.includes("/get?token=") || h.includes("/d/") || h.includes("/v/"))) {
          if (!res.media.find(m => m.url === h)) {
            const iv = h.includes(".mp4") || h.includes("/v/") || $l.text().toLowerCase().includes("video");
            res.media.push({
              i: res.media.length,
              typ: iv ? "video" : "image",
              url: h,
              ttl: $l.attr("title") || $l.text().trim(),
              thumb: $li.find("img").attr("src") || "",
              ico: "",
              size: null,
              ext: h.split(".").pop().split("?")[0] || null
            });
          }
        }
      });
    });
    $('a[href*="dl.snapcdn.app"], a[href*="/get?token="]').each((i, el) => {
      const $l = $(el);
      const h = $l.attr("href") || "";
      if (h && !res.media.find(m => m.url === h)) {
        const iv = h.includes(".mp4") || $l.text().toLowerCase().includes("video");
        res.media.push({
          i: res.media.length,
          typ: iv ? "video" : "image",
          url: h,
          ttl: $l.attr("title") || $l.text().trim(),
          thumb: "",
          ico: "",
          size: null,
          ext: h.split(".").pop().split("?")[0] || null
        });
      }
    });
    console.log(`>>> [Log] Parse OK: ${res.media.length} items`);
    return res;
  }
  async download({
    url,
    ...rest
  }) {
    try {
      const u = url || (() => {
        throw new Error("URL required");
      })();
      console.log(`\n>>> [Log] Start: ${u}`);
      const t = await this.tkn(u);
      if (!t) return {
        ok: false,
        msg: "Token fail",
        data: null
      };
      console.log(">>> [Log] Search media...");
      const sr = await this.client.post("/api/ajaxSearch", qs.stringify({
        q: u,
        t: "media",
        v: "v2",
        lang: "en",
        cftoken: t,
        ...rest
      }));
      const rd = typeof sr.data === "string" ? JSON.parse(sr.data) : sr.data;
      const enc = rd?.data || "";
      if (rd?.status !== "ok" || !enc) {
        return {
          ok: false,
          msg: rd?.mess || "Search fail",
          data: null
        };
      }
      console.log(">>> [Log] Got encoded data");
      const htm = this.dec(enc);
      if (!htm) return {
        ok: false,
        msg: "Decode fail",
        data: null
      };
      const pr = this.parse(htm);
      if (pr.media.length === 0) {
        return {
          ok: false,
          msg: "No media found",
          data: null
        };
      }
      console.log(">>> [Log] Done!");
      return {
        ok: true,
        msg: "Success",
        data: {
          url: u,
          media: pr.media,
          thumb: pr.thumb,
          total: pr.media.length,
          vid: pr.media.filter(m => m.typ === "video").length,
          img: pr.media.filter(m => m.typ === "image").length,
          ts: new Date().toISOString()
        }
      };
    } catch (e) {
      console.error("!!! [Log] Error:", e.message);
      return {
        ok: false,
        msg: e.message,
        data: null
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
  const api = new InstaDownloader();
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