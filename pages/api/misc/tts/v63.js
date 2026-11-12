import axios from "axios";
import crypto from "crypto";
class VoiceCloneAI {
  constructor(cfg = {}) {
    try {
      this.base_url = cfg?.base_url || "https://voicecloneai.app/api";
      this.platform = cfg?.platform || "android";
      this.os_version = cfg?.os_version || "14";
      this.device_model = cfg?.device_model || "Pixel";
      this.headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
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
  gen_id() {
    try {
      return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    } catch {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
        Accept: "application/json",
        "Content-Type": "application/json"
      };
    }
  }
  async auth_guest(guest_key = null) {
    try {
      const dev_id = guest_key || this.gen_id();
      this.log(`Membuat sesi guest baru (Device ID: ${dev_id.slice(0, 8)}...)...`);
      const res = await axios.post(`${this.base_url}/auth/guest`, {
        guest_key: dev_id,
        device_info: {
          device_id: dev_id,
          platform: this.platform,
          os_version: this.os_version,
          device_model: this.device_model
        }
      }, {
        headers: this.hdr()
      });
      const d = res?.data?.data || {};
      const token = d?.token;
      const user = d?.user;
      if (!token) {
        this.log("Gagal mendapatkan token guest dari server");
        return null;
      }
      this.log(`✓ Guest access aktif! User ID: ${user?.id} (${user?.name})`);
      return {
        guest_key: dev_id,
        token: token,
        token_type: d?.token_type || "bearer",
        user_id: user?.id,
        email: user?.email,
        secret_key: d?.secret_key,
        remaining_minutes: .5,
        expires_at: Math.floor(Date.now() / 1e3) + 30 * 24 * 3600
      };
    } catch (e) {
      this.log("Error pada auth_guest:", e?.response?.data || e?.message);
      return null;
    }
  }
  async usage(tok) {
    try {
      const res = await axios.get(`${this.base_url}/account/usage`, {
        headers: this.hdr(tok)
      });
      return res?.data?.data || null;
    } catch (e) {
      this.log("Gagal cek usage kuota:", e?.response?.data || e?.message);
      return null;
    }
  }
  async chk(st, min_minutes = .02) {
    try {
      let s = this.dec(st);
      if (!s?.token || !s?.guest_key) {
        this.log("State kosong/tidak valid, otomatis membuat akun guest baru...");
        return await this.auth_guest();
      }
      const now = Math.floor(Date.now() / 1e3);
      if (!s?.expires_at || now >= s.expires_at - 60) {
        this.log("Sesi guest kedaluwarsa, registrasi guest baru...");
        return await this.auth_guest();
      }
      const u = await this.usage(s.token);
      if (u) {
        s.remaining_minutes = u?.remaining_minutes !== undefined ? Number(u.remaining_minutes) : s.remaining_minutes;
      }
      if ((s?.remaining_minutes || 0) <= min_minutes) {
        this.log(`Kuota menit habis (${s?.remaining_minutes || 0} menit). Auto-registrasi guest baru...`);
        return await this.auth_guest();
      }
      return s;
    } catch (e) {
      this.log("Error pada method chk:", e?.message);
      return await this.auth_guest();
    }
  }
  async voice({
    state,
    ...rest
  } = {}) {
    try {
      this.log("Mengambil daftar voice dari VoiceClone AI...");
      const s = await this.chk(state, 0);
      if (!s?.token) {
        return {
          status: false,
          result: {
            error: "Gagal inisialisasi sesi guest"
          },
          state: state || null
        };
      }
      const res = await axios.get(`${this.base_url}/voices`, {
        headers: this.hdr(s.token)
      });
      const raw_data = res?.data?.data || {};
      let list = raw_data?.free || [];
      if (rest?.category === "cloned") list = raw_data?.cloned || [];
      else if (rest?.category === "all") list = [...raw_data?.free || [], ...raw_data?.cloned || []];
      if (rest?.language || rest?.lang) {
        const lang = String(rest.language || rest.lang).toLowerCase();
        list = list.filter(v => v?.language?.toLowerCase().includes(lang));
      }
      if (rest?.gender) {
        const g = String(rest.gender).toLowerCase();
        list = list.filter(v => v?.gender?.toLowerCase() === g);
      }
      if (rest?.search || rest?.q) {
        const q = String(rest.search || rest.q).toLowerCase();
        list = list.filter(v => v?.name?.toLowerCase().includes(q) || v?.id?.toLowerCase().includes(q));
      }
      this.log(`✓ Data voice berhasil dimuat (${list.length} suara ditemukan)`);
      return {
        status: true,
        result: {
          total_count: list.length,
          tier: res?.data?.meta?.tier || "guest",
          voices: list
        },
        state: this.enc(s)
      };
    } catch (err) {
      this.log("Gagal memuat voices:", err?.response?.data || err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data?.message || err?.message || "Error tidak diketahui"
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
      let s = await this.chk(state, .02);
      if (!s?.token) {
        return {
          status: false,
          result: {
            error: "Gagal membuat/memverifikasi akun guest untuk TTS"
          },
          state: state || null
        };
      }
      const voice_id = rest?.voice_id || rest?.voice || rest?.speaker || "bf_lily";
      const payload = {
        text: raw_text,
        voice_id: String(voice_id),
        options: {
          speed: rest?.speed !== undefined ? Number(rest.speed) : 1,
          stability: rest?.stability !== undefined ? Number(rest.stability) : .5,
          similarity_boost: rest?.similarity_boost !== undefined ? Number(rest.similarity_boost) : .5,
          style: rest?.style !== undefined ? Number(rest.style) : 0,
          use_speaker_boost: rest?.use_speaker_boost !== undefined ? Number(rest.use_speaker_boost) : 1
        }
      };
      let res;
      try {
        res = await axios.post(`${this.base_url}/tts/generate`, payload, {
          headers: this.hdr(s.token)
        });
      } catch (post_err) {
        const err_data = post_err?.response?.data;
        const err_msg = JSON.stringify(err_data || "").toLowerCase();
        if (err_msg.includes("limit") || err_msg.includes("minute") || post_err?.response?.status === 403 || post_err?.response?.status === 400) {
          this.log("Kuota menit guest habis saat generate, auto-registrasi akun baru...");
          s = await this.auth_guest();
          if (s?.token) {
            res = await axios.post(`${this.base_url}/tts/generate`, payload, {
              headers: this.hdr(s.token)
            }).catch(() => null);
          }
        } else {
          this.log("Request generate ditolak server:", err_data || post_err?.message);
          return {
            status: false,
            result: {
              error: err_data?.message || post_err?.message
            },
            state: this.enc(s)
          };
        }
      }
      const d = res?.data?.data;
      if (!d || !d?.audio_url) {
        return {
          status: false,
          result: {
            error: "Gagal mendapatkan data audio dari server"
          },
          state: this.enc(s)
        };
      }
      if (d?.remaining_minutes !== undefined) {
        s.remaining_minutes = Number(d.remaining_minutes);
      }
      this.log(`✓ Audio berhasil dibuat! Sisa kuota: ${d?.remaining_minutes} menit | ID: ${d?.generation_id}`);
      return {
        status: true,
        result: {
          text: raw_text,
          voice_id: voice_id,
          audio_url: d?.audio_url,
          generation_id: d?.generation_id,
          duration_minutes: d?.duration_minutes,
          word_count: d?.word_count,
          provider: d?.provider,
          has_watermark: d?.has_watermark,
          remaining_minutes: d?.remaining_minutes
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
    const validActions = ["create", "generate", "voice_list", "voices", "usage", "account"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: ["create", "generate", "voice_list", "voices", "usage"],
        usage: {
          method: "GET / POST",
          examples: ["/?action=create&text=Halo+dunia&voice=bf_lily", "/?action=create&text=Hello+world&voice=af_heart&speed=1.0", "/?action=voice_list&lang=en", "/?action=usage"]
        }
      });
    }
    if (!validActions.includes(action.toLowerCase())) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: ["create", "generate", "voice_list", "voices", "usage"]
      });
    }
    const api = new VoiceCloneAI();
    let response;
    const state = params.state || req.headers?.["x-voiceclone-state"] || null;
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
          voice_id: params.voice_id || params.voice || params.speaker || "bf_lily",
          speed: params.speed !== undefined ? Number(params.speed) : 1,
          stability: params.stability !== undefined ? Number(params.stability) : .5,
          similarity_boost: params.similarity_boost !== undefined ? Number(params.similarity_boost) : .5,
          style: params.style !== undefined ? Number(params.style) : 0,
          use_speaker_boost: params.use_speaker_boost !== undefined ? Number(params.use_speaker_boost) : 1,
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice({
          state: state,
          language: params.language || params.lang,
          gender: params.gender,
          search: params.search || params.q,
          category: params.category || "free",
          ...params
        });
        break;
      }
      case "usage":
      case "account": {
        const s = await api.chk(state, 0);
        const u = await api.usage(s?.token);
        response = {
          status: Boolean(u),
          result: u || {
            error: "Gagal mengambil data penggunaan kuota"
          },
          state: api.enc(s)
        };
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
        error: response?.result?.error || "Gagal memproses request ke VoiceClone AI."
      });
    }
  } catch (error) {
    console.error("[FATAL ERROR] Kegagalan pada handler VoiceClone AI:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}