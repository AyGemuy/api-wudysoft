import axios from "axios";
import {
  WebSocket
} from "ws";

function createWavBuffer(pcmBuffer, sampleRate = 24e3, numChannels = 1, bitDepth = 16) {
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}
class AiNarrator {
  constructor() {
    this.base_url = "https://theainarrator.com";
    this.wss_url = "wss://theainarrator.com/socket.io/?EIO=4&transport=websocket";
    this.jar = {};
    this.is_ready = false;
    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: this.base_url,
        Referer: `${this.base_url}/`
      }
    });
    this.client.interceptors.request.use(req => {
      const ck = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
      if (ck) req.headers["Cookie"] = ck;
      return req;
    });
    this.client.interceptors.response.use(res => {
      const raw = res.headers?.["set-cookie"] || [];
      (Array.isArray(raw) ? raw : [raw]).forEach(c => {
        if (!c) return;
        const [pair] = c.split(";");
        const [k, ...v] = pair.split("=");
        if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
      });
      return res;
    });
    this.voices = [{
      name: "Zephyr",
      gender: "female",
      style: "Bright",
      useCase: "Marketing, Explainers",
      hasSample: true,
      sample_url: `${this.base_url}/samples/zephyr.mp3`
    }, {
      name: "Kore",
      gender: "female",
      style: "Firm",
      useCase: "News, Corporate Training",
      hasSample: true,
      sample_url: `${this.base_url}/samples/kore.mp3`
    }, {
      name: "Leda",
      gender: "female",
      style: "Youthful",
      useCase: "Vlogs, Social Media",
      hasSample: true,
      sample_url: `${this.base_url}/samples/leda.mp3`
    }, {
      name: "Aoede",
      gender: "female",
      style: "Breezy",
      useCase: "Lifestyle, Travel Vlogs",
      hasSample: true,
      sample_url: `${this.base_url}/samples/aoede.mp3`
    }, {
      name: "Callirrhoe",
      gender: "female",
      style: "Easy-going",
      useCase: "Casual, Podcasts",
      hasSample: true,
      sample_url: `${this.base_url}/samples/callirrhoe.mp3`
    }, {
      name: "Despina",
      gender: "female",
      style: "Smooth",
      useCase: "Meditation, ASMR",
      hasSample: true,
      sample_url: `${this.base_url}/samples/despina.mp3`
    }, {
      name: "Erinome",
      gender: "female",
      style: "Clear",
      useCase: "Tutorials, Education",
      hasSample: true,
      sample_url: `${this.base_url}/samples/erinome.mp3`
    }, {
      name: "Laomedeia",
      gender: "female",
      style: "Upbeat",
      useCase: "Ads, Promotions",
      hasSample: false,
      sample_url: `${this.base_url}/samples/laomedeia.mp3`
    }, {
      name: "Sulafat",
      gender: "female",
      style: "Warm",
      useCase: "Storytelling, Narration",
      hasSample: false,
      sample_url: `${this.base_url}/samples/sulafat.mp3`
    }, {
      name: "Vindemiatrix",
      gender: "female",
      style: "Gentle",
      useCase: "Healthcare, Wellness",
      hasSample: false,
      sample_url: `${this.base_url}/samples/vindemiatrix.mp3`
    }, {
      name: "Achird",
      gender: "female",
      style: "Friendly",
      useCase: "Podcasts, Conversational",
      hasSample: true,
      sample_url: `${this.base_url}/samples/achird.mp3`
    }, {
      name: "Pulcherrima",
      gender: "female",
      style: "Upbeat",
      useCase: "Ads, Social Media",
      hasSample: true,
      sample_url: `${this.base_url}/samples/pulcherrima.mp3`
    }, {
      name: "Iapetus",
      gender: "male",
      style: "Clear",
      useCase: "E-Learning, Clear Narration",
      hasSample: true,
      sample_url: `${this.base_url}/samples/iapetus.mp3`
    }, {
      name: "Enceladus",
      gender: "male",
      style: "Breathy",
      useCase: "Audiobooks, Storytelling",
      hasSample: true,
      sample_url: `${this.base_url}/samples/enceladus.mp3`
    }, {
      name: "Fenrir",
      gender: "male",
      style: "Excitable",
      useCase: "Sports, Gaming",
      hasSample: true,
      sample_url: `${this.base_url}/samples/fenrir.mp3`
    }, {
      name: "Orus",
      gender: "male",
      style: "Firm",
      useCase: "Corporate, News",
      hasSample: true,
      sample_url: `${this.base_url}/samples/orus.mp3`
    }, {
      name: "Algenib",
      gender: "male",
      style: "Gravelly",
      useCase: "Documentaries, Deep Narration",
      hasSample: true,
      sample_url: `${this.base_url}/samples/algenib.mp3`
    }, {
      name: "Rasalgethi",
      gender: "male",
      style: "Informative",
      useCase: "News, Explainers",
      hasSample: true,
      sample_url: `${this.base_url}/samples/rasalgethi.mp3`
    }, {
      name: "Zubenelgenubi",
      gender: "male",
      style: "Casual",
      useCase: "Casual, Vlogs",
      hasSample: true,
      sample_url: `${this.base_url}/samples/zubenelgenubi.mp3`
    }, {
      name: "Sadaltager",
      gender: "male",
      style: "Knowledgeable",
      useCase: "Education, Lectures",
      hasSample: true,
      sample_url: `${this.base_url}/samples/sadaltager.mp3`
    }, {
      name: "Sadachbia",
      gender: "male",
      style: "Lively",
      useCase: "Movie Trailers, Character Work",
      hasSample: true,
      sample_url: `${this.base_url}/samples/sadachbia.mp3`
    }, {
      name: "Schedar",
      gender: "male",
      style: "Even",
      useCase: "Casual Tutorials, Vlogs",
      hasSample: true,
      sample_url: `${this.base_url}/samples/schedar.mp3`
    }, {
      name: "Umbriel",
      gender: "male",
      style: "Easy-going",
      useCase: "Casual, Lifestyle",
      hasSample: true,
      sample_url: `${this.base_url}/samples/umbriel.mp3`
    }, {
      name: "Alnilam",
      gender: "male",
      style: "Energetic",
      useCase: "Commercials, Promo",
      hasSample: true,
      sample_url: `${this.base_url}/samples/alnilam.mp3`
    }, {
      name: "Charon",
      gender: "male",
      style: "Conversational",
      useCase: "Podcasts, Explainers",
      hasSample: true,
      sample_url: `${this.base_url}/samples/charon.mp3`
    }, {
      name: "Gacrux",
      gender: "male",
      style: "Authoritative",
      useCase: "Documentaries, Audiobooks",
      hasSample: true,
      sample_url: `${this.base_url}/samples/gacrux.mp3`
    }, {
      name: "Puck",
      gender: "male",
      style: "Direct",
      useCase: "Product Demos, How-To",
      hasSample: true,
      sample_url: `${this.base_url}/samples/puck.mp3`
    }, {
      name: "Achernar",
      gender: "male",
      style: "Friendly",
      useCase: "Explainer Videos",
      hasSample: true,
      sample_url: `${this.base_url}/samples/achernar.mp3`
    }, {
      name: "Autonoe",
      gender: "male",
      style: "Bright",
      useCase: "Energetic Content",
      hasSample: true,
      sample_url: `${this.base_url}/samples/autonoe.mp3`
    }, {
      name: "Algieba",
      gender: "male",
      style: "Even",
      useCase: "Narration, Podcasts",
      hasSample: false,
      sample_url: `${this.base_url}/samples/algieba.mp3`
    }];
    this.languages = ["english", "indonesian", "spanish", "portuguese", "french", "german", "japanese", "korean", "hindi", "italian", "turkish", "dutch", "chinese", "vietnamese", "bengali", "gujarati", "kannada", "malayalam", "marathi", "tamil", "telugu", "russian"];
  }
  hd(ref = "") {
    return {
      "X-Requested-With": "XMLHttpRequest",
      Referer: ref ? ref.startsWith("http") ? ref : `${this.base_url}${ref}` : `${this.base_url}/`,
      Origin: this.base_url,
      Accept: "*/*"
    };
  }
  async ini(path = "/free-text-to-speech") {
    if (this.is_ready) return true;
    try {
      console.log(`[PROSES] Inisialisasi session AI Narrator (${path})...`);
      await this.client.get(path);
      this.is_ready = true;
      console.log("[PROSES] Inisialisasi session & cookie berhasil.");
      return true;
    } catch (err) {
      console.log(`[PROSES] Inisialisasi gagal: ${err?.message || err}`);
      return false;
    }
  }
  async quota() {
    try {
      await this.ini();
      const res = await this.client.get("/api/quota/tts", {
        headers: this.hd()
      });
      return {
        status: true,
        result: res?.data || {}
      };
    } catch (err) {
      return {
        status: false,
        result: {
          message: err?.message || "Gagal mengambil data kuota"
        }
      };
    }
  }
  voice_list({
    gender
  } = {}) {
    try {
      let filtered = [...this.voices];
      if (gender) {
        const targetGender = String(gender).trim().toLowerCase();
        filtered = filtered.filter(v => v.gender === targetGender);
      }
      return {
        status: true,
        result: {
          total_voices: filtered.length,
          supported_languages: this.languages,
          voices: filtered
        }
      };
    } catch (err) {
      return {
        status: false,
        result: {
          message: err?.message || "Gagal mengambil daftar suara"
        }
      };
    }
  }
  async _generateViaWss(payload) {
    const WS = WebSocket;
    const cookieHeader = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
    return new Promise((resolve, reject) => {
      console.log(`[PROSES] Membuka koneksi WSS: ${this.wss_url}...`);
      const ws = new WS(this.wss_url, {
        headers: {
          "User-Agent": this.client.defaults.headers["User-Agent"],
          Origin: this.base_url,
          Cookie: cookieHeader
        }
      });
      if ("binaryType" in ws) {
        ws.binaryType = "arraybuffer";
      }
      const audioChunks = [];
      const timeout = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        reject(new Error("Timeout: Server WSS tidak merespons dalam 35 detik"));
      }, 35e3);
      ws.onopen = () => {
        console.log("[PROSES] WSS tersambung, menunggu handshake...");
      };
      ws.onmessage = event => {
        const raw = event.data;
        if (raw instanceof ArrayBuffer || Buffer.isBuffer(raw)) {
          const buf = raw instanceof ArrayBuffer ? Buffer.from(raw) : raw;
          audioChunks.push(buf);
          return;
        }
        const msg = String(raw);
        if (msg.startsWith("0")) {
          ws.send("40");
        } else if (msg.includes('["ready"')) {
          console.log(`[PROSES] Server ready. Mengirim pesan generate-tts [${payload.voice} - ${payload.language}]...`);
          ws.send("42" + JSON.stringify(["generate-tts", payload]));
        } else if (msg.includes('["tts-done"')) {
          console.log(`[PROSES] Sinyal 'tts-done' diterima via WSS. Total chunk terkumpul: ${audioChunks.length}`);
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          const pcmBuffer = Buffer.concat(audioChunks);
          const wavBuffer = createWavBuffer(pcmBuffer, 24e3, 1, 16);
          resolve(wavBuffer);
        } else if (msg.includes('["tts-error"')) {
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          reject(new Error(`WSS Error: ${msg}`));
        } else if (msg === "2") {
          ws.send("3");
        }
      };
      ws.onerror = err => {
        clearTimeout(timeout);
        reject(new Error(`Koneksi WSS Error: ${err?.message || err}`));
      };
      ws.onclose = event => {
        if (audioChunks.length === 0 && !event.wasClean) {
          clearTimeout(timeout);
          reject(new Error(`Koneksi WSS terputus tidak normal (code: ${event.code})`));
        }
      };
    });
  }
  async create({
    text,
    voice = "Kore",
    lang = "indonesian",
    systemPrompt = "",
    ...rest
  } = {}) {
    try {
      const content = text ? String(text).trim() : "";
      if (!content) {
        return {
          status: false,
          result: {
            message: 'Parameter "text" tidak boleh kosong'
          }
        };
      }
      if (content.length > 1e4) {
        return {
          status: false,
          result: {
            message: "Maksimum panjang teks adalah 10.000 karakter"
          }
        };
      }
      const voiceObj = this.voices.find(v => v.name.toLowerCase() === String(voice).trim().toLowerCase());
      const selectedVoice = voiceObj ? voiceObj.name : "Kore";
      const selectedLang = this.languages.includes(String(lang).toLowerCase()) ? String(lang).toLowerCase() : "indonesian";
      await this.ini();
      const payload = {
        text: content,
        voice: selectedVoice,
        isProfile: false,
        systemPrompt: systemPrompt || undefined,
        locale: "en",
        mode: "public",
        language: selectedLang,
        tool: "tts"
      };
      console.log(`[PROSES] Memulai generate TTS via WSS (${selectedVoice} - ${selectedLang})...`);
      const wavBuffer = await this._generateViaWss(payload);
      if (!wavBuffer || wavBuffer.length <= 44) {
        throw new Error("Gagal menerima chunk audio dari server WSS.");
      }
      const base64Audio = wavBuffer.toString("base64");
      const audioUrl = `data:audio/wav;base64,${base64Audio}`;
      console.log(`[PROSES] Audio WAV berhasil dirakit. Ukuran: ${wavBuffer.length} bytes.`);
      return {
        status: true,
        result: {
          audio_url: audioUrl,
          audio_base64: base64Audio,
          buffer: wavBuffer,
          voice: selectedVoice,
          gender: voiceObj?.gender || "unknown",
          style: voiceObj?.style || "Standard",
          language: selectedLang,
          char_count: content.length,
          total_bytes: wavBuffer.length,
          format: "wav",
          sample_rate: 24e3
        }
      };
    } catch (err) {
      console.log(`[PROSES] Error generate TTS via WSS: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Gagal memproses AI Narrator TTS via WSS"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "voice_list", "voices", "quota"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: ["/?action=create&text=Halo+semuanya&voice=Kore&lang=indonesian", "/?action=create&text=Hello+world&voice=Algenib&lang=english", "/?action=voice_list&gender=female", "/?action=quota"]
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
  const api = new AiNarrator();
  try {
    let response;
    switch (action) {
      case "create": {
        if (!params.text || !String(params.text).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create({
          text: params.text,
          voice: params.voice,
          lang: params.lang,
          systemPrompt: params.systemPrompt,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = api.voice_list({
          gender: params.gender,
          ...params
        });
        break;
      }
      case "quota": {
        response = await api.quota();
        break;
      }
    }
    if (response && response.status) {
      if (response.result && response.result.buffer) {
        delete response.result.buffer;
      }
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.message || "Gagal memproses request ke AI Narrator API via WSS."
      });
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