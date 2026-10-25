import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class UrlToVideo {
  constructor() {
    this.pasteCli = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/tools/paste/v1`,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        Referer: `https://${apiConfig.DOMAIN_URL}/paste`
      }
    });
    this.videoCli = axios.create({
      baseURL: "https://alpha.urltovideo.com/api/recordings",
      headers: {
        accept: "application/json",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://urltovideo.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://urltovideo.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async uploadHtml(htmlContent, title = "Website Recording") {
    try {
      const res = await this.pasteCli.post("", {
        action: "create",
        title: title,
        content: htmlContent,
        syntax: "html",
        expireIn: ""
      });
      const key = res.data?.key;
      if (!key) throw new Error("Gagal mengunggah kode HTML ke Pastebin.");
      return `https://${apiConfig.DOMAIN_URL}/api/tools/paste/v1?action=get&key=${key}&output=html`;
    } catch (err) {
      throw new Error(`Pastebin Upload Error: ${err.message}`);
    }
  }
  async pollRecording(id, maxRetries = 60, interval = 3e3) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      const res = await this.videoCli.get(`/${id}`);
      const data = res?.data;
      if (data?.status === "completed") {
        return data;
      }
      if (data?.status === "failed" || data?.error) {
        throw new Error(data?.error || "Gagal saat merender rekaman video.");
      }
      console.log(`[LOG] Memeriksa status video (${id})... Status: ${data?.status}`);
    }
    throw new Error("Waktu tunggu rendering video habis (Timeout).");
  }
  async generate({
    url,
    html,
    scrollSpeed = "slow",
    pixelsPerScroll = 600,
    scrollPause = 1.2,
    width = 512,
    height = 512,
    initialPause = 2,
    scrollBehaviour = "smooth",
    recordingDelay = 2,
    blockAds = false,
    videoFormat = "mp4",
    ...rest
  }) {
    try {
      let targetUrl = url;
      if (!targetUrl && html) {
        console.log("[LOG] Mendeteksi raw HTML, mengunggah ke Pastebin...");
        targetUrl = await this.uploadHtml(html);
      }
      if (!targetUrl) {
        throw new Error("Parameter 'url' atau 'html' wajib diisi.");
      }
      const payload = {
        url: targetUrl,
        scrollSpeed: scrollSpeed,
        pixelsPerScroll: Number(pixelsPerScroll),
        scrollPause: Number(scrollPause),
        width: Number(width),
        height: Number(height),
        initialPause: Number(initialPause),
        scrollBehaviour: scrollBehaviour,
        recordingDelay: Number(recordingDelay),
        blockAds: Boolean(blockAds),
        videoFormat: videoFormat,
        ...rest
      };
      console.log(`[LOG] Mengirim tugas rekam URL: ${targetUrl}...`);
      const createRes = await this.videoCli.post("", payload);
      const initialData = createRes?.data;
      if (!initialData?.id) {
        throw new Error("Gagal menginisialisasi rekaman video.");
      }
      console.log(`[LOG] Tugas dibuat dengan ID: ${initialData.id}. Menunggu render...`);
      const result = await this.pollRecording(initialData.id);
      const videoBuffer = await axios.get(result.videoPath, {
        responseType: "arraybuffer"
      });
      return {
        status: true,
        id: result.id,
        targetUrl: targetUrl,
        videoUrl: result.videoPath,
        buffer: Buffer.from(videoBuffer.data),
        contentType: "video/mp4",
        meta: {
          totalDuration: result.totalDuration,
          finalDuration: result.finalDuration,
          videoSize: result.videoSize,
          pageHeight: result.pageHeight
        }
      };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Proses konversi gagal";
      console.error("[ERROR:generate]", msg);
      return {
        status: false,
        error: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params?.url && !params?.html) {
    return res.status(400).json({
      error: "Parameter 'url' atau 'html' diperlukan."
    });
  }
  const api = new UrlToVideo();
  try {
    const data = await api.generate(params);
    if (!data?.status) {
      return res.status(500).json({
        error: data?.error || "Gagal memproses rekaman video."
      });
    }
    if (params.json === "true" || params.json === true) {
      return res.status(200).json({
        success: true,
        videoUrl: data.videoUrl,
        meta: data.meta
      });
    }
    res.setHeader("Content-Type", data.contentType);
    return res.status(200).send(data.buffer);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal."
    });
  }
}