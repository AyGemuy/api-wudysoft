import axios from "axios";
import CryptoJS from "crypto-js";
class SaveVideo {
  constructor() {
    this.key = "fa6a6248652a451a84f23262d9631145";
    this.url = "https://demo.rapidapi.app";
    this.ep = "/api/detail";
    this.bid = "com.saveinsta.app.savevideo.saveclip";
    this.http = axios.create({
      baseURL: this.url,
      timeout: 6e4,
      headers: {
        "User-Agent": "SaveVideo (Android)",
        Accept: "application/json",
        "api-version": "v3000",
        "bundle-id": this.bid,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
  }
  _exp() {
    const offset = Math.floor(Math.random() * 2001) + 1e3;
    return Math.floor(Date.now() / 1e3) + offset;
  }
  _token(exp) {
    const msg = JSON.stringify({
      expires: exp,
      device: "Android"
    });
    return CryptoJS.HmacSHA256(msg, this.key).toString();
  }
  async download({
    url
  }) {
    try {
      const exp = this._exp();
      const token = this._token(exp);
      const body = new URLSearchParams({
        url: url,
        v_exp: exp,
        v_token: token
      });
      const {
        data
      } = await this.http.post(this.ep, body.toString());
      return data;
    } catch (err) {
      console.error("[Error]", err.response?.data || err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SaveVideo();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}