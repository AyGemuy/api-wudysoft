import axios from "axios";
class SpotSaver {
  constructor() {
    this.base = "https://spotsaver.net";
    this.cookies = {};
    this.client = axios.create({
      baseURL: this.base,
      decompress: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://spotsaver.net/results/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  save(res) {
    try {
      const raw = res?.headers?.["set-cookie"] || [];
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach(c => {
        if (!c) return;
        const [pair] = c.split(";");
        const [k, ...v] = pair.split("=");
        if (k) this.cookies[k.trim()] = v.join("=").trim();
      });
    } catch (e) {
      console.error("Save Cookie Error:", e?.message || e);
    }
  }
  jar() {
    try {
      return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (e) {
      return "";
    }
  }
  async req(path, method = "GET", data = null, customHeaders = {}) {
    try {
      const cookieStr = this.jar();
      const headers = {
        ...cookieStr ? {
          cookie: cookieStr
        } : {},
        ...data ? {
          "content-type": "application/json",
          origin: "https://spotsaver.net"
        } : {},
        ...customHeaders
      };
      const res = await this.client({
        url: path,
        method: method,
        data: data,
        headers: headers
      });
      this.save(res);
      return {
        status: true,
        data: res?.data
      };
    } catch (e) {
      return {
        status: false,
        message: e?.response?.data?.message || e?.message || "Request failed"
      };
    }
  }
  async info(url) {
    try {
      console.log("[1/3] Mengambil metadata Spotify (/api/spotify/)...");
      const res = await this.req(`/api/spotify/?url=${encodeURIComponent(url)}`, "GET");
      const item = res?.data?.items?.[0] || null;
      if (!res?.status || !item) {
        return {
          status: false,
          message: res?.message || "Gagal mengambil metadata Spotify"
        };
      }
      return {
        status: true,
        item: item
      };
    } catch (e) {
      return {
        status: false,
        message: `Info Error: ${e?.message || e}`
      };
    }
  }
  async getId(title, artist) {
    try {
      console.log("[2/3] Mencari ID track/video (/api/get-id/)...");
      const res = await this.req("/api/get-id/", "POST", {
        title: title || "",
        artist: artist || ""
      });
      const videoId = res?.data?.videoId || "";
      if (!res?.status || !res?.data?.success || !videoId) {
        return {
          status: false,
          message: res?.data?.message || res?.message || "Video ID tidak ditemukan"
        };
      }
      return {
        status: true,
        videoId: videoId
      };
    } catch (e) {
      return {
        status: false,
        message: `Get ID Error: ${e?.message || e}`
      };
    }
  }
  async getDl(videoId, title, artist, format = "mp3") {
    try {
      console.log(`[3/3] Memproses direct download link [${format}] (/api/download/)...`);
      const trackTitle = `${title || "Track"} - ${artist || "Artist"}`;
      const res = await this.req("/api/download/", "POST", {
        videoId: videoId,
        candidateIds: [],
        format: format || "mp3",
        title: trackTitle
      });
      const downloadUrl = res?.data?.downloadUrl || res?.data?.url || res?.data?.mediaUrl || "";
      if (!res?.status || !downloadUrl) {
        return {
          status: false,
          message: res?.data?.message || res?.message || "Gagal mendapatkan tautan unduhan"
        };
      }
      return {
        status: true,
        downloadUrl: downloadUrl,
        data: res.data
      };
    } catch (e) {
      return {
        status: false,
        message: `Get Download Error: ${e?.message || e}`
      };
    }
  }
  async download({
    url,
    format = "mp3",
    ...rest
  }) {
    try {
      if (!url) {
        return {
          status: false,
          message: "Parameter 'url' Spotify diperlukan."
        };
      }
      const cleanUrl = url.split("?")[0];
      const infoRes = await this.info(cleanUrl);
      if (!infoRes?.status) return infoRes;
      const item = infoRes.item;
      const title = item?.title || "Unknown Title";
      const artist = item?.artist || "Unknown Artist";
      const idRes = await this.getId(title, artist);
      if (!idRes?.status) return idRes;
      const dlRes = await this.getDl(idRes.videoId, title, artist, format);
      if (!dlRes?.status) return dlRes;
      console.log("✔ Berhasil mendapatkan link download SpotSaver!");
      return {
        status: true,
        title: title,
        artist: artist,
        album: item?.album || "",
        duration: dlRes?.data?.duration || item?.duration || 0,
        thumbnail: item?.thumbnail || "",
        preview_url: item?.previewUrl || "",
        filename: dlRes?.data?.filename || `${title} - ${artist}.${format}`,
        download: {
          url: dlRes.downloadUrl,
          format: format || "mp3"
        },
        metadata: {
          ...item,
          videoId: idRes.videoId
        }
      };
    } catch (err) {
      return {
        status: false,
        message: err?.message || "Terjadi kesalahan sistem"
      };
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
  const api = new SpotSaver();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}