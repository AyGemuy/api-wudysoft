import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class HaloClient {
  constructor() {
    try {
      this.baseURL = "https://customers.api.halodoc.com/magneto-api/v1/concierge";
      this.cookieJar = new CookieJar();
      this.client = wrapper(axios.create({
        baseURL: this.baseURL,
        jar: this.cookieJar,
        withCredentials: true,
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: "https://www.halodoc.com",
          Pragma: "no-cache",
          Referer: "https://www.halodoc.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      }));
      this.sid = null;
      this.cfg = null;
      this.fp = null;
      this._log("Init success");
    } catch (err) {
      this._log("init error", err.message);
      throw err;
    }
  }
  _log(msg, data = null) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
    if (data) console.log(data);
  }
  _fp() {
    try {
      if (!this.fp) this.fp = crypto.randomUUID().replace(/-/g, "");
      return this.fp;
    } catch (err) {
      this._log("_fp error", err.message);
      throw err;
    }
  }
  async _xsrf() {
    try {
      const cookieStr = await this.cookieJar.getCookieString(this.baseURL);
      const match = cookieStr.match(/XSRF-TOKEN=([^;]+)/);
      return match ? match[1] : null;
    } catch (err) {
      this._log("_xsrf error", err.message);
      throw err;
    }
  }
  _ref() {
    try {
      return `${crypto.randomUUID()}:${Date.now()}`;
    } catch (err) {
      this._log("_ref error", err.message);
      throw err;
    }
  }
  async _hdr() {
    try {
      const xsrf = await this._xsrf();
      return xsrf ? {
        "X-XSRF-TOKEN": xsrf
      } : {};
    } catch (err) {
      this._log("_hdr error", err.message);
      throw err;
    }
  }
  async _loadState(stateB64) {
    try {
      if (!stateB64) return;
      this._log("Loading state from Base64...");
      const jsonStr = Buffer.from(stateB64, "base64").toString("utf-8");
      const data = JSON.parse(jsonStr);
      this.sid = data.sid || null;
      this.cfg = data.cfg || null;
      this.fp = data.fp || null;
      if (data.cookies) {
        this.cookieJar = CookieJar.fromJSON(JSON.stringify(data.cookies));
        this.client.defaults.jar = this.cookieJar;
      }
    } catch (err) {
      this._log("_loadState error", err.message);
      throw err;
    }
  }
  async _dumpState() {
    try {
      const cookieJson = this.cookieJar.toJSON();
      const stateObj = {
        sid: this.sid,
        cfg: this.cfg,
        fp: this.fp,
        cookies: cookieJson
      };
      return Buffer.from(JSON.stringify(stateObj)).toString("base64");
    } catch (err) {
      this._log("_dumpState error", err.message);
      throw err;
    }
  }
  async _init(fp, maxRetries = 2) {
    this._log("Initializing/Validating session...");
    try {
      const payload = {
        usecase_type: "h4c_concierge",
        fingerprint: fp || this._fp()
      };
      const doPost = async () => {
        const xsrf = await this._xsrf();
        const headers = xsrf ? {
          "X-XSRF-TOKEN": xsrf
        } : {};
        return this.client.post("/guest/sessions", payload, {
          headers: headers
        });
      };
      let res;
      let attempt = 0;
      while (true) {
        try {
          res = await doPost();
          break;
        } catch (err) {
          attempt++;
          const status = err.response?.status;
          if (status === 403 && attempt <= maxRetries) {
            this._log(`403 on attempt ${attempt} (WAF cookie just got set). Retrying...`);
            continue;
          }
          throw err;
        }
      }
      this.sid = res.data?.session_id ?? null;
      this.cfg = res.data?.session_config ?? null;
      this._log(`Session Status - New: ${res.data?.is_new_session}, ID: ${this.sid}`);
      return res.data;
    } catch (err) {
      this._log("_init error", err.message);
      throw err;
    }
  }
  async _send(sid, msg, extPayload = {}) {
    this._log(`Sending: "${msg}"`);
    try {
      if (!sid) throw new Error("Session ID required");
      const payload = {
        session_id: sid,
        message: msg,
        type: "text",
        reference_id: this._ref(),
        usecase_type: "h4c_concierge",
        ...extPayload
      };
      const headers = await this._hdr();
      const res = await this.client.post("/guest/conversation", payload, {
        headers: headers
      });
      this._log("Sent success");
      return res.data;
    } catch (err) {
      this._log("_send error", err.message);
      throw err;
    }
  }
  async _rcv(sid, ref, msg) {
    this._log(`Retrying ref ${ref}: "${msg}"`);
    try {
      if (!sid || !ref) throw new Error("Session & Reference ID required");
      const payload = {
        session_id: sid,
        message: msg,
        type: "text",
        reference_id: ref,
        usecase_type: "h4c_concierge"
      };
      const headers = await this._hdr();
      const res = await this.client.put("/guest/conversation/retry", payload, {
        headers: headers
      });
      this._log("Retry success", res.data);
      return res.data;
    } catch (err) {
      this._log("_rcv error", err.message);
      throw err;
    }
  }
  async _hist(sid, pg = 1, lim = 10) {
    this._log(`Fetching history for ${sid}`);
    try {
      if (!sid) throw new Error("Session ID required");
      const params = {
        per_page: lim,
        page_no: pg,
        sort_by: "id",
        sort_order: "desc"
      };
      const res = await this.client.get(`/guest/sessions/${encodeURIComponent(sid)}/conversations`, {
        params: params
      });
      this._log("History fetched", res.data);
      return res.data;
    } catch (err) {
      this._log("_hist error", err.message);
      throw err;
    }
  }
  async _mrg(gsid) {
    this._log(`Merging guest session ${gsid}`);
    try {
      if (!gsid) throw new Error("Guest Session ID required");
      const payload = {
        guest_session_id: gsid
      };
      const headers = await this._hdr();
      const res = await this.client.post("/guest/sessions/merge", payload, {
        headers: headers
      });
      this._log("Merge success", res.data);
      return res.data;
    } catch (err) {
      this._log("_mrg error", err.message);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    ...rest
  }) {
    this._log(`chat() called with prompt: "${prompt}"`);
    try {
      if (state) {
        await this._loadState(state);
      }
      if (!this.sid) {
        await this._init();
      }
      if (!this.sid) throw new Error("Session allocation failed");
      const res = await this._send(this.sid, prompt, rest);
      const reply = res?.message ?? "No reply";
      const intent = res?.intent ?? "unknown";
      this._log(`Reply [${intent}]:`, reply);
      const newState = await this._dumpState();
      return {
        status: true,
        result: reply,
        state: newState,
        intent: intent
      };
    } catch (err) {
      this._log("chat() error", err.message);
      return {
        status: false,
        result: err.message,
        state: state || null,
        intent: "error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new HaloClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}