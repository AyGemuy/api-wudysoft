import axios from "axios";
import * as cheerio from "cheerio";
class SoundLoaders {
  constructor() {
    this.base = "https://soundloaders.app";
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
        Referer: "https://soundloaders.app/"
      }
    });
  }
  save(res) {
    const raw = res?.headers?.["set-cookie"] || [];
    const list = Array.isArray(raw) ? raw : [raw];
    list.forEach(c => {
      if (!c) return;
      const [pair] = c.split(";");
      const [k, ...v] = pair.split("=");
      if (k) this.cookies[k.trim()] = v.join("=").trim();
    });
  }
  jar() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async req(path, method = "GET", data = null) {
    const cookieStr = this.jar();
    const headers = {
      ...cookieStr ? {
        Cookie: cookieStr
      } : {},
      ...data ? {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://soundloaders.app",
        "X-Requested-With": "XMLHttpRequest"
      } : {
        "X-Requested-With": "XMLHttpRequest"
      }
    };
    const res = await this.client({
      url: path,
      method: method,
      data: data,
      headers: headers
    });
    this.save(res);
    return res;
  }
  async download({
    url,
    ...rest
  }) {
    try {
      if (!url) throw new Error('Parameter "url" Spotify diperlukan.');
      const cleanUrl = url.split("?")[0];
      console.log("[1/4] Menginisialisasi session Soundloaders...");
      const initRes = await this.req("/");
      this.save(initRes);
      console.log("[2/4] Melakukan user verification...");
      const verifyBody = new URLSearchParams({
        url: cleanUrl
      }).toString();
      const verifyRes = await this.req("/api/userverify", "POST", verifyBody);
      const verifyData = typeof verifyRes?.data === "string" ? JSON.parse(verifyRes.data || "{}") : verifyRes?.data || {};
      const cfToken = verifyData?.token || "";
      if (!verifyData?.success || !cfToken) {
        throw new Error("Gagal memverifikasi user token dari /api/userverify.");
      }
      console.log("[3/4] Mengambil metadata form track...");
      const actBody = new URLSearchParams({
        url: cleanUrl,
        cftoken: cfToken
      }).toString();
      const actRes = await this.req("/action", "POST", actBody);
      const actData = typeof actRes?.data === "string" ? JSON.parse(actRes.data || "{}") : actRes?.data || {};
      const actHtml = actData?.html || "";
      if (!actData?.status || !actHtml) {
        throw new Error("Gagal mendapatkan informasi track dari /action.");
      }
      const $act = cheerio.load(actHtml);
      const formInputs = $act('form[name="submitspurl"] input[type="hidden"]').map((_, el) => ({
        k: $act(el).attr("name"),
        v: $act(el).attr("value")
      })).get();
      const payload = formInputs.reduce((acc, curr) => {
        if (curr?.k) acc[curr.k] = curr?.v || "";
        return acc;
      }, {});
      if (!payload?.data || !payload?.track_token) {
        throw new Error("Gagal mengekstrak data payload / track_token.");
      }
      console.log("[4/4] Memproses link direct download...");
      const tracksBody = new URLSearchParams({
        data: payload?.data || "",
        track_token: payload?.track_token || ""
      }).toString();
      const finalRes = await this.req("/action/tracks", "POST", tracksBody);
      const finalData = typeof finalRes?.data === "string" ? JSON.parse(finalRes.data || "{}") : finalRes?.data || {};
      const finalHtml = finalData?.html || "";
      const $final = cheerio.load(finalHtml);
      const title = $final("h2").first().text().trim() || "Unknown Title";
      const artist = $final("p.text-white\\/60").first().text().trim() || "Unknown Artist";
      const thumbnail = $final("img").attr("src") || "";
      const links = $final("a#popup, a").map((_, el) => ({
        text: $final(el).text().trim(),
        href: $final(el).attr("href") || ""
      })).get();
      const audio = links.find(l => l?.text?.toLowerCase()?.includes("mp3"))?.href || "";
      const cover = links.find(l => l?.text?.toLowerCase()?.includes("cover"))?.href || "";
      console.log("✔ Unduhan Soundloaders berhasil didapatkan!");
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
        message: err?.message || "Gagal memproses request Soundloaders"
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
  const api = new SoundLoaders();
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