import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class SpotiMate {
  constructor() {
    this.base = "https://spotimate.app";
    this.cookies = {};
    this.client = axios.create({
      baseURL: this.base,
      decompress: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        origin: "https://spotimate.app",
        referer: "https://spotimate.app/en1",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
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
      console.log("[1/4] Menginisialisasi sesi & cookies SpotiMate...");
      const res = await this.req("/en1", "GET");
      if (!res?.status) {
        return {
          status: false,
          message: res?.message || "Gagal inisialisasi sesi"
        };
      }
      return {
        status: true
      };
    } catch (e) {
      return {
        status: false,
        message: `Init Error: ${e?.message || e}`
      };
    }
  }
  async userVerify(url) {
    try {
      console.log("[2/4] Verifikasi user token (/api/userverify)...");
      const body = new URLSearchParams({
        url: url
      }).toString();
      const res = await this.req("/api/userverify", "POST", body, {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest"
      });
      const data = typeof res?.data === "string" ? JSON.parse(res.data || "{}") : res?.data || {};
      if (!res?.status || !data?.success || !data?.token) {
        return {
          status: false,
          message: data?.message || "Gagal mendapatkan token verifikasi"
        };
      }
      return {
        status: true,
        token: data.token
      };
    } catch (e) {
      return {
        status: false,
        message: `User Verify Error: ${e?.message || e}`
      };
    }
  }
  async getAction(url, cfToken) {
    try {
      console.log("[3/4] Mengambil form metadata track (/action)...");
      const form = new FormData();
      form.append("url", url);
      form.append("cftoken", cfToken);
      const res = await this.req("/action", "POST", form, form.getHeaders());
      const data = typeof res?.data === "string" ? JSON.parse(res.data || "{}") : res?.data || {};
      const html = data?.html || "";
      if (!res?.status || !data?.success || !html) {
        return {
          status: false,
          message: data?.message || "Gagal mengambil form track"
        };
      }
      const $ = cheerio.load(html);
      const formInputs = $('form[name="submitapurl"] input[type="hidden"]').map((_, el) => ({
        name: $(el).attr("name"),
        value: $(el).attr("value")
      })).get();
      const payload = formInputs.reduce((acc, curr) => {
        if (curr?.name) acc[curr.name] = curr?.value || "";
        return acc;
      }, {});
      if (!payload?.data || !payload?.token) {
        return {
          status: false,
          message: "Gagal mengekstrak form token lagu dari respons server"
        };
      }
      return {
        status: true,
        payload: payload
      };
    } catch (e) {
      return {
        status: false,
        message: `Action Error: ${e?.message || e}`
      };
    }
  }
  async getTrack(payload, url) {
    try {
      console.log("[4/4] Memproses link download (/action/track)...");
      const form = new FormData();
      form.append("data", payload?.data || "");
      form.append("base", payload?.base || url);
      form.append("token", payload?.token || "");
      const res = await this.req("/action/track", "POST", form, form.getHeaders());
      const data = typeof res?.data === "string" ? JSON.parse(res.data || "{}") : res?.data || {};
      const html = data?.data || "";
      if (!res?.status || data?.error || !html) {
        return {
          status: false,
          message: data?.message || "Gagal mengambil data download akhir"
        };
      }
      const $ = cheerio.load(html);
      const title = $('h3[itemprop="name"] div').text().trim() || "Unknown Title";
      const artist = $(".spotifymate-middle p span").text().trim() || "Unknown Artist";
      const thumbnail = $(".spotifymate-left img").attr("src") || "";
      const links = $("a#popup, a.button").map((_, el) => ({
        name: $(el).text().trim(),
        url: $(el).attr("href") || ""
      })).get();
      const audio = links.find(l => l?.name?.toLowerCase()?.includes("mp3"))?.url || "";
      const cover = links.find(l => l?.name?.toLowerCase()?.includes("cover"))?.url || "";
      return {
        status: true,
        title: title,
        artist: artist,
        thumbnail: thumbnail,
        download: {
          audio: audio,
          cover: cover
        }
      };
    } catch (e) {
      return {
        status: false,
        message: `Track Action Error: ${e?.message || e}`
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
      if (!initRes?.status) return initRes;
      const verifyRes = await this.userVerify(cleanUrl);
      if (!verifyRes?.status) return verifyRes;
      const actRes = await this.getAction(cleanUrl, verifyRes.token);
      if (!actRes?.status) return actRes;
      const result = await this.getTrack(actRes.payload, cleanUrl);
      if (!result?.status) return result;
      console.log("✔ Berhasil mendapatkan link download SpotiMate!");
      return result;
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
    const downloader = new SpotiMate();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}