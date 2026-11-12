import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
class YtdlLol {
  constructor() {
    this.baseUrl = "https://ytdl.lol";
    this.pollConfig = {
      intervalMs: 3e3,
      maxAttempts: 60
    };
    this.avail = {
      fmt: ["mp4", "mp3", "m4a", "video", "audio"],
      qualities: ["best", "high", "medium", "low", "worst"]
    };
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cli = axios.create({
      baseURL: this.baseUrl,
      timeout: 4e4,
      headers: this.baseHeaders
    });
    this.cli.interceptors.request.use(cfg => {
      try {
        const base = (cfg?.baseURL || "").replace(/\/+$/, "");
        const endpoint = (cfg?.url || "").replace(/^\/+/, "");
        console.log(`[REQ] > ${cfg?.method?.toUpperCase() || "POST"} ${base}/${endpoint}`);
      } catch (_) {}
      return cfg;
    }, err => {
      try {
        console.log(`[REQ-ERR] > ${err?.message || "Request Failed"}`);
      } catch (_) {}
      return Promise.reject(err);
    });
    this.cli.interceptors.response.use(res => {
      try {
        console.log(`[RES] < ${res?.status || 200} ${res?.config?.url}`);
      } catch (_) {}
      return res;
    }, err => {
      try {
        console.log(`[RES-ERR] < ${err?.response?.status || 500} - ${err?.message || "Response Error"}`);
      } catch (_) {}
      return Promise.reject(err);
    });
  }
  wrap(ok = false, data = null, msg = "") {
    try {
      return {
        status: ok ? "success" : "error",
        code: ok ? 200 : 400,
        message: msg || (ok ? "OK" : "Error"),
        data: data || null
      };
    } catch (err) {
      return {
        status: "error",
        code: 500,
        message: err?.message || "Failed to wrap response",
        data: null
      };
    }
  }
  delay(ms = 3e3) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  nUrl(u = "") {
    try {
      if (typeof u === "object" && u !== null) {
        u = u.url || u.link || "";
      }
      const raw = String(u || "").trim();
      if (!raw) return "";
      if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
        return `https://www.youtube.com/watch?v=${raw}`;
      }
      const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const m = raw.match(reg);
      if (m && m[1]) return `https://www.youtube.com/watch?v=${m[1]}`;
      return raw.startsWith("http") ? raw : `https://${raw}`;
    } catch (err) {
      console.log(`[ERROR] URL normalization failed: ${err?.message}`);
      return String(u || "");
    }
  }
  vld(f, q) {
    try {
      console.log("[PROCESS] Validating options...");
      const lowerF = String(f || "mp4").toLowerCase();
      const isAudio = lowerF === "mp3" || lowerF === "m4a" || lowerF === "audio";
      const action = isAudio ? "audio" : "video";
      const cleanQ = String(q || "best").toLowerCase();
      const quality = this.avail.qualities.includes(cleanQ) ? cleanQ : "best";
      return {
        action: action,
        quality: quality,
        format: isAudio ? "mp3" : "mp4"
      };
    } catch (err) {
      console.log(`[ERROR] Validation failed: ${err?.message}`);
      return {
        action: "video",
        quality: "best",
        format: "mp4"
      };
    }
  }
  async getSession() {
    try {
      console.log("[PROCESS] Fetching session & CSRF token...");
      const res = await this.cli.get("/", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const html = res?.data || "";
      const setCookies = res?.headers?.["set-cookie"] || [];
      const cookieHeader = setCookies.map(c => c.split(";")[0]).join("; ");
      const $ = cheerio.load(html);
      let csrfToken = $('input[name="csrfmiddlewaretoken"]').val() || "";
      if (!csrfToken) {
        const match = html.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
        if (match && match[1]) csrfToken = match[1];
      }
      if (!csrfToken) {
        const cookieMatch = cookieHeader.match(/csrftoken=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) csrfToken = cookieMatch[1];
      }
      if (!csrfToken) {
        console.log("[ERROR] Failed to obtain CSRF token");
        return null;
      }
      return {
        csrfToken: csrfToken,
        cookieHeader: cookieHeader
      };
    } catch (err) {
      console.log(`[ERROR] Session initialization failed: ${err?.message}`);
      return null;
    }
  }
  async initiateDownload(targetUrl, action = "video", quality = "best", session = {}) {
    try {
      console.log(`[PROCESS] Initiating download task for [${action.toUpperCase()} - ${quality}]...`);
      const form = new FormData();
      form.append("csrfmiddlewaretoken", session.csrfToken);
      form.append("yt_link", targetUrl);
      form.append("theme_val", "0");
      form.append("video_quality", quality);
      form.append("audio_quality", quality);
      form.append("action", action);
      const res = await this.cli.post("/initiate_download/", form, {
        headers: {
          ...form.getHeaders(),
          cookie: session.cookieHeader || `csrftoken=${session.csrfToken}`,
          "x-csrftoken": session.csrfToken,
          referer: `${this.baseUrl}/`,
          origin: this.baseUrl
        }
      });
      const taskId = res?.data?.task_id;
      if (!taskId) {
        console.log(`[ERROR] Task initiation did not return task_id: ${JSON.stringify(res?.data)}`);
        return null;
      }
      return taskId;
    } catch (err) {
      console.log(`[ERROR] Task initiation failed: ${err?.message}`);
      return null;
    }
  }
  async pollTaskStatus(taskId, session = {}, maxAttempts = 60, intervalMs = 3e3) {
    try {
      console.log(`[PROCESS] Starting auto-polling task [${taskId}] (Interval: ${intervalMs}ms, Max: ${maxAttempts} attempts)...`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await this.delay(intervalMs);
        const res = await this.cli.get(`/task_status/${taskId}/`, {
          headers: {
            cookie: session.cookieHeader || `csrftoken=${session.csrfToken}`,
            referer: `${this.baseUrl}/`
          }
        });
        const statusData = res?.data;
        if (!statusData) continue;
        const state = statusData?.state;
        const percent = statusData?.percent || 0;
        const statusMsg = statusData?.result?.status || statusData?.status || "Processing";
        console.log(`[POLL] [${attempt}/${maxAttempts}] Task [${taskId}] state: ${state} (${percent}%) - ${statusMsg}`);
        if (state === "SUCCESS") {
          console.log(`[PROCESS] Task completed successfully in attempt ${attempt}!`);
          return statusData;
        }
        if (state === "FAILURE") {
          console.log(`[ERROR] Task failed: ${statusData?.error || "Worker error"}`);
          return null;
        }
      }
      console.log(`[ERROR] Polling timed out after ${maxAttempts} attempts (${maxAttempts * intervalMs / 1e3}s)`);
      return null;
    } catch (err) {
      console.log(`[ERROR] Polling error: ${err?.message}`);
      return null;
    }
  }
  async download(input = {}) {
    try {
      let targetInput = "";
      let format = "mp4";
      let quality = "best";
      let maxAttempts = this.pollConfig.maxAttempts;
      let intervalMs = this.pollConfig.intervalMs;
      if (typeof input === "string") {
        targetInput = input;
      } else if (typeof input === "object" && input !== null) {
        targetInput = input.url || input.link || "";
        format = input.format || "mp4";
        quality = input.quality || "best";
        if (input.maxAttempts) maxAttempts = Number(input.maxAttempts);
        if (input.intervalMs) intervalMs = Number(input.intervalMs);
      }
      if (!targetInput) {
        return this.wrap(false, null, 'Parameter "url" is required');
      }
      const targetUrl = this.nUrl(targetInput);
      const params = this.vld(format, quality);
      const session = await this.getSession();
      if (!session) {
        return this.wrap(false, null, "Failed to initialize session & CSRF token from ytdl.lol");
      }
      const taskId = await this.initiateDownload(targetUrl, params.action, params.quality, session);
      if (!taskId) {
        return this.wrap(false, null, "Failed to initiate download task on ytdl.lol");
      }
      const resultData = await this.pollTaskStatus(taskId, session, maxAttempts, intervalMs);
      if (!resultData || !resultData.result) {
        return this.wrap(false, null, "Download task worker failed or timed out after 60 polling cycles");
      }
      const taskResult = resultData.result;
      const downloadReadyUrl = `${this.baseUrl}/download_ready/${taskId}/`;
      console.log(`[PROCESS] Download link ready: "${taskResult?.title || taskId}"`);
      return this.wrap(true, {
        id: taskId,
        title: taskResult?.title || "YouTube Media",
        ext: taskResult?.ext || params.format,
        format: params.format,
        action: params.action,
        quality: params.quality,
        status: taskResult?.status || "Finished",
        downloadUrl: downloadReadyUrl,
        directUrl: downloadReadyUrl,
        serverFilePath: taskResult?.file_path || ""
      });
    } catch (err) {
      console.log(`[ERROR] Download process failed: ${err?.message || "Unknown error"}`);
      return this.wrap(false, null, err?.response?.data?.message || err?.message || "Server error occurred");
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
  const api = new YtdlLol();
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