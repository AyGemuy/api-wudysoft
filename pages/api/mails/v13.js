import cloudscraper from "cloudscraper";
const BASE_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "id-ID",
  "content-type": "application/json",
  locale: "en-US",
  origin: "https://tempmail.la",
  platform: "PC",
  priority: "u=1, i",
  product: "TEMP_MAIL",
  referer: "https://tempmail.la/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};
class ClientService {
  async request({
    url,
    body,
    method,
    headers,
    ...rest
  }) {
    const u = url || "";
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
class TempMailLAClient {
  constructor() {
    this.apiBase = "https://tempmail.la/api/mail";
    this.client = new ClientService();
  }
  async create() {
    try {
      console.log("START: Creating new TempMail.la email...");
      const data = await this.client.request({
        url: `${this.apiBase}/create`,
        method: "POST",
        headers: BASE_HEADERS,
        body: JSON.stringify({})
      });
      console.log("SUCCESS: TempMail.la email created.", data);
      return data?.data || data;
    } catch (error) {
      console.error("ERROR: Failed to create TempMail.la email.", error.message);
      throw new Error(error.message);
    }
  }
  async message({
    email: address,
    cursor = null
  }) {
    if (!address) throw new Error("Email address is required.");
    try {
      console.log(`START: Fetching mailbox for ${address}...`);
      const data = await this.client.request({
        url: `${this.apiBase}/box`,
        method: "POST",
        headers: BASE_HEADERS,
        body: JSON.stringify({
          address: address,
          cursor: cursor
        })
      });
      console.log(`SUCCESS: Mailbox retrieved for ${address}.`);
      return data?.data || data;
    } catch (error) {
      console.error(`ERROR: Failed to fetch mailbox for ${address}.`, error.message);
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action
  } = params;
  const client = new TempMailLAClient();
  try {
    switch (action) {
      case "create":
        const newData = await client.create();
        return res.status(200).json(newData);
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter."
          });
        }
        const messages = await client.message({
          email: params.email,
          cursor: params.cursor || null
        });
        return res.status(200).json(messages);
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create' or 'message'."
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}