import axios from "axios";
import * as cheerio from "cheerio";
class SpotiDownMe {
  constructor() {
    this.base = "https://spotidown.me";
    this.cookies = {};
    this.csrf = "";
    this.client = axios.create({
      baseURL: this.base,
      decompress: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        origin: "https://spotidown.me",
        referer: "https://spotidown.me/en1"
      }
    });
  }
  save(res) {
    try {
      const raw = res?.headers?.["set-cookie"] || [];
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach(c => {
        if (!c) return;
        const [pair] = c.split(";");
        const [k, ...v] = pair.split("=");
        if (k) this.cookies[k.trim()] = v.join("=").trim();
      });
    } catch (e) {
      console.error("Save Cookie Error:", e?.message || e);
    }
  }
  jar() {
    try {
      return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (e) {
      return "";
    }
  }
  async req(path, method = "GET", data = null, customHeaders = {}) {
    try {
      const cookieStr = this.jar();
      const headers = {
        ...cookieStr ? {
          cookie: cookieStr
        } : {},
        ...this.csrf ? {
          "x-csrf-token": this.csrf
        } : {},
        ...data ? {
          "content-type": "application/json"
        } : {},
        ...customHeaders
      };
      const res = await this.client({
        url: path,
        method: method,
        data: data,
        headers: headers
      });
      this.save(res);
      return {
        status: true,
        data: res?.data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.response?.data?.message || e?.message || "Request failed"
      };
    }
  }
  async init() {
    try {
      console.log("[1/3] Mengambil CSRF Token & Cookies awal...");
      const res = await this.req("/en1", "GET");
      if (!res?.status) {
        return {
          status: false,
          message: res?.message || "Gagal inisialisasi session"
        };
      }
      const html = typeof res?.data === "string" ? res.data : "";
      const $ = cheerio.load(html);
      const metaCsrf = $('meta[name="csrf-token"]').attr("content") || "";
      const inputCsrf = $('input[name="_token"]').attr("value") || "";
      this.csrf = metaCsrf || inputCsrf || "";
      return {
        status: true,
        csrf: this.csrf
      };
    } catch (e) {
      return {
        status: false,
        message: `Init Error: ${e?.message || e}`
      };
    }
  }
  async getTrackData(url) {
    try {
      console.log("[2/3] Mengambil metadata track (/getTrackData)...");
      const res = await this.req("/getTrackData", "POST", {
        spotify_url: url
      });
      if (!res?.status || !res?.data) {
        return {
          status: false,
          message: res?.message || "Gagal mengambil track data"
        };
      }
      return {
        status: true,
        data: res.data
      };
    } catch (e) {
      return {
        status: false,
        message: `Track Data Error: ${e?.message || e}`
      };
    }
  }
  async convert(spotifyUrl) {
    try {
      console.log("[3/3] Mengonversi dan mengambil direct link (/convert)...");
      const res = await this.req("/convert", "POST", {
        urls: spotifyUrl
      });
      if (!res?.status || !res?.data) {
        return {
          status: false,
          message: res?.message || "Gagal konversi track"
        };
      }
      const downloadUrl = res?.data?.url || "";
      if (res?.data?.error || !downloadUrl) {
        return {
          status: false,
          message: res?.data?.message || "Download link tidak ditemukan"
        };
      }
      return {
        status: true,
        download_url: downloadUrl
      };
    } catch (e) {
      return {
        status: false,
        message: `Convert Error: ${e?.message || e}`
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      if (!url) {
        return {
          status: false,
          message: "Parameter 'url' Spotify diperlukan."
        };
      }
      const cleanUrl = url.split("?")[0];
      const initRes = await this.init();
      if (!initRes?.status) {
        return {
          status: false,
          message: initRes?.message || "Gagal inisialisasi session CSRF"
        };
      }
      const trackRes = await this.getTrackData(cleanUrl);
      if (!trackRes?.status) {
        return {
          status: false,
          message: trackRes?.message || "Gagal mendapatkan data lagu"
        };
      }
      const trackInfo = trackRes?.data?.data || {};
      const targetUrl = trackInfo?.external_urls?.spotify || cleanUrl;
      const convRes = await this.convert(targetUrl);
      if (!convRes?.status) {
        return {
          status: false,
          message: convRes?.message || "Gagal mendapatkan link download",
          metadata: trackInfo
        };
      }
      console.log("✔ Berhasil mendapatkan link download SpotiDown.me!");
      return {
        status: true,
        title: trackInfo?.name || "Unknown Title",
        artist: trackInfo?.artists?.[0]?.name || "Unknown Artist",
        duration_ms: trackInfo?.duration_ms || 0,
        thumbnail: trackInfo?.album?.images?.[0]?.url || "",
        download: {
          audio: convRes.download_url
        },
        metadata: trackInfo
      };
    } catch (err) {
      return {
        status: false,
        message: err?.message || "Terjadi kesalahan sistem"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new SpotiDownMe();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}