import axios from "axios";
import * as cheerio from "cheerio";
class HostCry {
  constructor() {
    this.base = "https://hostcry.com";
    this.api = axios.create({
      baseURL: `${this.base}/api`,
      timeout: 6e4,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
        Referer: `${this.base}/tools/malware-checker`
      }
    });
    this.endpoints = ["check-blacklist", "analyze-software", "check-security", "scan-malware"];
  }
  log(s, m, ok = true) {
    console.log(`[${ok ? "🛡️" : "⚠️"}][${s}] ${m}`);
  }
  async getCsrf() {
    try {
      this.log("AUTH", "Fetching CSRF Token...");
      const {
        data,
        headers
      } = await axios.get(`${this.base}/tools/malware-checker`, {
        headers: this.api.defaults.headers
      });
      const $ = cheerio.load(data);
      const token = $('meta[name="csrf-token"]').attr("content") || $('input[name="_token"]').val();
      const cookie = headers["set-cookie"]?.join("; ");
      if (!token) throw new Error("CSRF Token not found");
      this.api.defaults.headers["X-CSRF-TOKEN"] = token;
      this.api.defaults.headers["Cookie"] = cookie;
      this.log("AUTH", "CSRF Token secured", true);
      return token;
    } catch (e) {
      this.log("AUTH", `Failed: ${e.message}`, false);
      return null;
    }
  }
  async check({
    url,
    ...rest
  }) {
    try {
      if (!this.api.defaults.headers["X-CSRF-TOKEN"]) {
        await this.getCsrf();
      }
      const raw = url || rest.url || "";
      const link = raw.startsWith("http") ? raw : `https://${raw}`;
      const target = new URL(link).hostname || raw;
      this.log("START", `Target: ${target}`);
      const results = {};
      for (const path of this.endpoints) {
        try {
          const {
            data
          } = await this.api.post(path, {
            url: target,
            ...rest
          });
          results[path.split("-")?.pop()] = data;
          this.log("STEP", `Done: ${path}`);
        } catch (err) {
          if (err.response?.status === 419) {
            this.log("RETRY", "Session expired, refreshing token...");
            await this.getCsrf();
            continue;
          }
          this.log("SKIP", `${path}: ${err.message}`, false);
          continue;
        }
      }
      this.log("FINISH", `Completed for ${target}`, true);
      return {
        target: target,
        ...results
      };
    } catch (e) {
      this.log("FATAL", e.message, false);
      return {
        error: true,
        msg: e.message
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
  const api = new HostCry();
  try {
    const data = await api.check(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}