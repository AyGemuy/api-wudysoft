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
    try {
      console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
    } catch (e) {
      console.error(e?.message || e);
    }
  }
  async meta(url) {
    try {
      this.log("META", `Processing: ${url}`);
      const {
        data
      } = await this.client.get(this.api.meta, {
        params: {
          spotify_url: url
        }
      });
      if (!data) {
        return {
          status: false,
          message: "API Data Empty"
        };
      }
      return {
        status: true,
        data: data
      };
    } catch (e) {
      return {
        status: false,
        message: `Meta Error: ${e.response?.data?.message || e.message || "Unknown error"}`
      };
    }
  }
  async convert(url, format = "mp3") {
    try {
      this.log("CONVERT", `Initiating conversion... [${format}]`);
      const {
        data: init
      } = await this.client.post(this.api.convert, {
        url: url,
        format: format
      });
      if (init?.download_url) {
        return {
          status: true,
          download_url: init.download_url
        };
      }
      const taskId = init?.task_id || init?.id;
      if (!taskId) {
        return {
          status: false,
          message: "No Task ID received"
        };
      }
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
            return {
              status: true,
              download_url: status?.result?.download_url || status?.download_url || null
            };
          }
          if (status?.status === "failed") {
            return {
              status: false,
              message: "Server-side processing failed"
            };
          }
        } catch (e) {
          if (attempts > 5 && !e.response) {
            return {
              status: false,
              message: `Polling Error: ${e.message}`
            };
          }
        }
      }
      return {
        status: false,
        message: "Task Timeout"
      };
    } catch (e) {
      return {
        status: false,
        message: `Convert Error: ${e.response?.data?.message || e.message || "Unknown error"}`
      };
    }
  }
  async download({
    url,
    format = "mp3"
  }) {
    try {
      if (!url) {
        return {
          status: false,
          message: "URL is required",
          result: null
        };
      }
      const metaRes = await this.meta(url);
      if (!metaRes?.status) {
        this.log("ERROR", metaRes?.message);
        return {
          status: false,
          message: metaRes?.message || "Failed to fetch metadata",
          result: null
        };
      }
      const data = metaRes.data;
      const isCollection = !!(data?.tracks?.items || Array.isArray(data?.tracks) && data.type !== "track");
      const type = data?.type || (isCollection ? "playlist" : "track");
      let result = null;
      if (type === "track") {
        const targetUrl = data?.external_urls?.spotify || url;
        const convRes = await this.convert(targetUrl, format);
        if (!convRes?.status) {
          this.log("ERROR", convRes?.message);
          return {
            status: false,
            message: convRes?.message || "Failed to convert track",
            result: null,
            metadata: data
          };
        }
        result = convRes.download_url;
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
        message: e.message || "Unknown error occurred",
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params?.url) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'url' diperlukan"
      });
    }
    const api = new SpotifyDL();
    const data = await api.download(params);
    const statusCode = data?.status ? 200 : 400;
    return res.status(statusCode).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}