import axios from "axios";
class NanoBanana {
  constructor() {
    this.url = "https://dydkrpmnafsnivjxmipj.supabase.co";
    this.key = "sb_publishable_W_1Ofv9769iYEEn9dfyAHQ_OhuCER6g";
  }
  _enc(s = {}) {
    try {
      return Buffer.from(JSON.stringify(s), "utf8").toString("base64");
    } catch (e) {
      console.error("[ERR_ENC]", e.message);
      return null;
    }
  }
  _dec(b64 = "") {
    try {
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch (e) {
      console.error("[ERR_DEC]", e.message);
      return {};
    }
  }
  _ok(s, ext = {}) {
    return {
      status: true,
      result: ext.result ?? null,
      state: this._enc(s),
      isPoll: s.isPoll || false,
      id: s.id || null,
      mode: s.mode || null,
      userId: s.auth?.userId || null,
      ...Object.fromEntries(Object.entries(ext).filter(([k]) => k !== "result"))
    };
  }
  _err(msg, s = {}) {
    return {
      status: false,
      error: msg,
      result: null,
      state: this._enc(s),
      isPoll: s.isPoll || false,
      id: s.id || null,
      mode: s.mode || null
    };
  }
  async _req(m, path, data = null, at = null) {
    try {
      console.log(`[HTTP] ${m.toUpperCase()} -> ${path}`);
      const h = {
        "User-Agent": "Dart/3.9 (dart:io)",
        "Accept-Encoding": "gzip",
        "x-supabase-client-platform": "android",
        "x-client-info": "supabase-flutter/2.10.3",
        "Content-Type": "application/json; charset=utf-8",
        apikey: this.key,
        "x-supabase-api-version": "2024-01-01"
      };
      if (at) h["Authorization"] = `Bearer ${at}`;
      const res = await axios({
        method: m,
        url: `${this.url}${path}`,
        data: data,
        headers: h,
        validateStatus: () => true
      });
      return {
        ok: true,
        status: res.status,
        data: res?.data || null
      };
    } catch (e) {
      console.error(`[ERR_HTTP] ${path}:`, e.message);
      return {
        ok: false,
        status: 500,
        error: e.message,
        data: null
      };
    }
  }
  async _auth(auth = {}) {
    try {
      if (!auth.accessToken) {
        console.log("[AUTH] Sign Up Anon Session...");
        const r = await this._req("POST", "/auth/v1/signup", {
          gotrue_meta_security: {}
        });
        if (!r.ok || r.status >= 400) return false;
        auth.accessToken = r.data?.access_token || null;
        auth.refreshToken = r.data?.refresh_token || null;
        auth.userId = r.data?.user?.id || null;
        return !!auth.accessToken;
      }
      console.log("[AUTH] Refreshing Token...");
      const r = await this._req("POST", `/auth/v1/token?grant_type=refresh_token`, {
        refresh_token: auth.refreshToken
      });
      if (r.ok && r.status < 400) {
        auth.accessToken = r.data?.access_token || null;
        auth.refreshToken = r.data?.refresh_token || null;
        return !!auth.accessToken;
      }
      return await this._auth({
        ...auth,
        accessToken: null
      });
    } catch (e) {
      console.error("[ERR_AUTH]", e.message);
      return false;
    }
  }
  async _me(auth = {}) {
    try {
      if (!auth.accessToken) return null;
      const r = await this._req("GET", "/auth/v1/user", null, auth.accessToken);
      return r.ok && r.status < 400 ? r.data : null;
    } catch (e) {
      console.error("[ERR_ME]", e.message);
      return null;
    }
  }
  async _edge(fn, body, auth = {}) {
    try {
      console.log(`[EDGE] Call Function: ${fn}`);
      const r = await this._req("POST", `/functions/v1/${fn}`, body, auth.accessToken);
      if (!r.ok || r.status === 400) return {
        ok: false,
        error: r.data?.error || `HTTP ${r.status}`
      };
      if (r.data?.error) return {
        ok: false,
        error: r.data.error
      };
      return {
        ok: true,
        ...r.data
      };
    } catch (e) {
      console.error(`[ERR_EDGE] ${fn}:`, e.message);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  async _chk(s = {}) {
    try {
      console.log(`[CHECK] Job: ${s.id} | Mode: ${s.mode}`);
      const r = await this._req("GET", `/rest/v1/editing_jobs?id=eq.${s.id}&select=*`, null, s.auth.accessToken);
      const job = r.data?.[0] || null;
      const status = job?.status || "unknown";
      console.log(`[CHECK] Status: [${status}]`);
      if (status === "completed") return this._ok(s, {
        jobStatus: status,
        result: job
      });
      if (["failed", "cancelled"].includes(status)) return this._err(`Job ${status}`, s);
      return this._ok(s, {
        jobStatus: status,
        pending: true
      });
    } catch (e) {
      console.error("[ERR_CHECK]", e.message);
      return this._err(e.message, s);
    }
  }
  async _poll(s = {}) {
    try {
      const MAX = 25,
        WAIT = 3e3;
      let cyc = 0;
      console.log(`[POLL] Job: ${s.id} | Mode: ${s.mode} (Max ${MAX}x)`);
      while (cyc < MAX) {
        await new Promise(r => setTimeout(r, WAIT));
        cyc++;
        const r = await this._req("GET", `/rest/v1/editing_jobs?id=eq.${s.id}&select=*`, null, s.auth.accessToken);
        const job = r.data?.[0] || null;
        const status = job?.status || "unknown";
        console.log(`[POLL] Cycle ${cyc}/${MAX} -> [${status}]`);
        if (status === "completed") return this._ok(s, {
          jobStatus: status,
          result: job
        });
        if (["failed", "cancelled"].includes(status)) return this._err(`Job ${status}`, s);
      }
      s.isPoll = true;
      console.warn("[POLL] Timeout reached. Handoff to manual checking.");
      return this._ok(s, {
        jobStatus: "pending",
        pending: true
      });
    } catch (e) {
      console.error("[ERR_POLL]", e.message);
      return this._err(e.message, s);
    }
  }
  async _upRefs(refs) {
    try {
      console.log(`[PROCESS] Processing ${refs.length} ref(s) to Base64 data...`);
      const processedRefs = [];
      for (const ref of refs) {
        const p = await this._parse(ref);
        if (!p) continue;
        processedRefs.push({
          base64: p.base64,
          mimeType: p.mime
        });
      }
      return processedRefs;
    } catch (e) {
      console.error("[ERR_PROCESS_REFS]", e.message);
      return [];
    }
  }
  async _parse(src) {
    try {
      if (!src) return null;
      let buf, mime = "image/jpeg";
      if (Buffer.isBuffer(src)) {
        buf = src;
      } else if (typeof src === "string" && src.startsWith("http")) {
        console.log(`[MEDIA] Fetching remote URL: ${src.substring(0, 40)}...`);
        const res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res?.data);
        mime = res?.headers?.["content-type"] || mime;
      } else if (typeof src === "string" && src.includes("base64,")) {
        const parts = src.split("base64,");
        mime = parts[0].match(/data:(.*?);/)?.[1] || mime;
        buf = Buffer.from(parts[1], "base64");
      } else if (typeof src === "string") {
        buf = Buffer.from(src, "base64");
      }
      if (!buf) return null;
      if (buf[0] === 137 && buf[1] === 80) mime = "image/png";
      else if (buf[0] === 255 && buf[1] === 216) mime = "image/jpeg";
      else if (buf[0] === 71 && buf[1] === 73) mime = "image/gif";
      else if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70) mime = "image/webp";
      return {
        base64: buf.toString("base64"),
        mime: mime,
        buffer: buf
      };
    } catch (e) {
      console.error("[ERR_PARSE]", e.message);
      return null;
    }
  }
  async generate({
    state: stateIn = {},
    mode,
    prompt,
    image,
    ...rest
  }) {
    try {
      const raw = typeof stateIn === "string" ? this._dec(stateIn) : stateIn;
      const s = {
        isPoll: raw.isPoll ?? false,
        id: raw.id ?? null,
        mode: raw.mode ?? mode ?? "image",
        auth: raw.auth ?? {}
      };
      console.log(`[RUN] Job active: ${s.isPoll} | Mode: ${s.mode} | ID: ${s.id || "none"}`);
      if (s.isPoll && !prompt) {
        if (!s.id) return this._err("isPoll=true but missing job id", s);
        return await this._chk(s);
      }
      const authed = await this._auth(s.auth);
      if (!authed) return this._err("Authentication failed", s);
      const user = await this._me(s.auth);
      if (!user) return this._err("Failed to fetch user session", s);
      s.auth.userId = user.id;
      if (rest?.referenceImages?.length) {
        rest.referenceImages = await this._upRefs(rest.referenceImages);
      }
      const media = image ? await this._parse(image) : null;
      switch (s.mode) {
        case "image": {
          if (!media) {
            console.log("[ENGINE] Route -> T2I");
            const res = await this._edge("generate-image", {
              prompt: prompt,
              model: rest?.model || "flux",
              ...rest
            }, s.auth);
            if (!res.ok) return this._err(res.error || "T2I call failed", s);
            if (res.image) return this._ok(s, {
              result: res.image,
              jobStatus: "completed"
            });
            if (res.job_id) {
              s.id = res.job_id;
              return await this._poll(s);
            }
            return this._err("T2I response invalid", s);
          }
          console.log("[ENGINE] Route -> I2I");
          const res = await this._edge("edit-image-v4", {
            image: media.base64,
            mimeType: media.mime,
            prompt: prompt,
            model: rest?.model || "flux",
            referenceImages: rest?.referenceImages || [],
            chatSessionId: rest?.chatSessionId
          }, s.auth);
          if (!res.ok) return this._err(res.error || "I2I call failed", s);
          if (!res.job_id) return this._err("I2I missing job_id", s);
          s.id = res.job_id;
          return await this._poll(s);
        }
        case "video": {
          console.log(`[ENGINE] Route -> ${!media ? "T2V" : "I2V"}`);
          const body = {
            prompt: prompt,
            ...rest
          };
          if (media) {
            body.input_image_base64 = media.base64;
            body.mimeType = media.mime;
          }
          const res = await this._edge("generate-video", body, s.auth);
          if (!res.ok) return this._err(res.error || "Video call failed", s);
          if (!res.job_id) return this._err("Video missing job_id", s);
          s.id = res.job_id;
          return await this._poll(s);
        }
        default:
          return this._err(`Unsupported mode: "${s.mode}"`, s);
      }
    } catch (e) {
      console.error("[ERR_RUNNER_FATAL]", e.message);
      return {
        status: false,
        error: `Fatal: ${e.message}`,
        result: null
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
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}