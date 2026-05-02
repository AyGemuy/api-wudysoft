import axios from "axios";
import crypto from "crypto";
import PROMPT from "@/configs/ai-prompt";
class UnlimAI {
  constructor() {
    this._base = "https://unlimimp.online";
    this._apiSecret = null;
    this._client = axios.create({
      baseURL: this._base,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
  }
  _u(b) {
    return b & 255;
  }
  _k() {
    const l = [-62, 84, -25, -8, -27, 104, -22, -27, -112, 87, -112, -33, -24, 104, -122];
    const m = [-89, 63, -46, -117];
    const n = [59, -83, 29, 50, 40, -73, 124, 34, 3, -119, 113, 53, 17, -121, 61];
    const o = [92, -31, 73, 118];
    const p = [-86, 19, -95, -24, -111, 24, -34, -9, -76, 122, -1, -34, -116];
    const q = [-29, 42, -111, -72];
    const key = Buffer.alloc(43);
    for (let i = 0; i < 15; i++) key[i] = this._u(l[i]) ^ this._u(m[i % 4]);
    for (let i = 0; i < 15; i++) key[15 + i] = this._u(n[i]) ^ this._u(o[i % 4]);
    for (let i = 0; i < 13; i++) key[30 + i] = this._u(p[i]) ^ this._u(q[i % 4]);
    return key;
  }
  _s(ts, body) {
    return crypto.createHmac("sha256", this._k()).update(`${ts}:${body}`).digest("hex");
  }
  async _p(img, idx) {
    try {
      console.log(`[proses] gambar ${idx + 1}`);
      if (Buffer.isBuffer(img)) {
        console.log(`  -> buffer -> base64`);
        return {
          image: img.toString("base64"),
          filename: `img_${idx + 1}.jpg`
        };
      }
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log(`  -> download dari URL: ${img.substring(0, 50)}...`);
          const res = await axios.get(img, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: new URL(img).origin
            }
          });
          return {
            image: Buffer.from(res.data).toString("base64"),
            filename: `img_${idx + 1}.jpg`
          };
        }
        console.log(`  -> string base64 (langsung)`);
        return {
          image: img,
          filename: `img_${idx + 1}.jpg`
        };
      }
      throw new Error("tipe gambar tidak dikenal (harus buffer/string)");
    } catch (err) {
      console.error(`[error] proses gambar ${idx + 1}:`, err.message);
      throw err;
    }
  }
  async generate({
    prompt = PROMPT.text,
    image = null
  }) {
    try {
      console.log(`[start] prompt: "${prompt.substring(0, 50)}..."`);
      let bodyObj = {
        prompt: prompt
      };
      if (image) {
        const images = Array.isArray(image) ? image : [image];
        const imgData = [];
        for (let i = 0; i < images.length; i++) {
          const processed = await this._p(images[i], i);
          imgData.push(processed);
        }
        bodyObj.images = imgData;
        console.log(`[info] i2i mode, ${imgData.length} gambar diproses`);
      } else {
        console.log(`[info] t2i mode (tanpa gambar)`);
      }
      const bodyStr = JSON.stringify(bodyObj);
      const ts = String(Math.floor(Date.now() / 1e3));
      const sig = this._s(ts, bodyStr);
      const headers = {
        "X-Timestamp": ts,
        "X-Signature": sig
      };
      if (this._apiSecret) headers["X-API-Secret"] = this._apiSecret;
      console.log(`[request] POST /edit, timestamp=${ts}`);
      const response = await this._client.post("/edit", bodyStr, {
        headers: headers
      });
      console.log(`[success] status ${response.status}`);
      return response.data;
    } catch (err) {
      console.error(`[error] gen gagal:`, err.response?.data || err.message);
      throw err;
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
  const api = new UnlimAI();
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