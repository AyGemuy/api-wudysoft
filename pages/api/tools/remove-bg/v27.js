import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class SnapBg {
  constructor() {
    this.ep = "https://be-prod-1.snapbg.ai/api/rmbg/v1";
    this.sec = "c25hcGJnLXByb2Qtc2VjcmV0LWtleS0yMDI0";
    this.to = 6e4;
  }
  _b64(str) {
    try {
      return Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    } catch (err) {
      console.log("[SnapBG] Gagal format Base64Url:", err?.message);
      return "";
    }
  }
  _jwt() {
    try {
      console.log("[SnapBG] Mengenerate JWT dinamis...");
      const hdr = this._b64(JSON.stringify({
        alg: "HS256",
        typ: "JWT"
      }));
      const exp = Math.round(Date.now() / 1e3) + 300;
      const pld = this._b64(JSON.stringify({
        sub: "ignore",
        platform: "web",
        exp: exp
      }));
      const data = `${hdr}.${pld}`;
      const sign = crypto.createHmac("sha256", Buffer.from(this.sec, "utf-8")).update(data).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
      const token = `${data}.${sign}`;
      console.log("[SnapBG] JWT berhasil dibuat.");
      return token;
    } catch (err) {
      console.log("[SnapBG] Gagal generate JWT:", err?.message);
      return null;
    }
  }
  async _buf(img) {
    try {
      console.log("[SnapBG] Mengurai format gambar input...");
      if (!img) return null;
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          console.log("[SnapBG] Mengunduh buffer gambar dari URL...");
          const res = await axios.get(img, {
            responseType: "arraybuffer",
            timeout: 15e3
          });
          return res?.data ? Buffer.from(res.data) : null;
        }
        const b64 = img.includes(";base64,") ? img.split(";base64,")[1] : img;
        return Buffer.from(b64, "base64");
      }
      return null;
    } catch (err) {
      console.log("[SnapBG] Gagal memproses gambar:", err?.message);
      return null;
    }
  }
  async generate({
    image,
    ...rest
  }) {
    try {
      console.log("[SnapBG] Memulai proses generate...");
      const buf = await this._buf(image);
      if (!buf) {
        console.log("[SnapBG] Gambar tidak valid.");
        return {
          status: false,
          buffer: null,
          contentType: null,
          error: "Invalid Image Input"
        };
      }
      const appToken = this._jwt();
      const form = new FormData();
      form.append("input_image", buf, {
        filename: rest?.filename ? rest.filename : "blob.jpg",
        contentType: rest?.contentType ? rest.contentType : "image/jpeg"
      });
      for (const [k, v] of Object.entries(rest || {})) {
        if (k !== "filename" && k !== "contentType") {
          form.append(k, v);
        }
      }
      const hdrs = {
        ...form.getHeaders(),
        accept: "application/json",
        "accept-language": "id-ID",
        authorization: `Bearer ${appToken || ""}`,
        origin: "https://snapbg.ai",
        referer: "https://snapbg.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      console.log("[SnapBG] Mengirim request ke endpoint API...");
      const res = await axios.post(this.ep, form, {
        headers: hdrs,
        timeout: this.to
      });
      console.log("[SnapBG] Respons diterima, HTTP status:", res?.status);
      const raw = res?.data?.output || res?.data?.data?.output || res?.data || "";
      let outBuf = null;
      if (typeof raw === "string" && raw.length > 0) {
        const cleanB64 = raw.includes(";base64,") ? raw.split(";base64,")[1] : raw;
        outBuf = Buffer.from(cleanB64, "base64");
      } else if (Buffer.isBuffer(raw)) {
        outBuf = raw;
      }
      const isOk = res?.status >= 200 && res?.status < 300 && Boolean(outBuf) ? true : false;
      console.log("[SnapBG] Proses selesai. Status:", isOk);
      return {
        status: isOk,
        buffer: outBuf,
        contentType: isOk ? "image/png" : null
      };
    } catch (err) {
      console.log("[SnapBG] Error saat eksekusi generate:", err?.response?.data || err?.message);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: err?.response?.data || err?.message
      };
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
  const api = new SnapBg();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}