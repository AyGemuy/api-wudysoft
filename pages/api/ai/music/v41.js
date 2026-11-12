import axios from "axios";
import crypto from "crypto";
const DEV_URL = "https://worker-gen-api-dev.huykullkaq.workers.dev";
const PROD_URL = "https://worker-gen-api.huykullkaq.workers.dev";
const API_VER = "106";
const APP_NAME = "com.music.generate.aisong.sonus";
const FB_SIGNUP = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyDD4n_buSMK7J47hBKh0hRpYR8rmNYbork`;
class AIsong {
  constructor() {
    this.url = DEV_URL;
    this.http = axios.create({
      baseURL: this.url
    });
  }
  did() {
    const id = crypto.randomBytes(8).toString("hex");
    return crypto.createHash("md5").update(`${id}-${APP_NAME}`).digest("hex");
  }
  nonce() {
    return crypto.randomBytes(16).toString("hex");
  }
  ts() {
    return Math.floor(Date.now() * 1e3).toString();
  }
  enc(h) {
    return Buffer.from(JSON.stringify(h)).toString("base64");
  }
  dec(s) {
    try {
      return JSON.parse(Buffer.from(s, "base64").toString("utf8"));
    } catch (e) {
      console.error("[dec] Failed to decode state:", e.message);
      throw e;
    }
  }
  premium(uid, ts, nonce) {
    const b64 = Buffer.from(`${uid}|${ts}|${nonce}|premiummmm`.split("").reverse().join("")).toString("base64url");
    return {
      "X-Premium-Key": b64,
      "X-Premium-Sig": crypto.createHash("sha256").update(b64).digest("hex"),
      "X-Premium-V": "1"
    };
  }
  async auth() {
    console.log("[auth] Requesting anonymous token...");
    try {
      const r = await axios.post(FB_SIGNUP, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Android-Package": APP_NAME
        }
      });
      console.log("[auth] Token received, uid:", r.data.localId);
      return {
        token: r.data.idToken,
        uid: r.data.localId
      };
    } catch (e) {
      console.error("[auth] Failed:", e.response?.data || e.message);
      return null;
    }
  }
  async state(state = null) {
    console.log("[state]", state ? "Refreshing existing state..." : "Building new state...");
    try {
      const base = state ? this.dec(state) : null;
      if (!base?.Authorization) {
        const creds = await this.auth();
        if (!creds) throw new Error("Auth failed");
        const ts = this.ts(),
          nonce = this.nonce();
        const encoded = this.enc({
          "Content-Type": "application/json",
          "x-api-version": API_VER,
          "x-app-name": APP_NAME,
          Authorization: `Bearer ${creds.token}`,
          "X-App-Timestamp": ts,
          "X-App-Nonce": nonce,
          "X-Device-Id": this.did(),
          ...this.premium(creds.uid, ts, nonce)
        });
        console.log("[state] New state built.");
        return encoded;
      }
      const uid = base["X-Premium-Key"] ? Buffer.from(base["X-Premium-Key"], "base64url").toString().split("|")[0] : "unknown";
      const ts = this.ts(),
        nonce = this.nonce();
      const refreshed = this.enc({
        ...base,
        "X-App-Timestamp": ts,
        "X-App-Nonce": nonce,
        ...this.premium(uid, ts, nonce)
      });
      console.log("[state] State refreshed.");
      return refreshed;
    } catch (e) {
      console.error("[state] Failed:", e.message);
      throw e;
    }
  }
  async create({
    state = null,
    prompt = "",
    instrumental = true,
    version = "v2.0",
    title = "AI Generated",
    lyrics
  } = {}) {
    console.log("[generate] Starting generation...");
    console.log("[generate] Prompt:", prompt, "| Instrumental:", instrumental);
    try {
      const s = await this.state(state);
      const h = this.dec(s);
      let p = prompt;
      if (p.length < 10) p += ", detailed arrangement, professional mix";
      if (instrumental) p += ", instrumental only";
      const body = {
        prompt: p,
        make_instrumental: instrumental,
        version: version,
        title: title,
        lyrics_prompt: lyrics || (instrumental ? "[Intro]\n[Instrumental]\nLayered strings and pads, evolving harmony\n[Bridge]\nDynamic build, full band energy\n[Outro]\nGentle fade, resonant tail" : "[Intro]\nSoft vocals, intimate atmosphere\n[Verse]\nStorytelling melody, light rhythm section\n[Chorus]\nLifted hook, harmonies, driving drums\n[Outro]\nEmotional close, reverb tail"),
        audio_setting: {
          sample_rate: 44100,
          bitrate: 128,
          format: "mp3"
        }
      };
      console.log("[generate] Sending request to /requests");
      const r = await this.http.post("/requests", body, {
        headers: h
      });
      const task_id = r.data?.request_id;
      if (!task_id) throw new Error("No task_id in response");
      console.log("[generate] Task created:", task_id);
      return {
        task_id: task_id,
        state: s
      };
    } catch (e) {
      console.error("[generate] Failed:", e.response?.data || e.message);
      throw e;
    }
  }
  async status({
    state,
    task_id
  } = {}) {
    if (!state) throw new Error("state required");
    if (!task_id) throw new Error("task_id required");
    console.log("[status] Checking task:", task_id);
    try {
      const h = this.dec(state);
      const r = await this.http.get(`/requests/${task_id}/status`, {
        headers: h
      });
      const cur = r.data?.status || r.data?.state;
      console.log("[status]", task_id, "->", cur);
      if (cur !== "COMPLETED") return r.data;
      const response_url = r.data?.response_url;
      if (!response_url) throw new Error("No response_url in completed status");
      console.log("[status] Completed! Fetching result from:", response_url);
      try {
        const res = await axios.get(response_url, {
          headers: h
        });
        console.log("[status] Result received.");
        return {
          ...r.data,
          ...res.data
        };
      } catch (e) {
        console.error("[status] Failed to fetch result:", e.response?.data || e.message);
        throw e;
      }
    } catch (e) {
      console.error("[status] Failed:", e.response?.data || e.message);
      throw e;
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
  const api = new AIsong();
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
        if (!params.state || !params.task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' dan 'task_id' wajib diisi untuk action 'status'."
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