import axios from "axios";
import crypto from "crypto";
class TenMinuteMail {
  constructor() {
    this.baseURL = "https://10minutemail.com";
    this.state = {};
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache"
      },
      withCredentials: true
    });
  }
  async create(params = {}) {
    try {
      const {
        state
      } = params;
      if (state) {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());
        this.state = decoded;
      }
      console.log("Create...");
      const {
        data,
        headers
      } = await this.axios.get("/session/address");
      const cookies = headers["set-cookie"]?.join("; ") || "";
      const sessionMatch = cookies.match(/JSESSIONID=([^;]+)/);
      this.state = {
        email: data?.address || "",
        session: sessionMatch?.[1] || "",
        cookies: cookies
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
  async list(index = 0) {
    try {
      console.log("List...");
      const {
        data
      } = await this.axios.get(`/messages/messagesAfter/${index}`, {
        headers: {
          cookie: this.state?.cookies || "",
          referer: `${this.baseURL}/`
        }
      });
      console.log(`OK: ${data?.length || 0} msg`);
      return {
        list: data || [],
        count: String(data?.length || 0),
        state: Buffer.from(JSON.stringify(this.state)).toString("base64")
      };
    } catch (err) {
      console.error("List err:", err?.message);
      throw err;
    }
  }
  async count() {
    try {
      console.log("Count...");
      const {
        data
      } = await this.axios.get("/messages/messageCount", {
        headers: {
          cookie: this.state?.cookies || "",
          referer: `${this.baseURL}/`
        }
      });
      console.log(`OK: ${data?.messageCount || 0}`);
      return {
        count: String(data?.messageCount || 0),
        state: Buffer.from(JSON.stringify(this.state)).toString("base64")
      };
    } catch (err) {
      console.error("Count err:", err?.message);
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
      }
      if (email) {
        console.log(`Fetch: ${email}`);
        const {
          list = []
        } = await this.list();
        const msg = list.find(m => m?.id === email);
        if (!msg) {
          console.log("Not found");
          return {
            found: false,
            state: Buffer.from(JSON.stringify(this.state)).toString("base64")
          };
        }
        console.log(`OK: ${msg?.subject}`);
        return {
          ...msg,
          found: true,
          state: Buffer.from(JSON.stringify(this.state)).toString("base64")
        };
      }
      const {
        list = []
      } = await this.list();
      console.log(`Search: ${list.length} msg`);
      if (!from && !subject) {
        return {
          list: list,
          count: String(list.length),
          state: Buffer.from(JSON.stringify(this.state)).toString("base64")
        };
      }
      const matches = list.filter(msg => {
        const okFrom = !from || msg?.sender?.toLowerCase()?.includes(from?.toLowerCase());
        const okSubject = !subject || msg?.subject?.toLowerCase()?.includes(subject?.toLowerCase());
        return okFrom && okSubject;
      });
      if (!matches.length) {
        console.log("No match");
        return {
          list: list,
          matches: [],
          found: false,
          count: "0",
          state: Buffer.from(JSON.stringify(this.state)).toString("base64")
        };
      }
      console.log(`Match: ${matches.length}`);
      return {
        list: list,
        matches: matches,
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
  const api = new TenMinuteMail();
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