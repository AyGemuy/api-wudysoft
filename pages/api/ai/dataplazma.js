import axios from "axios";
import crypto from "crypto";
class Dataplazma {
  constructor() {
    this.url = "https://ai.dataplazma.com";
    this.ua = "okhttp/4.12.0";
    this.k1 = "Hbbdi7xlv037cbbjsj47g4c2c1c4zzp0";
  }
  _tk() {
    try {
      const ts = Math.floor(Date.now() / 1e3);
      const key = Buffer.from(this.k1, "utf8");
      const salt = `app_${ts}`;
      const cipher = crypto.createCipheriv("aes-256-gcm", key, key);
      const enc = Buffer.concat([cipher.update(salt, "utf8"), cipher.final()]);
      return enc.toString("hex");
    } catch (e) {
      return null;
    }
  }
  async _ex(cfg) {
    try {
      const path = cfg.path?.replace(/^\//, "");
      const token = this._tk();
      const isPost = ["POST", "PATCH", "PUT"].includes(cfg.method?.toUpperCase());
      console.log(`[PROSES] ${cfg.method || "GET"} -> ${this.url}/${path}`);
      const headers = {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        Authorization: `Bearer ${token}`,
        ...cfg.headers || {}
      };
      if (isPost) headers["Content-Type"] = "application/json";
      const res = await axios({
        method: cfg.method || "GET",
        url: `${this.url}/${path}`,
        headers: headers,
        params: cfg.params || {},
        data: isPost ? cfg.data || {} : undefined,
        timeout: 6e4
      });
      const body = res?.data || {};
      const result = body?.message || body?.items || body?.url || body;
      return {
        result: result,
        success: true,
        ...body
      };
    } catch (e) {
      const errData = e.response?.data;
      const msg = typeof errData === "string" && errData.includes("SyntaxError") ? "Server Body-Parser Error (Check Method/Body)" : errData?.message || e.message;
      console.log(`[ERR] ${cfg.path}: ${msg}`);
      return {
        result: null,
        success: false,
        error: msg
      };
    }
  }
  async actor(id) {
    return await this._ex({
      method: "GET",
      path: `api/v2/chat/actors/${id}`
    });
  }
  async chat({
    stream = false,
    prompt,
    actor_id,
    ...rest
  }) {
    if (actor_id) {
      const a = await this.actor(actor_id);
      rest.actor = rest.actor || a?.act_as || a?.role_name || "";
      rest.prefix = rest.prefix || a?.prompt_prefix || "";
      rest.suffix = rest.suffix || a?.suffix || "";
    }
    const isSub = rest?.is_subscribed || 0;
    const path = stream ? `api/v2/completions-stream?is_subscribed=${isSub}` : `api/v2/completions?is_subscribed=${isSub}&is_only_prompt=${actor_id ? 0 : 1}`;
    return await this._ex({
      method: "POST",
      path: path,
      data: {
        prompt: prompt || "",
        actor: rest.actor || "",
        actor_id: actor_id || "",
        prefix: rest.prefix || "",
        suffix: rest.suffix || ""
      }
    });
  }
  async search({
    query,
    ...rest
  }) {
    return await this._ex({
      method: "GET",
      path: "api/v2/chat/actors",
      params: {
        per_page: rest?.per_page || 20,
        search: query || "",
        page: rest?.page || 1
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&prompt=isekai"
      }
    });
  }
  const api = new Dataplazma();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: true,
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