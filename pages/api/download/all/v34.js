import axios from "axios";
import CryptoJS from "crypto-js";
class Videodropper {
  constructor({
    api = "allinone",
    ...opts
  } = {}) {
    this.api = api;
    this.k = CryptoJS.enc.Utf8.parse("qwertyuioplkjhgf");
    this.ax = axios.create({
      baseURL: "https://api.videodropper.app",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://fastvideosave.net",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://fastvideosave.net/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      ...opts
    });
  }
  enc(u) {
    const encrypted = CryptoJS.AES.encrypt(u, this.k, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  }
  dlUrl(u) {
    return `https://dl.videodropper.app/?url=${encodeURIComponent(u)}`;
  }
  mp3Url(u) {
    return `https://mp3.videodropper.app/api?url=${encodeURIComponent(u)}`;
  }
  fmt(d) {
    const video = (d?.video || []).map(v => ({
      ...v,
      dlVideo: this.dlUrl(v.video),
      dlThumb: this.dlUrl(v.thumbnail)
    }));
    const media = (d?.media || []).map(m => ({
      ...m,
      title: m?.title || "Instagram Audio",
      reels: m?.reels || "MP3",
      dlAudio: this.mp3Url(m.url),
      dlPoster: this.dlUrl(m?.poster || "")
    }));
    const image = (d?.image || []).map(i => ({
      src: this.dlUrl(i),
      dl: `${this.dlUrl(i)}&dl=1`
    }));
    return {
      video: video,
      media: media,
      image: image
    };
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[dl] ▶ start  :", url);
    try {
      const enc = this.enc(url);
      console.log("[dl] 🔐 enc   :", enc);
      const {
        data
      } = await this.ax.get(`/${this.api}`, {
        headers: {
          url: enc
        },
        ...rest
      });
      console.log("[dl] 📦 raw   :", data);
      const ok = data && data !== "link";
      if (!ok) {
        console.log("[dl] ⚠ no result (private / invalid link)");
        return null;
      }
      const result = this.fmt(data);
      console.log("[dl] ✅ done  :", result);
      return result;
    } catch (err) {
      console.error("[dl] ❌ error :", err?.message || err);
      throw err;
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
  const api = new Videodropper();
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