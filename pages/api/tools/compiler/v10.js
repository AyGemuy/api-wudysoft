import axios from "axios";
class CodeRunner {
  constructor() {
    this.api = "https://code.awancore.biz.id/api";
    this.client = axios.create({
      baseURL: this.api,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  async req(path, data, conf = {}) {
    console.log(`[PROSES] Mengirim permintaan ke: ${path}...`);
    try {
      const res = await this.client.post(path, data, conf);
      return res?.data;
    } catch (err) {
      console.error(`[ERROR] Detail: ${err?.response?.data || err.message}`);
      throw err;
    }
  }
  async run({
    code,
    ...rest
  }) {
    const payload = {
      code: code || "",
      ...rest
    };
    const headers = {
      Authorization: `Bearer ${rest?.token ?? "null"}`,
      "User-Agent": rest?.ua || "Mozilla/5.0 (Linux; Android 10; K)",
      Referer: rest?.ref || "https://code.awancore.biz.id/"
    };
    return await this.req("/run", payload, {
      headers: headers
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new CodeRunner();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}