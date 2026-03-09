import axios from "axios";
import crypto from "crypto";
import WebSocket from "ws";
class AIWriter {
  constructor() {
    this.base = "https://api-aiwriter.revoto.ai";
    this.wssUrl = "wss://api-aiwriter.revoto.ai/socket.io/?EIO=4&transport=websocket";
    this.secret = "vKrszb6E6aSLX7Kyevxb7wRG";
    this.did = crypto.randomUUID();
    this.lang = "vi";
    this.token = this._genToken();
    this.isRegistered = false;
    this._initPromise = null;
    this.http = axios.create({
      baseURL: this.base,
      timeout: 6e4,
      headers: {
        "User-Agent": "Dart/3.9 (dart:io)",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        lang: this.lang,
        auth_token: ""
      }
    });
  }
  _genToken() {
    return `f7pp${crypto.randomBytes(20).toString("hex")}:APA91b${crypto.randomBytes(40).toString("hex")}`;
  }
  _sig(ts = "") {
    return crypto.createHash("sha256").update(`${this.did}${ts}${this.secret}`).digest("hex");
  }
  async _ensureInit() {
    if (this.isRegistered) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = new Promise((resolve, reject) => {
      console.log("[Init] Menghubungkan ke WSS untuk registrasi...");
      const ws = new WebSocket(this.wssUrl, {
        headers: {
          "User-Agent": "Dart/3.9 (dart:io)"
        }
      });
      const timeout = setTimeout(() => {
        ws.terminate();
        this._initPromise = null;
        reject(new Error("WSS Handshake Timeout"));
      }, 15e3);
      ws.on("open", () => ws.send("40"));
      ws.on("message", data => {
        const msg = data.toString();
        if (msg.startsWith("40")) {
          const ts = Date.now();
          const payload = ["init_client_v2", {
            device_id: this.did,
            timestamp: ts,
            signature: this._sig(ts),
            device_token: this.token,
            device_name: "RMX3890",
            os_name: "Android",
            os_version: "35",
            version_app: "2.4.4",
            credit: 15,
            credit_free: 2
          }];
          ws.send(`42${JSON.stringify(payload)}`);
        } else if (msg.startsWith("42")) {
          console.log("[Init] Device Berhasil Terdaftar.");
          this.isRegistered = true;
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });
      ws.on("error", e => {
        this._initPromise = null;
        reject(e);
      });
    });
    return this._initPromise;
  }
  _handleError(ctx, err) {
    const msg = err.response?.data || err.message;
    console.error(`[${ctx}_ERROR]`, msg);
    throw new Error(typeof msg === "object" ? JSON.stringify(msg) : msg);
  }
  async model({
    lang = this.lang,
    ...rest
  } = {}) {
    await this._ensureInit();
    try {
      console.log("[Request] Mengambil daftar model...");
      const res = await this.http.get("/get_model", {
        params: {
          lang: lang,
          ...rest
        }
      });
      return res.data;
    } catch (e) {
      this._handleError("MODEL", e);
    }
  }
  async chat({
    prompt,
    model = "gpt-4o-mini",
    stream = false,
    n = 1,
    ...rest
  }) {
    await this._ensureInit();
    try {
      const ts = Date.now();
      const payload = {
        device_id: this.did,
        prompt: `Human:${prompt}\nAI: `,
        stream: stream,
        n: n,
        ai_type: "gpt",
        timestamp: ts,
        signature: this._sig(ts),
        model: model,
        image_link: "",
        ...rest
      };
      console.log("[Request] Mengirim chat...");
      const res = await this.http.post("/send_chat_v2", payload);
      return res.data;
    } catch (e) {
      this._handleError("CHAT", e);
    }
  }
  async image({
    prompt,
    size = "1792x1024",
    n = 1,
    ...rest
  }) {
    await this._ensureInit();
    try {
      const payload = {
        device_id: this.did,
        prompt: prompt,
        stream: false,
        n: n,
        size: size,
        signature: this._sig(""),
        ...rest
      };
      console.log("[Request] Menggenerate gambar...");
      const res = await this.http.post("/generate_image", payload);
      return res.data;
    } catch (e) {
      this._handleError("IMAGE", e);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["model", "chat", "image"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=chat&prompt=hai"
      }
    });
  }
  const api = new AIWriter();
  try {
    let response;
    switch (action) {
      case "model":
        response = await api.model(params);
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
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await api.image(params);
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