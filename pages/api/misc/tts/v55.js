import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class AnyVoiceLab {
  constructor() {
    this.base_url = "https://anyvoicelab.com";
    this.jar = {};
    this.cache = {};
    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 35e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
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
  hd(ref = "") {
    return {
      "X-Requested-With": "XMLHttpRequest",
      Referer: ref ? ref.startsWith("http") ? ref : `${this.base_url}${ref}` : this.base_url,
      Origin: this.base_url,
      Accept: "*/*"
    };
  }
  p_idx(val = 0) {
    if (typeof val === "number") return val;
    const match = String(val).match(/\d+/);
    return match ? Math.max(0, parseInt(match[0], 10) - (String(val).toLowerCase().includes("voice") ? 1 : 0)) : 0;
  }
  async ini(slug = "anime-girl") {
    const clean_slug = slug ? slug.trim().toLowerCase() : "anime-girl";
    if (this.cache[clean_slug]) return this.cache[clean_slug];
    try {
      console.log(`[PROSES] Inisialisasi halaman suara: /voices/${clean_slug}/`);
      const res = await this.client.get(`/voices/${clean_slug}/`);
      const $ = cheerio.load(res?.data || "");
      const nonce = $("#tts_voice_nonce").val() || "";
      const voice_id = $("#tts-voice-id").val() || "";
      const max_chars = parseInt($("#to-convert-text").attr("data-max-characters") || "400", 10);
      const voices = [];
      $(".voice-selector-item").each((_, el) => {
        const idx = parseInt($(el).attr("data-voice-index") || "0", 10);
        const vid = $(el).attr("data-voice-id") || voice_id;
        const name = $(el).find(".voice-selector-item-name").text().trim() || `Voice ${idx + 1}`;
        const sample = $(el).find("audio source").attr("src") || "";
        voices.push({
          index: idx,
          voice_id: vid,
          display_name: name,
          sample_url: sample
        });
      });
      const languages = [];
      $(".language-selector-select option").each((_, el) => {
        const code = $(el).val() || "";
        const name = $(el).text().trim() || "";
        if (code) languages.push({
          code: code,
          name: name
        });
      });
      if (!nonce || !voice_id) {
        throw new Error("Gagal mengekstrak nonce atau voice_id dari halaman.");
      }
      this.cache[clean_slug] = {
        nonce: nonce,
        voice_id: voice_id,
        max_chars: max_chars,
        voices: voices,
        languages: languages
      };
      console.log(`[PROSES] Ekstraksi sukses. ID: ${voice_id}, Nonce: ${nonce}`);
      return this.cache[clean_slug];
    } catch (err) {
      console.log(`[PROSES] Inisialisasi gagal: ${err?.message || err}`);
      throw new Error(`Inisialisasi halaman gagal: ${err?.message || err}`);
    }
  }
  async voice_list({
    slug = "anime-girl",
    lang,
    ...rest
  } = {}) {
    try {
      console.log(`[PROSES] Mengambil voice_list untuk slug "${slug}"...`);
      const page_data = await this.ini(slug);
      return {
        status: true,
        result: {
          slug: slug,
          voice_id: page_data.voice_id,
          max_characters: page_data.max_chars,
          total_variants: page_data.voices.length,
          voices: page_data.voices,
          languages: page_data.languages
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
    voice = 0,
    lang = "en",
    slug = "anime-girl",
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
      const target_slug = slug ? slug.trim().toLowerCase() : "anime-girl";
      const page_data = await this.ini(target_slug);
      if (content.length > page_data.max_chars) {
        return {
          status: false,
          result: {
            message: `Teks melebihi batas gratis (${page_data.max_chars} karakter)`
          }
        };
      }
      const parsed_index = this.p_idx(voice);
      const selected_variant = page_data.voices.find(v => v.index === parsed_index) || page_data.voices[0];
      const voice_index = selected_variant ? selected_variant.index : 0;
      const is_valid_lang = page_data.languages.some(l => l.code.toLowerCase() === String(lang).toLowerCase());
      const chosen_lang = is_valid_lang ? String(lang).toLowerCase() : "en";
      console.log(`[PROSES] Mendapatkan worker token untuk "${target_slug}" (Voice: ${voice_index}, Lang: ${chosen_lang})...`);
      const form = new FormData();
      form.append("tts_voice_nonce", page_data.nonce);
      form.append("action", "mint_tts_worker_token");
      form.append("tts_voice_id", page_data.voice_id);
      form.append("voice_index", String(voice_index));
      form.append("language", chosen_lang);
      form.append("chunk_count", "1");
      form.append("cursor", "0");
      form.append("form", "standard");
      const token_res = await this.client.post("/wp-admin/admin-ajax.php", form, {
        headers: {
          ...this.hd(`/voices/${target_slug}/`),
          ...form.getHeaders()
        }
      });
      const token_data = token_res?.data?.data || {};
      if (!token_res?.data?.success || !token_data?.token || !token_data?.url) {
        throw new Error(token_res?.data?.data?.message || "Gagal memproses token gateway");
      }
      const gateway_url = token_data.url;
      console.log(`[PROSES] Menghubungi gateway audio (${gateway_url})...`);
      const gateway_payload = {
        token: token_data.token,
        chunks: [content],
        ref_audio_base64: null
      };
      const audio_res = await axios.post(gateway_url, gateway_payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: this.base_url,
          Referer: `${this.base_url}/`
        },
        timeout: 4e4
      });
      const raw_audio_data = audio_res?.data || {};
      const audio_b64 = Array.isArray(raw_audio_data) ? raw_audio_data[0]?.audio_base64 || "" : raw_audio_data?.audio_base64 || "";
      if (!audio_b64) {
        throw new Error("Audio binary/base64 kosong dari server gateway");
      }
      console.log("[PROSES] Sintesis audio selesai.");
      return {
        status: true,
        result: {
          slug: target_slug,
          voice_index: voice_index,
          display_name: selected_variant?.display_name || `Voice ${voice_index + 1}`,
          language: chosen_lang,
          char_count: content.length,
          audio_format: "wav",
          audio_base64: audio_b64,
          data_uri: `data:audio/wav;base64,${audio_b64}`
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
        examples: ["/?action=create&text=Halo+dunia&slug=anime-girl&voice=0&lang=id", "/?action=voice_list&slug=anime-girl"]
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
  const api = new AnyVoiceLab();
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
          slug: params.slug || "anime-girl",
          voice: params.voice !== undefined ? params.voice : 0,
          lang: params.lang || "en",
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice_list({
          slug: params.slug || "anime-girl",
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
        error: response?.result?.message || "Gagal memproses request ke AnyVoiceLab."
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