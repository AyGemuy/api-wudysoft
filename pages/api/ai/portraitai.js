import axios from "axios";
import FormData from "form-data";
import https from "https";
class PortraitAI {
  constructor() {
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
    this.cfg = {
      baseUrl: "http://portraitplus.facefun.ai:8080",
      imageUrl: "http://images.portraitai.app",
      filters: [{
        id: "1999900000",
        name: "Random",
        type: "diffus"
      }, {
        id: "1999800000",
        name: "Random",
        type: "diffus"
      }, {
        id: "29999",
        name: "Random 60 sec",
        type: "diffus"
      }, {
        id: "29998",
        name: "Random 60 sec",
        type: "diffus"
      }, {
        id: "29997",
        name: "Random 60 sec",
        type: "diffus"
      }, {
        id: "1999700000",
        name: "Random",
        type: "diffus"
      }, {
        id: "1999600000",
        name: "Random",
        type: "diffus"
      }, {
        id: "1999500000",
        name: "Random",
        type: "diffus"
      }, {
        id: "1999400000",
        name: "Random",
        type: "diffus"
      }, {
        id: "1999300000",
        name: "Random",
        type: "diffus",
        locked: true
      }, {
        id: "0",
        name: "Portrait",
        type: "port"
      }, {
        id: "1",
        name: "Portrait+",
        type: "port",
        locked: true
      }, {
        id: "5",
        name: "Random",
        type: "diffus"
      }, {
        id: "6",
        name: "Random",
        type: "port"
      }, {
        id: "7",
        name: "Random",
        type: "diffus"
      }, {
        id: "8",
        name: "Random",
        type: "diffus"
      }, {
        id: "9",
        name: "Random",
        type: "diffus"
      }]
    };
  }
  async generate({
    image,
    filter = 0,
    number = 1,
    ...rest
  }) {
    const filterId = this.getFilter(filter);
    const imgBuffer = await this.solveImage(image);
    console.log("[PortraitAI] Starting generation:", {
      filter: filter,
      filterId: filterId,
      number: number,
      imageSize: imgBuffer.length
    });
    try {
      const form = new FormData();
      const defaultForm = {
        wm: "",
        collage: "",
        id: "",
        no_crop: "",
        code: "",
        type: filterId,
        number: String(number),
        isPriority: "false",
        ...rest
      };
      Object.entries(defaultForm).forEach(([key, value]) => {
        form.append(key, value);
      });
      form.append("image", imgBuffer, {
        filename: "file.jpg",
        contentType: "image/jpeg"
      });
      const {
        data
      } = await axios({
        method: "POST",
        url: `${this.cfg.baseUrl}/Port/MakePortBulk`,
        data: form,
        httpsAgent: this.httpsAgent,
        headers: {
          "User-Agent": "okhttp/4.12.0",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          ...form.getHeaders()
        }
      });
      console.log("[PortraitAI] Response:", data);
      if (typeof data === "string" && data.includes("error")) {
        throw new Error(data);
      }
      return this.parseResult(data);
    } catch (err) {
      console.error("[PortraitAI] Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  getFilter(input) {
    if (typeof input === "number") {
      const f = this.cfg.filters[input];
      return f?.id || this.cfg.filters[0].id;
    }
    const byId = this.cfg.filters.find(f => f.id === String(input));
    if (byId) return byId.id;
    const byName = this.cfg.filters.find(f => f.name.toLowerCase() === String(input).toLowerCase());
    return byName ? byName.id : this.cfg.filters[0].id;
  }
  async solveImage(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          const {
            data
          } = await axios.get(img, {
            responseType: "arraybuffer",
            httpsAgent: this.httpsAgent
          });
          return Buffer.from(data);
        }
        if (img.startsWith("data:")) {
          const base64 = img.split(",")[1] || img;
          return Buffer.from(base64, "base64");
        }
        return Buffer.from(img, "base64");
      }
      throw new Error("Invalid image format");
    } catch (err) {
      throw new Error(`Image solve error: ${err.message}`);
    }
  }
  parseResult(data) {
    const files = data?.files || [];
    const styles = data?.styles || [];
    const result = files.map((file, idx) => ({
      url: `${this.cfg.imageUrl}/${file}`,
      style: styles[idx] || "",
      crop: file ? `${this.cfg.imageUrl}/${file.split("-")[0]}_crop.jpg` : ""
    }));
    return {
      result: result,
      total: files.length,
      ...data
    };
  }
  destroy() {
    this.httpsAgent?.destroy();
    console.log("[PortraitAI] Agent destroyed");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new PortraitAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}