import axios from "axios";
import crypto from "crypto";
class PhotoEnhancer {
  constructor() {
    this.cfg = {
      token: crypto.randomBytes(32).toString("base64url"),
      timeout: 6e4,
      base: "https://us-central1-ai-photo-enhancer-swift.cloudfunctions.net/process_image",
      modes: ["upscaler", "colorization", "scratch", "background"]
    };
    console.log(`[INIT] PhotoEnhancer ready. Token generated.`);
  }
  val(mode) {
    if (!this.cfg.modes.includes(mode)) {
      const errMsg = `Mode "${mode}" invalid. Available: ${this.cfg.modes.join(", ")}`;
      console.error(`[VALIDATION_ERROR] ${errMsg}`);
      throw new Error(errMsg);
    }
    console.log(`[VALIDATION] Mode "${mode}" is valid.`);
  }
  async image(src) {
    try {
      console.log("[PROCESS] Resolving image source...");
      if (Buffer.isBuffer(src)) {
        console.log("[PROCESS] Source is Buffer. Converting to base64...");
        return src.toString("base64");
      }
      if (typeof src === "string" && /^https?:\/\//i.test(src)) {
        console.log(`[PROCESS] Source is URL. Downloading: ${src}`);
        const r = await axios.get(src, {
          responseType: "arraybuffer",
          timeout: this.cfg.timeout,
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });
        console.log("[PROCESS] Download success. Converting to base64...");
        return Buffer.from(r.data).toString("base64");
      }
      if (typeof src === "string") {
        console.log("[PROCESS] Source is string (Base64/Path). Cleaning data prefix...");
        return src.replace(/^data:[^;]+;base64,/, "");
      }
      throw new Error("Invalid image source type.");
    } catch (err) {
      console.error(`[IMAGE_ERROR] Failed to process image: ${err.message}`);
      throw err;
    }
  }
  body(mode, b64, rest) {
    console.log(`[PROCESS] Constructing request body for ${mode}...`);
    return {
      data: {
        apiType: mode,
        file: b64,
        ...mode === "upscaler" && {
          params: {
            face_upsample: rest?.face_upsample ?? true,
            upscale_factor: rest?.upscale_factor || "2x",
            background_enhance: rest?.background_enhance ?? true
          }
        }
      }
    };
  }
  async generate({
    mode = "upscaler",
    image,
    ...rest
  }) {
    const targetImage = image;
    console.log(`\n--- START PROCESS [${mode?.toUpperCase()}] ---`);
    try {
      this.val(mode);
      if (!targetImage) throw new Error("Image source is required (property 'image' or 'media')");
      const b64 = await this.image(targetImage);
      console.log("[API] Sending request to Firebase Cloud Functions...");
      const startTime = Date.now();
      const {
        data,
        status
      } = await axios.post(this.cfg.base, this.body(mode, b64, rest), {
        timeout: this.cfg.timeout,
        headers: {
          "User-Agent": "okhttp/5.1.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "firebase-instance-id-token": this.cfg.token
        },
        decompress: true
      });
      const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
      console.log(`[API] Success! Status: ${status} (${duration}s)`);
      console.log(`--- END PROCESS [${mode?.toUpperCase()}] ---\n`);
      return data;
    } catch (err) {
      const status = err?.response?.status || "NETWORK_ERROR";
      const msg = err?.response?.data?.error?.message || err?.message || "Unknown Error";
      console.error(`[GENERATE_FAILED]`);
      console.error(` > Status: ${status}`);
      console.error(` > Detail: ${msg}`);
      console.log(`--- PROCESS ABORTED ---\n`);
      throw new Error(`PhotoEnhancer Error [${mode}]: ${msg}`);
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
  const api = new PhotoEnhancer();
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