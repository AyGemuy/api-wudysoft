import axios from "axios";
import https from "https";
import FormData from "form-data";
import crypto from "crypto";
const BASE_URL = "http://aiphoto.xtech.ai.vn/deepart/image_generate";
const AES_KEY = "1593572586541379";
const AES_IV = "aceimnoprstuvwxz";
const DEF_SECRET = "FLIEf6MyH/Yg4XwcTVhewajdT0uNGsZdLHRwlcWaipWzV+Ea1bDlW71onErccmhPLzLJVa8S/WIke7EfrDL3hg==";
class XTech {
  constructor() {
    console.log("[XTech] init...");
    this.secret = DEF_SECRET;
    this.steps = 25;
    this.height = 1024;
    this.format = "PNG";
    this.guidance = 5;
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
    this.apiKey = null;
    try {
      this.apiKey = this.decrypt(this.secret);
      console.log("[XTech] apiKey ready:", this.apiKey);
    } catch (e) {
      console.error("[XTech] init key error:", e.message);
    }
  }
  decrypt(enc) {
    console.log("[XTech] decrypt: decrypting...");
    try {
      const key = Buffer.from(AES_KEY, "utf8");
      const iv = Buffer.from(AES_IV, "utf8");
      const d = crypto.createDecipheriv("aes-128-cbc", key, iv);
      const plain = Buffer.concat([d.update(Buffer.from(enc.trim(), "base64")), d.final()]).toString("utf8");
      console.log("[XTech] decrypt: result =", plain);
      return plain;
    } catch (e) {
      console.error("[XTech] decrypt error:", e.message);
      throw e;
    }
  }
  async resolveImg(img) {
    console.log("[XTech] resolveImg: detecting type...");
    try {
      if (Buffer.isBuffer(img)) {
        console.log("[XTech] resolveImg: Buffer");
        return {
          buffer: img,
          filename: "image.png"
        };
      }
      if (typeof img === "string") {
        const uri = img.match(/^data:image\/(\w+);base64,(.+)$/s);
        if (uri) {
          console.log("[XTech] resolveImg: data URI, ext=" + uri[1]);
          return {
            buffer: Buffer.from(uri[2], "base64"),
            filename: `image.${uri[1]}`
          };
        }
        if (/^[A-Za-z0-9+/\r\n]+=*$/.test(img.trim()) && img.length > 64) {
          console.log("[XTech] resolveImg: raw base64");
          return {
            buffer: Buffer.from(img.trim(), "base64"),
            filename: "image.png"
          };
        }
        console.log("[XTech] resolveImg: URL, fetching ->", img);
        const res = await axios.get(img, {
          responseType: "arraybuffer",
          httpsAgent: this.agent,
          timeout: 3e4
        });
        const ext = (res.headers?.["content-type"] || "image/png").split("/")[1]?.split(";")[0] || "png";
        console.log(`[XTech] resolveImg: fetched OK, size=${res.data.byteLength}`);
        return {
          buffer: Buffer.from(res.data),
          filename: `image.${ext}`
        };
      }
      throw new Error("Unsupported image type: Buffer, base64 string, or URL expected");
    } catch (e) {
      console.error("[XTech] resolveImg error:", e.message);
      throw e;
    }
  }
  buildForm(prompt, rest, imgData) {
    console.log("[XTech] buildForm: building...");
    try {
      const form = new FormData();
      form.append("prompt", prompt || "");
      form.append("num_inference_steps", String(rest.steps ?? this.steps));
      form.append("height_resolution", String(rest.height ?? this.height));
      form.append("format", rest.format || this.format);
      form.append("guidance_scale", String(rest.guidance ?? this.guidance));
      if (rest.style) form.append("style", rest.style);
      if (rest.negativePrompt) form.append("negative_prompt", rest.negativePrompt);
      if (imgData) {
        console.log("[XTech] buildForm: appending control_image, file=" + imgData.filename);
        form.append("control_image", imgData.buffer, {
          filename: imgData.filename,
          contentType: "image/*"
        });
      }
      console.log("[XTech] buildForm: done");
      return form;
    } catch (e) {
      console.error("[XTech] buildForm error:", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    const mode = image != null ? "i2i" : "t2i";
    console.log(`[XTech] gen: mode=${mode}, prompt="${prompt}"`);
    try {
      const auth = this.apiKey || this.decrypt(this.secret);
      if (!auth?.trim()) throw new Error("Api Key Will not empty or null");
      console.log("[XTech] gen: auth =", auth);
      const imgData = image ? await this.resolveImg(image) : null;
      const form = this.buildForm(prompt, rest, imgData);
      const headers = {
        ...form.getHeaders(),
        Authorization: auth,
        "User-Agent": "okhttp/4.12.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      };
      console.log("[XTech] gen: posting to", BASE_URL);
      const res = await axios.post(BASE_URL, form, {
        headers: headers,
        responseType: "arraybuffer",
        httpsAgent: this.agent,
        timeout: 12e4
      });
      const contentType = res.headers?.["content-type"] || "image/png";
      console.log(`[XTech] gen: OK, type=${contentType}, size=${res.data?.byteLength} bytes`);
      return {
        buffer: Buffer.from(res.data),
        contentType: contentType
      };
    } catch (e) {
      const msg = e.response?.data ? Buffer.from(e.response.data).toString("utf8") : e.message || String(e);
      console.error("[XTech] gen error:", msg);
      throw new Error(msg);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new XTech();
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