import axios from "axios";
class Y2Jar {
  constructor() {
    this.avail = {
      fmt: ["mp4", "mp3", "m4a"],
      vidQ: ["1080", "720", "480", "360", "240", "144"]
    };
    this.baseHeaders = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      origin: "https://v2.y2jar.cc",
      referer: "https://v2.y2jar.cc/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cli = axios.create({
      timeout: 25e3,
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
        console.log(`[RES-ERR] < ${err?.response?.status || 500} - ${err?.message || "Response Failed"}`);
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
  xId(u = "") {
    try {
      console.log(`[PROCESS] Parsing Video ID: ${u}`);
      const raw = String(u || "").trim();
      if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
      const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const m = raw.match(reg);
      return m ? m[1] : null;
    } catch (err) {
      console.log(`[ERROR] Failed to parse video ID: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  vld(f, q) {
    try {
      console.log("[PROCESS] Validating options...");
      const fmt = this.avail.fmt.includes(f?.toLowerCase()) ? f.toLowerCase() : "mp4";
      const cleanQ = String(q || "").replace(/p$/i, "");
      const qual = this.avail.vidQ.includes(cleanQ) ? `${cleanQ}p` : "360p";
      return {
        fmt: fmt,
        qual: qual
      };
    } catch (err) {
      console.log(`[ERROR] Option validation failed: ${err?.message || "Using fallback defaults"}`);
      return {
        fmt: "mp4",
        qual: "360p"
      };
    }
  }
  async gInfo(id) {
    try {
      console.log(`[PROCESS] Fetching video metadata for ID: ${id}`);
      const res = await this.cli.get(`https://v2.y2jar.cc/i/${id}`);
      return res?.data || null;
    } catch (err) {
      console.log(`[ERROR] Fetching metadata failed: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  async gFormats(id) {
    try {
      console.log(`[PROCESS] Fetching available formats for ID: ${id}`);
      const res = await this.cli.get(`https://v2.y2jar.cc/f/${id}`);
      return res?.data || null;
    } catch (err) {
      console.log(`[ERROR] Fetching formats failed: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  async gToken(id, format, quality) {
    try {
      console.log(`[PROCESS] Requesting stream token for ${format?.toUpperCase()} (${quality})...`);
      let endpoint = "";
      if (format === "mp4") {
        endpoint = `https://capi.y2jar.cc/st/v/${id}?q=${quality}&a=`;
      } else {
        endpoint = `https://capi.y2jar.cc/st/a/${id}?a=`;
      }
      const res = await this.cli.get(endpoint);
      const tokenData = res?.data;
      if (!tokenData || !tokenData.token) {
        console.log(`[ERROR] Empty or invalid token response from CAPI`);
        return null;
      }
      return tokenData;
    } catch (err) {
      console.log(`[ERROR] Token request failed: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  async download({
    url = "",
    format = "mp4",
    quality = "360",
    ...rest
  } = {}) {
    try {
      const vid = this.xId(url);
      if (!vid) {
        return this.wrap(false, null, "Invalid YouTube URL or Video ID");
      }
      const params = this.vld(format, quality);
      const [info, formats] = await Promise.all([this.gInfo(vid), this.gFormats(vid)]);
      const streamInfo = await this.gToken(vid, params.fmt, params.qual);
      if (!streamInfo?.token) {
        return this.wrap(false, null, "Failed to retrieve streaming token from y2jar CAPI");
      }
      const downloadUrl = `https://capi.y2jar.cc/s/${vid}?token=${encodeURIComponent(streamInfo.token)}`;
      console.log(`[PROCESS] Successfully generated download URL for: "${info?.title || vid}"`);
      return this.wrap(true, {
        id: vid,
        title: info?.title || "YouTube Media",
        author: info?.author || "",
        duration: info?.duration || 0,
        thumbnail: info?.thumbnailUrl || `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
        isLive: info?.isLive || false,
        selected: {
          format: params.fmt,
          quality: params.fmt === "mp4" ? params.qual : formats?.audio?.quality || "original",
          size: streamInfo?.size || null,
          downloadUrl: downloadUrl
        },
        availableVideos: formats?.videos || [],
        availableAudio: formats?.audio || null
      });
    } catch (err) {
      console.log(`[ERROR] Y2Jar process failed: ${err?.message || "Unknown error"}`);
      return this.wrap(false, null, err?.response?.data?.message || err?.message || "Server error occurred during processing");
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
  const api = new Y2Jar();
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