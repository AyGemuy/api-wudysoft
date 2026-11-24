import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";

class MurekaClient {
  constructor() {
    this.baseUrl = "https://www.mureka.ai";
    this.cdnUrl = "https://static-cos.mureka.ai";
    this.appName = "Mureka";
    this.ua = "Mureka/1.53.0/android/android/14/unknown/unknown//3x";
  }

  slp(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }

  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }

  ctx(state) {
    const d = this.b64d(state);
    return {
      token: d?.token || "",
      user: d?.user || null
    };
  }

  resolveMediaUrl(path = "") {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${this.cdnUrl}/${path.replace(/^\/+/, "")}`;
  }

  fixMedia(data) {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map((item) => this.fixMedia(item));

    const out = { ...data };
    for (const key of [
      "mp3_url",
      "m4a_url",
      "wav_url",
      "audio_url",
      "video_url",
      "cover",
      "cover_url",
      "share_cover",
      "avatar",
      "icon"
    ]) {
      if (typeof out[key] === "string" && out[key]) {
        out[key] = this.resolveMediaUrl(out[key]);
      }
    }
    for (const [k, v] of Object.entries(out)) {
      if (v && typeof v === "object") {
        out[k] = this.fixMedia(v);
      }
    }
    return out;
  }

  createHeaders(token = "", extraHeaders = {}) {
    return {
      "X-App-Name": this.appName,
      "X-User-Agent": this.ua,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders
    };
  }

  async request(endpoint, options = {}, token = "") {
    const cleanEp = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}/${cleanEp}`;
    const hasBody = Boolean(options.body);
    const isBodyObject = hasBody && typeof options.body === "object" && !(options.body instanceof Uint8Array);
    const body = isBodyObject ? JSON.stringify(options.body) : options.body;
    const headers = this.createHeaders(token, {
      ...(isBodyObject || (typeof options.body === "string" && options.body.startsWith("{"))
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {})
    });

    return fetch(url, { ...options, headers, ...(hasBody ? { body } : {}) })
      .then(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { code: res.status, msg: text };
        }
      })
      .catch((err) => ({ code: -1, msg: err?.message || "Request failed" }));
  }

  isOk(res) {
    return Boolean(res && (res.code === 0 || res.code === 200));
  }

  async ensure_c(state, forceNew = false) {
    const c = this.ctx(forceNew ? null : state);
    if (!c.token) {
      console.log("[AUTH] Membuat anonymous session Mureka...");
      const loginRes = await this.request("api/user/anonymous/login", {
        method: "POST",
        body: {}
      });

      if (!this.isOk(loginRes)) {
        throw new Error(loginRes?.msg || `Anonymous login failed (code=${loginRes?.code})`);
      }

      c.token = loginRes?.data?.token || loginRes?.data?.access_token || loginRes?.token || "";
      c.user = loginRes?.data?.user || loginRes?.data || null;

      if (!c.token) {
        throw new Error("Token tidak ditemukan pada respons anonymous login.");
      }

      try {
        await this.request("api/pgc/daily/free/credit/trigger", { method: "POST", body: {} }, c.token);
      } catch {}
    }
    return c;
  }

  async reqAuth(c, endpoint, options = {}) {
    let res = await this.request(endpoint, options, c.token);
    if (res && (res.code === 401 || res.code === 40100)) {
      console.warn("[AUTH] Token expired, mencoba refresh session...");
      const ref = await this.request("api/user/session/invoke", { method: "POST", body: {} }, c.token);
      if (this.isOk(ref) && (ref?.data?.token || ref?.data?.access_token)) {
        c.token = ref.data.token || ref.data.access_token;
      } else {
        const fresh = await this.ensure_c(null, true);
        c.token = fresh.token;
        c.user = fresh.user;
      }
      res = await this.request(endpoint, options, c.token);
    }
    return res;
  }

  wrapRes(c, res) {
    const b64 = this.b64e(c);
    if (!this.isOk(res)) {
      return {
        status: false,
        result: {
          error: res?.msg || res?.message || "Mureka API error",
          code: res?.code,
          detail: res?.data ?? null
        },
        state: b64,
        State: b64
      };
    }

    return {
      status: true,
      result: this.fixMedia(res?.data ?? res),
      state: b64,
      State: b64
    };
  }

  async reg_dev({ state, force = false } = {}) {
    let c = null;
    try {
      const shouldForce = force === true || force === "true";
      c = await this.ensure_c(state, shouldForce);
      const profileRes = await this.reqAuth(c, "api/user/profile");
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          token: c.token,
          user: c.user,
          profile: this.isOk(profileRes) ? this.fixMedia(profileRes.data) : null
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_reg_dev" },
        state: b64,
        State: b64
      };
    }
  }

  async refresh({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.request("api/user/session/invoke", { method: "POST", body: {} }, c.token);
      if (this.isOk(res) && (res?.data?.token || res?.data?.access_token)) {
        c.token = res.data.token || res.data.access_token;
      }
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_refresh" },
        state: b64,
        State: b64
      };
    }
  }

  async claim_credit({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/pgc/daily/free/credit/trigger", { method: "POST", body: {} });
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_claim_credit" },
        state: b64,
        State: b64
      };
    }
  }

  async profile({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/user/profile");
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_profile" },
        state: b64,
        State: b64
      };
    }
  }

  async models({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/pgc/model/list");
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_models" },
        state: b64,
        State: b64
      };
    }
  }

  async prompt_tags({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/pgc/prompt/tags/v2");
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_prompt_tags" },
        state: b64,
        State: b64
      };
    }
  }

  async random_prompt({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/pgc/prompt/random");
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_random_prompt" },
        state: b64,
        State: b64
      };
    }
  }

  async random_styles({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/pgc/style/random");
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_random_styles" },
        state: b64,
        State: b64
      };
    }
  }

  async trending({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const res = await this.reqAuth(c, "api/pgc/explore/trending/list");
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_trending" },
        state: b64,
        State: b64
      };
    }
  }

  async feed_flow({ state, scene = "foryou", offset = 0, size = 20 } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const ep = `api/pgc/feed-flow?scene=${encodeURIComponent(scene)}&offset=${Number(offset) || 0}&size=${Number(size) || 20}`;
      const res = await this.reqAuth(c, ep);
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_feed_flow" },
        state: b64,
        State: b64
      };
    }
  }

  async search({ state, keyword, q, query, type = "song", offset = 0, size = 20 } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const kw = String(keyword ?? q ?? query ?? "").trim();
      if (!kw) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'keyword' (atau 'q') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const ep = `api/pgc/explore/search?keyword=${encodeURIComponent(kw)}&type=${encodeURIComponent(type || "song")}&offset=${Number(offset) || 0}&size=${Number(size) || 20}`;
      const res = await this.reqAuth(c, ep);
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_search" },
        state: b64,
        State: b64
      };
    }
  }

  async search_suggestions({ state, keyword, q, query } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const kw = String(keyword ?? q ?? query ?? "").trim();
      if (!kw) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'keyword' (atau 'q') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const ep = `api/pgc/explore/search/suggestions?keyword=${encodeURIComponent(kw)}`;
      const res = await this.reqAuth(c, ep);
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_search_suggestions" },
        state: b64,
        State: b64
      };
    }
  }

  async waitForSongInternal(c, songId, maxWaitMs = 180000, intervalMs = 4000) {
    const start = Date.now();
    const maxMs = Number(maxWaitMs) > 0 ? Number(maxWaitMs) : 180000;
    const intMs = Number(intervalMs) > 0 ? Number(intervalMs) : 4000;

    while (Date.now() - start < maxMs) {
      const res = await this.reqAuth(c, `api/pgc/song/detail?song_id=${encodeURIComponent(songId)}`);
      const genState = res?.data?.song?.generate_state;
      if (genState === 3 || (genState !== undefined && genState !== 0 && genState !== 1 && genState !== 2)) {
        return res;
      }
      await this.slp(intMs);
    }
    return { code: -1, msg: "Polling timed out" };
  }

  async generate({ state, wait = true, maxWaitMs, max_wait, intervalMs, interval, ...options } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const promptInput = options.prompt ?? options.desc ?? options.description;

      if (!promptInput && !options.lyrics) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'prompt' (atau 'lyrics') wajib diisi." },
          state: b64,
          State: b64
        };
      }

      let promptObj;
      if (typeof promptInput === "string") {
        try {
          const parsed = JSON.parse(promptInput);
          promptObj = typeof parsed === "object" && parsed !== null ? parsed : { content: promptInput };
        } catch {
          promptObj = { content: promptInput };
        }
      } else {
        promptObj = promptInput || { content: "" };
      }

      const payload = {
        mode: options.mode !== undefined ? Number(options.mode) : 0,
        model: options.model || "mureka-7.5all",
        ...options,
        ...(options.mode !== undefined ? { mode: Number(options.mode) } : {}),
        prompt: promptObj
      };
      delete payload.desc;
      delete payload.description;

      console.log(`[MUREKA] Generate song (model=${payload.model}, mode=${payload.mode})...`);
      const genRes = await this.reqAuth(c, "api/pgc/feed/generate", {
        method: "POST",
        body: payload
      });

      if (!this.isOk(genRes)) {
        return this.wrapRes(c, genRes);
      }

      const shouldWait = wait !== false && wait !== "false";
      if (!shouldWait) {
        return this.wrapRes(c, genRes);
      }

      const d = genRes.data || {};
      let songId =
        d.song_id ||
        d.song?.song_id ||
        d.songs?.[0]?.song_id ||
        d.feed?.songs?.[0]?.song_id ||
        null;

      const feedId = d.feed_id || d.feed?.feed_id || null;
      if (!songId && feedId) {
        const feedRes = await this.reqAuth(c, `api/pgc/feed/detail?feed_id=${encodeURIComponent(feedId)}`);
        songId =
          feedRes?.data?.feed?.songs?.[0]?.song_id ||
          feedRes?.data?.songs?.[0]?.song_id ||
          null;
      }

      if (!songId) {
        return this.wrapRes(c, genRes);
      }

      const polled = await this.waitForSongInternal(
        c,
        songId,
        maxWaitMs || max_wait || 180000,
        intervalMs || interval || 4000
      );

      if (!this.isOk(polled)) {
        return this.wrapRes(c, polled);
      }

      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          generated: this.fixMedia(genRes.data),
          detail: this.fixMedia(polled.data)
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_generate" },
        state: b64,
        State: b64
      };
    }
  }

  async feed_list({ state, offset = 0, size = 20 } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const ep = `api/pgc/feed/list?offset=${Number(offset) || 0}&size=${Number(size) || 20}`;
      const res = await this.reqAuth(c, ep);
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_feed_list" },
        state: b64,
        State: b64
      };
    }
  }

  async feed_detail({ state, feed_id, feedId, id } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = feed_id || feedId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'feed_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const res = await this.reqAuth(c, `api/pgc/feed/detail?feed_id=${encodeURIComponent(targetId)}`);
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_feed_detail" },
        state: b64,
        State: b64
      };
    }
  }

  async song_detail({ state, song_id, songId, id } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = song_id || songId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'song_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const res = await this.reqAuth(c, `api/pgc/song/detail?song_id=${encodeURIComponent(targetId)}`);
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_song_detail" },
        state: b64,
        State: b64
      };
    }
  }

  async wait_song({ state, song_id, songId, id, maxWaitMs, max_wait, intervalMs, interval } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = song_id || songId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'song_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const res = await this.waitForSongInternal(
        c,
        targetId,
        maxWaitMs || max_wait || 180000,
        intervalMs || interval || 4000
      );
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_wait_song" },
        state: b64,
        State: b64
      };
    }
  }

  async delete_feed({ state, feed_id, feedId, id } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = feed_id || feedId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'feed_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const res = await this.reqAuth(c, "api/pgc/feed/delete", {
        method: "POST",
        body: { feed_id: targetId }
      });
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_delete_feed" },
        state: b64,
        State: b64
      };
    }
  }

  async delete_song({ state, song_id, songId, id } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = song_id || songId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'song_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const res = await this.reqAuth(c, "api/pgc/song/delete", {
        method: "POST",
        body: { song_id: targetId }
      });
      return this.wrapRes(c, res);
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_delete_song" },
        state: b64,
        State: b64
      };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = [
    "reg_dev",
    "refresh",
    "claim_credit",
    "profile",
    "models",
    "prompt_tags",
    "random_prompt",
    "random_styles",
    "trending",
    "feed_flow",
    "search",
    "search_suggestions",
    "generate",
    "feed_list",
    "feed_detail",
    "song_detail",
    "wait_song",
    "delete_feed",
    "delete_song"
  ];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          profile: "/?action=profile&state=BASE64_STATE",
          models: "/?action=models",
          prompt_tags: "/?action=prompt_tags",
          random_prompt: "/?action=random_prompt",
          random_styles: "/?action=random_styles",
          trending: "/?action=trending",
          feed_flow: "/?action=feed_flow&scene=foryou&offset=0&size=20",
          search: "/?action=search&keyword=lofi&type=song&offset=0&size=20",
          search_suggestions: "/?action=search_suggestions&keyword=pop",
          generate: {
            url: "/?action=generate",
            body: {
              prompt: "Upbeat synthwave track for night driving",
              model: "mureka-7.5all",
              mode: 0,
              wait: true
            }
          },
          feed_list: "/?action=feed_list&state=BASE64_STATE&offset=0&size=20",
          feed_detail: "/?action=feed_detail&feed_id=FEED_ID",
          song_detail: "/?action=song_detail&song_id=SONG_ID",
          wait_song: "/?action=wait_song&song_id=SONG_ID",
          delete_feed: "/?action=delete_feed&state=BASE64_STATE&feed_id=FEED_ID",
          delete_song: "/?action=delete_song&state=BASE64_STATE&song_id=SONG_ID"
        }
      }
    });
  }

  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions
    });
  }

  const api = new MurekaClient();
  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "refresh":
        response = await api.refresh(params);
        break;
      case "claim_credit":
        response = await api.claim_credit(params);
        break;
      case "profile":
        response = await api.profile(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "prompt_tags":
        response = await api.prompt_tags(params);
        break;
      case "random_prompt":
        response = await api.random_prompt(params);
        break;
      case "random_styles":
        response = await api.random_styles(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "feed_flow":
        response = await api.feed_flow(params);
        break;
      case "search": {
        const kw = params.keyword ?? params.q ?? params.query;
        if (!kw) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' (atau 'q') wajib diisi."
          });
        }
        response = await api.search(params);
        break;
      }
      case "search_suggestions": {
        const kw = params.keyword ?? params.q ?? params.query;
        if (!kw) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' (atau 'q') wajib diisi."
          });
        }
        response = await api.search_suggestions(params);
        break;
      }
      case "generate": {
        const prompt = params.prompt ?? params.desc ?? params.description;
        if (!prompt && !params.lyrics) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' (atau 'lyrics') wajib diisi."
          });
        }
        response = await api.generate(params);
        break;
      }
      case "feed_list":
        response = await api.feed_list(params);
        break;
      case "feed_detail": {
        const feedId = params.feed_id || params.feedId || params.id;
        if (!feedId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'feed_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.feed_detail(params);
        break;
      }
      case "song_detail": {
        const songId = params.song_id || params.songId || params.id;
        if (!songId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'song_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.song_detail(params);
        break;
      }
      case "wait_song": {
        const songId = params.song_id || params.songId || params.id;
        if (!songId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'song_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.wait_song(params);
        break;
      }
      case "delete_feed": {
        const feedId = params.feed_id || params.feedId || params.id;
        if (!feedId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'feed_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.delete_feed(params);
        break;
      }
      case "delete_song": {
        const songId = params.song_id || params.songId || params.id;
        if (!songId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'song_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.delete_song(params);
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada server Mureka.",
        result: response?.result || null,
        state: response?.state || null
      });
    }

    return res.status(200).json({
      action,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));