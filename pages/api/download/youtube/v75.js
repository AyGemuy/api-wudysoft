import axios from "axios";
class VidsSave {
  constructor() {
    this.apiBase = "https://api.vidssave.com/api/contentsite_api";
    this.authKey = "20250901majwlqo";
    this.domain = "api-ak.vidssave.com";
    this.avail = {
      fmt: ["mp4", "mp3", "m4a"],
      vidQ: ["1080", "720", "480", "360", "240", "144"],
      audQ: ["256", "128", "48"]
    };
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://pk.vidssave.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://pk.vidssave.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cli = axios.create({
      baseURL: this.apiBase,
      timeout: 3e4,
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
  buildPayload(path = "", data = {}) {
    try {
      const dataObj = {
        auth: this.authKey,
        domain: this.domain,
        ...data
      };
      const bodyStr = new URLSearchParams(dataObj).toString();
      return {
        reqUrl: `${this.apiBase}/${path.replace(/^\/+/, "")}`,
        bodyStr: bodyStr
      };
    } catch (err) {
      console.log(`[ERROR] Build payload failed: ${err?.message}`);
      return {
        reqUrl: "",
        bodyStr: ""
      };
    }
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
      const cleanQ = String(q || "").replace(/p$/i, "").replace(/kbps$/i, "");
      const qual = fmt === "mp4" ? this.avail.vidQ.includes(cleanQ) ? `${cleanQ}P` : "360P" : this.avail.audQ.includes(cleanQ) ? `${cleanQ}KBPS` : "128KBPS";
      return {
        fmt: fmt,
        qual: qual
      };
    } catch (err) {
      console.log(`[ERROR] Validation failed: ${err?.message}`);
      return {
        fmt: "mp4",
        qual: "360P"
      };
    }
  }
  async parseMedia(link = "", origin = "source") {
    try {
      console.log(`[PROCESS] Parsing media (origin: ${origin}) for: ${link}`);
      const {
        bodyStr
      } = this.buildPayload("media/parse", {
        origin: origin,
        link: link
      });
      const res = await this.cli.post("/media/parse", bodyStr);
      const resData = res?.data;
      if (resData?.status === 1 && resData?.data) {
        return resData.data;
      }
      return null;
    } catch (err) {
      console.log(`[ERROR] Parse (${origin}) failed: ${err?.message}`);
      return null;
    }
  }
  async resolveRedirect(requestContent = "") {
    try {
      if (!requestContent) return null;
      console.log("[PROCESS] Resolving direct link via download_redirect...");
      const redirectPath = `/media/download_redirect?request=${encodeURIComponent(requestContent)}`;
      const res = await this.cli.get(redirectPath, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      const location = res?.headers?.location || res?.headers?.Location;
      if (location) {
        console.log("[PROCESS] Direct link resolved successfully from Location header");
        return location;
      }
      return res?.request?.res?.responseUrl || null;
    } catch (err) {
      if (err?.response?.headers?.location) {
        return err.response.headers.location;
      }
      console.log(`[ERROR] Redirect resolution failed: ${err?.message}`);
      return null;
    }
  }
  async resolveTaskDownload(requestContent = "") {
    try {
      if (!requestContent) return null;
      console.log("[PROCESS] Requesting media task...");
      const {
        bodyStr
      } = this.buildPayload("media/download", {
        request: requestContent,
        no_encrypt: 1
      });
      const res = await this.cli.post("/media/download", bodyStr);
      const taskId = res?.data?.data?.task_id;
      if (!taskId) return null;
      console.log(`[PROCESS] Querying task status for task_id: ${taskId}...`);
      const queryParams = new URLSearchParams({
        auth: this.authKey,
        domain: this.domain,
        task_id: taskId,
        download_domain: "vidssave.com",
        origin: "content_site"
      }).toString();
      const qRes = await this.cli.get(`/media/download_query?${queryParams}`);
      const rawData = String(qRes?.data || "");
      const matchSuccess = rawData.match(/event:\s*success\s*\ndata:\s*(\{.*\})/);
      if (matchSuccess && matchSuccess[1]) {
        const parsed = JSON.parse(matchSuccess[1]);
        return parsed?.download_link || null;
      }
      return qRes?.data?.data?.download_link || null;
    } catch (err) {
      console.log(`[ERROR] Task download resolution failed: ${err?.message}`);
      return null;
    }
  }
  async download(input = {}) {
    try {
      let targetInput = "";
      let format = "mp4";
      let quality = "360";
      if (typeof input === "string") {
        targetInput = input;
      } else if (typeof input === "object" && input !== null) {
        targetInput = input.url || input.link || "";
        format = input.format || "mp4";
        quality = input.quality || "360";
      }
      if (!targetInput) {
        return this.wrap(false, null, 'Parameter "url" is required');
      }
      const targetUrl = this.nUrl(targetInput);
      const params = this.vld(format, quality);
      const [cacheData, sourceData] = await Promise.all([this.parseMedia(targetUrl, "cache"), this.parseMedia(targetUrl, "source")]);
      const mainData = sourceData || cacheData;
      if (!mainData) {
        return this.wrap(false, null, "Failed to extract media data from VidsSave");
      }
      const videoGroup = mainData?.media?.find(m => m?.type === "video");
      const audioGroup = mainData?.media?.find(m => m?.type === "audio");
      let videoList = videoGroup?.resources || mainData?.resources?.filter(r => r?.type === "video") || [];
      let audioList = audioGroup?.resources || mainData?.resources?.filter(r => r?.type === "audio") || [];
      if (cacheData?.media) {
        const cVideo = cacheData.media.find(m => m?.type === "video")?.resources || [];
        const cAudio = cacheData.media.find(m => m?.type === "audio")?.resources || [];
        cVideo.forEach(v => {
          if (v?.download_url) {
            videoList = [v, ...videoList.filter(item => item.quality !== v.quality)];
          }
        });
        cAudio.forEach(a => {
          if (a?.download_url) {
            audioList = [a, ...audioList.filter(item => item.quality !== a.quality)];
          }
        });
      }
      console.log(`[PROCESS] Successfully loaded media: "${mainData?.title || "Unknown"}"`);
      let pickedStream = null;
      if (params.fmt === "mp4") {
        pickedStream = videoList.find(v => v?.quality?.toUpperCase() === params.qual.toUpperCase()) || videoList.find(v => v?.quality?.toUpperCase() === "720P") || videoList.find(v => v?.quality?.toUpperCase() === "360P") || videoList[0];
      } else {
        pickedStream = audioList.find(a => a?.quality?.toUpperCase() === params.qual.toUpperCase()) || audioList.find(a => a?.quality?.toUpperCase() === "128KBPS") || audioList[0];
      }
      let finalDownloadUrl = pickedStream?.download_url || "";
      if (!finalDownloadUrl && pickedStream?.resource_content) {
        const directRedirectUrl = await this.resolveRedirect(pickedStream.resource_content);
        if (directRedirectUrl) {
          finalDownloadUrl = directRedirectUrl;
        }
      }
      if (!finalDownloadUrl && pickedStream?.resource_content) {
        const taskUrl = await this.resolveTaskDownload(pickedStream.resource_content);
        if (taskUrl) {
          finalDownloadUrl = taskUrl;
        }
      }
      if (!finalDownloadUrl && pickedStream?.resource_content) {
        finalDownloadUrl = `${this.apiBase}/media/download_redirect?request=${encodeURIComponent(pickedStream.resource_content)}`;
      }
      return this.wrap(true, {
        id: mainData?.id || "",
        title: mainData?.title || "",
        author: mainData?.user_item?.nickname || "",
        duration: mainData?.duration || 0,
        thumbnail: mainData?.thumbnail || "",
        selected: {
          format: params.fmt,
          quality: pickedStream?.quality || params.qual,
          filesize: pickedStream?.size || null,
          downloadUrl: finalDownloadUrl,
          directStream: pickedStream?.download_url || null,
          downloadMode: pickedStream?.download_mode || "direct"
        },
        availableVideos: videoList.map(v => ({
          quality: v?.quality,
          format: v?.format,
          filesize: v?.size,
          downloadUrl: v?.download_url || `${this.apiBase}/media/download_redirect?request=${encodeURIComponent(v?.resource_content || "")}`,
          resourceContent: v?.resource_content || null
        })),
        availableAudios: audioList.map(a => ({
          quality: a?.quality,
          format: a?.format,
          filesize: a?.size,
          downloadUrl: a?.download_url || `${this.apiBase}/media/download_redirect?request=${encodeURIComponent(a?.resource_content || "")}`,
          resourceContent: a?.resource_content || null
        }))
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
  const api = new VidsSave();
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