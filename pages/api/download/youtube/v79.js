import axios from "axios";
class EtaCloud {
  constructor() {
    this.endpoint = "etacloud.org";
    this.baseUrl = `https://eta.${this.endpoint}`;
    this.hostReferer = "y2mate.gs";
    this.pollConfig = {
      intervalMs: 3e3,
      maxAttempts: 60
    };
    this.avail = {
      fmt: ["mp4", "mp3"]
    };
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: `https://${this.hostReferer}`,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `https://${this.hostReferer}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cli = axios.create({
      timeout: 35e3,
      headers: this.baseHeaders
    });
    this.cli.interceptors.request.use(cfg => {
      try {
        console.log(`[REQ] > ${cfg?.method?.toUpperCase() || "GET"} ${cfg?.url}`);
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
  xId(u = "") {
    try {
      if (typeof u === "object" && u !== null) {
        u = u.url || u.link || "";
      }
      const raw = String(u || "").trim();
      if (!raw) return "";
      if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
      const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/;
      const m = raw.match(reg);
      return m && m[1] ? m[1] : null;
    } catch (err) {
      console.log(`[ERROR] Parsing ID failed: ${err?.message}`);
      return null;
    }
  }
  vld(f) {
    try {
      console.log("[PROCESS] Validating requested format...");
      const lowerF = String(f || "mp4").toLowerCase();
      const fmt = this.avail.fmt.includes(lowerF) ? lowerF : "mp4";
      return fmt;
    } catch (err) {
      console.log(`[ERROR] Format validation failed: ${err?.message}`);
      return "mp4";
    }
  }
  async getAuth() {
    try {
      console.log("[PROCESS] Requesting authorization key from EtaCloud...");
      const res = await this.cli.get(`${this.baseUrl}/api/v1/auth?_=${Date.now()}`);
      const resData = res?.data;
      if (resData?.error > 0 || !resData?.key) {
        console.log(`[ERROR] Auth failed: ${JSON.stringify(resData)}`);
        return null;
      }
      return {
        key: resData.key,
        geo: resData.geo || "0"
      };
    } catch (err) {
      console.log(`[ERROR] Auth request failed: ${err?.message}`);
      return null;
    }
  }
  async getInit(authKey) {
    try {
      console.log("[PROCESS] Initializing converter session...");
      const res = await this.cli.get(`${this.baseUrl}/api/v1/init?_=${Date.now()}`, {
        headers: {
          authorization: `Bearer ${authKey}`
        }
      });
      const resData = res?.data;
      if (resData?.error > 0 || !resData?.convertURL) {
        console.log(`[ERROR] Init failed: ${JSON.stringify(resData)}`);
        return null;
      }
      return resData.convertURL;
    } catch (err) {
      console.log(`[ERROR] Init request failed: ${err?.message}`);
      return null;
    }
  }
  async requestConvert(convertUrl, videoId, format) {
    try {
      console.log(`[PROCESS] Sending convert request for Video: [${videoId}] Format: [${format}]...`);
      let cleanConvertUrl = convertUrl;
      if (cleanConvertUrl.indexOf("&v=") > -1) {
        cleanConvertUrl = cleanConvertUrl.split("&v=")[0];
      }
      const res = await this.cli.get(`${cleanConvertUrl}&v=${videoId}&f=${format}&_=${Date.now()}`);
      const resData = res?.data;
      if (!resData || resData.error > 0) {
        console.log(`[ERROR] Convert error: ${resData?.error || "Unknown error"}`);
        return null;
      }
      if (resData.redirect === 1 && resData.redirectURL) {
        console.log("[PROCESS] Following converter redirect URL...");
        return await this.requestConvert(resData.redirectURL, videoId, format);
      }
      return resData;
    } catch (err) {
      console.log(`[ERROR] Convert request failed: ${err?.message}`);
      return null;
    }
  }
  async pollProgress(progressUrl, downloadUrl, videoId, format, maxAttempts = 60, intervalMs = 3e3) {
    try {
      console.log(`[PROCESS] Starting progress polling (Interval: ${intervalMs}ms, Max: ${maxAttempts} cycles)...`);
      const stages = ["checking video", "extracting video", "converting video", "completed"];
      let videoTitle = "";
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await this.cli.get(`${progressUrl}&_=${Date.now()}`);
        const resData = res?.data;
        if (!resData || resData.error > 0) {
          console.log(`[ERROR] Progress check returned error: ${resData?.error}`);
          return null;
        }
        if (resData.title && !videoTitle) {
          videoTitle = resData.title;
        }
        const currentProgress = typeof resData.progress === "number" ? resData.progress : 0;
        const stageName = stages[currentProgress] || "processing";
        console.log(`[POLL] [${attempt}/${maxAttempts}] Stage ${currentProgress}/3: ${stageName} - "${videoTitle || videoId}"`);
        if (currentProgress >= 3) {
          console.log("[PROCESS] Media conversion completed successfully!");
          const finalDownloadUrl = `${downloadUrl}&v=${videoId}&f=${format}&r=${this.hostReferer}`;
          return {
            title: resData.title || videoTitle,
            downloadUrl: finalDownloadUrl
          };
        }
        await this.delay(intervalMs);
      }
      console.log(`[ERROR] Conversion polling timed out after ${maxAttempts} attempts`);
      return null;
    } catch (err) {
      console.log(`[ERROR] Polling progress error: ${err?.message}`);
      return null;
    }
  }
  async download(input = {}) {
    try {
      let targetInput = "";
      let format = "mp4";
      let maxAttempts = this.pollConfig.maxAttempts;
      let intervalMs = this.pollConfig.intervalMs;
      if (typeof input === "string") {
        targetInput = input;
      } else if (typeof input === "object" && input !== null) {
        targetInput = input.url || input.link || "";
        format = input.format || "mp4";
        if (input.maxAttempts) maxAttempts = Number(input.maxAttempts);
        if (input.intervalMs) intervalMs = Number(input.intervalMs);
      }
      if (!targetInput) {
        return this.wrap(false, null, 'Parameter "url" is required');
      }
      const videoId = this.xId(targetInput);
      if (!videoId) {
        return this.wrap(false, null, "Invalid YouTube URL or Video ID");
      }
      const fmt = this.vld(format);
      const auth = await this.getAuth();
      if (!auth || !auth.key) {
        return this.wrap(false, null, "Failed to obtain authorization key from EtaCloud");
      }
      const convertUrl = await this.getInit(auth.key);
      if (!convertUrl) {
        return this.wrap(false, null, "Failed to initialize converter session URL");
      }
      const convertRes = await this.requestConvert(convertUrl, videoId, fmt);
      if (!convertRes || !convertRes.downloadURL && !convertRes.progressURL) {
        return this.wrap(false, null, "Converter did not return valid task URLs");
      }
      let finalTitle = convertRes?.title || "";
      let finalDownloadUrl = "";
      if (convertRes.downloadURL && !convertRes.progressURL) {
        finalDownloadUrl = `${convertRes.downloadURL}&v=${videoId}&f=${fmt}&r=${this.hostReferer}`;
      } else if (convertRes.progressURL) {
        const pollResult = await this.pollProgress(convertRes.progressURL, convertRes.downloadURL, videoId, fmt, maxAttempts, intervalMs);
        if (!pollResult || !pollResult.downloadUrl) {
          return this.wrap(false, null, "Conversion task timed out or failed on EtaCloud worker");
        }
        finalTitle = pollResult.title || finalTitle;
        finalDownloadUrl = pollResult.downloadUrl;
      }
      console.log(`[PROCESS] Successfully resolved download link for: "${finalTitle || videoId}"`);
      return this.wrap(true, {
        id: videoId,
        title: finalTitle || "YouTube Media",
        format: fmt,
        status: "completed",
        downloadUrl: finalDownloadUrl,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        directUrl: finalDownloadUrl
      });
    } catch (err) {
      console.log(`[ERROR] EtaCloud download process failed: ${err?.message || "Unknown error"}`);
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
  const api = new EtaCloud();
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