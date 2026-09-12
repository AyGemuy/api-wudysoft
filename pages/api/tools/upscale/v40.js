import axios from "axios";
import jwt from "jsonwebtoken";
const CONFIG = {
  BASE_URL: "https://aiphoto.abcfreemusic.com/",
  X_SIG_SECRET: "si@xrtyu02xwp0922wdc",
  PKG: "com.aging.ai.toonme",
  VER: "1.6.7",
  GUEST_ID: "1233333",
  GUEST_SEC: "WdwxnfN01xwOh8wRGHrq"
};
const MODES = {
  enhance: "v1/api/extra/enhance",
  colorize: "v1/api/extra/colourize",
  upscale: "v1/api/extra/upscaler",
  remove_bg: "v1/api/extra/remove_common_background"
};
class PhotoArtFX {
  constructor() {
    this.uid = CONFIG.GUEST_ID;
    this.secret = CONFIG.GUEST_SEC;
    this.token = null;
    this.http = axios.create({
      baseURL: CONFIG.BASE_URL,
      timeout: 6e4
    });
  }
  _getHeaders(isAuth) {
    try {
      const now = Math.floor(Date.now() / 1e3);
      const xSig = jwt.sign({
        uuid: this.uid,
        install_source: CONFIG.PKG,
        iat: now
      }, CONFIG.X_SIG_SECRET, {
        algorithm: "HS256"
      });
      const auth = isAuth ? `Bearer ${jwt.sign({
sub: this.uid,
user_id: this.uid,
user_name: "",
iat: now
}, this.secret, {
algorithm: "HS256"
})}` : `Bearer ${this.token}`;
      return {
        Authorization: auth,
        "X-Signature": xSig,
        "User-Agent": `${CONFIG.PKG} ${CONFIG.VER}`,
        platform: "Android",
        package_name: CONFIG.PKG,
        ver: CONFIG.VER,
        UserId: this.uid,
        "Content-Type": "application/json"
      };
    } catch (e) {
      console.log("[Header Error]:", e.message);
      return {};
    }
  }
  async login() {
    try {
      const res = await this.http.post("user/login/", {}, {
        headers: this._getHeaders(true)
      });
      const d = res.data?.data || res.data;
      this.token = d.token;
      this.uid = d.uid || this.uid;
      if (this.token) console.log(`[✓] Auth Synced: ${this.uid}`);
      return d;
    } catch (e) {
      console.log("[Login Error]:", e.response?.data || e.message);
      return null;
    }
  }
  async _solve(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data).toString("base64");
        }
        return input.includes("base64,") ? input.split(",")[1] : input;
      }
      return null;
    } catch (e) {
      console.log("[Solve Error]:", e.message);
      return null;
    }
  }
  async generate({
    mode = "enhance",
    image,
    ...extra
  }) {
    try {
      if (!this.token) await this.login();
      const endpoint = MODES[mode];
      if (!endpoint) throw new Error(`Mode "${mode}" invalid/removed`);
      const base64Main = await this._solve(image);
      if (!base64Main) throw new Error("Image input failed to solve");
      const payload = {
        image: base64Main,
        ...extra
      };
      const res = await this.http.post(endpoint, payload, {
        headers: this._getHeaders(false)
      });
      const rawData = res.data?.data || res.data;
      const b64Result = rawData.image || rawData.image_url;
      if (!b64Result) {
        console.log(`[!] No image output for ${mode}`);
        return rawData;
      }
      const buffer = Buffer.from(b64Result, "base64");
      console.log(`[✓] ${mode.toUpperCase()} Success`);
      return {
        buffer: buffer,
        contentType: "image/jpeg"
      };
    } catch (e) {
      console.log(`[Generate Error - ${mode}]:`, e.response?.data || e.message);
      return {
        error: true,
        msg: e.message,
        raw: e.response?.data
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
  const api = new PhotoArtFX();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}