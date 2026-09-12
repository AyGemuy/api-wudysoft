import axios from "axios";
import * as cheerio from "cheerio";
const BASE = "https://www.emailtick.com";
const UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
class EmailTick {
  constructor() {
    this.cookies = [];
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  normCookie(h) {
    if (!h) return [];
    const arr = Array.isArray(h) ? h : [h];
    return arr.map(v => String(v).split(";")[0]).filter(Boolean);
  }
  mergeCookie(old, next) {
    const map = new Map();
    for (const c of [...old, ...next]) {
      const [k, ...r] = c.split("=");
      map.set(k.trim(), `${k.trim()}=${r.join("=")}`);
    }
    return [...map.values()];
  }
  async req(method, url, {
    headers = {},
    data,
    referer
  } = {}) {
    console.log(`[req] ${method} ${url}`);
    try {
      const res = await axios({
        method: method,
        url: url,
        headers: {
          "user-agent": UA,
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9,id;q=0.8",
          referer: referer ?? `${BASE}/`,
          ...this.cookies.length ? {
            cookie: this.cookies.join("; ")
          } : {},
          ...headers
        },
        data: data,
        timeout: 3e4,
        validateStatus: () => true,
        transformResponse: [d => d]
      });
      const text = typeof res.data === "string" ? res.data : String(res.data ?? "");
      const setCookie = this.normCookie(res.headers["set-cookie"]);
      this.cookies = this.mergeCookie(this.cookies, setCookie);
      return {
        status: res.status,
        text: text,
        finalUrl: res.request?.res?.responseUrl
      };
    } catch (err) {
      console.error("[req] error:", err?.message);
      throw err;
    }
  }
  parseHome(html) {
    const $ = cheerio.load(html);
    return {
      mailbox: $("#mailbox").val() || null,
      salt: $("#salt").val() || null
    };
  }
  parseInbox(html) {
    const $ = cheerio.load(html);
    const msgs = [];
    $("table tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 3) return;
      const sender = $(tds[0]).text().trim();
      const subjectTd = $(tds[1]);
      const subject = subjectTd.text().trim();
      const time = $(tds[2]).text().trim();
      const link = subjectTd.find("a").attr("href") || null;
      const code = link?.match(/\/mailbox\/code\/([a-z0-9]+)/i)?.[1] || null;
      if (!code) return;
      if ((sender + subject).toLowerCase().includes("inbox is empty")) return;
      msgs.push({
        sender: sender || "Unknown",
        subject: subject || "(No Subject)",
        time: time,
        link: link,
        code: code
      });
    });
    return msgs;
  }
  cleanHtml(html) {
    if (!html) return "";
    const $ = cheerio.load(html.trim());
    const w = $(".email-content");
    return (w.length >= 2 ? $.html(w.last()) : html).trim();
  }
  toText(html) {
    if (!html) return "";
    const $ = cheerio.load(html);
    return $.root().text().replace(/\s+/g, " ").trim();
  }
  isHtmlPage(s) {
    const t = (s || "").trim().toLowerCase();
    return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<head");
  }
  async activate(mailbox) {
    console.log("[activate] mailbox:", mailbox);
    try {
      const r = await this.req("POST", `${BASE}/index/index/goactive.html`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          origin: BASE,
          accept: "application/json, text/plain, */*"
        },
        data: new URLSearchParams({
          mailbox: mailbox
        }).toString()
      });
      const raw = r.text.trim();
      let ok = raw === "1";
      if (!ok) try {
        ok = JSON.parse(raw) === 1;
      } catch {}
      console.log("[activate] ok:", ok);
      return ok;
    } catch (err) {
      console.error("[activate] error:", err?.message);
      return false;
    }
  }
  async check(mailbox, salt) {
    console.log("[check] mailbox:", mailbox);
    try {
      const r = await this.req("POST", `${BASE}/index/index/checkmail.html`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          origin: BASE,
          accept: "application/json, text/plain, */*"
        },
        data: new URLSearchParams({
          box: mailbox,
          salt: salt
        }).toString()
      });
      console.log("[check] response:", r.text.trim());
      return r.text.trim();
    } catch (err) {
      console.error("[check] error:", err?.message);
      return null;
    }
  }
  async warm(detailUrl) {
    console.log("[warm] url:", detailUrl);
    try {
      await this.req("GET", detailUrl, {
        referer: `${BASE}/`
      });
    } catch (err) {
      console.error("[warm] error:", err?.message);
    }
  }
  async content(code, detailUrl, retries = 2) {
    console.log("[content] code:", code);
    for (let i = 1; i <= retries; i++) {
      try {
        const r = await this.req("POST", `${BASE}/index/index/mailcontent.html`, {
          referer: detailUrl,
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            origin: BASE,
            accept: "application/json, text/plain, */*"
          },
          data: new URLSearchParams({
            code: code
          }).toString()
        });
        const raw = r.text.trim();
        if (this.isHtmlPage(raw)) {
          if (i < retries) {
            await this.sleep(600);
            continue;
          }
          return {
            ok: false,
            error: "HTML error page",
            rawPreview: raw.slice(0, 220)
          };
        }
        let j;
        try {
          j = JSON.parse(raw);
        } catch {
          if (i < retries) {
            await this.sleep(600);
            continue;
          }
          return {
            ok: false,
            error: "Invalid JSON",
            rawPreview: raw.slice(0, 220)
          };
        }
        if (j?.status === 0) return {
          ok: false,
          error: j?.msg || "status=0"
        };
        const bodyHtml = this.cleanHtml(j?.msg?.content || "");
        return {
          ok: true,
          bodyHtml: bodyHtml,
          bodyText: this.toText(bodyHtml),
          attachments: Array.isArray(j?.msg?.attachments) ? j.msg.attachments : []
        };
      } catch (err) {
        console.error("[content] error:", err?.message);
        if (i < retries) {
          await this.sleep(600);
          continue;
        }
        return {
          ok: false,
          error: err?.message
        };
      }
    }
    return {
      ok: false,
      error: "Unknown"
    };
  }
  async create({
    ...rest
  }) {
    console.log("[create] init...");
    try {
      const home = await this.req("GET", `${BASE}/`);
      const {
        mailbox,
        salt
      } = this.parseHome(home.text);
      console.log("[create] mailbox:", mailbox, "| salt:", salt);
      if (!mailbox || !salt) throw new Error("Gagal parse mailbox/salt");
      const ok = await this.activate(mailbox);
      if (!ok) throw new Error("Activation failed");
      await this.check(mailbox, salt);
      return {
        success: true,
        result: {
          mailbox: mailbox,
          salt: salt
        },
        cookies: this.cookies
      };
    } catch (err) {
      console.error("[create] error:", err?.message);
      return {
        success: false,
        result: err?.message
      };
    }
  }
  async message({
    cookies,
    mailbox,
    salt,
    ...rest
  }) {
    if (!mailbox || !salt) return {
      success: false,
      result: "mailbox & salt diperlukan"
    };
    console.log("[message] fetching inbox for:", mailbox);
    this.cookies = cookies || this.cookies;
    try {
      await this.check(mailbox, salt);
      const home = await this.req("GET", `${BASE}/`);
      const inbox = this.parseInbox(home.text);
      console.log("[message] inbox count:", inbox.length);
      const messages = [];
      for (const msg of inbox) {
        const detailUrl = msg.link ? `${BASE}${msg.link}` : null;
        if (!detailUrl) {
          messages.push({
            ...msg,
            ok: false,
            error: "Missing detailUrl"
          });
          continue;
        }
        await this.warm(detailUrl);
        const c = await this.content(msg.code, detailUrl);
        messages.push({
          ...msg,
          detailUrl: detailUrl,
          ok: c.ok,
          bodyText: c.ok ? c.bodyText : "",
          bodyHtml: c.ok ? c.bodyHtml : "",
          attachments: c.ok ? c.attachments : [],
          error: c.ok ? null : c.error || null,
          rawPreview: c.ok ? null : c.rawPreview || null
        });
        await this.sleep(250);
      }
      return {
        success: true,
        result: {
          mailbox: mailbox,
          fetchedAt: new Date().toISOString(),
          messages: messages
        },
        cookies: this.cookies
      };
    } catch (err) {
      console.error("[message] error:", err?.message);
      return {
        success: false,
        result: err?.message
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
  const api = new EmailTick();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.mailbox) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'mailbox' wajib diisi untuk action 'message'."
          });
        }
        if (!params.salt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'salt' wajib diisi untuk action 'message'."
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