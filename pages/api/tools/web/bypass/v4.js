import axios from "axios";
class KeyBypass {
  constructor() {
    this.api = axios.create({
      baseURL: "https://keybypass.net",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "kbpss10245"
      }
    });
  }
  async req(url, method = "GET", data = null) {
    try {
      const res = await this.api({
        url: url,
        method: method,
        data: data ? new URLSearchParams(data).toString() : null
      });
      return res?.data || {};
    } catch (e) {
      console.log(`[-] Req error: ${e.message}`);
      return {};
    }
  }
  async solve({
    url,
    ...rest
  }) {
    try {
      console.log(`[*] Bypassing: ${url}...`);
      const output = await this.req("/api/v1/bypass", "POST", {
        url: url,
        ...rest
      });
      return output;
    } catch (err) {
      console.log("[!] Error:", err.message);
      return {
        result: null,
        success: false,
        error: err.message
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
  const api = new KeyBypass();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}