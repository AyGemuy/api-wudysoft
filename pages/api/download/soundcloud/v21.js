import axios from "axios";
import FormData from "form-data";
const BASE = "https://convertico.com/soundcloud-downloader";
const PHP = `${BASE}/soundcloud-downloader.php`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const HDR = {
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "user-agent": UA
};
const VALID_QUALITY = ["128", "192", "256", "320"];
class SoundCloud {
  constructor() {
    this.http = axios.create({
      baseURL: BASE
    });
    this.cookies = "";
  }
  async init() {
    if (this.cookies) {
      console.log("[init] cookies already set, skip");
      return;
    }
    console.log("[init] fetching homepage for cookies...");
    try {
      const res = await this.http.get("/", {
        headers: {
          ...HDR,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1",
          priority: "u=0, i"
        }
      });
      const raw = res.headers["set-cookie"] ?? [];
      this.cookies = raw.map(c => c.split(";")[0]).join("; ");
      console.log("[init] ✓ cookies captured:", this.cookies.slice(0, 60) + "…");
    } catch (err) {
      const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
      throw new Error(`[init] FAILED: ${detail}`);
    }
  }
  _form(fields) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
    return fd;
  }
  _hdr(fd) {
    return {
      ...HDR,
      ...fd.getHeaders(),
      accept: "*/*",
      origin: "https://convertico.com",
      referer: `${BASE}/`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=1, i",
      cookie: this.cookies
    };
  }
  async _meta(url) {
    await this.init();
    console.log("[fetch] url:", url);
    try {
      const fd = this._form({
        action: "fetch",
        url: url
      });
      const res = await this.http.post(PHP, fd, {
        headers: this._hdr(fd)
      });
      const d = res.data;
      if (d?.status !== "success") throw new Error(`fetch failed: ${JSON.stringify(d)}`);
      console.log("[fetch] ✓ title:", d.title, "| author:", d.author);
      console.log("[fetch] ✓ duration:", d.duration, "s | is_playlist:", d.is_playlist);
      return d;
    } catch (err) {
      const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
      throw new Error(`[fetch] FAILED: ${detail}`);
    }
  }
  async download({
    url,
    quality = "320",
    ...rest
  }) {
    console.log("─".repeat(55));
    console.log("[download] url:", url);
    const q = String(quality);
    if (!VALID_QUALITY.includes(q)) {
      throw new Error(`[download] invalid quality "${q}" — valid: ${VALID_QUALITY.join(", ")}`);
    }
    console.log("[download] quality:", q);
    try {
      await this.init();
      const meta = await this._meta(url);
      const isPlaylist = meta.is_playlist ?? false;
      console.log("[download] is_playlist (auto):", isPlaylist);
      console.log("[download] requesting download link...");
      const fd = this._form({
        action: "download",
        url: meta.url ?? url,
        quality: q,
        is_playlist: isPlaylist ? "1" : "0",
        ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)]))
      });
      const res = await this.http.post(PHP, fd, {
        headers: this._hdr(fd)
      });
      const d = res.data;
      if (d?.status !== "success") throw new Error(`download failed: ${JSON.stringify(d)}`);
      const fileUrl = d.file_url ? `${BASE}/${d.file_url}` : null;
      const filename = d.filename ?? "soundcloud-track.mp3";
      console.log("[download] ✓ type:", d.type);
      console.log("[download] ✓ file_url:", fileUrl);
      console.log("[download] ✓ filename:", filename);
      console.log("[download] ✓ size:", d.size ?? "?", "bytes | format:", d.format ?? "mp3");
      console.log("[download] ✓ is_playlist:", isPlaylist, "| quality:", q);
      console.log("─".repeat(55));
      return {
        ...meta,
        ...d,
        file_url: fileUrl,
        filename: filename,
        format: d.format ?? "mp3",
        files: d.files?.map(f => ({
          ...f,
          file_url: `${BASE}/${f.file_url}`
        })) ?? null
      };
    } catch (err) {
      console.error("[download] ✗ FAILED:", err.message);
      console.log("─".repeat(55));
      throw err;
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