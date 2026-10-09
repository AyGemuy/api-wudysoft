import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class ToolversalTTS {
  constructor() {
    this.base_url = "https://toolversal.com";
    this.page_url = `${this.base_url}/tools/anime-text-to-speech`;
    this.jar = {};
    this.csrf_token = "";
    this.cfg = {};
    this.is_ready = false;
    this.visitor_id = this.uid();
    this.device_id = this.dev();
    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
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
  }
  uid() {
    return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  dev() {
    return crypto.randomBytes(32).toString("hex");
  }
  hd(is_json = true) {
    return {
      "X-CSRF-TOKEN": this.csrf_token || "",
      "X-Requested-With": "XMLHttpRequest",
      Referer: this.page_url,
      Origin: this.base_url,
      Accept: is_json ? "application/json" : "application/json, audio/mpeg;q=0.9, */*;q=0.8"
    };
  }
  async ini() {
    if (this.is_ready) return true;
    try {
      console.log("[PROSES] Memulai inisialisasi session dan konfigurasi...");
      const res = await this.client.get("/tools/anime-text-to-speech");
      const $ = cheerio.load(res?.data || "");
      this.csrf_token = $('meta[name="csrf-token"]').attr("content") || "";
      const raw_cfg = $("#tts-engine-config").text();
      this.cfg = raw_cfg ? JSON.parse(raw_cfg) : {};
      this.is_ready = !!this.csrf_token;
      console.log(`[PROSES] Inisialisasi selesai. CSRF: ${this.csrf_token ? "Ditemukan" : "Gagal"}`);
      return this.is_ready;
    } catch (err) {
      console.log(`[PROSES] Error inisialisasi: ${err?.message || err}`);
      throw new Error(`Inisialisasi halaman gagal: ${err?.message || err}`);
    }
  }
  async cat_lang() {
    await this.ini();
    try {
      console.log("[PROSES] Mengambil katalog bahasa yang tersedia...");
      const res = await this.client.get("/tools/catalog-languages", {
        headers: this.hd(true)
      });
      return res?.data?.languages || [];
    } catch (err) {
      console.log(`[PROSES] Gagal mengambil katalog bahasa: ${err?.message || err}`);
      return [];
    }
  }
  async voice_list({
    lang,
    ...rest
  } = {}) {
    try {
      await this.ini();
      console.log("[PROSES] Menjalankan fungsi voice_list...");
      const languages = await this.cat_lang();
      const target_lang = lang ? lang.trim() : this.cfg?.defaultLang || "ja-JP";
      const is_valid_lang = languages.some(l => l.locale?.toLowerCase() === target_lang.toLowerCase());
      const final_lang = is_valid_lang ? target_lang : this.cfg?.defaultLang || "ja-JP";
      console.log(`[PROSES] Mengambil speaker untuk bahasa: ${final_lang}`);
      const res = await this.client.get(`/tools/get-voices?lang=${encodeURIComponent(final_lang)}`, {
        headers: this.hd(true)
      });
      const raw_voices = res?.data?.voices || [];
      const voices = raw_voices.map(v => ({
        name: v?.name || "",
        display_name: v?.displayName || "",
        local_name: v?.localName || "",
        gender: v?.gender || "",
        locale: v?.locale || "",
        voice_type: v?.voiceType || "",
        avatar_url: v?.avatarUrl || "",
        preview_url: v?.previewUrl || "",
        is_premium: v?.isPremium ?? false,
        styles: v?.styles || []
      }));
      return {
        status: true,
        result: {
          lang: final_lang,
          available_languages: languages.map(l => ({
            locale: l?.locale || "",
            name: l?.name || "",
            voice_count: l?.voiceCount || 0
          })),
          total_voices: voices.length,
          voices: voices
        }
      };
    } catch (err) {
      console.log(`[PROSES] Error voice_list: ${err?.message || err}`);
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
    voice = "ja-JP-NanamiNeural",
    lang,
    ...rest
  } = {}) {
    try {
      await this.ini();
      console.log("[PROSES] Menjalankan fungsi create (TTS)...");
      const content = text ? String(text).trim() : "";
      if (!content) {
        return {
          status: false,
          result: {
            message: "Teks tidak boleh kosong"
          }
        };
      }
      if (content.length > 800) {
        return {
          status: false,
          result: {
            message: "Maksimum panjang teks adalah 800 karakter"
          }
        };
      }
      let target_lang = lang ? lang.trim() : this.cfg?.defaultLang || "ja-JP";
      const v_res = await this.voice_list({
        lang: target_lang
      });
      let voice_pool = v_res?.result?.voices || [];
      let chosen_lang = v_res?.result?.lang || target_lang;
      let selected_voice = voice_pool.find(v => v.name?.toLowerCase() === voice?.toLowerCase());
      if (!selected_voice) {
        console.log(`[PROSES] Voice '${voice}' tidak ditemukan untuk '${chosen_lang}', fallback ke default`);
        selected_voice = voice_pool[0] || {
          name: this.cfg?.defaultVoice || "ja-JP-NanamiNeural"
        };
      }
      const voice_name = selected_voice?.name || (this.cfg?.defaultVoice || "ja-JP-NanamiNeural");
      const speed_rate = rest?.rate ? Number(rest.rate) : 1;
      const pitch_val = rest?.pitch ? Number(rest.pitch) : 1;
      const style_val = rest?.style ? String(rest.style) : "";
      const payload = {
        visitor_id: this.visitor_id,
        timezone: rest?.timezone || "Asia/Makassar",
        screen: rest?.screen || "1920x1080",
        page_url: this.page_url,
        tool_key: this.cfg?.filePrefix || "anime-tts",
        text: content,
        device_id: this.device_id,
        lang: chosen_lang,
        voice_name: voice_name,
        style: style_val,
        rate: speed_rate,
        pitch: pitch_val
      };
      console.log(`[PROSES] Mengirim request audio synthesize (${voice_name} - ${chosen_lang})...`);
      const audio_res = await this.client.post("/tools/generate-tts", payload, {
        headers: {
          ...this.hd(false),
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      });
      const audio_buffer = Buffer.from(audio_res?.data || []);
      if (!audio_buffer.length) {
        throw new Error("Data audio kosong dari server");
      }
      console.log(`[PROSES] Audio berhasil diterima (${audio_buffer.length} bytes). Mengunggah untuk tautan permanen...`);
      const form = new FormData();
      const file_name = `${this.cfg?.filePrefix || "anime-tts"}-tts-${Date.now()}.mp3`;
      const blob = new Blob([audio_buffer], {
        type: "audio/mpeg"
      });
      form.append("audio", blob, file_name);
      form.append("voice_info", JSON.stringify({
        voiceName: voice_name,
        voiceLang: chosen_lang,
        rate: speed_rate,
        pitch: pitch_val,
        timestamp: Date.now()
      }));
      let save_result = {};
      try {
        const save_res = await this.client.post("/tools/save-audio", form, {
          headers: {
            "X-CSRF-TOKEN": this.csrf_token,
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json"
          }
        });
        save_result = save_res?.data || {};
      } catch (save_err) {
        console.log(`[PROSES] Simpan ke server dilewati / gagal: ${save_err?.message || save_err}`);
      }
      console.log("[PROSES] TTS selesai diproses.");
      return {
        status: true,
        result: {
          file_name: save_result?.file_name || file_name,
          file_size: save_result?.file_size || audio_buffer.length,
          public_url: save_result?.public_url || null,
          download_url: save_result?.download_url || null,
          lang: chosen_lang,
          voice: voice_name,
          rate: speed_rate,
          pitch: pitch_val,
          audio_base64: audio_buffer.toString("base64")
        }
      };
    } catch (err) {
      console.log(`[PROSES] Error generate TTS: ${err?.message || err}`);
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
        examples: ["/?action=create&text=Konnichiwa&lang=ja-JP&voice=ja-JP-NanamiNeural", "/?action=voice_list&lang=ja-JP"]
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
  const api = new ToolversalTTS();
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
          rate: params.rate ? parseFloat(params.rate) : 1,
          pitch: params.pitch ? parseFloat(params.pitch) : 1,
          style: params.style || "",
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
        error: response?.result?.message || "Gagal memproses request ke Toolversal TTS."
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