import axios from "axios";
class CodeBeautify {
  constructor(baseURL) {
    this.base = baseURL ? baseURL : "https://codebeautify.org";
    this.headers = {
      "content-type": "application/x-www-form-urlencoded",
      origin: this.base,
      referer: `${this.base}/random-anime-character-generator`,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
    this.types = ["anime-character", "cartoon-character", "disney-character", "cookie-run-character", "league-champion", "pokemon", "pokemon-team", "pokemon-type", "superhero", "marvel", "dc", "star-war", "harrypotter", "jojo-stand", "nba-player", "dog-breed", "cat", "bird", "dinosaur", "monster", "car", "flower", "candy", "food", "tarot-card", "emoji", "minecraft-block", "devil-fruit", "animal-fusion", "dragonborn", "tiefling", "wizard", "cultist", "saiyan-name", "dnd-name", "dwarf-name", "vampire-name", "victorian-name", "fantasy-name", "god-name", "villager-name", "twitch-name", "aesthetic-username", "reddit-username", "username", "firstname", "lastname", "girl-name", "japanese-name", "kingdom-name", "school-name", "magic-school", "job", "college", "holiday", "planet", "element", "country", "state-us", "us-city", "address", "california-address", "spain-address", "nyc-address", "texas", "indiana-address", "canada", "newzealand", "phone-number", "zip-code", "personality", "emotion", "sims-3-trait", "fursona", "superpower", "body-part", "movie", "disney-movie", "videogame", "song", "book", "book-title", "quote", "proverb", "truth-or-dare", "trivia", "fortune-cookie", "color", "sports", "restaurant"];
  }
  chk(type) {
    return this.types.includes(type);
  }
  rnd(arr) {
    return Array.isArray(arr) && arr.length ? arr[Math.random() * arr.length | 0] : null;
  }
  uri(path) {
    return path?.startsWith("http") ? path : `${this.base}${path || ""}`;
  }
  async generate({
    type,
    all,
    index,
    ...rest
  } = {}) {
    const isAll = all === true || all === "true" ? true : false;
    const targetType = type ? type : "anime-character";
    try {
      console.log(`[LOG] Memvalidasi parameter tipe: '${targetType}'...`);
      if (!this.chk(targetType)) {
        console.log(`[LOG ERROR] Tipe '${targetType}' tidak valid!`);
        return {
          status: false,
          error: `Tipe '${targetType}' tidak tersedia.`,
          available: this.types
        };
      }
      console.log(`[LOG] Mengambil data '${targetType}' dari server...`);
      const res = await axios.post(`${this.base}/randomData`, `type=${encodeURIComponent(targetType)}`, {
        headers: this.headers,
        params: rest || {}
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      console.log(`[LOG] Data diterima, total: ${list.length} entri.`);
      if (!list.length) {
        throw new Error("Data tidak ditemukan atau respon kosong.");
      }
      const items = list.map(item => ({
        name: typeof item === "string" ? item : item?.name || "Unknown",
        image: item?.image ? this.uri(item.image) : null
      }));
      if (isAll) {
        console.log("[LOG] Mode list aktif (all: true), mengembalikan JSON.");
        return {
          status: true,
          result: items
        };
      }
      const chosen = typeof index === "number" && items[index] ? items[index] : this.rnd(items);
      if (!chosen?.image) {
        console.log(`[LOG] Kategori '${targetType}' hanya teks (tanpa gambar): ${chosen?.name}`);
        return {
          status: true,
          result: chosen
        };
      }
      console.log(`[LOG] Mengunduh gambar untuk: ${chosen?.name}`);
      const imgRes = await axios.get(chosen.image, {
        responseType: "arraybuffer",
        headers: {
          "user-agent": this.headers["user-agent"]
        }
      });
      console.log("[LOG] Gambar binary berhasil diunduh.");
      return {
        status: imgRes?.status === 200 ? true : false,
        buffer: imgRes?.data ? Buffer.from(imgRes.data) : null,
        contentType: imgRes?.headers?.["content-type"] || "image/jpeg"
      };
    } catch (err) {
      console.log(`[LOG ERROR] ${err?.message || "Gagal memproses request"}`);
      return {
        status: false,
        error: err?.response?.data || err?.message || "Request failed"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new CodeBeautify();
  try {
    const data = await api.generate(params);
    if (!data?.status) {
      return res.status(400).json(data);
    }
    if (data?.buffer) {
      res.setHeader("Content-Type", data?.contentType || "image/jpeg");
      return res.status(200).send(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}