import axios from "axios";
class EveryVideo {
  constructor() {
    this.api = "https://api.everyvideo.app/api";
    this.hdrs = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://www.everyvideo.app",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.everyvideo.app/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.axios = axios.create({
      headers: this.hdrs
    });
  }
  async meta(url) {
    try {
      console.log("[EVD_LOG] Get metadata...");
      const res = await this.axios.get(`${this.api}/metadata/preview`, {
        params: {
          url: url
        }
      });
      return res.data;
    } catch (e) {
      console.error("[EVD_ERR] Meta failed:", e.message);
      throw e;
    }
  }
  async start(p) {
    try {
      console.log("[EVD_LOG] Starting job...");
      const res = await this.axios.post(`${this.api}/dl/start`, p, {
        headers: {
          ...this.hdrs,
          "content-type": "application/json"
        }
      });
      return res.data;
    } catch (e) {
      console.error("[EVD_ERR] Start failed:", e.message);
      throw e;
    }
  }
  async download({
    url,
    quality = "1080p",
    maxAttempts = 60,
    ...rest
  }) {
    try {
      const data = await this.meta(url);
      const fmts = data?.video_formats || [];
      if (!fmts.length) throw new Error("No formats available");
      const target = fmts.find(f => f.quality?.toLowerCase() === quality.toLowerCase()) || fmts[0];
      console.log(`[EVD_LOG] Quality target: ${target.quality}`);
      const job = await this.start({
        url: url,
        format_id: target.format_id,
        format: target.ext || "mp4",
        title: data.title,
        ...rest
      });
      if (!job?.job_id) throw new Error("Job ID missing");
      const dlUrl = `${this.api}/dl/${job.job_id}/download`;
      let redirUrl = null;
      let attempts = 0;
      console.log("[EVD_LOG] Polling redirect...");
      while (!redirUrl && attempts < maxAttempts) {
        attempts++;
        try {
          const check = await this.axios.get(dlUrl, {
            headers: {
              ...this.hdrs,
              accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-site"
            },
            maxRedirects: 0,
            validateStatus: s => s >= 200 && s < 400
          });
          const type = check.headers["content-type"] || "";
          if (type.includes("application/json")) throw new Error("Still rendering");
          if (check.status >= 300 && check.status < 400 && check.headers.location) {
            redirUrl = check.headers.location;
            break;
          }
          if (check.status === 200 && !type.includes("application/json")) {
            redirUrl = dlUrl;
            break;
          }
        } catch {
          console.log(`[EVD_LOG] Wait attempt ${attempts}...`);
        }
        if (!redirUrl) {
          if (attempts >= maxAttempts) throw new Error("Polling timeout");
          await new Promise(r => setTimeout(r, 3e3));
        }
      }
      return {
        status: true,
        result: {
          ...data,
          selected_quality: target.quality,
          available_qualities: [...new Set(fmts.map(f => f.quality).filter(Boolean))],
          download_url: redirUrl
        }
      };
    } catch (e) {
      console.error("[EVD_ERR] Download pipeline broken:", e.message);
      return {
        status: false,
        result: e.message
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
  const api = new EveryVideo();
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