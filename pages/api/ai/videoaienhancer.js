import axios from "axios";
import FormData from "form-data";
class VideoEnhancer {
  constructor() {
    try {
      this.baseUrl = "https://videoaienhancer.mixapps.site";
      this.modes = ["brightness", "stabilization", "interpolation", "denoise"];
      this.levels = {
        brightness: ["low", "medium", "high"],
        stabilization: ["low", "medium", "high"],
        denoise: ["low", "medium", "high"],
        interpolation: ["low", "smooth", "fluid"]
      };
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: 12e4
      });
    } catch (err) {
      console.log("[LOG] Constructor initialization error:", err?.message || err);
    }
  }
  _hdr() {
    try {
      return {
        "User-Agent": "okhttp/4.12.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      };
    } catch (err) {
      console.log("[LOG] Header generation error:", err?.message || err);
      return {};
    }
  }
  _fmtLen(bytes) {
    try {
      if (!bytes || bytes <= 0) return "0 B";
      const units = ["B", ..."KMGPT".split("").map(u => `${u}B`)];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i] || "B"}`;
    } catch {
      return "0 B";
    }
  }
  async _med(input) {
    try {
      if (!input) return null;
      console.log("[LOG] Resolving media input...");
      let buffer = null;
      let filename = "video.mp4";
      let contentType = "video/mp4";
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log("[LOG] Fetching remote media URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          contentType = res.headers?.["content-type"] || contentType;
          buffer = Buffer.from(res.data);
        } else if (input.includes(";base64,")) {
          const parts = input.split(";base64,");
          contentType = parts[0]?.slice(5) || contentType;
          buffer = Buffer.from(parts[1] || "", "base64");
        } else {
          buffer = Buffer.from(input, "base64");
        }
      } else if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === "object") {
        const raw = input?.data || input?.buffer || input;
        buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw || "");
        contentType = input?.mimeType || input?.contentType || contentType;
        filename = input?.filename || filename;
      }
      return {
        buffer: buffer,
        filename: filename,
        contentType: contentType
      };
    } catch (err) {
      console.log("[LOG] Failed resolving media:", err?.message || err);
      return null;
    }
  }
  async _prg(taskId, delay = 3e3, maxDuration = 36e5) {
    try {
      if (!taskId) return false;
      console.log(`[LOG] 1. Polling progress for task: ${taskId} (max duration: 1 hour)`);
      const startTime = Date.now();
      let attempt = 0;
      while (true) {
        if (Date.now() - startTime > maxDuration) {
          console.log("[LOG] Progress polling timed out (reached 1 hour limit).");
          return false;
        }
        attempt++;
        await new Promise(r => setTimeout(r, delay));
        const response = await this.client.get(`/progress/${taskId}`, {
          headers: this._hdr()
        });
        const data = response?.data || {};
        const status = data?.status || data?.stage;
        const progress = data?.progress ?? data?.stage_progress ?? 0;
        const framesProc = data?.frames_processed || 0;
        const framesTot = data?.frames_total || 0;
        const err = data?.error;
        if (err) {
          console.log(`[LOG] Task processing failed with error: ${err}`);
          return false;
        }
        console.log(`[LOG] Polling #${attempt} | Progress: ${progress}% | Stage: ${status || "processing"} | Frames: ${framesProc}/${framesTot}`);
        if (status === "completed" || progress >= 100) {
          console.log("[LOG] Task processing complete on /progress.");
          return true;
        }
      }
    } catch (err) {
      console.log("[LOG] Progress polling error:", err?.message || err);
      return false;
    }
  }
  async _res(taskId) {
    try {
      if (!taskId) return null;
      console.log(`[LOG] 2. Fetching result metadata for task: ${taskId}`);
      const response = await this.client.get(`/result/${taskId}`, {
        headers: this._hdr()
      });
      return response?.data || null;
    } catch (err) {
      console.log("[LOG] Get result error:", err?.message || err);
      return null;
    }
  }
  async _dl(taskId) {
    try {
      if (!taskId) return {
        url: `${this.baseUrl}/download/processed/${taskId}`,
        length: "0 B"
      };
      console.log(`[LOG] 3. Fetching HEAD info for processed video: ${taskId}`);
      const downloadUrl = `${this.baseUrl}/download/processed/${taskId}`;
      const response = await this.client.head(`/download/processed/${taskId}`, {
        headers: this._hdr()
      });
      const bytes = parseInt(response?.headers?.["content-length"] || 0, 10);
      return {
        url: downloadUrl,
        length: this._fmtLen(bytes)
      };
    } catch (err) {
      console.log("[LOG] HEAD request error:", err?.message || err);
      return {
        url: `${this.baseUrl}/download/processed/${taskId}`,
        length: "0 B"
      };
    }
  }
  async _cfm(taskId) {
    try {
      if (!taskId) return false;
      console.log(`[LOG] 4. Confirming download for task: ${taskId}`);
      const res = await this.client.post(`/confirm_download/${taskId}`, {}, {
        headers: this._hdr()
      });
      return res?.data?.status === "confirmed" || res?.status === 200;
    } catch (err) {
      console.log("[LOG] Confirm download error:", err?.message || err);
      return false;
    }
  }
  async generate({
    mode = "denoise",
    media = null,
    level = "low",
    ...rest
  } = {}) {
    const startTime = Date.now();
    try {
      const selectedMode = mode || "denoise";
      if (!this.modes.includes(selectedMode)) {
        console.log(`[LOG] Invalid mode: ${selectedMode}. Available modes: ${this.modes.join(", ")}`);
        return {
          status: false,
          result: null,
          time: "0s",
          length: "0 B",
          mode: selectedMode
        };
      }
      if (!media) {
        console.log("[LOG] Media input is required.");
        return {
          status: false,
          result: null,
          time: "0s",
          length: "0 B",
          mode: selectedMode
        };
      }
      const validLevels = this.levels[selectedMode] || ["low", "medium", "high"];
      const selectedLevel = level || "low";
      if (!validLevels.includes(selectedLevel)) {
        console.log(`[LOG] Invalid level "${selectedLevel}" for mode "${selectedMode}". Available levels: ${validLevels.join(", ")}`);
        return {
          status: false,
          result: null,
          time: "0s",
          length: "0 B",
          mode: selectedMode
        };
      }
      console.log(`[LOG] Starting video processing | Mode: ${selectedMode} | Level: ${selectedLevel}`);
      const mediaObj = await this._med(media);
      if (!mediaObj?.buffer) {
        console.log("[LOG] Invalid or unresolvable media input.");
        return {
          status: false,
          result: null,
          time: "0s",
          length: "0 B",
          mode: selectedMode
        };
      }
      const form = new FormData();
      form.append("level", selectedLevel);
      form.append("video", mediaObj.buffer, {
        filename: mediaObj.filename || "video.mp4",
        contentType: mediaObj.contentType || "video/mp4"
      });
      const endpoint = `/${selectedMode}`;
      console.log(`[LOG] Uploading payload to ${this.baseUrl}${endpoint}...`);
      const headers = {
        ...this._hdr(),
        ...form.getHeaders(),
        ...rest?.headers || {}
      };
      const resUpload = await this.client.post(endpoint, form, {
        headers: headers
      });
      const taskId = resUpload?.data?.task_id;
      if (!taskId) {
        console.log("[LOG] Task ID not received.");
        return {
          status: false,
          result: null,
          time: `${((Date.now() - startTime) / 1e3).toFixed(2)}s`,
          length: "0 B",
          mode: selectedMode
        };
      }
      console.log(`[LOG] Task initialized: ${taskId}`);
      const isReady = await this._prg(taskId, rest?.delay || 3e3, rest?.maxDuration || 36e5);
      if (!isReady) {
        console.log("[LOG] Task progress failed or timed out.");
        return {
          status: false,
          result: null,
          time: `${((Date.now() - startTime) / 1e3).toFixed(2)}s`,
          length: "0 B",
          mode: selectedMode
        };
      }
      const resultMeta = await this._res(taskId);
      console.log("[LOG] Result metadata retrieved:", resultMeta);
      const downloadData = await this._dl(taskId);
      await this._cfm(taskId);
      const finalUrl = downloadData.url || `${this.baseUrl}/download/processed/${taskId}`;
      const totalTime = `${((Date.now() - startTime) / 1e3).toFixed(2)}s`;
      console.log("[LOG] Video process completed successfully.");
      return {
        status: true,
        result: finalUrl,
        time: totalTime,
        length: downloadData.length || "0 B",
        mode: selectedMode
      };
    } catch (err) {
      console.log("[LOG] Enhancement execution error:", err?.message || err);
      return {
        status: false,
        result: null,
        time: `${((Date.now() - startTime) / 1e3).toFixed(2)}s`,
        length: "0 B",
        mode: mode || "denoise"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.media) {
    return res.status(400).json({
      error: "Parameter 'media' diperlukan"
    });
  }
  const api = new VideoEnhancer();
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