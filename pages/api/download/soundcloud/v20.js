import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class SoundCloud {
  constructor() {
    this.jar = new CookieJar();
    this.base = "https://soundcloudmp3.org";
    this.api = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      baseURL: this.base,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID",
        Referer: "https://soundcloudmp3.org/",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      }
    }));
  }
  async init() {
    try {
      console.log("[LOG] Mengambil CSRF Token...");
      const {
        data
      } = await this.api.get("/");
      const $ = cheerio.load(data);
      const token = $('meta[name="csrf-token"]')?.attr("content") || null;
      if (!token) throw new Error("Token tidak ditemukan");
      return token;
    } catch (e) {
      throw e;
    }
  }
  async meta(url, token) {
    try {
      console.log("[LOG] Mengambil Metadata...");
      const form = new URLSearchParams();
      form.append("_token", token);
      form.append("url", url);
      const res = await this.api.post("/api/fetch-track", form);
      if (res.data?.status !== "success") throw new Error("Gagal fetch track");
      return res.data.track;
    } catch (e) {
      throw e;
    }
  }
  async start(track, token) {
    try {
      console.log("[LOG] Trigger Start Download...");
      const form = new URLSearchParams();
      form.append("_token", token);
      form.append("soundcloud_id", track.soundcloud_id);
      form.append("tier", 1);
      form.append("download_id", Math.floor(Math.random() * 1e6));
      await this.api.post("/api/start-download", form);
    } catch (e) {
      console.log("[WARN] Trigger start warning (lanjut polling)...");
    }
  }
  async poll(track) {
    const server = track.server_url ? track.server_url : "https://dl4.soundcloudmp3.org";
    const endpoint = `${server}/api/progress`;
    console.log(`[LOG] Polling progress dari server: ${server}`);
    const form = new URLSearchParams();
    form.append("v", track.soundcloud_id);
    form.append("tier", 1);
    for (let i = 0; i < 60; i++) {
      try {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await this.api.post(endpoint, form);
        if (data?.cdn_url) {
          console.log("[LOG] CDN URL Ditemukan!");
          return data.cdn_url;
        }
        console.log(`[LOG] Progress: ${data?.percent || 0}%...`);
      } catch (e) {
        console.log("[LOG] Polling retry...");
      }
    }
    throw new Error("Timeout polling download");
  }
  async download({
    url,
    ...rest
  }) {
    const start = Date.now();
    try {
      const token = await this.init();
      const track = await this.meta(url, token);
      console.log(`[LOG] Judul: ${track?.title || "Unknown"}`);
      await this.start(track, token);
      const downloadUrl = await this.poll(track);
      return {
        status: true,
        title: track?.title,
        artist: track?.artist,
        duration: track?.length,
        image: track?.image,
        download: downloadUrl,
        input_url: url,
        time: `${(Date.now() - start) / 1e3}s`,
        ...rest
      };
    } catch (error) {
      console.error("[ERROR]", error.message);
      return {
        status: false,
        msg: error?.message || "Error Unknown",
        input_url: url
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