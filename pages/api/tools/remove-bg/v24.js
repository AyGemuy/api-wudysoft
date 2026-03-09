import axios from "axios";
import FormData from "form-data";
class BgRemover {
  constructor() {
    this.token = "f81bc59e849e883ad50a876988956dbf";
    this.base = "https://img.caapis.com";
    this.ax = axios.create({
      headers: {
        "User-Agent": "okhttp/4.11.0"
      }
    });
  }
  async buf(img) {
    try {
      console.log("[buf] Processing...");
      if (Buffer.isBuffer(img)) {
        console.log("[buf] Already buffer");
        return img;
      }
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log("[buf] Fetching URL...");
          const {
            data
          } = await this.ax.get(img, {
            responseType: "arraybuffer"
          });
          console.log("[buf] Fetched");
          return Buffer.from(data);
        }
        const b64 = img.replace(/^data:image\/\w+;base64,/, "");
        console.log("[buf] Base64 converted");
        return Buffer.from(b64, "base64");
      }
      throw new Error("Invalid format");
    } catch (e) {
      console.log("[buf] Error:", e.message);
      throw e;
    }
  }
  async up(img) {
    try {
      console.log("[up] Uploading...");
      const b = await this.buf(img);
      const form = new FormData();
      form.append("file_type", "bg_remover");
      form.append("file", b, {
        filename: "image.jpg"
      });
      form.append("hash", "");
      const {
        data
      } = await this.ax.post(`${this.base}/fileupload_new`, form, {
        headers: form.getHeaders()
      });
      console.log("[up] Success:", data?.filename || "N/A");
      return data?.hash || null;
    } catch (e) {
      console.log("[up] Error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async proc(hash) {
    try {
      console.log("[proc] Removing bg...");
      const form = new FormData();
      form.append("access_token", this.token);
      form.append("hash", hash);
      const {
        data
      } = await this.ax.post(`${this.base}/image_bg_remove`, form, {
        headers: form.getHeaders()
      });
      console.log("[proc] Success:", data?.download_url || "N/A");
      return data?.download_url || null;
    } catch (e) {
      console.log("[proc] Error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async generate({
    imageUrl: image,
    ...rest
  }) {
    try {
      console.log("[remove] Start");
      const img = image || rest?.img || rest?.url;
      if (!img) throw new Error("No image");
      const hash = await this.up(img);
      if (!hash) throw new Error("Upload failed");
      const result = await this.proc(hash);
      if (!result) throw new Error("Process failed");
      console.log("[remove] Complete!");
      return {
        result: result,
        hash: hash,
        status: "ok"
      };
    } catch (e) {
      console.log("[remove] Failed:", e.message);
      return {
        result: null,
        error: e.message,
        status: "fail",
        ...rest
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new BgRemover();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}