import axios from "axios";
import crypto from "crypto";

class AIVocalTTS {
  constructor() {
    this.base_url = "https://aivocal.io";
    this.api_url = "https://aivocal.io/api/v1/text-to-speech";
    this.jar = {};

    this.emotions = [
      { label: "Auto", value: "calm" },
      { label: "Happy", value: "happy" },
      { label: "Sad", value: "sad" },
      { label: "Angry", value: "angry" },
      { label: "Fearful", value: "fearful" },
      { label: "Disgusted", value: "disgusted" },
      { label: "Surprised", value: "surprised" }
    ];

    this.voices_catalog = [
      { id: "af_alloy", name: "Alloy", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_aoede", name: "Aoede", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_bella", name: "Bella", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_jessica", name: "Jessica", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_kore", name: "Kore", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_nicole", name: "Nicole", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_nova", name: "Nova", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_river", name: "River", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_sarah", name: "Sarah", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "af_sky", name: "Sky", gender: "female", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_adam", name: "Adam", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_echo", name: "Echo", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_eric", name: "Eric", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_fenrir", name: "Fenrir", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_liam", name: "Liam", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_michael", name: "Michael", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_onyx", name: "Onyx", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "am_puck", name: "Puck", gender: "male", lang: "en", accent: "en_america", supplier: 2, voice_source: 1 },
      { id: "bf_alice", name: "Alice", gender: "female", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bf_emma", name: "Emma", gender: "female", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bf_isabella", name: "Isabella", gender: "female", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bf_lily", name: "Lily", gender: "female", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bm_daniel", name: "Daniel", gender: "male", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bm_fable", name: "Fable", gender: "male", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bm_george", name: "George", gender: "male", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "bm_lewis", name: "Lewis", gender: "male", lang: "en", accent: "en_british", supplier: 2, voice_source: 1 },
      { id: "ff_siwis", name: "Siwis", gender: "female", lang: "fr", accent: "fr_standard", supplier: 2, voice_source: 1 },
      { id: "hf_alpha", name: "Alpha", gender: "female", lang: "hi", accent: "hi_standard", supplier: 2, voice_source: 1 },
      { id: "hf_beta", name: "Beta", gender: "female", lang: "hi", accent: "hi_standard", supplier: 2, voice_source: 1 },
      { id: "hm_omega", name: "Omega", gender: "male", lang: "hi", accent: "hi_standard", supplier: 2, voice_source: 1 },
      { id: "hm_psi", name: "Psi", gender: "male", lang: "hi", accent: "hi_standard", supplier: 2, voice_source: 1 },
      { id: "if_sara", name: "Sara", gender: "female", lang: "it", accent: "it_standard", supplier: 2, voice_source: 1 },
      { id: "im_nicola", name: "Nicola", gender: "male", lang: "it", accent: "it_standard", supplier: 2, voice_source: 1 },
      { id: "English_FriendlyPerson", name: "Friendlyperson", gender: "male", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_compelling_lady1", name: "Compelling Lady", gender: "female", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_expressive_narrator", name: "Expressive Narrator", gender: "male", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_magnetic_voiced_man", name: "Magnetic-voiced Male", gender: "male", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_Steadymentor", name: "Steadymentor", gender: "male", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_LovelyLady", name: "Lovelylady", gender: "female", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_StressedLady", name: "Stressedlady", gender: "female", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_Soft-spokenGirl", name: "Soft Spokengirl", gender: "female", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_Graceful_Lady", name: "Graceful Lady", gender: "female", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 },
      { id: "English_Strong-WilledBoy", name: "Strong Willedboy", gender: "male", lang: "en", accent: "en_british", supplier: 1, voice_source: 1 },
      { id: "English_PatientMan", name: "Patientman", gender: "male", lang: "en", accent: "en_us", supplier: 1, voice_source: 1 }
    ];

    this.jar["anonymous_user_id"] = crypto.randomUUID();

    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 45e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept: "application/json, text/plain, */*"
      }
    });

    this.client.interceptors.request.use(
      req => {
        console.log(`[PROSES] HTTP Request: ${req?.method?.toUpperCase()} ${req?.url}`);
        const ck = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
        if (ck) req.headers["Cookie"] = ck;
        return req;
      },
      err => {
        console.log(`[ERROR] Request Interceptor: ${err?.message}`);
        return Promise.reject(err);
      }
    );

    this.client.interceptors.response.use(
      res => {
        console.log(`[PROSES] HTTP Response: ${res?.status} dari ${res?.config?.url}`);
        const raw = res.headers?.["set-cookie"] || [];
        (Array.isArray(raw) ? raw : [raw]).forEach(c => {
          if (!c) return;
          const [pair] = c.split(";");
          const [k, ...v] = pair.split("=");
          if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
        });
        return res;
      },
      err => {
        console.log(`[ERROR] Response Interceptor: ${err?.response?.status || err?.message}`);
        return Promise.reject(err);
      }
    );
  }

  hd() {
    try {
      return {
        Origin: this.base_url,
        Referer: `${this.base_url}/ai-voice-generator`,
        "Content-Type": "application/json;charset=UTF-8"
      };
    } catch (err) {
      console.log(`[ERROR] hd: ${err?.message}`);
      return {};
    }
  }

  val_str(v, name, req = true) {
    try {
      const clean = v !== undefined && v !== null ? String(v).trim() : "";
      if (req && !clean) throw new Error(`Parameter "${name}" wajib diisi dan tidak boleh kosong.`);
      return clean;
    } catch (err) {
      console.log(`[ERROR] val_str: ${err?.message}`);
      throw err;
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  fmt_title() {
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
    const hms = d.toTimeString().slice(0, 8).replace(/:/g, "");
    return `Audiobook_${ymd}_${hms}_AIVocal`;
  }

  async voice_list({ lang, gender, ...rest } = {}) {
    try {
      console.log("[PROSES] Mengambil voice_list AIVocal...");
      const target_lang = lang ? this.val_str(lang, "lang", false).toLowerCase() : "";
      const target_gender = gender ? this.val_str(gender, "gender", false).toLowerCase() : "";

      let voices = this.voices_catalog;
      if (target_lang) {
        voices = voices.filter(v => v.lang.toLowerCase() === target_lang);
      }
      if (target_gender) {
        voices = voices.filter(v => v.gender.toLowerCase() === target_gender);
      }

      const languages = [...new Set(this.voices_catalog.map(v => v.lang))].sort();

      return {
        status: true,
        result: {
          total_voices: voices.length,
          voices: voices,
          languages: languages,
          emotions: this.emotions
        }
      };
    } catch (err) {
      console.log(`[ERROR] voice_list: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Gagal mengambil daftar suara"
        }
      };
    }
  }

  async poll_status({ speech_id, max_retries = 30, interval = 1000, ...rest } = {}) {
    try {
      const s_id = this.val_str(speech_id, "speech_id", true);
      console.log(`[PROSES] Menunggu hasil pemrosesan audio untuk ID: ${s_id}...`);

      for (let i = 0; i < max_retries; i++) {
        await this.sleep(interval);
        const res = await this.client.get(`/api/v1/text-to-speech/speech/${s_id}`, {
          headers: this.hd()
        });

        const body = res?.data || {};
        const data = body?.data || {};

        if (body?.code !== 100000) {
          throw new Error(body?.message || "Gagal memeriksa status speech");
        }

        if (data?.status === "success" && data?.audio_url) {
          console.log(`[PROSES] Audio berhasil diproses (${data.audio_url})`);
          return data;
        }

        if (data?.status === "failed" || data?.error) {
          throw new Error(data?.error || "Pemrosesan audio gagal di server AIVocal");
        }

        console.log(`[PROSES] Menunggu audio... (${i + 1}/${max_retries}) Status: ${data?.status || "pending"}`);
      }

      throw new Error("Waktu tunggu pemrosesan audio habis (Timeout)");
    } catch (err) {
      console.log(`[ERROR] poll_status: ${err?.message || err}`);
      throw err;
    }
  }

  async create({
    text,
    content,
    voice = "af_kore",
    emotion = "calm",
    speed = 1,
    pitch = 0,
    volume = 1,
    ...rest
  } = {}) {
    try {
      const text_input = this.val_str(text || content, "text/content", true);
      const voice_input = this.val_str(voice, "voice", false) || "af_kore";
      const emotion_input = this.val_str(emotion, "emotion", false).toLowerCase() || "calm";

      const matched_voice = this.voices_catalog.find(v => v.id.toLowerCase() === voice_input.toLowerCase() || v.name.toLowerCase() === voice_input.toLowerCase());
      const selected_voice = matched_voice || this.voices_catalog[4];

      const valid_emotion = this.emotions.some(e => e.value === emotion_input);
      const chosen_emotion = valid_emotion ? emotion_input : "calm";

      console.log(`[PROSES] Mengirim permintaan sintesis suara ke AIVocal [Voice: ${selected_voice.name} (${selected_voice.id}), Emotion: ${chosen_emotion}]...`);

      const payload = {
        commerical_use: false,
        voice_id: selected_voice.id,
        supplier: selected_voice.supplier,
        content: text_input,
        voice_source: selected_voice.voice_source,
        voice_setting: {
          speed: Number(speed) || 1,
          pitch: Number(pitch) || 0,
          emotion: chosen_emotion,
          volume: Number(volume) || 1
        },
        title: rest?.title || this.fmt_title()
      };

      const res = await this.client.post("/api/v1/text-to-speech/speech", payload, {
        headers: this.hd()
      });

      const body = res?.data || {};
      if (body?.code !== 100000 || !body?.data?.speech_id) {
        throw new Error(body?.message || "Gagal membuat task speech synthesis");
      }

      const task_data = body.data;
      const speech_id = task_data.speech_id;
      console.log(`[PROSES] Task TTS terdaftar. Speech ID: ${speech_id}`);

      let final_data = task_data;
      if (task_data?.status !== "success" || !task_data?.audio_url) {
        final_data = await this.poll_status({ speech_id });
      }

      const audio_url = final_data.audio_url;
      console.log("[PROSES] Mengunduh berkas audio dari CDN...");

      const audio_res = await axios.get(audio_url, {
        responseType: "arraybuffer",
        timeout: 45e3
      });

      const audio_buf = Buffer.from(audio_res?.data || "");
      if (!audio_buf.length) {
        throw new Error("File audio yang diunduh kosong");
      }

      const audio_b64 = audio_buf.toString("base64");
      const audio_format = audio_url.endsWith(".wav") ? "wav" : "mp3";

      console.log(`[PROSES] Berkas audio siap (${audio_buf.length} bytes, format: ${audio_format}).`);

      return {
        status: true,
        result: {
          speech_id: speech_id,
          title: final_data?.title || payload.title,
          voice_id: selected_voice.id,
          voice_name: selected_voice.name,
          voice_gender: selected_voice.gender,
          language: selected_voice.lang,
          emotion: chosen_emotion,
          char_count: text_input.length,
          audio_format: audio_format,
          audio_url: audio_url,
          audio_base64: audio_b64,
          data_uri: `data:audio/${audio_format};base64,${audio_b64}`
        }
      };
    } catch (err) {
      console.log(`[ERROR] Generate AIVocal TTS: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.response?.data?.message || err?.message || "Gagal memproses speech synthesis AIVocal"
        }
      };
    }
  }
}

