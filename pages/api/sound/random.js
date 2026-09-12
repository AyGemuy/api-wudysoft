import axios from "axios";
class SoundNumber {
  constructor() {
    this.base = "https://raw.githubusercontent.com/AyGemuy/Sound/main";
    this.client = axios.create({
      responseType: "arraybuffer",
      timeout: 1e4
    });
    this.total = 119;
  }
  async generate({
    type
  } = {}) {
    if (type == null || type === "") throw new Error(JSON.stringify({
      message: `Parameter 'type' diperlukan. Valid: 0–${this.total - 1}.`
    }));
    if (isNaN(type)) throw new Error(JSON.stringify({
      message: "Parameter 'type' harus berupa angka."
    }));
    const idx = parseInt(type);
    if (idx < 0 || idx >= this.total) throw new Error(JSON.stringify({
      message: `Index out of range. Valid: 0–${this.total - 1}.`
    }));
    try {
      const {
        data,
        headers
      } = await this.client.get(`${this.base}/sound${idx + 1}.mp3`);
      return {
        buffer: Buffer.from(data),
        contentType: headers["content-type"] || "audio/mp3"
      };
    } catch (e) {
      const status = e.response?.status;
      throw new Error(JSON.stringify({
        message: status ? `Fetch failed (HTTP ${status}).` : `Fetch failed: ${e.message}`
      }));
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new SoundNumber();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (e) {
    return res.status(500).json(JSON.parse(e.message));
  }
}