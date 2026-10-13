import axios from "axios";
import * as cheerio from "cheerio";

class AiVoiceGenerator {
  constructor() {
    this.base_url = "https://aivoicegenerator.com";
    this.jar = {};
    this.cache = {};

    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 35e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"'
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

  hd(ref = "") {
    try {
      return {
        "X-Requested-With": "XMLHttpRequest",
        Referer: ref ? (ref.startsWith("http") ? ref : `${this.base_url}${ref}`) : `${this.base_url}/`,
        Origin: this.base_url,
        Accept: "*/*"
      };
    } catch (err) {
      console.log(`[ERROR] hd: ${err?.message}`);
      return {};
    }
  }

  val_str(v, name, req = !0) {
    try {
      const clean = v !== undefined && v !== null ? String(v).trim() : "";
      if (req && !clean) throw new Error(`Parameter "${name}" wajib diisi dan tidak boleh kosong.`);
      return clean;
    } catch (err) {
      console.log(`[ERROR] val_str: ${err?.message}`);
      throw err;
    }
  }

  async ini() {
    try {
      if (this.cache["home"]) return this.cache["home"];
      console.log("[PROSES] Inisialisasi landing page untuk CSRF Token...");

      const res = await this.client.get("/", {
        headers: {
          "Upgrade-Insecure-Requests": "1"
        }
      });

      const $ = cheerio.load(res?.data || "");
      const csrf = $('input[name="csrf_test_name"]').val() || "";

      if (!csrf) {
        throw new Error("Gagal mengekstrak csrf_test_name dari halaman utama.");
      }

      this.cache["home"] = {
        csrf: csrf
      };

      console.log(`[PROSES] Inisialisasi sukses. CSRF: ${csrf}`);
      return this.cache["home"];
    } catch (err) {
      console.log(`[ERROR] Inisialisasi gagal: ${err?.message || err}`);
      throw new Error(`Inisialisasi halaman gagal: ${err?.message || err}`);
    }
  }

  async voice_list({ lang, ...rest } = {}) {
    try {
      console.log("[PROSES] Mengambil voice_list dari server...");
      const target_lang = lang ? this.val_str(lang, "lang", !1) : "";

      if (!this.cache["voices"]) {
        const res = await this.client.get("/home/tryme_voice/", {
          headers: {
            ...this.hd("/"),
            Accept: "application/json, text/javascript, */*; q=0.01"
          }
        });

        const list = Array.isArray(res?.data) ? res.data : [];
        if (!list.length) throw new Error("Daftar suara kosong dari server.");
        this.cache["voices"] = list;
      }

      let voices = this.cache["voices"];
      if (target_lang) {
        voices = voices.filter(
          v =>
            v?.languageCode?.toLowerCase() === target_lang.toLowerCase() ||
            v?.languageName?.toLowerCase().includes(target_lang.toLowerCase())
        );
      }

      const languages = [];
      const seen = new Set();
      this.cache["voices"].forEach(v => {
        if (v?.languageCode && !seen.has(v.languageCode)) {
          seen.add(v.languageCode);
          languages.push({
            code: v.languageCode,
            name: v.languageName
          });
        }
      });

      return {
        status: true,
        result: {
          total_voices: voices.length,
          voices: voices,
          languages: languages
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

  async create({
    text,
    voice = "xoCrBu0Re6807a59702179cfa9e078954784f43e7uPjtUJeN0_neural",
    lang = "jv-ID",
    ...rest
  } = {}) {
    try {
      const content = this.val_str(text, "text", !0);
      const voice_input = this.val_str(voice, "voice", !0);
      const lang_input = this.val_str(lang, "lang", !0);

      if (content.length > 3000) {
        throw new Error("Panjang teks melebihi batas maksimal 3000 karakter.");
      }

      if (!this.cache["voices"]) {
        await this.voice_list();
      }

      const raw_voices = this.cache["voices"] || [];
      const matched_by_id = raw_voices.find(v => v.ids === voice_input);
      const matched_by_name = raw_voices.find(
        v =>
          v.name.toLowerCase() === voice_input.toLowerCase() &&
          (v.languageCode.toLowerCase() === lang_input.toLowerCase() || v.languageName.toLowerCase().includes(lang_input.toLowerCase()))
      ) || raw_voices.find(v => v.name.toLowerCase() === voice_input.toLowerCase());

      const selected_voice = matched_by_id || matched_by_name;

      if (!selected_voice) {
        const sample_avail = raw_voices.slice(0, 10).map(v => `${v.name} (${v.languageCode})`).join(", ");
        throw new Error(`Voice "${voice_input}" tidak ditemukan. Contoh tersedia: ${sample_avail}, dll.`);
      }

      const page_data = await this.ini();
      const active_voice_id = selected_voice.ids;
      const active_lang = selected_voice.languageCode || lang_input;

      console.log(`[PROSES] Sintesis suara untuk "${content.slice(0, 30)}..." [Voice: ${selected_voice.name}, Lang: ${active_lang}]`);

      const form = new URLSearchParams();
      form.append("csrf_test_name", page_data.csrf);
      form.append("front_tryme_language", active_lang);
      form.append("front_tryme_voice", active_voice_id);
      form.append("front_tryme_text", content);

      const res = await this.client.post("/home/tryme_action/", form.toString(), {
        headers: {
          ...this.hd("/"),
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });

      const res_data = res?.data || {};

      if (!res_data?.result || !res_data?.tts_uri) {
        throw new Error(res_data?.message || "Gagal memproses sintesis audio.");
      }

      const audio_url = res_data.tts_uri;
      console.log(`[PROSES] Mengunduh hasil audio: ${audio_url}`);

      const audio_res = await axios.get(audio_url, {
        responseType: "arraybuffer",
        timeout: 35e3
      });

      const audio_buf = Buffer.from(audio_res?.data || "");
      if (!audio_buf.length) {
        throw new Error("Buffer audio kosong dari CDN audio penyedia.");
      }

      const audio_b64 = audio_buf.toString("base64");
      console.log(`[PROSES] Audio berhasil diproses (${audio_buf.length} bytes).`);

      return {
        status: true,
        result: {
          voice_id: active_voice_id,
          voice_name: selected_voice.name,
          engine: selected_voice.engine,
          gender: selected_voice.gender,
          language: active_lang,
          language_name: selected_voice.languageName,
          char_count: content.length,
          audio_url: audio_url,
          audio_format: "mp3",
          audio_base64: audio_b64,
          data_uri: `data:audio/mp3;base64,${audio_b64}`
        }
      };
    } catch (err) {
      console.log(`[ERROR] Generate TTS: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.response?.data?.message || err?.message || "Gagal memproses speech synthesis"
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
    const validActions = ["create", "voice_list", "voices"];

    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: [
            "/?action=create&text=Halo+dunia&voice=Tuti&lang=su-ID",
            "/?action=create&text=Apa+kabar&voice=xoCrBu0Re6807a59702179cfa9e078954784f43e7uPjtUJeN0_neural&lang=jv-ID",
            "/?action=voice_list&lang=id-ID"
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

    const api = new AiVoiceGenerator();
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
          voice: params.voice !== undefined ? params.voice : "xoCrBu0Re6807a59702179cfa9e078954784f43e7uPjtUJeN0_neural",
          lang: params.lang || "jv-ID",
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice_list({
          lang: params.lang,
          ...params
        });
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
        error: response?.result?.message || "Gagal memproses request ke AiVoiceGenerator."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada handler:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}