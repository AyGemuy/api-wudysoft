import axios from "axios";
import crypto from "crypto";
import {
  URLSearchParams
} from "url";
const BASE = "https://api.chatmusicpro.com";
const HDR = {
  "User-Agent": "android",
  "Accept-Encoding": "gzip",
  "region-code": "ID",
  "user-type": "android",
  version: "9.9.9.9.9.9",
  "app-type": "1",
  language: "EN",
  "app-market": "google_play"
};
const FORM = {
  "Content-Type": "application/x-www-form-urlencoded"
};
const mkId = () => {
  const b = crypto.randomBytes(16);
  return ["00000000", b.slice(0, 2).toString("hex").toUpperCase(), b.slice(2, 4).toString("hex").toUpperCase(), "0000", b.slice(4, 10).toString("hex").toUpperCase()].join("-");
};
class ChatMusic {
  constructor({
    identityId
  } = {}) {
    this.iid = identityId || mkId();
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        ...HDR,
        "identity-id": this.iid
      }
    });
  }
  _enc(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  _dec(b64) {
    try {
      return JSON.parse(Buffer.from(b64 || "", "base64").toString("utf8"));
    } catch {
      return null;
    }
  }
  _hdr(token) {
    return {
      ...FORM,
      token: token || ""
    };
  }
  _wrap(auth, extra = {}) {
    const out = {
      ...auth,
      ...extra
    };
    return {
      state: this._enc(out),
      ...out
    };
  }
  async _login() {
    console.log("[login]", this.iid);
    try {
      const body = new URLSearchParams({
        source_site: "google_play",
        identity_id: this.iid
      });
      const res = await this.http.post("/v1/user/device_login", body.toString(), {
        headers: FORM
      });
      const d = res.data?.data;
      console.log("[login] ok | member_id:", d?.member_id, "| token:", d?.token?.slice(0, 20) + "…");
      return d;
    } catch (err) {
      console.error("[login] fail:", err?.response?.data || err.message);
      throw err;
    }
  }
  async _auth(state) {
    const s = this._dec(state);
    if (s?.token) {
      console.log("[auth] reuse | member:", s?.member_id);
      return s;
    }
    console.log("[auth] no valid state → login");
    return this._login();
  }
  async lyrics({
    state,
    prompt,
    ...rest
  }) {
    console.log("[lyrics] prompt:", prompt);
    try {
      const auth = await this._auth(state);
      const body = new URLSearchParams({
        prompt: prompt || rest.title || ""
      });
      const res = await this.http.post("/music/create-lyrics", body.toString(), {
        headers: this._hdr(auth?.token)
      });
      const d = res.data?.data;
      console.log("[lyrics] ok | title:", d?.title);
      return this._wrap(auth, {
        lyrics: d?.text,
        title: d?.title
      });
    } catch (err) {
      console.error("[lyrics] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async create({
    state,
    prompt,
    ...rest
  }) {
    console.log("[create] building music…");
    try {
      const auth = await this._auth(state);
      const body = new URLSearchParams({
        music_model_id: 6,
        title: "Untitled",
        prompt: prompt || "",
        lyrics: "",
        is_instrumental: 0,
        music_style: "K-Pop",
        music_style_code: "k-pop",
        gender_type: 0,
        ...rest
      });
      const res = await this.http.post("/music/create-music", body.toString(), {
        headers: this._hdr(auth?.token)
      });
      const d = res.data?.data;
      console.log("[create] ok | ids:", d?.create_id);
      return this._wrap(auth, {
        create_id: d?.create_id
      });
    } catch (err) {
      console.error("[create] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async status({
    state,
    ...rest
  }) {
    const id = rest.id ?? rest.create_id?.[0];
    console.log("[status] id:", id);
    try {
      const auth = await this._auth(state);
      const body = new URLSearchParams({
        id: String(id ?? "")
      });
      const res = await this.http.post("/music/get-music-progress", body.toString(), {
        headers: this._hdr(auth?.token)
      });
      const d = res.data?.data;
      console.log("[status] status:", d?.status, "| file:", d?.music_file || "(pending)");
      return this._wrap(auth, {
        music: d
      });
    } catch (err) {
      console.error("[status] error:", err?.response?.data || err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&prompt=test"
      }
    });
  }
  const api = new ChatMusic();
  try {
    let response;
    switch (action) {
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.lyrics(params);
        break;
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        if (!params.state || !params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' dan 'id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
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
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}