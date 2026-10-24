import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
class NyckelChecker {
  constructor() {
    this.base = "https://www.nyckel.com";
    this.invokeEndpoint = "/v1/functions";
    this.identifierPath = "/pretrained-classifiers/nsfw-identifier";
    this.headers = {
      authority: "www.nyckel.com",
      origin: "https://www.nyckel.com",
      referer: "https://www.nyckel.com/pretrained-classifiers/nsfw-identifier/",
      "user-agent": "Postify/1.0.0",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async validateImage(url) {
    if (!url || !url.startsWith("http")) {
      return {
        valid: false,
        error: "URL gambar tidak valid atau format URL salah."
      };
    }
    try {
      const head = await axios.head(url);
      const contentType = head.headers["content-type"];
      if (!contentType || !contentType.startsWith("image/")) {
        return {
          valid: false,
          error: "URL yang diberikan bukan merupakan file gambar."
        };
      }
      return {
        valid: true,
        contentType: contentType
      };
    } catch {
      return {
        valid: false,
        error: "Gagal mengakses URL gambar."
      };
    }
  }
  async getFunctionId() {
    try {
      const res = await axios.get(this.base + this.identifierPath, {
        headers: this.headers
      });
      const $ = cheerio.load(res.data);
      const script = $('script[src*="embed-image.js"]').attr("src");
      const fid = script?.match(/[?&]id=([^&]+)/)?.[1];
      if (!fid) throw new Error("Function ID tidak ditemukan.");
      return {
        success: true,
        id: fid
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async checkImage({
    image
  }) {
    const validation = await this.validateImage(image);
    if (!validation.valid) {
      return {
        success: false,
        code: 400,
        result: {
          error: validation.error
        }
      };
    }
    const functionData = await this.getFunctionId();
    if (!functionData.success) {
      return {
        success: false,
        code: 400,
        result: {
          error: functionData.error
        }
      };
    }
    try {
      const imageRes = await axios.get(image, {
        responseType: "arraybuffer",
        headers: this.headers
      });
      const form = new FormData();
      const ext = validation.contentType.split("/")[1] || "jpeg";
      form.append("file", Buffer.from(imageRes.data), {
        filename: `image.${ext}`,
        contentType: validation.contentType
      });
      const invokeUrl = `${this.base}${this.invokeEndpoint}/${functionData.id}/invoke`;
      const response = await axios.post(invokeUrl, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      let {
        labelName,
        labelId,
        confidence
      } = response.data;
      if (confidence > .97) {
        const cap = Math.random() * (.992 - .97) + .97;
        confidence = Math.min(confidence, cap);
      }
      const isNsfw = labelName.toLowerCase().includes("nsfw");
      return {
        success: true,
        code: 200,
        result: {
          isNsfw: isNsfw,
          labelName: labelName,
          labelId: labelId,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          message: isNsfw ? "Gambar terdeteksi mengandung konten NSFW." : "Gambar tidak terdeteksi mengandung konten NSFW."
        }
      };
    } catch (err) {
      return {
        success: false,
        code: 400,
        result: {
          error: err.response?.data?.message || err.message
        }
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
  const api = new NyckelChecker();
  try {
    const data = await api.checkImage(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}