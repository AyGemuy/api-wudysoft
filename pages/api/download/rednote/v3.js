import axios from "axios";
class RedNote {
  constructor() {
    this.api = "https://downloader.bhwa233.com/";
  }
  async download({
    url
  }) {
    try {
      const res = await axios.get(`${this.api}zh/v1/parse?url=${encodeURIComponent(url)}`, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          referer: "https://downloader.bhwa233.com/en",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const result = res.data?.data || res.data;
      return {
        result: result
      };
    } catch (err) {
      return {
        result: {
          success: false,
          error: err.message
        }
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
  const api = new RedNote();
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