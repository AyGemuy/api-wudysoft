import axios from "axios";
import * as cheerio from "cheerio";
class AudioJungle {
  constructor() {
    this.base = "https://audiojungle.net";
    this.client = axios.create({
      timeout: 1e4
    });
  }
  async fetchSounds(category, page = 1) {
    try {
      const {
        data
      } = await this.client.get(`${this.base}/search/${category}?page=${page}`, {
        responseType: "text"
      });
      const $ = cheerio.load(data);
      const sounds = [];
      $("div.shared-item_cards-list-audio_card_component__root").each((_, el) => {
        const src = $(el).find("source").attr("src");
        if (!src) return;
        const link = $(el).find("a.shared-item_cards-list-audio_card_component__itemLinkOverlay").attr("href");
        sounds.push({
          src: src,
          id: $(el).data("item-id"),
          name: $(el).data("impression-name"),
          brand: $(el).data("impression-brand"),
          price: $(el).data("price"),
          link: link ? `${this.base}${link}` : null
        });
      });
      if (!sounds.length) throw new Error(JSON.stringify({
        message: "No sound data found."
      }));
      return sounds;
    } catch (e) {
      const status = e.response?.status;
      throw new Error(e.message.startsWith("{") ? e.message : JSON.stringify({
        message: status ? `Fetch failed (HTTP ${status}).` : `Fetch failed: ${e.message}`
      }));
    }
  }
  async generate({
    category,
    page,
    id
  } = {}) {
    if (!category) throw new Error(JSON.stringify({
      message: "Parameter 'category' is required."
    }));
    const sounds = await this.fetchSounds(category, page);
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
    const api = new AudioJungle();
    const data = await api.generate(params);
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (e) {
    return res.status(500).json(JSON.parse(e.message));
  }
}