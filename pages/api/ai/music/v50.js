import axios from "axios";
import crypto from "crypto";
class SomioAI {
  constructor() {
    try {
      this.base = "https://somio.1010diy.com";
      this.token = "";
      this.did = "";
      this.lastId = null;
      this.usr = {};
      this.http = axios.create({
        baseURL: this.base,
        timeout: 6e4
      });
    } catch (err) {
      console.error("[ERR] Init error:", err?.message);
    }
  }
  _enc(d = {}) {
    try {
      return Buffer.from(JSON.stringify(d)).toString("base64");
    } catch (err) {
      console.error("[ERR] _enc error:", err?.message);
      return "";
    }
  }
  _dec(s = "") {
    try {
      if (!s || typeof s !== "string") return null;
      return JSON.parse(Buffer.from(s, "base64").toString("utf-8"));
    } catch (err) {
      console.error("[ERR] _dec error:", err?.message);
      return null;
    }
  }
  _did() {
    try {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    } catch (err) {
      console.error("[ERR] _did error:", err?.message);
      return "0666b2e8da418dfa";
    }
  }
  _hdr(c = {}) {
    try {
      return {
        "User-Agent": "okhttp/4.11.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-device-id": this.did,
        "x-version-code": "53",
        "x-token": this.token || "",
        "x-platform": "android",
        "x-site": "27",
        "x-product": "1",
        "x-lang": "id",
        ...c
      };
    } catch (err) {
      console.error("[ERR] _hdr error:", err?.message);
      return c;
    }
  }
  _bld() {
    try {
      return this._enc({
        token: this.token || "",
        did: this.did,
        lastId: this.lastId,
        usr: this.usr,
        ts: Date.now()
      });
    } catch (err) {
      console.error("[ERR] _bld error:", err?.message);
      return "";
    }
  }
  async _cMail(email) {
    try {
      const res = await this.http.post(`/and/checkEmail?email=${encodeURIComponent(email)}`, {}, {
        headers: this._hdr()
      });
      return res.data;
    } catch (err) {
      console.error("[ERR] _cMail error:", err?.message);
      return null;
    }
  }
  async _uInfo(name) {
    try {
      if (!name) return null;
      const res = await this.http.post(`/and/updateUserInfo?username=${encodeURIComponent(name)}`, {}, {
        headers: this._hdr()
      });
      return res.data;
    } catch (err) {
      console.error("[ERR] _uInfo error:", err?.message);
      return null;
    }
  }
  async _reg(cEmail = null, cPass = null) {
    try {
      console.log("[LOG] Melakukan registrasi akun baru Somio...");
      const rStr = crypto.randomBytes(4).toString("hex");
      const email = cEmail || `user_${Date.now()}_${rStr}@mail.com`;
      const pass = cPass || `Pass_${rStr}!`;
      await this._cMail(email);
      const res = await this.http.post(`/and/register?email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}&purchase_token=`, {}, {
        headers: this._hdr()
      });
      if (res.data?.code === 200 && res.data?.data?.token) {
        this.token = res.data.data.token;
        this.usr = {
          email: email,
          username: res.data.data.username || ""
        };
        if (res.data.data.username) await this._uInfo(res.data.data.username);
        console.log(`[LOG] Registrasi sukses. Token: ${this.token}`);
        return this.token;
      }
      throw new Error(res.data?.msg || "Gagal registrasi");
    } catch (err) {
      console.error("[ERR] _reg error:", err?.message);
      throw err;
    }
  }
  async _ens(session) {
    try {
      if (session) {
        const p = this._dec(session);
        if (p?.token && p?.did) {
          this.token = p.token;
          this.did = p.did;
          this.lastId = p.lastId || null;
          this.usr = p.usr || {};
          return this._bld();
        }
      }
      this.did = this._did();
      await this._reg();
      return this._bld();
    } catch (err) {
      console.error("[ERR] _ens error, mencoba register ulang:", err?.message);
      this.did = this._did();
      await this._reg();
      return this._bld();
    }
  }
  async _req(fn) {
    try {
      return await fn();
    } catch (err) {
      console.warn("[WARN] Request gagal, fallback auto-register:", err?.message);
      try {
        await this._reg();
        return await fn();
      } catch (e) {
        console.error("[ERR] Request tetap gagal setelah auto-register:", e?.message);
        throw e;
      }
    }
  }
  _fmt(c = {}) {
    try {
      return {
        genre: Array.isArray(c.genre) ? c.genre : ["Pop"],
        instruments: Array.isArray(c.instruments) ? c.instruments : ["Acoustic Guitar"],
        mood: Array.isArray(c.mood) ? c.mood : ["Happy"],
        tempo: Array.isArray(c.tempo) ? c.tempo : ["Medium"]
      };
    } catch (err) {
      console.error("[ERR] _fmt error:", err?.message);
      return {
        genre: ["Pop"],
        instruments: ["Acoustic Guitar"],
        mood: ["Happy"],
        tempo: ["Medium"]
      };
    }
  }
  async register({
    session,
    email,
    password
  } = {}) {
    try {
      this.did = this._did();
      await this._reg(email, password);
      return {
        status: true,
        result: {
          token: this.token,
          email: this.usr.email,
          username: this.usr.username
        },
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] register error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async userInfo({
    session
  } = {}) {
    try {
      await this._ens(session);
      const data = await this._req(async () => {
        const res = await this.http.get("/and/getUserInfo?refresh=0", {
          headers: this._hdr()
        });
        if (res.data?.code !== 200) throw new Error(res.data?.msg || "Gagal mengambil user info");
        return res.data?.data || res.data;
      });
      return {
        status: true,
        result: data,
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] userInfo error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async credits({
    session
  } = {}) {
    try {
      await this._ens(session);
      const data = await this._req(async () => {
        const res = await this.http.get("/and/getUserActualCredits", {
          headers: this._hdr()
        });
        if (res.data?.code !== 200) throw new Error(res.data?.msg || "Gagal mengambil credits");
        return res.data?.data || res.data;
      });
      return {
        status: true,
        result: data,
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] credits error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async models({
    session
  } = {}) {
    try {
      await this._ens(session);
      const res = await this.http.get("/and/modelList", {
        headers: this._hdr()
      });
      return {
        status: true,
        result: res.data?.data || [],
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] models error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async options({
    session
  } = {}) {
    try {
      await this._ens(session);
      const res = await this.http.get("/home/musicOptions", {
        headers: this._hdr()
      });
      return {
        status: true,
        result: res.data?.data || {},
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] options error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async lyrics({
    session,
    prompt = "cute lofi song",
    ...rest
  } = {}) {
    try {
      await this._ens(session);
      const data = await this._req(async () => {
        const res = await this.http.post("/gemini/vertexGenerate", {
          prompt: prompt || rest?.text || "cute lofi song",
          template: "prompt_lyric_generation_optimized_limit"
        }, {
          headers: this._hdr()
        });
        if (res.data?.code !== 200) throw new Error(res.data?.msg || "Gagal generate lirik");
        return res.data?.data || res.data;
      });
      return {
        status: true,
        result: {
          title: data?.title || null,
          lyrics: data?.lyrics || null,
          genres: data?.genre_choice || null,
          moods: data?.mood_choice || null
        },
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] lyrics error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async create({
    session,
    prompt = "",
    lyrics = "",
    songName = "",
    modelKey = "suno_v35",
    musicStyle = "",
    choices = {},
    vocalStyle = [],
    voiceType = "",
    songType = "",
    aiLang = "",
    ...rest
  } = {}) {
    try {
      await this._ens(session);
      const pLyrics = lyrics || rest?.text || "";
      const isLyr = Boolean(pLyrics && pLyrics.trim().length > 0);
      const modName = isLyr ? "Lyrics" : "Text(Prompt)";
      const fmtChc = this._fmt(choices);
      const style = musicStyle || rest?.style || [...fmtChc.genre, ...fmtChc.mood, ...fmtChc.instruments, ...fmtChc.tempo].join(", ");
      const payload = {
        ai_lang: aiLang,
        api_platform: "suno",
        choices: fmtChc,
        lyrics: pLyrics,
        model_key: modelKey || rest?.model || "suno_v35",
        module_name: modName,
        music_style: style,
        prompt: prompt || rest?.theme || (isLyr ? "" : style),
        song_name: songName || rest?.title || (isLyr ? "Untitled Track" : ""),
        song_type: songType,
        vocal_style: vocalStyle,
        voice_type: voiceType
      };
      const data = await this._req(async () => {
        const res = await this.http.post("/music/v2/MusicAI", payload, {
          headers: this._hdr()
        });
        if (res.data?.code !== 200 || !res.data?.data?.task_id) throw new Error(res.data?.msg || "Gagal membuat lagu");
        return res.data.data;
      });
      this.lastId = data.task_id;
      return {
        status: true,
        result: {
          taskId: data.task_id,
          mode: modName,
          status: "pending"
        },
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] create error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async status({
    session,
    taskId,
    id,
    ...rest
  } = {}) {
    try {
      await this._ens(session);
      const tId = taskId || id || rest?.task_id || this.lastId;
      if (!tId) throw new Error("Parameter 'taskId' wajib diisi.");
      const data = await this._req(async () => {
        const res = await this.http.get(`/music/getMoreTaskStatus?task_ids=${tId}`, {
          headers: this._hdr()
        });
        if (res.data?.code !== 200) throw new Error(res.data?.msg || "Gagal mengambil status");
        return res.data?.data || [];
      });
      const cur = data.find(i => i.task_id === tId) || data[0] || null;
      return {
        status: true,
        result: {
          taskId: tId,
          status: cur?.status || "pending",
          details: cur
        },
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] status error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
  async history({
    session,
    status = "complete",
    type = "song"
  } = {}) {
    try {
      await this._ens(session);
      const list = await this._req(async () => {
        const res = await this.http.get(`/and/data/generateList?status=${status}&type=${type}`, {
          headers: this._hdr()
        });
        if (res.data?.code !== 200) throw new Error(res.data?.msg || "Gagal mengambil riwayat lagu");
        return res.data?.data || [];
      });
      const formatted = list.map(s => ({
        id: s.id,
        taskId: s.task_id,
        title: s.title || s.song_name,
        duration: s.duration,
        audioUrl: s.conversion_path,
        coverUrl: s.album_cover_path,
        lyrics: s.lyrics,
        model: s.model || s.model_name,
        tags: s.tags,
        createdAt: s.created_at
      }));
      return {
        status: true,
        result: formatted,
        session: this._bld()
      };
    } catch (err) {
      console.error("[ERR] history error:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: this._bld()
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["register", "user", "credits", "models", "options", "lyrics", "create", "status", "history"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/api/somio?action=create&prompt=Happy acoustic pop"
      }
    });
  }
  const api = new SomioAI();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.register(params);
        break;
      case "user":
        response = await api.userInfo(params);
        break;
      case "credits":
        response = await api.credits(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "options":
        response = await api.options(params);
        break;
      case "lyrics":
        if (!params.prompt && !params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.lyrics(params);
        break;
      case "create":
        if (!params.prompt && !params.lyrics && !params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'lyrics' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        response = await api.status(params);
        break;
      case "history":
        response = await api.history(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === false) {
      return res.status(500).json({
        status: false,
        action: action,
        error: response.result?.error || "Gagal memproses request internal API.",
        session: response.session
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
      action: action,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}