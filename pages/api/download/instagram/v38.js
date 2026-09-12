import axios from "axios";
import * as cheerio from "cheerio";
class Instagram {
  constructor() {
    console.log("[Process] Menginisialisasi Client Instagram Downloader...");
    this.client = axios.create({
      timeout: 6e4
    });
  }
  bldHead() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip",
      "sec-fetch-mode": "navigate",
      "accept-language": "en-US,en;q=0.8",
      referer: "https://www.instagram.com/"
    };
  }
  _id(url) {
    const match = (url || "").match(/(?:reels?|p|share\/reel)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : "";
  }
  _find(obj) {
    if (!obj || typeof obj !== "object") return null;
    if (obj.xig_polaris_media) return obj.xig_polaris_media;
    if (obj.xdt_shortcode_media) return obj.xdt_shortcode_media;
    const TARGET = new Set(["XIGPolarisVideoMedia", "XIGPolarisCarouselMedia", "XIGPolarisImageMedia", "GraphVideo", "GraphImage", "GraphSidecar"]);
    if (TARGET.has(obj.__typename)) return obj;
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object") {
        const found = this._find(val);
        if (found) return found;
      }
    }
    return null;
  }
  _clean(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (item && typeof item === "object" && "node" in item) {
          return this._clean(item.node);
        }
        return this._clean(item);
      }).filter(item => item !== null && item !== undefined);
    }
    const cleaned = {};
    for (let [key, val] of Object.entries(obj)) {
      if (key === "__typename" || key === "tracking_token") continue;
      const cleanKey = key.replace(/^(xig_polaris_|xdt_|edge_)/, "");
      let processedVal = val;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        if ("edges" in val && Array.isArray(val.edges)) {
          processedVal = val.edges.map(edge => this._clean(edge?.node || edge));
        } else if ("nodes" in val && Array.isArray(val.nodes)) {
          processedVal = val.nodes.map(node => this._clean(node));
        } else {
          processedVal = this._clean(val);
        }
      } else {
        processedVal = this._clean(val);
      }
      if (processedVal && typeof processedVal === "object" && !Array.isArray(processedVal)) {
        const subKeys = Object.keys(processedVal);
        if (subKeys.length === 1 && subKeys[0] === "node") {
          processedVal = processedVal.node;
        }
      }
      cleaned[cleanKey] = processedVal;
    }
    return cleaned;
  }
  async download({
    url,
    ...rest
  }) {
    try {
      const code = this._id(url);
      if (!code) throw new Error("Shortcode Instagram tidak valid atau tidak ditemukan pada URL");
      console.log(`[Process] Mengunduh halaman HTML untuk Shortcode: ${code}`);
      const response = await this.client.get(url, {
        headers: this.bldHead(),
        ...rest
      });
      console.log("[Process] Mengurai struktur HTML menggunakan Cheerio...");
      const $ = cheerio.load(response.data);
      const scripts = $('script[type="application/json"]').map((_, el) => $(el).html()?.trim() || "").get();
      const rawMediaNode = scripts.filter(raw => raw.startsWith("{") && (raw.includes("XIGPolarisVideoMedia") || raw.includes("display_uri") || raw.includes("carousel_media") || raw.includes("shortcode"))).map(raw => {
        try {
          return this._find(JSON.parse(raw));
        } catch {
          return null;
        }
      }).find(Boolean);
      if (!rawMediaNode) throw new Error("Gagal mendeteksi simpul media JSON asli pada halaman Instagram.");
      return this._clean(rawMediaNode);
    } catch (err) {
      console.log("[Error] Gagal mengunduh media dari Instagram:", err.message);
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
  const api = new Instagram();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}