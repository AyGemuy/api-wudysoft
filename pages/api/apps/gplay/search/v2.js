import axios from "axios";
class DietDroid {
  constructor() {
    this.head = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      referer: "https://apkdl.dietdroid.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.baseUrl = "https://apkdl.dietdroid.com/api";
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`[LOG] DietDroid Search: "${query}"`);
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          ...rest
        },
        headers: this.head
      });
      return data;
    } catch (e) {
      console.error(`[ERROR] DietDroid: ${e.message}`);
      return {
        status: false,
        result: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new DietDroid();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}