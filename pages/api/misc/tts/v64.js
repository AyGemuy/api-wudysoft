import axios from "axios";
const RAW_VOICES = `
Clone|United States||english|en-US|cloning|commercial
Adam|United States|male|english|en-US|kokoro|commercial
Heart|United States|female|english|en-US|kokoro|commercial
Elon Musk|United States|male|english|en-US|kokoro|famous;political
Donald Trump|United States|male|english|en-US|kokoro|famous;political
Messi|Argentina|male|english|en-US|kokoro|famous;political
Ronaldo|Portugal|male|english|en-US|kokoro|famous;political
Batman|United States|male|english|en-US|kokoro|famous
Albert Einstein|Germany|male|english|en-US|kokoro|famous
Simba|United States|male|english|en-US|kokoro|famous
Peter Graffin|United States|male|english|en-US|kokoro|famous
Rick Sanchez|United States|male|english|en-US|kokoro|famous
Morty Smith|United States|male|english|en-US|kokoro|famous
Bill Gates|United States|male|english|en-US|kokoro|famous;political
Godfather|United States|male|english|en-US|kokoro|famous
Steve Jobs|United States|male|english|en-US|kokoro|famous
Martin Luther King Jr.|United States|male|english|en-US|kokoro|famous
Pope Leo XIV|United States|male|english|en-US|kokoro|famous;political
Narendra Modi|India|male|english|en-IN|kokoro|famous;political
Jawaharlal Nehru|India|male|english|en-IN|kokoro|famous
Mahatma Gandhi|India|male|english|en-IN|kokoro|famous
Alba|United States|male|english|en-US|kokoro|commercial
Marius|United States|male|english|en-US|kokoro|commercial
Javert|United States|male|english|en-US|kokoro|commercial
Fantine|United States|female|english|en-US|kokoro|commercial
Cosette|United States|female|english|en-US|kokoro|commercial
Bella|United States|female|english|en-US|kokoro|commercial
River|United States|female|english|en-US|kokoro|commercial
Nicole|United States|female|english|en-US|kokoro|commercial
Priya|India|female|hindi|hi|kokoro|commercial
Vikas|India|male|hindi|hi|kokoro|commercial
Anita|India|female|hindi|hi|kokoro|commercial
Ram|India|male|hindi|hi|kokoro|commercial
Simran|India|female|hindi|hi|ai4|ai4;commercial
Yatika|India|female|assamese|hi|ai4|ai4;commercial
Michael|United States|male|english|en-US|kokoro|commercial
Kore|United States|female|english|en-US|kokoro|commercial
Eric|United States|male|english|en-US|kokoro|commercial
Jessica|United States|female|english|en-US|kokoro|commercial
Nova|United States|female|english|en-US|kokoro|commercial
Sarah|United States|female|english|en-US|kokoro|commercial
Rajesh|India|male|Sanskrit|hi|ai4|ai4;commercial
Keya|India|female|Nepali|hi|ai4|ai4;commercial
Jiya|India|female|Marathi|hi|ai4|ai4;commercial
Sky|United States|female|english|en-US|kokoro|commercial
Liam|United States|male|english|en-US|kokoro|commercial
Lily|United Kingdom|female|english|en-US|kokoro|commercial
George|United Kingdom|male|english|en-US|kokoro|commercial
Fable|United Kingdom|male|english|en-US|kokoro|commercial
Emma|United Kingdom|female|english|en-US|kokoro|commercial
Alice|United Kingdom|female|english|en-US|kokoro|commercial
Advik|India|male|Assamese|hi|ai4|ai4;commercial
Raha|India|female|Bengali|hi|ai4|ai4;commercial
Dhruv|India|male|Marathi|hi|ai4|ai4;commercial
Inaya|India|female|Kannada|hi|ai4|ai4;commercial
Reyansh|India|female|Bengali|hi|ai4|ai4;commercial
Vijay|India|female|Punjabi|hi|ai4|ai4;commercial
Daniel|United Kingdom|male|english|en-US|kokoro|commercial
Echo|United States|male|english|en-US|kokoro|commercial
Fenrir|United States|male|english|en-US|kokoro|commercial
Ananya|India|female|english|en-IN|gtts|gtts;commercial
sonika|India|female|hindi|hi|gtts|gtts;commercial
Tara|India|female|Marathi|mr|gtts|gtts;commercial
Saanvi|India|female|telugu|te|gtts|gtts;commercial
Iniya|India|female|tamil|ta|gtts|gtts;commercial
Onyx|United States|male|english|en-US|kokoro|commercial
Lewis|United Kingdom|male|english|en-US|kokoro|commercial
Nezumi|Japan|female|japanese|ja|kokoro|commercial
Tebukuro|Japan|female|japanese|ja|kokoro|commercial
Gongitsune|Japan|female|japanese|ja|kokoro|commercial
Sakura|Japan|female|japanese|ja|kokoro|commercial
Kumo|Japan|male|japanese|ja|kokoro|commercial
Xiaobei|China|female|chinese|ch|kokoro|commercial
Xiaoni|China|female|chinese|ch|kokoro|commercial
Xiaoyi|China|female|chinese|ch|kokoro|commercial
Yunxi|China|male|chinese|ch|kokoro|commercial
Yunjian|China|male|chinese|ch|kokoro|commercial
Siwis|France|female|French|fr|kokoro|commercial
Sara|Italy|female|italian|it|kokoro|commercial
Nicola|Italy|male|italian|it|kokoro|commercial
Ayesha|Pakistan|female|urdu|ur|gtts|gtts;commercial
Fatima|Pakistan|female|urdu|ur|gtts|gtts;commercial
Aisha|Saudi Arabia|female|arabic|ar-SA|gtts|gtts;commercial
Helena|Brazil|female|portuguese|pt-BR|gtts|gtts;commercial
Emma G|Germany|female|german|de|gtts|gtts;commercial
Layla|Egypt|female|arabic|ar|gtts|gtts;commercial
Lucia|Spain|female|spanish|es-ES|gtts|gtts;commercial
Valentina|Mexico|female|spanish|es-MX|gtts|gtts;commercial
Emily|United States|female|english|en-US|gtts|gtts;commercial
Zahra|South Africa|female|afrikaanse|af_ZA|mimic|mimic=7130;commercial
Nia|South Africa|female|afrikaanse|af_ZA|mimic|mimic=8963;commercial
Amara|South Africa|female|afrikaanse|af_ZA|mimic|mimic=7214;commercial
Anindita|Bangladesh|female|bengali|bn|mimic|mimic=rm;commercial
Jitendra|Bangladesh|male|bengali|bn|mimic|mimic=03042;commercial
Arjun|Bangladesh|male|bengali|bn|mimic|mimic=01232;commercial
Kaustav|Bangladesh|male|bengali|bn|mimic|mimic=00737;commercial
Ramona|Germany|female|german|de_DE|mimic|mimic=ramona_deininger;commercial
Karlsson|Germany|male|german|de_DE|mimic|mimic=karlsson;commercial
Rebecca|Germany|female|german|de_DE|mimic|mimic=rebecca_braunert_plunkett;commercial
Eva|Germany|female|german|de_DE|mimic|mimic=eva_k;commercial
Angela|Germany|female|german|de_DE|mimic|mimic=angela_merkel;commercial
Mia|Greek|female|greek|el_GR|mimic|mimic=default_el_GR;commercial
Tux|Spain|male|spanish|es_ES|mimic|mimic=tux;commercial
Victor|Spain|male|spanish|es_ES|mimic|mimic=victor_villarraza;commercial
Karen|Spain|female|spanish|es_ES|mimic|mimic=karen_savage;commercial
Laleh|Iran|female|Persian|fa|farsi|farsi;commercial
Omid|Iran|male|Persian|fa|farsi|farsi;commercial
Arman|Iran|male|Persian|fa|farsi|farsi;commercial
Baran|Iran|female|Persian|fa|farsi|farsi;commercial
Darya|Iran|female|Persian|fa|farsi|farsi;commercial
Yasmin|Iran|female|Persian|fa|mimic|mimic=default_fa;commercial
Juhani|Finland|female|Finnish|fi_FI|mimic|mimic=default_fi_FI;commercial
Ezwa|France|female|French|fr_FR|mimic|mimic=ezwa;commercial
Gilles|France|male|French|fr_FR|mimic|mimic=gilles_g_le_blanc;commercial
Nadine|France|female|French|fr_FR|mimic|mimic=nadine_eckert_boulet;commercial
Bernard|France|male|French|fr_FR|mimic|mimic=bernard;commercial
Aadya|India|female|gujarati|gu_IN|mimic|mimic=cmu_indic_guj_dp;commercial
Ishaan|India|male|gujarati|gu_IN|mimic|mimic=cmu_indic_guj_ad;commercial
Niyati|India|female|gujarati|gu_IN|mimic|mimic=cmu_indic_guj_kt;commercial
Oluwafemi|Nigeria|female|hausa|ha_NE|mimic|mimic=default_ha_NE;commercial
Csilla|Hungary|female|hungarian|hu_HU|mimic|mimic=default_hu_HU;commercial
Leonardo|Italy|male|italian|it_IT|mimic|mimic=1595;commercial
Sofia|Italy|female|italian|it_IT|mimic|mimic=4974;commercial
Francesco|Italy|male|italian|it_IT|mimic|mimic=4998;commercial
Chiara|Italy|female|italian|it_IT|mimic|mimic=659;commercial
Bianca|Italy|female|italian|it_IT|mimic|mimic=4649;commercial
Agus|Indonesia|male|Javanese|jv_ID|mimic|mimic=07875;commercial
Budi|Indonesia|male|Javanese|jv_ID|mimic|mimic=05522;commercial
Joko|Indonesia|male|Javanese|jv_ID|mimic|mimic=03424;commercial
Mentari|Indonesia|female|Javanese|jv_ID|mimic|mimic=06510;commercial
Agung|Indonesia|male|Javanese|jv_ID|mimic|mimic=03314;commercial
Indah|Indonesia|female|Javanese|jv_ID|mimic|mimic=03187;commercial
Asmara|Indonesia|female|Javanese|jv_ID|mimic|mimic=06207;commercial
Dwi|Indonesia|female|Javanese|jv_ID|mimic|mimic=08736;commercial
Lintang|Indonesia|female|Javanese|jv_ID|mimic|mimic=04679;commercial
Gauri|Nepal|female|Nepali|ne_NP|mimic|mimic=3614;commercial
Laxmi|Nepal|female|Nepali|ne_NP|mimic|mimic=0546;commercial
Avani|Nepal|female|Nepali|ne_NP|mimic|mimic=2099;commercial
Charvi|Nepal|female|Nepali|ne_NP|mimic|mimic=3960;commercial
Sem|Netherland|male|Dutch|nl|mimic|mimic=default_nl;commercial
Hendrik|Netherland|male|Dutch|nl|mimic|mimic=default_nl_flemishguy_low;commercial
nathalie|Netherland|female|Dutch|nl|mimic|mimic=default_nl_nathalie_low;commercial
Piotr|Poland|male|Polish|pl_PL|mimic|mimic=piotr_nater;commercial
Nina|Poland|female|Polish|pl_PL|mimic|mimic=nina_brown;commercial
Anastasia|Russia|female|Russian|ru_RU|mimic|mimic=hajdurova;commercial
Ivan|Russia|male|Russian|ru_RU|mimic|mimic=minaev;commercial
Mikhail|Russia|male|Russian|ru_RU|mimic|mimic=nikolaev;commercial
Jabari|Tanzania|male|Swahili|sw|mimic|mimic=default_sw;commercial
Aantika|India|female|Telugu|te_IN|mimic|mimic=ss;commercial
Vivan|India|male|Telugu|te_IN|mimic|mimic=sk;commercial
Bhargavi|India|female|Telugu|te_IN|mimic|mimic=kpn;commercial
Melokuhle|South Africa|female|Tswana|tn_ZA|mimic|mimic=1932;commercial
Enzokuhle|South Africa|female|Tswana|tn_ZA|mimic|mimic=0045;commercial
Amahle|South Africa|female|Tswana|tn_ZA|mimic|mimic=3342;commercial
Lethabo|South Africa|female|Tswana|tn_ZA|mimic|mimic=1483;commercial
Maksym|Ukrainian|male|Ukrainian|uk_UK|mimic|mimic=obruchov;commercial
Artem|Ukrainian|male|Ukrainian|uk_UK|mimic|mimic=shepel;commercial
Mykhailo|Ukrainian|male|Ukrainian|uk_UK|mimic|mimic=loboda;commercial
Oksana|Ukrainian|female|Ukrainian|uk_UK|mimic|mimic=sumska;commercial
Linh|Vietnam|female|Vietnamese|vi_VN|mimic|mimic=default_vi_VN;commercial
Olamide|Nigeria|male|Yoruba|yo|mimic|mimic=default_yo;commercial
`;
class AIVoiceClient {
  constructor(cfg = {}) {
    try {
      this.base_url = cfg?.base_url || "https://voice.naturalvoice.org";
      this.fb_key = cfg?.firebase_api_key || "AIzaSyBurE_kv4p4SjyoERx02mC6iq2jBPO2pwU";
      this.id_base = "https://identitytoolkit.googleapis.com/v1";
      this.sec_base = "https://securetoken.googleapis.com/v1";
      this.headers = {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      };
      this.voices_db = this.init_voices();
    } catch (e) {
      this.log("Inisialisasi constructor gagal:", e?.message);
    }
  }
  enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }
  dec(b64) {
    try {
      return b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }
  log(msg, data = null) {
    try {
      const time = new Date().toISOString().split("T")[1]?.slice(0, 8) || "LOG";
      data ? console.log(`[${time}] ${msg}`, data) : console.log(`[${time}] ${msg}`);
    } catch {
      console.log(msg);
    }
  }
  async slp(ms = 1e3) {
    try {
      return await new Promise(resolve => setTimeout(resolve, ms));
    } catch {
      return null;
    }
  }
  init_voices() {
    try {
      return RAW_VOICES.trim().split("\n").map(line => {
        const [speaker, country, gender, language, language_code, tts_type, tags_str = ""] = line.split("|").map(s => s.trim());
        const v = {
          speaker: speaker,
          country: country,
          gender: gender,
          language: language,
          language_code: language_code,
          tts_type: tts_type,
          tags: [],
          mimic_speaker: null
        };
        for (const t of tags_str.split(";").filter(Boolean)) {
          if (t.startsWith("mimic=")) v.mimic_speaker = t.slice(6);
          else v.tags.push(t);
        }
        return v;
      });
    } catch {
      return [];
    }
  }
  hdr(tok = null) {
    try {
      const h = {
        ...this.headers
      };
      if (tok) h["Authorization"] = `Bearer ${tok}`;
      return h;
    } catch {
      return {
        "Content-Type": "application/json"
      };
    }
  }
  async tok_anon() {
    try {
      this.log("Melakukan autentikasi Firebase Anonymous baru...");
      const res = await axios.post(`${this.id_base}/accounts:signUp?key=${this.fb_key}`, {
        returnSecureToken: true
      }, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 15e3
      });
      const d = res?.data || {};
      const id_token = d?.idToken;
      const refresh_token = d?.refreshToken;
      const sec = parseInt(d?.expiresIn || "3600", 10);
      if (!id_token) {
        this.log("Gagal memperoleh idToken anonymous");
        return null;
      }
      this.log(`✓ Firebase Anonymous Auth berhasil (UID: ${d?.localId})`);
      return {
        id_token: id_token,
        refresh_token: refresh_token,
        uid: d?.localId,
        expires_at: Math.floor(Date.now() / 1e3) + sec - 60
      };
    } catch (e) {
      this.log("Gagal anonymous login:", e?.response?.data || e?.message);
      return null;
    }
  }
  async tok_ref(refresh_token) {
    try {
      if (!refresh_token) return await this.tok_anon();
      this.log("Memperbarui token via refresh_token...");
      const res = await axios.post(`${this.sec_base}/token?key=${this.fb_key}`, new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token
      }).toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 15e3
      });
      const d = res?.data || {};
      const id_token = d?.id_token;
      const ref_token = d?.refresh_token;
      const sec = parseInt(d?.expires_in || "3600", 10);
      return {
        id_token: id_token,
        refresh_token: ref_token,
        uid: d?.user_id,
        expires_at: Math.floor(Date.now() / 1e3) + sec - 60
      };
    } catch {
      this.log("Gagal refresh token, melakukan login ulang...");
      return await this.tok_anon();
    }
  }
  async chk(st) {
    try {
      let s = this.dec(st);
      if (!s?.id_token) {
        this.log("State kosong, auto-create anonymous session...");
        return await this.tok_anon();
      }
      const now = Math.floor(Date.now() / 1e3);
      if (!s?.expires_at || now >= s.expires_at) {
        this.log("Token expired, merefresh sesi token...");
        return await this.tok_ref(s?.refresh_token);
      }
      return s;
    } catch (e) {
      this.log("Error saat verifikasi sesi state:", e?.message);
      return await this.tok_anon();
    }
  }
  ext_url(obj) {
    try {
      const urls = [];
      const seen = new Set();
      const walk = v => {
        if (!v) return;
        if (typeof v === "string") {
          if (/^https?:\/\//i.test(v.trim()) && !seen.has(v)) {
            seen.add(v);
            urls.push(v);
          }
          return;
        }
        if (Array.isArray(v)) {
          v.forEach(walk);
          return;
        }
        if (typeof v === "object") Object.values(v).forEach(walk);
      };
      walk(obj);
      return urls;
    } catch {
      return [];
    }
  }
  async poll(job_id, tok, timeout_ms = 18e4, interval_ms = 3e3) {
    try {
      const t0 = Date.now();
      const done = ["completed", "success", "done", "ok"];
      const fail = ["failed", "error", "cancelled"];
      let n = 0;
      while (true) {
        n++;
        if (Date.now() - t0 > timeout_ms) {
          this.log(`[Poll #${n}] Timeout ${timeout_ms}ms terlampaui`);
          return null;
        }
        let s;
        try {
          const res = await axios.get(`${this.base_url}/check-tts-status-flutter/${encodeURIComponent(job_id)}`, {
            headers: this.hdr(tok),
            timeout: 15e3
          });
          s = res?.data;
        } catch (e) {
          this.log(`[Poll #${n}] Peringatan cek status: ${e?.message}`);
          await this.slp(interval_ms);
          continue;
        }
        const status = String(s?.status || s?.state || "").toLowerCase();
        this.log(`[Poll #${n}] Status job: ${status || "processing"}`);
        if (done.includes(status)) return s;
        if (fail.includes(status)) return null;
        await this.slp(interval_ms);
      }
    } catch (e) {
      this.log("Error fatal pada method poll:", e?.message);
      return null;
    }
  }
  async voice({
    state,
    ...rest
  } = {}) {
    try {
      this.log("Mengambil daftar voice Natural Voice...");
      const s = await this.chk(state);
      let list = [...this.voices_db];
      if (rest?.language || rest?.lang) {
        const lang = String(rest.language || rest.lang).toLowerCase();
        list = list.filter(v => v?.language?.toLowerCase().includes(lang) || v?.language_code?.toLowerCase().includes(lang));
      }
      if (rest?.country) {
        const c = String(rest.country).toLowerCase();
        list = list.filter(v => v?.country?.toLowerCase().includes(c));
      }
      if (rest?.gender) {
        const g = String(rest.gender).toLowerCase();
        list = list.filter(v => v?.gender?.toLowerCase() === g);
      }
      if (rest?.tts_type || rest?.type) {
        const t = String(rest.tts_type || rest.type).toLowerCase();
        list = list.filter(v => v?.tts_type?.toLowerCase() === t);
      }
      if (rest?.search || rest?.q || rest?.speaker) {
        const q = String(rest.search || rest.q || rest.speaker).toLowerCase();
        list = list.filter(v => v?.speaker?.toLowerCase().includes(q));
      }
      this.log(`✓ Data voice berhasil dimuat (${list.length} suara ditemukan)`);
      return {
        status: true,
        result: {
          total_count: list.length,
          voices: list
        },
        state: this.enc(s)
      };
    } catch (err) {
      this.log("Gagal memuat voice:", err?.message);
      return {
        status: false,
        result: {
          error: err?.message || "Error tidak diketahui"
        },
        state: state || null
      };
    }
  }
  async generate({
    state,
    ...rest
  } = {}) {
    try {
      const raw_text = rest?.text !== undefined && rest?.text !== null ? String(rest.text).trim() : "";
      if (!raw_text) {
        this.log('Validasi gagal: Parameter "text" wajib diisi.');
        return {
          status: false,
          result: {
            error: 'Parameter "text" wajib diisi dan tidak boleh kosong'
          },
          state: state || null
        };
      }
      this.log(`Memulai generate audio: "${raw_text.slice(0, 30)}..."`);
      let s = await this.chk(state);
      if (!s?.id_token) {
        return {
          status: false,
          result: {
            error: "Gagal menyiapkan sesi autentikasi"
          },
          state: state || null
        };
      }
      const speaker = rest?.speaker ? String(rest.speaker) : "Adam";
      const tts_type = rest?.tts_type ? String(rest.tts_type).toLowerCase() : "kokoro";
      const cloning_audio_url = rest?.cloning_audio_url ? String(rest.cloning_audio_url) : "";
      const is_ai4_bharat = rest?.is_ai4_bharat !== undefined ? Boolean(rest.is_ai4_bharat) : false;
      const mimic_speaker = rest?.mimic_speaker ? String(rest.mimic_speaker) : "";
      const payload = {
        text: raw_text,
        speaker: speaker,
        ttsType: tts_type,
        cloningAudioUrl: cloning_audio_url,
        isai4bharatVitsSpeaker: is_ai4_bharat
      };
      if (mimic_speaker) payload.mimicSpeaker = mimic_speaker;
      let start_res;
      try {
        const res = await axios.post(`${this.base_url}/flutter-tts`, payload, {
          headers: this.hdr(s.id_token),
          timeout: 3e4
        });
        start_res = res?.data;
      } catch (err_post) {
        if (err_post?.response?.status === 401) {
          this.log("Token ditolak 401, auto-relogin...");
          s = await this.tok_anon();
          const retry = await axios.post(`${this.base_url}/flutter-tts`, payload, {
            headers: this.hdr(s?.id_token),
            timeout: 3e4
          }).catch(() => null);
          start_res = retry?.data;
        } else {
          this.log("Request start TTS ditolak:", err_post?.response?.data || err_post?.message);
          return {
            status: false,
            result: {
              error: err_post?.response?.data?.message || err_post?.message
            },
            state: this.enc(s)
          };
        }
      }
      const job_id = start_res?.job_id || start_res?.jobId || start_res?.id;
      if (!job_id) {
        return {
          status: false,
          result: {
            error: "job_id tidak ditemukan pada respon server"
          },
          state: this.enc(s)
        };
      }
      this.log(`Job ID diterima: ${job_id}`);
      const direct_urls = this.ext_url(start_res);
      const start_status = String(start_res?.status || "").toLowerCase();
      if (["completed", "success", "done", "ok"].includes(start_status) && direct_urls.length > 0) {
        this.log("✓ TTS langsung selesai tanpa antrean");
        return {
          status: true,
          result: {
            job_id: job_id,
            status: start_status,
            output_urls: direct_urls,
            audio_url: direct_urls[0] || null,
            speaker: speaker,
            tts_type: tts_type
          },
          state: this.enc(s)
        };
      }
      this.log("Menunggu antrean pemrosesan audio...");
      const final_data = await this.poll(job_id, s.id_token);
      if (!final_data) {
        return {
          status: false,
          result: {
            error: "Gagal atau timeout saat menunggu hasil audio"
          },
          state: this.enc(s)
        };
      }
      const final_urls = this.ext_url(final_data);
      this.log(`✓ Audio selesai diproses (${final_urls.length} URL ditemukan)`);
      return {
        status: true,
        result: {
          job_id: job_id,
          status: final_data?.status || "completed",
          output_urls: final_urls,
          audio_url: final_urls[0] || null,
          processing_time_seconds: final_data?.processing_time_seconds || null,
          speaker: speaker,
          tts_type: tts_type
        },
        state: this.enc(s)
      };
    } catch (err) {
      this.log("Gagal menjalankan generate audio:", err?.message);
      return {
        status: false,
        result: {
          error: err?.message || "Error tidak diketahui"
        },
        state: state || null
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const rawData = req.method === "GET" ? req.query : req.body || {};
    const {
      action,
      ...params
    } = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const validActions = ["create", "generate", "voice_list", "voices", "voice"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: ["create", "generate", "voice_list", "voices"],
        usage: {
          method: "GET / POST",
          examples: ["/?action=create&text=Hello+world&speaker=Adam", "/?action=create&text=Halo+dunia&speaker=Agus&type=mimic", "/?action=voice_list&lang=english", "/?action=voices&gender=female"]
        }
      });
    }
    if (!validActions.includes(action.toLowerCase())) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: ["create", "generate", "voice_list", "voices"]
      });
    }
    const api = new AIVoiceClient();
    let response;
    const state = params.state || req.headers?.["x-aivoice-state"] || null;
    switch (action.toLowerCase()) {
      case "create":
      case "generate": {
        const text_input = params.text || params.prompt || "";
        if (!text_input || !String(text_input).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        response = await api.generate({
          state: state,
          text: String(text_input).trim(),
          speaker: params.speaker || params.voice || "Adam",
          tts_type: params.tts_type || params.type || "kokoro",
          cloning_audio_url: params.cloning_audio_url || params.clone_url || "",
          mimic_speaker: params.mimic_speaker || params.mimic || "",
          is_ai4_bharat: params.is_ai4_bharat || false,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices":
      case "voice": {
        response = await api.voice({
          state: state,
          language: params.language || params.lang,
          country: params.country,
          gender: params.gender,
          tts_type: params.tts_type || params.type,
          search: params.search || params.q || params.speaker,
          ...params
        });
        break;
      }
    }
    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result,
        state: response.state
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.error || "Gagal memproses request ke Natural Voice API."
      });
    }
  } catch (error) {
    console.error("[FATAL ERROR] Kegagalan pada handler Natural Voice:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}