import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class TemporaryMail {
  constructor() {
    this.cookieJar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://generator.email",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      jar: this.cookieJar,
      withCredentials: true,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 400
    }));
    this.email = null;
    this.domains = [];
  }
  _clean(text) {
    return text ? text.replace(/\s+/g, " ").trim() : "";
  }
  async _setCookie(cookieStr, url = "https://generator.email") {
    try {
      await this.cookieJar.setCookie(cookieStr, url);
    } catch (err) {
      console.error(`[WARN] Failed to set cookie: ${err.message}`);
    }
  }
  _parseDomains($) {
    const domains = [];
    $("#newselect .tt-suggestion p").each((i, el) => {
      const domain = $(el).attr("id");
      if (domain) domains.push(domain);
    });
    return domains;
  }
  async create() {
    try {
      console.log("[INFO] Creating new email...");
      const res = await this.client.get("/email-generator");
      console.log(`[DEBUG] Generator status: ${res.status}`);
      const $ = cheerio.load(res.data);
      const user = $("#userName").val();
      const domain = $("#domainName2").val();
      if (!user || !domain) {
        throw new Error("Failed to init email - No user/domain found");
      }
      this.email = `${user}@${domain}`.toLowerCase();
      const path = `${domain.toLowerCase()}/${user.replace(/[^a-zA-Z_0-9.-]/g, "").toLowerCase()}`;
      this.domains = this._parseDomains($);
      await this._setCookie(`surl=${path}; Path=/; Domain=.generator.email`);
      const embxValue = encodeURIComponent(JSON.stringify([this.email]));
      await this._setCookie(`embx=${embxValue}; Path=/; Domain=.generator.email`);
      console.log(`[INFO] Email created: ${this.email}`);
      try {
        await this.client.post("/check_adres_validation3.php", `usr=${user}&dmn=${domain}`, {
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest"
          }
        });
        console.log("[INFO] Email registered");
      } catch (err) {
        console.log(`[WARN] Registration error: ${err.message}`);
      }
      return {
        success: true,
        email: {
          address: this.email,
          username: user,
          domain: domain
        },
        urls: {
          inbox: `https://generator.email/${path}`,
          refresh: `https://generator.email/${path}`,
          path: path
        },
        domains: this.domains,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      throw new Error(`Create failed: ${e.message}`);
    }
  }
  async message({
    email = this.email
  } = {}) {
    if (!email) throw new Error("Email required");
    try {
      const [user, domain] = email.split("@");
      const path = `${domain.toLowerCase()}/${user.replace(/[^a-zA-Z_0-9.-]/g, "").toLowerCase()}`;
      await this._setCookie(`surl=${path}; Path=/; Domain=.generator.email`);
      const embxValue = encodeURIComponent(JSON.stringify([email]));
      await this._setCookie(`embx=${embxValue}; Path=/; Domain=.generator.email`);
      console.log(`[INFO] Fetching inbox: ${path}`);
      const res = await this.client.get(`/${path}`);
      console.log(`[DEBUG] Inbox status: ${res.status}`);
      const $ = cheerio.load(res.data);
      const count = parseInt($("#mess_number").text()) || 0;
      const status = this._clean($("#checkdomainset").text());
      let uptime = null;
      const uptimeMatch = status.match(/uptime (\d+) days?/);
      if (uptimeMatch) uptime = parseInt(uptimeMatch[1]);
      const settings = {
        sound: $("#toggler-1").prop("checked") || false,
        sld: $("#toggler-2").prop("checked") || false,
        popup: $("#toggler-3").prop("checked") || false
      };
      const domains = this._parseDomains($);
      const messages = [];
      $("#email-table > .list-group-item:not(.active):not(script):not(ins)").each((i, el) => {
        const $el = $(el);
        if ($el.is(".adsbygoogle") || $el.find(".adsbygoogle").length) return;
        if ($el.find(".from_div_45g45gg").length > 0) {
          messages.push({
            id: i + 1,
            from: this._clean($el.find(".from_div_45g45gg").text()),
            subject: this._clean($el.find(".subj_div_45g45gg").text()),
            time: this._clean($el.find(".time_div_45g45gg").text()),
            hasDetail: $el.next().hasClass("row")
          });
        }
      });
      console.log(`[INFO] Found ${messages.length} messages. Parsing content...`);
      const $detail = $("#email-table > .list-group-item.row");
      if ($detail.length > 0 && messages.length > 0) {
        const msg = messages[0];
        const spans = $detail.find("span");
        const header = {
          to: this._clean(spans.eq(1).text()),
          from: this._clean(spans.eq(3).text().split("(")[0].trim()),
          subject: this._clean($detail.find("h1").text()),
          received: this._clean(spans.eq(7).text()),
          created: null
        };
        const senderLink = spans.eq(3).find("a").attr("href");
        if (senderLink) {
          header.sender_info = senderLink.startsWith("http") ? senderLink : `https:${senderLink}`;
        }
        const tooltip = $detail.find(".has-tooltip .tooltip").text();
        if (tooltip) {
          const createdMatch = tooltip.match(/Created: (.+)/);
          if (createdMatch) header.created = createdMatch[1].trim();
        }
        const bodyEl = $detail.find(".mess_bodiyy");
        const bodyText = this._clean(bodyEl.text());
        const bodyHtml = bodyEl.html() || "";
        const links = [];
        bodyEl.find("a").each((_, a) => {
          const href = $(a).attr("href");
          if (href) links.push({
            url: href,
            text: this._clean($(a).text())
          });
        });
        const images = [];
        bodyEl.find("img").each((_, img) => {
          const src = $(img).attr("src");
          if (src) images.push({
            src: src,
            alt: $(img).attr("alt") || ""
          });
        });
        msg.detail = {
          header: header,
          body: {
            text: bodyText,
            html: bodyHtml
          },
          links: links,
          images: images
        };
        msg.from = header.from;
        msg.subject = header.subject;
        msg.time = header.received;
      }
      return {
        success: true,
        timestamp: new Date().toISOString(),
        inbox: {
          email: this._clean($("#email_ch_text").text()) || email,
          user: user,
          domain: domain,
          count: count,
          status: status,
          uptime: uptime
        },
        urls: {
          inbox: `https://generator.email/${path}`,
          refresh: `https://generator.email/${path}`,
          new: "https://generator.email/email-generator"
        },
        settings: settings,
        domains: domains.length > 0 ? domains : this.domains,
        messages: {
          total: messages.length,
          list: messages
        }
      };
    } catch (error) {
      console.error(`[ERR] ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new TemporaryMail();
  try {
    switch (action) {
      case "create":
        try {
          const newData = await api.create();
          return res.status(200).json(newData);
        } catch (error) {
          console.error("API Create Error:", error.message);
          return res.status(500).json({
            error: "Failed to create email..",
            details: error.message
          });
        }
      case "message":
        if (!params.email) {
          return res.status(400).json({
            error: "Missing 'email' parameter. Example: { email: 'example@mail.com' }"
          });
        }
        try {
          const messages = await api.message(params);
          return res.status(200).json(messages);
        } catch (error) {
          console.error("API Message Error:", error.message);
          return res.status(500).json({
            error: "Failed to retrieve messages.",
            details: error.message
          });
        }
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'create' or 'message'."
        });
    }
  } catch (error) {
    console.error("Internal Server Error in API handler:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}