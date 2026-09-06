import axios from "axios";
import crypto from "crypto";
class SnapAny {
  constructor() {
    this.secretKey = "a5wU-SVyy5gXIyMbPQIfIz7UP7rCBp76U8Z8i-FtDMU";
    this.avail = {
      fmt: ["mp4", "m4a", "mp3"],
      vidQ: ["1080", "720", "480", "360", "240", "144"],
      codec: ["h264", "av1", "vp9"]
    };
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "en",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://snapany.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://snapany.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cli = axios.create({
      baseURL: "https://api.snapany.com",
      timeout: 25e3,
      headers: this.baseHeaders
    });
    this.cli.interceptors.request.use(cfg => {
      try {
        console.log(`[REQ] > ${cfg?.method?.toUpperCase() || "POST"} ${cfg?.baseURL || ""}${cfg?.url || ""}`);
      } catch (_) {}
      return cfg;
    }, err => {
      try {
        console.log(`[REQ-ERR] > ${err?.message || "Request Initialization Failed"}`);
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
  nUrl(u = "") {
    try {
      const raw = String(u || "").trim();
      if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
        return `https://www.youtube.com/watch?v=${raw}`;
      }
      const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const m = raw.match(reg);
      return m ? `https://www.youtube.com/watch?v=${m[1]}` : raw.startsWith("http") ? raw : `https://${raw}`;
    } catch (err) {
      console.log(`[ERROR] URL normalization failed: ${err?.message || "Unknown error"}`);
      return u;
    }
  }
  gFoot(link, ts, lang = "en") {
    try {
      console.log("[PROCESS] Generating security signature (g-footer)...");
      const rawData = `${link}${lang}${ts}`;
      return crypto.createHmac("sha256", this.secretKey).update(rawData).digest("hex");
    } catch (err) {
      console.log(`[ERROR] Signature generation failed: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  vld(f, q) {
    try {
      console.log("[PROCESS] Validating requested options...");
      const fmt = this.avail.fmt.includes(f?.toLowerCase()) ? f.toLowerCase() : "mp4";
      const cleanQ = String(q || "").replace(/p$/i, "");
      const qual = this.avail.vidQ.includes(cleanQ) ? cleanQ : "360";
      return {
        fmt: fmt,
        qual: qual
      };
    } catch (err) {
      console.log(`[ERROR] Option validation failed: ${err?.message || "Using defaults"}`);
      return {
        fmt: "mp4",
        qual: "360"
      };
    }
  }
  async download({
    url = "",
    format = "mp4",
    quality = "360",
    bitrate = "128",
    codec = "h264",
    lang = "en",
    ...rest
  } = {}) {
    try {
      if (!url) return this.wrap(false, null, 'Parameter "url" is required');
      const targetUrl = this.nUrl(url);
      const params = this.vld(format, quality);
      const ts = rest?.timestamp ? String(rest.timestamp) : String(Date.now());
      const tz = rest?.timezone ? rest.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Makassar";
      const footer = rest?.footer ? rest.footer : this.gFoot(targetUrl, ts, lang);
      if (!footer) {
        return this.wrap(false, null, "Failed to generate security signature (g-footer)");
      }
      console.log(`[PROCESS] Extracting media data from SnapAny for: ${targetUrl}`);
      const res = await this.cli.post("/v1/extract/post", {
        link: targetUrl
      }, {
        headers: {
          "g-footer": footer,
          "g-timestamp": ts,
          "g-timezone": tz,
          "accept-language": lang
        }
      });
      const resData = res?.data || {};
      const medias = resData?.medias || [];
      if (!medias.length) {
        return this.wrap(false, null, "No playable media found from SnapAny");
      }
      console.log(`[PROCESS] Successfully fetched media: "${resData?.title || "Unknown Title"}"`);
      const vidMedia = medias.find(m => m?.media_type === "video") || medias[0];
      const audMedia = medias.find(m => m?.media_type === "audio") || null;
      const variants = vidMedia?.variants || [];
      let pickedVariant = null;
      let downloadUrl = "";
      let proxyUrl = "";
      if (params.fmt === "mp4") {
        pickedVariant = variants.find(v => String(v?.quality) === params.qual) || variants.find(v => v?.is_default) || variants[0];
        downloadUrl = pickedVariant?.video_url || vidMedia?.resource_url || "";
        proxyUrl = pickedVariant?.video_proxy_url || vidMedia?.resource_proxy_url || "";
      } else {
        downloadUrl = audMedia?.resource_url || pickedVariant?.audio_url || "";
        proxyUrl = audMedia?.resource_proxy_url || pickedVariant?.audio_proxy_url || "";
      }
      return this.wrap(true, {
        id: resData?.id || "",
        title: resData?.title || "",
        description: resData?.text || "",
        site: resData?.site || "youtube",
        duration: vidMedia?.duration || 0,
        thumbnail: vidMedia?.preview_url || "",
        selected: {
          format: params.fmt,
          quality: params.fmt === "mp4" ? `${pickedVariant?.quality || params.qual}p` : "audio",
          fps: pickedVariant?.fps || null,
          codec: pickedVariant?.video_codec || codec || "h264",
          filesize: pickedVariant?.video_filesize || audMedia?.audio_filesize || null,
          downloadUrl: downloadUrl,
          proxyUrl: proxyUrl,
          audioUrl: pickedVariant?.audio_url || audMedia?.resource_url || null
        },
        availableQualities: variants.map(v => ({
          quality: `${v?.quality}p`,
          fps: v?.fps,
          codec: v?.video_codec,
          filesize: v?.video_filesize,
          url: v?.video_url,
          proxyUrl: v?.video_proxy_url
        })),
        subtitles: vidMedia?.subtitles || []
      });
    } catch (err) {
      console.log(`[ERROR] Extraction failed: ${err?.message || "Unknown error"}`);
      return this.wrap(false, null, err?.response?.data?.message || err?.message || "Extraction failed");
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
  const api = new SnapAny();
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