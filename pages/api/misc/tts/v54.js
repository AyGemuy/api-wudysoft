import axios from "axios";
import * as cheerio from "cheerio";
class AnyToSpeech {
  constructor() {
    this.base_url = "https://anytospeech.com";
    this.jar = {};
    this.is_ready = false;
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
  hd(ref = "") {
    return {
      "X-Requested-With": "XMLHttpRequest",
      Referer: ref ? ref.startsWith("http") ? ref : `${this.base_url}${ref}` : this.base_url,
      Origin: this.base_url,
      Accept: "*/*"
    };
  }
  furl(path = "") {
    if (!path) return "";
    return path.startsWith("http") ? path : `${this.base_url}${path.startsWith("/") ? "" : "/"}${path}`;
  }
  async ini(path = "/text-to-speech/english") {
    if (this.is_ready) return true;
    try {
      console.log(`[PROSES] Inisialisasi halaman ${path}...`);
      await this.client.get(path);
      this.is_ready = true;
      console.log("[PROSES] Inisialisasi session & cookie berhasil.");
      return true;
    } catch (err) {
      console.log(`[PROSES] Inisialisasi gagal: ${err?.message || err}`);
      throw new Error(`Inisialisasi halaman gagal: ${err?.message || err}`);
    }
  }
  async voice_list({
    anime = false,
    lang = "english",
    ...rest
  } = {}) {
    try {
      const is_anime = String(anime) === "true";
      console.log(`[PROSES] Mengambil voice_list (Mode Anime: ${is_anime ? "ON" : "OFF"})...`);
      if (is_anime) {
        await this.ini("/ai-voice-generator");
        const res = await this.client.get("/ai-voice-generator");
        const $ = cheerio.load(res?.data || "");
        const voices = [];
        $(".fvh-card").each((_, el) => {
          const href = $(el).attr("href") || "";
          const slug = href.replace("/ai-voice-generator/", "").trim();
          const name = $(el).find(".fvh-body h2").text().trim();
          const desc = $(el).find(".fvh-body p").text().trim();
          const sample = $(el).find(".fvh-play").attr("data-sample") || "";
          const is_anime_voice = slug.includes("anime") || slug.includes("hero") || slug.includes("girl");
          if (slug) {
            voices.push({
              slug: slug,
              display_name: name || slug,
              description: desc || "",
              sample_url: this.furl(sample),
              is_anime_character: is_anime_voice
            });
          }
        });
        return {
          status: true,
          result: {
            mode: "famous_or_anime",
            total_voices: voices.length,
            voices: voices
          }
        };
      } else {
        const target_lang = lang ? lang.trim().toLowerCase() : "english";
        const page_path = `/text-to-speech/${target_lang}`;
        await this.ini(page_path);
        const res = await this.client.get(page_path);
        const $ = cheerio.load(res?.data || "");
        const voices = [];
        $(".voice-option").each((_, el) => {
          const voice = $(el).attr("data-voice") || "";
          const display_name = $(el).attr("data-display-name") || voice;
          const provider = $(el).attr("data-provider") || "gemini";
          const category = $(el).attr("data-vd-category") || "standard";
          const gender = $(el).attr("data-gender") || "";
          const locale = $(el).attr("data-lang") || "en";
          const vibe = $(el).attr("data-vibe") || "";
          const desc = $(el).find(".voice-option-desc").text().trim();
          const sample = $(el).attr("data-sample-path") || "";
          if (voice) {
            voices.push({
              voice: voice,
              display_name: display_name,
              category: category,
              provider: provider,
              gender: gender,
              lang: locale,
              vibe: vibe,
              description: desc,
              sample_url: this.furl(sample)
            });
          }
        });
        return {
          status: true,
          result: {
            mode: "standard",
            lang: target_lang,
            total_voices: voices.length,
            voices: voices
          }
        };
      }
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
    anime = false,
    voice,
    lang,
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
      if (content.length > 500) {
        return {
          status: false,
          result: {
            message: "Maksimum panjang teks adalah 500 karakter"
          }
        };
      }
      const is_anime = String(anime) === "true";
      console.log(`[PROSES] Memulai TTS (Anime Mode: ${is_anime ? "ON" : "OFF"})...`);
      if (is_anime) {
        const slug = rest?.slug || voice || "anime-girl";
        const ref_path = `/ai-voice-generator/${slug}`;
        await this.ini(ref_path);
        console.log(`[PROSES] Mengirim request Famous/Anime Voice [${slug}]...`);
        const payload = {
          slug: slug,
          text: content
        };
        const res = await this.client.post("/api/tools/famous-voice", payload, {
          headers: {
            ...this.hd(ref_path),
            "Content-Type": "application/json"
          }
        });
        const data = res?.data || {};
        if (!data?.audioUrl) {
          throw new Error(data?.error || data?.message || "Gagal membuat audio anime voice");
        }
        console.log("[PROSES] Audio anime voice berhasil dibuat.");
        return {
          status: true,
          result: {
            audio_url: this.furl(data.audioUrl),
            slug: data?.slug || slug,
            char_count: data?.charCount || content.length,
            word_count: data?.wordCount || 0,
            truncated: data?.truncated ?? false,
            max_chars: data?.maxChars || 500,
            max_words: data?.maxWords || 75,
            credits_charged: data?.creditsCharged || 0
          }
        };
      } else {
        const selected_lang = lang ? lang.trim().toLowerCase() : "english";
        const ref_path = `/text-to-speech/${selected_lang}`;
        await this.ini(ref_path);
        const voice_name = voice || "Kore";
        const provider_name = rest?.provider || "gemini";
        const vibe_name = rest?.vibe || "none";
        const locale_code = rest?.language || "id";
        console.log(`[PROSES] Mengirim request Standard TTS [${voice_name} - ${provider_name}]...`);
        const payload = {
          slug: selected_lang,
          text: content,
          voice: voice_name,
          vibe: vibe_name,
          provider: provider_name,
          language: locale_code,
          uiLocale: rest?.uiLocale || "en"
        };
        const res = await this.client.post("/api/tools/tts-use-case", payload, {
          headers: {
            ...this.hd(ref_path),
            "Content-Type": "application/json"
          }
        });
        const data = res?.data || {};
        if (!data?.audioUrl) {
          throw new Error(data?.error || data?.message || "Gagal memproses speech synthesis");
        }
        console.log("[PROSES] Audio standard TTS berhasil dibuat.");
        return {
          status: true,
          result: {
            audio_url: this.furl(data.audioUrl),
            voice: data?.voice || voice_name,
            vibe: data?.vibe || vibe_name,
            provider: data?.provider || provider_name,
            language: data?.language || selected_lang,
            char_count: data?.charCount || content.length,
            word_count: data?.wordCount || 0,
            truncated: data?.truncated ?? false,
            max_chars: data?.maxChars || 500,
            max_words: data?.maxWords || 75
          }
        };
      }
    } catch (err) {
      console.log(`[PROSES] Error generate TTS: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.response?.data?.message || err?.message || "Gagal memproses request TTS"
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
        examples: ["/?action=create&text=Hello&anime=true&voice=anime-girl", "/?action=create&text=Hello&anime=false&voice=Kore&lang=english", "/?action=voice_list&anime=true", "/?action=voice_list&anime=false&lang=english"]
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
  const api = new AnyToSpeech();
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
          anime: params.anime === "true" || params.anime === true,
          voice: params.voice,
          lang: params.lang,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice_list({
          anime: params.anime === "true" || params.anime === true,
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
        error: response?.result?.message || "Gagal memproses request ke AnyToSpeech API."
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