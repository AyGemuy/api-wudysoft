import axios from "axios";
class Scraper {
  constructor() {
    this.api = "https://api-v1.menarailpost.com/v1/info";
    this.headers = {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://fbvideodl.com",
      referer: "https://fbvideodl.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[PROSES] Mencoba mengambil data dari: ${url}`);
    try {
      const response = await axios({
        method: "POST",
        url: this.api,
        headers: this.headers,
        data: {
          url: url
        },
        ...rest
      });
      const data = response?.data || {};
      const title = data.title ? data.title : "No Title Found";
      console.log(`[BERHASIL] Title: ${title}`);
      return data;
    } catch (error) {
      console.error(`[ERROR] Terjadi kesalahan: ${error?.message || "Unknown Error"}`);
      return {
        success: false,
        message: error?.response?.data || error.message
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
  const api = new Scraper();
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