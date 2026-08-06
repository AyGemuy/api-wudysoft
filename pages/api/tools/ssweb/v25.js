import axios from "axios";
class SShot {
  constructor() {
    this.client = axios.create({
      baseURL: "https://mini.s-shot.ru",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Pragma: "no-cache",
        Referer: "https://toolxify.com.ng/",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses screenshot via S-Shot...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const viewport = rest.viewport || "1024x768";
      const format = (rest.format || "PNG").toUpperCase();
      const width = rest.width || "1024";
      const scale = rest.scale || "Z100";
      const path = `/${viewport}/${format}/${width}/${scale}/?${encodeURIComponent(cleanUrl)}`;
      console.log(`[LOG] Mengirim GET request ke S-Shot dengan path: ${path}`);
      const res = await this.client.get(path, {
        responseType: "arraybuffer"
      });
      if (!res?.data) {
        throw new Error("Gagal menerima data biner gambar dari server S-Shot.");
      }
      console.log("[LOG] Gambar berhasil diunduh dari S-Shot.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(res.data),
        contentType: `image/${format.toLowerCase()}`
      };
    } catch (err) {
      console.error("[LOG] Gagal mengeksekusi request di S-Shot:", err.message);
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
  const api = new SShot();
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