import axios from "axios";
import * as cheerio from "cheerio";
class NonStick {
  constructor() {
    this.base = "https://www.nonstick.com";
    this.client = axios.create({
      timeout: 1e4
    });
    this.types = ["v1", "v2", "list"];
  }
  async fetchHtml(url) {
    try {
      const {
        data
      } = await this.client.get(url);
      return cheerio.load(data);
    } catch (e) {
      const status = e.response?.status;
      throw new Error(JSON.stringify({
        message: status ? `Fetch failed (HTTP ${status}).` : `Fetch failed: ${e.message}`
      }));
    }
  }
  async v1() {
    const $ = await this.fetchHtml(`${this.base}/soundsource/`);
    return $("div.column.two-third.column_column table tbody tr").map((_, el) => ({
      name: $(el).find("td a").text().trim(),
      link: $(el).find("td a").attr("href")
    })).get().filter(({
      name,
      link
    }) => name !== "" && link !== undefined);
  }
  async v2() {
    const $ = await this.fetchHtml(`${this.base}/sound-archive/`);
    return $("div.column.one.column_column").map((_, el) => $(el).parent().find("a").map((_, a) => ({
      link: $(a).attr("href"),
      name: $(el).text().trim(),
      quality: $(a).next("b").text().trim(),
      text: $(a).text().trim()
    })).get()).get().flat();
  }
  async list({
    url
  } = {}) {
    if (!url) throw new Error(JSON.stringify({
      message: "Parameter 'url' is required for type 'list'."
    }));
    const $ = await this.fetchHtml(url);
    return $("div.column.one.column_column table tbody tr").map((_, el) => ({
      link: $(el).find("td a").attr("href"),
      name: $(el).find("td a b").text().trim(),
      quality: $(el).find("td b").last().text().trim()
    })).get().filter(({
      name,
      link,
      quality
    }) => name !== "" && link !== undefined && quality !== "");
  }
  async generate(params = {}) {
    const {
      type
    } = params;
    if (!type) throw new Error(JSON.stringify({
      message: `Parameter 'type' required. Valid: ${this.types.join(", ")}.`
    }));
    if (!this.types.includes(type)) throw new Error(JSON.stringify({
      message: `Invalid type "${type}". Valid: ${this.types.join(", ")}.`
    }));
    return this[type](params);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new NonStick();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json(JSON.parse(e.message));
  }
}