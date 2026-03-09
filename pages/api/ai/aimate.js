import axios from "axios";
import FormData from "form-data";
import jwt from "jsonwebtoken";
import {
  randomUUID
} from "crypto";
import WebSocket from "ws";
class AimateClient {
  constructor() {
    this.baseUrl = "https://prod.aimate.online";
    this.wsUrl = "wss://prod.aimate.online/socket.io/?EIO=4&transport=websocket";
    this.prefix = "/v1/api";
    this.secret = "site-secret#Nerd!01";
    this.token = null;
    this.userId = null;
    this.deviceId = randomUUID();
    this.hdrs = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      Origin: "https://app.aimate.online",
      Referer: "https://app.aimate.online/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: this.hdrs,
      validateStatus: () => true
    });
    this.ws = null;
    this._idleMs = 3e4;
    this._idleTimer = null;
    this._pending = 0;
  }
  save() {
    const data = JSON.stringify({
      token: this.token,
      userId: this.userId,
      deviceId: this.deviceId
    });
    return Buffer.from(data).toString("base64");
  }
  load(state) {
    if (!state) throw new Error("[STATE] No state provided");
    try {
      const decoded = Buffer.from(state, "base64").toString("utf-8");
      const s = JSON.parse(decoded);
      if (!s?.token || !s?.userId || !s?.deviceId) {
        throw new Error("Missing required fields");
      }
      this.token = s.token;
      this.userId = s.userId;
      this.deviceId = s.deviceId;
      console.log(`[STATE] Loaded — userId: ${this.userId}`);
    } catch (e) {
      throw new Error(`[STATE] Failed to load (Invalid Base64/JSON): ${e.message}`);
    }
  }
  idleTimeout(ms) {
    this._idleMs = ms;
  }
  _tickIdle() {
    this._clearIdle();
    this._idleTimer = setTimeout(() => {
      if (this._pending > 0) return;
      console.log("[WS] Idle — auto close.");
      this._killWs();
    }, this._idleMs);
  }
  _clearIdle() {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }
  _killWs() {
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }
  }
  close(force = false) {
    if (!force && this._pending > 0) {
      console.log(`[CLOSE] Ditunda — ${this._pending} chat masih aktif.`);
      return;
    }
    this._clearIdle();
    this._killWs();
  }
  _mkToken() {
    const now = Math.floor(Date.now() / 1e3);
    this.token = jwt.sign({
      deviceId: this.deviceId,
      originalDeviceId: this.deviceId,
      applicationBuildCode: 999999,
      appVersion: "9.9.9",
      platform: "android",
      android: "33",
      iat: now
    }, this.secret, {
      algorithm: "HS256",
      expiresIn: "30d"
    });
  }
  async _auth() {
    if (this.userId && this.token) return true;
    this._mkToken();
    try {
      const res = await this.http.post(`${this.prefix}/auth/create-user`, {
        deviceId: this.deviceId
      }, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      if (res.status >= 200 && res.status < 300) {
        this.userId = res.data?.user?._id || res.data?.data?._id;
        console.log(`[AUTH] OK — userId: ${this.userId}`);
        return true;
      }
      console.error(`[AUTH] Gagal ${res.status}:`, res.data);
      return false;
    } catch (e) {
      console.error("[AUTH] Error:", e.message);
      return false;
    }
  }
  async _media(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input !== "string") return null;
      if (/^https?:\/\//.test(input)) {
        const r = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(r.data);
      }
      if (input.startsWith("data:")) {
        const b64 = input.split("base64,")[1];
        if (b64) return Buffer.from(b64, "base64");
      }
      const clean = input.trim();
      if (/^[A-Za-z0-9+/]+=*$/.test(clean)) return Buffer.from(clean, "base64");
    } catch (e) {
      console.error("[MEDIA] Error:", e.message);
    }
    return null;
  }
  async _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this._killWs();
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl, {
          headers: this.hdrs
        });
        this.ws.on("open", () => this.ws.send("40"));
        this.ws.on("message", data => {
          const msg = data.toString();
          if (msg === "2") {
            this.ws.send("3");
            return;
          }
          if (msg.startsWith("0") || msg.startsWith("40")) {
            this.ws.send(`42${JSON.stringify([ "JOIN", {
token: this.token,
userId: this.userId
} ])}`);
            setTimeout(resolve, 500);
          }
        });
        this.ws.on("error", e => {
          console.error("[WS] Error:", e.message);
          reject(e);
        });
      } catch (e) {
        console.error("[WS] Connect gagal:", e.message);
        reject(e);
      }
    });
  }
  async chat({
    prompt,
    convId = null,
    state = null,
    files = []
  }, _retry = false) {
    if (state && !_retry) {
      try {
        this.load(state);
      } catch (e) {
        console.error("[CHAT] load state gagal:", e.message);
      }
      this._killWs();
    }
    const authed = await this._auth();
    if (!authed) throw new Error("[CHAT] Auth gagal");
    try {
      await this._connect();
    } catch (e) {
      throw new Error(`[CHAT] WS gagal: ${e.message}`);
    }
    this._pending++;
    this._clearIdle();
    return new Promise(async (resolve, reject) => {
      let result = "";
      let meta = {
        convId: convId
      };
      let done = false;
      const fin = (val, err) => {
        if (done) return;
        done = true;
        this._pending--;
        off();
        if (this._pending === 0) this._tickIdle();
        err ? reject(err) : resolve(val);
      };
      const onMsg = data => {
        const msg = data.toString();
        if (!msg.startsWith("42")) return;
        try {
          const [ev, p] = JSON.parse(msg.substring(2));
          if (ev !== "streamConversation") return;
          if (meta.convId && p.conversationId !== meta.convId) return;
          if (!meta.convId) {
            meta.convId = p.conversationId;
            meta.userId = p._id;
          }
          if (p.message) {
            process.stdout.write(p.message);
            result += p.message;
          }
          if (p.hasEnded) {
            process.stdout.write("\n");
            fin({
              result: result,
              convId: p.conversationId,
              userId: p._id,
              timestamp: new Date().toISOString(),
              state: this.save()
            });
          }
        } catch (_) {}
      };
      const off = () => this.ws?.removeListener("message", onMsg);
      this.ws.on("message", onMsg);
      try {
        const ep = convId ? "/conversations/resume" : "/conversations";
        const form = new FormData();
        form.append("userId", this.userId);
        form.append("query", prompt);
        if (convId) form.append("conversationId", convId);
        const list = Array.isArray(files) ? files.filter(Boolean) : files ? [files] : [];
        if (list.length) {
          let n = 0;
          for (const f of list) {
            try {
              const buf = await this._media(f);
              if (buf) form.append("files", buf, {
                filename: `img-${Date.now()}-${n++}.jpg`,
                contentType: "image/jpeg"
              });
            } catch (e) {
              console.error("[UPLOAD] Skip file:", e.message);
            }
          }
          if (n) console.log(`[UPLOAD] ${n} file(s) attached.`);
        }
        console.log(`[POST] ${ep} | conv: ${convId ?? "new"}`);
        const res = await this.http.post(`${this.prefix}${ep}`, form, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...form.getHeaders()
          }
        });
        if (res.status === 401) {
          fin(null, null);
          if (!_retry) {
            console.warn("[AUTH] 401 — refresh & retry...");
            this.token = null;
            this.userId = null;
            this.deviceId = randomUUID();
            this._killWs();
            try {
              resolve(await this.chat({
                prompt: prompt,
                convId: convId,
                files: files
              }, true));
            } catch (e) {
              reject(e);
            }
          } else {
            reject({
              error: "Auth gagal setelah retry",
              status: 401
            });
          }
          return;
        }
        if (res.status >= 400) {
          fin(null, {
            error: "HTTP Error",
            status: res.status,
            raw: res.data
          });
        }
      } catch (e) {
        console.error("[POST] Error:", e.message);
        fin(null, e);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AimateClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}