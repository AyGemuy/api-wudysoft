import axios from "axios";
class ListnrUpscaler {
  constructor() {
    this.API_URL = "https://bff.listnr.tech/backend/user/public-image-upscale";
    this.VALID_SCALES = [2, 4, 6, 8];
    this.DEFAULT_HEADERS = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://listnr.ai",
      referer: "https://listnr.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
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
    console.log("LOG: Memulai proses Listnr.ai Upscaling...");
    const defaultScale = this.VALID_SCALES[0];
    const inputScale = rest.scale;
    const timeout = rest.timeout ?? 6e4;
    const finalHeaders = rest.headers || this.DEFAULT_HEADERS;
    const scale = this.VALID_SCALES.includes(Number(inputScale)) ? Number(inputScale) : defaultScale;
    if (inputScale && inputScale !== scale) {
      console.warn(`LOG: Skala '${inputScale}' tidak valid. Menggunakan default: '${scale}x'.`);
    } else if (!inputScale) {
      console.log(`LOG: Skala tidak ditentukan. Menggunakan default: '${scale}x'.`);
    } else {
      console.log(`LOG: Skala valid. Menggunakan: '${scale}x'.`);
    }
    try {
      const imageData = await this._imgToB64(image);
      const payload = {
        imageData: imageData,
        scale: scale
      };
      console.log(`LOG: Mengirim permintaan ke API (Scale: ${scale})`);
      const response = await axios.post(this.API_URL, payload, {
        headers: finalHeaders,
        timeout: timeout
      });
      const result = response.data;
      const upscaledUrl = result?.res?.image?.url ?? null;
      if (!result.success || !upscaledUrl) {
        console.error("LOG: Respon API gagal atau URL hasil tidak ditemukan.", result);
        const errorMessage = result?.message || "Gagal memproses gambar.";
        return {
          success: false,
          message: errorMessage,
          result: result
        };
      }
      console.log(`LOG: Proses berhasil. URL hasil: ${upscaledUrl}`);
      const {
        res: {
          image: {
            url: finalUrl
          }
        }
      } = result;
      const info = {
        raw_response: result
      };
      return {
        result: finalUrl,
        info: info,
        success: true
      };
    } catch (error) {
      console.error("LOG: Terjadi KESALAHAN selama proses Listnr.ai Upscaling!");
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
  const api = new ListnrUpscaler();
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