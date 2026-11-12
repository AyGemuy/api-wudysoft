import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";
class AIEmoji {
  constructor() {
    const randHex = len => crypto.randomBytes(len).toString("hex");
    const devId = randHex(8);
    const rcId = `$RCAnonymousID:${randHex(16)}`;
    const userId = crypto.randomUUID();
    this.c = {
      base: "https://aiemoji-backend-production.up.railway.app/api/v1",
      apiKey: "2e3611cd-bb1a-41fd-9bc1-d1971c5e29a2",
      pkg: "com.gigantic.aiemoji",
      ua: "ktor-client",
      userId: userId,
      devId: devId,
      rcId: rcId
    };
    this.types = ["text_to_emoji", "image_to_emoji", "merge_emoji"];
    this.styles = ["sticker", "3d", "anime"];
  }
  async parseImg(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"))) {
        console.log(`[INFO] Mengunduh gambar dari internet...`);
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data, "binary");
      }
      if (typeof input === "string") {
        const cleanB64 = input.includes(",") ? input.split(",")[1] : input;
        return Buffer.from(cleanB64, "base64");
      }
      return null;
    } catch (err) {
      console.error("[ERROR] Resolusi gambar gagal:", err.message);
      return null;
    }
  }
  async generate({
    type,
    prompt,
    image,
    style,
    ...rest
  }) {
    try {
      console.log("[START] Melakukan validasi awal data input...");
      const finalType = type || "text_to_emoji";
      const finalStyle = style || "anime";
      if (!this.types.includes(finalType)) {
        return {
          success: false,
          error: `Type '${finalType}' tidak valid. Pilih: ${this.types.join(", ")}`
        };
      }
      if (!this.styles.includes(finalStyle)) {
        return {
          success: false,
          error: `Style '${finalStyle}' tidak valid. Pilih: ${this.styles.join(", ")}`
        };
      }
      let validationError = null;
      switch (finalType) {
        case "text_to_emoji":
          if (!prompt) validationError = "Field 'prompt' wajib diisi untuk text_to_emoji!";
          break;
        case "merge_emoji":
          if (!prompt || !prompt.includes(",")) validationError = "Field 'prompt' wajib berisi minimal 2 emoji pisah koma untuk merge_emoji!";
          break;
        case "image_to_emoji":
          if (!image) validationError = "Field 'image' wajib disertakan untuk image_to_emoji!";
          break;
        default:
          break;
      }
      if (validationError) {
        console.warn(`[WARN] Validasi gagal: ${validationError}`);
        return {
          success: false,
          error: validationError
        };
      }
      const form = new FormData();
      form.append("user_prompt", prompt || "🗿");
      form.append("quality", rest?.quality || "low");
      form.append("style_id", finalStyle);
      form.append("generation_type", finalType);
      form.append("user_id", this.c.userId);
      form.append("timestamp", String(Date.now()));
      form.append("platform", "android");
      form.append("app_version", rest?.appVersion || "1.0.2");
      form.append("locale", rest?.locale || "id-ID");
      form.append("is_pro_user", String(rest?.isProUser || false));
      form.append("count", String(rest?.count || 1));
      form.append("rc_user_id", this.c.rcId);
      form.append("package_id", this.c.pkg);
      form.append("device_id", this.c.devId);
      if (image) {
        const imgBuffer = await this.parseImg(image);
        if (imgBuffer) {
          form.append("image", imgBuffer, {
            filename: "user-image.png",
            contentType: "image/png"
          });
          console.log("[SUCCESS] Buffer gambar dimasukkan ke payload.");
        }
      }
      console.log(`[API REQUEST] Mengirim payload multipart ke server...`);
      const res = await axios.post(`${this.c.base}/generate/emoji/`, form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": this.c.ua,
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "x-api-key": this.c.apiKey,
          "accept-charset": "UTF-8"
        }
      });
      console.log("[API RESPONSE] Memproses struktur data dari server...");
      const resData = res?.data;
      const b64Data = resData?.generatedImage?.data || resData?.data;
      const mimeType = resData?.generatedImage?.mimeType || "image/png";
      if (!b64Data) {
        return {
          success: false,
          error: `Server tidak mengembalikan data gambar: ${JSON.stringify(resData)}`
        };
      }
      console.log("[FINISH] Pembuatan gambar emoji selesai dengan sukses.");
      return {
        success: true,
        buffer: Buffer.from(b64Data, "base64"),
        contentType: mimeType
      };
    } catch (err) {
      const errDetails = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error("[FATAL ERROR] Gagal mengeksekusi proses:", errDetails);
      return {
        success: false,
        error: errDetails
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AIEmoji();
  try {
    console.log(`[API ROUTE] Menerima request dengan metode: ${req.method}`);
    const result = await api.generate(params);
    if (!result?.success) {
      console.log(`[API ROUTE] Proses gagal: ${result?.error}`);
      return res.status(400).json({
        success: false,
        error: result?.error || "Gagal memproses pembuatan emoji"
      });
    }
    console.log(`[API ROUTE] Sukses, mengirimkan file gambar (${result.contentType}).`);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errMsg = error?.message || "Terjadi kesalahan internal saat memproses request";
    console.error("[API ROUTE FATAL]", errMsg);
    return res.status(500).json({
      success: false,
      error: errMsg
    });
  }
}