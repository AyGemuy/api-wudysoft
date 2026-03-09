import axios from "axios";
class MockupApi {
  constructor() {
    this.base = "https://mockupbro.app/api";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        origin: "https://mockupbro.com",
        referer: "https://mockupbro.com/"
      }
    });
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`[PROSES] Mencari: ${query}...`);
      const page = rest?.page ? rest.page : 1;
      const res = await this.client.get("/images/search", {
        params: {
          q: query,
          page: page,
          ...rest
        }
      });
      console.log(`[SUKSES] Menemukan ${res.data?.data?.length || 0} hasil.`);
      const result = res.data || [];
      return {
        result: result
      };
    } catch (err) {
      console.error(`[GAGAL] Detail: ${err.response?.data?.message || err.message}`);
      return null;
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
  const api = new MockupApi();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}