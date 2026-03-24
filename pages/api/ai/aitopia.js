import axios from "axios";
import crypto from "crypto";
class Aitopia {
  constructor() {
    this.base = "https://aitopia.ai";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.cookies = {};
    this.jobs = {};
    this.http = axios.create({
      baseURL: this.base,
      headers: {
        "user-agent": this.ua,
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty"
      }
    });
    this.http.interceptors.response.use(res => {
      try {
        for (const raw of res.headers["set-cookie"] || []) {
          const [pair] = raw.split(";");
          const [k, v] = pair.split("=");
          if (k && v !== undefined) this.cookies[k.trim()] = v.trim();
        }
        this.log("cookie", "synced", Object.keys(this.cookies).join(", "));
      } catch (e) {
        this.log("cookie", "parse error", e.message);
      }
      return res;
    }, err => Promise.reject(err));
    this.http.interceptors.request.use(cfg => {
      try {
        const str = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
        if (str) cfg.headers["cookie"] = str;
        if (this.cookies.hopekey) cfg.headers["hopekey"] = this.cookies.hopekey;
      } catch (e) {
        this.log("req", "inject error", e.message);
      }
      return cfg;
    }, err => Promise.reject(err));
  }
  log(tag, msg, data = "") {
    console.log(`[${new Date().toISOString()}] [${tag}]`, msg, data);
  }
  encState(extra = {}) {
    try {
      return Buffer.from(JSON.stringify({
        cookies: this.cookies,
        jobs: this.jobs,
        ...extra
      })).toString("base64");
    } catch (e) {
      this.log("state", "encode error", e.message);
      return "";
    }
  }
  decState(state) {
    try {
      return state ? JSON.parse(Buffer.from(state, "base64").toString()) : {};
    } catch {
      return {};
    }
  }
  loadState(state) {
    try {
      const s = this.decState(state);
      this.cookies = s?.cookies || {};
      this.jobs = s?.jobs || {};
      this.log("state", "loaded", `cookies=${Object.keys(this.cookies).length} jobs=${Object.keys(this.jobs).length}`);
    } catch (e) {
      this.log("state", "load error", e.message);
    }
  }
  randMail() {
    return `${crypto.randomUUID()}@gmail.com`;
  }
  randPass(mail) {
    return `x${mail.slice(0, 30)}!A1`;
  }
  async reg() {
    try {
      this.mail = this.randMail();
      this.pass = this.randPass(this.mail);
      this.log("reg", "registering", this.mail);
      const {
        data
      } = await this.http.post("/auth/register", {
        email: this.mail,
        password: this.pass,
        password1: this.pass,
        agree: true
      }, {
        headers: {
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/register`
        }
      });
      if (data?.hopekey) this.cookies.hopekey = data.hopekey;
      this.log("reg", "done", data?.message);
      return data;
    } catch (e) {
      this.log("reg", "error", e.message);
      throw e;
    }
  }
  async ensureAuth(state) {
    try {
      state ? this.loadState(state) : null;
      if (!this.cookies.hopekey) {
        this.log("auth", "no session, auto register...");
        await this.reg();
      }
    } catch (e) {
      this.log("auth", "error", e.message);
      throw e;
    }
  }
  async fetchSchema(model) {
    try {
      this.log("schema", "fetching", model);
      const {
        data
      } = await this.http.get(`/api/models/info/${model}/schema`, {
        headers: {
          referer: `${this.base}/${model}`
        }
      });
      this.schemaRaw = data;
      this.schemaRequired = data?.required || [];
      this.schemaProps = data?.properties || {};
      this.schemaOrder = data?.fieldOrder || Object.keys(this.schemaProps);
      this.log("schema", `required=[${this.schemaRequired}]`, `fields=[${this.schemaOrder}]`);
      return data;
    } catch (e) {
      this.log("schema", "error", e.message);
      throw e;
    }
  }
  validateSchema(params) {
    try {
      this.missingFields = this.schemaRequired.filter(key => {
        const v = params[key];
        return v === undefined || v === null || typeof v === "string" && v.trim() === "" || Array.isArray(v) && v.length === 0;
      });
      if (this.missingFields.length) {
        throw new Error(`[validate] missing required: ${this.missingFields.map(k => `${k}(${this.schemaProps[k]?.type || "any"})`).join(", ")}`);
      }
    } catch (e) {
      this.log("validate", "error", e.message);
      throw e;
    }
  }
  async checkCredit() {
    try {
      this.log("credit", "checking...");
      const {
        data
      } = await this.http.get("/api/credits/balance", {
        headers: {
          accept: "application/json",
          referer: this.base
        }
      });
      this.creditTotal = data?.balance?.totalCredits ?? 0;
      this.creditDaily = data?.balance?.dailyCreditsRemaining ?? 0;
      this.creditPaid = data?.balance?.paidCreditsBalance ?? 0;
      this.log("credit", `total=${this.creditTotal} daily=${this.creditDaily} paid=${this.creditPaid}`);
      if (this.creditTotal <= 0) throw new Error(`[credit] insufficient: total=${this.creditTotal}`);
      return data;
    } catch (e) {
      this.log("credit", "error", e.message);
      throw e;
    }
  }
  async resolveImg(img) {
    try {
      this.mime = "image/jpeg";
      if (typeof img === "string" && img.startsWith("http")) {
        this.log("img", "fetch url", img);
        const res = await axios.get(img, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(img).origin
          }
        });
        this.imgBuf = Buffer.from(res.data);
        this.mime = res.headers["content-type"] || this.mime;
      } else if (typeof img === "string" && img.startsWith("data:")) {
        this.log("img", "data url");
        const [head, b64] = img.split(",");
        this.mime = head.match(/:(.*?);/)?.[1] || this.mime;
        this.imgBuf = Buffer.from(b64, "base64");
      } else if (typeof img === "string") {
        this.log("img", "raw base64");
        this.imgBuf = Buffer.from(img, "base64");
      } else if (Buffer.isBuffer(img)) {
        this.log("img", "buffer");
        this.imgBuf = img;
      } else {
        throw new Error("unknown image type");
      }
      this.imgExt = this.mime.split("/")[1] || "jpg";
      this.imgName = `${crypto.randomUUID()}.${this.imgExt}`;
      this.log("img", "uploading", this.imgName);
      const {
        data
      } = await this.http.post(`/api/uploads?filename=${this.imgName}`, this.imgBuf, {
        headers: {
          "content-type": this.mime,
          origin: this.base
        },
        maxBodyLength: Infinity
      });
      this.imgUrl = data?.url || data?.imageUrl || data;
      this.log("img", "uploaded", this.imgUrl);
      return this.imgUrl;
    } catch (e) {
      this.log("img", "error", e.message);
      throw e;
    }
  }
  async resolveImgs(images) {
    try {
      this.imgUrls = [];
      this.imgList = Array.isArray(images) ? images : [images];
      for (const img of this.imgList) {
        const url = await this.resolveImg(img);
        this.imgUrls.push(url);
      }
      return this.imgUrls;
    } catch (e) {
      this.log("img", "resolveImgs error", e.message);
      throw e;
    }
  }
  async resolveImgsB64(images) {
    try {
      this.b64List = [];
      this.rawList = Array.isArray(images) ? images : [images];
      for (const img of this.rawList) {
        if (typeof img === "string" && img.startsWith("http")) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          this.b64Mime = res.headers["content-type"] || "image/jpeg";
          this.b64List.push(`data:${this.b64Mime};base64,${Buffer.from(res.data).toString("base64")}`);
        } else if (typeof img === "string" && img.startsWith("data:")) {
          this.b64List.push(img);
        } else if (Buffer.isBuffer(img)) {
          this.b64List.push(`data:image/jpeg;base64,${img.toString("base64")}`);
        } else {
          this.b64List.push(img);
        }
      }
      return this.b64List;
    } catch (e) {
      this.log("img", "resolveImgsB64 error", e.message);
      throw e;
    }
  }
  async models({
    shuffle = true,
    ...rest
  } = {}) {
    this.log("models", "start", `shuffle=${shuffle}`);
    try {
      await this.ensureAuth(rest?.state);
      const {
        data
      } = await this.http.get("/api/models/all", {
        params: {
          shuffle: shuffle
        },
        headers: {
          referer: `${this.base}/models`
        }
      });
      this.modelList = data?.models || (Array.isArray(data) ? data : []);
      this.modelCount = data?.modelCount || this.modelList.length;
      this.modelTypes = data?.types || [];
      this.log("models", "done", `${this.modelCount} models types=[${this.modelTypes}]`);
      return {
        state: this.encState(),
        models: this.modelList,
        count: this.modelCount,
        types: this.modelTypes
      };
    } catch (e) {
      this.log("models", "error", e.message);
      throw e;
    }
  }
  async generate({
    state,
    model = "google/nano-banana",
    prompt,
    image,
    ...rest
  } = {}) {
    this.log("generate", "model", model);
    try {
      if (!model) throw new Error("[validate] generate missing required: model");
      await this.ensureAuth(state);
      this.genSchemaData = await this.fetchSchema(model);
      this.validateSchema({
        prompt: prompt,
        image_input: image,
        ...rest
      });
      await this.checkCredit();
      this.genImgs = image ? await this.resolveImgsB64(image) : [];
      this.genBody = {};
      for (const field of this.schemaOrder) {
        const def = this.schemaProps[field] || {};
        if (field === "prompt") {
          this.genBody.prompt = prompt || rest?.prompt || def?.default || "";
        } else if (field === "image_input") {
          this.genBody.image_input = this.genImgs.length ? this.genImgs : def?.default ?? [];
        } else if (rest[field] !== undefined) {
          this.genBody[field] = rest[field];
        } else if (def?.default !== undefined) {
          this.genBody[field] = def.default;
        }
      }
      this.genIdKey = `runner-${model.replace(/\//g, "-")}-${crypto.randomUUID()}`;
      this.genRef = `${this.base}/${model}`;
      this.genUrl = `/api/models/info/${model}/run`;
      this.log("generate", "posting", this.genUrl);
      const {
        data
      } = await this.http.post(this.genUrl, this.genBody, {
        headers: {
          "content-type": "application/json",
          origin: this.base,
          referer: this.genRef,
          "idempotency-key": this.genIdKey
        }
      });
      this.lastJobId = data?.jobId || data?.id;
      if (this.lastJobId) {
        this.jobs[this.lastJobId] = {
          model: model,
          agentId: data?.agentId,
          status: data?.status || "pending",
          estimatedDurationMs: data?.estimatedDurationMs,
          createdAt: new Date().toISOString()
        };
        this.log("generate", "job saved", this.lastJobId);
      }
      return {
        state: this.encState(),
        job: data
      };
    } catch (e) {
      this.log("generate", "error", e.message);
      throw e;
    }
  }
  async status({
    state,
    jobId,
    ...rest
  } = {}) {
    this.log("status", "start");
    try {
      await this.ensureAuth(state);
      if (jobId) {
        this.log("status", "check job", jobId);
        const {
          data
        } = await this.http.get(`/jobs/${jobId}`, {
          headers: {
            referer: this.base
          }
        });
        if (this.jobs[jobId]) {
          this.jobs[jobId].status = data?.status || this.jobs[jobId].status;
          this.jobs[jobId].progress = data?.progress ?? this.jobs[jobId].progress;
          this.jobs[jobId].output = data?.output || this.jobs[jobId].output;
        }
        this.log("status", "job", `${data?.status} ${data?.progress ?? "?"}%`);
        return {
          state: this.encState(),
          job: data,
          jobs: this.jobs
        };
      }
      const {
        data: qData
      } = await this.http.get("/api/queue", {
        params: {
          limit: rest?.limit || 20,
          status: rest?.queueStatus || "pending,processing"
        },
        headers: {
          accept: "application/json",
          referer: this.base
        }
      });
      this.queueItems = qData?.items || qData?.jobs || (Array.isArray(qData) ? qData : []);
      this.log("status", "queue", `${this.queueItems.length} jobs`);
      return {
        state: this.encState(),
        queue: this.queueItems,
        jobs: this.jobs
      };
    } catch (e) {
      this.log("status", "error", e.message);
      throw e;
    }
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
  const api = new Aitopia();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}