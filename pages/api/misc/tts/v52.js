import axios from "axios";
import FormData from "form-data";
class VoiceAI {
  constructor() {
    try {
      this.baseUrl = "http://80.241.209.212:9000";
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: 12e4,
        responseType: "arraybuffer",
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          "User-Agent": "Dart/3.4 (dart:io)",
          Accept: "*/*",
          "Accept-Encoding": "gzip"
        }
      });
    } catch (err) {
      console.error(`❌ [Init Error] ${err?.message}`);
    }
  }
  async toBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (/^https?:\/\//i.test(input)) {
          console.log(`🌐 [Resolving Audio] Mengunduh audio dari URL...`);
          const res = await axios.get(input, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Dart/3.4 (dart:io)"
            }
          });
          return Buffer.from(res?.data);
        }
        const cleanBase64 = input.includes("base64,") ? input.split("base64,")[1] : input;
        return Buffer.from(cleanBase64, "base64");
      }
      console.error("❌ [Audio Error] Format input audio tidak valid");
      return null;
    } catch (err) {
      console.error(`❌ [Audio Error] Gagal memproses audio: ${err?.message}`);
      return null;
    }
  }
  voice_list() {
    try {
      return ["Ali", "Andrew Tate", "Angela ", "Ariana", "Arnold", "Barack", "Beast", "Beyonce", "Billie Eillish", "Bruno", "Christina", "Donald Trump", "Drake", "Dwayne", "Elon Musk", "Eminem", "Emma Watson", "Fernando Alonso", "Ghostface", "Harvey Specter", "Homer simpson", "JD Vance", "Jimmey Kimmel", "Jimmy fallon", "Jinne", "Joe Biden", "John Cena", "Joker", "Justin bieber", "Kamala Harris", "Katja", "Keanu Reeves", "Kevin Hart", "Kim kardsahian", "Kris jenner", "Lebron", "Leonardo", "Lionel Messi", "Lisa", "Mark Zuckerberg", "Meghan Markle", "Micky Mouse", "Morgan Freeman", "Nancy", "Narendra Modi", "Oprah", "Peter", "Pikachu", "Queen Elizabeth", "Robert Redford", "Ronaldo", "Rosalia", "Rose", "Rumi kang", "Ryan ", "Sabrina", "Sameul Jackson", "Scarlett", "Shradha Khapra", "Spongebob", "Steve Harvey", "Steve Jobs", "Sukuna", "Taylor swift", "Tom Hanks", "Tucker Carlson", "Venom", "Violet evergarden", "Vladimir", "Wednesday", "Zac Efron", "batman"];
    } catch (err) {
      console.error(`❌ [Voice List Error] ${err?.message}`);
      return [];
    }
  }
  async req(endpoint, form) {
    try {
      console.log(`🚀 [Request] Mengirim request ke ${this.baseUrl}${endpoint}`);
      const res = await this.client.post(endpoint, form, {
        headers: {
          ...form?.getHeaders?.(),
          "User-Agent": "Dart/3.4 (dart:io)",
          Accept: "*/*"
        }
      });
      const buffer = Buffer.from(res?.data);
      const isWav = buffer?.length > 12 && buffer?.subarray(0, 4)?.toString("ascii") === "RIFF";
      const contentType = isWav ? "audio/wav" : res?.headers?.["content-type"] || "application/octet-stream";
      console.log(`📥 [Response] Status: ${res?.status} | Ukuran: ${buffer?.length} bytes`);
      return {
        status: res?.status || 200,
        buffer: buffer,
        contentType: contentType
      };
    } catch (err) {
      console.error(`❌ [Request Failed] ${err?.message}`);
      const errData = err?.response?.data ? Buffer.from(err.response.data) : Buffer.from(err?.message || "Request Failed");
      return {
        status: err?.response?.status || 500,
        buffer: errData,
        contentType: err?.response?.headers?.["content-type"] || "application/json"
      };
    }
  }
  async generate({
    text,
    audio,
    voice,
    ...rest
  }) {
    try {
      const selectedVoice = voice ? voice : "Donald Trump";
      const form = new FormData();
      Object.keys(rest || {}).forEach(key => {
        form.append(key, rest[key]);
      });
      if (audio) {
        console.log(`🎙️ [Mode: V2V] Target Voice: "${selectedVoice}"`);
        const audioBuf = await this.toBuf(audio);
        if (!audioBuf) {
          return {
            status: 400,
            buffer: Buffer.from(JSON.stringify({
              error: "Buffer audio tidak valid atau gagal diproses"
            })),
            contentType: "application/json"
          };
        }
        form.append("voice_name", selectedVoice);
        form.append("audio", audioBuf, {
          filename: "input.wav",
          contentType: "audio/wav"
        });
        return await this.req("/v2v", form);
      } else if (text) {
        console.log(`🗣️ [Mode: TTS] Text: "${text}" | Voice: "${selectedVoice}"`);
        form.append("text", text);
        form.append("voice_name", selectedVoice);
        return await this.req("/tts", form);
      } else {
        return {
          status: 400,
          buffer: Buffer.from(JSON.stringify({
            error: 'Wajib menyertakan parameter "text" atau "audio"'
          })),
          contentType: "application/json"
        };
      }
    } catch (err) {
      return {
        status: 500,
        buffer: Buffer.from(JSON.stringify({
          error: err?.message
        })),
        contentType: "application/json"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "voice_list"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          tts: "/api/voice?action=create&text=Halo+dunia&voice=Donald+Trump",
          v2v: "/api/voice?action=create&audio=https://example.com/audio.mp3&voice=Elon+Musk",
          voice_list: "/api/voice?action=voice_list"
        }
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
    switch (action) {
      case "create": {
        if (!params.text && !params.audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' (untuk TTS) atau 'audio' (untuk V2V) wajib diisi."
          });
        }
        const audioResult = await api.generate(params);
        if (audioResult && audioResult.status === 200 && audioResult.buffer) {
          res.setHeader("Content-Type", audioResult.contentType || "audio/wav");
          res.setHeader("Content-Disposition", 'inline; filename="generated_audio.wav"');
          return res.status(200).send(audioResult.buffer);
        } else {
          let errorDetail = "Gagal memproses audio.";
          try {
            const parsed = JSON.parse(audioResult?.buffer?.toString());
            errorDetail = parsed?.error || parsed?.detail || errorDetail;
          } catch {
            errorDetail = audioResult?.buffer?.toString() || errorDetail;
          }
          return res.status(audioResult?.status || 400).json({
            status: false,
            action: action,
            error: errorDetail
          });
        }
      }
      case "voice_list": {
        const voices = api.voice_list();
        if (voices && voices.length > 0) {
          return res.status(200).json({
            status: true,
            action: action,
            total: voices.length,
            voices: voices
          });
        } else {
          return res.status(400).json({
            status: false,
            action: action,
            error: "Gagal mengambil daftar suara."
          });
        }
      }
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}