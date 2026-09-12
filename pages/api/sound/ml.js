import axios from "axios";
import * as cheerio from "cheerio";
import {
  parseStringPromise
} from "xml2js";
class MLSound {
  constructor() {
    this.fandom = "https://mobile-legends.fandom.com/wiki";
    this.sitemap = "https://mobilelegendsbuild.com/sitemap.xml";
    this.client = axios.create({
      timeout: 1e4
    });
    this.langs = ["id", "en"];
  }
  async fetchText(url) {
    try {
      const {
        data
      } = await this.client.get(url, {
        responseType: "text"
      });
      return data;
    } catch (e) {
      const status = e.response?.status;
      throw new Error(JSON.stringify({
        message: status ? `Fetch failed (HTTP ${status}).` : `Fetch failed: ${e.message}`
      }));
    }
  }
  async resolveUrl(hero, lang) {
    if (lang !== "en") return `${this.fandom}/${hero}/Audio/${lang}`;
    const xml = await this.fetchText(this.sitemap);
    const result = await parseStringPromise(xml);
    const url = result.urlset.url.find(u => u.loc[0].includes("sound/" + hero))?.loc[0];
    if (!url) throw new Error(JSON.stringify({
      message: `No sounds found for hero "${hero}".`
    }));
    return url;
  }
  async generate({
    hero,
    lang = "id",
    id
  } = {}) {
    if (!hero) throw new Error(JSON.stringify({
      message: "Parameter 'hero' is required."
    }));
    const url = await this.resolveUrl(hero, lang);
    const html = await this.fetchText(url);
    const $ = cheerio.load(html);
    const sounds = $("audio").map((_, el) => $(el).attr("src")).get();
    if (!sounds.length) throw new Error(JSON.stringify({
      message: `No sounds found for hero "${hero}".`
    }));
    const idx = id ? parseInt(id) - 1 : Math.floor(Math.random() * sounds.length);
    if (idx < 0 || idx >= sounds.length) throw new Error(JSON.stringify({
      message: `Index out of range. Valid: 1–${sounds.length}.`
    }));
    return sounds[idx];
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new MLSound();
    const sound = await api.generate(params);
    return res.status(200).json({
      success: true,
      sound: sound
    });
  } catch (e) {
    return res.status(500).json(JSON.parse(e.message));
  }
}