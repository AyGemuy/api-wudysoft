import axios from "axios";
import FormData from "form-data";
const APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d21semtqaGp2dmlmYmhwbWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NDgxMzMsImV4cCI6MjEwMzEyNDEzM30.X8FE2J_aCqpmOTC4EZd5goR0Wxp4xrNC0eufgbR9nCc";
const URL_BASE = "https://huwmlzkjhjvvifbhpmhr.supabase.co";
const FN_BASE = "/functions/v1/fish-audio-proxy";
const DEFAULT_VOICE_ID = "5196af35f6ff4a0dbf541793fc9f2157";
class VocalisRepo {
  constructor({
    token = null,
    uid = null,
    defaultVoiceId = DEFAULT_VOICE_ID
  } = {}) {
    this.url = URL_BASE;
    this.apikey = APIKEY;
    this.token = token;
    this.uid = uid;
    this.defaultVoiceId = defaultVoiceId;
    this.http = axios.create({
      baseURL: this.url,
      timeout: 6e4
    });
  }
  h(extra = {}) {
    const bearer = this.token || this.apikey;
    return {
      apikey: this.apikey,
      Authorization: `Bearer ${bearer}`,
      ...extra
    };
  }
  async ensureAuth() {
    if (!this.token) {
      const auth = await this.snk();
      if (!auth?.result?.token) {
        return {
          status: auth?.status || 401,
          result: "auth_failed: Gagal login anonim"
        };
      }
      if (this.uid) {
        await this.bonus({
          uid: this.uid
        }).catch(() => null);
      }
    }
    return {
      status: 200,
      result: "ok"
    };
  }
  mt(name = "") {
    const ext = (name.split("?")[0].split(".").pop() || "").toLowerCase();
    return {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      flac: "audio/flac",
      m4a: "audio/mp4",
      aac: "audio/aac",
      ogg: "audio/ogg"
    } [ext] || "audio/mpeg";
  }
  perr(e, label = "") {
    const status = e?.response?.status || 500;
    const body = e?.response?.data;
    const result = body?.error || body || e?.message || "unknown_error";
    return {
      status: status,
      result: result
    };
  }
  async aud(src = "") {
    if (!src) return {
      ok: false,
      error: "audio_is_required"
    };
    if (Buffer.isBuffer(src)) {
      return {
        ok: true,
        buffer: src,
        filename: "audio.wav",
        contentType: this.mt("audio.wav")
      };
    }
    if (src instanceof Uint8Array) {
      return {
        ok: true,
        buffer: Buffer.from(src),
        filename: "audio.wav",
        contentType: this.mt("audio.wav")
      };
    }
    if (typeof src !== "string") {
      return {
        ok: false,
        error: "invalid_audio_type: Audio harus berupa String/Buffer"
      };
    }
    if (src.startsWith("data:")) {
      const m = src.match(/^data:([^;]+);base64,(.+)$/s);
      if (!m) return {
        ok: false,
        error: "invalid_data_url"
      };
      const [, ct, b64] = m;
      const ext = (ct.split("/").pop() || "mp3").split(";")[0];
      return {
        ok: true,
        buffer: Buffer.from(b64, "base64"),
        filename: `audio.${ext}`,
        contentType: ct
      };
    }
    if (/^https?:\/\//i.test(src)) {
      try {
        const r = await axios.get(src, {
          responseType: "arraybuffer",
          timeout: 6e4,
          validateStatus: () => true
        });
        if (r.status < 200 || r.status >= 300) {
          return {
            ok: false,
            error: `audio_fetch_failed: status ${r.status}`
          };
        }
        const ct = (r.headers?.["content-type"] || "audio/mpeg").split(";")[0].trim();
        const ext = (ct.split("/").pop() || "mp3").trim();
        const name = (src.split("?")[0].split("/").pop() || "").trim();
        const filename = name && name.includes(".") ? name : `audio.${ext}`;
        return {
          ok: true,
          buffer: Buffer.from(r.data),
          filename: filename,
          contentType: ct
        };
      } catch (e) {
        return {
          ok: false,
          error: `audio_download_error: ${e.message}`
        };
      }
    }
    try {
      const buffer = Buffer.from(src, "base64");
      if (!buffer.length) return {
        ok: false,
        error: "invalid_base64_empty"
      };
      return {
        ok: true,
        buffer: buffer,
        filename: "audio.wav",
        contentType: this.mt("audio.wav")
      };
    } catch {
      return {
        ok: false,
        error: "invalid_base64_format"
      };
    }
  }
  async search(params = {}) {
    return this.searchVoiceLibrary(params);
  }
  async generate(params = {}) {
    return this.generateVoiceAudio(params);
  }
  async searchVoiceLibrary({
    query,
    language,
    pageNumber = 1,
    pageSize = 20,
    ...rest
  } = {}) {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    try {
      const params = {
        page_size: pageSize,
        page_number: pageNumber,
        sort_by: "task_count",
        ...rest
      };
      if (query?.trim()) params.title = query.trim();
      if (language?.trim()) params.language = language.trim();
      const r = await this.http.get(`${FN_BASE}/voices`, {
        params: params,
        headers: this.h()
      });
      return {
        status: r.status,
        result: r.data
      };
    } catch (e) {
      return this.perr(e, "search");
    }
  }
  async generateVoiceAudio({
    text = "",
    referenceId,
    options = {},
    ...rest
  } = {}) {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    if (!text || typeof text !== "string" || !text.trim()) {
      return {
        status: 400,
        result: "text is required"
      };
    }
    const finalReferenceId = referenceId || this.defaultVoiceId;
    try {
      const body = {
        text: text.trim(),
        referenceId: finalReferenceId,
        ...options,
        ...rest
      };
      const r = await this.http.post(`${FN_BASE}/`, body, {
        headers: this.h({
          "Content-Type": "application/json"
        }),
        responseType: "arraybuffer",
        validateStatus: () => true
      });
      if (r.status >= 200 && r.status < 300) {
        const buf = Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data);
        const contentType = (r.headers?.["content-type"] || "audio/mpeg").split(";")[0].trim();
        return {
          status: r.status,
          buffer: buf,
          contentType: contentType
        };
      }
      const raw = Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data || "");
      let err = "unknown_error";
      try {
        err = JSON.parse(raw.toString("utf8"))?.error || "unknown_error";
      } catch {}
      return {
        status: r.status,
        result: err
      };
    } catch (e) {
      return this.perr(e, "generate");
    }
  }
  async generateVoiceAudioFromReference({
    audio,
    transcript = "",
    text = "",
    options = {},
    ...rest
  } = {}) {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    if (!audio) return {
      status: 400,
      result: "audio is required"
    };
    if (!text || typeof text !== "string" || !text.trim()) {
      return {
        status: 400,
        result: "text is required"
      };
    }
    const audioRes = await this.aud(audio);
    if (!audioRes.ok) return {
      status: 400,
      result: audioRes.error
    };
    try {
      const {
        buffer,
        filename,
        contentType
      } = audioRes;
      const f = new FormData();
      f.append("transcript", transcript);
      f.append("text", text.trim());
      f.append("optionsJson", JSON.stringify(options));
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== null) f.append(k, String(v));
      }
      f.append("file", buffer, {
        filename: filename,
        contentType: contentType
      });
      const r = await this.http.post(`${FN_BASE}/clone`, f, {
        headers: {
          ...this.h(),
          ...f.getHeaders()
        },
        responseType: "arraybuffer",
        maxBodyLength: Infinity,
        validateStatus: () => true
      });
      if (r.status >= 200 && r.status < 300) {
        const buf = Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data);
        const resContentType = (r.headers?.["content-type"] || "audio/mpeg").split(";")[0].trim();
        return {
          status: r.status,
          buffer: buf,
          contentType: resContentType
        };
      }
      const raw = Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data || "");
      let err = "unknown_error";
      try {
        err = JSON.parse(raw.toString("utf8"))?.error || "unknown_error";
      } catch {}
      return {
        status: r.status,
        result: err
      };
    } catch (e) {
      return this.perr(e, "clone");
    }
  }
  async transcribeAudioFile({
    audio,
    ...rest
  } = {}) {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    if (!audio) return {
      status: 400,
      result: "audio is required"
    };
    const audioRes = await this.aud(audio);
    if (!audioRes.ok) return {
      status: 400,
      result: audioRes.error
    };
    try {
      const {
        buffer,
        filename,
        contentType
      } = audioRes;
      const f = new FormData();
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== null) f.append(k, String(v));
      }
      f.append("file", buffer, {
        filename: filename,
        contentType: contentType
      });
      const r = await this.http.post(`${FN_BASE}/transcribe`, f, {
        headers: {
          ...this.h(),
          ...f.getHeaders()
        },
        maxBodyLength: Infinity
      });
      return {
        status: r.status,
        result: r.data
      };
    } catch (e) {
      return this.perr(e, "transcribe");
    }
  }
  async langs() {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    try {
      const r = await this.http.get(`${FN_BASE}/languages`, {
        headers: this.h()
      });
      return {
        status: r.status,
        result: r.data?.languages || []
      };
    } catch (e) {
      return this.perr(e, "langs");
    }
  }
  async snk() {
    try {
      const r = await this.http.post("/auth/v1/signup", {}, {
        headers: {
          apikey: this.apikey,
          Authorization: `Bearer ${this.apikey}`,
          "Content-Type": "application/json"
        }
      });
      const token = r.data?.access_token || r.data?.session?.access_token || "";
      const uid = r.data?.user?.id || null;
      if (token) this.token = token;
      if (uid) this.uid = uid;
      return {
        status: r.status,
        result: {
          token: token,
          user: r.data?.user || null
        }
      };
    } catch (e) {
      return this.perr(e, "snk");
    }
  }
  async stats({
    uid
  } = {}) {
    const targetUid = uid || this.uid;
    if (!targetUid) return {
      status: 400,
      result: "uid is required"
    };
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    try {
      const r = await this.http.get("/rest/v1/user_stats", {
        params: {
          select: "*",
          id: `eq.${targetUid}`
        },
        headers: this.h({
          Accept: "application/vnd.pgrst.object+json"
        }),
        validateStatus: () => true
      });
      if (r.status === 200) return {
        status: r.status,
        result: r.data
      };
      return {
        status: r.status,
        result: r.data
      };
    } catch (e) {
      return this.perr(e, "stats");
    }
  }
  async bonus({
    uid,
    dailyGenerationsUsed = 0,
    dailyBonusGenerations = 1,
    dailyGenerationsDate = new Date().toISOString().slice(0, 10)
  } = {}) {
    const targetUid = uid || this.uid;
    if (!targetUid) return {
      status: 400,
      result: "uid is required"
    };
    try {
      const body = {
        dailyGenerationsUsed: dailyGenerationsUsed,
        dailyBonusGenerations: dailyBonusGenerations,
        dailyGenerationsDate: dailyGenerationsDate
      };
      const r = await this.http.patch(`/rest/v1/user_stats?id=eq.${targetUid}`, body, {
        headers: this.h({
          "Content-Type": "application/json"
        })
      });
      return {
        status: r.status,
        result: r.data ?? null
      };
    } catch (e) {
      return this.perr(e, "bonus");
    }
  }
  async credits({
    amount = 30
  } = {}) {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    try {
      const r = await this.http.post("/rest/v1/rpc/spend_credits", {
        p_amount: amount
      }, {
        headers: this.h({
          "Content-Type": "application/json"
        })
      });
      return {
        status: r.status,
        result: r.data
      };
    } catch (e) {
      return this.perr(e, "credits");
    }
  }
  async spend({
    credit = 1,
    today = new Date().toISOString().slice(0, 10)
  } = {}) {
    const authCheck = await this.ensureAuth();
    if (authCheck.status !== 200) return authCheck;
    try {
      const r = await this.http.post("/rest/v1/rpc/record_generation_spend", {
        p_credit_amount: credit,
        p_today: today
      }, {
        headers: this.h({
          "Content-Type": "application/json"
        })
      });
      return {
        status: r.status,
        result: r.data
      };
    } catch (e) {
      return this.perr(e, "spend");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["search", "generate", "clone", "transcribe", "languages", "stats", "bonus", "credits", "spend"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&q=trump&page=1&page_size=5",
          generate: "/?action=generate&text=Hello+America&voice_id=5196af35f6ff4a0dbf541793fc9f2157",
          clone: "/?action=clone&audio=https://domain.com/sample.mp3&text=Contoh+kloning+suara",
          transcribe: "/?action=transcribe&audio=https://domain.com/sample.mp3",
          languages: "/?action=languages",
          stats: "/?action=stats&uid=77f6de5e-0943-4fe1-a9ba-eac1881f16fc",
          bonus: "/?action=bonus&uid=77f6de5e-0943-4fe1-a9ba-eac1881f16fc",
          credits: "/?action=credits&amount=30",
          spend: "/?action=spend&credit=1"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new VocalisRepo({
    token: params.token || null,
    uid: params.uid || null,
    defaultVoiceId: params.voice_id || params.referenceId || DEFAULT_VOICE_ID
  });
  try {
    let response;
    switch (action) {
      case "search": {
        const query = params.q || params.query || params.title || "";
        response = await api.search({
          query: query,
          language: params.language || params.lang,
          pageNumber: Number(params.page || params.page_number || 1),
          pageSize: Number(params.page_size || params.pageSize || 20),
          ...params
        });
        break;
      }
      case "generate": {
        const text = params.text || params.prompt || "";
        if (!text.trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk generate audio."
          });
        }
        const voice_id = params.voice_id || params.reference_id || params.referenceId || DEFAULT_VOICE_ID;
        response = await api.generate({
          text: text,
          referenceId: voice_id,
          options: params.options || {}
        });
        if (response.status === 200 && response.buffer) {
          if (params.format === "json" || params.as_base64 === "true" || params.as_base64 === true) {
            return res.status(200).json({
              status: true,
              action: action,
              voice_id: voice_id,
              contentType: response.contentType || "audio/mpeg",
              base64: response.buffer.toString("base64")
            });
          }
          res.setHeader("Content-Type", response.contentType || "audio/mpeg");
          res.setHeader("Content-Length", response.buffer.length);
          res.setHeader("Content-Disposition", 'inline; filename="generated_voice.mp3"');
          return res.send(response.buffer);
        }
        break;
      }
      case "clone": {
        const audio = params.audio || params.file;
        const text = params.text || "";
        if (!audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' (URL/Base64) wajib diisi untuk clone."
          });
        }
        if (!text.trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk clone."
          });
        }
        response = await api.generateVoiceAudioFromReference({
          audio: audio,
          text: text,
          transcript: params.transcript || "",
          options: params.options || {}
        });
        if (response.status === 200 && response.buffer) {
          if (params.format === "json" || params.as_base64 === "true" || params.as_base64 === true) {
            return res.status(200).json({
              status: true,
              action: action,
              contentType: response.contentType || "audio/mpeg",
              base64: response.buffer.toString("base64")
            });
          }
          res.setHeader("Content-Type", response.contentType || "audio/mpeg");
          res.setHeader("Content-Length", response.buffer.length);
          res.setHeader("Content-Disposition", 'inline; filename="cloned_voice.mp3"');
          return res.send(response.buffer);
        }
        break;
      }
      case "transcribe": {
        const audio = params.audio || params.file;
        if (!audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' (URL/Base64) wajib diisi untuk transcribe."
          });
        }
        response = await api.transcribeAudioFile({
          audio: audio,
          ...params
        });
        break;
      }
      case "languages": {
        response = await api.langs();
        break;
      }
      case "stats": {
        const uid = params.uid || params.id;
        if (!uid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uid' wajib diisi."
          });
        }
        response = await api.stats({
          uid: uid
        });
        break;
      }
      case "bonus": {
        const uid = params.uid || params.id;
        if (!uid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uid' wajib diisi."
          });
        }
        response = await api.bonus({
          uid: uid,
          dailyBonusGenerations: Number(params.dailyBonusGenerations || 1)
        });
        break;
      }
      case "credits": {
        const amount = Number(params.amount || 30);
        response = await api.credits({
          amount: amount
        });
        break;
      }
      case "spend": {
        const credit = Number(params.credit || 1);
        const today = params.today || new Date().toISOString().slice(0, 10);
        response = await api.spend({
          credit: credit,
          today: today
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || response.status && response.status >= 400) {
      return res.status(response?.status || 502).json({
        status: false,
        action: action,
        error: response?.result || "Gagal memproses request pada layanan server target."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: response?.result !== undefined ? response.result : response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}