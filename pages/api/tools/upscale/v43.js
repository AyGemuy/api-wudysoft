import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class PixelbinClient {
  constructor() {
    this.key = "A4nzUYcDOZ";
    this.host = "https://api.pixelbin.io";
    this.path = "/service/public/transformation/v1.0/predictions/sr/upscale";
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    this._allow = {
      scale: ["1X", "2X", "4X", "8X"],
      model: ["picasso", "flash"]
    };
  }
  _validate(fields = {}) {
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null || typeof value === "string" && value.trim() === "") {
        return {
          status: false,
          result: `Parameter '${key}' wajib diisi.`
        };
      }
      if (this._allow[key] && !this._allow[key].includes(String(value))) {
        return {
          status: false,
          result: `Nilai '${value}' untuk parameter '${key}' tidak valid. Pilihan yang tersedia: ${this._allow[key].join(", ")}`
        };
      }
    }
    return {
      status: true
    };
  }
  _auth(method, pathStr, deviceId) {
    try {
      const ts = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const str = method.toUpperCase() + encodeURI(pathStr) + ts + deviceId;
      const sig = crypto.createHmac("sha256", this.key).update(str).digest("hex");
      return {
        status: true,
        result: {
          "User-Agent": this.ua,
          "pixb-cl-id": deviceId,
          "captcha-code": "skipcode:qNDyPnC0mz99CLugpqOQJxGp9yTQspHiYaEnoTCU",
          "x-ebg-param": Buffer.from(ts).toString("base64"),
          "x-ebg-signature": sig
        }
      };
    } catch (err) {
      return {
        status: false,
        result: `Gagal membuat header enkripsi: ${err.message}`
      };
    }
  }
  async _img(input) {
    try {
      if (Buffer.isBuffer(input)) {
        return {
          status: true,
          result: {
            buffer: input,
            name: "input.jpg",
            mime: "image/jpeg"
          }
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("data:image")) {
          const parts = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!parts) return {
            status: false,
            result: "Format string Base64 tidak valid."
          };
          const mime = parts[1];
          const buffer = Buffer.from(parts[2], "base64");
          return {
            status: true,
            result: {
              buffer: buffer,
              name: `input.${mime.split("/")[1] || "jpg"}`,
              mime: mime
            }
          };
        }
        if (input.startsWith("http://") || input.startsWith("https://")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          const buffer = Buffer.from(res.data);
          let name = "input.jpg";
          try {
            name = new URL(input).pathname.split("/").filter(Boolean).pop() || "input.jpg";
          } catch {}
          return {
            status: true,
            result: {
              buffer: buffer,
              name: name,
              mime: mime
            }
          };
        }
      }
      return {
        status: false,
        result: "Format gambar tidak dikenali. Wajib berupa Buffer, Base64 String, atau URL."
      };
    } catch (err) {
      return {
        status: false,
        result: `Gagal mengurai input gambar: ${err.message}`
      };
    }
  }
  async generate({
    image,
    scale = "2X",
    model = "picasso",
    face = false,
    quality = false,
    text = false,
    ...rest
  }) {
    try {
      const checkPayload = this._validate({
        image: image,
        scale: scale,
        model: model
      });
      if (!checkPayload.status) return checkPayload;
      const deviceId = crypto.randomUUID();
      const fileRes = await this._img(image);
      if (!fileRes.status) return fileRes;
      const file = fileRes.result;
      const form = new FormData();
      const payload = {
        "input.type": scale,
        "input.model": model,
        "input.enhance_face": String(face),
        "input.enhance_quality": String(quality),
        "input.enhance_text": String(text),
        ...rest
      };
      for (const [key, val] of Object.entries(payload)) {
        form.append(key, String(val));
      }
      form.append("input.image", file.buffer, {
        filename: file.name,
        contentType: file.mime
      });
      const authRes = this._auth("POST", this.path, deviceId);
      if (!authRes.status) return authRes;
      const createRes = await axios.post(`${this.host}${this.path}`, form, {
        headers: {
          ...authRes.result,
          ...form.getHeaders()
        }
      });
      const createData = createRes.data;
      if (!createData.urls?.get) {
        return {
          status: false,
          result: "Gagal mendapatkan URL status antrean dari server."
        };
      }
      const pollPath = new URL(createData.urls.get).pathname;
      const startTime = Date.now();
      while (Date.now() - startTime < 6e4) {
        await new Promise(r => setTimeout(r, 3e3));
        const pollAuthRes = this._auth("GET", pollPath, deviceId);
        if (!pollAuthRes.status) return pollAuthRes;
        const pollRes = await axios.get(`${this.host}${pollPath}`, {
          headers: pollAuthRes.result
        });
        const data = pollRes.data;
        if (data.status === "SUCCESS" || data.status === "COMPLETED") {
          return {
            status: true,
            result: {
              url: data.output?.[0] || null,
              id: data._id,
              createdAt: data.createdAt
            }
          };
        }
        if (["FAILED", "ERROR", "FAILURE"].includes(data.status)) {
          return {
            status: false,
            result: data.error || "Upscale gagal diproses oleh sistem internal."
          };
        }
      }
      return {
        status: false,
        result: "Batas waktu tunggu pemrosesan gambar habis (Timeout >60s)"
      };
    } catch (err) {
      return {
        status: false,
        result: err.response?.data?.message || err.message
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
  const api = new PixelbinClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}