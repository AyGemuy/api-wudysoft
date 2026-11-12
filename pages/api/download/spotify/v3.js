import axios from "axios";
class SpotiSoft {
  constructor() {
    this.base = "https://spotisoft.com";
    this.cookies = {};
    this.actionId = "40b64cb5af94bbf40c74e3e52ad6321e2762b5ecb6";
    this.client = axios.create({
      baseURL: this.base,
      decompress: true,
      headers: {
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        origin: "https://spotisoft.com",
        referer: "https://spotisoft.com/",
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
  async req(path, method = "GET", data = null, customHeaders = {}, responseType = "json") {
    try {
      const cookieStr = this.jar();
      const headers = {
        ...cookieStr ? {
          cookie: cookieStr
        } : {},
        ...customHeaders
      };
      const res = await this.client({
        url: path,
        method: method,
        data: data,
        headers: headers,
        responseType: responseType
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
  parseRSC(rawText) {
    try {
      if (typeof rawText !== "string") return null;
      const lines = rawText.split("\n");
      for (const line of lines) {
        const match = line.match(/^\d+:(.*)$/);
        if (match?.[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed?.token || parsed?.success) {
              return parsed;
            }
          } catch (_) {}
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async init() {
    try {
      console.log("[1/3] Menginisialisasi session SpotiSoft...");
      const res = await this.req("/", "GET", null, {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }, "text");
      return {
        status: res?.status || false
      };
    } catch (e) {
      return {
        status: false,
        message: `Init Error: ${e?.message || e}`
      };
    }
  }
  async getTrackAction(url) {
    try {
      console.log("[2/3] Mengambil metadata & token via Next.js Server Action...");
      const res = await this.req("/", "POST", JSON.stringify([url]), {
        accept: "text/x-component",
        "content-type": "text/plain;charset=UTF-8",
        "next-action": this.actionId,
        "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%2Cnull%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C0%5D%7D%2Cnull%2Cnull%2C16%5D",
        "x-deployment-id": "1788212801"
      }, "text");
      if (!res?.status || !res?.data) {
        return {
          status: false,
          message: res?.message || "Gagal mengeksekusi Server Action"
        };
      }
      const rscData = this.parseRSC(res.data);
      if (!rscData?.success || !rscData?.token) {
        return {
          status: false,
          message: "Gagal mengekstrak track token dari respons Next.js"
        };
      }
      return {
        status: true,
        data: rscData.data,
        token: rscData.token
      };
    } catch (e) {
      return {
        status: false,
        message: `Action Error: ${e?.message || e}`
      };
    }
  }
  async fetchAudioBase64(trackInfo, token, url, quality = "128") {
    try {
      console.log(`[3/3] Mengunduh stream audio & konversi ke Base64 [${quality}kbps]...`);
      const payload = {
        url: url,
        token: token,
        quality: quality || "128",
        branding: "SpotiSoft",
        title: trackInfo?.name || "Track",
        artist: trackInfo?.artists?.[0] || "Artist",
        imageUrl: trackInfo?.image || ""
      };
      const res = await this.req("/api/proxy/download", "POST", payload, {
        accept: "*/*",
        "content-type": "application/json"
      }, "arraybuffer");
      if (!res?.status || !res?.data) {
        return {
          status: false,
          message: res?.message || "Gagal mengunduh binary audio"
        };
      }
      const buffer = Buffer.from(res.data);
      const base64Audio = buffer.toString("base64");
      return {
        status: true,
        base64: base64Audio,
        bufferSize: buffer.length
      };
    } catch (e) {
      return {
        status: false,
        message: `Proxy Download Error: ${e?.message || e}`
      };
    }
  }
  async download({
    url,
    quality = "128",
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
      await this.init();
      const actionRes = await this.getTrackAction(cleanUrl);
      if (!actionRes?.status) return actionRes;
      const track = actionRes.data || {};
      const token = actionRes.token;
      const audioRes = await this.fetchAudioBase64(track, token, cleanUrl, quality);
      if (!audioRes?.status) return audioRes;
      console.log("✔ Berhasil mendapatkan audio Base64 dari SpotiSoft!");
      return {
        status: true,
        title: track?.name || "Unknown Title",
        artist: Array.isArray(track?.artists) ? track.artists.join(", ") : track?.artists || "Unknown Artist",
        album: track?.album || "",
        duration_ms: track?.duration || 0,
        thumbnail: track?.image || "",
        audio: {
          format: "mp3",
          quality: `${quality}kbps`,
          size_bytes: audioRes.bufferSize,
          base64: `data:audio/mp3;base64,${audioRes.base64}`,
          raw_base64: audioRes.base64
        },
        metadata: track
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
  const api = new SpotiSoft();
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