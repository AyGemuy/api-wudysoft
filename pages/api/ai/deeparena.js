import axios from "axios";
import FormData from "form-data";
const BASE = "https://prod.deeparena.ai/api/v1";
const REF = "https://prod.deeparena.ai/";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class DeepArena {
  constructor({
    cookie = ""
  } = {}) {
    this.cookie = cookie;
    this.client = axios.create({
      baseURL: BASE
    });
    this.client.interceptors.request.use(cfg => {
      try {
        const currentCookie = cfg?.state?.cookie || this.cookie || "";
        const sc = cfg?.state?.sessionCode;
        const referer = sc ? `${REF}&sessionCode=${sc}` : REF;
        cfg.headers = cfg.headers || {};
        const customHeaders = {
          accept: cfg.headers["accept"] || "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://prod.deeparena.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: referer,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": UA
        };
        if (!cfg.headers["content-type"] && !cfg.headers["Content-Type"]) {
          customHeaders["content-type"] = "application/json";
        }
        if (currentCookie) {
          customHeaders["cookie"] = currentCookie;
        }
        Object.assign(cfg.headers, customHeaders);
      } catch (e) {
        this.log("req interceptor err:", e?.message);
      }
      return cfg;
    });
    this.client.interceptors.response.use(res => {
      try {
        const sc = res?.headers?.["set-cookie"];
        if (Array.isArray(sc) && sc.length) {
          const map = new Map();
          if (this.cookie) {
            for (const kv of this.cookie.split(";")) {
              const [k, ...v] = kv.trim().split("=");
              if (k) map.set(k, v.join("="));
            }
          }
          for (const c of sc) {
            const pair = String(c).split(";")[0];
            const [k, ...v] = pair.trim().split("=");
            if (k) map.set(k, v.join("="));
          }
          this.cookie = [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
        }
      } catch (e) {
        this.log("res interceptor err:", e?.message);
      }
      return res;
    }, err => Promise.reject(err));
  }
  log(...a) {
    console.log("[DA]", ...a);
  }
  norm(media) {
    if (media == null) return [];
    if (Array.isArray(media)) return media.filter(Boolean);
    return [media];
  }
  async sess(state = {}) {
    try {
      this.log("step1 create session");
      const r = await this.client.post("/battle/sessions", {
        bizSource: "ARENA_CHATBOT"
      }, {
        state: state
      });
      const sessionCode = r?.data?.data?.sessionCode;
      if (!sessionCode) throw new Error("no sessionCode");
      this.log("step1 ok:", sessionCode);
      return {
        ...state,
        sessionCode: sessionCode
      };
    } catch (e) {
      this.log("sess error:", e?.message);
      throw e;
    }
  }
  async intent(state, query) {
    try {
      this.log("step2 query intent:", query);
      const r = await this.client.post("/battle/query-intent", {
        sessionCode: state?.sessionCode,
        query: query
      }, {
        state: state
      });
      const intents = r?.data?.data?.intents || [];
      this.log("step2 ok:", intents);
      return {
        ...state,
        intents: intents
      };
    } catch (e) {
      this.log("intent error:", e?.message);
      throw e;
    }
  }
  async up(media, state = {}) {
    try {
      this.log("step3 upload media");
      let buf, filename = "upload.jpg",
        contentType = "image/jpeg";
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          const r = await axios.get(media, {
            responseType: "arraybuffer",
            timeout: 1e4,
            headers: {
              "user-agent": UA
            }
          });
          buf = Buffer.from(r?.data ?? []);
          contentType = r?.headers?.["content-type"] || contentType;
          const ext = contentType.split("/")?.[1]?.split(";")?.[0] || "jpg";
          filename = `upload.${ext}`;
        } else if (media.startsWith("data:")) {
          const [meta, b64] = media.split(",");
          const mime = meta?.match(/data:(.*?);/)?.[1] || "image/jpeg";
          contentType = mime;
          const ext = mime.split("/")?.[1] || "jpg";
          filename = `upload.${ext}`;
          buf = Buffer.from(b64 || "", "base64");
        } else {
          buf = Buffer.from(media, "base64");
        }
      } else if (Buffer.isBuffer(media)) {
        buf = media;
      } else if (media instanceof ArrayBuffer) {
        buf = Buffer.from(media);
      } else {
        throw new Error("unsupported media type");
      }
      const form = new FormData();
      form.append("file", buf, {
        filename: filename,
        contentType: contentType
      });
      const r = await this.client.post("/storage/upload", form, {
        headers: {
          ...form.getHeaders()
        },
        state: state
      });
      const objectKey = r?.data?.data?.objectKey;
      if (!objectKey) throw new Error("no objectKey");
      this.log("step3 ok:", objectKey);
      return {
        ...r.data.data
      };
    } catch (e) {
      this.log("up error:", e?.message);
      throw e;
    }
  }
  async turn(state, prompt, attachments = []) {
    try {
      this.log("step4 create turn:", prompt, "att:", attachments?.length || 0);
      const r = await this.client.post(`/battle/sessions/${state?.sessionCode}/turns`, {
        userQuery: prompt,
        battleEnabled: true,
        searchEnabled: false,
        fastEnabled: false,
        attachments: attachments
      }, {
        state: state
      });
      const turnCode = r?.data?.data?.turnCode;
      if (!turnCode) throw new Error("no turnCode");
      this.log("step4 ok:", turnCode);
      return {
        ...state,
        turnCode: turnCode
      };
    } catch (e) {
      this.log("turn error:", e?.message);
      throw e;
    }
  }
  async stream(state) {
    try {
      this.log("step5 stream start:", state?.turnCode);
      const r = await this.client.get(`/battle/turns/${state?.turnCode}/stream`, {
        headers: {
          accept: "text/event-stream"
        },
        responseType: "stream",
        state: state
      });
      const chunks = [];
      const result = {
        A: "",
        B: ""
      };
      const reasoning = {
        A: "",
        B: ""
      };
      const meta = {
        A: {},
        B: {}
      };
      return await new Promise((resolve, reject) => {
        let buffer = "";
        let currentEvent = "message";
        let settled = false;
        const finish = (fn, arg) => {
          if (settled) return;
          settled = true;
          try {
            r?.data?.destroy?.();
          } catch (_) {}
          try {
            r?.data?.removeAllListeners?.();
          } catch (_) {}
          fn(arg);
        };
        const onData = chunk => {
          try {
            buffer += chunk?.toString("utf8") ?? "";
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) {
                currentEvent = "message";
                continue;
              }
              if (trimmed.startsWith("event:")) {
                currentEvent = trimmed.replace("event:", "").trim();
              } else if (trimmed.startsWith("data:")) {
                const raw = trimmed.replace("data:", "").trim();
                if (!raw) continue;
                try {
                  const data = JSON.parse(raw);
                  chunks.push({
                    event: currentEvent,
                    data: data
                  });
                  if (currentEvent === "delta" && data?.content) {
                    const side = data?.side || "B";
                    result[side] = (result[side] || "") + data.content;
                  } else if (currentEvent === "reasoning" && data?.content) {
                    const side = data?.side || "B";
                    reasoning[side] = (reasoning[side] || "") + data.content;
                  }
                  if (currentEvent === "done" && data?.side) {
                    meta[data.side] = {
                      latencyMs: data?.latencyMs ?? 0,
                      firstTokenMs: data?.firstTokenMs ?? 0
                    };
                  }
                  if (currentEvent === "stream-end") {
                    this.log("step5 stream-end");
                    finish(resolve, {
                      ...state,
                      chunks: chunks,
                      result: result,
                      reasoning: reasoning,
                      meta: meta
                    });
                    return;
                  }
                } catch (_) {}
              }
            }
          } catch (e) {
            this.log("stream onData err:", e?.message);
          }
        };
        const onErr = err => {
          this.log("stream err:", err?.message);
          finish(reject, err);
        };
        const onEnd = () => {
          this.log("step5 stream closed");
          finish(resolve, {
            ...state,
            chunks: chunks,
            result: result,
            reasoning: reasoning,
            meta: meta
          });
        };
        r?.data?.on?.("data", onData);
        r?.data?.on?.("error", onErr);
        r?.data?.on?.("end", onEnd);
      });
    } catch (e) {
      this.log("stream error:", e?.message);
      throw e;
    }
  }
  async list(state = {}, page = 1, size = 20) {
    try {
      this.log("step6 list sessions", page, size);
      const r = await this.client.get(`/battle/sessions?page=${page}&size=${size}`, {
        state: state
      });
      return {
        ...state,
        list: r?.data?.data || {}
      };
    } catch (e) {
      this.log("list error:", e?.message);
      throw e;
    }
  }
  async detail(state) {
    try {
      this.log("step7 detail:", state?.sessionCode);
      const r = await this.client.get(`/battle/sessions/${state?.sessionCode}`, {
        state: state
      });
      return {
        ...state,
        detail: r?.data?.data || {}
      };
    } catch (e) {
      this.log("detail error:", e?.message);
      throw e;
    }
  }
  async quota(state = {}) {
    try {
      this.log("step8 quota");
      const r = await this.client.get("/quota/me", {
        state: state
      });
      return {
        ...state,
        quota: r?.data?.data || {}
      };
    } catch (e) {
      this.log("quota error:", e?.message);
      throw e;
    }
  }
  async chat({
    state,
    prompt,
    media,
    ...rest
  }) {
    try {
      const st0 = state ?? {};
      const mediaArr = this.norm(media);
      this.log("chat start. prompt:", prompt, "media:", mediaArr.length);
      let cur = {
        ...st0
      };
      if (!cur?.sessionCode) cur = await this.sess(cur);
      try {
        cur = await this.intent(cur, prompt);
      } catch (e) {
        this.log("intent skip:", e?.message);
      }
      const attachments = [];
      if (mediaArr.length) {
        for (const m of mediaArr) {
          try {
            const up = await this.up(m, cur);
            attachments.push({
              type: "IMAGE",
              url: up?.objectKey
            });
          } catch (e) {
            this.log("media skip:", e?.message);
          }
        }
      }
      cur = await this.turn(cur, prompt, attachments);
      cur = await this.stream(cur);
      return {
        status: "success",
        result: cur?.result ?? {
          A: "",
          B: ""
        },
        reasoning: cur?.reasoning ?? {
          A: "",
          B: ""
        },
        chunks: cur?.chunks ?? [],
        state: cur
      };
    } catch (e) {
      this.log("chat error:", e?.message);
      return {
        status: "error",
        result: e?.message || "unknown error",
        chunks: [],
        state: {
          ...state || {},
          error: e?.message
        }
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
  const api = new DeepArena();
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