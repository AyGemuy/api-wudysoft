import axios from "axios";
import crypto from "crypto";
const BASE = "https://api.songgenerator.org";
class SongGen {
  constructor() {
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        "User-Agent": "okhttp/5.0.0-alpha.12",
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
      }
    });
    this.http.interceptors.request.use(cfg => {
      console.log(`[req] ${cfg.method.toUpperCase()} ${cfg.baseURL}/${cfg.url}`, JSON.stringify(cfg.params ?? cfg.data ?? ""));
      return cfg;
    });
    this.http.interceptors.response.use(res => {
      console.log(`[res]`, JSON.stringify(res.data, null, 2));
      return res.data;
    }, err => {
      console.error(`[err]`, err?.message, JSON.stringify(err.response?.data, null, 2));
      return err.response?.data || {
        success: false,
        message: err.message
      };
    });
  }
  enc(data) {
    try {
      return Buffer.from(JSON.stringify(data)).toString("base64");
    } catch (e) {
      throw new Error(`[enc] ${e.message}`);
    }
  }
  dec(state) {
    try {
      if (!state || typeof state !== "string") throw new Error("invalid state");
      return JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    } catch (e) {
      throw new Error(`[dec] ${e.message}`);
    }
  }
  genId() {
    return crypto.randomBytes(8).toString("hex");
  }
  async login(deviceId) {
    try {
      const device_id = deviceId || this.genId();
      console.log(`[login] device_id: ${device_id}`);
      const res = await this.http.post("signin", {
        platform: "android",
        device_id: device_id
      });
      if (!res?.success) throw new Error(res?.message || "login failed");
      if (!res?.data?.token) throw new Error("token missing");
      console.log(`[login] ok, user_id: ${res.data.id}`);
      return {
        device_id: device_id,
        ...res
      };
    } catch (e) {
      throw new Error(`[login] ${e.message}`);
    }
  }
  async create({
    state,
    device_id,
    prompt,
    mood = "happy",
    genre = "pop",
    name = "My Song",
    vocal_gender = "male",
    is_lyric = false,
    make_instrumental = false
  }) {
    try {
      if (!prompt) throw new Error("'prompt' required");
      let token = null;
      let did = device_id || null;
      if (state) {
        try {
          const s = this.dec(state);
          if (s?.token && s?.device_id) {
            token = s.token;
            did = s.device_id;
            console.log(`[create] reuse state, device_id: ${did}`);
          }
        } catch (e) {
          console.warn(`[create] state decode failed, re-login:`, e.message);
        }
      }
      if (!token) {
        const lg = await this.login(did);
        token = lg.data.token;
        did = lg.device_id;
      }
      this.http.defaults.headers["authorization"] = `Bearer ${token}`;
      const res = await this.http.post("users/make-song", {
        prompt: prompt,
        mood: mood,
        genre: genre,
        name: name,
        vocal_gender: vocal_gender,
        is_lyric: is_lyric,
        make_instrumental: make_instrumental
      });
      if (!res?.success) throw new Error(res?.message || "make-song failed");
      if (!res?.data?.request_id) throw new Error("request_id missing");
      console.log(`[create] ok, request_id: ${res.data.request_id}`);
      const newState = this.enc({
        token: token,
        device_id: did,
        request_id: res.data.request_id
      });
      return {
        state: newState,
        ...res.data
      };
    } catch (e) {
      throw new Error(`[create] ${e.message}`);
    }
  }
  async status({
    state
  }) {
    try {
      if (!state) throw new Error("'state' required");
      const {
        token,
        device_id,
        request_id
      } = this.dec(state);
      if (!token) throw new Error("token missing");
      if (!request_id) throw new Error("request_id missing");
      console.log(`[status] request_id: ${request_id}`);
      this.http.defaults.headers["authorization"] = `Bearer ${token}`;
      const res = await this.http.get(`users/request-status/${request_id}`);
      if (!res?.success) throw new Error(res?.message || "status failed");
      console.log(`[status] ${res?.data?.request_status}`);
      const newState = this.enc({
        token: token,
        device_id: device_id,
        request_id: request_id,
        last_status: res?.data?.request_status,
        last_checked: new Date().toISOString()
      });
      return {
        state: newState,
        ...res.data
      };
    } catch (e) {
      throw new Error(`[status] ${e.message}`);
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
  const api = new SongGen();
  try {
    let response;
    switch (action) {
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
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'status'."
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