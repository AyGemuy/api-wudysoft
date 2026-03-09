import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class CrxTool {
  constructor() {
    this.rCws = /https?:\/\/(?:chrome|chromewebstore)\.google\.com\/.*\/([a-z]{32})(?=[\/#?]|$)/;
    this.rEdge = /https?:\/\/microsoftedge\.microsoft\.com\/addons\/detail\/.*\/([a-z]{32})(?=[\/#?]|$)/;
    this.rId = /^[a-z]{32}$/;
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
  }
  log(m, tag = "INFO") {
    console.log(`[${tag}] ${m}`);
  }
  clean(s) {
    return (s || "extension").replace(/[^\w\s\.-]/g, "").trim().replace(/\s+/g, "-");
  }
  find(v) {
    const eM = v.match(this.rEdge);
    const gM = v.match(this.rCws);
    const iM = this.rId.test(v) ? v : null;
    const id = eM?.[1] || gM?.[1] || iM;
    if (!id) return null;
    return {
      id: id,
      src: eM ? "edge" : "google"
    };
  }
  make(id, src, c) {
    if (src === "edge") return `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&prod=chromiumcrx&x=id%3D${id}%26installsource%3Dondemand%26uc`;
    return `https://clients2.google.com/service/update2/crx?response=redirect&os=${c.os}&arch=${c.arch}&os_arch=${c.nacl}&nacl_arch=${c.nacl}&prod=chromiumcrx&prodversion=${c.ver}&acceptformat=crx2,crx3&x=id%3D${id}%26uc`;
  }
  async scrapeMeta(id) {
    try {
      const targetUrl = `https://chromewebstore.google.com/detail/${id}`;
      this.log(`Scraping: ${targetUrl}`, "SCRAPE");
      const {
        data
      } = await this.client.get(targetUrl);
      const $ = cheerio.load(data);
      return {
        name: $("h1").first().text().trim() || id,
        description: $('div[jsname="ij8cu"]').text().trim() || $(".mN52G").text().trim(),
        version: $(".nBZElf").first().text().trim() || "120.0.0.0",
        icon: $("img.rBxtY").first().attr("src")?.replace(/=s\d+.*$/, "=s128"),
        rating: $(".Vq0ZA").first().text().trim(),
        ratingCount: $(".xJEoWe").first().text().replace(/[()]/g, "").trim(),
        updated: $(".MqICNe").filter((_, el) => $(el).text().match(/Update|Diupdate/)).children().last().text().trim(),
        size: $(".MqICNe").filter((_, el) => $(el).text().match(/Size|Ukuran/)).children().last().text().trim(),
        screenshots: $('div[jsname="j8Rbke"]').map((_, el) => $(el).attr("data-media-url")?.replace(/=.*$/, "=s1280")).get(),
        originalUrl: targetUrl
      };
    } catch (e) {
      this.log(`Scrape failed: ${e.message}`, "WARN");
      return {
        name: id,
        version: "120.0.0.0"
      };
    }
  }
  async download({
    url,
    up = false,
    ver,
    os,
    arch
  }) {
    this.log(`Processing: ${url}`, "PROC");
    try {
      const meta = this.find(url);
      if (!meta) throw new Error("ID/URL Pattern mismatch");
      this.log(`Fetching meta for: ${meta.id}`, "STEP 1");
      const details = await this.scrapeMeta(meta.id);
      const config = {
        ver: ver || details.version || "120.0.0.0",
        os: os || "win",
        arch: arch || "x64",
        nacl: (arch || "x64").includes("86") ? "x86-32" : "x86-64"
      };
      const dlUrl = this.make(meta.id, meta.src, config);
      const fileName = `${this.clean(details.name)}.crx`;
      this.log(`Downloading: ${fileName}`, "STEP 2");
      const {
        data: content
      } = await this.client.get(dlUrl, {
        responseType: "arraybuffer"
      });
      let result = null;
      if (up) {
        this.log(`Uploading to DigitalOfficePro...`, "STEP 3");
        const form = new FormData();
        form.append("file", Buffer.from(content), {
          filename: fileName,
          contentType: "application/x-chrome-extension"
        });
        const res = await this.client.post("https://cdn.stylar.ai/api/v1/upload", form, {
          headers: form.getHeaders()
        });
        result = res.data;
        this.log(`Upload done: ${result}`, "DONE");
      }
      return {
        ...result,
        file_name: fileName,
        ...details,
        ...meta
      };
    } catch (e) {
      this.log(e.message, "ERROR");
      return {
        result: null,
        error: e.message
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
  const api = new CrxTool();
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