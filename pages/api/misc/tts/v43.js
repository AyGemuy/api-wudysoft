import axios from "axios";
import {
  randomBytes
} from "crypto";
const BASE = "https://topsuperapps.com/chirp";
const HDR = {
  "User-Agent": "okhttp/4.12.0",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json"
};
const VOICES = {
  "en-us": ["heart", "bella", "michael", "alloy", "aoede", "kore", "jessica", "nicole", "nova", "river", "sarah", "sky", "echo", "eric", "fenrir", "liam", "onyx", "puck", "adam", "santa"],
  "en-gb": ["alice", "emma", "isabella", "lily", "daniel", "fable", "george", "lewis"],
  ja: ["sakura", "gongitsune", "nezumi", "tebukuro", "kumo"],
  zh: ["xiaobei", "xiaoni", "xiaoxiao", "xiaoyi", "yunjian", "yunxi", "yunxiao", "yunyang"],
  es: ["dora", "alex", "noel"],
  fr: ["siwis"],
  hi: ["alpha", "beta", "omega", "psi"],
  it: ["Sara", "Nicola"],
  "pt-br": ["Clara", "Tiago", "Papai"]
};
class ChirpTTS {
  constructor() {
    this.uid = null;
    this.http = axios.create({
      baseURL: BASE,
      headers: HDR
    });
  }
  genUid() {
    return randomBytes(8).toString("hex");
  }
  voice_list() {
    return VOICES;
  }
  findVoice(lang) {
    const list = VOICES[lang] || VOICES["en-us"];
    return list[0];
  }
  findLang(voice) {
    for (const [code, voices] of Object.entries(VOICES)) {
      if (voices.map(v => v.toLowerCase()).includes(voice?.toLowerCase())) return code;
    }
    return "en-us";
  }
  async auth() {
    const uid = this.uid || this.genUid();
    console.log("[auth] register uid:", uid);
    try {
      const res = await this.http.post("/create_user.php", {
        unique_userid: uid
      });
      this.uid = res.data?.unique_userid || uid;
      console.log("[auth] ok:", JSON.stringify(res.data));
    } catch (e) {
      console.log("[auth] warn:", e?.response?.data || e.message);
      this.uid = uid;
    }
    return this.uid;
  }
  async generate({
    text,
    voice = "sakura",
    ...rest
  }) {
    if (!this.uid) await this.auth();
    const lang = rest.lang || rest.language || this.findLang(voice) || "en-us";
    const usedVoice = voice || this.findVoice(lang);
    const fmt = rest.format || rest.response_format || "mp3";
    console.log(`[generate] text="${text}" voice=${usedVoice} lang=${lang} fmt=${fmt}`);
    try {
      const res = await this.http.post("/tts.php", {
        input: text,
        voice: usedVoice,
        language: lang,
        response_format: fmt,
        watchad: rest.watchad ?? false
      }, {
        headers: {
          "x-user-id": this.uid
        },
        responseType: "arraybuffer"
      });
      const contentType = res.headers?.["content-type"] || `audio/${fmt}`;
      const buffer = Buffer.from(res.data);
      console.log(`[generate] ok — ${buffer.length} bytes, type=${contentType}`);
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (e) {
      const msg = e?.response?.data?.toString() || e.message;
      console.log("[generate] error:", msg);
      throw new Error(msg);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ChirpTTS();
  try {
    let response;
    switch (action) {
      case "voice_list":
        response = api.voice_list();
        return res.status(200).json(response);
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'generate'."
          });
        }
        const audioResult = await api.generate(params);
        res.setHeader("Content-Type", audioResult.contentType);
        res.setHeader("Content-Disposition", 'inline; filename="generated_audio.mp3"');
        return res.status(200).send(audioResult.buffer);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'voice_list', 'generate'.`
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}