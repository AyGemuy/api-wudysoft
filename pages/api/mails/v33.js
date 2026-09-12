import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import * as cheerio from "cheerio";
class MailsacMail {
  constructor() {
    this.baseURL = "https://mailsac.com";
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache"
      }
    });
  }
  async create(params = {}) {
    try {
      const {
        name,
        domain
      } = params;
      const username = name || crypto.randomBytes(4).toString("hex");
      const selectedDomain = domain || "@mailsac.com";
      const email = `${username}${selectedDomain}`;
      console.log(`Create: ${email}`);
      const form = new FormData();
      form.append("frm_action", "create");
      form.append("form_id", "10");
      form.append("frm_hide_fields_10", "");
      form.append("form_key", "mailsacinboxform");
      form.append("item_meta[0]", "");
      form.append("frm_submit_entry_10", crypto.randomBytes(5).toString("hex"));
      form.append("_wp_http_referer", "/");
      form.append("item_meta[49]", username);
      form.append("item_meta[50]", selectedDomain);
      form.append("item_key", "");
      form.append("item_meta[54]", "");
      form.append("frm_state", Buffer.from(crypto.randomBytes(24)).toString("base64"));
      form.append("ak_hp_textarea", "");
      form.append("ak_js", Date.now().toString());
      form.append("antispam_token", crypto.randomBytes(16).toString("hex"));
      form.append("unique_id", `${crypto.randomBytes(8).toString("hex")}-${crypto.randomBytes(6).toString("hex")}`);
      const {
        data,
        status,
        statusText,
        headers
      } = await this.axios.post("/", form, {
        headers: {
          ...form.getHeaders(),
          origin: this.baseURL,
          referer: `${this.baseURL}/`
        }
      });
      console.log("Created");
      return {
        email: email,
        inbox: username,
        domain: selectedDomain.replace("@", ""),
        status: status
      };
    } catch (err) {
      console.error("Create err:", err?.message);
      throw err;
    }
  }
  async message(params = {}) {
    try {
      const {
        email,
        from,
        subject
      } = params;
      if (!email) {
        throw new Error("Email required");
      }
      console.log(`Fetch: ${email}`);
      const {
        data: htmlData,
        status,
        statusText,
        headers
      } = await this.axios.get(`/inbox/${encodeURIComponent(email)}`, {
        headers: {
          referer: `${this.baseURL}/`
        }
      });
      console.log("Parse HTML...");
      const $ = cheerio.load(htmlData);
      const scriptContent = $("script").filter((i, el) => {
        return $(el).html()?.includes("window.__seedInboxMessages");
      }).html();
      let msgs = [];
      if (scriptContent) {
        const match = scriptContent.match(/window\.__seedInboxMessages\s*=\s*(\[[\s\S]*?\]);/);
        if (match) {
          msgs = JSON.parse(match[1]);
        }
      }
      console.log(`OK: ${msgs.length} msg`);
      const data = msgs.map(msg => ({
        text_content: msg.body || "",
        ...msg
      }));
      if (!from && !subject) {
        return {
          data: data,
          email: email,
          count: data.length,
          total: data.length,
          status: status
        };
      }
      const matches = data.filter(msg => {
        const okFrom = !from || msg?.from?.[0]?.address?.toLowerCase()?.includes(from?.toLowerCase());
        const okSubject = !subject || msg?.subject?.toLowerCase()?.includes(subject?.toLowerCase());
        return okFrom && okSubject;
      });
      if (!matches.length) {
        console.log("No match");
        return {
          data: data,
          email: email,
          matches: [],
          found: false,
          count: 0,
          total: data.length,
          status: status
        };
      }
      console.log(`Match: ${matches.length}`);
      return {
        data: data,
        email: email,
        matches: matches,
        found: true,
        count: matches.length,
        total: data.length,
        status: status
      };
    } catch (err) {
      console.error("Message err:", err?.message);
      throw err;
    }
  }
  async body(params = {}) {
    try {
      const {
        email,
        messageId
      } = params;
      if (!email || !messageId) {
        throw new Error("Email and messageId required");
      }
      console.log(`Fetch body: ${messageId}`);
      const {
        data,
        status,
        statusText,
        headers
      } = await this.axios.get(`/api/text/${email}/${messageId}`, {
        headers: {
          referer: `${this.baseURL}/inbox/${encodeURIComponent(email)}`
        }
      });
      console.log("Body fetched");
      return {
        email: email,
        messageId: messageId,
        body: data,
        text_content: data,
        status: status
      };
    } catch (err) {
      console.error("Body err:", err?.message);
      throw err;
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
  const api = new MailsacMail();
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
      status: true,
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