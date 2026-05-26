import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import * as cheerio from "cheerio";
import WebSocket from "ws";
class Rudi {
  constructor() {
    this.ORIGIN = "https://rudi.animuz.ai";
    this.API = "https://api.rudi.animuz.ai";
    this.S3 = "https://animuz-public.s3.ap-southeast-1.amazonaws.com/";
    this.WS_URL = "wss://pn1o5spfd5.execute-api.ap-southeast-1.amazonaws.com/dev/";
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.SEC_UA = '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"';
    this._Rixits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
    this.cookies = [];
    this.http = axios.create({
      withCredentials: true
    });
    this.clientId = null;
    this.sessionId = null;
    this.embedId = null;
    this.ws = null;
    this.greets = [];
    this.ready = false;
    this.http.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(c => {
          const raw = c.split(";")[0];
          if (!this.cookies.includes(raw)) this.cookies.push(raw);
        });
      }
      return res;
    }, err => Promise.reject(err));
    this.http.interceptors.request.use(config => {
      if (this.cookies.length) config.headers["Cookie"] = this.cookies.join("; ");
      return config;
    }, err => Promise.reject(err));
  }
  _fromBase64(q) {
    try {
      if (isNaN(Number(q)) || q === null || q === Number.POSITIVE_INFINITY) throw new Error("Invalid input");
      if (q < 0) throw new Error("Can't represent negative numbers");
      let e, t = Math.floor(q),
        n = "";
      for (; e = t % 64, n = this._Rixits.charAt(e) + n, t = Math.floor(t / 64), t !== 0;);
      return n;
    } catch (e) {
      console.error("[_fromBase64] error:", e.message);
      throw e;
    }
  }
  _toBase64(q) {
    try {
      let e = 0;
      q = q.split("");
      for (let t = 0; t < q.length; t++) e = 64 * e + this._Rixits.indexOf(q[t]);
      return e;
    } catch (e) {
      console.error("[_toBase64] error:", e.message);
      throw e;
    }
  }
  _genMsgID(d = new Date()) {
    try {
      const ts = d.valueOf().toString(36);
      let rnd = "";
      while (rnd.length < 3) rnd += this._fromBase64(Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER));
      return ts + rnd.substr(Math.floor(rnd.length / 2 - 1.5), 3);
    } catch (e) {
      console.error("[_genMsgID] error:", e.message);
      throw e;
    }
  }
  _genSessID() {
    try {
      return "WB" + crypto.randomUUID().replaceAll("-", "") + "-" + Math.floor(Date.now() / 36e5);
    } catch (e) {
      console.error("[_genSessID] error:", e.message);
      throw e;
    }
  }
  _mimeOf(b) {
    try {
      if (b[0] === 137 && b[1] === 80) return "image/png";
      if (b[0] === 255 && b[1] === 216) return "image/jpeg";
      if (b[0] === 71 && b[1] === 73) return "image/gif";
      if (b[0] === 82 && b[6] === 87) return "image/webp";
      return "image/png";
    } catch (e) {
      console.error("[_mimeOf] error:", e.message);
      return "image/png";
    }
  }
  _extOf(m) {
    try {
      return {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp"
      } [m] || "png";
    } catch (e) {
      console.error("[_extOf] error:", e.message);
      return "png";
    }
  }
  _h(extra = {}) {
    try {
      return {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": this.UA,
        "sec-ch-ua": this.SEC_UA,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...extra
      };
    } catch (e) {
      console.error("[_h] error:", e.message);
      return extra;
    }
  }
  async init() {
    try {
      console.log("[init] fetching page...");
      const res = await this.http.get(`${this.ORIGIN}/en/?`, {
        headers: this._h({
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          referer: `${this.ORIGIN}/en/?`
        })
      });
      const $ = cheerio.load(res.data || "");
      $("script[data-embed-id]").each((_, el) => {
        const eid = $(el).attr("data-embed-id");
        if (eid) this.embedId = eid;
        const d = $(el).data();
        const g = d?.greetings;
        if (g && !this.greets.length) {
          try {
            if (typeof g === "string") {
              const p = JSON.parse(g);
              this.greets = Array.isArray(p) ? p.map(i => ({
                role: "assistant",
                content: i
              })) : [{
                role: "assistant",
                content: p
              }];
            } else if (Array.isArray(g)) this.greets = g.map(i => ({
              role: "assistant",
              content: i
            }));
          } catch {}
        }
      });
      if (!this.embedId) throw new Error("No data-embed-id found");
      this.clientId = this.embedId;
      this.ready = true;
      console.log(`[init] success: embedId=${this.embedId} clientId=${this.clientId}`);
      console.log(this.greets);
      return this;
    } catch (e) {
      console.error("[init] error:", e?.message);
      throw e;
    }
  }
  async _presign(key) {
    try {
      const res = await this.http.get(`${this.API}/v2/public/presignedUrl`, {
        params: {
          method: "UPLOAD",
          key: key
        },
        headers: this._h({
          "client-id": this.clientId,
          "session-id": this.sessionId,
          origin: this.ORIGIN,
          referer: `${this.ORIGIN}/`
        })
      });
      return res.data;
    } catch (e) {
      console.error("[_presign] error:", e?.message);
      throw e;
    }
  }
  async _upload(img) {
    try {
      let buf, mime;
      if (typeof img === "string" && /^https?:\/\//i.test(img)) {
        const r = await axios.get(img, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(r.data);
        mime = r.headers?.["content-type"]?.split(";")[0]?.trim() || this._mimeOf(buf);
      } else if (typeof img === "string") {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        mime = match?.[1] || "image/png";
        buf = Buffer.from(match?.[2] || img, "base64");
      } else if (Buffer.isBuffer(img)) {
        buf = img;
        mime = this._mimeOf(img);
      } else throw new TypeError("Invalid image format");
      const fid = crypto.randomBytes(13).toString("hex");
      const key = `code_interpreter/${fid}.${this._extOf(mime)}`;
      const ps = await this._presign(key);
      console.log(ps);
      const fd = new FormData();
      const fields = ps?.fields || {};
      for (const [k, v] of Object.entries(fields)) fd.append(k, v);
      fd.append("file", buf, {
        filename: `${fid}.${this._extOf(mime)}`,
        contentType: mime
      });
      await axios.post(ps?.url || this.S3, fd, {
        headers: {
          ...fd.getHeaders(),
          Origin: this.ORIGIN,
          Referer: `${this.ORIGIN}/`,
          "User-Agent": this.UA
        }
      });
      return `${this.S3}${fields?.key || `${ps?.startsWith || ""}${key}`}`;
    } catch (e) {
      console.error("[_upload] error:", e?.message);
      throw e;
    }
  }
  async _connect() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) return;
      console.log("[ws] connecting...");
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(this.WS_URL, ["Client", this.clientId, this.sessionId], {
          headers: {
            Origin: this.ORIGIN,
            "User-Agent": this.UA,
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
            "Accept-Language": "id-ID"
          }
        });
        this.ws.once("open", () => {
          console.log("[ws] connected");
          resolve();
        });
        this.ws.once("error", e => {
          console.error("[ws] connection error", e?.message);
          reject(e);
        });
      });
    } catch (e) {
      console.error("[_connect] error:", e?.message);
      throw e;
    }
  }
  async chat({
    state,
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.ready) await this.init();
      let restored = null;
      if (state && typeof state === "string") {
        try {
          restored = JSON.parse(Buffer.from(state, "base64").toString());
        } catch {
          restored = null;
        }
      }
      this.sessionId = restored?.sessionId || this._genSessID();
      await this._connect();
      const imgs = [];
      if (image) {
        const list = Array.isArray(image) ? image : [image];
        for (const i of list) imgs.push(await this._upload(i));
      }
      const msgId = this._genMsgID();
      const type = imgs.length ? "image" : "text";
      const body = {
        msgID: msgId,
        type: type,
        message: prompt || "",
        ...this.greets.length && !restored ? {
          greetings: this.greets
        } : {},
        ...imgs.length ? {
          images: imgs
        } : {},
        ...rest
      };
      console.log(`[chat] sending: msgID=${msgId} type=${type}`);
      this.ws.send(JSON.stringify({
        action: "sendMessage",
        body: JSON.stringify(body)
      }));
      const resp = await new Promise((resolve, reject) => {
        let chunks = [];
        let tid = setTimeout(() => {
          if (this.ws) {
            this.ws.close();
            console.log("[ws] closed due to timeout");
          }
          reject(new Error("ws timeout"));
        }, 3e4);
        const reset = () => {
          clearTimeout(tid);
          tid = setTimeout(() => {
            if (this.ws) {
              this.ws.close();
              console.log("[ws] closed due to timeout");
            }
            reject(new Error("ws timeout"));
          }, 3e4);
        };
        const onMsg = raw => {
          try {
            const msg = JSON.parse(raw.toString());
            console.log(msg);
            if (msg?.event === "ack" || msg?.event === "action") {
              reset();
              return;
            }
            if (msg?.event === "message_stream" && msg?.sender === "assistant") {
              chunks.push(msg?.content || "");
              reset();
              return;
            }
            if (msg?.event === "message" && msg?.sender === "assistant") {
              const full = chunks.length ? chunks.join("") + (msg?.message || "") : msg?.message || "";
              clearTimeout(tid);
              if (this.ws) {
                this.ws.close();
                console.log("[ws] closed after receiving full response");
              }
              resolve({
                content: full,
                raw: msg
              });
            }
          } catch (e) {
            console.error("[ws parse] error:", e?.message);
          }
        };
        this.ws.on("message", onMsg);
        this.ws.once("error", e => {
          clearTimeout(tid);
          if (this.ws) this.ws.close();
          reject(e);
        });
        this.ws.once("close", () => {
          clearTimeout(tid);
          reject(new Error("ws closed unexpectedly"));
        });
      });
      if (!this.greets.length && !restored) {
        this.greets = [{
          role: "assistant",
          content: resp.content
        }];
      }
      const newState = Buffer.from(JSON.stringify({
        sessionId: this.sessionId,
        lastMsgId: msgId
      })).toString("base64");
      return {
        state: newState,
        result: resp.content,
        raw: resp.raw
      };
    } catch (e) {
      console.error("[chat] error:", e?.message);
      throw e;
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
  const api = new Rudi();
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