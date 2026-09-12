import axios from "axios";
class SpotyLoader {
  constructor() {
    this.base = "https://spotyloader.com";
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
        origin: "https://spotyloader.com",
        referer: "https://spotyloader.com/id",
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
          "content-type": "application/json"
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
      console.log("[1/3] Mengambil metadata track (/api/spotify/info)...");
      const res = await this.req(`/api/spotify/info?url=${encodeURIComponent(url)}`, "GET");
      if (!res?.status || !res?.data?.post) {
        return {
          status: false,
          message: res?.message || "Gagal mengambil info track"
        };
      }
      return {
        status: true,
        data: res.data.post
      };
    } catch (e) {
      return {
        status: false,
        message: `Info Error: ${e?.message || e}`
      };
    }
  }
  async track(url, format = "m4a") {
    try {
      console.log(`[2/3] Memulai proses konversi [${format}] (/api/spotify/track)...`);
      const res = await this.req("/api/spotify/track", "POST", {
        url: url,
        format: format || "m4a"
      });
      if (!res?.status || !res?.data?.jobId) {
        return {
          status: false,
          message: res?.data?.message || res?.message || "Gagal membuat job konversi"
        };
      }
      return {
        status: true,
        jobId: res.data.jobId
      };
    } catch (e) {
      return {
        status: false,
        message: `Track Error: ${e?.message || e}`
      };
    }
  }
  async poll(jobId) {
    try {
      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2e3));
        console.log(`[3/3] Memeriksa status unduhan (${attempts}/${maxAttempts})...`);
        const res = await this.req(`/api/spotify/track/status/${jobId}`, "GET");
        if (res?.status && res?.data) {
          const status = res.data?.status;
          const downloadLink = res.data?.downloadLink || res.data?.post?.download_url;
          if (status === "ready" || status === "success" || downloadLink) {
            return {
              status: true,
              downloadLink: downloadLink || "",
              post: res.data?.post || {}
            };
          }
          if (status === "failed" || status === "error") {
            return {
              status: false,
              message: "Server gagal memproses konversi audio"
            };
          }
        }
      }
      return {
        status: false,
        message: "Waktu tunggu polling habis (Timeout)"
      };
    } catch (e) {
      return {
        status: false,
        message: `Polling Error: ${e?.message || e}`
      };
    }
  }
  async download({
    url,
    format = "m4a",
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
      const targetUrl = infoRes?.data?.url || cleanUrl;
      const trackRes = await this.track(targetUrl, format);
      if (!trackRes?.status) return trackRes;
      const pollRes = await this.poll(trackRes.jobId);
      if (!pollRes?.status) return pollRes;
      console.log("✔ Berhasil mendapatkan link unduhan SpotyLoader!");
      return {
        status: true,
        title: infoRes?.data?.name || pollRes?.post?.name || "Unknown Title",
        artist: infoRes?.data?.artist || pollRes?.post?.artist || "Unknown Artist",
        album: infoRes?.data?.album || pollRes?.post?.album || "",
        duration_ms: infoRes?.data?.duration_ms || 0,
        thumbnail: infoRes?.data?.image || pollRes?.post?.image || "",
        preview_url: infoRes?.data?.preview_url || "",
        download: {
          url: pollRes.downloadLink,
          format: format || "m4a"
        },
        metadata: {
          ...infoRes?.data,
          ...pollRes?.post
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
  const api = new SpotyLoader();
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