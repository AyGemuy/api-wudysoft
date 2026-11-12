import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
class YouTubeSaveIo {
  constructor() {
    this.baseUrl = "https://youtubesave.io";
    this.pollConfig = {
      intervalMs: 3e3,
      maxAttempts: 30
    };
    this.avail = {
      fmt: ["mp4", "mp3", "m4a", "webm"],
      vidQ: ["1080", "720", "480", "360", "240", "144"],
      audQ: ["129", "127"]
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
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
    this.cli = axios.create({
      baseURL: this.baseUrl,
      timeout: 35e3,
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
  delay(ms = 2e3) {
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
      const isAudio = lowerF === "mp3" || lowerF === "m4a" || lowerF === "audio" || lowerF === "webm";
      const cleanQ = String(q || "").replace(/p$/i, "").replace(/kbps$/i, "");
      let qual = "";
      if (!isAudio) {
        qual = this.avail.vidQ.includes(cleanQ) ? `${cleanQ}p` : "360p";
      } else {
        qual = cleanQ ? `${cleanQ}kbps` : "best";
      }
      return {
        fmt: isAudio ? "audio" : "mp4",
        qual: qual
      };
    } catch (err) {
      console.log(`[ERROR] Validation failed: ${err?.message}`);
      return {
        fmt: "mp4",
        qual: "360p"
      };
    }
  }
  async getSession() {
    try {
      console.log("[PROCESS] Fetching homepage session and CSRF token from youtubesave.io...");
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
        console.log("[ERROR] Failed to obtain CSRF token from youtubesave.io");
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
  async initiateTask(targetUrl, session = {}) {
    try {
      console.log(`[PROCESS] Initiating extraction task for: ${targetUrl}`);
      const form = new FormData();
      form.append("url", targetUrl);
      form.append("csrfmiddlewaretoken", session.csrfToken);
      const res = await this.cli.post("/", form, {
        headers: {
          ...form.getHeaders(),
          cookie: session.cookieHeader || `csrftoken=${session.csrfToken}`,
          referer: `${this.baseUrl}/`,
          origin: this.baseUrl
        }
      });
      const taskId = res?.data?.task_id;
      if (!taskId) {
        console.log(`[ERROR] Task initiation failed: ${JSON.stringify(res?.data)}`);
        return null;
      }
      return taskId;
    } catch (err) {
      console.log(`[ERROR] Initiate task failed: ${err?.message}`);
      return null;
    }
  }
  async pollTaskStatus(taskId, session = {}, maxAttempts = 30, intervalMs = 2e3) {
    try {
      console.log(`[PROCESS] Polling task status for Task ID: ${taskId}...`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await this.cli.get(`/api/status/?task_id=${taskId}`, {
          headers: {
            cookie: session.cookieHeader || `csrftoken=${session.csrfToken}`,
            referer: `${this.baseUrl}/`
          }
        });
        const statusData = res?.data;
        const status = statusData?.status || "processing";
        console.log(`[POLL] [${attempt}/${maxAttempts}] Task [${taskId}] status: ${status}`);
        if (status === "completed" && statusData?.template) {
          console.log("[PROCESS] Task completed successfully!");
          return statusData.template;
        }
        if (status === "failed" || status === "error") {
          console.log(`[ERROR] Task failed: ${statusData?.message || "Server error"}`);
          return null;
        }
        await this.delay(intervalMs);
      }
      console.log(`[ERROR] Polling timed out after ${maxAttempts} attempts`);
      return null;
    } catch (err) {
      console.log(`[ERROR] Polling error: ${err?.message}`);
      return null;
    }
  }
  parseHtmlTemplate(html = "") {
    try {
      if (!html) return null;
      const $ = cheerio.load(html);
      const title = $("h5.card-title").text().trim() || "YouTube Media";
      const thumbnail = $("img.img-fluid").attr("src") || "";
      const durationRaw = $("p.card-text").text().replace(/Duration:\s*/i, "").trim();
      const videos = [];
      const audios = [];
      $("li.list-group-item").each((_, el) => {
        const item = $(el);
        const nameEl = item.find(".text-truncate");
        if (!nameEl.length) return;
        const rawName = nameEl.clone().children().remove().end().text().trim();
        const size = item.find(".text-muted small").text().trim();
        const downloadUrl = item.find("a.btn").attr("href") || "";
        if (!downloadUrl) return;
        const isAudio = item.find(".bi-music-note-beamed").length > 0 || rawName.toLowerCase().includes("audio");
        const isMuted = item.find(".bi-volume-mute-fill").length > 0 || item.find('svg[title="No Sound"]').length > 0;
        const qualityMatch = rawName.match(/(\d+p|\d+kbps)/i);
        const extMatch = rawName.match(/\.(mp4|webm|m4a|mp3)/i);
        const quality = qualityMatch ? qualityMatch[1] : isAudio ? "Audio" : "Video";
        const ext = extMatch ? extMatch[1].toLowerCase() : isAudio ? "m4a" : "mp4";
        const mediaItem = {
          name: rawName,
          quality: quality,
          format: ext,
          size: size,
          hasAudio: !isMuted,
          downloadUrl: downloadUrl
        };
        if (isAudio) {
          audios.push(mediaItem);
        } else {
          videos.push(mediaItem);
        }
      });
      return {
        title: title,
        thumbnail: thumbnail,
        duration: durationRaw,
        videos: videos,
        audios: audios
      };
    } catch (err) {
      console.log(`[ERROR] Parsing HTML template failed: ${err?.message}`);
      return null;
    }
  }
  async download(input = {}) {
    try {
      let targetInput = "";
      let format = "mp4";
      let quality = "360";
      let maxAttempts = this.pollConfig.maxAttempts;
      let intervalMs = this.pollConfig.intervalMs;
      if (typeof input === "string") {
        targetInput = input;
      } else if (typeof input === "object" && input !== null) {
        targetInput = input.url || input.link || "";
        format = input.format || "mp4";
        quality = input.quality || "360";
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
        return this.wrap(false, null, "Failed to initialize session and CSRF token from youtubesave.io");
      }
      const taskId = await this.initiateTask(targetUrl, session);
      if (!taskId) {
        return this.wrap(false, null, "Failed to initiate extraction task on youtubesave.io");
      }
      const templateHtml = await this.pollTaskStatus(taskId, session, maxAttempts, intervalMs);
      if (!templateHtml) {
        return this.wrap(false, null, "Task extraction timed out or failed to render media list");
      }
      const parsedData = this.parseHtmlTemplate(templateHtml);
      if (!parsedData || !parsedData.videos.length && !parsedData.audios.length) {
        return this.wrap(false, null, "No playable media streams found in the parsed template");
      }
      console.log(`[PROCESS] Successfully loaded: "${parsedData.title}"`);
      let pickedStream = null;
      if (params.fmt === "mp4") {
        pickedStream = parsedData.videos.find(v => v?.quality?.toLowerCase() === params.qual.toLowerCase()) || parsedData.videos.find(v => v?.quality?.toLowerCase() === "720p") || parsedData.videos.find(v => v?.quality?.toLowerCase() === "360p") || parsedData.videos[0];
      } else {
        pickedStream = parsedData.audios.find(a => a?.format === "m4a") || parsedData.audios.find(a => a?.format === "webm") || parsedData.audios[0];
      }
      return this.wrap(true, {
        id: taskId,
        title: parsedData.title,
        duration: parsedData.duration,
        thumbnail: parsedData.thumbnail,
        selected: {
          name: pickedStream?.name || "",
          format: pickedStream?.format || params.fmt,
          quality: pickedStream?.quality || params.qual,
          filesize: pickedStream?.size || null,
          hasAudio: pickedStream?.hasAudio ?? true,
          downloadUrl: pickedStream?.downloadUrl || ""
        },
        availableVideos: parsedData.videos,
        availableAudios: parsedData.audios
      });
    } catch (err) {
      console.log(`[ERROR] youtubesave.io process failed: ${err?.message || "Unknown error"}`);
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
  const api = new YouTubeSaveIo();
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