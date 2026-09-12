import axios from "axios";
import * as cheerio from "cheerio";
class SpotiDown {
  constructor() {
    this.base = "https://spotidown.app";
    this.cookies = {};
    this.client = axios.create({
      baseURL: this.base,
      decompress: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        Connection: "Keep-Alive",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        Referer: "https://spotidown.app/"
      }
    });
  }
  saveCookies(res) {
    const setCookie = res?.headers?.["set-cookie"] || [];
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    list.forEach(c => {
      if (!c) return;
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      if (k) this.cookies[k.trim()] = v.join("=").trim();
    });
  }
  getCookieHeader() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async req(path, method = "GET", data = null) {
    const cookieStr = this.getCookieHeader();
    const headers = {
      ...cookieStr ? {
        Cookie: cookieStr
      } : {},
      ...data ? {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://spotidown.app",
        "X-Requested-With": "XMLHttpRequest"
      } : {}
    };
    const res = await this.client({
      url: path,
      method: method,
      data: data,
      headers: headers
    });
    this.saveCookies(res);
    return res;
  }
  async init() {
    console.log("[1/3] Mendapatkan session token & cookies...");
    const res = await this.req("/en6");
    const html = typeof res?.data === "string" ? res.data : "";
    const $ = cheerio.load(html);
    let key = "";
    let token = "";
    $('form[name="spotifyurl"] input[type="hidden"], form.form-inline input[type="hidden"]').each((_, el) => {
      const name = $(el).attr("name") || "";
      const val = $(el).attr("value") || "";
      if (name && name !== "g-recaptcha-response") {
        key = name;
        token = val;
      }
    });
    return {
      key: key || "_ZWKfT",
      token: token || ""
    };
  }
  async download({
    url,
    ...rest
  }) {
    try {
      if (!url) throw new Error("URL Spotify wajib diisi.");
      const cleanUrl = url.split("?")[0];
      const {
        key,
        token
      } = await this.init();
      console.log("[2/3] Mengirim permintaan lagu ke server...");
      const actBody = new URLSearchParams({
        url: cleanUrl,
        "g-recaptcha-response": rest?.recaptchaToken ? rest.recaptchaToken : "dummy_token",
        [key]: token
      }).toString();
      const actRes = await this.req("/action", "POST", actBody);
      const rawData = typeof actRes?.data === "string" ? JSON.parse(actRes.data || "{}") : actRes?.data || {};
      if (rawData?.error) {
        throw new Error(rawData?.message || "Server menolak request (URL tidak valid / reCAPTCHA failed)");
      }
      const htmlFragment = rawData?.data || "";
      if (!htmlFragment) {
        throw new Error("Respons HTML kosong dari /action.");
      }
      const $act = cheerio.load(htmlFragment);
      const formInputs = $act('form[name="submitspurl"] input, form input[type="hidden"]').map((_, el) => ({
        k: $act(el).attr("name"),
        v: $act(el).attr("value")
      })).get();
      const payload = formInputs.reduce((acc, curr) => {
        if (curr?.k) acc[curr.k] = curr?.v || "";
        return acc;
      }, {});
      if (!payload?.data || !payload?.token) {
        const alertMsg = $act(".alert").text().trim();
        throw new Error(alertMsg || "Gagal mengekstrak form token lagu dari respons server.");
      }
      console.log("[3/3] Mengambil tautan unduhan akhir...");
      const trackBody = new URLSearchParams({
        data: payload?.data || "",
        base: payload?.base || cleanUrl,
        token: payload?.token || "",
        "g-recaptcha-response": rest?.recaptchaToken ? rest.recaptchaToken : "dummy_token"
      }).toString();
      const finalRes = await this.req("/action/track", "POST", trackBody);
      const finalData = typeof finalRes?.data === "string" ? JSON.parse(finalRes.data || "{}") : finalRes?.data || {};
      const $final = cheerio.load(finalData?.data || "");
      const title = $final('h3[itemprop="name"] div, h3[itemprop="name"]').first().text().trim() || "Unknown Title";
      const artist = $final(".spotidown-downloader-middle p span").first().text().trim() || "Unknown Artist";
      const thumbnail = $final(".spotidown-downloader-left img").attr("src") || "";
      const links = $final("a#popup, a.abutton").map((_, el) => ({
        title: $final(el).text().trim(),
        link: $final(el).attr("href") || ""
      })).get();
      const audio = links.find(l => l?.title?.toLowerCase()?.includes("mp3"))?.link || "";
      const cover = links.find(l => l?.title?.toLowerCase()?.includes("cover"))?.link || "";
      console.log("✔ Unduhan berhasil didapatkan!");
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
    } catch (err) {
      console.error("✖ Terjadi kesalahan:", err?.message || err);
      return {
        status: false,
        message: err?.message || "Gagal memproses request"
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
  const api = new SpotiDown();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}