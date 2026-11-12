import axios from "axios";
import crypto from "crypto";
class BotnoiVoice {
  constructor(cfg = {}) {
    try {
      this.fb_key = cfg?.firebase_api_key || "AIzaSyCPbJ5D41zoyRTZNbkh49T2Gjn47HLXNWc";
      this.botnoi_sec = "Ym90b25vaQ";
      this.base_url = "https://api-voice.botnoi.ai";
      this.auth_url = "https://identitytoolkit.googleapis.com/v1";
      this.sec_url = "https://securetoken.googleapis.com/v1";
      this.dev_fallback = cfg?.developer_token || "AZXCM53nqDkiEd141q6tVvzhb7ersdeC";
      this.ua = {
        "sec-ch-ua-platform": '"Android"',
        Referer: "https://voice.botnoi.ai/",
        "Accept-Language": "id-ID,id;q=0.9",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      };
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
  hdr(tok = null, is_open = false) {
    try {
      const h = {
        "Content-Type": "application/json",
        ...this.ua
      };
      if (tok) {
        if (is_open) {
          h["botnoi-token"] = tok;
          h["Botnoi-Token"] = tok;
        } else {
          h["Authorization"] = `Bearer ${tok}`;
        }
      }
      return h;
    } catch {
      return {
        "Content-Type": "application/json"
      };
    }
  }
  gen() {
    try {
      const r = crypto.randomBytes(4).toString("hex");
      return {
        username: `usr_${r}`,
        email: `botnoi_${r}@gmail.com`,
        password: "StrongPassword123!"
      };
    } catch {
      const r = Math.random().toString(36).substring(2, 9);
      return {
        username: `usr_${r}`,
        email: `botnoi_${r}@gmail.com`,
        password: "StrongPassword123!"
      };
    }
  }
  async tok(id_token) {
    try {
      const r1 = await axios.get(`${this.base_url}/api/dashboard/firebase_auth`, {
        headers: {
          "Botnoi-Token": `Bearer ${id_token}`,
          "Content-Type": "application/json",
          ...this.ua
        }
      });
      const jwt1 = r1?.data?.data?.token || r1?.data?.token || r1?.data?.jwt;
      if (jwt1) return jwt1;
    } catch (e1) {
      this.log("firebase_auth gagal, mencoba /api/dashboard/sign_in...", e1?.message);
    }
    try {
      const r2 = await axios.get(`${this.base_url}/api/dashboard/sign_in`, {
        headers: {
          "firebase-token": `Bearer ${id_token}`,
          Origin: "https://voice.botnoi.ai",
          Referer: "https://voice.botnoi.ai/",
          ...this.ua
        }
      });
      const jwt2 = r2?.data?.data?.token || r2?.data?.token || r2?.data?.jwt;
      if (jwt2) return jwt2;
    } catch (e2) {
      this.log("sign_in gagal, mencoba /api/service/get_token...", e2?.message);
    }
    try {
      const r3 = await axios.post(`${this.base_url}/api/service/get_token`, {}, {
        headers: {
          Authorization: `Bearer ${id_token}`,
          "Content-Type": "application/json"
        }
      });
      return r3?.data?.token || r3?.data?.data?.token || null;
    } catch (e3) {
      this.log("Semua endpoint exchange token gagal:", e3?.message);
      return null;
    }
  }
  async key(user_id, jwt) {
    try {
      const p = await axios.get(`${this.base_url}/api/dashboard/get_profile`, {
        headers: this.hdr(jwt)
      });
      const tok = p?.data?.data?.token;
      const credits = p?.data?.data?.credits !== undefined ? p.data.data.credits : 0;
      if (tok) return {
        token: tok,
        credits: credits
      };
    } catch {}
    try {
      const k = await axios.get(`${this.base_url}/db/dashboard/get_token?user_id=${user_id}`, {
        headers: this.hdr(jwt)
      });
      const tok = k?.data?.data?.token;
      if (tok) return {
        token: tok,
        credits: 2e3
      };
    } catch {}
    return {
      token: jwt,
      credits: 2e3
    };
  }
  async claim(jwt) {
    try {
      this.log("Menjalankan auto-claim bonus reward poin...");
      const p1 = axios.post(`${this.base_url}/api/coupon/claim_daily_point`, {}, {
        headers: this.hdr(jwt)
      }).then(r => r?.data?.message || "Daily claimed").catch(e => {
        this.log(`[Skip] Daily point: ${e?.response?.data?.message || "Sudah diklaim / lewat"}`);
        return null;
      });
      const p2 = axios.post(`${this.base_url}/api/coupon/check_coupon`, {
        coupon_name: "mobile1000"
      }, {
        headers: this.hdr(jwt)
      }).then(r => r?.data?.message || "Kupon mobile1000 claimed").catch(e => {
        this.log(`[Skip] Kupon mobile1000: ${e?.response?.data?.message || "Sudah diklaim / lewat"}`);
        return null;
      });
      await Promise.allSettled([p1, p2]);
      return true;
    } catch {
      this.log("Terjadi masalah reward, proses tetap dilanjutkan...");
      return false;
    }
  }
  async reg(attempt = 1) {
    try {
      if (attempt > 4) {
        this.log("Batas percobaan registrasi terlampaui");
        return null;
      }
      const cred = this.gen();
      this.log(`[Attempt ${attempt}] Membuat akun Firebase: ${cred?.email}...`);
      let fb;
      try {
        const fb_res = await axios.post(`${this.auth_url}/accounts:signUp?key=${this.fb_key}`, {
          email: cred?.email,
          password: cred?.password,
          returnSecureToken: true
        }, {
          headers: {
            "Content-Type": "application/json"
          }
        });
        fb = fb_res?.data;
      } catch (fb_err) {
        if (fb_err?.response?.data?.error?.message === "EMAIL_EXISTS") {
          this.log("Email sudah terdaftar di Firebase, mencoba email baru...");
          return await this.reg(attempt + 1);
        }
        this.log("Gagal sign up Firebase:", fb_err?.response?.data || fb_err?.message);
        return null;
      }
      const user_id = fb?.localId;
      const id_token = fb?.idToken;
      const refresh_token = fb?.refreshToken;
      const expires_in = fb?.expiresIn;
      this.log(`Menyimpan user (${user_id}) ke DB Botnoi...`);
      try {
        const db_res = await axios.post(`${this.base_url}/api/dashboard/register_mobile`, {
          user_id: user_id,
          username: cred?.username,
          email: cred?.email
        }, {
          headers: {
            "Content-Type": "application/json",
            "X-API-BOTNOI": this.botnoi_sec
          }
        });
        if (db_res?.data?.message?.includes("already exist")) {
          this.log("User id sudah ada di DB, mencoba registrasi ulang...");
          return await this.reg(attempt + 1);
        }
      } catch (db_err) {
        this.log("Peringatan register_mobile:", db_err?.response?.data?.message || db_err?.message);
      }
      this.log("Mengambil token sesi Botnoi via firebase_auth...");
      const jwt = await this.tok(id_token);
      if (!jwt) {
        this.log("Gagal mendapatkan token sesi Botnoi");
        return null;
      }
      await this.claim(jwt);
      this.log("Mengambil developer token & cek saldo akun...");
      const {
        token: dev_token,
        credits
      } = await this.key(user_id, jwt);
      this.log(`✓ Akun berhasil aktif! Saldo Poin: ${credits} | Token: ${dev_token?.slice(0, 10)}...`);
      return {
        email: cred?.email,
        password: cred?.password,
        user_id: user_id,
        id_token: id_token,
        refresh_token: refresh_token,
        botnoi_jwt: jwt,
        botnoi_token: dev_token || jwt,
        credits: credits,
        expires_at: Math.floor(Date.now() / 1e3) + parseInt(expires_in || 3600, 10)
      };
    } catch (e) {
      this.log("Error pada method reg:", e?.message);
      return null;
    }
  }
  async chk(st, min_credits = 2) {
    try {
      let s = this.dec(st);
      if (!s?.botnoi_token || !s?.botnoi_jwt || !s?.email) {
        this.log("State kosong/tidak valid, otomatis membuat akun baru...");
        return await this.reg();
      }
      const now = Math.floor(Date.now() / 1e3);
      if (!s?.expires_at || now >= s.expires_at - 60) {
        this.log("Token expired, merefresh sesi via refresh_token...");
        try {
          const r = await axios.post(`${this.sec_url}/token?key=${this.fb_key}`, new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: s?.refresh_token
          }).toString(), {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          });
          s.id_token = r?.data?.id_token;
          s.refresh_token = r?.data?.refresh_token;
          s.expires_at = Math.floor(Date.now() / 1e3) + parseInt(r?.data?.expires_in || 3600, 10);
          const new_jwt = await this.tok(s.id_token);
          if (new_jwt) s.botnoi_jwt = new_jwt;
        } catch {
          this.log("Refresh token gagal, auto-registrasi akun baru...");
          return await this.reg();
        }
      }
      try {
        const p = await axios.get(`${this.base_url}/api/dashboard/get_profile`, {
          headers: this.hdr(s?.botnoi_jwt)
        });
        if (p?.data?.data?.credits !== undefined) {
          s.credits = p.data.data.credits;
          if (p.data.data.token) s.botnoi_token = p.data.data.token;
        }
      } catch {}
      if ((s?.credits || 0) < min_credits) {
        this.log(`Saldo kredit kurang (${s?.credits || 0} pt). Otomatis membuat akun baru...`);
        return await this.reg();
      }
      return s;
    } catch (e) {
      this.log("Error pada method chk:", e?.message);
      return await this.reg();
    }
  }
  async voice({
    state,
    ...rest
  } = {}) {
    try {
      this.log("Memproses permintaan data voice...");
      const s = await this.chk(state, 0);
      if (!s?.botnoi_token) {
        return {
          status: false,
          result: {
            error: "Gagal inisialisasi sesi akun"
          },
          state: state || null
        };
      }
      const type = rest?.type ? String(rest.type).toLowerCase() : "v2";
      let endpoint = "/openapi/v1/get_speaker_data_v2";
      let is_open = true;
      if (type === "v1") endpoint = "/openapi/v1/get_speaker_data";
      else if (type === "v4") endpoint = "/openapi/v1/get_speaker_data_v4";
      else if (type === "clone") {
        endpoint = "/api/marketplace/get_all_speaker_clone_voice";
        is_open = false;
      } else if (type === "country") {
        endpoint = "/db/marketplace/country_data";
        is_open = false;
      }
      const tok = is_open ? s.botnoi_token?.startsWith("eyJ") ? this.dev_fallback : s.botnoi_token : s.botnoi_jwt;
      const res = await axios.get(`${this.base_url}${endpoint}`, {
        headers: this.hdr(tok, is_open)
      });
      let list = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
      if (rest?.language) {
        const lang = String(rest.language).toUpperCase();
        list = list.filter(v => v?.language?.toUpperCase() === lang || v?.value?.toUpperCase() === lang);
      }
      if (rest?.gender) {
        const g = String(rest.gender).toLowerCase();
        list = list.filter(v => v?.eng_gender?.toLowerCase() === g || v?.gender?.toLowerCase() === g);
      }
      if (rest?.search) {
        const q = String(rest.search).toLowerCase();
        list = list.filter(v => v?.eng_name?.toLowerCase().includes(q) || v?.thai_name?.toLowerCase().includes(q) || v?.speaker_name?.toLowerCase().includes(q));
      }
      this.log(`✓ Data voice berhasil dimuat (${list.length} item)`);
      return {
        status: true,
        result: {
          category: type,
          total_count: list.length,
          speakers: list
        },
        state: this.enc(s)
      };
    } catch (err) {
      this.log("Gagal memuat voice:", err?.response?.data || err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Error tidak diketahui"
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
      let s = await this.chk(state, 2);
      if (!s?.botnoi_token) {
        return {
          status: false,
          result: {
            error: "Gagal membuat/memverifikasi akun untuk TTS"
          },
          state: state || null
        };
      }
      const ver = rest?.version ? String(rest.version).toLowerCase() : "v2";
      const speaker = rest?.speaker !== undefined ? String(rest.speaker) : "8";
      const speed = rest?.speed !== undefined ? Number(rest.speed) : 1;
      const type_media = rest?.type_media ? String(rest.type_media).toLowerCase() : "mp3";
      const language = rest?.language ? String(rest.language).toLowerCase() : "th";
      const is_jwt = s.botnoi_token?.startsWith("eyJ");
      const page_param = is_jwt ? "mobilebotnoivoice" : "user";
      let endpoint = ver === "v1" ? "/openapi/v1/generate_audio" : "/openapi/v1/generate_audio_v2";
      let payload = {};
      if (ver === "v4d") {
        endpoint = "/openapi/v1/generate_audio_v4d";
        payload = {
          text: raw_text,
          gender: rest?.gender ? String(rest.gender) : "female",
          age: rest?.age ? String(rest.age) : "young_adult",
          pitch: rest?.pitch ? String(rest.pitch) : "moderate",
          style: rest?.style ? String(rest.style) : "whisper",
          type_media: type_media,
          save_file: rest?.save_file !== undefined ? String(rest.save_file) : "true"
        };
      } else if (ver === "v4") {
        endpoint = "/openapi/v1/generate_audio_v4";
        payload = {
          text: raw_text,
          speaker: rest?.speaker !== undefined ? String(rest.speaker) : "2",
          volume: rest?.volume !== undefined ? Number(rest.volume) : 100,
          speed: speed,
          type_media: type_media,
          save_file: rest?.save_file !== undefined ? String(rest.save_file) : "true",
          language: language
        };
      } else {
        payload = {
          text: raw_text,
          speaker: speaker,
          volume: rest?.volume !== undefined ? Number(rest.volume) : 1,
          speed: speed,
          type_media: type_media,
          save_file: rest?.save_file !== undefined ? String(rest.save_file) : "True",
          language: language,
          page: page_param
        };
      }
      let res;
      let active_token = s.botnoi_token;
      try {
        res = await axios.post(`${this.base_url}${endpoint}`, payload, {
          headers: this.hdr(active_token, true)
        });
      } catch (post_err) {
        const err_data = post_err?.response?.data;
        const err_msg = JSON.stringify(err_data || "").toLowerCase();
        if (err_msg.includes("developer/api") || err_msg.includes("token")) {
          this.log("OpenAPI meminta Developer Key, mengalihkan ke token developer...");
          active_token = this.dev_fallback;
          payload.page = "user";
          try {
            res = await axios.post(`${this.base_url}${endpoint}`, payload, {
              headers: this.hdr(active_token, true)
            });
          } catch {
            this.log("Mencoba fallback ke endpoint V1...");
            res = await axios.post(`${this.base_url}/openapi/v1/generate_audio`, payload, {
              headers: this.hdr(active_token, true)
            }).catch(() => null);
          }
        } else if (err_msg.includes("point") || err_msg.includes("credit") || post_err?.response?.status === 400) {
          this.log("Kredit akun habis, auto-registrasi akun baru...");
          s = await this.reg();
          if (s?.botnoi_token) {
            active_token = s.botnoi_token?.startsWith("eyJ") ? this.dev_fallback : s.botnoi_token;
            res = await axios.post(`${this.base_url}${endpoint}`, payload, {
              headers: this.hdr(active_token, true)
            }).catch(() => null);
          }
        } else {
          this.log("Request generate ditolak server:", err_data || post_err?.message);
          return {
            status: false,
            result: {
              error: err_data?.message || err_data?.detail || post_err?.message
            },
            state: this.enc(s)
          };
        }
      }
      if (!res?.data) {
        return {
          status: false,
          result: {
            error: "Gagal mendapatkan data suara dari server"
          },
          state: this.enc(s)
        };
      }
      const point_rem = res?.data?.point !== undefined ? res.data.point : null;
      if (point_rem !== null) s.credits = point_rem;
      this.log(`✓ Audio berhasil dibuat! Sisa poin akun: ${point_rem}`);
      return {
        status: true,
        result: {
          text: res?.data?.text || raw_text,
          audio_url: res?.data?.audio_url || (typeof res?.data === "string" ? res.data : null),
          point_left: point_rem,
          user_monthly_point: res?.data?.user_monthly_point || 0
        },
        state: this.enc(s)
      };
    } catch (err) {
      this.log("Gagal menjalankan generate audio:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data?.message || err?.message || "Error tidak diketahui"
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
          examples: ["/?action=create&text=สวัสดีครับ&speaker=8", "/?action=create&text=Halo+dunia&speaker=4&lang=th&ver=v2", "/?action=voice_list&lang=th", "/?action=voices&type=clone&search=ครู"]
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
    const api = new BotnoiVoice();
    let response;
    const state = params.state || req.headers?.["x-botnoi-state"] || null;
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
          speaker: params.speaker || params.voice || "8",
          version: params.version || params.ver || "v2",
          volume: params.volume !== undefined ? Number(params.volume) : 1,
          speed: params.speed !== undefined ? Number(params.speed) : 1,
          type_media: params.type_media || params.format || "mp3",
          save_file: params.save_file !== undefined ? String(params.save_file) : "True",
          language: params.language || params.lang || "th",
          gender: params.gender,
          age: params.age,
          pitch: params.pitch,
          style: params.style,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices":
      case "voice": {
        response = await api.voice({
          state: state,
          type: params.type || "v2",
          language: params.language || params.lang,
          gender: params.gender,
          search: params.search || params.q,
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
        error: response?.result?.error || "Gagal memproses request ke Botnoi Voice API."
      });
    }
  } catch (error) {
    console.error("[FATAL ERROR] Kegagalan pada handler Botnoi Voice:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}