import axios from "axios";
import crypto from "crypto";
class Bypass {
  constructor() {
    this.did = crypto.randomBytes(32).toString("hex");
    this.base = "https://bypass.tools/api/mobile";
    this.token = null;
    this.h = {
      "User-Agent": "okhttp/4.9.2",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
    console.log(`📱 Device ID: ${this.did}`);
  }
  async init() {
    try {
      console.log("🔄 Init...");
      const {
        data
      } = await axios.post(`${this.base}/init`, {
        deviceId: this.did,
        platform: "android",
        appVersion: "0"
      }, {
        headers: this.h
      });
      console.log("📦", data);
      if (data.status !== "success") throw new Error(`Init failed: ${JSON.stringify(data)}`);
      this.token = data.sessionToken;
      console.log("✅ Token acquired");
    } catch (e) {
      console.error("❌ Init Error:", e.response?.data || e.message);
      throw e;
    }
  }
  async solve({
    url,
    forceRefresh = false
  } = {}) {
    try {
      if (!this.token) {
        console.log("🔑 No token, init...");
        await this.init();
      }
      console.log(`🚀 Bypass: ${url}`);
      const {
        data
      } = await axios.post(`${this.base}/bypass`, {
        url: url,
        forceRefresh: forceRefresh
      }, {
        headers: {
          ...this.h,
          "x-device-id": this.did,
          Authorization: `Bearer ${this.token}`
        }
      });
      console.log("📦", data);
      return data;
    } catch (e) {
      if (e.response?.status === 401) {
        console.warn("⚠️ Token expired, retry...");
        this.token = null;
        await this.init();
        return this.solve({
          url: url,
          forceRefresh: forceRefresh
        });
      }
      console.error("❌ Bypass Error:", e.response?.data || e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Bypass();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat memproses URL"
    });
  }
}