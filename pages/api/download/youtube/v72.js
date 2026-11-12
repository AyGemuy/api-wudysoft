import axios from "axios";
class Y2Meta {
  constructor() {
    this.avail = {
      fmt: ["mp4", "mp3"],
      vidQ: ["1080", "720", "360", "240", "144"],
      audB: ["320", "256", "128"],
      codec: ["h264", "av1", "vp9"]
    };
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: "https://frame.y2meta-uk.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://frame.y2meta-uk.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.cli = axios.create({
      timeout: 2e4,
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
      const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/;
      const m = String(u || "").trim().match(reg);
      return m ? m[1] : null;
    } catch (err) {
      console.log(`[ERROR] Failed to parse ID: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  vld(f, q, b, c) {
    try {
      console.log("[PROCESS] Validating options with available catalog...");
      const fmt = this.avail.fmt.includes(f) ? f : "mp4";
      const cleanQ = String(q || "").replace(/p$/i, "");
      const cleanB = String(b || "").replace(/kbps$/i, "");
      const vidQual = this.avail.vidQ.includes(cleanQ) ? cleanQ : fmt === "mp3" ? "720" : "360";
      const audBit = this.avail.audB.includes(cleanB) ? cleanB : "128";
      const vCod = this.avail.codec.includes(c) ? c : "h264";
      return {
        fmt: fmt,
        vidQual: vidQual,
        audBit: audBit,
        vCod: vCod
      };
    } catch (err) {
      console.log(`[ERROR] Option validation failed: ${err?.message || "Using defaults"}`);
      return {
        fmt: "mp4",
        vidQual: "360",
        audBit: "128",
        vCod: "h264"
      };
    }
  }
  async gMeta(id) {
    try {
      console.log(`[PROCESS] Fetching metadata for ID: ${id}`);
      const res = await this.cli.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      return res?.data || {};
    } catch (err) {
      console.log(`[ERROR] Fetching oEmbed failed: ${err?.message || "Unknown error"}`);
      return {};
    }
  }
  async gKey(id) {
    try {
      console.log(`[PROCESS] Requesting sanity key token for ID: ${id}`);
      const res = await this.cli.get(`https://cnv.cx/v2/sanity/key?id=${id}`);
      const token = res?.data?.key;
      if (!token) {
        console.log(`[ERROR] Failed to obtain sanity key token from response`);
        return null;
      }
      return token;
    } catch (err) {
      console.log(`[ERROR] Key request failed: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  async download({
    url = "",
    format = "mp4",
    quality = "360",
    bitrate = "128",
    codec = "h264",
    ...rest
  } = {}) {
    try {
      const vid = this.xId(url);
      if (!vid) {
        return this.wrap(false, null, "Invalid YouTube URL or Video ID");
      }
      const params = this.vld(format, quality, bitrate, codec);
      const meta = await this.gMeta(vid);
      const key = await this.gKey(vid);
      if (!key) {
        return this.wrap(false, null, "Failed to obtain converter security key");
      }
      console.log(`[PROCESS] Converting video via converter endpoint...`);
      const body = new URLSearchParams({
        link: `https://youtu.be/${vid}`,
        format: params.fmt,
        audioBitrate: params.fmt === "mp4" ? "128" : params.audBit,
        videoQuality: params.fmt === "mp3" ? "720" : params.vidQual,
        filenameStyle: rest?.filenameStyle ? rest.filenameStyle : "pretty",
        vCodec: params.vCod
      });
      const res = await this.cli.post("https://cnv.cx/v2/converter", body.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          key: key
        }
      });
      const resData = res?.data || {};
      const dlUrl = resData?.url || "";
      if (!dlUrl) {
        return this.wrap(false, null, "Converter response did not contain download URL");
      }
      let finalDl = dlUrl;
      try {
        if (!dlUrl.startsWith("https://conv.mp3youtube.cc/download/")) {
          const uObj = new URL(dlUrl);
          const qStr = uObj.search.startsWith("?id=") ? uObj.search.substring(4) : uObj.search.substring(1);
          finalDl = `${uObj.origin}${uObj.pathname}/?id=${qStr}`;
        }
      } catch (_) {
        finalDl = dlUrl;
      }
      console.log(`[PROCESS] Successfully resolved link: ${resData?.filename || "ready"}`);
      return this.wrap(true, {
        id: vid,
        title: meta?.title || resData?.filename || "YouTube Media",
        author: meta?.author_name || "",
        thumbnail: meta?.thumbnail_url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        filename: resData?.filename || `${vid}.${params.fmt}`,
        format: params.fmt,
        quality: params.fmt === "mp4" ? `${params.vidQual}p` : `${params.audBit}kbps`,
        codec: params.vCod,
        downloadUrl: dlUrl,
        directUrl: finalDl
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
  const api = new Y2Meta();
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