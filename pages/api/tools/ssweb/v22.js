import axios from "axios";
class Templated {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.templated.io",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://templated.io",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://templated.io/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses screenshot via Templated...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const defaultParams = {
        url: cleanUrl,
        format: rest.format || "png",
        width: parseInt(rest.width) || 375,
        height: parseInt(rest.height) || 812,
        fullPage: rest.fullPage || rest.full_page || false,
        quality: parseInt(rest.quality) || 90,
        deviceScaleFactor: parseInt(rest.deviceScaleFactor) || 1
      };
      const params = {
        ...defaultParams,
        ...rest
      };
      console.log(`[LOG] Mengirim POST request kosong dengan query parameters untuk: ${cleanUrl}`);
      const res = await this.client.post("/tools/public/url-to-image", null, {
        params: params,
        responseType: "arraybuffer"
      });
      if (!res?.data) {
        throw new Error("Gagal menerima data biner gambar dari server Templated.");
      }
      console.log("[LOG] Gambar berhasil diunduh dari Templated.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(res.data),
        contentType: `image/${params.format}`
      };
    } catch (err) {
      console.error("[LOG] Gagal mengeksekusi request di Templated:", err.message);
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
  const api = new Templated();
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