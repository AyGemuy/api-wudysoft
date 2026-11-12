import axios from "axios";
import crypto from "crypto";
class InstaShadow {
  constructor() {
    this.user_agent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.salt_text = "Yes, absolutely! Our website is fully responsive and optimized for all devices.";
    this.ts_delta = 7124;
    this.base_url = "https://instashadow.com/api";
    this.media_base = "https://instashadow.com";
    this.keyMap = {
      iu: "image_url",
      vu: "video_url",
      hu: "thumbnail_url",
      vhu: "video_thumbnail_url",
      lc: "like_count",
      cc: "comment_count",
      pd: "publish_date",
      c: "caption",
      id: "media_id",
      co: "shortcode",
      om: "other_media",
      fn: "full_name",
      pp: "profile_pic",
      hpp: "hd_profile_pic",
      frc: "follower_count",
      fgc: "following_count",
      mc: "media_count",
      b: "biography"
    };
  }
  _decId(enc) {
    try {
      const target = enc ?? "";
      if (!target) return "";
      const dec = decodeURIComponent(target);
      return dec.split("").reverse().join("");
    } catch (e) {
      return enc ?? "";
    }
  }
  _getMed(id) {
    return id ? `${this.media_base}/media?id=${encodeURIComponent(id)}` : "";
  }
  _cleanObject(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(item => this._cleanObject(item));
    const cleanItem = {};
    Object.keys(obj).forEach(key => {
      const newKey = this.keyMap[key] || key;
      let val = obj[key];
      if (["iu", "vu", "hu", "vhu", "pp", "hpp"].includes(key) && typeof val === "string") {
        const decryptedId = this._decId(val);
        cleanItem[newKey] = this._getMed(decryptedId) || null;
      } else if (typeof val === "object" && val !== null) {
        cleanItem[newKey] = this._cleanObject(val);
      } else {
        cleanItem[newKey] = val ?? null;
      }
    });
    return cleanItem;
  }
  _proc(res) {
    try {
      console.log("[*] [Proses]: Melakukan auto-decrypt dan restrukturisasi data...");
      const data = res ?? {};
      const targetKey = ["r", "p", "s", "u"].find(k => k in data);
      if (!targetKey) return data;
      if (targetKey === "u" && !Array.isArray(data[targetKey])) {
        return {
          profile: this._cleanObject(data.u)
        };
      }
      const formattedList = this._cleanObject(data[targetKey]);
      if (targetKey === "s" && data.u) {
        return {
          profile: this._cleanObject(data.u),
          stories: formattedList
        };
      }
      return formattedList;
    } catch (e) {
      console.error("[-] [Error _proc]: Gagal merestrukturisasi objek:", e.message);
      return [];
    }
  }
  _parse(url) {
    try {
      const str = url ?? "";
      if (/instagram\.com\/reel\//.test(str)) {
        return {
          ep: "reels",
          pl: {
            _ei: str
          }
        };
      }
      if (/instagram\.com\/p\//.test(str)) {
        return {
          ep: "posts",
          pl: {
            _u: str
          }
        };
      }
      const storyMatch = str.match(/instagram\.com\/stories\/([^/]+)/);
      if (storyMatch) {
        return {
          ep: "stories",
          pl: {
            _u: storyMatch[1]
          }
        };
      }
      const userMatch = str.match(/instagram\.com\/([^/?]+)/);
      if (userMatch) {
        return {
          ep: "posts",
          pl: {
            _u: userMatch[1]
          }
        };
      }
      return {
        ep: "posts",
        pl: {
          _u: str
        }
      };
    } catch (e) {
      console.error("[-] [Error _parse]: Gagal menganalisis URL:", e.message);
      return {
        ep: "posts",
        pl: {
          _u: url ?? ""
        }
      };
    }
  }
  async _sign(pl, t) {
    try {
      console.log("[*] [Proses]: Membuat token signature keamanan...");
      const loadedAt = t ?? Date.now() - this.ts_delta;
      const U = JSON.stringify(pl || {}) + this.user_agent;
      const p = this.salt_text + loadedAt;
      const xored = U.split("").map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ p.charCodeAt(i % p.length))).join("");
      const enc = new TextEncoder().encode(xored);
      const hashBuf = await crypto.webcrypto.subtle.digest("SHA-256", enc);
      const bytes = Array.from(new Uint8Array(hashBuf));
      const b64 = btoa(String.fromCharCode(...bytes));
      const _s = b64.replace(/\+/g, "*").replace(/\//g, "~").replace(/=/g, "!");
      return {
        ...pl || {},
        _s: _s,
        _s1: loadedAt + this.ts_delta
      };
    } catch (e) {
      console.error("[-] [Error _sign]: Pembuatan signature gagal:", e.message);
      return {
        ...pl || {},
        _s: "",
        _s1: Date.now()
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`\n=================== MULAI PROSES ===================`);
      console.log(`[*] Target URL : ${url || "Kosong"}`);
      const {
        ep,
        pl
      } = this._parse(url);
      const targetPayload = {
        ...pl,
        ...rest
      };
      const signedBody = await this._sign(targetPayload);
      console.log(`[*] Endpoint   : ${this.base_url}/${ep}`);
      console.log(`[*] Sending request via Axios...`);
      const response = await axios.post(`${this.base_url}/${ep}`, signedBody, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://instashadow.com",
          referer: "https://instashadow.com/en",
          "user-agent": this.user_agent
        },
        timeout: 6e4
      });
      console.log(`[+] HTTP Status: ${response?.status ?? "No Status"}`);
      const formattedResult = this._proc(response?.data);
      console.log(`[+] Proses selesai dengan sukses!`);
      console.log(`====================================================\n`);
      return {
        status: response?.status === 200,
        result: formattedResult
      };
    } catch (e) {
      console.error(`\n[-] ERROR SEWAKTU DOWNLOAD:`, e.message);
      console.log(`====================================================\n`);
      return {
        status: false,
        result: []
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
  const api = new InstaShadow();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}