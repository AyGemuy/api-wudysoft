import axios from "axios";
import * as cheerio from "cheerio";
class TempMailFish {
  constructor() {
    this.base = "https://api.tempmail.fish";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://tempmail.fish",
      referer: "https://tempmail.fish/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      priority: "u=1, i"
    };
  }
  log(msg) {
    console.log(`[TempFish] ${new Date().toLocaleTimeString()} > ${msg}`);
  }
  encode_state(obj) {
    return obj ? Buffer.from(JSON.stringify(obj)).toString("base64") : "";
  }
  decode_state(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }
  parse_html(html) {
    const $ = cheerio.load(html || "");
    return $.text().trim();
  }
  async create({
    ...rest
  } = {}) {
    this.log("Requesting new email...");
    try {
      const {
        data
      } = await axios.post(`${this.base}/emails/new-email`, {}, {
        headers: {
          ...this.headers,
          "content-length": "0"
        }
      });
      const email = data?.email;
      const key = data?.authKey;
      const state = email && key ? this.encode_state({
        email: email,
        key: key
      }) : null;
      this.log(email ? `Created: ${email}` : "Failed to create email");
      return {
        result: {
          email: email || null,
          key: key || null,
          state: state || null
        }
      };
    } catch (e) {
      this.log(`Error Create: ${e.message}`);
      return {
        result: null,
        error: e.message
      };
    }
  }
  async message({
    email,
    key,
    state,
    ...rest
  } = {}) {
    this.log("Checking inbox...");
    try {
      const creds = state ? this.decode_state(state) : {};
      const target_email = creds?.email || email;
      const target_key = creds?.key || key;
      if (!target_email || !target_key) {
        throw new Error("Missing credentials (email/key or state)");
      }
      const {
        data
      } = await axios.get(`${this.base}/emails/emails`, {
        params: {
          emailAddress: target_email
        },
        headers: {
          ...this.headers,
          authorization: target_key
        }
      });
      const list = Array.isArray(data) ? data : [];
      this.log(`Inbox count: ${list.length}`);
      const parsed_list = list.map(item => {
        const raw_html = item?.htmlBody || item?.textBody || "";
        return {
          to: item?.to,
          from: item?.from,
          subject: item?.subject,
          html_body: raw_html,
          text_body: this.parse_html(raw_html),
          attachments: item?.attachments || [],
          timestamp: item?.timestamp,
          date_formatted: item?.timestamp ? new Date(item.timestamp).toLocaleString("id-ID") : null
        };
      });
      return {
        result: parsed_list
      };
    } catch (e) {
      this.log(`Error Message: ${e.message}`);
      return {
        result: [],
        error: e.message
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
      usage: {
        method: "GET / POST",
        example: "/?action=create"
      }
    });
  }
  const api = new TempMailFish();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'message'."
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
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}