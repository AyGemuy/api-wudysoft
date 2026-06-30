import cloudscraper from "cloudscraper";
class TempMail {
  constructor() {
    this.email = null;
    this.base = "https://tempmail.la";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.apiBase = `${this.base}/api/mail`;
  }
  _hdrs() {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      locale: "en-US",
      origin: this.base,
      platform: "PC",
      priority: "u=1, i",
      product: "TEMP_MAIL",
      referer: `${this.base}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.ua
    };
  }
  async _req({
    url,
    body,
    method,
    ...rest
  }) {
    const u = url || "";
    const m = method || "GET";
    const h = this._hdrs();
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
  async create({
    ...rest
  }) {
    try {
      console.log("START: Creating new TempMail.la email...");
      const data = await this._req({
        url: `${this.apiBase}/create`,
        method: "POST",
        body: JSON.stringify({
          ...rest
        })
      });
      const resData = data?.data || data;
      if (resData?.address) this.email = resData.address;
      console.log("SUCCESS: TempMail.la email created.", resData);
      return {
        status: true,
        result: resData
      };
    } catch (error) {
      console.error("ERROR: Failed to create TempMail.la email.", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async message({
    email,
    cursor = null,
    ...rest
  }) {
    const addr = email || this.email;
    if (!addr) return {
      status: false,
      result: "Email address is required."
    };
    try {
      console.log(`START: Fetching mailbox for ${addr}...`);
      const data = await this._req({
        url: `${this.apiBase}/box`,
        method: "POST",
        body: JSON.stringify({
          address: addr,
          cursor: cursor,
          ...rest
        })
      });
      console.log(`SUCCESS: Mailbox retrieved for ${addr}.`);
      return {
        status: true,
        result: data?.data || data
      };
    } catch (error) {
      console.error(`ERROR: Failed to fetch mailbox for ${addr}.`, error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: "/?action=create"
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.email) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'email' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      status: true,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada target API.",
      error: error.message || "Unknown Error"
    });
  }
}