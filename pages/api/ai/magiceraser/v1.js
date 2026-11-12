import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class MagicEraser {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.cfg = {
      filters: ["anime", "misc_kawaii", "misc_manga", "photo_film_noir", "comic", "digital_art", "fantasy_art", "line_art", "texture", "neonpunk", "abstract_expressionism", "art_nouveau", "graffiti", "pop_art", "typographic", "watercolor", "futuristic_cybernetic_robot", "futuristic_cyberpunk_cityscape", "futuristic_futuristic", "misc_techwear_fashion", "retro_cyberpunk", "vaporwave", "game_bubble_bobble", "fighting_game", "game_gta", "retro_game", "rpg_fantasy_game", "street_fighter", "game_zelda", "misc_dystopian", "misc_grunge", "photo_neon_noir", "long_exposure", "pixel", "sticker"],
      sizes: ["x2", "x4"],
      modes: ["filter", "upscale", "expand"],
      headers: {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 12; SM-A217M Build/V417IR)",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      }
    };
  }
  id() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  validate(mode, style, size) {
    if (!mode) {
      return {
        status: false,
        error: "mode required",
        available: {
          modes: this.cfg.modes
        }
      };
    }
    if (!this.cfg.modes.includes(mode)) {
      return {
        status: false,
        error: "Invalid mode",
        input: mode,
        available: {
          modes: this.cfg.modes
        }
      };
    }
    if (mode === "filter") {
      if (!style) {
        return {
          status: false,
          error: "style required for filter mode",
          available: {
            filters: this.cfg.filters
          }
        };
      }
      if (!this.cfg.filters.includes(style)) {
        return {
          status: false,
          error: "Invalid style",
          input: style,
          available: {
            filters: this.cfg.filters
          }
        };
      }
    }
    if (mode === "upscale" && size && !this.cfg.sizes.includes(size)) {
      return {
        status: false,
        error: "Invalid size",
        input: size,
        available: {
          sizes: this.cfg.sizes
        }
      };
    }
    return {
      status: true
    };
  }
  async toBuf(img) {
    try {
      console.log("[toBuf] Converting...");
      if (Buffer.isBuffer(img)) return {
        status: true,
        buffer: img
      };
      if (typeof img === "string") {
        if (img.startsWith("data:")) {
          console.log("[toBuf] Base64");
          return {
            status: true,
            buffer: Buffer.from(img.split(",")[1] || img, "base64")
          };
        }
        if (img.startsWith("http")) {
          console.log("[toBuf] URL");
          const {
            data
          } = await this.client.get(img, {
            responseType: "arraybuffer"
          });
          return {
            status: true,
            buffer: Buffer.from(data)
          };
        }
        return {
          status: true,
          buffer: Buffer.from(img, "base64")
        };
      }
      return {
        status: false,
        error: "Invalid image format",
        supported: ["url", "base64", "buffer"]
      };
    } catch (e) {
      console.error("[toBuf]", e?.message);
      return {
        status: false,
        error: "Convert failed",
        detail: e?.message
      };
    }
  }
  getSize(buf) {
    try {
      if (buf[0] === 255 && buf[1] === 216) {
        let i = 2;
        while (i < buf.length) {
          if (buf[i] !== 255) break;
          if (buf[i + 1] === 192 || buf[i + 1] === 194) {
            return {
              status: true,
              height: buf.readUInt16BE(i + 5),
              width: buf.readUInt16BE(i + 7)
            };
          }
          i += 2 + buf.readUInt16BE(i + 2);
        }
      }
      if (buf[0] === 137 && buf.toString("ascii", 1, 4) === "PNG") {
        return {
          status: true,
          width: buf.readUInt32BE(16),
          height: buf.readUInt32BE(20)
        };
      }
      return {
        status: false,
        error: "Unsupported format"
      };
    } catch (e) {
      console.error("[getSize]", e?.message);
      return {
        status: false,
        error: "Get size failed",
        detail: e?.message
      };
    }
  }
  prepData(buf, w, h) {
    try {
      const header = Buffer.alloc(4);
      header.writeUInt8(h >> 8 & 255, 0);
      header.writeUInt8(h & 255, 1);
      header.writeUInt8(w >> 8 & 255, 2);
      header.writeUInt8(w & 255, 3);
      return Buffer.concat([header, buf]);
    } catch (e) {
      console.error("[prepData]", e?.message);
      return null;
    }
  }
  async generate({
    mode,
    image,
    style = "anime",
    size = "x2",
    enhanceFace = true,
    enhanceColor = true,
    numImages = 4
  }) {
    try {
      if (!image) {
        return {
          status: false,
          error: "image required",
          supported: ["url", "base64", "buffer"]
        };
      }
      const val = this.validate(mode, style, size);
      if (!val.status) return val;
      console.log(`[generate] ${mode}`);
      const bufRes = await this.toBuf(image);
      if (!bufRes.status) return bufRes;
      const sid = this.id();
      const cookie = "";
      if (mode === "filter") {
        const sizeRes = this.getSize(bufRes.buffer);
        if (!sizeRes.status) return sizeRes;
        const data = this.prepData(bufRes.buffer, sizeRes.width, sizeRes.height);
        if (!data) return {
          status: false,
          error: "Prepare data failed"
        };
        const uploadRes = await this.upload(data, sid, cookie, "filter");
        if (!uploadRes.status) return uploadRes;
        return await this.filter(uploadRes.buffer, sid, cookie, style);
      }
      if (mode === "upscale") {
        const sizeRes = this.getSize(bufRes.buffer);
        if (!sizeRes.status) return sizeRes;
        const data = this.prepData(bufRes.buffer, sizeRes.width, sizeRes.height);
        if (!data) return {
          status: false,
          error: "Prepare data failed"
        };
        const uploadRes = await this.upload(data, sid, cookie, "enhance");
        if (!uploadRes.status) return uploadRes;
        return await this.upscale(uploadRes.buffer, sid, cookie, size, enhanceFace, enhanceColor);
      }
      if (mode === "expand") {
        return await this.expand(bufRes.buffer, sid, cookie, numImages);
      }
    } catch (e) {
      console.error("[generate]", e?.message);
      return {
        status: false,
        error: "Generate failed",
        detail: e?.message
      };
    }
  }
  async upload(data, sid, cookie, api) {
    try {
      console.log("[upload] Uploading...");
      const url = api === "filter" ? "https://apifilter.magiceraser.fyi/upload_v6" : "https://apienhance.magiceraser.live/upload_v6";
      const {
        data: res
      } = await this.client.post(url, data, {
        headers: {
          ...this.cfg.headers,
          "Session-ID": sid,
          Cookie: cookie
        },
        responseType: "arraybuffer"
      });
      console.log("[upload] OK");
      return {
        status: true,
        buffer: Buffer.from(res)
      };
    } catch (e) {
      console.error("[upload]", e?.message);
      return {
        status: false,
        error: "Upload failed",
        detail: e?.message
      };
    }
  }
  async filter(buf, sid, cookie, style) {
    try {
      console.log(`[filter] ${style}`);
      const {
        data,
        headers
      } = await this.client.post(`https://apifilter.magiceraser.fyi/filter_v6?style=${style}`, buf, {
        headers: {
          ...this.cfg.headers,
          "Session-ID": sid,
          Cookie: cookie
        },
        responseType: "arraybuffer"
      });
      console.log("[filter] OK");
      return {
        status: true,
        mode: "filter",
        params: {
          style: style
        },
        buffer: Buffer.from(data),
        contentType: headers?.["content-type"] || "image/jpeg",
        size: data?.length || 0
      };
    } catch (e) {
      console.error("[filter]", e?.message);
      return {
        status: false,
        mode: "filter",
        error: "Filter failed",
        detail: e?.message,
        params: {
          style: style
        }
      };
    }
  }
  async upscale(buf, sid, cookie, size, face, color) {
    try {
      console.log(`[upscale] ${size}`);
      const ep = size === "x4" ? "upscale_x4_v6" : "upscale_x2_v6";
      const {
        data,
        headers
      } = await this.client.post(`https://apienhance.magiceraser.live/${ep}?enhance_face=${face}&enhance_color=${color}`, buf, {
        headers: {
          ...this.cfg.headers,
          "Session-ID": sid,
          Cookie: cookie
        },
        responseType: "arraybuffer"
      });
      console.log("[upscale] OK");
      return {
        status: true,
        mode: "upscale",
        params: {
          size: size,
          enhanceFace: face,
          enhanceColor: color
        },
        buffer: Buffer.from(data),
        contentType: headers?.["content-type"] || "image/jpeg",
        size: data?.length || 0
      };
    } catch (e) {
      console.error("[upscale]", e?.message);
      return {
        status: false,
        mode: "upscale",
        error: "Upscale failed",
        detail: e?.message,
        params: {
          size: size,
          enhanceFace: face,
          enhanceColor: color
        }
      };
    }
  }
  async expand(buf, sid, cookie, num) {
    try {
      console.log(`[expand] ${num}`);
      const {
        data,
        headers
      } = await this.client.post(`https://apireplace.magiceraser.live/expand_v1?num_images=${num}`, buf, {
        headers: {
          "User-Agent": this.cfg.headers["User-Agent"],
          "Accept-Encoding": "gzip",
          "Content-Type": "application/octet-stream",
          "Session-ID": sid,
          Cookie: cookie
        },
        responseType: "arraybuffer"
      });
      console.log("[expand] OK");
      return {
        status: true,
        mode: "expand",
        params: {
          numImages: num
        },
        buffer: Buffer.from(data),
        contentType: headers?.["content-type"] || "image/jpeg",
        size: data?.length || 0
      };
    } catch (e) {
      console.error("[expand]", e?.message);
      return {
        status: false,
        mode: "expand",
        error: "Expand failed",
        detail: e?.message,
        params: {
          numImages: num
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MagicEraser();
  try {
    const data = await api.generate(params);
    if (data.status) {
      res.setHeader("Content-Type", data.contentType);
      return res.status(200).send(data.buffer);
    }
    return res.status(400).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}