import axios from "axios";
import FormData from "form-data";
class ParadigmAI {
  constructor() {
    this.baseUrl = "https://ai-services.visual-paradigm.com/api";
    this.modes = ["super-resolution", "denoise", "deoldify", "photo-repair", "deblur"];
  }
  _meta(buf) {
    if (!buf || buf.length < 4) return {
      ext: "jpg",
      mime: "image/jpeg"
    };
    const hex = buf.toString("hex", 0, 4).toUpperCase();
    if (hex.startsWith("89504E47")) return {
      ext: "png",
      mime: "image/png"
    };
    if (hex.startsWith("FFD8FF")) return {
      ext: "jpg",
      mime: "image/jpeg"
    };
    if (hex.startsWith("47494638")) return {
      ext: "gif",
      mime: "image/gif"
    };
    return {
      ext: "jpg",
      mime: "image/jpeg"
    };
  }
  async _img(input) {
    try {
      console.log("[Process] Auto-resolving image structure...");
      let buffer = Buffer.isBuffer(input) ? input : typeof input === "string" ? input.startsWith("http") ? Buffer.from((await axios.get(input, {
        responseType: "arraybuffer"
      })).data) : Buffer.from(input.includes("base64,") ? input.split("base64,")[1] : input, "base64") : null;
      if (!buffer) return null;
      const meta = this._meta(buffer);
      const filename = `vpai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${meta.ext}`;
      return {
        buffer: buffer,
        filename: filename,
        mime: meta.mime
      };
    } catch (e) {
      console.error("[Error] Parse image failed:", e.message);
      return null;
    }
  }
  async generate({
    mode = "super-resolution",
    image,
    ...rest
  }) {
    try {
      console.log(`[Process] Run mode: ${mode || "unspecified"}`);
      if (!this.modes.includes(mode)) {
        return {
          status: 400,
          message: `Mode tidak valid. Pilihan: ${this.modes.join(", ")}`
        };
      }
      if (!image) {
        return {
          status: 400,
          message: 'Input "image" wajib diisi'
        };
      }
      const imgData = await this._img(image);
      if (!imgData) return {
        status: 400,
        message: "Format image gagal diproses"
      };
      const form = new FormData();
      form.append("file", imgData.buffer, {
        filename: imgData.filename,
        contentType: imgData.mime
      });
      switch (mode) {
        case "photo-repair":
          form.append("with_scratch", String(rest?.with_scratch || rest?.withScratch || "true"));
          form.append("hr", String(rest?.hr || "true"));
          break;
        case "super-resolution":
        case "denoise":
        case "deoldify":
        case "deblur":
        default:
          break;
      }
      console.log(`[Process] Sending request to ${mode}...`);
      const response = await axios.post(`${this.baseUrl}/${mode}/file`, form, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": `multipart/form-data; boundary=${form.getBoundary()}`,
          origin: "https://online.visual-paradigm.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://online.visual-paradigm.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        responseType: "arraybuffer"
      });
      console.log("[Process] Success compiling result...");
      return {
        status: response?.status || 200,
        buffer: Buffer.from(response?.data),
        contentType: response?.headers?.["content-type"] || "image/jpeg"
      };
    } catch (error) {
      const errMsg = error?.response?.data ? Buffer.from(error.response.data).toString() : error?.message;
      console.error("[Error] Critical break:", errMsg);
      return {
        status: error?.response?.status || 500,
        message: errMsg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new ParadigmAI();
  try {
    const data = await api.generate(params);
    if (data?.status >= 400) {
      return res.status(data.status).json({
        error: data.message || "Gagal memproses request dari AI Client"
      });
    }
    res.setHeader("Content-Type", data?.contentType || "image/jpeg");
    return res.status(200).send(data.buffer);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan saat memproses request"
    });
  }
}