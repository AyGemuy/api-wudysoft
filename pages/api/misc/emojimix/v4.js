import axios from "axios";
class EmojiKitchen {
  constructor() {
    this.api = "https://www.gstatic.com/android/keyboard/emojikitchen";
  }
  _h(str) {
    try {
      if (!str) return null;
      if (/^u?[0-9a-f]+$/i.test(str) && str.length > 2) {
        const hex = str.toLowerCase().startsWith("u") ? str.toLowerCase() : `u${str.toLowerCase()}`;
        console.log(`[Hex] Direct code: ${hex}`);
        return hex;
      }
      const pts = [];
      for (const char of str) {
        const cp = char.codePointAt(0);
        if (cp !== 65039) pts.push(`u${cp.toString(16)}`);
      }
      const hex = pts.join("-");
      console.log(`[Hex] '${str}' -> '${hex}'`);
      return hex;
    } catch (e) {
      console.error("[Hex Error]", e.message);
      return null;
    }
  }
  _p(inp) {
    try {
      console.log("[Parse] Input:", inp);
      if (!inp) {
        const msg = "Parameter emoji wajib diisi";
        console.error(`[Parse Error] ${msg}`);
        return {
          ok: false,
          message: msg
        };
      }
      let list = [];
      if (Array.isArray(inp)) {
        list = inp.filter(Boolean);
      } else if (typeof inp === "string") {
        const str = inp.trim();
        if (/[\s,/_-]/.test(str)) {
          list = str.split(/[\s,/_-]+/).filter(Boolean);
        } else if (typeof Intl !== "undefined" && Intl.Segmenter) {
          const seg = new Intl.Segmenter("en", {
            granularity: "grapheme"
          });
          list = Array.from(seg.segment(str), s => s.segment);
        } else {
          list = [...str];
        }
      }
      if (!list || list.length !== 2) {
        const msg = `Input harus berisi tepat 2 emoji (ditemukan: ${list ? list.length : 0})`;
        console.error(`[Parse Error] ${msg}`);
        return {
          ok: false,
          message: msg
        };
      }
      const l = this._h(list[0]);
      const r = this._h(list[1]);
      if (!l || !r) {
        const msg = "Gagal konversi hex emoji";
        console.error(`[Parse Error] ${msg}`);
        return {
          ok: false,
          message: msg
        };
      }
      console.log(`[Parse] Left: ${l} | Right: ${r}`);
      return {
        ok: true,
        l: l,
        r: r
      };
    } catch (e) {
      console.error("[Parse Error]", e.message);
      return {
        ok: false,
        message: e.message
      };
    }
  }
  async gen(opts = {}) {
    try {
      console.log("[Gen] Memulai proses...");
      const {
        emoji,
        folder = "20201001"
      } = opts || {};
      const parsed = this._p(emoji);
      if (!parsed.ok) {
        return {
          status: 400,
          buffer: Buffer.from(JSON.stringify({
            status: false,
            error: parsed.message
          })),
          contentType: "application/json"
        };
      }
      const {
        l,
        r
      } = parsed;
      const url = `${this.api}/${folder}/${l}/${l}_${r}.png`;
      console.log(`[Gen] URL: ${url}`);
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip"
        }
      });
      console.log(`[Gen] Berhasil | Status: ${res.status}`);
      return {
        status: res.status,
        buffer: Buffer.from(res.data),
        contentType: res.headers["content-type"] || "image/png"
      };
    } catch (e) {
      console.error(`[Gen Error] ${e.message}`);
      if (e.response) {
        console.log(`[Gen Response Error] Status: ${e.response.status}`);
        return {
          status: e.response.status,
          buffer: Buffer.from(JSON.stringify({
            status: false,
            error: "Emoji combination not found"
          })),
          contentType: "application/json"
        };
      }
      return {
        status: 500,
        buffer: Buffer.from(JSON.stringify({
          status: false,
          error: e.message
        })),
        contentType: "application/json"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.emoji) {
    return res.status(400).json({
      error: "Parameter 'emoji' diperlukan"
    });
  }
  const api = new EmojiKitchen();
  try {
    const data = await api.gen(params);
    res.setHeader("Content-Type", data.contentType);
    return res.status(data.status).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}