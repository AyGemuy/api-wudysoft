import axios from "axios";
import * as cheerio from "cheerio";
import CryptoJS from "crypto-js";
class MyTuner {
  constructor() {
    this.base = "https://mytuner-radio.com";
    this.metaURL = "https://metadata-api.mytuner.mobi/api/v1/metadata-api/web";
    this.statURL = "https://stats2.mytuner.mobi/api/v2/web-api";
    this.hdrs = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none"
    };
    this.sec = "d9af42d5-7ab2-4718-a1ef-790b537e6677";
  }
  async _req(url, conf = {}) {
    try {
      console.log(`[_req] GET ${url}`);
      const res = await axios.get(url, conf);
      console.log(`[_req] status ${res.status}`);
      return res.data;
    } catch (err) {
      console.error(`[_req] Request failed to ${url}: ${err.message}`);
      throw err;
    }
  }
  _ext(html) {
    try {
      console.log("[_ext] Extracting playlist script data...");
      const m = html.match(/_playlist\s*=\s*formatPlaylist\((\[.*?\])\)/s);
      if (!m) {
        console.log("[_ext] pattern not found");
        return null;
      }
      return JSON.parse(m[1]);
    } catch (err) {
      console.error(`[_ext] JSON parse error: ${err.message}`);
      return null;
    }
  }
  _dec(cip, ivHex, ts) {
    try {
      console.log("[_dec] Attempting stream decryption...");
      const kHex = this._gk(String(ts));
      if (kHex.length !== 64) {
        throw new Error(`Invalid key hex length: ${kHex.length}, expected 64`);
      }
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const ctx = CryptoJS.enc.Base64.parse(cip);
      const key = CryptoJS.enc.Hex.parse(kHex);
      const dec = CryptoJS.AES.decrypt({
        ciphertext: ctx
      }, key, {
        iv: iv,
        mode: CryptoJS.mode.CFB
      });
      return dec.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      console.error(`[_dec] decrypt error: ${err.message}`);
      throw err;
    }
  }
  _gk(str) {
    try {
      let hex = "";
      let j = 0;
      for (let i = 0; i < 32; i++) {
        hex += str.charCodeAt(j).toString(16);
        j = (j + 1) % str.length;
      }
      return hex;
    } catch (err) {
      console.error(`[_gk] key generation failed: ${err.message}`);
      throw err;
    }
  }
  _auth(endpoint, radioId, timestamp) {
    try {
      const hostname = "mytuner-radio.com";
      const stringToSign = `${hostname}:/api/v1/metadata-api/web/${endpoint}?app_codename=mytuner_website&radio_id=${radioId}&time=${timestamp}`;
      console.log(`[_auth] Generating signature for: ${stringToSign}`);
      const hmac = CryptoJS.HmacSHA256(stringToSign, this.sec);
      const sig = hmac.toString(CryptoJS.enc.Base64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return `HMAC mytuner_website:${sig}`;
    } catch (err) {
      console.error(`[_auth] token creation failed: ${err.message}`);
      throw err;
    }
  }
  async home({
    page = 1,
    ...rest
  }) {
    console.log(`[home] target page: ${page}`);
    try {
      const targetUrl = page && parseInt(page, 10) > 1 ? `${this.base}/radio/?page=${page}` : `${this.base}/`;
      const html = await this._req(targetUrl, {
        headers: this.hdrs
      });
      const $ = cheerio.load(html);
      const feat = $(".our-radios ul li").map((_, el) => {
        const a = $(el).find("a");
        const rawHref = a.attr("href") ?? "";
        const href = rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : "";
        const name = a.find("span").text().trim() || "Unknown";
        const img = a.find("img").attr("data-src") ?? a.find("img").attr("src") ?? "";
        const slug = rawHref ? rawHref.replace(/^\/radio\//, "").replace(/\/$/, "") : "";
        return rawHref ? {
          name: name,
          href: href,
          img: img,
          slug: slug
        } : null;
      }).get().filter(Boolean);
      return {
        status: true,
        result: {
          page: page,
          featured: feat
        }
      };
    } catch (err) {
      console.error(`[home] ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async search({
    query,
    page = 1,
    ...rest
  }) {
    if (!query) {
      console.error("[search] query required");
      return {
        status: false,
        result: {
          error: "query required"
        }
      };
    }
    console.log(`[search] "${query}" target page: ${page}`);
    try {
      const targetUrl = page && parseInt(page, 10) > 1 ? `${this.base}/search/?q=${encodeURIComponent(query)}&page=${page}` : `${this.base}/search/?q=${encodeURIComponent(query)}`;
      const html = await this._req(targetUrl, {
        headers: this.hdrs
      });
      const $ = cheerio.load(html);
      const rads = $("#radios .radio-list ul li").map((_, el) => {
        const a = $(el).find("a");
        const rawHref = a.attr("href") ?? "";
        const href = rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : "";
        const name = a.find("span").text().trim() || "Unknown";
        const img = a.find("img").attr("data-src") ?? a.find("img").attr("src") ?? "";
        const slug = rawHref ? rawHref.replace(/^\/radio\//, "").replace(/\/$/, "") : "";
        return rawHref ? {
          name: name,
          href: href,
          img: img,
          slug: slug
        } : null;
      }).get().filter(Boolean);
      const pods = $("#podcasts .radio-list ul li").map((_, el) => {
        const a = $(el).find("a");
        const rawHref = a.attr("href") ?? "";
        const href = rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : "";
        const name = a.find("span").text().trim() || "Unknown";
        const img = a.find("img").attr("data-src") ?? a.find("img").attr("src") ?? "";
        const slug = rawHref ? rawHref.replace(/^\/podcast\//, "").replace(/\/$/, "") : "";
        return rawHref ? {
          name: name,
          href: href,
          img: img,
          slug: slug
        } : null;
      }).get().filter(Boolean);
      const cRad = $("#radios .counter").text().trim() || "0";
      const cPod = $("#podcasts .counter").text().trim() || "0";
      const feat = $(".our-radios ul li").map((_, el) => {
        const a = $(el).find("a");
        const rawHref = a.attr("href") ?? "";
        const href = rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : "";
        const name = a.find("span").text().trim() || "Unknown";
        const img = a.find("img").attr("data-src") ?? a.find("img").attr("src") ?? "";
        const slug = rawHref ? rawHref.replace(/^\/radio\//, "").replace(/\/$/, "") : "";
        return rawHref ? {
          name: name,
          href: href,
          img: img,
          slug: slug
        } : null;
      }).get().filter(Boolean);
      return {
        status: true,
        result: {
          query: query,
          page: page,
          radios: rads,
          podcasts: pods,
          counter_radios: cRad,
          counter_podcasts: cPod,
          featured: feat
        }
      };
    } catch (err) {
      console.error(`[search] ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    if (!url) {
      console.error("[detail] url required");
      return {
        status: false,
        result: {
          error: "url required"
        }
      };
    }
    console.log(`[detail] ${url}`);
    try {
      const cleanedPath = url.split("?")[0].replace(/\/$/, "");
      const slug = cleanedPath.replace(/^https?:\/\/mytuner-radio\.com\/radio\//, "").replace(/^\/radio\//, "");
      let radioId = null;
      if (/^\d+$/.test(slug)) {
        radioId = slug;
      } else {
        const idMatch = slug.match(/-(\d+)$/);
        if (idMatch) radioId = idMatch[1];
      }
      const fUrl = url.startsWith("http") ? url : `${this.base}/radio/${slug}/`;
      console.log(`[detail] Extracted radioId: ${radioId} | Slug: ${slug}`);
      const html = await this._req(fUrl, {
        headers: this.hdrs
      });
      const $ = cheerio.load(html);
      const crumbs = $(".breadcrumbs li").map((_, el) => {
        const a = $(el).find("a");
        const rawHref = a.attr("href") ?? "";
        return {
          name: a.text().trim() || $(el).text().trim(),
          href: rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : null
        };
      }).get();
      const name = $("h1").first().text().trim() || "Unknown";
      const title = $("title").text().trim() || name;
      const img = $(".radio-image").attr("src") ?? "";
      const desc = $('meta[name="description"]').attr("content") ?? "";
      const gen = $(".genres a").text().trim() || "";
      const slog = $(".slogan").text().trim() || "";
      const lTxt = $(".like-disclaimer .like span").text().trim() || "0";
      const rLike = parseInt(lTxt, 10) || 0;
      const dTxt = $(".like-disclaimer .dislike span").text().trim() || "0";
      const rDis = parseInt(dTxt, 10) || 0;
      const freqs = $(".frequencies ul li").map((_, el) => {
        const city = $(el).find("a").text().trim();
        const freq = $(el).find("div").text().trim();
        return city && freq ? {
          city: city,
          freq: freq
        } : null;
      }).get().filter(Boolean);
      const cts = {};
      $(".contacts .string-a").each((_, el) => {
        const lbl = $(el).text().trim();
        let val = $(el).next(".string-b").text().trim() || $(el).next("a").text().trim() || "";
        if (lbl) cts[lbl.toLowerCase()] = val;
      });
      const rStat = $(".right-container .radio-list ul li a").map((_, el) => {
        const rawHref = $(el).attr("href") ?? "";
        const href = rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : "";
        const name = $(el).find("span").text().trim() || "Unknown";
        const img = $(el).find("img").attr("data-src") ?? $(el).find("img").attr("src") ?? "";
        const slugRes = rawHref ? rawHref.replace(/^\/radio\//, "").replace(/\/$/, "") : "";
        return rawHref ? {
          name: name,
          href: href,
          img: img,
          slug: slugRes
        } : null;
      }).get().filter(Boolean);
      const rPod = $(".related-podcasts .radio-list ul li a").map((_, el) => {
        const rawHref = $(el).attr("href") ?? "";
        const href = rawHref ? rawHref.startsWith("http") ? rawHref : `${this.base}${rawHref}` : "";
        const name = $(el).find("span").text().trim() || "Unknown";
        const img = $(el).find("img").attr("data-src") ?? $(el).find("img").attr("src") ?? "";
        const slugRes = rawHref ? rawHref.replace(/^\/podcast\//, "").replace(/\/$/, "") : "";
        return rawHref ? {
          name: name,
          href: href,
          img: img,
          slug: slugRes
        } : null;
      }).get().filter(Boolean);
      const wLnk = $("a.widget").attr("href") ?? null;
      const ts = $("#last-update").data("timestamp") ?? null;
      const streams = [];
      if (ts) {
        const list = this._ext(html);
        if (list?.length) {
          for (const item of list) {
            if (item?.cipher && item?.iv) {
              try {
                const decrypted = this._dec(item.cipher, item.iv, ts);
                if (decrypted) streams.push(decrypted);
              } catch (decErr) {
                console.error(`[detail] decrypt error: ${decErr.message}`);
              }
            }
          }
        }
      }
      let currentMetadata = null;
      let songHistory = null;
      if (radioId) {
        console.log(`[detail] Auto-fetching metadata & history sequentially for ID ${radioId}...`);
        const targets = ["metadata", "history"];
        for (const type of targets) {
          try {
            if (type === "metadata") {
              const metaRes = await this._meta({
                radioId: radioId
              });
              if (metaRes?.status) currentMetadata = metaRes.result?.radio_metadata ?? null;
            } else if (type === "history") {
              const histRes = await this._history({
                radioId: radioId
              });
              if (histRes?.status) songHistory = histRes.result?.song_history ?? null;
            }
          } catch (loopErr) {
            console.error(`[detail] Failed during sequential fetch for ${type}: ${loopErr.message}`);
          }
        }
      }
      return {
        status: true,
        result: {
          radio_id: radioId ? parseInt(radioId, 10) : null,
          slug: slug,
          url: fUrl,
          name: name,
          title: title,
          image: img,
          description: desc,
          genre: gen,
          slogan: slog,
          rating_like: rLike,
          rating_dislike: rDis,
          breadcrumbs: crumbs,
          frequencies: freqs,
          contacts: cts,
          related_stations: rStat,
          related_podcasts: rPod,
          widget_link: wLnk,
          stream_url: streams[0] ?? null,
          stream_urls: streams,
          timestamp: ts,
          metadata: currentMetadata,
          song_history: songHistory
        }
      };
    } catch (err) {
      console.error(`[detail] ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async _meta({
    radioId
  }) {
    if (!radioId) return {
      status: false,
      result: {
        error: "radioId required"
      }
    };
    try {
      const ts = Date.now();
      const auth = this._auth("metadata", radioId, ts);
      const url = `${this.metaURL}/metadata?app_codename=mytuner_website&radio_id=${radioId}&time=${ts}`;
      const data = await this._req(url, {
        headers: {
          ...this.hdrs,
          Accept: "*/*",
          Authorization: auth,
          Origin: this.base,
          Referer: `${this.base}/`
        }
      });
      return {
        status: true,
        result: data
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
  async _history({
    radioId
  }) {
    if (!radioId) return {
      status: false,
      result: {
        error: "radioId required"
      }
    };
    try {
      const ts = Date.now();
      const auth = this._auth("song-history", radioId, ts);
      const url = `${this.metaURL}/song-history?app_codename=mytuner_website&radio_id=${radioId}&time=${ts}`;
      const data = await this._req(url, {
        headers: {
          ...this.hdrs,
          Accept: "*/*",
          Authorization: auth,
          Origin: this.base,
          Referer: `${this.base}/`
        }
      });
      return {
        status: true,
        result: data
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error: err.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/api/tuner?action=home&page=1",
          search: "/api/tuner?action=search&query=delta+fm",
          detail: "/api/tuner?action=detail&url=delta-fm-394854"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const options = {
    ...params
  };
  if (options.page) {
    options.page = parseInt(options.page, 10);
  }
  const api = new MyTuner();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(options);
        break;
      case "search":
        if (!options.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/api/tuner?action=search&query=prambors"
          });
        }
        response = await api.search(options);
        break;
      case "detail":
        if (!options.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi (bisa berupa slug atau URL full) untuk action 'detail'.",
            example: "/api/tuner?action=detail&url=delta-fm-394854"
          });
        }
        response = await api.detail(options);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari scraper. Coba lagi nanti."
      });
    }
    const statusCode = response.status ? 200 : 400;
    return res.status(statusCode).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server scraper.",
      error: error.message || "Unknown Error"
    });
  }
}