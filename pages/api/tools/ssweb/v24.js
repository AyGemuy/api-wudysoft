import axios from "axios";
class ScreenshotOne {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.screenshotone.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://keenconverters.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://keenconverters.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses screenshot via ScreenshotOne...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const defaultParams = {
        access_key: rest.access_key || "VGx_Pk6Ek3cjqw",
        url: cleanUrl,
        viewport_has_touch: rest.viewport_has_touch || true,
        viewport_landscape: rest.viewport_landscape || true,
        viewport_mobile: rest.viewport_mobile || true,
        format: rest.format || "png",
        block_ads: rest.block_ads || true,
        block_cookie_banners: rest.block_cookie_banners || true,
        block_banners_by_heuristics: rest.block_banners_by_heuristics || false,
        block_trackers: rest.block_trackers || true,
        delay: parseInt(rest.delay) || 0,
        timeout: parseInt(rest.timeout) || 60,
        response_type: rest.response_type || "by_format",
        full_page: rest.fullPage || rest.full_page || true,
        full_page_scroll: rest.full_page_scroll || false,
        image_quality: parseInt(rest.image_quality) || 100
      };
      const params = {
        ...defaultParams,
        ...rest
      };
      console.log(`[LOG] Mengirim GET request ke ScreenshotOne untuk: ${cleanUrl}`);
      const res = await this.client.get("/take", {
        params: params,
        responseType: "arraybuffer"
      });
      if (!res?.data) {
        throw new Error("Gagal menerima data biner gambar dari server ScreenshotOne.");
      }
      console.log("[LOG] Gambar berhasil diunduh dari ScreenshotOne.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(res.data),
        contentType: `image/${params.format}`
      };
    } catch (err) {
      console.error("[LOG] Gagal mengeksekusi request di ScreenshotOne:", err.message);
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
  const api = new ScreenshotOne();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data.contentType || "image/png");
    return res.status(data.status || 200).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}