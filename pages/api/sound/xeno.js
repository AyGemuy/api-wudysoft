import axios from "axios";
class XenoCanto {
  constructor() {
    this.base = "https://xeno-canto.org/api/2";
    this.client = axios.create();
  }
  async search({
    query,
    id
  } = {}) {
    if (!query) throw new Error(JSON.stringify({
      message: "Parameter 'query' is required."
    }));
    try {
      const {
        data
      } = await this.client.get(`${this.base}/recordings?query=${query}`);
      const {
        recordings
      } = data;
      return id ? recordings[parseInt(id) - 1] : recordings;
    } catch (e) {
      const status = e.response?.status;
      throw new Error(JSON.stringify({
        message: status ? `Fetch failed (HTTP ${status}).` : `Fetch failed: ${e.message}`
      }));
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new XenoCanto();
    const result = await api.search(params);
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (e) {
    return res.status(500).json(JSON.parse(e.message));
  }
}