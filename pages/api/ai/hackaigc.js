import axios from "axios";
import crypto from "crypto";
class HackAIGC {
  constructor() {
    this.chatUrl = "https://chat.hackaigc.com";
    this.models = ["uncensored_chat", "nsfw_chat", "story", "erotic_chat", "uncensored_code", "deepseek", "text_image", "text_image_pro"];
    this.guestId = null;
    this.chatEnterTs = null;
    this.sentryTrace = null;
    this.baggage = null;
    this.cli = axios.create({
      baseURL: this.chatUrl,
      timeout: 6e4
    });
  }
  _lg(m) {
    try {
      console.log(`[HackAIGC] ${m}`);
    } catch {}
  }
  _sd(s) {
    try {
      return typeof s === "string" ? JSON.parse(Buffer.from(s, "base64").toString("utf-8")) : s || {};
    } catch (e) {
      this._lg(`sd error: ${e.message}`);
      return {};
    }
  }
  _se(d) {
    try {
      return Buffer.from(JSON.stringify(d || {})).toString("base64");
    } catch (e) {
      this._lg(`se error: ${e.message}`);
      return "";
    }
  }
  _hash(d) {
    try {
      return crypto.createHash("sha256").update(d).digest("hex");
    } catch (e) {
      this._lg(`hash error: ${e.message}`);
      return "";
    }
  }
  _gid() {
    try {
      const dt = `fp_${crypto.randomBytes(16).toString("hex")}`;
      const r = dt.slice(17) + "hackagic251122" + dt.slice(0, 17);
      return "guest_" + this._hash(r).slice(0, 32);
    } catch (e) {
      this._lg(`gid error: ${e.message}`);
      return "";
    }
  }
  _sen() {
    try {
      const traceId = crypto.randomBytes(16).toString("hex");
      const spanId = crypto.randomBytes(8).toString("hex");
      this.sentryTrace = `${traceId}-${spanId}-0`;
      this.baggage = `sentry-environment=production,sentry-release=aa76696aecdb15e010c07c0fb5c9128109d05a2c,sentry-public_key=a1a57b3d9ed64c7731838255a7d4fdde,sentry-trace_id=${traceId},sentry-org_id=4511377419665408,sentry-transaction=%2F,sentry-sampled=false,sentry-sample_rand=${Math.random().toFixed(15)},sentry-sample_rate=0`;
    } catch (e) {
      this._lg(`sen error: ${e.message}`);
    }
  }
  _hd(url, custom = {}) {
    try {
      const isImg = url.includes("/api/image");
      const ts = Date.now();
      const token = this._hash(`hackagic20251231:${this.guestId}:${ts}`).slice(0, 32);
      const cookies = `__chat_enter_ts__=${this.chatEnterTs}; __utm_data__=${encodeURIComponent(JSON.stringify({
utm_source: "google",
utm_medium: "organic",
landing_host: "www.hackaigc.com",
landing_path: "/id",
captured_at: Date.now() - 1e4,
referrer: "https://www.google.com/"
}))}`;
      return {
        accept: isImg ? "image/png" : "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        authorization: `Bearer anonymous_${this.guestId}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
        cookie: cookies,
        origin: "https://chat.hackaigc.com",
        pragma: "no-cache",
        referer: "https://chat.hackaigc.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": isImg ? "empty" : "document",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        ...this.sentryTrace ? {
          "sentry-trace": this.sentryTrace
        } : {},
        ...this.baggage ? {
          baggage: this.baggage
        } : {},
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-request-timestamp": ts.toString(),
        "x-request-token": token,
        ...custom
      };
    } catch (e) {
      this._lg(`hd error: ${e.message}`);
      return custom;
    }
  }
  _ens(st) {
    try {
      if (st) {
        const parsed = this._sd(st);
        if (parsed.guestId) this.guestId = parsed.guestId;
        if (parsed.chatEnterTs) this.chatEnterTs = parsed.chatEnterTs;
        if (parsed.sentryTrace) this.sentryTrace = parsed.sentryTrace;
        if (parsed.baggage) this.baggage = parsed.baggage;
      }
      if (!this.guestId) {
        this.guestId = this._gid();
        this.chatEnterTs = Date.now();
        this._sen();
      }
      return this._se({
        guestId: this.guestId,
        chatEnterTs: this.chatEnterTs,
        sentryTrace: this.sentryTrace,
        baggage: this.baggage
      });
    } catch (e) {
      this._lg(`ens error: ${e.message}`);
      return "";
    }
  }
  _vld(model, mode) {
    try {
      if (mode === "image") {
        return String(model || "").toLowerCase().includes("pro") ? "pro" : "standard";
      }
      if (this.models.includes(model)) return model;
      return "erotic_chat";
    } catch (e) {
      this._lg(`vld error: ${e.message}`);
      return mode === "image" ? "standard" : "erotic_chat";
    }
  }
  async _chat({
    prompt,
    messages = [],
    model,
    temperature = .7,
    ...rest
  } = {}) {
    try {
      const endpoint = "/api/chat";
      const url = `${this.chatUrl}${endpoint}`;
      const activeMessages = [...messages];
      if (prompt) {
        activeMessages.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        user_id: this.guestId,
        user_level: "free",
        model: model,
        messages: activeMessages,
        prompt: "",
        temperature: temperature,
        enableWebSearch: false,
        usedVoiceInput: false,
        deviceId: this.guestId,
        images: [],
        ...rest
      };
      const res = await this.cli.post(endpoint, payload, {
        headers: this._hd(url)
      });
      return {
        status: true,
        result: res.data,
        state: this._se({
          guestId: this.guestId,
          chatEnterTs: this.chatEnterTs,
          sentryTrace: this.sentryTrace,
          baggage: this.baggage
        })
      };
    } catch (e) {
      this._lg(`chat error: ${e.message}`);
      throw e;
    }
  }
  async _img({
    prompt,
    modelType,
    ...rest
  } = {}) {
    try {
      const endpoint = "/api/image";
      const url = `${this.chatUrl}${endpoint}`;
      const payload = {
        prompt: prompt,
        user_id: this.guestId,
        device_id: this.guestId,
        user_level: "free",
        image_model_type: modelType,
        ...rest
      };
      const res = await this.cli.post(endpoint, payload, {
        headers: this._hd(url, {
          accept: "image/png"
        }),
        responseType: "arraybuffer"
      });
      return {
        status: true,
        buffer: Buffer.from(res.data),
        contentType: res.headers["content-type"] || "image/png",
        state: this._se({
          guestId: this.guestId,
          chatEnterTs: this.chatEnterTs,
          sentryTrace: this.sentryTrace,
          baggage: this.baggage
        })
      };
    } catch (e) {
      this._lg(`img error: ${e.message}`);
      throw e;
    }
  }
  async generate({
    state,
    mode,
    ...options
  }) {
    try {
      this._ens(state);
      switch (mode) {
        case "chat": {
          const model = this._vld(options.model, "chat");
          return await this._chat({
            ...options,
            model: model
          });
        }
        case "image": {
          const modelType = this._vld(options.model || options.modelType, "image");
          return await this._img({
            ...options,
            modelType: modelType
          });
        }
        default:
          throw new Error(`Unsupported generation mode: ${mode}`);
      }
    } catch (e) {
      this._lg(`generate error: ${e?.message}`);
      return {
        status: false,
        result: null,
        state: state || null,
        error: e?.response?.data || e?.message
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
  const api = new HackAIGC();
  try {
    const data = await api.generate(params);
    if (params.mode === "image" && data.status) {
      res.setHeader("Content-Type", data.contentType);
      return res.status(200).send(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}