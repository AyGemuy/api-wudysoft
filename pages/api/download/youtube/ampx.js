import axios from "axios";
import WebSocket from "ws";
import FormData from "form-data";
import * as cheerio from "cheerio";
import crypto from "crypto";
const BASE_ORIGIN = "https://amp3.cc";
const API_ORIGIN = "https://ampx.cc";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const AUDIO_FORMATS = new Set(["mp3", "m4a", "opus", "wav", "flac", "ogg", "aac", "weba"]);
const VIDEO_FORMATS = new Set(["mp4", "webm", "mkv", "mov"]);
class AltchaSolver {
  constructor(options = {}) {
    this.debug = options.debug !== false;
    this.timeoutMs = Number(options.timeoutMs ?? 12e4);
    this.maxNumber = Number(options.maxNumber ?? 2e6);
    this.yieldEvery = Number(options.yieldEvery ?? 2e4);
  }
  log(...a) {
    try {
      console.log("[altcha]", ...a);
    } catch {}
  }
  dlog(...a) {
    if (this.debug) try {
      console.log("[altcha:debug]", ...a);
    } catch {}
  }
  async solve(challenge) {
    if (!challenge || !challenge.challenge || !challenge.salt) {
      throw new Error("invalid challenge payload");
    }
    const algorithm = String(challenge.algorithm || "SHA-256").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const algo = algorithm === "SHA512" ? "sha512" : algorithm === "SHA384" ? "sha384" : "sha256";
    const salt = String(challenge.salt);
    const target = String(challenge.challenge).toLowerCase();
    const max = Math.min(Number(challenge.maxNumber ?? challenge.maxnumber ?? 2e5) || 2e5, this.maxNumber);
    this.dlog("solve.start", {
      algorithm: algorithm,
      algo: algo,
      max: max,
      salt: salt,
      target: target.slice(0, 16) + "…"
    });
    const started = Date.now();
    const saltBuf = Buffer.from(salt, "utf8");
    for (let n = 0; n <= max; n++) {
      const h = crypto.createHash(algo).update(saltBuf).update(String(n), "utf8").digest("hex");
      if (h === target) {
        const took = Date.now() - started;
        this.log("solve.found", {
          number: n,
          took_ms: took
        });
        return {
          number: n,
          took: took,
          worker: false
        };
      }
      if (n % this.yieldEvery === 0 && n > 0) {
        await new Promise(r => setImmediate(r));
        if (Date.now() - started > this.timeoutMs) {
          throw new Error(`altcha timeout after ${this.timeoutMs}ms (at n=${n})`);
        }
      }
    }
    throw new Error(`altcha solution not found (max ${max}); challenge=${target.slice(0, 16)}… salt=${salt}`);
  }
  buildPayload(challenge, solution) {
    const payload = {
      algorithm: challenge.algorithm || "SHA-256",
      challenge: challenge.challenge,
      number: solution.number,
      salt: challenge.salt,
      signature: challenge.signature,
      took: solution.took || 1e3
    };
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  }
  async selfTest() {
    const known = {
      challenge: "b85f8e7d9cd876b44a9b5a67f0fb4817f3928cab7df4b76dd5404987b6031eb9",
      salt: "83bdf833014b70faed4bd668",
      signature: "bf091ca60ee815d15a432cc887f4f9f363ebc90a3368e100b04973c16084669b",
      number: 55402
    };
    try {
      const started = Date.now();
      const sol = await this.solve({
        algorithm: "SHA-256",
        challenge: known.challenge,
        salt: known.salt,
        maxNumber: 2e5
      });
      return {
        status: sol.number === known.number,
        result: {
          expected_number: known.number,
          found_number: sol.number,
          took_ms: Date.now() - started
        }
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.message || String(e)
        }
      };
    }
  }
}
class AmpxDownloader {
  constructor(options = {}) {
    try {
      const opts = options || {};
      this.base = String(opts.base || BASE_ORIGIN).replace(/\/+$/, "");
      this.apiBase = String(opts.apiBase || API_ORIGIN).replace(/\/+$/, "");
      this.userAgent = String(opts.userAgent || UA);
      this.debug = opts.debug !== false;
      this.timeout = Number(opts.timeout ?? 12e4);
      this.retries = Math.max(0, Number(opts.retries ?? 2));
      this.retryDelay = Math.max(0, Number(opts.retryDelay ?? 800));
      this.maxWaitMs = Number(opts.maxWaitMs ?? 3e5);
      this.pollIntervalMs = Number(opts.pollIntervalMs ?? 3500);
      this.altchaSolver = new AltchaSolver({
        debug: this.debug,
        timeoutMs: opts.altchaTimeoutMs,
        yieldEvery: opts.altchaYieldEvery
      });
      this.manualAltcha = opts.manualAltcha || "";
      this.cookies = {};
      this.csrf = "";
      this.http = axios.create({
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: () => true,
        proxy: false,
        headers: this._baseHeaders()
      });
      this.http.interceptors.request.use(config => {
        config.headers = config.headers || {};
        const ck = this._cookieHeader();
        if (ck) config.headers.cookie = ck;
        if (!config.headers["user-agent"]) config.headers["user-agent"] = this.userAgent;
        if (!config.headers["accept-language"]) config.headers["accept-language"] = "en-US,en;q=0.9,id;q=0.8";
        if (this.debug) {
          try {
            console.log("[ampx][req]", config.method?.toUpperCase(), config.url, ck ? `cookie=${ck.slice(0, 60)}…` : "");
          } catch {}
        }
        return config;
      }, err => Promise.reject(err));
      this.http.interceptors.response.use(res => {
        const sc = res?.headers?.["set-cookie"];
        if (sc) {
          this._setCookies(sc);
          if (this.debug) {
            try {
              console.log("[ampx][res] set-cookie →", Object.keys(this.cookies));
            } catch {}
          }
        }
        return res;
      }, err => Promise.reject(err));
      this.ytHttp = axios.create({
        timeout: 15e3,
        maxRedirects: 5,
        validateStatus: () => true,
        proxy: false,
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9,id;q=0.8",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
    } catch (e) {
      try {
        console.error("[ampx] constructor.error", e?.message || e);
      } catch {}
      throw e;
    }
  }
  log(...a) {
    try {
      console.log("[ampx]", ...a);
    } catch {}
  }
  dlog(...a) {
    if (!this.debug) return;
    try {
      console.log("[ampx:debug]", ...a);
    } catch {}
  }
  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  _setCookies(setCookie) {
    try {
      if (!setCookie) return;
      const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const raw of arr) {
        const [pair] = String(raw).split(";");
        const eq = pair.indexOf("=");
        if (eq < 0) continue;
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        if (k) this.cookies[k] = v;
      }
    } catch (e) {
      this.log("_setCookies.error", e?.message || e);
    }
  }
  _cookieHeader() {
    try {
      const parts = [];
      for (const [k, v] of Object.entries(this.cookies)) parts.push(`${k}=${v}`);
      return parts.join("; ");
    } catch {
      return "";
    }
  }
  _baseHeaders(extra = {}) {
    return Object.assign({
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9,id;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "upgrade-insecure-requests": "1",
      "user-agent": this.userAgent
    }, extra || {});
  }
  async _request(method, url, {
    headers,
    data,
    params,
    responseType
  } = {}) {
    const fullUrl = url.startsWith("http") ? url : this.base + url;
    const maxAttempt = Math.max(1, this.retries + 1);
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempt; attempt++) {
      try {
        return await this.http.request({
          method: method,
          url: fullUrl,
          headers: this._baseHeaders(headers),
          params: params,
          data: data,
          responseType: responseType || "text"
        });
      } catch (err) {
        lastErr = err;
        this.log("request.error", attempt, method, fullUrl, err?.message || err);
        if (attempt < maxAttempt) await this._sleep(this.retryDelay * attempt);
      }
    }
    throw lastErr || new Error("request failed");
  }
  _json(v) {
    try {
      if (v && typeof v === "object") return v;
      const s = String(v || "").trim();
      if (!s) return null;
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  _extractYoutubeId(url) {
    try {
      const s = String(url || "").trim();
      if (!s) return "";
      if (/^[\w-]{11}$/.test(s)) return s;
      const patterns = [/(?:youtube\.com\/watch\?[^#]*?\bv=)([\w-]{11})/i, /(?:youtu\.be\/)([\w-]{11})/i, /(?:youtube\.com\/embed\/)([\w-]{11})/i, /(?:youtube\.com\/v\/)([\w-]{11})/i, /(?:youtube\.com\/shorts\/)([\w-]{11})/i, /(?:youtube\.com\/live\/)([\w-]{11})/i, /(?:youtube\.com\/.*[?&]v=)([\w-]{11})/i];
      for (const re of patterns) {
        const m = s.match(re);
        if (m) return m[1];
      }
      return "";
    } catch {
      return "";
    }
  }
  _extractJsonAfter(html, marker) {
    try {
      const idx = html.indexOf(marker);
      if (idx < 0) return null;
      const start = html.indexOf("{", idx);
      if (start < 0) return null;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < html.length; i++) {
        const c = html[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (c === "\\") {
          escape = true;
          continue;
        }
        if (c === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(html.slice(start, i + 1));
            } catch {
              return null;
            }
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  _formatDuration(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(n / 3600);
    const m = Math.floor(n % 3600 / 60);
    const s = n % 60;
    const pad = x => String(x).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  _formatCount(v) {
    const n = Number(v) || 0;
    if (n < 1e3) return String(n);
    if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, "") + "K";
    if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0).replace(/\.0$/, "") + "M";
    return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  }
  async _resolveYoutube(url) {
    const id = this._extractYoutubeId(url);
    if (!id) return null;
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    let oembed = null;
    try {
      const r = await this.ytHttp.get(oembedUrl, {
        responseType: "json"
      });
      if (r.status === 200 && r.data) oembed = r.data;
    } catch (e) {
      this.dlog("yt.oembed.error", e?.message || e);
    }
    let player = null;
    try {
      const r = await this.ytHttp.get(watchUrl, {
        responseType: "text"
      });
      if (r.status === 200 && typeof r.data === "string") {
        player = this._extractJsonAfter(r.data, "ytInitialPlayerResponse");
      }
    } catch (e) {
      this.dlog("yt.watch.error", e?.message || e);
    }
    const details = player?.videoDetails || null;
    const mf = player?.microformat?.playerMicroformatRenderer || null;
    if (!oembed && !details && !mf) return null;
    const lengthSec = details?.lengthSeconds ? Number(details.lengthSeconds) : null;
    const views = details?.viewCount ? Number(details.viewCount) : null;
    const thumbs = [];
    try {
      const list = details?.thumbnail?.thumbnails || mf?.thumbnail?.thumbnails || [];
      for (const t of list) {
        if (!t?.url) continue;
        thumbs.push({
          url: t.url,
          width: Number(t.width) || null,
          height: Number(t.height) || null
        });
      }
    } catch {}
    const thumbnailBest = thumbs.slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || oembed?.thumbnail_url || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    const keywords = Array.isArray(details?.keywords) ? details.keywords.slice(0, 30) : [];
    const info = {
      id: id,
      url: watchUrl,
      short_url: `https://youtu.be/${id}`,
      embed_url: `https://www.youtube.com/embed/${id}`,
      title: details?.title || oembed?.title || "",
      description: details?.shortDescription || "",
      author: details?.author || oembed?.author_name || "",
      author_url: oembed?.author_url || (details?.channelId ? `https://www.youtube.com/channel/${details.channelId}` : ""),
      channel_id: details?.channelId || "",
      duration_seconds: lengthSec,
      duration_text: lengthSec ? this._formatDuration(lengthSec) : "",
      is_live: !!details?.isLiveContent,
      views: views,
      views_text: views ? this._formatCount(views) : "",
      keywords: keywords,
      thumbnail: thumbnailBest,
      thumbnails: thumbs,
      category: mf?.category || "",
      publish_date: mf?.publishDate || "",
      upload_date: mf?.uploadDate || "",
      is_family_safe: mf?.isFamilySafe ?? null,
      is_unlisted: mf?.isUnlisted ?? null
    };
    this.log("yt.meta.ok", {
      id: id,
      title: info.title,
      duration: info.duration_text,
      views: info.views_text
    });
    return info;
  }
  async _bootstrap({
    ajax = false
  } = {}) {
    const headers = ajax ? {
      "X-Requested-With": "XMLHttpRequest",
      accept: "text/html"
    } : undefined;
    const res = await this._request("GET", "/", {
      headers: headers,
      responseType: "text"
    });
    const html = String(res.data || "");
    const $ = cheerio.load(html);
    this.csrf = $('meta[name="csrf-token"]').attr("content") || $('meta[name="csrf_token"]').attr("content") || "";
    if (!this.csrf) {
      const m = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
      if (m) this.csrf = m[1];
    }
    this.log("bootstrap.ok", {
      ajax: ajax,
      csrf: this.csrf ? "yes" : "no",
      csrf_len: this.csrf.length,
      cookies: Object.keys(this.cookies)
    });
    return html;
  }
  async _getChallenge(context = "POST:/convert") {
    const res = await this._request("GET", `/captcha?context=${encodeURIComponent(context)}`, {
      headers: {
        accept: "*/*",
        referer: `${this.base}/`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      responseType: "text"
    });
    const data = this._json(res.data);
    this.dlog("captcha.raw", {
      status: res.status,
      body: String(res.data || "").slice(0, 400)
    });
    if (!data || !data.challenge) {
      throw new Error(`invalid captcha response: HTTP ${res.status} — ${String(res.data || "").slice(0, 200)}`);
    }
    this.log("captcha.ok", {
      algorithm: data.algorithm,
      maxNumber: data.maxNumber ?? data.maxnumber,
      challenge: String(data.challenge).slice(0, 16) + "…",
      salt: String(data.salt)
    });
    return data;
  }
  async _solveAltcha(challenge) {
    return await this.altchaSolver.solve(challenge);
  }
  _altchaPayload(challenge, solution) {
    return this.altchaSolver.buildPayload(challenge, solution);
  }
  _detectType(format) {
    const f = String(format || "").toLowerCase().replace(/^\./, "");
    if (AUDIO_FORMATS.has(f)) return "audio";
    if (VIDEO_FORMATS.has(f)) return "video";
    return "audio";
  }
  _buildConvertForm({
    url,
    format,
    quality,
    type,
    playlist,
    altcha,
    altcha_context
  }) {
    const resolvedType = type || this._detectType(format);
    const form = new FormData();
    form.append("url", String(url));
    form.append("type", resolvedType);
    form.append("format", String(format));
    if (quality) form.append("quality", String(quality));
    form.append("playlist", String(!!playlist));
    if (playlist) form.append("playlist_start", "1");
    form.append("altcha", altcha || "");
    form.append("altcha_context", altcha_context);
    form.append("company_website", "");
    form.append("_token", this.csrf || "");
    return {
      form: form,
      resolvedType: resolvedType
    };
  }
  async _convert(args) {
    const {
      form
    } = this._buildConvertForm(args);
    const doPost = () => this._request("POST", "/convert", {
      data: form,
      headers: Object.assign({
        accept: "application/json",
        origin: this.base,
        referer: `${this.base}/`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }, typeof form.getHeaders === "function" ? form.getHeaders() : {}),
      responseType: "text"
    });
    let res = await doPost();
    let data = this._json(res.data) || {};
    if (res.status === 419) {
      this.log("convert.csrf_expired → refresh & retry");
      await this._bootstrap({
        ajax: true
      });
      try {
        if (typeof form.set === "function") form.set("_token", this.csrf || "");
        else {
          try {
            form.delete("_token");
          } catch {}
          form.append("_token", this.csrf || "");
        }
      } catch {}
      res = await doPost();
      data = this._json(res.data) || {};
    }
    this.log("convert.response", {
      status: res.status,
      ok: data?.ok,
      state: data?.data?.state ?? data?.state,
      overlimit: res.headers?.["x-altcha-overlimit"] || null
    });
    return {
      status: res.status,
      data: data,
      headers: res.headers
    };
  }
  _pick(obj, keys) {
    if (!obj || typeof obj !== "object") return "";
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && v !== "") return String(v);
    }
    return "";
  }
  _extractJid(data) {
    try {
      const KEYS = ["jid", "job_id", "jobId", "id", "token", "session", "session_id"];
      if (!data || typeof data !== "object") return "";
      const p = o => this._pick(o, KEYS);
      return p(data) || p(data.data) || p(data.message) || p(data.message?.data) || p(data.result) || p(data.payload) || p(data.job) || p(Array.isArray(data.jobs) ? data.jobs[0] : null) || "";
    } catch {
      return "";
    }
  }
  _extractWsToken(data) {
    try {
      if (!data || typeof data !== "object") return "";
      const p = o => this._pick(o, ["ws_token"]);
      return p(data) || p(data.data) || p(data.message) || p(data.result) || p(data.payload) || "";
    } catch {
      return "";
    }
  }
  async _waitForJob({
    jid,
    wsToken,
    onProgress,
    maxWaitMs
  }) {
    const timeoutMs = maxWaitMs || this.maxWaitMs;
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws = null;
      const finish = (err, ok) => {
        if (settled) return;
        settled = true;
        try {
          clearTimeout(timer);
        } catch {}
        try {
          ws && ws.close(1e3, "done");
        } catch {}
        if (err) reject(err);
        else resolve(ok);
      };
      const timer = setTimeout(() => finish(new Error(`ws timeout after ${timeoutMs}ms`)), timeoutMs);
      try {
        const wsUrl = this.base.replace(/^http/i, "ws") + "/ws";
        this.log("ws.connect", wsUrl);
        ws = new WebSocket(wsUrl, "json", {
          headers: {
            origin: this.base,
            "user-agent": this.userAgent,
            cookie: this._cookieHeader(),
            pragma: "no-cache",
            "cache-control": "no-cache"
          }
        });
      } catch (e) {
        return finish(e);
      }
      ws.on("open", () => {
        try {
          this.log("ws.open → subscribe", {
            jid: jid
          });
          ws.send(JSON.stringify({
            jid: jid,
            token: wsToken
          }));
        } catch (e) {
          finish(e);
        }
      });
      ws.on("message", buf => {
        let msg = {};
        try {
          msg = JSON.parse(buf.toString("utf8"));
        } catch {
          return;
        }
        const event = String(msg.event || msg.action || msg.status || "").toLowerCase();
        if (event) this.log("ws.event", event, msg.progress ?? msg.state ?? "");
        if (typeof onProgress === "function") {
          try {
            onProgress({
              event: event,
              ...msg
            });
          } catch {}
        }
        if (event === "file" && msg.done === true) {
          return finish(null, {
            done: true,
            title: msg.title || "",
            file: msg.file || "",
            worker: msg.worker || "",
            download_url: msg.download_url || "",
            raw: msg
          });
        }
        if (msg.download_url && (msg.done === true || event === "done")) {
          return finish(null, {
            done: true,
            title: msg.title || "",
            file: msg.file || "",
            worker: msg.worker || "",
            download_url: msg.download_url,
            raw: msg
          });
        }
        if (event === "error" || event === "failed" || event === "cancel") {
          return finish(new Error(`job ${event}: ${JSON.stringify(msg)}`));
        }
      });
      ws.on("error", err => finish(err));
      ws.on("close", (code, reason) => {
        if (!settled) finish(new Error(`ws closed: ${code || ""} ${reason ? reason.toString() : ""}`));
      });
    });
  }
  async _statusPoll(jid) {
    try {
      const res = await this._request("GET", `/status?token=${encodeURIComponent(jid)}`, {
        headers: {
          accept: "application/json",
          referer: `${this.base}/`
        },
        responseType: "text"
      });
      return this._json(res.data) || {};
    } catch (e) {
      this.log("status.poll.error", e?.message || e);
      return {};
    }
  }
  async _pollUntilDone({
    jid,
    onProgress
  }) {
    const deadline = Date.now() + this.maxWaitMs;
    let lastState = "";
    while (Date.now() < deadline) {
      const poll = await this._statusPoll(jid);
      const d = poll?.data || poll || {};
      const state = String(d.state || d.status || "");
      if (state !== lastState) {
        this.log("poll.state", state || "(empty)");
        lastState = state;
      }
      if (typeof onProgress === "function") {
        try {
          onProgress({
            event: "poll",
            ...d
          });
        } catch {}
      }
      if (state === "completed" || state === "done" || state === "finished" || d.done === true) {
        return {
          done: true,
          title: d.title || "",
          file: d.file || "",
          worker: d.worker || "",
          download_url: d.download_url || "",
          raw: d
        };
      }
      if (state === "failed" || state === "error" || state === "cancelled") {
        throw new Error(`job ${state}: ${JSON.stringify(d)}`);
      }
      await this._sleep(this.pollIntervalMs);
    }
    throw new Error("job did not finish within maxWaitMs");
  }
  async info({
    url,
    link
  } = {}) {
    try {
      const target = url || link;
      if (!target) throw new Error("url is required");
      const info = await this._resolveYoutube(target);
      if (!info) throw new Error("cannot resolve YouTube metadata (not YT or fetch failed)");
      return {
        status: true,
        result: info
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async solveCaptcha(context = "POST:/convert") {
    try {
      if (!this.csrf) await this._bootstrap();
      const challenge = await this._getChallenge(context);
      const solution = await this._solveAltcha(challenge);
      const altcha = this._altchaPayload(challenge, solution);
      return {
        status: true,
        result: {
          challenge: challenge,
          solution: solution,
          altcha: altcha,
          altcha_context: context
        }
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async selftest() {
    return await this.altchaSolver.selfTest();
  }
  async status({
    jid,
    token
  } = {}) {
    try {
      const id = jid || token;
      if (!id) throw new Error("jid/token is required");
      const data = await this._statusPoll(id);
      return {
        status: true,
        result: data
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async health() {
    try {
      const res = await this._request("GET", "/site-status/health", {
        headers: {
          accept: "application/json"
        },
        responseType: "text"
      });
      const data = this._json(res.data) || {};
      return {
        status: true,
        result: data
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.message || "unknown error"
        }
      };
    }
  }
  async download({
    url,
    format = "mp3",
    quality = "128k",
    type,
    playlist = false,
    preferWs = true,
    onProgress,
    maxWaitMs,
    manualAltcha,
    includeInfo = true
  } = {}) {
    const started = Date.now();
    try {
      if (!url) throw new Error("url is required");
      this.log("download.start", {
        url: url,
        format: format,
        quality: quality,
        type: type,
        playlist: playlist
      });
      const metaPromise = includeInfo ? this._resolveYoutube(url).catch(e => {
        this.dlog("download.meta.error", e?.message || e);
        return null;
      }) : Promise.resolve(null);
      await this._bootstrap();
      const context = "POST:/convert";
      let altcha = manualAltcha || this.manualAltcha || "";
      let challenge = null;
      let solution = null;
      if (!altcha) {
        challenge = await this._getChallenge(context);
        solution = await this._solveAltcha(challenge);
        altcha = this._altchaPayload(challenge, solution);
      } else {
        this.log("download.altcha.manual", {
          length: altcha.length
        });
      }
      const conv = await this._convert({
        url: url,
        format: format,
        quality: quality,
        type: type,
        playlist: playlist,
        altcha: altcha,
        altcha_context: context
      });
      if (conv?.data?.altcha_required === true || conv?.headers?.["x-altcha-overlimit"] === "1") {
        throw new Error("server requested altcha re-verification (overlimit); retry later");
      }
      if (!conv || conv.status >= 400 || !conv.data || conv.data.ok !== true) {
        throw new Error(`convert failed: HTTP ${conv?.status || "?"} — ${JSON.stringify(conv?.data || {}).slice(0, 300)}`);
      }
      const jid = this._extractJid(conv.data);
      const wsToken = this._extractWsToken(conv.data);
      if (!jid) {
        throw new Error("missing job token in convert response: " + JSON.stringify(conv.data).slice(0, 300));
      }
      const inner = conv.data.data || {};
      this.log("convert.ok", {
        jid: jid,
        has_ws: !!wsToken,
        state: inner.state,
        service: inner.service
      });
      const info = await metaPromise;
      let final = null;
      let wsErr = null;
      if (preferWs && wsToken) {
        try {
          final = await this._waitForJob({
            jid: jid,
            wsToken: wsToken,
            onProgress: onProgress,
            maxWaitMs: maxWaitMs
          });
        } catch (e) {
          wsErr = e;
          this.log("ws.error → fallback poll", e?.message || e);
        }
      }
      if (!final) final = await this._pollUntilDone({
        jid: jid,
        onProgress: onProgress
      });
      const filename = final.file || "";
      const worker = final.worker || "";
      const encoded = encodeURIComponent(filename);
      const direct_url = final.download_url || (worker && filename ? `https://${worker}.ampx.cc/dl/${jid}/${encoded}` : "");
      const result = {
        id: jid,
        ws_token: wsToken || "",
        title: final.title || (info?.title || ""),
        filename: filename,
        worker: worker,
        service: inner.service || "",
        format: format,
        quality: quality,
        type: type || this._detectType(format),
        playlist: !!playlist,
        direct_url: direct_url,
        proxy_url: `${this.apiBase}/d/${jid}`,
        site_url: `${this.base}/d/${jid}`,
        altcha_number: solution?.number ?? null,
        altcha_took_ms: solution?.took ?? null,
        state: "completed",
        elapsed_ms: Date.now() - started,
        ws_error: wsErr ? String(wsErr.message || wsErr) : null,
        info: info || null
      };
      this.log("download.done", result.direct_url || result.proxy_url);
      return {
        status: true,
        result: result
      };
    } catch (e) {
      this.log("download.error", e?.message || e);
      return {
        status: false,
        result: {
          id: "",
          ws_token: "",
          title: "",
          filename: "",
          worker: "",
          service: "",
          format: format,
          quality: quality,
          type: type || this._detectType(format),
          playlist: !!playlist,
          direct_url: "",
          proxy_url: "",
          site_url: "",
          altcha_number: null,
          altcha_took_ms: null,
          state: "failed",
          elapsed_ms: Date.now() - started,
          error: e?.message || "unknown error",
          info: null
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new AmpxDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}