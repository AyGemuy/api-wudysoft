import axios from "axios";
class CitaCita {
  constructor() {
    this.index = "https://raw.githubusercontent.com/BadXyz/txt/main/citacita/citacita.json";
    this.client = axios.create({
      responseType: "arraybuffer",
      timeout: 1e4
    });
  }
  async generate({
    id
  } = {}) {
    try {
      const {
        data: list
      } = await this.client.get(this.index, {
        responseType: "json"
      });
      const idx = id ? parseInt(id) - 1 : Math.floor(Math.random() * list.length);
      if (idx < 0 || idx >= list.length) throw new Error(JSON.stringify({
        message: `Index out of range. Valid: 1–${list.length}.`
      }));
      const url = list[idx];
      const {
        data,
        headers
      } = await this.client.get(url);
      return {
        buffer: Buffer.from(data),
        contentType: headers["content-type"] || "audio/mp3"
      };
    } catch (e) {
      const status = e.response?.status;
      throw new Error(e.message.startsWith("{") ? e.message : JSON.stringify({
        message: status ? `Fetch failed (HTTP ${status}).` : `Fetch failed: ${e.message}`
      }));
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new CitaCita();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (e) {
    return res.status(500).json(JSON.parse(e.message));
  }
}