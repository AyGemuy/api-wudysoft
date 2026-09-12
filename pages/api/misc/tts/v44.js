import axios from "axios";
import {
  randomUUID
} from "crypto";
class VoiceAI {
  constructor() {
    this.baseUrl = "https://voiceaiprod.azurewebsites.net/api";
    this.emotion = ["auto", "neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"];
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 12e4,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Dart/3.3 (dart:io)"
      }
    });
  }
  _required(value, name) {
    if (value === undefined || value === null || value === "") {
      throw new Error(`"${name}" is required`);
    }
  }
  _validateEmotion(emotion) {
    if (!this.emotion.includes(emotion)) {
      throw new Error(`Invalid emotion: "${emotion}". Must be one of: ${this.emotion.join(", ")}`);
    }
  }
  async register() {
    const did = randomUUID();
    console.log("[voice_ai:register]", {
      device_id: did
    });
    try {
      const r = await this.http.post("/ApplicationUser/Create", null, {
        params: {
          deviceId: did
        }
      });
      console.log("[voice_ai:register:ok]", {
        token: r.data?.data?.token?.slice(0, 30) + "..."
      });
      return r.data;
    } catch (e) {
      console.log("[voice_ai:register:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async voices({
    ...rest
  } = {}) {
    console.log("[voice_ai:voices]");
    try {
      const r = await this._req("GET", "/Voice/getVoices", {
        params: rest
      });
      console.log("[voice_ai:voices:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:voices:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async voice_models({
    ...rest
  } = {}) {
    console.log("[voice_ai:voice_models]");
    try {
      const r = await this._req("GET", "/Voice/getVoiceModels", {
        params: rest
      });
      console.log("[voice_ai:voice_models:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:voice_models:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async tts({
    prompt,
    model_id = 10,
    is_civilized = true,
    ...rest
  } = {}) {
    console.log("[voice_ai:tts]", {
      prompt: prompt,
      model_id: model_id,
      is_civilized: is_civilized
    });
    try {
      this._required(prompt, "prompt");
      const r = await this._req("POST", "/Voice/createVoice", {
        params: {
          prompt: prompt,
          voiceModelId: model_id,
          isCivilized: is_civilized,
          ...rest
        }
      });
      console.log("[voice_ai:tts:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:tts:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async tts_v2({
    prompt,
    model_id = 10,
    emotion = "neutral",
    pitch = 0,
    speed = 1,
    volume = 1,
    ...rest
  } = {}) {
    console.log("[voice_ai:tts_v2]", {
      prompt: prompt,
      model_id: model_id,
      emotion: emotion,
      pitch: pitch,
      speed: speed,
      volume: volume
    });
    try {
      this._required(prompt, "prompt");
      this._validateEmotion(emotion);
      const r = await this._req("POST", "/Voice/createVoiceV2", {
        params: {
          prompt: prompt,
          voiceModelId: model_id,
          emotion: emotion,
          pitch: pitch,
          speed: speed,
          volume: volume,
          ...rest
        }
      });
      console.log("[voice_ai:tts_v2:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:tts_v2:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async tts_onboard({
    prompt,
    model_id = 10,
    is_civilized = true,
    emotion = "neutral",
    pitch = 0,
    speed = 1,
    volume = 1,
    ...rest
  } = {}) {
    console.log("[voice_ai:tts_onboard]", {
      prompt: prompt,
      model_id: model_id
    });
    try {
      this._required(prompt, "prompt");
      this._validateEmotion(emotion);
      const r = await this._req("POST", "/Voice/createVoiceOnBoarding", {
        params: {
          prompt: prompt,
          voiceModelId: model_id,
          isCivilized: is_civilized,
          emotion: emotion,
          pitch: pitch,
          speed: speed,
          volume: volume,
          ...rest
        }
      });
      console.log("[voice_ai:tts_onboard:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:tts_onboard:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async covers({
    ...rest
  } = {}) {
    console.log("[voice_ai:covers]");
    try {
      const r = await this._req("GET", "/VoiceCover/getVoiceCovers", {
        params: rest
      });
      console.log("[voice_ai:covers:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:covers:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async cover_models({
    ...rest
  } = {}) {
    console.log("[voice_ai:cover_models]");
    try {
      const r = await this._req("GET", "/VoiceCover/getVoiceCoverModels", {
        params: rest
      });
      console.log("[voice_ai:cover_models:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:cover_models:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async cover({
    model_id = 10,
    url,
    gender = 0,
    ...rest
  } = {}) {
    console.log("[voice_ai:cover]", {
      model_id: model_id,
      url: url,
      gender: gender
    });
    try {
      this._required(url, "url");
      const r = await this._req("POST", "/VoiceCover/createVoiceCover", {
        params: {
          voiceCoverModelId: model_id,
          url: url,
          gender: gender,
          ...rest
        }
      });
      console.log("[voice_ai:cover:ok]");
      return r.data;
    } catch (e) {
      console.log("[voice_ai:cover:err]", e?.response?.data || e.message);
      throw e;
    }
  }
  async _req(method, path, {
    params
  } = {}) {
    try {
      const {
        data
      } = await this.register();
      const headers = {
        Authorization: `Bearer ${data?.token}`
      };
      return await this.http.request({
        method: method,
        url: path,
        params: params,
        headers: headers
      });
    } catch (e) {
      console.log("[voice_ai:_req:err]", e?.response?.data || e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["voices", "voice_models", "tts", "tts_v2", "tts_onboard", "covers", "cover_models", "cover"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=tts&prompt=Halo+dunia"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: "${action}".`,
      valid_actions: validActions
    });
  }
  const api = new VoiceAI();
  try {
    let response;
    switch (action) {
      case "voices":
        response = await api.voices(params);
        break;
      case "voice_models":
        response = await api.voice_models(params);
        break;
      case "tts":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'tts'."
          });
        }
        response = await api.tts(params);
        break;
      case "tts_v2":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'tts_v2'."
          });
        }
        response = await api.tts_v2(params);
        break;
      case "tts_onboard":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'tts_onboard'."
          });
        }
        response = await api.tts_onboard(params);
        break;
      case "covers":
        response = await api.covers(params);
        break;
      case "cover_models":
        response = await api.cover_models(params);
        break;
      case "cover":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'cover'."
          });
        }
        response = await api.cover(params);
        break;
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