import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class TempMail4Me {
  constructor() {
    this.base = "https://www.tempmail4me.eu";
    this.domains = ["@myglobalmail.eu", "@wesendmail.eu"];
    this.headers = {
      authority: "www.tempmail4me.eu",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
  }
  log(msg) {
    console.log(`[TempMail4Me] ${new Date().toLocaleTimeString()} > ${msg}`);
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
  parse_text(html) {
    const $ = cheerio.load(html || "");
    return $.text().trim();
  }
  parse_cookies(headers) {
    const setCookie = headers["set-cookie"];
    if (!setCookie) return "";
    return setCookie.map(c => c.split(";")[0]).join("; ");
  }
  async create({
    name,
    domain,
    ...rest
  } = {}) {
    this.log("Initializing session...");
    try {
      const page_init = await axios.get(this.base, {
        headers: this.headers
      });
      const cookie = this.parse_cookies(page_init.headers);
      const $ = cheerio.load(page_init.data);
      const token = $('input[name="_token"]').val();
      if (!token) throw new Error("CSRF Token not found");
      const selected_domain = domain && this.domains.includes(domain) ? domain : this.domains[0];
      const clean_domain = selected_domain.replace("@", "");
      const is_custom = !!name;
      const endpoint = is_custom ? "/mailbox/create/custom" : "/mailbox/create/random";
      const form_data = new URLSearchParams();
      form_data.append("_token", token);
      if (is_custom) {
        form_data.append("email", name);
        form_data.append("domain", clean_domain);
      }
      this.log(`Creating email (${is_custom ? "Custom" : "Random"})...`);
      const create_req = await axios.post(`${this.base}${endpoint}`, form_data, {
        headers: {
          ...this.headers,
          cookie: cookie,
          "content-type": "application/x-www-form-urlencoded",
          origin: this.base,
          referer: this.base + "/"
        },
        maxRedirects: 5
      });
      const $res = cheerio.load(create_req.data);
      const final_email = $res("#current-id").val() || $res(".current-id input").val();
      if (!final_email) throw new Error("Failed to retrieve new email address");
      const final_cookie = this.parse_cookies(create_req.headers) || cookie;
      this.log(`Success: ${final_email}`);
      const state = this.encode_state({
        email: final_email,
        cookie: final_cookie,
        url: `${this.base}/mailbox/${final_email}`
      });
      return {
        result: {
          email: final_email,
          state: state
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
    state,
    ...rest
  } = {}) {
    this.log("Checking inbox...");
    try {
      const session = this.decode_state(state);
      if (!session?.cookie || !session?.url) {
        throw new Error("Invalid state. Please create email first.");
      }
      const {
        data
      } = await axios.get(session.url, {
        headers: {
          ...this.headers,
          cookie: session.cookie,
          referer: this.base
        }
      });
      const $ = cheerio.load(data);
      const messages = [];
      $(".mail-item").each((i, el) => {
        const id_raw = $(el).attr("id");
        const id = id_raw ? id_raw.replace("mail-", "") : null;
        if (!id) return;
        const $content = $(`#content-mail-${id}`);
        const sender_raw = $content.find(".sender").text().trim() || $(el).find(".sender").text().trim();
        const subject = $content.find(".subject").text().trim() || $(el).find(".subject").text().trim();
        const time = $content.find(".time").text().trim() || $(el).find(".time").text().trim();
        const html_body = $content.find(".message").html() || "";
        const text_body = this.parse_text(html_body);
        let from_name = sender_raw;
        let from_email = "";
        if (sender_raw.includes("-")) {
          const split = sender_raw.split("-");
          from_name = split[0].trim();
          from_email = split.slice(1).join("-").trim();
        }
        messages.push({
          id: id,
          from: from_email || from_name,
          from_name: from_name,
          subject: subject,
          date: time,
          html_body: html_body.trim(),
          text_body: text_body,
          attachments: []
        });
      });
      this.log(`Inbox count: ${messages.length}`);
      return {
        result: messages
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
  const api = new TempMail4Me();
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