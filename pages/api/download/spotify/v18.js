import axios from "axios";
class SpotifyDL {
  constructor() {
    this.api = {
      meta: "https://spotify.dlapi.app/api/Gettrack",
      convert: "https://master.dlapi.app/api/v1/convert",
      task: "https://master.dlapi.app/api/v1/tasks"
    };
    this.client = axios.create({
      headers: {
        Authorization: "Bearer pGLXoCsVu0hcstAecIDwlrlbcrUzv0e1cWBJ0yuB",
        "Content-Type": "application/json",
        "User-Agent": "Spotmate/1.0"
      }
    });
  }
  log(type, msg) {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  valid(url) {
    return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/.test(url);
  }
  async meta(url) {
    this.log("META", `Processing: ${url}`);
    try {
      const {
        data
      } = await this.client.get(this.api.meta, {
        params: {
          spotify_url: url
        }
      });
      if (!data) throw new Error("API Data Empty");
      return data;
    } catch (e) {
      throw new Error(`Meta Error: ${e.response?.data?.message || e.message}`);
    }
  }
  async convert(url, format = "mp3") {
    this.log("CONVERT", `Initiating conversion... [${format}]`);
    try {
      const {
        data: init
      } = await this.client.post(this.api.convert, {
        url: url,
        format: format
      });
      if (init?.download_url) return init.download_url;
      const taskId = init?.task_id || init?.id;
      if (!taskId) throw new Error("No Task ID received");
      let attempts = 0;
      const maxAttempts = 60;
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 3e3));
        try {
          const {
            data: status
          } = await this.client.get(`${this.api.task}/${taskId}`);
          const progress = status?.progress ? ` [${status.progress}%]` : "";
          this.log("POLLING", `Status: ${status?.status || "processing"} (${attempts}/${maxAttempts})${progress}`);
          if (status?.status === "finished" || status?.status === "completed") {
            return status?.result?.download_url || status?.download_url;
          }
          if (status?.status === "failed") throw new Error("Server-side processing failed");
        } catch (e) {
          if (attempts > 5 && !e.response) throw e;
        }
      }
      throw new Error("Task Timeout");
    } catch (e) {
      throw new Error(`Convert Error: ${e.response?.data?.message || e.message}`);
    }
  }
  async download({
    url,
    format = "mp3"
  }) {
    try {
      if (!this.valid(url)) throw new Error("Invalid URL");
      const data = await this.meta(url);
      const isCollection = !!(data?.tracks?.items || Array.isArray(data?.tracks) && data.type !== "track");
      const type = data?.type || (isCollection ? "playlist" : "track");
      let result = null;
      if (type === "track") {
        const targetUrl = data?.external_urls?.spotify || url;
        result = await this.convert(targetUrl, format);
      }
      return {
        status: true,
        message: result ? "Download ready" : "Metadata ready",
        result: result,
        metadata: data
      };
    } catch (e) {
      this.log("ERROR", e.message);
      return {
        status: false,
        message: e.message,
        result: null
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
  const api = new SpotifyDL();
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