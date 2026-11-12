import axios from "axios";
import PROMPT from "@/configs/ai-prompt";
class PhotonexAI {
  constructor(credits) {
    this._credits = credits ?? 1e3;
    this._uid = null;
    this._base = "https://photonexai.com/api/v1";
    this._ua = "okhttp/4.12.0";
    const _RAW = [6, 60, 51, 40, 24, 22, 55, 11, 42, 41, 45, 7, 17, 28, 45, 26, 29, 24, 111, 4, 54, 55, 40, 43, 23, 53, 7, 10, 55, 58, 42, 4, 104, 13, 46, 25, 16, 13, 106, 26, 56, 9, 19, 54, 52, 61, 10, 11, 11, 27, 57, 23, 31, 60, 63, 38, 54, 49, 110, 9, 23, 51, 42, 51];
    this._key = Buffer.from(_RAW.map(function(x) {
      return x ^ 94;
    })).toString("utf8");
    this._magic = {
      ffd8ff: "image/jpeg",
      "89504e47": "image/png",
      47494638: "image/gif",
      52494646: "image/webp",
      "424d": "image/bmp"
    };
    this._ax = axios.create({
      baseURL: this._base,
      headers: {
        "User-Agent": this._ua,
        Accept: "application/json",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      }
    });
  }
  _sniff(buf) {
    const hex = buf.slice(0, 4).toString("hex");
    for (const sig of Object.keys(this._magic)) {
      if (hex.startsWith(sig)) {
        if (sig === "52494646" && buf.slice(8, 12).toString("ascii") !== "WEBP") continue;
        return this._magic[sig];
      }
    }
    return "image/jpeg";
  }
  _mkuid() {
    return Math.random().toString(36).slice(2, 10).toUpperCase() + Math.random().toString(36).slice(2, 10).toUpperCase();
  }
  _err(msg, data) {
    return {
      error: true,
      message: msg,
      data: data ?? null
    };
  }
  async _res(image) {
    if (!image) return null;
    try {
      if (Buffer.isBuffer(image)) {
        console.log("[photonex] resolve: buffer");
        return {
          b64: image.toString("base64"),
          mime: this._sniff(image)
        };
      }
      if (typeof image === "string" && /^data:/.test(image)) {
        console.log("[photonex] resolve: data-uri");
        const parts = image.split(",");
        const meta = parts[0];
        const b64 = parts[1];
        const match = meta.match(/data:([^;]+)/);
        const mime = match ? match[1] : "image/jpeg";
        return {
          b64: b64,
          mime: mime
        };
      }
      if (typeof image === "string" && /^https?:\/\//.test(image)) {
        console.log("[photonex] resolve: url fetch", image);
        try {
          const r = await axios.get(image, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: new URL(image).origin
            }
          });
          console.log("[photonex] resolve: url ok, status:", r.status);
          const buf = Buffer.from(r.data);
          const ctMime = (r.headers["content-type"] ?? "").split(";")[0].trim();
          const mime = ctMime.startsWith("image/") ? ctMime : this._sniff(buf);
          console.log("[photonex] resolve: mime:", mime, "size:", buf.length);
          return {
            b64: buf.toString("base64"),
            mime: mime
          };
        } catch (e) {
          console.log("[photonex] resolve: url err:", e?.response?.status ?? e.message);
          throw e;
        }
      }
      if (typeof image === "string") {
        console.log("[photonex] resolve: raw base64");
        const buf = Buffer.from(image, "base64");
        return {
          b64: image,
          mime: this._sniff(buf)
        };
      }
    } catch (e) {
      console.log("[photonex] resolve: failed:", e.message);
      throw e;
    }
    return null;
  }
  _parse(raw) {
    const img = raw?.data?.image;
    if (!img?.data) return raw;
    const buffer = Buffer.from(img.data, "base64");
    const contentType = img.mime_type ?? this._sniff(buffer);
    return {
      buffer: buffer,
      contentType: contentType,
      success: raw.success,
      api_used: raw.data?.api_used ?? null,
      model: raw.data?.model ?? null,
      credits: raw.data?.credits ?? null,
      cost_usd: raw.data?.cost_usd ?? null
    };
  }
  async _auth() {
    if (this._uid) return;
    this._uid = this._mkuid();
    console.log("[photonex] auth: register uid:", this._uid);
    try {
      const r = await this._ax.post("/user-credits", {
        uid: this._uid,
        credits: this._credits
      });
      console.log("[photonex] auth: credits:", r.data?.data?.credits);
    } catch (e) {
      console.log("[photonex] auth: err:", e?.response?.data ?? e.message);
    }
  }
  async styles({
    page = 1,
    per_page = 10,
    country_code = "ID",
    tag = "trending"
  } = {}) {
    console.log("[photonex] styles: page:", page, "tag:", tag);
    try {
      const r = await this._ax.get("/image-styles", {
        params: {
          page: page,
          per_page: per_page,
          country_code: country_code,
          tag: tag
        }
      });
      console.log("[photonex] styles: ok, count:", r.data?.data?.length ?? "?");
      return r.data;
    } catch (e) {
      console.log("[photonex] styles: err:", e?.response?.data ?? e.message);
      return this._err("styles failed", e?.response?.data);
    }
  }
  async generate({
    prompt = PROMPT.text,
    image,
    ...rest
  }) {
    console.log("[photonex] chat: start");
    try {
      await this._auth();
    } catch (e) {
      console.log("[photonex] chat: auth failed:", e.message);
      return this._err("auth failed", null);
    }
    console.log("[photonex] chat: prompt len:", prompt?.length);
    let img = null;
    try {
      img = await this._res(image);
      console.log("[photonex] chat: image resolved:", img?.mime ?? "none");
    } catch (e) {
      console.log("[photonex] chat: resolve err:", e.message);
      return this._err("image resolve failed", e.message);
    }
    try {
      console.log("[photonex] chat: posting /generate-image");
      const body = {
        prompt: prompt,
        user_id: this._uid,
        ...img && {
          image: img.b64,
          mime_type: img.mime
        },
        ...rest
      };
      const r = await this._ax.post("/generate-image", body, {
        headers: {
          "X-Api-Key": this._key,
          "Content-Type": "application/json"
        }
      });
      console.log("[photonex] chat: ok, status:", r.status);
      const result = this._parse(r.data);
      console.log("[photonex] chat: parsed ->", result.contentType, "buf size:", result.buffer?.length ?? 0);
      return result;
    } catch (e) {
      console.log("[photonex] chat: request err:", e?.response?.status, e?.response?.data ?? e.message);
      return this._err("chat failed", e?.response?.data);
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
  const api = new PhotonexAI();
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