import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class CrxTool {
  constructor() {
    this.rCws = /^https?:\/\/chromewebstore\.google\.com\/detail\/.+?\/([a-z]{32})(?=[\/#?]|$)/;
    this.rCwsDl = /^https?:\/\/clients2\.google\.com\/service\/update2\/crx\b.*?%3D([a-z]{32})%26uc/;
    this.rOws = /^https?:\/\/addons\.opera\.com\/.*?extensions\/(?:details|download)\/([^\/?#]+)/i;
    this.rAmo = /^https?:\/\/(addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org)\/.*?(?:addon|review)\/([^/<>"'?#]+)/;
    this.rAmoDl = /^https?:\/\/(addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org)\/[^?#]*\/downloads\/latest\/([^/?#]+)/;
    this.rAmoDom = /^https?:\/\/(addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org)\//;
    this.rAmoFile = /^https?:\/\/(addons\.mozilla\.org|addons(?:-dev)?\.allizom\.org)\/(?:[^?#\/]*\/)?firefox\/files\/browse\/(\d+)(\/[^?#\/]+\.xpi)?/;
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
  platform() {
    const p = process.platform,
      a = process.arch;
    return {
      os: p === "win32" ? "win" : p === "darwin" ? "mac" : "linux",
      arch: a === "x64" ? "x86-64" : a === "arm64" ? "arm64" : "x86-32",
      nacl_arch: a === "x64" ? "x86-64" : a === "arm64" ? "arm" : "x86-32"
    };
  }
  extId(url) {
    return this.rCws.exec(url)?.[1] || this.rCwsDl.exec(url)?.[1] || null;
  }
  amoDomain(url) {
    return this.rAmoDom.exec(url)?.[1] || "addons.mozilla.org";
  }
  amoSlug(url) {
    return (this.rAmo.exec(url) || this.rAmoDl.exec(url))?.[2] || null;
  }
  xpiUrl(domain, slug) {
    const pid = process.platform === "darwin" ? 3 : process.platform === "win32" ? 5 : 2;
    return `https://${domain}/firefox/downloads/latest/${slug}/platform:${pid}/${slug}.xpi`;
  }
  crxUrl(id) {
    const pf = this.platform();
    return `https://clients2.google.com/service/update2/crx?response=redirect` + `&os=${pf.os}&arch=${pf.arch}&os_arch=${pf.arch}&nacl_arch=${pf.nacl_arch}` + `&prod=chromiumcrx&prodchannel=unknown&prodversion=9999.0.9999.0` + `&acceptformat=crx2,crx3&x=id%3D${id}%26uc`;
  }
  resolve(url) {
    const owsM = this.rOws.exec(url);
    if (owsM) return {
      type: "crx",
      src: "opera",
      slug: owsM[1],
      dlUrl: `https://addons.opera.com/extensions/download/${owsM[1]}/`,
      storeUrl: `https://addons.opera.com/extensions/details/${owsM[1]}`
    };
    const amoFileM = this.rAmoFile.exec(url);
    if (amoFileM) return {
      type: "xpi",
      src: "amo",
      domain: amoFileM[1],
      fileId: amoFileM[2],
      dlUrl: `https://${amoFileM[1]}/firefox/downloads/file/${amoFileM[2]}${amoFileM[3] || "/addon.xpi"}`,
      storeUrl: url
    };
    const amoM = this.rAmo.exec(url);
    if (amoM) return {
      type: "xpi",
      src: "amo",
      domain: amoM[1],
      slug: amoM[2],
      dlUrl: this.xpiUrl(amoM[1], amoM[2]),
      storeUrl: `https://${amoM[1]}/firefox/addon/${amoM[2]}`
    };
    const id = this.extId(url) || (this.rId.test(url) ? url : null);
    if (id) return {
      type: "crx",
      src: "google",
      id: id,
      dlUrl: this.crxUrl(id),
      storeUrl: `https://chromewebstore.google.com/detail/${id}`
    };
    return null;
  }
  async scrapeCws(id) {
    const targetUrl = `https://chromewebstore.google.com/detail/${id}`;
    this.log(`Scraping CWS: ${targetUrl}`, "SCRAPE");
    const {
      data
    } = await this.client.get(targetUrl);
    const $ = cheerio.load(data);
    return {
      name: $("h1").first().text().trim() || id,
      description: $('div[jsname="ij8cu"]').text().trim() || $(".mN52G").text().trim(),
      version: $(".nBZElf").first().text().trim() || null,
      icon: $("img.rBxtY").first().attr("src")?.replace(/=s\d+.*$/, "=s128"),
      rating: $(".Vq0ZA").first().text().trim() || null,
      ratingCount: $(".xJEoWe").first().text().replace(/[()]/g, "").trim() || null,
      updated: $(".MqICNe").filter((_, el) => $(el).text().match(/Update|Diupdate/)).children().last().text().trim() || null,
      size: $(".MqICNe").filter((_, el) => $(el).text().match(/Size|Ukuran/)).children().last().text().trim() || null,
      screenshots: $('div[jsname="j8Rbke"]').map((_, el) => $(el).attr("data-media-url")?.replace(/=.*$/, "=s1280")).get(),
      storeUrl: targetUrl
    };
  }
  async scrapeAmo(domain, slug) {
    const targetUrl = `https://${domain}/firefox/addon/${slug}/`;
    this.log(`Scraping AMO: ${targetUrl}`, "SCRAPE");
    const {
      data
    } = await this.client.get(targetUrl);
    const $ = cheerio.load(data);
    return {
      name: $("h1.AddonTitle").first().text().trim() || slug,
      description: $(".AddonDescription-contents").text().trim() || $(".AddonDescription p").first().text().trim(),
      version: $(".AddonMoreInfo-version").text().trim() || null,
      icon: $("img.AddonIcon-image").first().attr("src") || null,
      rating: $(".AddonRating-star-average").attr("title") || null,
      ratingCount: $(".AddonRating-ratingCount").text().replace(/[()]/g, "").trim() || null,
      updated: $(".AddonMoreInfo-last-updated").text().trim() || null,
      size: null,
      screenshots: $(".Screenshots-list img").map((_, el) => $(el).attr("src")).get(),
      storeUrl: targetUrl
    };
  }
  async scrapeOpera(slug) {
    const targetUrl = `https://addons.opera.com/extensions/details/${slug}/`;
    this.log(`Scraping Opera: ${targetUrl}`, "SCRAPE");
    const {
      data
    } = await this.client.get(targetUrl);
    const $ = cheerio.load(data);
    return {
      name: $("h1.opera-ext-name, h1").first().text().trim() || slug,
      description: $(".opera-ext-description, .description").first().text().trim() || null,
      version: $(".opera-ext-version, .version").first().text().trim() || null,
      icon: $("img.opera-ext-icon, .extension-logo img").first().attr("src") || null,
      rating: $(".opera-ext-rating, .rating").first().text().trim() || null,
      ratingCount: null,
      updated: $(".opera-ext-updated, .updated").first().text().trim() || null,
      size: null,
      screenshots: $(".opera-screenshots img, .screenshots img").map((_, el) => $(el).attr("src")).get(),
      storeUrl: targetUrl
    };
  }
  async scrapeMeta(info) {
    try {
      if (info.src === "google") return await this.scrapeCws(info.id);
      if (info.src === "amo") return await this.scrapeAmo(info.domain, info.slug || info.fileId);
      if (info.src === "opera") return await this.scrapeOpera(info.slug);
    } catch (e) {
      this.log(`Scrape failed: ${e?.message}`, "WARN");
    }
    return {
      name: info.slug || info.id || "extension"
    };
  }
  async attempt(fn, label, max = 3, delay = 1e3) {
    for (let i = 1; i <= max; i++) {
      try {
        this.log(`${label} — attempt ${i}/${max}`, "RETRY");
        const result = await fn();
        if (result) return result;
        throw new Error("Empty result");
      } catch (e) {
        this.log(`${label} attempt ${i} failed: ${e?.message}`, "WARN");
        if (i < max) await new Promise(r => setTimeout(r, delay));
      }
    }
    return null;
  }
  async download({
    url,
    up = false,
    ...rest
  }) {
    const start = Date.now();
    this.log(`Processing: ${url}`, "PROC");
    try {
      this.log("Resolving URL...", "STEP 1");
      const info = this.resolve(url);
      if (!info) throw new Error("URL/ID tidak dikenali");
      this.log(`Src: ${info.src} | Type: ${info.type}`, "DEBUG");
      this.log("Scraping meta...", "STEP 2");
      const meta = await this.attempt(() => this.scrapeMeta(info), "scrape");
      const fileName = `${this.clean(meta?.name || info.slug || info.id || "extension")}.${info.type}`;
      this.log(`Downloading: ${fileName}`, "STEP 3");
      const dlRes = await this.attempt(() => this.client.get(info.dlUrl, {
        responseType: "arraybuffer"
      }), "download");
      if (!dlRes) throw new Error("Gagal download setelah 3 attempt");
      let result = null;
      if (up) {
        this.log("Uploading to Stylar CDN...", "STEP 4");
        const form = new FormData();
        form.append("file", Buffer.from(dlRes.data), {
          filename: fileName,
          contentType: info.type === "crx" ? "application/x-chrome-extension" : "application/x-xpinstall"
        });
        const upRes = await this.attempt(() => this.client.post("https://cdn.stylar.ai/api/v1/upload", form, {
          headers: form.getHeaders()
        }), "upload");
        if (!upRes) throw new Error("Gagal upload setelah 3 attempt");
        result = upRes.data;
        this.log(`Upload done`, "DONE");
      }
      this.log(`Selesai dalam ${Date.now() - start}ms`, "DONE");
      return {
        ...result,
        file_name: fileName,
        ...info,
        ...meta
      };
    } catch (e) {
      this.log(`Error: ${e?.message}`, "ERROR");
      return {
        result: null,
        error: e?.message,
        originalInput: url
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