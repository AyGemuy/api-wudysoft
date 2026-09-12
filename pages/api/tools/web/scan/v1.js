import axios from "axios";
class SucuriScanner {
  constructor() {
    this.api = axios.create({
      baseURL: "https://sitecheck.sucuri.net/api/v3/",
      timeout: 6e4,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  log(s, m, ok = true) {
    console.log(`[${ok ? "✅" : "❌"}][${s}] ${m}`);
  }
  async check({
    url,
    ...rest
  }) {
    try {
      this.log("START", "Parsing input...");
      const raw = url || rest.scan || "";
      const link = raw.startsWith("http") ? raw : `https://${raw}`;
      const target = new URL(link).searchParams.get("scan") || new URL(link).hostname;
      const {
        data
      } = await this.api.get("", {
        params: {
          scan: target,
          ...rest
        }
      });
      this.log("DONE", `Site: ${target} | Status: ${data?.site?.status || "OK"}`);
      return data;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Error";
      this.log("FAIL", msg, false);
      return {
        error: true,
        msg: msg
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
  const api = new SucuriScanner();
  try {
    const data = await api.check(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}