import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class PhotoAI {
  constructor() {
    this.url = "https://www.photiu.ai";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.modes = ["upscale", "removebg", "txt2img"];
  }
  h(ref) {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: this.url,
      referer: `${this.url}${ref}`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.ua
    };
  }
  async buf(input) {
    try {
      if (Buffer.isBuffer(input)) return {
        success: true,
        buffer: input
      };
      if (input?.startsWith?.("data:")) {
        const b64 = input.split(",")[1];
        return {
          success: true,
          buffer: Buffer.from(b64, "base64")
        };
      }
      if (input?.startsWith?.("http")) {
        console.log("🔄 Fetching image...");
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return {
          success: true,
          buffer: Buffer.from(data)
        };
      }
      return {
        success: true,
        buffer: Buffer.from(input, "base64")
      };
    } catch (e) {
      return {
        success: false,
        error: `Image process failed: ${e.message}`
      };
    }
  }
  list() {
    return {
      success: true,
      modes: this.modes,
      details: {
        upscale: {
          required: ["image"],
          optional: ["factor"]
        },
        removebg: {
          required: ["image"],
          optional: []
        },
        txt2img: {
          required: ["prompt"],
          optional: ["style", "aspectRatio", "imageCount", "negativePrompt"]
        }
      }
    };
  }
  async generate({
    mode,
    prompt,
    image,
    factor = 2,
    style = "anime",
    aspectRatio = "1:1",
    imageCount = 1,
    negativePrompt = "",
    ...rest
  }) {
    try {
      const cfg = {
        upscale: {
          ep: "/api/upscale",
          ref: "/image-upscaler",
          req: ["image"],
          fields: {
            factor: factor
          }
        },
        removebg: {
          ep: "/api/rmb",
          ref: "/background-remover",
          req: ["image"],
          fields: {}
        },
        txt2img: {
          ep: "/api/txt2img",
          ref: "/image-generator",
          req: ["prompt"],
          fields: {
            style: style,
            aspectRatio: aspectRatio,
            imageCount: imageCount,
            prompt: prompt,
            negativePrompt: negativePrompt
          }
        }
      } [mode];
      if (!cfg) return {
        success: false,
        error: `Invalid mode: ${mode}`,
        available: this.modes
      };
      console.log(`🚀 Mode: ${mode}`);
      const params = {
        image: image,
        prompt: prompt
      };
      for (const r of cfg.req) {
        if (!params[r]) {
          return {
            success: false,
            error: `Missing required: ${r}`,
            required: cfg.req
          };
        }
      }
      const fd = new FormData();
      if (image) {
        console.log("📸 Processing image...");
        const bufRes = await this.buf(image);
        if (!bufRes.success) return bufRes;
        fd.append("upfile", bufRes.buffer, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      }
      Object.entries(cfg.fields).forEach(([k, v]) => fd.append(k, v));
      console.log(`📤 Sending to ${cfg.ep}...`);
      const {
        data,
        headers
      } = await this.client.post(`${this.url}${cfg.ep}`, fd, {
        headers: {
          ...this.h(cfg.ref),
          ...fd.getHeaders()
        },
        responseType: mode === "txt2img" ? "json" : "arraybuffer"
      });
      if (mode === "txt2img") {
        console.log("🔄 Getting result...");
        const imgid = data?.data?.[0];
        if (!imgid) return {
          success: false,
          error: "No image ID received"
        };
        const fd2 = new FormData();
        fd2.append("imgid", imgid);
        const res = await this.client.post(`${this.url}/api/imgresult`, fd2, {
          headers: {
            ...this.h(cfg.ref),
            ...fd2.getHeaders()
          },
          responseType: "arraybuffer"
        });
        console.log("✅ Done!");
        return {
          success: true,
          buffer: Buffer.from(res.data),
          contentType: res.headers["content-type"] || "image/png"
        };
      }
      console.log("✅ Done!");
      return {
        success: true,
        buffer: Buffer.from(data),
        contentType: headers["content-type"] || "image/png"
      };
    } catch (e) {
      console.error(`❌ Error: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new PhotoAI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}