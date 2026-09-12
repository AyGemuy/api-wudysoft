import axios from "axios";
import {
  createHmac,
  randomUUID
} from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import WebSocket from "ws";
const MODELS = {
  "Nano Banana": {
    sub_type: 2
  },
  "Nano Banana Pro": {
    sub_type: 2
  },
  "Gempix 2": {
    sub_type: 4
  },
  "Seedream 4.0": {
    sub_type: 3
  },
  "Seedream 4.5": {
    sub_type: 8
  },
  "Flux Dev": {
    sub_type: 5
  },
  "Flux Kontext-Pro": {
    sub_type: 1
  },
  "Qwen Image": {
    sub_type: 9
  },
  "Minimax Image-01": {
    sub_type: 10
  },
  "GPT Image 2": {
    sub_type: 2
  },
  "Flux 2 Pro": {
    sub_type: 6
  },
  "GPT Image 1.5": {
    sub_type: 7
  },
  Midjourney: {
    sub_type: 11
  },
  "Z-Image": {
    sub_type: 12
  },
  "Qwen Image Edit Plus": {
    sub_type: 13
  },
  "Qwen Image Edit 2511": {
    sub_type: 14
  }
};

function resolveModel(modelName) {
  if (!modelName) return null;
  const entry = MODELS[modelName];
  if (!entry) {
    const valid = Object.keys(MODELS).map(m => `  • "${m}"`).join("\n");
    throw new Error(`[model] Unknown model: "${modelName}"\nValid models:\n${valid}`);
  }
  console.log(`[model] Resolved "${modelName}" → sub_type:${entry.sub_type}`);
  return entry;
}
const BASE = "https://photogpt.io";
const CRISP_WS = "wss://client.relay.crisp.chat/w/fea/";
const WEBSITE_ID = "29c69934-5e71-4ba8-9eff-d80342cdd79e";
const PAGE_URL = `${BASE}/ai-models/gpt-image-2`;
const PAGE_TITLE = "GPT Image 2: Try ChatGPT Images 2.0 Free Online, No Sign-up";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";

