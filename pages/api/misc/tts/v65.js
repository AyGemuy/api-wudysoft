import axios from "axios";
import ApiKey from "@/configs/api-key";
const VOICE_MAP = {
  rom: "2Wb9uItPQ03dluWKNmPG",
  voen: "DJ74E8GS3xm0DR7wPOJU",
  tik: "OVFLaU4IcWuinLuKLwGl",
  rtx: "gI4iWOHRVnpQVbTIGOj2",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  charlie: "IKne3meq5aSn9XLyUdCD",
  george: "JBFqnCBsd6RMkjVDRZzb",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  bella: "hpp4J3VqNfWAUOO0d1Us",
  brian: "nPczCjzI2devNBz1zQrb",
  rachel: "21m00Tcm4TlvDq8ikWAM"
};
class ElevenLabsClient {
  constructor(keys = []) {
    this.base = "https://api.elevenlabs.io/v1";
    const defaultKeys = ApiKey.eleven;
    if (Array.isArray(keys) && keys.length > 0) {
      this.apiKeys = keys;
    } else if (typeof keys === "string" && keys.trim()) {
      this.apiKeys = keys.split(",").map(k => k.trim());
    } else {
      this.apiKeys = defaultKeys;
    }
  }
  _log(msg, data = "") {
    try {
      console.log(`[ElevenLabs-Log] ${msg}`, data);
    } catch (_) {}
  }
  _parseError(err) {
    if (err.response?.data) {
      try {
        const raw = Buffer.isBuffer(err.response.data) ? Buffer.from(err.response.data).toString("utf-8") : JSON.stringify(err.response.data);
        const parsed = JSON.parse(raw);
        return parsed.detail?.message || parsed.detail || raw;
      } catch (_) {
        return err.response.data.toString();
      }
    }
    return err.message;
  }
  async _attemptRequest(fn) {
    let lastError = null;
    for (let i = 0; i < this.apiKeys.length; i++) {
      const apiKey = this.apiKeys[i];
      const keyMask = apiKey.substring(0, 8) + "..." + apiKey.slice(-4);
      try {
        this._log(`[Attempt #${i + 1}/${this.apiKeys.length}] Menggunakan Key: ${keyMask}`);
        const result = await fn(apiKey);
        return {
          ...result,
          key_used: keyMask,
          attempt_count: i + 1
        };
      } catch (err) {
        lastError = this._parseError(err);
        this._log(`[Key Error] #${i + 1} (${keyMask}) gagal: ${lastError}. Skip ke key berikutnya...`);
      }
    }
    throw new Error(`Semua key gagal diproses. Error terakhir: ${lastError}`);
  }
  async getBalance() {
    try {
      return await this._attemptRequest(async apiKey => {
        const res = await axios.get(`${this.base}/user/subscription`, {
          headers: {
            "xi-api-key": apiKey
          },
          timeout: 8e3
        });
        const data = res.data;
        return {
          tier: data.tier,
          character_count: data.character_count,
          character_limit: data.character_limit,
          remaining_characters: Math.max(0, data.character_limit - data.character_count),
          status: data.status
        };
      });
    } catch (err) {
      this._log("Gagal mengambil balance:", err.message);
      return null;
    }
  }
  async getVoices(query = "") {
    try {
      return await this._attemptRequest(async apiKey => {
        const res = await axios.get(`${this.base}/voices`, {
          headers: {
            "xi-api-key": apiKey
          },
          timeout: 1e4
        });
        let voices = (res.data?.voices || []).map(v => ({
          voice_id: v.voice_id,
          name: v.name,
          category: v.category,
          language: v.labels?.language || v.labels?.accent || "en",
          preview_url: v.preview_url
        }));
        if (query) {
          const q = query.toLowerCase();
          voices = voices.filter(v => v.name.toLowerCase().includes(q) || v.language.toLowerCase().includes(q));
        }
        return {
          voices: voices
        };
      });
    } catch (err) {
      this._log("Gagal mengambil daftar suara:", err.message);
      return {
        voices: []
      };
    }
  }
  async generate({
    text,
    voice,
    voice_id,
    model_id = "eleven_multilingual_v2",
    stability = .5,
    similarity_boost = .75,
    style = 0,
    use_speaker_boost = true
  }) {
    try {
      const selectedVoice = voice || voice_id || "rom";
      const targetVoiceId = VOICE_MAP[selectedVoice.toLowerCase()] || selectedVoice;
      const result = await this._attemptRequest(async apiKey => {
        const res = await axios.post(`${this.base}/text-to-speech/${targetVoiceId}`, {
          text: text,
          model_id: model_id,
          voice_settings: {
            stability: Number(stability),
            similarity_boost: Number(similarity_boost),
            style: Number(style),
            use_speaker_boost: Boolean(use_speaker_boost)
          }
        }, {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json"
          },
          responseType: "arraybuffer",
          timeout: 3e4
        });
        const audioBuffer = Buffer.from(res.data);
        return {
          voice: selectedVoice,
          voice_id: targetVoiceId,
          model_id: model_id,
          character_cost: text.length,
          content_type: "audio/mpeg",
          audio_base64: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`,
          buffer: audioBuffer
        };
      });
      return {
        status: "success",
        result: result
      };
    } catch (err) {
      return {
        status: "error",
        result: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "voices", "balance"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&text=Halo+dunia&voice=rom"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action '${action}' tidak valid.`,
      valid_actions: validActions
    });
  }
  const client = new ElevenLabsClient(params.api_key || params.keys);
  try {
    let response;
    switch (action) {
      case "generate": {
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk generate audio."
          });
        }
        response = await client.generate(params);
        if (params.raw === "true" && response.status === "success") {
          const buffer = response.result.buffer;
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Content-Length", buffer.length);
          return res.status(200).send(buffer);
        }
        if (response.result?.buffer) {
          delete response.result.buffer;
        }
        break;
      }
      case "voices": {
        response = await client.getVoices(params.query || "");
        response = {
          status: "success",
          ...response
        };
        break;
      }
      case "balance": {
        const bal = await client.getBalance();
        response = {
          status: bal ? "success" : "error",
          result: bal || "Semua key gagal atau kuota habis."
        };
        break;
      }
    }
    return res.status(200).json({
      status: response.status === "success",
      action: action,
      ...response
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan server.",
      error: error.message || "Unknown error"
    });
  }
}