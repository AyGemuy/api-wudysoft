import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";
class AiMelody {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.email = null;
    this.deviceId = null;
    this.baseUrl = "https://api-melodyai.3bproductai.com/api";
    this.appId = "com.aimelody.generator";
    this._config = {
      improve: {
        required: ["prompt"]
      },
      enhance: {
        required: ["prompt"]
      },
      image: {
        required: ["image"]
      }
    };
  }
  _uuid() {
    return crypto.randomUUID();
  }
  _email(deviceId) {
    const secret = Buffer.from("emlPS1JUVzFXMktEdjlKR1IyQ2xLbUVqN0VWMnJFSXM=", "base64").toString("utf8");
    return crypto.createHmac("sha256", secret).update(`${deviceId}:${this.appId}`).digest("base64");
  }
  async _req(url, options = {}) {
    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...this.token && {
          Authorization: `Bearer ${this.token}`
        },
        ...options.headers
      };
      const response = await axios({
        url: url,
        ...options,
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error(`[API Error] Request ke ${url} gagal:`, error.message);
      if (error.response?.status === 401 && this.refreshToken) {
        console.log("[API] Token kedaluwarsa, mencoba refresh...");
        const refreshRes = await this._refresh();
        if (!refreshRes.success) return refreshRes;
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${this.token}`
        };
        try {
          const retry = await axios({
            url: url,
            ...options
          });
          return retry.data;
        } catch (retryError) {
          return {
            success: false,
            error: retryError.message
          };
        }
      }
      return {
        success: false,
        error: error.message,
        detail: error.response?.data
      };
    }
  }
  async _refresh() {
    try {
      console.log("[Process] Menyegarkan token...");
      const params = new URLSearchParams({
        refreshToken: this.refreshToken
      });
      const res = await axios.post(`${this.baseUrl}/v1/user/refresh`, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Bearer ${this.refreshToken}`
        }
      });
      if (res.data?.status === "success" && res.data?.data) {
        this.token = res.data.data.token;
        this.refreshToken = res.data.data.refreshToken;
        console.log("[Success] Token berhasil diperbarui.");
        return {
          success: true
        };
      }
      return {
        success: false,
        error: res.data?.message || "Gagal refresh token"
      };
    } catch (error) {
      console.error("[Error] Proses refresh token gagal:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async _solveImg(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("data:image")) {
        const base64Data = input.split(",")[1] || input;
        return Buffer.from(base64Data, "base64");
      }
      if (typeof input === "string" && input.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(input) && !input.startsWith("http")) {
        return Buffer.from(input, "base64");
      }
      if (typeof input === "string" && input.startsWith("http")) {
        console.log(`[Process] Mendownload gambar dari URL: ${input}`);
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      return null;
    } catch (error) {
      console.error("[Error] Gagal memproses input gambar:", error.message);
      return null;
    }
  }
  _validate(mode, args) {
    const validModes = Object.keys(this._config);
    if (!validModes.includes(mode)) {
      return {
        valid: false,
        msg: `Mode "${mode}" tidak valid. Pilih: ${validModes.join(", ")}`
      };
    }
    const requiredFields = this._config[mode].required;
    for (const field of requiredFields) {
      if (!args[field]) {
        return {
          valid: false,
          msg: `Parameter "${field}" wajib diisi untuk mode "${mode}"`
        };
      }
    }
    return {
      valid: true
    };
  }
  async register(deviceId = this._uuid()) {
    try {
      console.log(`[Process] Memulai registrasi device: ${deviceId}`);
      this.deviceId = deviceId;
      this.email = this._email(deviceId);
      const params = new URLSearchParams({
        email: this.email,
        device_id: this.deviceId,
        type: "guest",
        deviceName: "My Android Device",
        avatar: "default_avatar",
        tokenAuth: this.deviceId,
        fbId: this.deviceId,
        name: "Guest User",
        appId: this.appId,
        os: "android",
        version: "1.2.0"
      });
      const res = await axios.post(`${this.baseUrl}/v1/user/register`, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        }
      });
      if (res.data?.status === "success" && res.data?.data) {
        this.token = res.data.data.token;
        this.refreshToken = res.data.data.refreshToken;
        console.log("[Success] Registrasi berhasil.");
        return {
          success: true,
          data: res.data.data
        };
      }
      return {
        success: false,
        error: res.data?.message || "Registrasi gagal"
      };
    } catch (error) {
      console.error("[Error] Proses registrasi gagal:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async generate({
    mode,
    prompt,
    image,
    ...rest
  }) {
    try {
      const check = this._validate(mode, {
        prompt: prompt,
        image: image
      });
      if (!check.valid) {
        console.error(`[Validation Error] ${check.msg}`);
        return {
          success: false,
          error: check.msg
        };
      }
      console.log(`[Process] Menjalankan generate mode: ${mode}`);
      if (!this.token) {
        const auth = await this.register();
        if (!auth.success) return auth;
      }
      switch (mode) {
        case "improve": {
          const res = await this._req(`${this.baseUrl}/v3/lyric/generate`, {
            method: "POST",
            data: {
              prompt: prompt,
              request_id: rest.requestId || "1"
            }
          });
          return res;
        }
        case "enhance": {
          const res = await this._req(`${this.baseUrl}/v3/lyric/prompts-enhance`, {
            method: "POST",
            data: {
              prompt: prompt,
              request_id: rest.requestId || Date.now().toString()
            }
          });
          return res;
        }
        case "image": {
          const form = new FormData();
          const imgBuffer = await this._solveImg(image);
          if (!imgBuffer) {
            return {
              success: false,
              error: "Format gambar tidak valid atau gagal diunduh."
            };
          }
          form.append("images", imgBuffer, {
            filename: rest.filename || "image.jpg"
          });
          form.append("request_id", rest.requestId || Date.now().toString());
          form.append("output_language", rest.langCode || "en");
          if (rest.mood) form.append("mood", rest.mood);
          const res = await this._req(`${this.baseUrl}/v3/lyric/prompts-image`, {
            method: "POST",
            data: form,
            headers: form.getHeaders()
          });
          return res;
        }
        default:
          return {
            success: false,
              error: "Mode tidak diketahui."
          };
      }
    } catch (error) {
      console.error(`[Error] Gagal menjalankan generate mode ${mode}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AiMelody();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}