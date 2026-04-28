import axios from "axios";
class SpotifyDownloader {
  constructor() {
    this.cookies = "";
    this.tokens = {};
    this.base = "https://spotify.downloaderize.com";
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    this.client.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        this.cookies = setCookie.map(c => c.split(";")[0]).join("; ");
      }
      return res;
    }, err => {
      throw err;
    });
    this.client.interceptors.request.use(config => {
      if (this.cookies) config.headers["Cookie"] = this.cookies;
      return config;
    });
  }
  ln(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
  gn(data, key) {
    try {
      const startIdx = data.indexOf(key);
      if (startIdx === -1) return "";
      const label = 'nonce":"';
      const labelIdx = data.indexOf(label, startIdx);
      if (labelIdx === -1) return "";
      const vStart = labelIdx + label.length;
      const vEnd = data.indexOf('"', vStart);
      return data.substring(vStart, vEnd);
    } catch (e) {
      return "";
    }
  }
  async set() {
    try {
      this.ln("Initializing session & tokens...");
      const p = new URLSearchParams();
      const {
        data
      } = await this.client.get(`${this.base}/?${p.toString()}`);
      this.tokens = {
        search: this.gn(data, "sts_ajax"),
        dl: this.gn(data, "spotifyDownloader")
      };
      this.ln(`Tokens acquired: ${JSON.stringify(this.tokens)}`);
    } catch (e) {
      this.ln(`Set Process Error: ${e.message}`);
      throw e;
    }
  }
  async sr(q) {
    try {
      this.ln(`Search process started: ${q}`);
      const p = new URLSearchParams();
      p.append("action", "sts_search_spotify");
      p.append("query", q);
      p.append("security", this.tokens.search);
      const {
        data
      } = await this.client.get(`${this.base}/wp-admin/admin-ajax.php?${p.toString()}`);
      this.ln("Search process completed");
      return data?.data || data || null;
    } catch (e) {
      this.ln(`Search Process Error: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async inf(url) {
    try {
      this.ln(`Fetching info process: ${url}`);
      const p = new URLSearchParams();
      p.append("action", "spotify_downloader_get_info");
      p.append("url", url);
      p.append("nonce", this.tokens.dl);
      const {
        data
      } = await this.client.post(`${this.base}/wp-admin/admin-ajax.php`, p.toString());
      this.ln("Info process completed");
      return data?.data || data || null;
    } catch (e) {
      this.ln(`Info Process Error: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      if (!this.tokens.search) await this.set();
      const spotifyRegex = /^(https?:\/\/)?(open\.spotify\.com|spotify\.link)\//i;
      const isUrl = spotifyRegex.test(url || "");
      this.ln(`Routing request... Type: ${isUrl ? "Download" : "Search"}`);
      return isUrl ? await this.inf(url) : await this.sr(url || " ");
    } catch (e) {
      this.ln(`Fatal Download Error: ${e.message}`);
      return {
        success: false,
        error: e.message
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
  const api = new SpotifyDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}