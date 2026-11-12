import axios from "axios";
import crypto from "crypto";
const BASE = "https://app-v1.live3d.io/aitools/of";
const IMG_BASE = "https://temp.live3d.io";
const SITE_URL = "https://live3d.io/";
const BRAND_KEY = "8f3f0c7387123ae0";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " + "(KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
const THEME_VERSION = "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q";
const FP_PREFIX = "aifaceswap";
const genFp = () => crypto.randomBytes(16).toString("hex");
const genAesSecret = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(16), b => chars[b % chars.length]).join("");
};
const toAesBuf = (s, len = 16) => {
  const b = Buffer.alloc(len, 0);
  Buffer.from(s, "utf8").copy(b, 0, 0, len);
  return b;
};
const aesCbcEncrypt = (plaintext, secret) => {
  const key = toAesBuf(secret, 16);
  const iv = toAesBuf(secret, 16);
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  return Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]).toString("base64");
};
const rsaEncrypt = secret => crypto.publicEncrypt({
  key: RSA_PUBLIC_KEY,
  padding: crypto.constants.RSA_PKCS1_PADDING
}, Buffer.from(secret, "utf8")).toString("base64");
const makeSign = () => {
  const fp = genFp();
  const aesSecret = genAesSecret();
  const fp1 = aesCbcEncrypt(`${FP_PREFIX}:${fp}`, aesSecret);
  const xGuide = rsaEncrypt(aesSecret);
  return {
    fp: fp,
    fp1: fp1,
    "x-guide": xGuide
  };
};
const xCode = () => String(Date.now());
const parseCookies = (arr = []) => arr.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
const BASE_HEADERS = {
  "accept-language": "id-ID",
  "brand-key": BRAND_KEY,
  origin: "https://live3d.io",
  referer: "https://live3d.io/",
  "user-agent": UA,
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site"
};
class Live3D {
  constructor() {
    this.originFrom = BRAND_KEY;
    this.requestFrom = 9;
    this.cookie = "";
    this.themeVersion = THEME_VERSION;
    this.ready = false;
    this.http = null;
  }
  async init() {
    console.log("[live3d] Initializing — fetching cookies...");
    try {
      const res = await axios.get(SITE_URL, {
        headers: {
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "accept-language": "id-ID,id;q=0.9",
          "user-agent": UA,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none"
        },
        maxRedirects: 5,
        validateStatus: s => s < 500
      });
      this.cookie = parseCookies(res?.headers?.["set-cookie"] ?? []);
      console.log("[live3d] Cookies:", this.cookie?.slice(0, 80) || "(none)");
      const html = typeof res?.data === "string" ? res.data : "";
      const tv = html.match(/["']theme-version["']\s*[=:]\s*["']([A-Za-z0-9+/=_\-]{30,})["']/);
      if (tv?.[1]) {
        this.themeVersion = tv[1];
        console.log("[live3d] Theme-version (live):", this.themeVersion.slice(0, 32) + "...");
      } else {
        console.log("[live3d] Theme-version (cached):", this.themeVersion.slice(0, 32) + "...");
      }
    } catch (err) {
      console.warn("[live3d] Init warning (lanjut tanpa cookie):", err?.message);
    }
    this._buildHttp();
    this.ready = true;
    console.log("[live3d] Ready!");
    return this;
  }
  _buildHttp() {
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        accept: "application/json, text/plain, */*",
        ...BASE_HEADERS
      }
    });
    this.http.interceptors.request.use(cfg => {
      Object.assign(cfg.headers, {
        cookie: this.cookie || "",
        "theme-version": this.themeVersion || "",
        "x-code": xCode(),
        ...makeSign()
      });
      return cfg;
    });
  }
  async _ensureReady() {
    if (!this.ready) await this.init();
  }
  async getPoints() {
    await this._ensureReady();
    console.log("[live3d] Fetching points config...");
    const res = await this.http.get("/fn_points", {
      params: {
        request_from: this.requestFrom,
        origin_from: this.originFrom
      }
    });
    const cfg = res?.data?.data?.points_config ?? null;
    console.log("[live3d] Points:", JSON.stringify(cfg));
    return cfg;
  }
  async create({
    fn_name,
    input = {},
    call_type = 3,
    data = ""
  } = {}) {
    await this._ensureReady();
    console.log(`[live3d] Creating task: ${fn_name}...`);
    const body = {
      fn_name: fn_name,
      call_type: call_type,
      data: data,
      input: {
        ...input,
        request_from: this.requestFrom
      },
      request_from: this.requestFrom,
      origin_from: this.originFrom
    };
    const res = await this.http.post("/create", body);
    const result = res?.data?.data ?? null;
    console.log("[live3d] Create response:", JSON.stringify(result));
    if (!result?.task_id) {
      console.error("[live3d] Full response:", JSON.stringify(res?.data));
      throw new Error(`No task_id — code: ${res?.data?.code}, msg: ${res?.data?.message ?? res?.data?.msg ?? "?"}`);
    }
    return result;
  }
  async checkStatus({
    task_id,
    fn_name,
    call_type = 3
  } = {}) {
    await this._ensureReady();
    const res = await this.http.post("/check-status", {
      task_id: task_id,
      fn_name: fn_name,
      call_type: call_type,
      request_from: this.requestFrom,
      origin_from: this.originFrom
    });
    return res?.data?.data ?? null;
  }
  async poll({
    task_id,
    fn_name,
    call_type = 3,
    maxTries = 60,
    interval = 3e3
  } = {}) {
    console.log(`[live3d] Polling ${task_id} (max ${maxTries}x @ ${interval}ms)...`);
    let tries = 0;
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        tries++;
        try {
          const r = await this.checkStatus({
            task_id: task_id,
            fn_name: fn_name,
            call_type: call_type
          });
          console.log(`[live3d] Poll ${tries}/${maxTries} — status: ${r?.status}`);
          if (r?.status === 2) {
            clearInterval(timer);
            const imgUrl = r?.result_image ? `${IMG_BASE}/${r.result_image}` : null;
            console.log("[live3d] ✓ Done:", imgUrl);
            resolve({
              ...r,
              imgUrl: imgUrl
            });
          } else if (r?.status >= 3) {
            clearInterval(timer);
            reject(new Error(`Task failed — status ${r?.status}`));
          } else if (tries >= maxTries) {
            clearInterval(timer);
            reject(new Error("Polling timeout"));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, interval);
    });
  }
  async generate({
    prompt,
    fn_name = "demo-ai-body-v1",
    model = "meinamix_meinaV11.safetensors",
    lora = [],
    negative_prompt = "",
    cfg = 7,
    call_type = 3,
    ...rest
  }) {
    await this._ensureReady();
    console.log(`[live3d] generate() fn=${fn_name} | "${prompt?.slice(0, 60)}..."`);
    const task = await this.create({
      fn_name: fn_name,
      call_type: call_type,
      input: {
        prompt: prompt,
        model: model,
        lora: lora,
        negative_prompt: negative_prompt,
        cfg: cfg,
        ...rest
      }
    });
    console.log(`[live3d] Queued — ID: ${task.task_id}, rank: ${task?.rank ?? "?"}`);
    return this.poll({
      task_id: task.task_id,
      fn_name: fn_name,
      call_type: call_type
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
  const api = new Live3D();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}