export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const validActions = ["create", "voice_list", "voices", "status"];

    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: [
            "/?action=create&text=Hello+world&voice=af_kore&emotion=calm",
            "/?action=voice_list&lang=en",
            "/?action=status&speech_id=rvrrpvyx31rge0d169y8xbgxh0"
          ]
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

    const api = new AIVocalTTS();
    let response;

    switch (action) {
      case "create": {
        const text_input = params.text || params.content || "";
        if (!text_input || !String(text_input).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' atau 'content' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create({
          text: text_input,
          voice: params.voice || "af_kore",
          emotion: params.emotion || "calm",
          speed: params.speed !== undefined ? Number(params.speed) : 1,
          pitch: params.pitch !== undefined ? Number(params.pitch) : 0,
          volume: params.volume !== undefined ? Number(params.volume) : 1,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice_list({
          lang: params.lang,
          gender: params.gender,
          ...params
        });
        break;
      }
      case "status": {
        if (!params.speech_id || !String(params.speech_id).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'speech_id' wajib diisi untuk action 'status'."
          });
        }
        try {
          const poll_res = await api.poll_status({ speech_id: params.speech_id });
          response = {
            status: true,
            result: poll_res
          };
        } catch (poll_err) {
          response = {
            status: false,
            result: {
              message: poll_err?.message || "Gagal memeriksa status"
            }
          };
        }
        break;
      }
    }

    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.message || "Gagal memproses request ke AIVocal TTS."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada handler AIVocal:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}