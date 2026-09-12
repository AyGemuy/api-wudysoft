import axios from "axios";
import ApiKey from "@/configs/api-key";
class TgBotDL {
  constructor() {
    this.token = null;
    this.ax = null;
    this.base = "https://api.telegram.org";
    this.keys = ApiKey.telegram;
  }
  async key() {
    console.log("[key] mencari key valid...");
    for (const k of this.keys) {
      try {
        console.log("[key] mencoba:", k.split(":")[0]);
        const {
          data
        } = await axios.get(`${this.base}/bot${k}/getMe`, {
          timeout: 5e3
        });
        if (data?.ok) {
          console.log("[key] valid:", k.split(":")[0]);
          return k;
        }
        console.log("[key] respon tidak ok:", k.split(":")[0]);
      } catch (err) {
        console.error("[key] error:", k.split(":")[0], "|", err?.message);
      }
    }
    throw new Error("Tidak ada key yang valid.");
  }
  async init() {
    if (this.ax) return;
    try {
      console.log("[init] memulai inisialisasi...");
      this.token = await this.key();
      this.ax = axios.create({
        baseURL: `${this.base}/bot${this.token}`,
        timeout: 3e4,
        validateStatus: s => s < 500
      });
      console.log("[init] selesai, token:", this.token.split(":")[0]);
    } catch (err) {
      console.error("[init] error:", err?.message);
      throw err;
    }
  }
  parse(query) {
    try {
      console.log("[parse] input:", query);
      const match = query.match(/(?:t\.me\/addstickers\/|t\.me\/addemoji\/)([^\s/?]+)/) || query.match(/(?:tg:\/\/addstickers\?set=|tg:\/\/addemoji\?set=)([^\s&]+)/);
      const name = match ? match[1] : query;
      console.log("[parse] hasil:", name);
      return name;
    } catch (err) {
      console.error("[parse] error:", err?.message);
      throw err;
    }
  }
  async set(name) {
    try {
      console.log("[set] mengambil sticker set:", name);
      const {
        data
      } = await this.ax.get("/getStickerSet", {
        params: {
          name: name
        }
      });
      const stickers = data?.result?.stickers || [];
      console.log("[set] total sticker:", stickers.length);
      return stickers;
    } catch (err) {
      console.error("[set] error:", err?.response?.data || err?.message);
      return [];
    }
  }
  async url(file_id) {
    try {
      console.log("[url] mengambil file:", file_id);
      const {
        data
      } = await this.ax.get("/getFile", {
        params: {
          file_id: file_id
        }
      });
      const path = data?.result?.file_path;
      const result = path ? `${this.base}/file/bot${this.token}/${path}` : null;
      console.log("[url] hasil:", result);
      return result;
    } catch (err) {
      console.error("[url] error:", err?.response?.data || err?.message);
      return null;
    }
  }
  slice(stickers, {
    index,
    limit,
    all
  }) {
    try {
      console.log("[slice] all:", all, "| index:", index, "| limit:", limit);
      const total = stickers.length;
      if (all === true || all === "true") {
        console.log("[slice] mode: all →", total, "sticker");
        return stickers;
      }
      if (index != null) {
        const idx = String(index).split(",").map(i => parseInt(i.trim(), 10) - 1).filter(i => i >= 0 && i < total);
        if (!idx.length) throw new Error("Index stiker tidak valid.");
        console.log("[slice] mode: index →", idx.length, "sticker");
        return idx.map(i => stickers[i]);
      }
      if (limit != null) {
        const n = parseInt(limit, 10);
        if (isNaN(n) || n < 1) throw new Error("Limit tidak valid.");
        const count = Math.min(n, total);
        console.log("[slice] mode: limit →", count, "sticker");
        return stickers.slice(0, count);
      }
      throw new Error("Parameter 'all', 'index', atau 'limit' diperlukan.");
    } catch (err) {
      console.error("[slice] error:", err?.message);
      throw err;
    }
  }
  async download({
    query,
    all,
    index,
    limit = 5
  }) {
    try {
      console.log("[download] mulai | query:", query, "| all:", all, "| index:", index, "| limit:", limit);
      if (!query) throw new Error("Parameter 'query' diperlukan.");
      await this.init();
      const stickers = await this.set(this.parse(query));
      if (!stickers.length) throw new Error("Sticker set tidak ditemukan.");
      const selected = this.slice(stickers, {
        index: index,
        limit: limit,
        all: all
      });
      console.log("[download] mengambil url untuk", selected.length, "sticker...");
      const result = [];
      for (const s of selected) {
        const file_url = await this.url(s.file_id);
        result.push({
          ...s,
          file_url: file_url
        });
      }
      const res = {
        total: stickers.length,
        count: result.length,
        result: result
      };
      console.log("[download] selesai | total:", res.total, "| count:", res.count);
      return res;
    } catch (err) {
      console.error("[download] error:", err?.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new TgBotDL();
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