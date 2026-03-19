import axios from "axios";
const audioFiles = ["anjay", "ara-ara", "ara-ara-cowok", "ara-ara2", "arigatou", "assalamualaikum", "asu", "ayank", "aku-ngakak", "bacot", "bahagia-aku", "baka", "bansos", "beat-box", "beat-box2", "biasalah", "bidadari", "bot", "buka-pintu", "canda-anjing", "cepetan", "cuekin-terus", "daisuki-dayo", "daisuki", "dengan-mu", "gaboleh-gitu", "gak-lucu", "gamau", "gay", "gelay", "gitar", "gomenasai", "hai-bot", "hampa", "hayo", "hp-iphone", "i-like-you", "ih-wibu", "india", "karna-lo-wibu", "kiss", "kontol", "ku-coba", "maju-wibu", "makasih", "mastah", "nande-nande", "nani", "ngadi-ngadi", "nikah", "nuina", "onichan", "owner-sange", "ownerku", "pak-sapardi", "pale", "pantek", "pasi-pasi", "punten", "sayang", "siapa-sih", "sudah-biasa", "summertime", "tanya-bapak-lu", "to-the-bone", "wajib", "waku", "woi", "yamete", "yowaimo", "yoyowaimo"];
class SoundAPI {
  constructor() {
    this.base = "https://raw.githubusercontent.com/AyGemuy/HAORI-API/main/audio";
    this.client = axios.create({
      responseType: "arraybuffer",
      timeout: 1e4
    });
    this.files = audioFiles;
  }
  resolve(type) {
    const t = String(type).trim();
    if (!isNaN(t)) {
      const idx = parseInt(t);
      if (idx < 0 || idx >= this.files.length) throw new Error(`Index out of range. Valid: 0–${this.files.length - 1}.`);
      return this.files[idx];
    }
    const name = this.files.find(f => f.toLowerCase().includes(t.toLowerCase()));
    if (!name) throw new Error(`No match for "${t}". Available: ${this.files.join(", ")}`);
    return name;
  }
  async generate({
    type
  } = {}) {
    if (type == null || type === "") throw new Error(`Parameter 'type' required. Available: ${this.files.join(", ")}`);
    const name = this.resolve(type);
    try {
      const {
        data,
        headers
      } = await this.client.get(`${this.base}/${name}.mp3`);
      return {
        buffer: Buffer.from(data),
        contentType: headers["content-type"] || "audio/mpeg",
        name: name
      };
    } catch (e) {
      const status = e.response?.status;
      throw new Error(status ? `Fetch "${name}" failed (HTTP ${status}).` : `Fetch "${name}" failed: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new SoundAPI();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${result.name}.mp3"`);
    return res.status(200).send(result.buffer);
  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}