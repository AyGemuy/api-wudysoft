import axios from "axios";
class Toolsura {
  constructor() {
    this.client = axios.create({
      baseURL: "https://www.toolsura.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.toolsura.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.toolsura.com/tools/online-screenshot-tool/",
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
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses screenshot via Toolsura...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const defaultPayload = {
        url: cleanUrl,
        fullPage: rest.fullPage || rest.full_page || false,
        width: parseInt(rest.width) || 375,
        height: parseInt(rest.height) || 812,
        delay: parseInt(rest.delay) || 1
      };
      const payload = {
        ...defaultPayload,
        ...rest
      };
      console.log(`[LOG] Mengirim request POST ke Toolsura untuk URL: ${cleanUrl}`);
      const res = await this.client.post("/api/screenshot/", payload, {
        responseType: "arraybuffer"
      });
      if (!res?.data) {
        throw new Error("Gagal menerima data biner dari server.");
      }
      console.log("[LOG] Berhasil mendapatkan file gambar dari Toolsura.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(res.data),
        contentType: "image/png"
      };
    } catch (err) {
      console.error("[LOG] Gagal melakukan screenshot via Toolsura:", err.message);
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
  const api = new Toolsura();
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