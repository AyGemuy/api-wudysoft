import axios from "axios";
import FormData from "form-data";
class Yunusek {
  constructor(authToken = null) {
    this.authToken = authToken;
    this.baseURL = "https://api.yunusek.org";
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "User-Agent": "okhttp/4.9.2",
        "Accept-Encoding": "gzip"
      }
    });
  }
  async resolveImage(input) {
    try {
      console.log("[Process] Resolving image input...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (input.includes("base64,")) return Buffer.from(input.split(",")[1], "base64");
        return Buffer.from(input, "base64");
      }
      throw new Error("Format gambar tidak dikenali");
    } catch (e) {
      throw new Error(`ResolveImage Failed: ${e.message}`);
    }
  }
  async request(endpoint, fields = {}, imageBuffer) {
    try {
      console.log(`[Process] Preparing multipart form for ${endpoint}...`);
      const form = new FormData();
      form.append("image", imageBuffer, {
        filename: "image.png",
        contentType: "image/png"
      });
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, String(value));
      }
      console.log("[Process] Sending request to Yunusek API...");
      const res = await this.client.post(endpoint, form, {
        headers: {
          ...form.getHeaders(),
          ...this.authToken && {
            Authorization: `Bearer ${this.authToken}`
          }
        },
        responseType: "arraybuffer"
      });
      console.log("[Process] Request successful.");
      return {
        buffer: Buffer.from(res.data),
        contentType: res.headers["content-type"] || "image/png"
      };
    } catch (e) {
      let errorDetail = e.message;
      if (e.response?.data) {
        errorDetail = Buffer.isBuffer(e.response.data) ? e.response.data.toString() : JSON.stringify(e.response.data);
      }
      throw new Error(`API Request Failed: ${errorDetail}`);
    }
  }
  async run({
    mode = "removebg",
    image,
    scale = "2",
    highRes = false
  }) {
    try {
      const activeMode = (mode || "removebg").toLowerCase();
      console.log(`[Start] Running mode: ${activeMode}`);
      const buf = await this.resolveImage(image);
      if (activeMode === "removebg") {
        return await this.request("/api/remove-background", {
          high_res: highRes ? "true" : "false"
        }, buf);
      }
      if (activeMode === "upscale") {
        return await this.request("/api/upscale", {
          scale: String(scale)
        }, buf);
      }
      throw new Error("Mode tidak valid (gunakan removebg atau upscale)");
    } catch (e) {
      console.error(`[Error] ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const {
    mode = "removebg",
      image
  } = input;
  if (!image) {
    return res.status(400).json({
      error: "Parameter 'image' (URL/Base64) wajib diisi."
    });
  }
  const api = new Yunusek();
  try {
    const result = await api.run({
      ...input,
      mode: mode
    });
    if (result.buffer) {
      res.setHeader("Content-Type", result.contentType);
      return res.status(200).send(result.buffer);
    }
    return res.status(400).json({
      error: "Gagal memproses gambar."
    });
  } catch (error) {
    console.error("[Handler Error]", error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}