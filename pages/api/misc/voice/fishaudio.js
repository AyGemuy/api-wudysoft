import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
import crypto from "crypto";

let cachedVoices = null;

class FishAudio {
  constructor() {
    this.backendUrl = "https://fishaudiobackend-production.up.railway.app";
    this.bucket = "stn2_hs_us";
    this.gcsBase = "https://hardstonepte.ltd/hs-us/";
    this.knownCategories = [
      "all",
      "trending",
      "Anime",
      "Cartoon",
      "Celebrity",
      "Character",
      "Conversational",
      "Custom",
      "Entertainment",
      "Fictional",
      "Gaming",
      "Narrator",
      "News",
      "Storytelling",
      "Youtuber"
    ];
  }

  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }

  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }

  gen_uuid_v4() {
    return crypto.randomUUID();
  }

  ctx(state) {
    const d = this.b64d(state);
    return {
      device_id: d?.device_id || this.gen_uuid_v4(),
      initialized: Boolean(d?.initialized),
      user_data: d?.user_data || null
    };
  }

  async init_user(deviceId) {
    console.log(`[AUTH] Inisialisasi deviceId (${deviceId}) via POST /user/init...`);
    const res = await axios({
      method: "post",
      url: `${this.backendUrl}/user/init`,
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        deviceId
      },
      validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 300) {
      const errMsg = typeof res.data === "string" ? res.data : JSON.stringify(res.data || {});
      throw new Error(`User initialization failed (${res.status}): ${errMsg}`);
    }

    return res.data?.data ?? res.data;
  }

  async ensure_c(state, forceNew = false) {
    const c = this.ctx(state);
    if (forceNew) {
      c.device_id = this.gen_uuid_v4();
      c.initialized = false;
      c.user_data = null;
    }

    if (!c.initialized) {
      const userData = await this.init_user(c.device_id);
      c.initialized = true;
      c.user_data = userData || null;
      console.log(`[AUTH] Sukses inisialisasi deviceId: ${c.device_id}`);
    }

    return c;
  }

  async fetch_all_voices(forceRefresh = false) {
    if (cachedVoices && !forceRefresh) return cachedVoices;

    console.log("[VOICES] Mengambil daftar suara dari /voices...");
    const res = await axios({
      method: "get",
      url: `${this.backendUrl}/voices`,
      validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Failed to fetch voices (${res.status})`);
    }

    cachedVoices = res.data?.data?.items || [];
    return cachedVoices;
  }

  async resolve_voice(voiceInput) {
    if (!voiceInput || typeof voiceInput !== "string" || !voiceInput.trim()) {
      throw new Error("Voice/model wajib diisi. Gunakan action 'search_voice' untuk mencari suara.");
    }

    const clean = voiceInput.trim();
    const lower = clean.toLowerCase();

    if (/^[a-f0-9]{32}$/i.test(clean)) {
      return {
        id: clean,
        name: clean
      };
    }

    const voices = await this.fetch_all_voices();

    const exactName = voices.find((v) => v.name && v.name.toLowerCase() === lower);
    if (exactName) return exactName;

    const exactId = voices.find((v) => v.id && v.id.toLowerCase() === lower);
    if (exactId) return exactId;

    const partial = voices.find((v) => v.name && v.name.toLowerCase().includes(lower));
    if (partial) return partial;

    throw new Error(`Voice '${clean}' tidak ditemukan. Gunakan action 'search_voice' untuk mencari suara.`);
  }

  async upload_audio_buffer(buffer) {
    const dateStr = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
    const fileUuid = this.gen_uuid_v4();
    const objectName = `tts/audio/${dateStr}/${fileUuid}.mp3`;
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucket}/o?name=${encodeURIComponent(objectName)}`;

    console.log(`[UPLOAD] Mengunggah audio (${buffer.length} bytes) ke CDN...`);
    const res = await axios({
      method: "post",
      url: uploadUrl,
      headers: {
        "Content-Type": "audio/mpeg"
      },
      data: buffer,
      validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Failed to upload audio to CDN (${res.status})`);
    }

    return `${this.gcsBase}${objectName}`;
  }

  async reg_dev({ state, force = false } = {}) {
    let c = null;
    try {
      const shouldForce = force === true || force === "true";
      c = await this.ensure_c(state, shouldForce);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          device_id: c.device_id,
          initialized: c.initialized,
          user_data: c.user_data
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_reg_dev"
        },
        state: b64,
        State: b64
      };
    }
  }

  async list_voice({ state, category = "all", cat, refresh = false } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const categoryInput = String(cat || category || "all").trim();
      const catLower = categoryInput.toLowerCase();
      const matchedCat = this.knownCategories.find((item) => item.toLowerCase() === catLower);

      if (!matchedCat) {
        return {
          status: false,
          result: {
            error: `Kategori '${categoryInput}' tidak valid.`,
            categories: this.knownCategories
          },
          state: b64,
          State: b64
        };
      }

      const voices = await this.fetch_all_voices(refresh === true || refresh === "true");
      let results = [];

      if (matchedCat === "all") {
        results = voices;
      } else if (matchedCat === "trending") {
        results = [...voices].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      } else {
        results = voices.filter((v) => v.category && v.category.toLowerCase() === catLower);
      }

      return {
        status: true,
        result: {
          category: matchedCat,
          total: results.length,
          voices: results.map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category || "Custom",
            language: v.language || "en",
            usageCount: v.usageCount || 0,
            sample: v.sampleUrl || null
          }))
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_list_voice"
        },
        state: b64,
        State: b64
      };
    }
  }

  async search_voice({ state, query, q, search, keyword, refresh = false } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const rawQuery = query ?? q ?? search ?? keyword;

      if (!rawQuery || !String(rawQuery).trim()) {
        return {
          status: false,
          result: {
            error: "Parameter 'query' (atau 'q'/'search') wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const cleanQuery = String(rawQuery).trim();
      const lower = cleanQuery.toLowerCase();
      const voices = await this.fetch_all_voices(refresh === true || refresh === "true");

      const filtered = voices.filter(
        (v) =>
          (v.name && v.name.toLowerCase().includes(lower)) ||
          (v.category && v.category.toLowerCase().includes(lower)) ||
          (v.language && v.language.toLowerCase().includes(lower)) ||
          (Array.isArray(v.tags) && v.tags.some((t) => String(t).toLowerCase().includes(lower))) ||
          (v.description && v.description.toLowerCase().includes(lower))
      );

      return {
        status: true,
        result: {
          query: cleanQuery,
          total: filtered.length,
          voices: filtered.map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category || "Custom",
            language: v.language || "en",
            sample: v.sampleUrl || null
          }))
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_search_voice"
        },
        state: b64,
        State: b64
      };
    }
  }

  async voice_detail({ state, voice, voice_id, id, name } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const voiceInput = voice || voice_id || id || name;

      if (!voiceInput) {
        return {
          status: false,
          result: {
            error: "Parameter 'voice' (atau 'voice_id'/'id') wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const resolved = await this.resolve_voice(String(voiceInput));
      console.log(`[VOICE] Mengambil detail suara: ${resolved.id}...`);

      const res = await axios({
        method: "post",
        url: `${this.backendUrl}/voice/get`,
        headers: {
          "Content-Type": "application/json"
        },
        data: {
          id: resolved.id
        },
        validateStatus: () => true
      });

      if (res.status < 200 || res.status >= 300) {
        return {
          status: false,
          result: {
            error: `Failed to fetch voice details (${res.status})`
          },
          state: b64,
          State: b64
        };
      }

      return {
        status: true,
        result: res.data?.data ?? res.data,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_voice_detail"
        },
        state: b64,
        State: b64
      };
    }
  }

  async tts({ state, text, voice, voice_id, id, speed = 1.0, temperature, temp } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      let b64 = this.b64e(c);

      if (!text || !String(text).trim()) {
        return {
          status: false,
          result: {
            error: "Parameter 'text' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const voiceInput = voice || voice_id || id;
      if (!voiceInput || !String(voiceInput).trim()) {
        return {
          status: false,
          result: {
            error: "Parameter 'voice' (nama atau ID) wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const parsedSpeed = Number(speed);
      const finalSpeed = Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 1.0;

      const rawTemp = temperature !== undefined ? temperature : temp;
      const parsedTemp = rawTemp !== undefined ? Number(rawTemp) : 0.7;
      const finalTemp = Number.isFinite(parsedTemp) ? parsedTemp : 0.7;

      const matchedVoice = await this.resolve_voice(String(voiceInput));
      const voiceId = matchedVoice.id;

      const sendGenerate = async (devId) => {
        console.log(`[TTS] Generate speech (voice=${voiceId}, speed=${finalSpeed}, temp=${finalTemp})...`);
        return await axios({
          method: "post",
          url: `${this.backendUrl}/speech/generate`,
          headers: {
            "Content-Type": "application/json",
            "x-device-id": devId
          },
          data: {
            text: String(text).trim(),
            voiceId,
            speed: finalSpeed,
            temperature: finalTemp
          },
          responseType: "arraybuffer",
          validateStatus: () => true
        });
      };

      let res = await sendGenerate(c.device_id);

      if (res.status === 400 || res.status === 404 || res.status === 403) {
        console.warn(`[TTS ${res.status}] Device ditolak/limit. Rotasi deviceId baru...`);
        c = await this.ensure_c(null, true);
        b64 = this.b64e(c);
        res = await sendGenerate(c.device_id);
      }

      if (res.status < 200 || res.status >= 300) {
        const errText = Buffer.from(res.data || "").toString("utf-8");
        return {
          status: false,
          result: {
            error: `TTS generation failed (${res.status}): ${errText}`
          },
          state: b64,
          State: b64
        };
      }

      const buffer = Buffer.from(res.data);
      const directLink = await this.upload_audio_buffer(buffer);

      const durationHeader = res.headers["x-duration"];
      const voiceNameHeader = res.headers["x-voice-name"];

      return {
        status: true,
        result: {
          voice: voiceNameHeader ? decodeURIComponent(voiceNameHeader) : matchedVoice.name,
          voiceId,
          duration: durationHeader ? parseFloat(durationHeader) : null,
          url: directLink
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_tts"
        },
        state: b64,
        State: b64
      };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = ["reg_dev", "list_voice", "search_voice", "voice_detail", "tts"];
  const api = new FishAudio();

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      categories: api.knownCategories,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          list_voice: "/?action=list_voice&category=trending",
          search_voice: "/?action=search_voice&query=Trump",
          voice_detail: "/?action=voice_detail&voice=Donald+Trump",
          tts: "/?action=tts&text=Halo+Dunia&voice=Donald+Trump&speed=1.0&temperature=0.7"
        }
      }
    });
  }

  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions
    });
  }

  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "list_voice":
        response = await api.list_voice(params);
        break;
      case "search_voice": {
        const query = params.query ?? params.q ?? params.search ?? params.keyword;
        if (!query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' (atau 'q'/'search') wajib diisi."
          });
        }
        response = await api.search_voice(params);
        break;
      }
      case "voice_detail": {
        const voice = params.voice || params.voice_id || params.id || params.name;
        if (!voice) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'voice' (atau 'voice_id'/'id') wajib diisi."
          });
        }
        response = await api.voice_detail(params);
        break;
      }
      case "tts": {
        const text = params.text;
        const voice = params.voice || params.voice_id || params.id;
        if (!text || !voice) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' dan 'voice' (atau 'voice_id'/'id') wajib diisi."
          });
        }
        response = await api.tts(params);
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }

    if (!response || response?.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada server Fish Audio.",
        result: response?.result || null,
        state: response?.state || null
      });
    }

    return res.status(200).json({
      action,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));