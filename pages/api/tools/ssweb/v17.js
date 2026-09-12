import axios from "axios";
class Apilight {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.apilight.com",
      headers: {
        accept: "text/plain, */*; q=0.01",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://urltoscreenshot.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://urltoscreenshot.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-api-key": "j1gIaMwfU545P2ymFWA0gan7yHr7Yla05CJnMheL"
      }
    });
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses request screenshot via Apilight...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const params = {
        url: cleanUrl,
        width: rest.width || 1366,
        height: rest.height || 1024,
        ...rest
      };
      console.log(`[LOG] Mengirim permintaan GET ke Apilight untuk URL: ${cleanUrl}`);
      const res = await this.client.get("/screenshot/get", {
        params: params,
        responseType: "text"
      });
      const base64Data = res?.data;
      if (!base64Data || typeof base64Data !== "string") {
        throw new Error("Respons base64 dari server kosong atau tidak valid.");
      }
      console.log("[LOG] Berhasil menerima data base64 dari Apilight.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(base64Data, "base64"),
        contentType: "image/png"
      };
    } catch (err) {
      console.error("[LOG] Terjadi kegagalan proses screenshot di Apilight:", err.message);
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
  const api = new Apilight();
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