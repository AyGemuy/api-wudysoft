import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class KreaiClient {
  constructor() {
    this.BASE = "https://api.openfaceaisg.com";
    this.LIST_OK = new Set(["SUCCESS", "FINISH", "DONE", "COMPLETED"]);
    this.LIST_FAIL = new Set(["FAILED", "ERROR", "FAIL"]);
    this.PROVIDERS = {
      image: {
        sub: "/kreaiand/image/task/addV1",
        get: "/kreaiand/image/task/get",
        list: "/kreaiand/image/task/commonTaskList",
        cancel: "/kreaiand/image/task/cancel",
        del: "/kreaiand/image/task/del",
        tid: d => d?.gptTaskId || d?.id,
        ok: this.LIST_OK,
        fail: this.LIST_FAIL,
        res: d => d?.finalUrl || d?.gptResult || d?.result || null,
        build: ({
          title,
          type,
          images,
          prompt,
          params,
          aspectRatio,
          rewardNonce
        }) => ({
          title: title || "AI Generate",
          type: type ?? 78,
          images: images?.length ? images : undefined,
          params: {
            prompt: prompt || "",
            ...aspectRatio ? {
              aspectRatio: aspectRatio
            } : {},
            ...params || {}
          },
          rewardNonce: rewardNonce || undefined
        })
      },
      luma: {
        sub: "/kreaiand/video/ai/submit",
        start: "/kreaiand/video/ai/start",
        get: "/kreaiand/video/ai/get",
        list: "/kreaiand/video/gen/commonTaskList",
        cancel: "/kreaiand/video/ai/cancel",
        del: "/kreaiand/video/ai/del",
        tid: d => d?.generateId || d?.id,
        ok: this.LIST_OK,
        fail: this.LIST_FAIL,
        res: d => d?.finalUrl || d?.result || null,
        build: ({
          prompt,
          source,
          sourceInfo,
          title,
          rewardNonce
        }) => ({
          prompt: prompt || "",
          source: source || undefined,
          sourceInfo: sourceInfo || undefined,
          title: title || "Luma Video",
          rewardNonce: rewardNonce || undefined
        })
      },
      pika: {
        sub: "/kreaiand/video/gen/submit",
        get: "/kreaiand/video/gen/getTask",
        list: "/kreaiand/video/gen/commonTaskList",
        cancel: "/kreaiand/video/gen/cancelTask",
        del: "/kreaiand/video/gen/delTask",
        tid: d => d?.generateId || d?.id,
        ok: this.LIST_OK,
        fail: this.LIST_FAIL,
        res: d => d?.finalUrl || d?.result || null,
        build: ({
          prompt,
          pikaEffect,
          source,
          sourceInfo,
          type,
          title,
          rewardNonce
        }) => ({
          promptText: prompt || "",
          pikaEffect: pikaEffect || undefined,
          source: source || undefined,
          sourceInfo: sourceInfo || undefined,
          type: type || undefined,
          title: title || "Pika Video",
          rewardNonce: rewardNonce || undefined
        })
      }
    };
    this.token = "";
    this.http = this.makeHttp();
  }
  rnd() {
    try {
      return crypto.randomBytes(16).toString("hex");
    } catch (e) {
      console.error("[rnd]", e.message);
      throw new Error("[rnd] failed to generate random bytes: " + e.message);
    }
  }
  toLong(v) {
    try {
      if (v == null) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    } catch (e) {
      console.error("[toLong]", e.message);
      return undefined;
    }
  }
  prov(model) {
    try {
      return this.PROVIDERS[model] || this.PROVIDERS.image;
    } catch (e) {
      console.error("[prov]", e.message);
      return this.PROVIDERS.image;
    }
  }
  encodeState(obj) {
    try {
      if (!obj || typeof obj !== "object") throw new Error("obj must be a plain object");
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (e) {
      console.error("[encodeState]", e.message);
      throw new Error("[encodeState] " + e.message);
    }
  }
  decodeState(b64) {
    try {
      if (!b64 || typeof b64 !== "string") throw new Error("state must be a non-empty string");
      const obj = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      if (!obj || typeof obj !== "object") throw new Error("decoded state is not an object");
      return obj;
    } catch (e) {
      console.error("[decodeState]", e.message);
      throw new Error("[decodeState] invalid or corrupted state token: " + e.message);
    }
  }
  makeHttp() {
    try {
      const instance = axios.create({
        baseURL: this.BASE,
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          appid: "KreaiAnd",
          appversion: "9.9.9.9.9.9(999999)",
          ostype: "android",
          deviceid: this.rnd(),
          country: "ID",
          "accept-language": "id-ID",
          appchannel: "KreaiAnd",
          accesstoken: ""
        }
      });
      instance.interceptors.request.use(cfg => {
        cfg.headers.accesstoken = this.token || "";
        return cfg;
      });
      return instance;
    } catch (e) {
      console.error("[makeHttp]", e.message);
      throw new Error("[makeHttp] failed to create http client: " + e.message);
    }
  }
  async auth() {
    try {
      this.http = this.makeHttp();
      const id = this.rnd();
      console.log("[auth] id:", id);
      let r;
      try {
        const res = await this.http.post("/kreaiand/ai/login", {
          adId: this.rnd(),
          country: "ID",
          gpsAdId: id,
          platform: "MOCK",
          source: "1l43rak4|Organic|Organic",
          thirdId: id,
          thirdToken: id
        });
        r = res.data;
      } catch (e) {
        throw new Error("request failed: " + (e?.response?.data?.errMsg || e.message));
      }
      if (r?.errCode !== 0) throw new Error(r?.errMsg || "errCode " + r?.errCode);
      if (!r?.data?.auth) throw new Error("empty token in response");
      this.token = r.data.auth;
      console.log("[auth] token:", this.token.slice(0, 20) + "...");
      return this.token;
    } catch (e) {
      console.error("[auth]", e.message);
      throw new Error("[auth] " + e.message);
    }
  }
  async reward() {
    try {
      let canData;
      try {
        const res = await this.http.post("/kreaiand/image/task/canReward");
        canData = res.data;
      } catch (e) {
        throw new Error("canReward request failed: " + e.message);
      }
      console.log("[reward] can:", canData?.data);
      if (canData?.data !== true) return null;
      let rewardData;
      try {
        const res = await this.http.post("/kreaiand/image/task/getReward");
        rewardData = res.data;
      } catch (e) {
        throw new Error("getReward request failed: " + e.message);
      }
      console.log("[reward] nonce:", rewardData?.data);
      return rewardData?.data || null;
    } catch (e) {
      console.error("[reward]", e.message);
      throw new Error("[reward] " + e.message);
    }
  }
  async nonce() {
    try {
      console.log("[nonce] refreshing...");
      await this.auth();
      const n = await this.reward();
      if (!n) throw new Error("reward returned null — account may be ineligible");
      console.log("[nonce] ok:", n);
      return n;
    } catch (e) {
      console.error("[nonce]", e.message);
      throw new Error("[nonce] " + e.message);
    }
  }
  async fetchImage(src) {
    try {
      if (!src) throw new Error("src is empty or null");
      if (Buffer.isBuffer(src)) {
        if (src.length === 0) throw new Error("buffer is empty");
        console.log("[fetchImage] buffer", src.length, "B");
        return src;
      }
      if (typeof src !== "string") throw new Error("src must be a string, URL, or Buffer");
      if (/^https?:\/\//.test(src)) {
        console.log("[fetchImage] url:", src);
        let res;
        try {
          res = await axios.get(src, {
            responseType: "arraybuffer"
          });
        } catch (e) {
          throw new Error("failed to fetch url: " + e.message);
        }
        const buf = Buffer.from(res.data);
        if (buf.length === 0) throw new Error("fetched url returned empty body");
        return buf;
      }
      const b64 = src.replace(/^data:[^;]+;base64,/, "");
      if (!b64) throw new Error("base64 string is empty after stripping data URI prefix");
      console.log("[fetchImage] base64 len:", b64.length);
      const buf = Buffer.from(b64, "base64");
      if (buf.length === 0) throw new Error("decoded base64 buffer is empty");
      return buf;
    } catch (e) {
      console.error("[fetchImage]", e.message);
      throw new Error("[fetchImage] " + e.message);
    }
  }
  async upload(buf, name = "image.jpeg") {
    try {
      if (!Buffer.isBuffer(buf)) throw new Error("buf must be a Buffer");
      if (buf.length === 0) throw new Error("buf is empty");
      console.log("[upload]", name, buf.length, "B");
      const fd = new FormData();
      fd.append("media", buf, {
        filename: name,
        contentType: "image/jpeg"
      });
      let r;
      try {
        const res = await this.http.post("/kreaiand/ai/upload", fd, {
          headers: fd.getHeaders()
        });
        r = res.data;
      } catch (e) {
        throw new Error("request failed: " + (e?.response?.data?.errMsg || e.message));
      }
      if (r?.errCode !== 0) throw new Error(r?.errMsg || "errCode " + r?.errCode);
      if (!r?.data?.img) throw new Error("no image URL in response");
      console.log("[upload] url:", r.data.img);
      return r.data.img;
    } catch (e) {
      console.error("[upload]", e.message);
      throw new Error("[upload] " + e.message);
    }
  }
  async submit(prov, payload) {
    try {
      console.log("[submit]", prov.sub, JSON.stringify(payload));
      let r;
      try {
        const res = await this.http.post(prov.sub, payload);
        r = res.data;
      } catch (e) {
        throw new Error("request failed: " + (e?.response?.data?.errMsg || e.message));
      }
      console.log("[submit] res:", JSON.stringify(r));
      if (r?.errCode === 24) {
        console.log("[submit] vip required → retrying with fresh nonce (max 3)");
        for (let i = 0; i < 3; i++) {
          try {
            console.log(`[submit] nonce retry ${i + 1}/3`);
            const n = await this.nonce();
            const p = {
              ...payload,
              rewardNonce: n
            };
            let r2;
            try {
              const res2 = await this.http.post(prov.sub, p);
              r2 = res2.data;
            } catch (e) {
              throw new Error(`retry ${i + 1} request failed: ` + e.message);
            }
            console.log(`[submit] retry ${i + 1} res:`, JSON.stringify(r2));
            if (r2?.errCode === 0) return r2.data;
            if (r2?.errCode !== 24) throw new Error(r2?.errMsg || "errCode " + r2?.errCode);
          } catch (e) {
            console.error(`[submit] retry ${i + 1}:`, e.message);
            if (i === 2) throw new Error("bypass exhausted: " + e.message);
          }
        }
      }
      if (r?.errCode !== 0) throw new Error(r?.errMsg || "errCode " + r?.errCode);
      return r.data;
    } catch (e) {
      console.error("[submit]", e.message);
      throw new Error("[submit] " + e.message);
    }
  }
  async list(prov, maxId = null, size = 20) {
    try {
      const params = {
        size: size
      };
      if (maxId != null) params.maxId = this.toLong(maxId);
      console.log("[list]", prov.list, JSON.stringify(params));
      let r;
      try {
        const res = await this.http.post(prov.list, null, {
          params: params
        });
        r = res.data;
      } catch (e) {
        throw new Error("request failed: " + e.message);
      }
      if (r?.errCode !== 0) throw new Error(r?.errMsg || "errCode " + r?.errCode);
      console.log("[list] count:", r?.data?.length ?? 0);
      return r?.data || [];
    } catch (e) {
      console.error("[list]", e.message);
      throw new Error("[list] " + e.message);
    }
  }
  async listAll(prov, size = 20) {
    try {
      console.log("[listAll]", prov.list);
      const all = [];
      let maxId = null;
      for (;;) {
        let batch;
        try {
          batch = await this.list(prov, maxId, size);
        } catch (e) {
          throw new Error("batch fetch failed: " + e.message);
        }
        if (!batch.length) break;
        all.push(...batch);
        console.log("[listAll] fetched:", all.length);
        if (batch.length < size) break;
        const ids = batch.map(t => this.toLong(t?.id)).filter(Boolean);
        maxId = ids.length ? Math.min(...ids) : null;
        if (!maxId) break;
      }
      console.log("[listAll] total:", all.length);
      return all;
    } catch (e) {
      console.error("[listAll]", e.message);
      throw new Error("[listAll] " + e.message);
    }
  }
  async findTask(prov, rowId) {
    try {
      const target = this.toLong(rowId);
      if (!target) throw new Error("invalid rowId: " + rowId);
      let first;
      try {
        first = await this.list(prov, null, 20);
      } catch (e) {
        throw new Error("first page fetch failed: " + e.message);
      }
      const found = first.find(t => this.toLong(t?.id) === target);
      if (found) return found;
      console.log("[findTask] not in first page, scanning all...");
      let all;
      try {
        all = await this.listAll(prov);
      } catch (e) {
        throw new Error("full scan failed: " + e.message);
      }
      return all.find(t => this.toLong(t?.id) === target) || null;
    } catch (e) {
      console.error("[findTask]", e.message);
      throw new Error("[findTask] " + e.message);
    }
  }
  parseTask(task, prov, state) {
    try {
      if (!task || typeof task !== "object") throw new Error("task must be an object");
      const rawStatus = task?.status || task?.gptStatus || "";
      const done = prov.ok.has(rawStatus);
      const failed = prov.fail.has(rawStatus);
      const result = done ? prov.res(task) || null : null;
      console.log("[parseTask] status:", rawStatus, "| result:", result);
      return {
        result: result,
        state: state,
        done: done,
        failed: failed,
        status: rawStatus,
        ...task
      };
    } catch (e) {
      console.error("[parseTask]", e.message);
      throw new Error("[parseTask] " + e.message);
    }
  }
  restoreSession(state) {
    try {
      const obj = this.decodeState(state);
      if (!obj.token) throw new Error("state has no token");
      if (!obj.rowId) throw new Error("state has no rowId");
      if (!obj.model) throw new Error("state has no model");
      this.token = obj.token;
      this.http = this.makeHttp();
      return obj;
    } catch (e) {
      console.error("[restoreSession]", e.message);
      throw new Error("[restoreSession] " + e.message);
    }
  }
  async generate({
    model = "image",
    prompt,
    image,
    width,
    height,
    ...rest
  }) {
    try {
      console.log("\n[generate] model:", model, "| prompt:", prompt);
      const provider = this.prov(model);
      let rewardNonce;
      try {
        rewardNonce = await this.nonce();
      } catch (e) {
        throw new Error("nonce failed: " + e.message);
      }
      const token = this.token;
      const imgs = [];
      if (image) {
        const srcs = Array.isArray(image) ? image : [image];
        for (let i = 0; i < srcs.length; i++) {
          try {
            const buf = await this.fetchImage(srcs[i]);
            const url = await this.upload(buf);
            imgs.push(url);
          } catch (e) {
            throw new Error(`image[${i}] failed: ` + e.message);
          }
        }
      }
      const aspectRatio = width && height ? `${width}:${height}` : rest.aspectRatio || undefined;
      let payload;
      try {
        payload = provider.build({
          prompt: prompt,
          images: imgs,
          source: imgs[0] || rest.source,
          sourceInfo: imgs[0] || rest.sourceInfo,
          aspectRatio: aspectRatio,
          rewardNonce: rewardNonce,
          ...rest
        });
      } catch (e) {
        throw new Error("payload build failed: " + e.message);
      }
      let td;
      try {
        td = await this.submit(provider, payload);
      } catch (e) {
        throw new Error("submit failed: " + e.message);
      }
      const rowId = this.toLong(td?.id);
      const tid = provider.tid(td);
      if (!rowId) throw new Error("no rowId in submit response: " + JSON.stringify(td));
      console.log("[generate] rowId:", rowId, "| tid:", tid);
      if (provider.start && tid) {
        try {
          console.log("[generate] luma start:", tid);
          const {
            data: rs
          } = await this.http.post(provider.start, null, {
            params: {
              generateId: this.toLong(tid)
            }
          });
          console.log("[generate] start res:", JSON.stringify(rs));
        } catch (e) {
          console.warn("[generate] start call failed (non-fatal):", e.message);
        }
      }
      let state;
      try {
        const submittedAt = Date.now();
        state = this.encodeState({
          model: model,
          token: token,
          rowId: rowId,
          tid: tid,
          submittedAt: submittedAt
        });
      } catch (e) {
        throw new Error("encodeState failed: " + e.message);
      }
      const {
        submittedAt
      } = this.decodeState(state);
      console.log("[generate] ✓ submitted | rowId:", rowId);
      return {
        state: state,
        model: model,
        rowId: rowId,
        tid: tid,
        submittedAt: submittedAt,
        ...td
      };
    } catch (e) {
      console.error("[generate]", e.message);
      throw new Error("[generate] " + e.message);
    }
  }
  async status({
    state
  }) {
    try {
      if (!state) throw new Error("state is required");
      let session;
      try {
        session = this.restoreSession(state);
      } catch (e) {
        throw new Error("restoreSession failed: " + e.message);
      }
      const {
        model,
        rowId
      } = session;
      const provider = this.prov(model);
      console.log("[status] model:", model, "| rowId:", rowId);
      let task;
      try {
        task = await this.findTask(provider, rowId);
      } catch (e) {
        throw new Error("findTask failed: " + e.message);
      }
      if (!task) {
        console.log("[status] task not found, still pending");
        return {
          result: null,
          state: state,
          done: false,
          failed: false,
          status: "PENDING"
        };
      }
      try {
        return this.parseTask(task, provider, state);
      } catch (e) {
        throw new Error("parseTask failed: " + e.message);
      }
    } catch (e) {
      console.error("[status]", e.message);
      throw new Error("[status] " + e.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&prompt=cyberpunk"
      }
    });
  }
  const api = new KreaiClient();
  try {
    let response;
    switch (action) {
      case "gen":
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "list":
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}