import axios from "axios";
import FormData from "form-data";
class SoundfyClient {
  constructor() {
    this.base_url = "https://us-central1-soundfy-e087e.cloudfunctions.net";
    this.timeout = 6e4;
    this.dart_headers = {
      "User-Agent": "Dart/3.3 (dart:io)",
      Accept: "application/json",
      "Accept-Encoding": "gzip"
    };
    this.http = axios.create({
      baseURL: this.base_url,
      timeout: this.timeout,
      headers: this.dart_headers
    });
  }
  async sol_media({
    media,
    ...rest
  }) {
    try {
      console.log("[Soundfy] Memvalidasi dan memproses media...");
      if (!media) return null;
      if (Buffer.isBuffer(media)) {
        return `data:audio/mpeg;base64,${media.toString("base64")}`;
      }
      if (typeof media === "string") {
        const is_url = /^https?:\/\//i.test(media);
        if (is_url) {
          console.log("[Soundfy] Mengunduh binary media dari URL:", media);
          const res = await axios.get(media, {
            responseType: "arraybuffer",
            headers: this.dart_headers
          });
          const mime = res?.headers?.["content-type"] || "audio/mpeg";
          return `data:${mime};base64,${Buffer.from(res?.data).toString("base64")}`;
        }
        const is_base64 = /^data:|^[A-Za-z0-9+/=]+$/.test(media);
        return is_base64 ? media.startsWith("data:") ? media : `data:audio/mpeg;base64,${media}` : media;
      }
      return media;
    } catch (err) {
      console.error("[Soundfy Error] Gagal memproses media:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async req_post({
    path,
    data,
    is_form = false,
    ...rest
  }) {
    try {
      let body = data;
      let headers = {};
      if (is_form) {
        const form = new FormData();
        Object.entries(data || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null) form.append(k, v);
        });
        body = form;
        headers = form?.getHeaders?.() || {};
      }
      const res = await this.http.post(path, body, {
        headers: {
          "Content-Type": is_form ? "multipart/form-data" : "application/json",
          ...headers
        }
      });
      return res?.data || {};
    } catch (err) {
      console.error(`[Soundfy Error] POST ${path}:`, err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data || err?.message || "Internal Request Error"
      };
    }
  }
  async ts_lyrics({
    taskId,
    audioId,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      const audio_id = audioId ? audioId : rest?.audioId;
      if (!task_id || !audio_id) {
        console.error('[Soundfy Error] ts_lyrics: "taskId" dan "audioId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" dan "audioId" wajib diisi.'
        };
      }
      console.log("[Soundfy] Mengambil timestamped lyrics...");
      const payload = {
        taskId: task_id,
        audioId: audio_id,
        ...rest
      };
      return await this.req_post({
        path: "/getTimestampedLyrics",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] ts_lyrics:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async music_info({
    taskId,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      if (!task_id) {
        console.error('[Soundfy Error] music_info: "taskId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" wajib diisi.'
        };
      }
      console.log(`[Soundfy] Mengambil info musik untuk taskId: ${task_id}...`);
      const res = await this.http.get("/getMusicInfo", {
        params: {
          taskId: task_id
        }
      });
      return res?.data || {};
    } catch (err) {
      console.error("[Soundfy Error] music_info:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data || err?.message || err
      };
    }
  }
  async gen_music({
    title,
    lyric,
    style,
    instrumental,
    personaId,
    personaModel,
    ...rest
  }) {
    try {
      console.log("[Soundfy] Menyiapkan generate musik...");
      const payload = {
        title: title ? title : rest?.prompt ? `Song - ${rest.prompt.slice(0, 15)}` : "My Track",
        lyric: lyric ? lyric : rest?.prompt ? rest.prompt : "",
        style: Array.isArray(style) ? style : style ? [style] : ["Pop"],
        instrumental: instrumental !== undefined ? instrumental : false,
        personaId: personaId ? personaId : rest?.personaId || undefined,
        personaModel: personaModel ? personaModel : rest?.personaModel || undefined,
        ...rest
      };
      if (!payload.lyric && !payload.instrumental) {
        console.error('[Soundfy Error] gen_music: "lyric" wajib diisi jika instrumental = false.');
        return {
          status: false,
          error: 'Parameter "lyric" wajib diisi jika bukan lagu instrumental.'
        };
      }
      return await this.req_post({
        path: "/generateMusic",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] gen_music:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async lyric_info({
    taskId,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      if (!task_id) {
        console.error('[Soundfy Error] lyric_info: "taskId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" wajib diisi.'
        };
      }
      console.log(`[Soundfy] Mengambil info lirik untuk taskId: ${task_id}...`);
      const res = await this.http.get("/getLyricInfo", {
        params: {
          taskId: task_id
        }
      });
      return res?.data || {};
    } catch (err) {
      console.error("[Soundfy Error] lyric_info:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data || err?.message || err
      };
    }
  }
  async gen_lyrics({
    prompt,
    ...rest
  }) {
    try {
      const text_prompt = prompt ? prompt : rest?.prompt;
      if (!text_prompt) {
        console.error('[Soundfy Error] gen_lyrics: "prompt" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "prompt" wajib diisi.'
        };
      }
      console.log("[Soundfy] Memulai generate lirik...");
      const payload = {
        prompt: text_prompt,
        ...rest
      };
      return await this.req_post({
        path: "/generateLyrics",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] gen_lyrics:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async v_val_info({
    taskId,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      if (!task_id) {
        console.error('[Soundfy Error] v_val_info: "taskId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" wajib diisi.'
        };
      }
      console.log(`[Soundfy] Mengambil status validasi suara untuk taskId: ${task_id}...`);
      const res = await this.http.get("/voiceValidateInfo", {
        params: {
          taskId: task_id
        }
      });
      return res?.data || {};
    } catch (err) {
      console.error("[Soundfy Error] v_val_info:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data || err?.message || err
      };
    }
  }
  async v_validate({
    voiceUrl,
    vocalStartS,
    vocalEndS,
    language,
    ...rest
  }) {
    try {
      const raw_media = voiceUrl ? voiceUrl : rest?.media;
      if (!raw_media) {
        console.error('[Soundfy Error] v_validate: "voiceUrl" atau "media" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "voiceUrl" / "media" wajib diisi.'
        };
      }
      console.log("[Soundfy] Memvalidasi file audio suara...");
      const resolved = await this.sol_media({
        media: raw_media
      });
      const payload = {
        voiceUrl: resolved || "",
        vocalStartS: vocalStartS !== undefined ? vocalStartS : 0,
        vocalEndS: vocalEndS !== undefined ? vocalEndS : 30,
        language: language ? language : "id",
        ...rest
      };
      return await this.req_post({
        path: "/voiceValidate",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] v_validate:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async v_rec_info({
    taskId,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      if (!task_id) {
        console.error('[Soundfy Error] v_rec_info: "taskId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" wajib diisi.'
        };
      }
      console.log(`[Soundfy] Mengambil status rekaman suara taskId: ${task_id}...`);
      const res = await this.http.get("/voiceRecordInfo", {
        params: {
          taskId: task_id
        }
      });
      return res?.data || {};
    } catch (err) {
      console.error("[Soundfy Error] v_rec_info:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data || err?.message || err
      };
    }
  }
  async v_check({
    task_id,
    taskId,
    ...rest
  }) {
    try {
      const final_id = task_id ? task_id : taskId ? taskId : rest?.task_id;
      if (!final_id) {
        console.error('[Soundfy Error] v_check: "task_id" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "task_id" wajib diisi.'
        };
      }
      console.log("[Soundfy] Mengecek ketersediaan suara...");
      const payload = {
        task_id: final_id,
        ...rest
      };
      return await this.req_post({
        path: "/voiceCheckVoice",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] v_check:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async up_cover({
    uploadUrl,
    prompt,
    customMode,
    instrumental,
    audioId,
    ...rest
  }) {
    try {
      const raw_media = uploadUrl ? uploadUrl : rest?.media;
      const audio_id = audioId ? audioId : rest?.audioId;
      if (!raw_media || !audio_id) {
        console.error('[Soundfy Error] up_cover: "uploadUrl/media" dan "audioId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "uploadUrl/media" dan "audioId" wajib diisi.'
        };
      }
      console.log("[Soundfy] Memproses upload cover audio...");
      const resolved = await this.sol_media({
        media: raw_media
      });
      const payload = {
        uploadUrl: resolved || "",
        prompt: prompt ? prompt : rest?.description ? rest.description : "Cover Track",
        customMode: customMode !== undefined ? customMode : false,
        instrumental: instrumental !== undefined ? instrumental : false,
        audioId: audio_id,
        ...rest
      };
      return await this.req_post({
        path: "/uploadCoverAudio",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] up_cover:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async v_gen({
    taskId,
    verifyUrl,
    voiceName,
    description,
    style,
    singerSkillLevel,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      const raw_media = verifyUrl ? verifyUrl : rest?.media;
      if (!task_id || !raw_media) {
        console.error('[Soundfy Error] v_gen: "taskId" dan "verifyUrl/media" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" dan "verifyUrl/media" wajib diisi.'
        };
      }
      console.log("[Soundfy] Memulai generate model suara...");
      const resolved = await this.sol_media({
        media: raw_media
      });
      const payload = {
        taskId: task_id,
        verifyUrl: resolved || "",
        voiceName: voiceName ? voiceName : rest?.name ? rest.name : "CustomVoice",
        description: description ? description : "",
        style: style ? style : "Pop",
        singerSkillLevel: singerSkillLevel ? singerSkillLevel : "intermediate",
        ...rest
      };
      return await this.req_post({
        path: "/voiceGenerate",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] v_gen:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async vid_info({
    taskId,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      if (!task_id) {
        console.error('[Soundfy Error] vid_info: "taskId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" wajib diisi.'
        };
      }
      console.log(`[Soundfy] Mengambil status video taskId: ${task_id}...`);
      const res = await this.http.get("/getVideoInfo", {
        params: {
          taskId: task_id
        }
      });
      return res?.data || {};
    } catch (err) {
      console.error("[Soundfy Error] vid_info:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data || err?.message || err
      };
    }
  }
  async to_vid({
    taskId,
    audioId,
    callBackUrl,
    author,
    domainName,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      const audio_id = audioId ? audioId : rest?.audioId;
      if (!task_id || !audio_id) {
        console.error('[Soundfy Error] to_vid: "taskId" dan "audioId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" dan "audioId" wajib diisi.'
        };
      }
      console.log("[Soundfy] Memproses render audio ke video...");
      const payload = {
        taskId: task_id,
        audioId: audio_id,
        callBackUrl: callBackUrl ? callBackUrl : rest?.callBackUrl || "",
        author: author ? author : "Soundfy Artist",
        domainName: domainName ? domainName : "soundfy.com",
        ...rest
      };
      return await this.req_post({
        path: "/convertToVideo",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] to_vid:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
  async gen_persona({
    taskId,
    audioId,
    name,
    description,
    style,
    vocalStart,
    vocalEnd,
    ...rest
  }) {
    try {
      const task_id = taskId ? taskId : rest?.taskId;
      const audio_id = audioId ? audioId : rest?.audioId;
      if (!task_id || !audio_id) {
        console.error('[Soundfy Error] gen_persona: "taskId" dan "audioId" wajib diisi.');
        return {
          status: false,
          error: 'Parameter "taskId" dan "audioId" wajib diisi.'
        };
      }
      console.log("[Soundfy] Memulai pembuatan persona...");
      const payload = {
        taskId: task_id,
        audioId: audio_id,
        name: name ? name : "NewPersona",
        description: description ? description : "Soundfy Vocalist Persona",
        style: style ? style : "Pop",
        vocalStart: vocalStart !== undefined ? vocalStart : 0,
        vocalEnd: vocalEnd !== undefined ? vocalEnd : 30,
        ...rest
      };
      return await this.req_post({
        path: "/generatePersona",
        data: payload
      });
    } catch (err) {
      console.error("[Soundfy Error] gen_persona:", err?.message || err);
      return {
        status: false,
        error: err?.message || err
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["ts_lyrics", "music_info", "gen_music", "lyric_info", "gen_lyrics", "v_val_info", "v_validate", "v_rec_info", "v_check", "up_cover", "v_gen", "vid_info", "to_vid", "gen_persona"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          ts_lyrics: "/api/soundfy?action=ts_lyrics&taskId=task_123&audioId=audio_456",
          music_info: "/api/soundfy?action=music_info&taskId=task_123",
          gen_music: "/api/soundfy?action=gen_music (POST body: { title, lyric, style: ['Pop'], instrumental: false })",
          lyric_info: "/api/soundfy?action=lyric_info&taskId=task_123",
          gen_lyrics: "/api/soundfy?action=gen_lyrics&prompt=Lagu tentang cinta dan senja",
          v_val_info: "/api/soundfy?action=v_val_info&taskId=task_123",
          v_validate: "/api/soundfy?action=v_validate (POST body: { voiceUrl: 'https://...', vocalStartS: 0, vocalEndS: 30, language: 'id' })",
          v_rec_info: "/api/soundfy?action=v_rec_info&taskId=task_123",
          v_check: "/api/soundfy?action=v_check&taskId=task_123",
          up_cover: "/api/soundfy?action=up_cover (POST body: { uploadUrl: 'https://...', audioId: 'audio_456', prompt: 'Cover pop' })",
          v_gen: "/api/soundfy?action=v_gen (POST body: { taskId: 'task_123', verifyUrl: 'https://...', voiceName: 'MyVoice' })",
          vid_info: "/api/soundfy?action=vid_info&taskId=task_123",
          to_vid: "/api/soundfy?action=to_vid&taskId=task_123&audioId=audio_456",
          gen_persona: "/api/soundfy?action=gen_persona&taskId=task_123&audioId=audio_456&name=SingerX"
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
  const api = new SoundfyClient();
  try {
    let response;
    switch (action) {
      case "ts_lyrics":
        if (!params.taskId || !params.audioId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' dan 'audioId' wajib diisi."
          });
        }
        response = await api.ts_lyrics(params);
        break;
      case "music_info":
        if (!params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' wajib diisi."
          });
        }
        response = await api.music_info(params);
        break;
      case "gen_music":
        response = await api.gen_music(params);
        break;
      case "lyric_info":
        if (!params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' wajib diisi."
          });
        }
        response = await api.lyric_info(params);
        break;
      case "gen_lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi."
          });
        }
        response = await api.gen_lyrics(params);
        break;
      case "v_val_info":
        if (!params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' wajib diisi."
          });
        }
        response = await api.v_val_info(params);
        break;
      case "v_validate":
        if (!params.voiceUrl && !params.media) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'voiceUrl' atau 'media' wajib diisi."
          });
        }
        response = await api.v_validate(params);
        break;
      case "v_rec_info":
        if (!params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' wajib diisi."
          });
        }
        response = await api.v_rec_info(params);
        break;
      case "v_check":
        if (!params.task_id && !params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' atau 'taskId' wajib diisi."
          });
        }
        response = await api.v_check(params);
        break;
      case "up_cover":
        if (!params.uploadUrl && !params.media || !params.audioId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uploadUrl'/'media' dan 'audioId' wajib diisi."
          });
        }
        response = await api.up_cover(params);
        break;
      case "v_gen":
        if (!params.taskId || !params.verifyUrl && !params.media) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' dan 'verifyUrl'/'media' wajib diisi."
          });
        }
        response = await api.v_gen(params);
        break;
      case "vid_info":
        if (!params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' wajib diisi."
          });
        }
        response = await api.vid_info(params);
        break;
      case "to_vid":
        if (!params.taskId || !params.audioId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' dan 'audioId' wajib diisi."
          });
        }
        response = await api.to_vid(params);
        break;
      case "gen_persona":
        if (!params.taskId || !params.audioId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' dan 'audioId' wajib diisi."
          });
        }
        response = await api.gen_persona(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (response?.status === false) {
      return res.status(400).json(response);
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
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