import cloudscraper from "cloudscraper";
class ClientService {
  async request({
    url,
    body,
    method,
    headers,
    ...rest
  }) {
    const u = url ? url : "";
    const m = method || "GET";
    const h = headers || {
      "User-Agent": "Mozilla/5.0"
    };
    const max = rest?.maxRetries || 5;
    const wait = rest?.retryDelay || 3e3;
    for (let i = 0; i < max; i++) {
      try {
        console.log(`[REQ] ${m} | Attempt ${i + 1}/${max} | ${u}`);
        const res = await cloudscraper({
          uri: u,
          method: m,
          headers: h,
          body: body || null,
          cloudflareTimeout: 1e4,
          followAllRedirects: true,
          json: false,
          ...rest
        });
        let data;
        try {
          data = typeof res === "string" ? JSON.parse(res) : res;
        } catch (e) {
          data = res;
        }
        console.log(`[OK] Status: ${data?.status || "Success"}`);
        return data;
      } catch (err) {
        const msg = err?.error || err?.message || "Unknown error";
        console.log(`[ERR] ${msg}`);
        if (i === max - 1) throw new Error(`Max retries reached: ${msg}`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }
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
  const api = new ClientService();
  try {
    const data = await api.request(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}