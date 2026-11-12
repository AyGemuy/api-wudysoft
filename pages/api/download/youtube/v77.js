import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
class YtSave {
  constructor() {
    this.baseUrl = "https://ytsave.to";
    this.mintKey = "bf735103af6bb295633270b05a7b0a42";
    this.pollConfig = {
      intervalMs: 3e3,
      maxAttempts: 30
    };
    this.avail = {
      fmt: ["mp4", "mp3", "m4a"],
      vidQ: ["1080", "720", "480", "360", "240", "144"],
      audQ: ["128", "48"]
    };
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseUrl}/en2/`,
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
  delay(ms = 2500) {
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
      const fmt = this.avail.fmt.includes(f?.toLowerCase()) ? f.toLowerCase() : "mp4";
      const cleanQ = String(q || "").replace(/p$/i, "").replace(/k$/i, "");
      let qual = "";
      if (fmt === "mp4") {
        qual = this.avail.vidQ.includes(cleanQ) ? `${cleanQ}p` : "360p";
      } else {
        qual = this.avail.audQ.includes(cleanQ) ? `${cleanQ}k` : "128k";
      }
      return {
        fmt: fmt,
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
  computeAnswer(ch = "") {
    try {
      return crypto.createHmac("sha256", this.mintKey).update(ch).digest("hex").slice(0, 32);
    } catch (err) {
      console.log(`[ERROR] Compute challenge answer failed: ${err?.message}`);
      return null;
    }
  }
  async getMintSession() {
    try {
      console.log("[PROCESS] Fetching homepage session & challenge token...");
      const homeRes = await this.cli.get("/en2/", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const setCookies = homeRes?.headers?.["set-cookie"] || [];
      const cookieHeader = setCookies.map(c => c.split(";")[0]).join("; ");
      const html = homeRes?.data || "";
      const $ = cheerio.load(html);
      let ch = $("script[data-ch]").attr("data-ch") || "";
      if (!ch) {
        console.log("[PROCESS] Requesting dynamic challenge token...");
        const getChRes = await this.cli.post("/mint.php", "getch=1", {
          headers: {
            cookie: cookieHeader
          }
        });
        ch = getChRes?.data?.ch || "";
      }
      if (!ch) {
        console.log("[ERROR] Failed to obtain challenge (ch) from ytsave.to");
        return null;
      }
      const answer = this.computeAnswer(ch);
      if (!answer) return null;
      console.log("[PROCESS] Minting dynamic security token (dt)...");
      const mintPayload = new URLSearchParams({
        ch: ch,
        answer: answer
      }).toString();
      const mintRes = await this.cli.post("/mint.php", mintPayload, {
        headers: {
          cookie: cookieHeader,
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const dt = mintRes?.data?.dt;
      if (!dt) {
        console.log("[ERROR] Failed to obtain dynamic security token (dt)");
        return null;
      }
      return {
        dt: dt,
        cookieHeader: cookieHeader
      };
    } catch (err) {
      console.log(`[ERROR] Mint session initialization failed: ${err?.message}`);
      return null;
    }
  }
  async extractMetadata(targetUrl, session = {}) {
    try {
      console.log(`[PROCESS] Extracting metadata via proxy.php for: ${targetUrl}`);
      const payload = new URLSearchParams({
        url: targetUrl,
        dt: session.dt
      }).toString();
      const res = await this.cli.post("/proxy.php", payload, {
        headers: {
          cookie: session.cookieHeader
        }
      });
      const apiData = res?.data?.api;
      if (!apiData || apiData.status !== "ok") {
        console.log(`[ERROR] Proxy extraction failed: ${res?.data?.api?.message || "Invalid response"}`);
        return null;
      }
      return apiData;
    } catch (err) {
      console.log(`[ERROR] Extract metadata failed: ${err?.message}`);
      return null;
    }
  }
  async pollConvertMedia(mediaUrl, session = {}, maxAttempts = 30, intervalMs = 2500) {
    try {
      console.log(`[PROCESS] Starting conversion polling for: ${mediaUrl}`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const payload = new URLSearchParams({
          url: mediaUrl,
          dt: session.dt
        }).toString();
        const res = await this.cli.post("/proxy.php", payload, {
          headers: {
            cookie: session.cookieHeader
          }
        });
        const apiResult = res?.data?.api;
        const status = apiResult?.status || "processing";
        const progress = apiResult?.progress || apiResult?.percent || "Waiting";
        console.log(`[POLL] [${attempt}/${maxAttempts}] Conversion status: ${status} (${progress})`);
        if (status === "completed" && apiResult?.fileUrl) {
          console.log("[PROCESS] File conversion finished successfully!");
          return apiResult;
        }
        if (status === "error" || status === "failed") {
          console.log(`[ERROR] Conversion failed on server: ${apiResult?.message || "Unknown"}`);
          return null;
        }
        await this.delay(intervalMs);
      }
      console.log(`[ERROR] Conversion timed out after ${maxAttempts} polling cycles`);
      return null;
    } catch (err) {
      console.log(`[ERROR] Polling conversion failed: ${err?.message}`);
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
      const session = await this.getMintSession();
      if (!session) {
        return this.wrap(false, null, "Failed to mint security token from ytsave.to");
      }
      const metadata = await this.extractMetadata(targetUrl, session);
      if (!metadata || !metadata.mediaItems?.length) {
        return this.wrap(false, null, "No media items found for the given URL");
      }
      const mediaItems = metadata.mediaItems || [];
      console.log(`[PROCESS] Successfully loaded: "${metadata?.title || "Unknown Title"}"`);
      const videoItems = mediaItems.filter(m => m?.type?.toLowerCase() === "video");
      const audioItems = mediaItems.filter(m => m?.type?.toLowerCase() === "audio");
      let pickedItem = null;
      if (params.fmt === "mp4") {
        pickedItem = videoItems.find(v => v?.mediaUrl?.toLowerCase().endsWith(`/${params.qual}`)) || videoItems.find(v => v?.mediaUrl?.toLowerCase().endsWith("/720p")) || videoItems.find(v => v?.mediaUrl?.toLowerCase().endsWith("/360p")) || videoItems[0];
      } else {
        const isMp3 = params.fmt === "mp3";
        pickedItem = audioItems.find(a => a?.mediaExtension?.toLowerCase() === params.fmt && a?.mediaUrl?.toLowerCase().endsWith(`/${params.qual}`)) || audioItems.find(a => isMp3 ? a?.mediaExtension?.toLowerCase() === "mp3" : a?.mediaExtension?.toLowerCase() === "m4a") || audioItems[0];
      }
      if (!pickedItem || !pickedItem.mediaUrl) {
        return this.wrap(false, null, "Target format or quality could not be selected");
      }
      const finalResult = await this.pollConvertMedia(pickedItem.mediaUrl, session, maxAttempts, intervalMs);
      if (!finalResult || !finalResult.fileUrl) {
        return this.wrap(false, null, "Failed to generate direct download link (polling timed out or failed)");
      }
      return this.wrap(true, {
        id: metadata?.id || "",
        title: metadata?.title || "",
        author: metadata?.userInfo?.name || "",
        channelUrl: metadata?.userInfo?.internalUrl || "",
        duration: pickedItem?.mediaDuration || "",
        thumbnail: metadata?.imagePreviewUrl || pickedItem?.mediaThumbnail || "",
        selected: {
          format: pickedItem?.mediaExtension?.toLowerCase() || params.fmt,
          quality: pickedItem?.mediaQuality || params.qual,
          resolution: pickedItem?.mediaRes || false,
          filesize: finalResult?.fileSize || pickedItem?.mediaFileSize || null,
          fileName: finalResult?.fileName || "",
          downloadUrl: finalResult?.fileUrl || "",
          viewUrl: finalResult?.viewUrl || null
        },
        availableVideos: videoItems.map(v => ({
          quality: v?.mediaQuality,
          resolution: v?.mediaRes,
          format: v?.mediaExtension,
          filesize: v?.mediaFileSize,
          mediaUrl: v?.mediaUrl
        })),
        availableAudios: audioItems.map(a => ({
          quality: a?.mediaQuality,
          format: a?.mediaExtension,
          filesize: a?.mediaFileSize,
          mediaUrl: a?.mediaUrl
        })),
        captions: metadata?.captions || []
      });
    } catch (err) {
      console.log(`[ERROR] ytsave.to process failed: ${err?.message || "Unknown error"}`);
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
  const api = new YtSave();
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