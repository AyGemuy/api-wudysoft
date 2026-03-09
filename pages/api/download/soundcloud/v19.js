import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar,
  withCredentials: true
}));
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const BASE = "https://downcloudme.com";
class DownCloudMe {
  async get(path) {
    try {
      console.log(`[GET] ${BASE}${path}`);
      const {
        data
      } = await client.get(`${BASE}${path}`, {
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "id-ID"
        }
      });
      console.log(`[GET] OK ${BASE}${path}`);
      return data;
    } catch (err) {
      console.error(`[GET] FAILED =>`, err?.message);
      throw err;
    }
  }
  async tokens() {
    try {
      console.log(`[TOKEN] Fetching nonce from ${BASE}`);
      const html = await this.get("/");
      const $ = cheerio.load(html);
      const verify = $('input[name="downloader_verify"]').map((i, el) => $(el).val()).get().find(Boolean) || "";
      const referer = $("form").map((i, el) => $(el).attr("action")).get().find(Boolean) || "/";
      console.log(`[TOKEN] verify="${verify}" referer="${referer}"`);
      return {
        verify: verify,
        referer: referer
      };
    } catch (err) {
      console.error(`[TOKEN] FAILED =>`, err?.message);
      throw err;
    }
  }
  async parseSingle(html) {
    try {
      console.log(`[PARSE:SINGLE] Parsing single track...`);
      const $ = cheerio.load(html);
      const title = $("h3").map((i, el) => $(el).text()?.trim()).get().find(Boolean) || "";
      const thumb = $("img").map((i, em) => $(em).attr("src")).get().find(src => src?.includes("sndcdn")) || "";
      const direct = $("#fastDownloadBtn").map((i, el) => $(el).attr("data-direct")).get().find(Boolean) || "";
      const filename = $("#fastDownloadBtn").map((i, el) => $(el).attr("data-filename")).get().find(Boolean) || "";
      const form = $("#downloadForm");
      const backup = {
        action: form.map((i, el) => $(el).attr("action")).get().find(Boolean) || "",
        nonce: form.find('input[name="_nonce"]').map((i, el) => $(el).val()).get().find(Boolean) || "",
        yt: form.find('input[name="yt"]').map((i, el) => $(el).val()).get().find(Boolean) || "",
        title: form.find('input[name="title"]').map((i, el) => $(el).val()).get().find(Boolean) || ""
      };
      console.log(`[PARSE:SINGLE] title="${title}" filename="${filename}"`);
      return {
        type: "single",
        title: title,
        thumb: thumb,
        direct: direct,
        filename: filename,
        backup: backup
      };
    } catch (err) {
      console.error(`[PARSE:SINGLE] FAILED =>`, err?.message);
      throw err;
    }
  }
  async parsePlaylist(html) {
    try {
      console.log(`[PARSE:PLAYLIST] Parsing playlist tracks...`);
      const $ = cheerio.load(html);
      const tracks = $(".custom-track-container").map((i, el) => {
        const em = $(el);
        const title = em.find(".custom-track-title").map((j, e) => $(e).text()?.trim()).get().find(Boolean) || "";
        const thumb = em.find("img").map((j, e) => $(e).attr("src")).get().find(Boolean) || "";
        const href = em.find("a.custom-download-btn").map((j, e) => $(e).attr("href")).get().find(Boolean) || "";
        const duration = em.find(".custom-track-detail").map((j, e) => {
          const txt = $(e).text();
          return txt?.includes("Duration") ? txt.replace("Duration:", "").trim() : null;
        }).get().find(Boolean) || "";
        const likes = em.find(".custom-track-detail").map((j, e) => {
          const txt = $(e).text();
          return txt?.includes("Likes") ? txt.replace("Likes:", "").trim() : null;
        }).get().find(Boolean) || "";
        return {
          title: title,
          thumb: thumb,
          href: href,
          duration: duration,
          likes: likes
        };
      }).get();
      console.log(`[PARSE:PLAYLIST] Found ${tracks?.length} tracks`);
      return {
        type: "playlist",
        tracks: tracks
      };
    } catch (err) {
      console.error(`[PARSE:PLAYLIST] FAILED =>`, err?.message);
      throw err;
    }
  }
  async parse(html) {
    try {
      const $ = cheerio.load(html);
      const isPlaylist = $(".custom-track-container").length > 0;
      console.log(`[PARSE] Detected type: ${isPlaylist ? "playlist" : "single"}`);
      return isPlaylist ? await this.parsePlaylist(html) : await this.parseSingle(html);
    } catch (err) {
      console.error(`[PARSE] FAILED =>`, err?.message);
      throw err;
    }
  }
  async download({
    url
  }) {
    try {
      console.log(`[DOWNLOAD] START url=${url}`);
      const {
        verify,
        referer
      } = await this.tokens();
      const body = new URLSearchParams({
        downloader_verify: verify,
        _wp_http_referer: referer,
        url: url
      }).toString();
      console.log(`[POST] ${BASE}/download`);
      const {
        data: html
      } = await client.post(`${BASE}/download`, body, {
        headers: {
          "user-agent": UA,
          "content-type": "application/x-www-form-urlencoded",
          origin: BASE,
          referer: `${BASE}${referer}`,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "upgrade-insecure-requests": "1"
        },
        maxRedirects: 5
      });
      console.log(`[POST] OK`);
      const parsed = await this.parse(html);
      if (parsed?.type === "playlist") {
        const {
          type,
          ...info
        } = parsed;
        console.log(`[DOWNLOAD] DONE playlist tracks=${info?.tracks?.length}`);
        return {
          result: info?.tracks?.map(t => t?.href).filter(Boolean) || [],
          ...info,
          url: url
        };
      }
      const {
        type,
        title,
        thumb,
        direct,
        filename,
        backup
      } = parsed;
      console.log(`[DOWNLOAD] DONE single title="${title}"`);
      return {
        result: direct || backup?.action || null,
        ...{
          title: title || "Unknown"
        },
        ...{
          thumb: thumb || null
        },
        ...{
          filename: filename || null
        },
        ...{
          direct: direct || null
        },
        ...{
          backup: backup
        },
        url: url
      };
    } catch (err) {
      console.error(`[DOWNLOAD] ERROR =>`, err?.message);
      throw new Error(`DownCloudMe failed: ${err?.message}`);
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
  const api = new DownCloudMe();
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