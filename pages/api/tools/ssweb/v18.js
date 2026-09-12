import axios from "axios";
class RenderScreen {
  constructor() {
    this.client = axios.create({
      baseURL: "https://screenshot-api-hqlj.onrender.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://markanamedia.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://markanamedia.com/",
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
      console.log("[LOG] Memulai proses screenshot via RenderScreen...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const params = {
        url: cleanUrl,
        format: rest.format || "png",
        ...rest
      };
      console.log(`[LOG] Mengirim request GET ke RenderScreen untuk URL: ${cleanUrl}`);
      const res = await this.client.get("/screenshot", {
        params: params,
        responseType: "arraybuffer"
      });
      if (!res?.data) {
        throw new Error("Gagal menerima data biner dari server.");
      }
      console.log("[LOG] Berhasil mendapatkan file gambar dari RenderScreen.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(res.data),
        contentType: `image/${params.format}`
      };
    } catch (err) {
      console.error("[LOG] Gagal melakukan screenshot via RenderScreen:", err.message);
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
  const api = new RenderScreen();
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