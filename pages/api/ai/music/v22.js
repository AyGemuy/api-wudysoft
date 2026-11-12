import axios from "axios";
import crypto from "crypto";
class SunoraClient {
  constructor() {
    this.baseUrl = "https://api.sunora.mavtao.com/api";
    this.defHdrs = {
      "User-Agent": "Dart/3.4 (dart:io)",
      "Accept-Encoding": "gzip",
      version: "2.2.2",
      buildnumber: "105",
      platform: "android",
      "sentry-trace": "4348b9c43abb452294800a8aebdde3e1-15a0704eae464de2"
    };
  }
  _devId() {
    return crypto.randomBytes(8).toString("hex");
  }
  _enc(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  _dec(str) {
    return JSON.parse(Buffer.from(str, "base64").toString("utf8"));
  }
  _hdrs(stateObj) {
    const token = stateObj?.token || "";
    const userId = stateObj?.userId || "";
    const headers = {
      ...this.defHdrs
    };
    if (token) headers["x-auth"] = token;
    if (userId) {
      headers["baggage"] = `sentry-trace_id=4348b9c43abb452294800a8aebdde3e1,sentry-public_key=a43e6ad8a03eecf1f26c1720f9593f21,sentry-release=com.mavtao.ai.song.generator.maker.sunora%402.2.2%2B105,sentry-environment=production,sentry-user_id=${userId}`;
    }
    return headers;
  }
  _val(inputs) {
    for (const [key, value] of Object.entries(inputs)) {
      if (!value || typeof value === "string" && value.trim() === "") {
        return {
          status: false,
          error: `Missing required field: '${key}'`
        };
      }
    }
    return null;
  }
  async _autoState(state) {
    if (!state) {
      console.log("[Process] State missing, triggering auto auth init...");
      const auth = await this.initAuth();
      if (!auth.status) return {
        error: auth.error
      };
      return {
        tokenStr: auth.data,
        stateObj: this._dec(auth.data)
      };
    }
    return {
      tokenStr: state,
      stateObj: this._dec(state)
    };
  }
  async initAuth() {
    try {
      console.log("[Process] Initializing Auto Auth Flow...");
      const devId = this._devId();
      console.log(`[Process] Logging in with device_id: ${devId}`);
      const loginRes = await axios.post(`${this.baseUrl}/auth/login`, {
        device_id: devId
      }, {
        headers: this.defHdrs
      });
      const authData = loginRes?.data?.data || {};
      const stateObj = {
        token: authData.token || "",
        userId: authData.id || ""
      };
      console.log("[Process] Fetching current user profile...");
      await axios.get(`${this.baseUrl}/users/me`, {
        headers: this._hdrs(stateObj)
      });
      console.log("[Process] Fetching available task list...");
      const taskRes = await axios.get(`${this.baseUrl}/task/list`, {
        headers: this._hdrs(stateObj)
      });
      const tasks = taskRes?.data?.data || [];
      const targetTask = tasks.find(t => (t.identifier === "free_check_in" || t.name?.toLowerCase().includes("free")) && !t.claimed);
      if (targetTask?._id) {
        console.log(`[Process] Claiming free task reward for ID: ${targetTask._id}`);
        await axios.get(`${this.baseUrl}/task/claim_reward/${targetTask._id}`, {
          headers: this._hdrs(stateObj)
        });
      }
      return {
        status: true,
        data: this._enc(stateObj)
      };
    } catch (err) {
      console.error("[Error] InitAuth failed:", err?.response?.data || err?.message);
      return {
        status: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async generate({
    state,
    prompt,
    custom = true,
    description,
    ...rest
  } = {}) {
    const isCustom = custom === true || custom === "true";
    const errCheck = this._val(isCustom ? {
      prompt: prompt
    } : {
      description: description
    });
    if (errCheck) return errCheck;
    const session = await this._autoState(state);
    if (session.error) return {
      status: false,
      error: session.error
    };
    try {
      console.log("[Process] Generating music...");
      const headers = this._hdrs(session.stateObj);
      if (isCustom) {
        const payload = {
          continue_at: null,
          continue_clip_id: null,
          mv: null,
          prompt: prompt,
          tags: rest?.tags || "Calm, lyrical, emotional stage ballad",
          title: rest?.title || "Crown of Sadness",
          ...rest
        };
        const res = await axios.post(`${this.baseUrl}/music/custom_generate`, payload, {
          headers: headers
        });
        return {
          status: true,
          state: session.tokenStr,
          ...res?.data
        };
      } else {
        let mood = rest?.mood;
        let style = rest?.music_style;
        let title = rest?.title;
        if (!mood) {
          console.log("[Process] Mood missing, picking random from dict...");
          const moodRes = await axios.get(`${this.baseUrl}/data_dict/name/mood`, {
            headers: headers
          });
          const moods = moodRes?.data?.data || [];
          mood = moods.length > 0 ? moods[Math.floor(Math.random() * moods.length)]?.name : "Happy";
        }
        if (!style) {
          console.log("[Process] Style missing, picking random from dict...");
          const genreRes = await axios.get(`${this.baseUrl}/data_dict/name/genre`, {
            headers: headers
          });
          const genres = genreRes?.data?.data || [];
          style = genres.length > 0 ? genres[Math.floor(Math.random() * genres.length)]?.name : "Rock";
        }
        if (!title) {
          console.log("[Process] Title missing, picking random from dict...");
          const titleRes = await axios.get(`${this.baseUrl}/data_dict/name/random_title`, {
            headers: headers
          });
          const titles = titleRes?.data?.data || [];
          title = titles.length > 0 ? titles[Math.floor(Math.random() * titles.length)] : "Vivid Joy";
        }
        const payload = {
          continue_at: null,
          continue_clip_id: null,
          mv: null,
          description: description,
          title: title,
          mood: mood,
          key_word: rest?.key_word || "sad",
          gender_of_vocal: rest?.gender_of_vocal || "male",
          music_style: style,
          instrumental_only: rest?.instrumental_only || false,
          ...rest
        };
        const res = await axios.post(`${this.baseUrl}/music/advanced_custom_generate`, payload, {
          headers: headers
        });
        return {
          status: true,
          state: session.tokenStr,
          ...res?.data
        };
      }
    } catch (err) {
      console.error("[Error] Generate failed:", err?.response?.data || err?.message);
      return {
        status: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async status({
    state,
    ...rest
  } = {}) {
    const session = await this._autoState(state);
    if (session.error) return {
      status: false,
      error: session.error
    };
    try {
      console.log("[Process] Fetching music page status...");
      const params = {
        page: rest?.page || "1",
        pagesize: rest?.pagesize || "50",
        ...rest
      };
      const res = await axios.get(`${this.baseUrl}/music/music_page`, {
        headers: this._hdrs(session.stateObj),
        params: params
      });
      return {
        status: true,
        state: session.tokenStr,
        ...res?.data
      };
    } catch (err) {
      console.error("[Error] Status failed:", err?.response?.data || err?.message);
      return {
        status: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async gen_lyrics({
    state,
    description,
    ...rest
  } = {}) {
    const errCheck = this._val({
      description: description
    });
    if (errCheck) return errCheck;
    const session = await this._autoState(state);
    if (session.error) return {
      status: false,
      error: session.error
    };
    try {
      console.log("[Process] Generating lyrics...");
      const payload = {
        description: description,
        key_word: rest?.key_word || "sad",
        mood: rest?.mood || "Calm",
        ...rest
      };
      const res = await axios.post(`${this.baseUrl}/music/generate_lyrics`, payload, {
        headers: this._hdrs(session.stateObj)
      });
      return {
        status: true,
        state: session.tokenStr,
        ...res?.data
      };
    } catch (err) {
      console.error("[Error] GenLyrics failed:", err?.response?.data || err?.message);
      return {
        status: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async theme_list({
    state
  } = {}) {
    const session = await this._autoState(state);
    if (session.error) return {
      status: false,
      error: session.error
    };
    try {
      console.log("[Process] Fetching theme list...");
      const res = await axios.get(`${this.baseUrl}/theme/list`, {
        headers: this._hdrs(session.stateObj)
      });
      return {
        status: true,
        state: session.tokenStr,
        ...res?.data
      };
    } catch (err) {
      console.error("[Error] ThemeList failed:", err?.response?.data || err?.message);
      return {
        status: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async theme_gen({
    state,
    theme_id,
    ...rest
  } = {}) {
    const errCheck = this._val({
      theme_id: theme_id
    });
    if (errCheck) return errCheck;
    const session = await this._autoState(state);
    if (session.error) return {
      status: false,
      error: session.error
    };
    try {
      console.log("[Process] Generating theme...");
      const payload = {
        theme_id: theme_id,
        answer1: rest?.answer1 || "gooo",
        answer2: rest?.answer2 || "poor",
        answer3: rest?.answer3 || "nothing",
        ...rest
      };
      const res = await axios.post(`${this.baseUrl}/theme/generate`, payload, {
        headers: this._hdrs(session.stateObj)
      });
      return {
        status: true,
        state: session.tokenStr,
        ...res?.data
      };
    } catch (err) {
      console.error("[Error] ThemeGen failed:", err?.response?.data || err?.message);
      return {
        status: false,
        error: err?.response?.data || err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["init_auth", "generate", "status", "gen_lyrics", "theme_list", "theme_gen"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          init_auth: "/?action=init_auth",
          generate_custom: "/?action=generate&custom=true&prompt=lyrics_here",
          generate_advanced: "/?action=generate&custom=false&description=lofi+beats",
          status: "/?action=status&page=1&pagesize=50",
          gen_lyrics: "/?action=gen_lyrics&description=song_theme",
          theme_list: "/?action=theme_list",
          theme_gen: "/?action=theme_gen&theme_id=ID_TEMA"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new SunoraClient();
  try {
    let response;
    switch (action) {
      case "init_auth":
        response = await api.initAuth();
        break;
      case "generate": {
        const isCustom = params.custom === true || params.custom === "true";
        if (isCustom && (!params.prompt || params.prompt.trim() === "")) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk mode custom generate."
          });
        }
        if (!isCustom && (!params.description || params.description.trim() === "")) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'description' wajib diisi untuk mode advanced/normal generate."
          });
        }
        response = await api.generate(params);
        break;
      }
      case "status":
        response = await api.status(params);
        break;
      case "gen_lyrics":
        if (!params.description || params.description.trim() === "") {
          return res.status(400).json({
            status: false,
            error: "Parameter 'description' wajib diisi untuk action 'gen_lyrics'."
          });
        }
        response = await api.gen_lyrics(params);
        break;
      case "theme_list":
        response = await api.theme_list(params);
        break;
      case "theme_gen":
        if (!params.theme_id || params.theme_id.trim() === "") {
          return res.status(400).json({
            status: false,
            error: "Parameter 'theme_id' wajib diisi untuk action 'theme_gen'."
          });
        }
        response = await api.theme_gen(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server Sunora. Coba lagi nanti."
      });
    }
    if (response.status === false) {
      return res.status(400).json({
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server api.",
      error: error.message || "Unknown Error"
    });
  }
}