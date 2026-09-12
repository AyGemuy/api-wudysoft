import axios from "axios";
import crypto from "crypto";
class MusicMelofy {
  constructor() {
    this.baseUrl = "https://api.musicmelofy.com";
    this.token = null;
    this.credentials = {
      device_id: this.rnd(),
      device_name: `Node_${this.rnd(4)}`,
      uid: "",
      provider: "google",
      name: `User_${this.rnd(4)}`
    };
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    console.log(`[MusicMelofy] Service Started: ${this.baseUrl}`);
  }
  rnd(n = 32) {
    return crypto.randomBytes(n).toString("hex");
  }
  async _prepareAuth(manualToken) {
    if (manualToken) {
      this.token = manualToken;
      this.api.defaults.headers["Authorization"] = `Bearer ${manualToken}`;
    } else if (!this.token) {
      await this.auth();
    } else {
      this.api.defaults.headers["Authorization"] = `Bearer ${this.token}`;
    }
  }
  async auth() {
    try {
      console.log("[MusicMelofy] Attempting Auto Login...");
      const res = await this.api.post("/user/login", {
        device_id: this.credentials.device_id,
        device_name: this.credentials.device_name,
        uid: this.credentials.uid,
        provider: this.credentials.provider,
        name: this.credentials.name,
        avatar: "",
        platform: "android",
        app_version: "1.0.0"
      });
      this.token = res.data?.data?.token || res.data?.token;
      if (!this.token) throw new Error("No token received");
      this.api.defaults.headers["Authorization"] = `Bearer ${this.token}`;
      return this.token;
    } catch (e) {
      console.error(`[MusicMelofy] Auth Error: ${e.message}`);
      return null;
    }
  }
  async status({
    token,
    request_id
  }) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/music/generate_result", {
        params: {
          request_id: request_id
        }
      });
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async generate({
    token,
    prompt,
    type,
    name,
    genre,
    mood,
    vocal_gender,
    time,
    is_reward = false
  }) {
    try {
      await this._prepareAuth(token);
      const payload = {
        prompt: prompt,
        type: type,
        name: name,
        genre: genre,
        mood: mood,
        vocal_gender: vocal_gender,
        time: time,
        is_reward: is_reward ? 1 : 0
      };
      const res = await this.api.post("/music/generate", payload);
      return {
        token: this.token,
        ...res.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async cover({
    token,
    music_id,
    youtube_url,
    model_cover_id,
    is_reward = false
  }) {
    try {
      await this._prepareAuth(token);
      const payload = {
        music_id: music_id,
        youtube_url: youtube_url,
        model_cover_id: model_cover_id,
        is_reward: is_reward ? 1 : 0
      };
      const res = await this.api.post("/music/generate_cover", payload);
      return {
        token: this.token,
        ...res.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async genres({
    token
  } = {}) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/music/list_genre");
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async moods({
    token
  } = {}) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/music/list_mood");
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async prompts({
    token
  } = {}) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/music/generate_suggest");
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async models({
    token,
    type
  } = {}) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/music/list_model_cover", {
        params: type ? {
          type: type
        } : {}
      });
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async detail({
    token,
    music_id
  }) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/library/detail_music", {
        params: {
          music_id: music_id
        }
      });
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async separates({
    token
  } = {}) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.get("/library/separate_progress");
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async separate({
    token,
    music_id
  }) {
    try {
      await this._prepareAuth(token);
      const res = await this.api.post("/music/generate_separate", {
        music_id: music_id
      });
      return {
        token: this.token,
        ...res.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
  async me({
    token
  } = {}) {
    try {
      await this._prepareAuth(token);
      const r = await this.api.post("/user/get_info");
      return {
        token: this.token,
        ...r.data
      };
    } catch (e) {
      return {
        token: this.token,
        status: "error",
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "status", "cover", "genres", "moods", "prompts", "models", "detail", "separates", "separate", "me"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&prompt=one piece"
      }
    });
  }
  const api = new MusicMelofy();
  try {
    let response;
    switch (action) {
      case "status":
        if (!params.token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' wajib diisi untuk action 'status'."
          });
        }
        if (!params.request_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'request_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
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
      case "cover":
        if (!params.music_id && !params.youtube_url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'music_id' atau 'youtube_url' wajib diisi untuk action 'cover'."
          });
        }
        response = await api.cover(params);
        break;
      case "detail":
        if (!params.music_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'music_id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "separate":
        if (!params.music_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'music_id' wajib diisi untuk action 'separate'."
          });
        }
        response = await api.separate(params);
        break;
      case "genres":
        response = await api.genres(params);
        break;
      case "moods":
        response = await api.moods(params);
        break;
      case "prompts":
        response = await api.prompts(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "separates":
        response = await api.separates(params);
        break;
      case "me":
        response = await api.me(params);
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
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}