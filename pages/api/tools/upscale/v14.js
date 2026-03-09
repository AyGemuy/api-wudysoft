import axios from "axios";
import FormData from "form-data";
class ImageUpscaler {
  constructor() {
    this.base = "https://get1.imglarger.com/api/UpscalerNew";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://imgupscaler.com",
      referer: "https://imgupscaler.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async generate({
    image,
    scale,
    ...rest
  }) {
    try {
      console.log("[UPSCALE] Starting...");
      const buf = await this.resolve(image);
      const code = await this.send(buf, scale || 2);
      const result = await this.check(code, scale || 2);
      console.log("[UPSCALE] Done");
      return result;
    } catch (error) {
      console.error("[UPSCALE] Error:", error?.message || error);
      throw error;
    }
  }
  async resolve(image) {
    try {
      console.log("[RESOLVE] Processing...");
      if (Buffer.isBuffer(image)) {
        console.log("[RESOLVE] Buffer detected");
        return image;
      }
      if (typeof image === "string") {
        if (image.startsWith("http://") || image.startsWith("https://")) {
          console.log("[RESOLVE] Downloading...");
          const res = await axios.get(image, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data || res);
        }
        if (image.startsWith("data:")) {
          console.log("[RESOLVE] Converting base64...");
          const b64 = image.split(",")[1] || image;
          return Buffer.from(b64, "base64");
        }
      }
      throw new Error("Invalid image");
    } catch (error) {
      console.error("[RESOLVE] Error:", error?.message || error);
      throw error;
    }
  }
  async send(buf, scale) {
    try {
      console.log("[SEND] Uploading...");
      const form = new FormData();
      form.append("myfile", buf, {
        filename: `${Date.now()}.png`,
        contentType: "image/jpeg"
      });
      form.append("scaleRadio", String(scale));
      const res = await axios.post(`${this.base}/UploadNew`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const code = res?.data?.data?.code;
      if (!code) throw new Error("No code");
      console.log(`[SEND] Code: ${code}`);
      return code;
    } catch (error) {
      console.error("[SEND] Error:", error?.message || error);
      throw error;
    }
  }
  async check(code, scale) {
    try {
      console.log("[CHECK] Polling...");
      for (let i = 0; i < 60; i++) {
        console.log(`[CHECK] ${i + 1}/60`);
        const res = await axios.post(`${this.base}/CheckStatusNew`, {
          code: code,
          scaleRadio: scale
        }, {
          headers: this.headers
        });
        const status = res?.data?.data?.status;
        if (status === "success") {
          console.log("[CHECK] Success!");
          return res?.data?.data || res?.data;
        }
        if (status === "failed" || status === "error") {
          throw new Error(`Failed: ${status}`);
        }
        console.log(`[CHECK] ${status || "processing"}...`);
        await new Promise(r => setTimeout(r, 3e3));
      }
      throw new Error("Timeout");
    } catch (error) {
      console.error("[CHECK] Error:", error?.message || error);
      throw error;
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
  const api = new ImageUpscaler();
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