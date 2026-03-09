import axios from "axios";
class ImageUpscaler {
  constructor() {
    this.API_URL = "https://www.aiupscaler.app/api/enhance";
    this.VALID_MODES = ["fast", "pro"];
    this.DEFAULT_HEADERS = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://www.aiupscaler.app",
      referer: "https://www.aiupscaler.app/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _imgToB64(image) {
    console.log("LOG: Memulai konversi gambar ke Base64...");
    if (!image) throw new Error("Gambar tidak boleh kosong.");
    let base64Data;
    let mimeType = "image/jpeg";
    if (typeof image === "string" && image.startsWith("data:")) {
      console.log("LOG: Gambar sudah dalam format Data URL.");
      mimeType = image.match(/data:(.*?);/)?.[1] || mimeType;
      return image;
    }
    if (typeof image === "string" && (image.startsWith("http") || image.startsWith("https"))) {
      console.log(`LOG: Mengambil gambar dari URL: ${image.substring(0, 50)}...`);
      const response = await axios.get(image, {
        responseType: "arraybuffer"
      });
      base64Data = Buffer.from(response.data, "binary").toString("base64");
      mimeType = response.headers["content-type"] ?? mimeType;
    } else if (Buffer.isBuffer(image)) {
      console.log("LOG: Menggunakan Buffer gambar.");
      base64Data = image.toString("base64");
    } else if (typeof image === "string") {
      console.log("LOG: Menggunakan string Base64 mentah.");
      base64Data = image;
    } else {
      throw new Error("Format gambar tidak didukung (harus URL, Base64, atau Buffer).");
    }
    const finalMime = mimeType.includes("/") ? mimeType : "image/jpeg";
    console.log(`LOG: Konversi Base64 selesai. MIME: ${finalMime}`);
    return `data:${finalMime};base64,${base64Data}`;
  }
  async generate({
    imageUrl: image,
    ...rest
  }) {
    console.log("\n======================================");
    console.log("LOG: Memulai proses AI Upscaling...");
    const defaultMode = this.VALID_MODES[0];
    const inputMode = rest.mode;
    const timeout = rest.timeout ?? 6e4;
    const finalHeaders = rest.headers || this.DEFAULT_HEADERS;
    const mode = this.VALID_MODES.includes(inputMode) ? inputMode : defaultMode;
    if (inputMode && inputMode !== mode) {
      console.warn(`LOG: Mode '${inputMode}' tidak valid. Menggunakan default: '${mode}'.`);
    } else if (!inputMode) {
      console.log(`LOG: Mode tidak ditentukan. Menggunakan default: '${mode}'.`);
    } else {
      console.log(`LOG: Mode valid. Menggunakan: '${mode}'.`);
    }
    try {
      const imageData = await this._imgToB64(image);
      const payload = {
        imageData: imageData,
        mode: mode
      };
      console.log(`LOG: Mengirim permintaan ke API (Mode: ${mode})`);
      const response = await axios.post(this.API_URL, payload, {
        headers: finalHeaders,
        timeout: timeout
      });
      const result = response.data;
      const upscaledUrl = result?.upscaledUrl ?? null;
      if (!upscaledUrl) {
        console.error("LOG: Respon API valid, tapi upscaledUrl tidak ditemukan.", result);
        return {
          success: false,
          message: "URL hasil tidak ditemukan.",
          result: result
        };
      }
      console.log(`LOG: Proses berhasil. URL hasil: ${upscaledUrl}`);
      const {
        upscaledUrl: finalUrl,
        ...info
      } = result;
      return {
        result: finalUrl,
        info: info,
        success: true
      };
    } catch (error) {
      console.error("LOG: Terjadi KESALAHAN selama proses AI Upscaling!");
      const errorMessage = error.response?.data?.message || error.message || "Kesalahan tak dikenal";
      return {
        result: null,
        info: {
          status: error.response?.status ?? "N/A",
          message: errorMessage
        },
        success: false
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