function crispHandshake(storedSessionId) {
  return new Promise((resolve, reject) => {
    console.log("[crisp] connecting to relay...");
    let ws;
    try {
      ws = new WebSocket(`${CRISP_WS}?EIO=4&transport=websocket`, {
        headers: {
          origin: BASE,
          "user-agent": UA,
          "accept-language": "id-ID",
          pragma: "no-cache",
          "cache-control": "no-cache"
        }
      });
    } catch (err) {
      return reject(new Error(`[crisp] WebSocket init failed: ${err.message}`));
    }
    let sessionId = null;
    let done = false;
    const finish = err => {
      if (done) return;
      done = true;
      try {
        ws.close();
      } catch (_) {}
      if (err) {
        console.error("[crisp] ✗ finished with error:", err.message);
        reject(err);
      } else {
        console.log("[crisp] ✓ session established:", sessionId);
        resolve(sessionId);
      }
    };
    const send = pkt => {
      const preview = pkt.length > 120 ? pkt.slice(0, 120) + "…" : pkt;
      console.log("[crisp] → send:", preview);
      try {
        ws.send(pkt);
      } catch (err) {
        finish(new Error(`[crisp] send failed: ${err.message}`));
      }
    };
    ws.on("open", () => {
      console.log("[crisp] ws open");
    });
    ws.on("message", raw => {
      const msg = raw.toString();
      console.log("[crisp] ← recv:", msg.length > 160 ? msg.slice(0, 160) + "…" : msg);
      try {
        if (msg.startsWith("0{")) {
          console.log("[crisp] phase: EIO open → sending connect");
          send("40");
          return;
        }
        if (msg.startsWith("40{")) {
          const tryId = storedSessionId || `session_${randomUUID()}`;
          console.log("[crisp] phase: connected → joining session:", tryId);
          send(`42["session:join",${JSON.stringify({
website_id: WEBSITE_ID,
session_id: tryId,
expire: 3e5,
storage: true,
sync: !!storedSessionId,
useragent: UA,
timezone: -480,
capabilities: [ "browsing", "call" ],
locales: [ "id-ID" ],
children: true,
device: {
page_url: PAGE_URL,
page_title: PAGE_TITLE
}
})}]`);
          return;
        }
        if (msg.startsWith("42[")) {
          let arr;
          try {
            arr = JSON.parse(msg.slice(2));
          } catch (parseErr) {
            console.warn("[crisp] could not parse event JSON:", parseErr.message);
            return;
          }
          const [event, data] = arr;
          console.log("[crisp] event:", event, "| error:", data?.error ?? "none");
          if (event === "session:joined" && data?.error === "invalid_session") {
            console.log("[crisp] phase: invalid_session → creating new session");
            send(`42["session:create",${JSON.stringify({
website_id: WEBSITE_ID,
website_domain: "photogpt.io",
useragent: UA,
timezone: -480,
capabilities: [ "browsing", "call" ],
locales: [ "id-ID" ]
})}]`);
            return;
          }
          if (event === "session:created" && data?.session_id) {
            console.log("[crisp] phase: session created:", data.session_id, "→ re-joining");
            send(`42["session:join",${JSON.stringify({
website_id: WEBSITE_ID,
session_id: data.session_id,
expire: 3e5,
storage: true,
sync: false,
useragent: UA,
timezone: -480,
capabilities: [ "browsing", "call" ],
locales: [ "id-ID" ],
children: true,
device: {
page_url: PAGE_URL,
page_title: PAGE_TITLE
}
})}]`);
            return;
          }
          if (event === "session:joined" && data?.session_id && !data?.error) {
            sessionId = data.session_id;
            finish(null);
            return;
          }
        }
      } catch (err) {
        console.error("[crisp] message handler error:", err.message);
        finish(err);
      }
    });
    ws.on("error", err => {
      console.error("[crisp] ws error:", err.message);
      finish(err);
    });
    ws.on("close", (code, reason) => {
      console.log("[crisp] ws closed — code:", code, "| reason:", reason?.toString() || "(none)");
      finish(sessionId ? null : new Error(`ws closed before session (code:${code})`));
    });
    setTimeout(() => {
      console.warn("[crisp] timeout after 15s");
      finish(new Error("crisp handshake timeout (15s)"));
    }, 15e3);
  });
}

function hmacSign(payload, key) {
  const str = Object.keys(payload).sort().filter(k => payload[k] !== undefined).map(k => {
    let v = payload[k];
    if (typeof v === "object" && v !== null) v = JSON.stringify(v);
    return `${k}=${v}`;
  }).join("&");
  console.log("[sign] string:", str.length > 120 ? str.slice(0, 120) + "…" : str);
  const hex = createHmac("sha256", key).update(str).digest("hex");
  console.log("[sign] hmac:", hex.slice(0, 16) + "...");
  return hex;
}

