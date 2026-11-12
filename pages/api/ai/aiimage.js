import axios from "axios";
class GenImage {
  constructor() {
    this.url = "https://us-central1-ai-image-945d4.cloudfunctions.net";
    this.auth = "Bearer ap4u7TBQ";
    this.cfg = {
      t2i_styles: ["real", "anime", "2.5d", "3d"],
      i2i_types: ["gacha", "anime", "real_figure", "3d_character", "younger", "older"],
      sizes: ["square", "portrait2x3", "portrait3x4", "portrait9x16", "landscape3x2", "landscape4x3", "landscape16x9"]
    };
    this.api = axios.create({
      baseURL: this.url,
      timeout: 12e4,
      headers: {
        Authorization: this.auth
      }
    });
  }
  _log(m, path, status = "") {
    const icon = {
      out: "📤 SEND",
      in: "📥 RECV",
      err: "❌ ERR"
    } [m] || "•";
    console.log(`[genimage] ${icon} | ${path} ${status}`);
  }
  async _img(src) {
    if (!src) return null;
    try {
      if (Buffer.isBuffer(src)) return src.toString("base64");
      if (typeof src === "string" && src.startsWith("http")) {
        const r = await axios.get(src, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(src).origin
          }
        });
        return Buffer.from(r.data).toString("base64");
      }
      return src?.includes("base64,") ? src.split(",")[1] : src;
    } catch (e) {
      this._log("err", "IMAGE_RESOLVE", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    image,
    style,
    size,
    neg,
    nsfw = true,
    ...rest
  }) {
    const b64 = await this._img(image);
    const isI2I = !!b64;
    const path = isI2I ? "/edit_image" : "/generate_image";
    const vStyle = isI2I ? this.cfg.i2i_types.includes(style) ? style : "real_figure" : this.cfg.t2i_styles.includes(style) ? style : "real";
    const vSize = this.cfg.sizes.includes(size) ? size : "portrait3x4";
    const body = isI2I ? {
      type: vStyle,
      base64_image: b64,
      ...rest
    } : {
      prompt_ja: prompt || "beautiful scenery",
      style: vStyle,
      size_type: vSize,
      nsfw_filter: nsfw,
      negative_prompt_ja: neg || undefined,
      ...rest
    };
    try {
      this._log("out", path, `[${vStyle}] ${prompt?.slice(0, 20) || ""}`);
      const r = await this.api.post(path, body);
      this._log("in", path, r.status);
      return r.data?.data || r.data;
    } catch (e) {
      const errRes = e.response?.data?.data || e.response?.data || {
        error: e.message
      };
      this._log("err", path, `${e.response?.status || 500} - ${JSON.stringify(errRes)}`);
      return errRes;
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
  const api = new GenImage();
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