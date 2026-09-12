import axios from "axios";
import {
  randomBytes
} from "crypto";
import sizeOf from "image-size";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class NudeMaker {
  constructor() {
    try {
      this._client = axios.create({
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://nudemaker.app",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://nudemaker.app/register",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this._cookie = null;
    } catch (err) {
      console.error("Error in constructor:", err.message || err);
    }
  }
  _genCreds() {
    try {
      const r = randomBytes(8).toString("hex");
      const email = `user_${r}@mail.com`;
      const pass = randomBytes(12).toString("hex");
      return {
        email: email,
        pass: pass
      };
    } catch (err) {
      console.error("Error in _genCreds:", err.message || err);
      throw err;
    }
  }
  _saveCookie(res) {
    try {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        const cookie = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
        this._cookie = cookie;
        console.log("✅ Session cookie stored.");
      }
    } catch (err) {
      console.error("Error in _saveCookie:", err.message || err);
      throw err;
    }
  }
  async _reg() {
    try {
      console.log("📝 Registering new user...");
      const {
        email,
        pass
      } = this._genCreds();
      const payload = {
        email: email,
        password: pass,
        secondPassword: pass
      };
      const res = await this._client.post(`${proxy}https://nudemaker.app/api/register`, payload);
      this._saveCookie(res);
      console.log("✅ Registration successful.", res.data?.data || "");
      return {
        email: email,
        pass: pass
      };
    } catch (err) {
      console.error("Error in _reg:", err.message || err);
      throw err;
    }
  }
  async _chkAuth() {
    try {
      console.log("🔍 Checking authentication...");
      if (!this._cookie) {
        console.warn("⚠️ No session cookie, skipping check.");
        return false;
      }
      const res = await this._client.get(`${proxy}https://nudemaker.app/api/check-authentication`, {
        headers: {
          Cookie: this._cookie
        }
      });
      const ok = res.data?.data === "authenticated";
      console.log(ok ? "✅ Authenticated." : "❌ Authentication failed.");
      return ok;
    } catch (err) {
      console.error("Error in _chkAuth:", err.message || err);
      return false;
    }
  }
  async _prepImg(src) {
    try {
      let buffer;
      let mime = "image/jpeg";
      if (typeof src === "string") {
        if (src.startsWith("http://") || src.startsWith("https://")) {
          console.log("🌐 Fetching image from URL...");
          const resp = await axios.get(src, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(resp.data);
          mime = resp.headers["content-type"] || mime;
        } else if (src.startsWith("data:")) {
          console.log("📦 Decoding base64 data URL...");
          const [header, data] = src.split(",");
          const mimeMatch = header.match(/data:(.*?);/);
          if (mimeMatch) mime = mimeMatch[1];
          buffer = Buffer.from(data, "base64");
        } else {
          console.log("📦 Decoding plain base64...");
          buffer = Buffer.from(src, "base64");
        }
      } else if (Buffer.isBuffer(src)) {
        console.log("📦 Using provided buffer.");
        buffer = src;
      } else {
        throw new Error("Unsupported image input type.");
      }
      const dims = sizeOf(buffer);
      console.log(`🖼️  Image: ${dims.width}x${dims.height}, type: ${dims.type || "unknown"}`);
      return {
        buffer: buffer,
        width: dims.width || 0,
        height: dims.height || 0,
        mime: dims.type ? `image/${dims.type}` : mime
      };
    } catch (err) {
      console.error("Error in _prepImg:", err.message || err);
      throw err;
    }
  }
  async _undress(imageInfo, options = {}) {
    try {
      console.log("👗 Sending to /undress...");
      const {
        mode = "undress-mode",
          boobsSize = "default",
          selectZoneMethod = "all-clothes",
          customModePrompt = ""
      } = options;
      const base64 = imageInfo.buffer.toString("base64");
      const dataUrl = `data:${imageInfo.mime};base64,${base64}`;
      const payload = {
        selectZoneMethod: selectZoneMethod,
        imageUrl: dataUrl,
        imageWidth: imageInfo.width,
        imageHeight: imageInfo.height,
        mode: mode,
        customModePrompt: customModePrompt,
        boobsSize: boobsSize
      };
      const res = await this._client.post(`${proxy}https://large.nudemaker.app/api/undress`, payload, {
        headers: {
          Cookie: this._cookie,
          referer: "https://nudemaker.app/"
        }
      });
      const resultUrl = res.data?.url;
      if (!resultUrl) throw new Error("No image URL returned from undress API.");
      console.log("✅ Undress response received.");
      const [header, data] = resultUrl.split(",");
      const mimeMatch = header.match(/data:(.*?);/);
      const contentType = mimeMatch ? mimeMatch[1] : "image/png";
      const buffer = Buffer.from(data, "base64");
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (err) {
      console.error("Error in _undress:", err.message || err);
      throw err;
    }
  }
  async generate({
    image,
    ...rest
  }) {
    try {
      console.log("🚀 Starting generate process...");
      const creds = await this._reg();
      const imgInfo = await this._prepImg(image);
      const result = await this._undress(imgInfo, rest);
      console.log("🎉 Generate completed successfully.");
      return {
        status: "success",
        buffer: result.buffer,
        contentType: result.contentType
      };
    } catch (err) {
      console.error("❌ Error in generate:", err.message || err);
      const status = err.response?.status || 500;
      const msg = err.response?.data?.message || err.message || "Unknown error";
      return {
        status: `error: ${status} - ${msg}`,
        buffer: null,
        contentType: null
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
  const api = new NudeMaker();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data.contentType || "image/png");
    return res.status(200).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}