function fakeGa() {
  const rnd = Math.floor(Math.random() * 2e9);
  const ts = Math.floor(Date.now() / 1e3);
  return `GA1.1.${rnd}.${ts}`;
}
class PhotoGPT {
  constructor(cookieString = "") {
    this.key = null;
    this._initDone = false;
    this.jar = new CookieJar();
    this._session = {};
    if (cookieString) {
      let loaded = 0;
      for (const pair of cookieString.split(";").map(s => s.trim()).filter(Boolean)) {
        try {
          this.jar.setCookieSync(`${pair}; Domain=photogpt.io; Path=/`, BASE);
          loaded++;
        } catch (err) {
          console.warn("[constructor] could not set cookie:", pair, "|", err.message);
        }
      }
      console.log(`[constructor] loaded ${loaded} cookie(s) from string`);
    }
    this.http = wrapper(axios.create({
      baseURL: BASE,
      jar: this.jar,
      withCredentials: true
    }));
    console.log("[constructor] PhotoGPT client created");
  }
  _setCookie(name, value) {
    try {
      this.jar.setCookieSync(`${name}=${value}; Domain=photogpt.io; Path=/`, BASE);
    } catch (err) {
      console.warn(`[cookie] set failed for "${name}":`, err.message);
    }
  }
  _getCookie(name) {
    try {
      return this.jar.getCookiesSync(BASE).find(c => c.key === name)?.value ?? null;
    } catch (err) {
      console.warn(`[cookie] get failed for "${name}":`, err.message);
      return null;
    }
  }
  get cookie() {
    try {
      return this.jar.getCookiesSync(BASE).map(c => c.cookieString()).join("; ");
    } catch {
      return "";
    }
  }
  _cfg(extra = {}) {
    return {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${BASE}/ai-models/gpt-image-2`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": UA,
        ...extra
      }
    };
  }
  async init() {
    if (this._initDone) {
      console.log("[init] already initialized, skipping");
      return this;
    }
    console.log("[init] starting initialization...");
    try {
      console.log("[init] step 1/5 — fetching homepage for imageKey...");
      let res;
      try {
        res = await this.http.get("/", {
          headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "id-ID",
            "cache-control": "no-cache",
            pragma: "no-cache",
            priority: "u=0, i",
            "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "user-agent": UA
          }
        });
      } catch (err) {
        throw new Error(`[init] homepage fetch failed: ${err.message}`);
      }
      const html = res.data || "";
      console.log("[init] homepage fetched, size:", html.length, "bytes");
      const $ = cheerio.load(html);
      let key = null;
      $("script").each((_, el) => {
        if (key) return;
        const m = ($(el).html() || "").match(/imageKey\s*:\s*["']([^"']+)["']/);
        if (m) key = m[1];
      });
      if (!key) {
        const m = html.match(/imageKey\s*:\s*["']([^"']+)["']/);
        key = m?.[1] ?? null;
      }
      if (!key) throw new Error("[init] imageKey not found in homepage HTML");
      this.key = key;
      console.log("[init] ✓ imageKey extracted:", this.key);
      console.log("[init] step 2/5 — ensuring _ga cookie...");
      if (!this._getCookie("_ga")) {
        const ga = fakeGa();
        this._setCookie("_ga", ga);
        console.log("[init] ✓ _ga generated:", ga);
      } else {
        console.log("[init] ✓ _ga already present:", this._getCookie("_ga"));
      }
      console.log("[init] step 3/5 — ensuring anonymous_user_id...");
      let anonId = this._getCookie("anonymous_user_id");
      if (!anonId) {
        anonId = randomUUID();
        this._setCookie("anonymous_user_id", anonId);
        console.log("[init] ✓ anonymous_user_id generated:", anonId);
      } else {
        console.log("[init] ✓ anonymous_user_id present:", anonId);
      }
      console.log("[init] step 4/5 — crisp handshake...");
      try {
        const crispId = await crispHandshake(this._session.crisp_session_id || null);
        if (crispId) {
          this._setCookie(`crisp-client%2Fsession%2F${WEBSITE_ID}`, crispId);
          this._session.crisp_session_id = crispId;
          console.log("[init] ✓ crisp session stored:", crispId);
        }
      } catch (err) {
        console.warn("[init] ⚠ crisp non-fatal error:", err.message);
      }
      console.log("[init] step 5/5 — saving session state...");
      this._session.anonymous_user_id = anonId;
      this._session.ga = this._getCookie("_ga");
      const cookieKeys = this.jar.getCookiesSync(BASE).map(c => c.key);
      console.log("[init] ✓ init complete | cookies:", cookieKeys.join(", "));
      this._initDone = true;
      return this;
    } catch (err) {
      console.error("[init] ✗ FAILED:", err.message);
      throw err;
    }
  }
  async cred(type = 61) {
    console.log(`[cred] checking credits for type:${type}...`);
    try {
      if (!this._initDone) await this.init();
      const res = await this.http.get("/api/v1/diagram/left-times", {
        ...this._cfg(),
        params: {
          type: type
        }
      });
      const left = res.data?.data?.times_left ?? 0;
      console.log(`[cred] ✓ times_left:${left} (type:${type})`);
      return left;
    } catch (err) {
      console.error("[cred] ✗ FAILED:", err.message);
      throw err;
    }
  }
  async upload(img) {
    console.log("[upload] starting upload...");
    try {
      let buf;
      if (typeof img === "string" && img.startsWith("http")) {
        console.log("[upload] fetching remote url:", img.slice(0, 80) + "…");
        try {
          const resp = await axios.get(img, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(resp.data);
          console.log("[upload] ✓ fetched from url | size:", buf.length, "bytes | content-type:", resp.headers["content-type"] ?? "unknown");
        } catch (err) {
          throw new Error(`fetch url failed: ${err.message}`);
        }
      } else if (typeof img === "string" && img.startsWith("data:")) {
        buf = Buffer.from(img.replace(/^data:[^;]+;base64,/, ""), "base64");
        console.log("[upload] base64 decoded | size:", buf.length, "bytes");
      } else if (Buffer.isBuffer(img)) {
        buf = img;
        console.log("[upload] buffer received | size:", buf.length, "bytes");
      } else {
        throw new Error(`unsupported image input type: ${typeof img}`);
      }
      const filename = `${randomUUID()}.jpg`;
      console.log("[upload] requesting presigned URL for:", filename);
      let ps;
      try {
        ps = await this.http.post("/api/v1/get-sign-url", {
          files: [{
            filename: filename
          }],
          biz: "guest"
        }, this._cfg({
          "content-type": "application/json; charset=UTF-8",
          origin: BASE
        }));
      } catch (err) {
        throw new Error(`presign request failed: ${err.message}`);
      }
      const signedUrl = ps.data?.data?.[0]?.url;
      if (!signedUrl) {
        throw new Error(`no presign url in response: ${JSON.stringify(ps.data)}`);
      }
      console.log("[upload] ✓ presign url:", signedUrl.split("?")[0]);
      try {
        await axios.put(signedUrl, buf, {
          headers: {
            "Content-Type": "image/jpeg"
          }
        });
        console.log("[upload] ✓ PUT to S3/OSS succeeded");
      } catch (err) {
        throw new Error(`PUT upload failed: ${err.message}`);
      }
      const cdn = signedUrl.split("?")[0].replace("nc-cdn.oss-us-west-1.aliyuncs.com/", "cdn.photogpt.io/");
      console.log("[upload] ✓ CDN url:", cdn);
      return cdn;
    } catch (err) {
      console.error("[upload] ✗ FAILED:", err.message);
      throw err;
    }
  }
  async sub(e) {
    console.log("[sub] submitting generation task...");
    try {
      const t = Math.floor(Date.now() / 1e3);
      const sig_version = "v1";
      const sign = hmacSign({
        ...e,
        t: t,
        sig_version: sig_version
      }, this.key);
      const body = {
        ...e,
        sign: sign,
        t: t,
        sig_version: sig_version
      };
      console.log("[sub] payload:", JSON.stringify({
        ...body,
        sign: body.sign.slice(0, 16) + "..."
      }));
      console.log("[sub] cookies:", this.jar.getCookiesSync(BASE).map(c => `${c.key}=${String(c.value).slice(0, 8)}…`).join("; "));
      let res;
      try {
        res = await this.http.post("/api/v1/prediction/handle", body, this._cfg({
          "content-type": "application/json; charset=UTF-8",
          origin: BASE
        }));
      } catch (err) {
        const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
        throw new Error(`prediction/handle request failed: ${detail}`);
      }
      const sid = res.data?.data?.session_id;
      if (!sid) {
        throw new Error(`no session_id in response: ${JSON.stringify(res.data)}`);
      }
      console.log("[sub] ✓ session_id:", sid);
      return sid;
    } catch (err) {
      console.error("[sub] ✗ FAILED:", err.message);
      throw err;
    }
  }
  async poll(sid) {
    console.log("[poll] waiting for result | sid:", sid);
    let n = 0;
    while (true) {
      const ms = ++n <= 3 ? 3e3 : 6e3;
      await new Promise(r => setTimeout(r, ms));
      console.log(`[poll] attempt #${n} | delay:${ms}ms | sid:${sid}`);
      let res;
      try {
        res = await this.http.get("/api/v1/prediction/get-status", {
          ...this._cfg(),
          params: {
            session_id: sid
          }
        });
      } catch (err) {
        console.warn(`[poll] #${n} request error (retrying):`, err.message);
        continue;
      }
      const d = res.data?.data;
      console.log(`[poll] #${n} status:`, d?.status ?? "unknown");
      if (d?.status === "succeeded") {
        const urls = d?.results?.flatMap(r => r?.urls ?? []) ?? [];
        console.log(`[poll] ✓ succeeded after ${n} attempt(s) | ${urls.length} url(s)`);
        return d;
      }
      if (d?.status === "failed") {
        const reason = JSON.stringify(d);
        console.error("[poll] ✗ task failed:", reason);
        throw new Error(`generation task failed: ${reason}`);
      }
      console.log(`[poll] #${n} still pending, waiting ${n <= 3 ? 3 : 6}s...`);
    }
  }
  async generate({
    prompt,
    image,
    model,
    ...rest
  }) {
    console.log("─".repeat(60));
    console.log("[generate] starting...");
    console.log("[generate] model:", model ?? "(none — using defaults)");
    console.log("[generate] prompt:", prompt ?? "(empty)");
    console.log("[generate] image:", image ? typeof image === "string" ? image.slice(0, 60) + "…" : `Buffer(${image.length}b)` : "(none)");
    try {
      if (!this._initDone) await this.init();
      const modelEntry = resolveModel(model);
      if (modelEntry) {
        rest.sub_type = rest.sub_type ?? modelEntry.sub_type;
      }
      const has = image != null;
      const type = rest.type ?? 61;
      const sub_type = rest.sub_type ?? (has ? 2 : 23);
      console.log("[generate] mode:", has ? "image-to-image (i2i)" : "text-to-image (t2i)");
      console.log("[generate] type:", type, "| sub_type:", sub_type);
      const left = await this.cred(type);
      if (left <= 0) throw new Error(`[generate] no credits left (type:${type})`);
      console.log("[generate] credits ok:", left, "remaining");
      const image_urls = [];
      if (has) {
        const imgs = Array.isArray(image) ? image : [image];
        console.log(`[generate] uploading ${imgs.length} image(s)...`);
        for (let i = 0; i < imgs.length; i++) {
          console.log(`[generate] upload ${i + 1}/${imgs.length}`);
          image_urls.push(await this.upload(imgs[i]));
        }
        console.log("[generate] re-checking credits after upload...");
        await this.cred(type);
      }
      const RESERVED = ["type", "sub_type", "aspect_ratio", "num", "size", "resolution", "quality", "speed"];
      const payload = {
        image_urls: image_urls,
        type: type,
        user_prompt: prompt || "",
        sub_type: sub_type,
        aspect_ratio: rest.aspect_ratio ?? "1:1",
        num: rest.num ?? "",
        size: rest.size ?? "",
        resolution: rest.resolution ?? "",
        quality: rest.quality ?? "",
        speed: rest.speed ?? "",
        ...Object.fromEntries(Object.entries(rest).filter(([k]) => !RESERVED.includes(k)))
      };
      console.log("[generate] payload (excl. sign):", JSON.stringify({
        ...payload,
        image_urls: payload.image_urls.map(u => u.slice(0, 60) + "…")
      }));
      const sid = await this.sub(payload);
      const result = await this.poll(sid);
      const urls = result?.results?.flatMap(r => r?.urls ?? []) ?? [];
      console.log("[generate] ✓ DONE | session_id:", sid);
      console.log("[generate] ✓ result urls:", urls);
      console.log("─".repeat(60));
      return {
        session_id: sid,
        status: result?.status,
        urls: urls,
        results: result?.results ?? []
      };
    } catch (err) {
      console.error("[generate] ✗ FAILED:", err.message);
      console.log("─".repeat(60));
      throw err;
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
  const api = new PhotoGPT();
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