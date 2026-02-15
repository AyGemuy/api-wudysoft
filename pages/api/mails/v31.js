import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class GuerrillaMail {
  constructor() {
    this.baseURL = "https://www.guerrillamail.com";
    this.apiURL = `${this.baseURL}/ajax.php`;
    this.domains = [];
    this.state = {};
    this.axios = axios.create({
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID"
      }
    });
  }
  async init() {
    try {
      console.log("Init...");
      const {
        data
      } = await this.axios.get(`${this.baseURL}/en/`);
      const $ = cheerio.load(data);
      const script = $('script:contains("gm_init_vars")').html() || "";
      const vars = script.match(/gm_init_vars\s*=\s*({[\s\S]*?});/)?.[1] || "{}";
      const parsed = eval(`(${vars})`);
      this.domains = [];
      $("#gm-host-select option").each((i, el) => {
        const domain = $(el).attr("value")?.trim();
        domain && this.domains.push(domain);
      });
      this.state = {
        token: parsed?.api_token || "",
        session: parsed?.result?.sid_token || "",
        email: parsed?.email_addr || "",
        alias: parsed?.alias || "",
        timestamp: parsed?.email_timestamp || 0,
        domains: this.domains
      };
      console.log("OK");
      return this.state;
    } catch (err) {
      console.error("Init err:", err?.message);
      throw err;
    }
  }
  async create(params = {}) {
    try {
      const {
        state,
        name,
        domain
      } = params;
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());
        this.state = decoded;
        this.domains = decoded?.domains || [];
      }!this.state?.token && await this.init();
      const emailUser = name || crypto.randomBytes(4).toString("hex");
      const selectedDomain = domain || this.domains[Math.floor(Math.random() * this.domains.length)] || "guerrillamail.com";
      console.log(`Create: ${emailUser}@${selectedDomain}`);
      const {
        data
      } = await this.axios.post(`${this.apiURL}?f=set_email_user`, `email_user=${emailUser}&lang=en&site=guerrillamail.com&in=+Set+cancel`, {
        headers: {
          authorization: `ApiToken ${this.state?.token}`,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          cookie: `PHPSESSID=${this.state?.session}`,
          "x-requested-with": "XMLHttpRequest",
          origin: this.baseURL,
          referer: `${this.baseURL}/en/`
        }
      });
      this.state = {
        ...this.state,
        email: data?.email_addr || "",
        alias: data?.alias || "",
        timestamp: data?.email_timestamp || 0,
        session: data?.sid_token || this.state?.session
      };
      console.log(`OK: ${this.state.email}`);
      return {
        ...this.state,
        state: Buffer.from(JSON.stringify(this.state)).toString("base64")
      };
    } catch (err) {
      console.error("Create err:", err?.message);
      throw err;
    }
  }
  async list(offset = 0) {
    try {
      const emailUser = this.state?.email?.split("@")?.[0] || "";
      console.log(`List...`);
      const {
        data
      } = await this.axios.get(`${this.apiURL}?f=get_email_list&offset=${offset}&site=guerrillamail.com&in=${emailUser}&_=${Date.now()}`, {
        headers: {
          authorization: `ApiToken ${this.state?.token}`,
          cookie: `PHPSESSID=${this.state?.session}`,
          "x-requested-with": "XMLHttpRequest",
          referer: `${this.baseURL}/en/`
        }
      });
      this.state.session = data?.sid_token || this.state?.session;
      const list = (data?.list || []).filter(msg => msg?.mail_from !== "no-reply@guerrillamail.com" || msg?.mail_subject !== "Welcome to Guerrilla Mail");
      console.log(`OK: ${list.length} msg`);
      return {
        ...data,
        list: list,
        count: String(list.length),
        state: Buffer.from(JSON.stringify(this.state)).toString("base64")
      };
    } catch (err) {
      console.error("List err:", err?.message);
      throw err;
    }
  }
  async fetch(mailId) {
    try {
      const emailUser = this.state?.email?.split("@")?.[0] || "";
      console.log(`Fetch: ${mailId}`);
      const {
        data
      } = await this.axios.get(`${this.apiURL}?f=fetch_email&email_id=${mailId}&site=guerrillamail.com&in=${emailUser}&_=${Date.now()}`, {
        headers: {
          authorization: `ApiToken ${this.state?.token}`,
          cookie: `PHPSESSID=${this.state?.session}`,
          "x-requested-with": "XMLHttpRequest",
          referer: `${this.baseURL}/en/inbox`
        }
      });
      this.state.session = data?.sid_token || this.state?.session;
      console.log(`OK: ${data?.mail_subject}`);
      return {
        ...data,
        state: Buffer.from(JSON.stringify(this.state)).toString("base64")
      };
    } catch (err) {
      console.error("Fetch err:", err?.message);
      throw err;
    }
  }
  async message(params = {}) {
    try {
      const {
        state,
        email,
        from,
        subject
      } = params;
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());
        this.state = decoded;
        this.domains = decoded?.domains || [];
      }
      if (email) {
        return await this.fetch(email);
      }
      const {
        list = [], ...listData
      } = await this.list();
      console.log(`Search: ${list.length} msg`);
      if (!from && !subject) {
        return {
          ...listData,
          list: list,
          count: String(list.length),
          state: Buffer.from(JSON.stringify(this.state)).toString("base64")
        };
      }
      const matches = list.filter(msg => {
        const okFrom = !from || msg?.mail_from?.toLowerCase()?.includes(from?.toLowerCase());
        const okSubject = !subject || msg?.mail_subject?.toLowerCase()?.includes(subject?.toLowerCase());
        return okFrom && okSubject;
      });
      if (!matches.length) {
        console.log("No match");
        return {
          ...listData,
          list: list,
          matches: [],
          found: false,
          count: "0",
          state: Buffer.from(JSON.stringify(this.state)).toString("base64")
        };
      }
      console.log(`Match: ${matches.length}`);
      const details = [];
      for (const match of matches) {
        const detail = await this.fetch(`mr_${match?.mail_id}`);
        details.push(detail);
      }
      return {
        ...listData,
        list: list,
        matches: matches,
        details: details,
        found: true,
        count: String(matches.length),
        state: Buffer.from(JSON.stringify(this.state)).toString("base64")
      };
    } catch (err) {
      console.error("Message err:", err?.message);
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
  const api = new GuerrillaMail();
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