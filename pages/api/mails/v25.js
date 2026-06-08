import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    try {
      this.token = "";
      this.address = "";
      this.password = "";
      this.baseUrl = "https://api.mail.tm";
      this.headers = {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://internxt.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://internxt.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      console.log("[MailTm] Client structural entry point initialized.");
    } catch (err) {
      console.error("[MailTm] Init crash:", err?.message);
    }
  }
  _r(type) {
    try {
      const v = "aeiou";
      const c = "bcdfghjklmnpqrstvwxyz";
      const rc = str => str.charAt(crypto.randomInt ? crypto.randomInt(0, str.length) : Math.floor(Math.random() * str.length));
      const rn = (min, max) => crypto.randomInt ? crypto.randomInt(min, max) : Math.floor(Math.random() * (max - min)) + min;
      if (type === "user") {
        let name = "";
        const syl = rn(3, 5);
        for (let i = 0; i < syl; i++) {
          name += rc(c) + rc(v);
        }
        return `${name}${rn(10, 99)}`;
      }
      let pass = rc(c).toUpperCase() + rc(v);
      for (let i = 0; i < 3; i++) {
        pass += rc(c) + rc(v);
      }
      return `${pass}${rn(100, 999)}`;
    } catch (err) {
      return crypto.randomUUID ? crypto.randomUUID().split("-")[0] : Math.random().toString(36).substring(2, 10);
    }
  }
  _s(obj) {
    try {
      if (Array.isArray(obj)) return obj.map(v => this._s(v));
      if (obj !== null && typeof obj === "object" && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
          const sk = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`).replace("@", "at_");
          acc[sk] = this._s(obj[key]);
          return acc;
        }, {});
      }
      return obj;
    } catch (err) {
      return obj;
    }
  }
  async _q(method, path, data, tok) {
    try {
      const act = tok || this.token;
      const hdrs = {
        ...this.headers
      };
      if (act) hdrs["authorization"] = `Bearer ${act}`;
      const res = await axios({
        method: method || "GET",
        url: `${this.baseUrl}${path}`,
        headers: hdrs,
        data: data || null
      });
      return res?.data || null;
    } catch (err) {
      console.error(`[MailTm] Err [${method}] ${path}:`, err?.response?.data || err?.message);
      throw err;
    }
  }
  async _t(tok) {
    try {
      if (tok || this.token) return tok || this.token;
      console.log("[MailTm] Token absence detected. Requesting auto registration...");
      const acc = await this.create({});
      return acc?.token || "";
    } catch (err) {
      return "";
    }
  }
  async domain({
    token,
    ...rest
  }) {
    try {
      console.log("[MailTm] Pulling accessible network domains...");
      const act = token || this.token;
      const p = rest?.page || 1;
      const raw = await this._q("GET", `/domains?page=${p}`, null, act);
      return {
        result: this._s(raw),
        token: act
      };
    } catch (err) {
      return {
        result: null,
        token: token || this.token
      };
    }
  }
  async create({
    token,
    ...rest
  }) {
    try {
      console.log("[MailTm] Initializing identity constructor routine...");
      let addr = rest?.address || this.address;
      let pass = rest?.password || this.password;
      if (!addr) {
        const doms = await this.domain({
          token: token || this.token
        });
        const selected = doms?.result?.[0]?.domain || "wshu.net";
        addr = `${this._r("user")}@${selected}`;
      }
      if (!pass) pass = this._r("pass");
      this.address = addr;
      this.password = pass;
      console.log(`[MailTm] Committing mapping for address target: ${addr}`);
      const body = {
        address: addr,
        password: pass
      };
      const accRaw = await this._q("POST", "/accounts", body, token);
      console.log("[MailTm] Exchanging credentials for identity token signature...");
      const tokRaw = await this._q("POST", "/token", body, token);
      this.token = tokRaw?.token || this.token;
      return {
        result: this._s({
          ...accRaw,
          account_password: pass
        }),
        token: this.token
      };
    } catch (err) {
      return {
        result: null,
        token: token || this.token
      };
    }
  }
  async message({
    token,
    ...rest
  }) {
    try {
      const act = await this._t(token);
      const msgId = rest?.id || rest?.msg_id || null;
      if (msgId) {
        console.log(`[MailTm] Deep pulling targeted single node package message: ${msgId}`);
        const single = await this._q("GET", `/messages/${msgId}`, null, act);
        return {
          result: this._s(single),
          token: act
        };
      }
      console.log("[MailTm] Syncing current mailbox message queue registry...");
      const p = rest?.page || 1;
      const shallow = await this._q("GET", `/messages?page=${p}`, null, act) || [];
      const detailed = [];
      console.log(`[MailTm] Parsing sequence buffer for ${shallow.length} mail packages via loop matrix...`);
      for (const item of shallow) {
        try {
          const id = item?.id;
          if (id) {
            const content = await this._q("GET", `/messages/${id}`, null, act);
            if (content) detailed.push(content);
          }
        } catch (subErr) {
          detailed.push(item);
        }
      }
      return {
        result: this._s(detailed),
        token: act
      };
    } catch (err) {
      return {
        result: null,
        token: token || this.token
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["domain", "create", "message"];
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
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "domain":
        response = await api.domain(params);
        break;
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' wajib diisi untuk action 'message'."
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