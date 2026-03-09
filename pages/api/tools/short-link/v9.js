import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class ShortUrl {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.base = "https://s.kemenham.go.id";
  }
  slug(len = 8) {
    return crypto.randomBytes(len).toString("hex").slice(0, len);
  }
  parse(raw) {
    try {
      const lines = raw?.split("\n")?.filter(l => l?.trim()) || [];
      const jsonLine = lines.find(l => l?.includes('{"success"')) || lines[lines.length - 1];
      const jsonStr = jsonLine?.split(":")?.slice(1)?.join(":") || jsonLine;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log(`[!] Parse error: ${e.message}`);
      return null;
    }
  }
  async generate({
    url,
    name,
    ...rest
  }) {
    const alias = name || this.slug();
    console.log(`[>] Generating: ${alias}`);
    try {
      const {
        data
      } = await this.client.post(this.base, JSON.stringify([{
        longUrl: url,
        alias: alias,
        isProtected: rest?.protected || false,
        password: rest?.password || "",
        retypePassword: rest?.password || ""
      }]), {
        headers: {
          accept: "text/x-component",
          "accept-language": "id-ID",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "40d1ae0bca1bdc46d34a2cf71b95a0bedc09f45a3e",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22(public)%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
          origin: this.base,
          referer: `${this.base}/`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const parsed = this.parse(data);
      const success = parsed?.success ?? false;
      const result = success ? `${this.base}/${alias}` : null;
      console.log(`[${success ? "✓" : "✗"}] ${success ? "Success" : parsed?.error || "Failed"}`);
      return {
        result: result,
        success: success,
        alias: alias
      };
    } catch (err) {
      console.log(`[!] Error: ${err?.message}`);
      return {
        result: null,
        success: false,
        error: err?.message,
        alias: alias
      };
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
  const api = new ShortUrl();
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