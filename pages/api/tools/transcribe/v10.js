import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class WisprFlow {
  constructor(cfg = {}) {
    try {
      this.base_url = cfg?.base_url || "https://api.wisprflow.ai";
      this.mail_url = cfg?.mail_url || `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.headers = {
        "User-Agent": "okhttp/5.5.1",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-wispr-client": "android/2.8.4/183"
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
  async slp(ms = 1e3) {
    try {
      return await new Promise(resolve => setTimeout(resolve, ms));
    } catch {
      return null;
    }
  }
  async req(url, method = "GET", data = null, custom_headers = {}) {
    try {
      this.log(`[REQ] ${method} -> ${url}`);
      const res = await axios({
        url: url,
        method: method,
        data: data,
        headers: {
          ...this.headers,
          ...custom_headers
        },
        timeout: 3e4
      });
      return {
        status: true,
        result: res?.data || {}
      };
    } catch (err) {
      const err_msg = err?.response?.data?.message || err?.message || "Request failed";
      this.log(`[ERR] HTTP failed (${url}): ${err_msg}`);
      return {
        status: false,
        result: {
          error: err_msg
        }
      };
    }
  }
  async cva(audio) {
    try {
      if (!audio) {
        return {
          status: false,
          result: {
            error: "Input audio tidak boleh kosong"
          }
        };
      }
      if (Buffer.isBuffer(audio)) {
        this.log("Mengonversi Buffer audio ke Base64...");
        return {
          status: true,
          result: audio.toString("base64")
        };
      }
      if (typeof audio === "string") {
        if (audio.startsWith("http://") || audio.startsWith("https://")) {
          this.log("Mengunduh audio dari URL ke Base64...");
          const res = await axios.get(audio, {
            responseType: "arraybuffer"
          });
          const b64 = Buffer.from(res?.data || "").toString("base64");
          return {
            status: true,
            result: b64
          };
        }
        if (audio.includes("base64,")) {
          this.log("Mengekstrak payload Base64 dari Data URI...");
          const clean = audio.split("base64,")?.[1] || audio;
          return {
            status: true,
            result: clean
          };
        }
        return {
          status: true,
          result: audio
        };
      }
      return {
        status: false,
        result: {
          error: "Format audio harus berupa URL, Buffer, atau Base64"
        }
      };
    } catch (err) {
      this.log("Gagal memproses resolver audio:", err?.message);
      return {
        status: false,
        result: {
          error: err?.message || "Gagal memproses audio"
        }
      };
    }
  }
  async cml() {
    try {
      this.log("Membuat temporary email baru...");
      const res = await this.req(`${this.mail_url}?action=create`);
      if (!res?.status) return res;
      const email = res?.result?.email || null;
      if (!email) {
        return {
          status: false,
          result: {
            error: "Email tidak ditemukan pada respon temp-mail"
          }
        };
      }
      this.log(`✓ Email dibuat: ${email}`);
      return {
        status: true,
        result: {
          email: email
        }
      };
    } catch (err) {
      this.log("Gagal membuat email:", err?.message);
      return {
        status: false,
        result: {
          error: err?.message || "Error membuat email"
        }
      };
    }
  }
  async cotp(email, max_retries = 15, delay_ms = 3e3) {
    try {
      this.log(`Menunggu kode OTP untuk: ${email}...`);
      for (let i = 0; i < max_retries; i++) {
        await this.slp(delay_ms);
        const res = await this.req(`${this.mail_url}?action=message&email=${encodeURIComponent(email)}`);
        const list = res?.result?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          for (const item of list) {
            const content = item?.text_content || item?.html_content || "";
            const match = content.match(/\b\d{6}\b/);
            if (match?.[0]) {
              this.log(`✓ OTP ditemukan: ${match[0]}`);
              return {
                status: true,
                result: {
                  code: match[0]
                }
              };
            }
          }
        }
      }
      return {
        status: false,
        result: {
          error: "Batas waktu tunggu OTP terlampaui"
        }
      };
    } catch (err) {
      this.log("Gagal cek OTP:", err?.message);
      return {
        status: false,
        result: {
          error: err?.message || "Error cek OTP"
        }
      };
    }
  }
  async reg() {
    try {
      this.log("Memulai auto-registrasi akun WisprFlow...");
      const m = await this.cml();
      if (!m?.status) return m;
      const email = m?.result?.email;
      const pwd = `Pass_${crypto.randomBytes(4).toString("hex")}!`;
      const name = `User_${crypto.randomBytes(3).toString("hex")}`;
      await this.req(`${this.base_url}/user_status?email=${encodeURIComponent(email)}`);
      this.log("Mengirim request pendaftaran...");
      const s_up = await this.req(`${this.base_url}/email/signup`, "POST", {
        email: email,
        password: pwd,
        full_name: name,
        workos_capable: true
      });
      if (!s_up?.status) return s_up;
      const pending_token = s_up?.result?.pending_authentication_token || null;
      if (!pending_token) {
        return {
          status: false,
          result: {
            error: "Pending authentication token tidak ditemukan"
          }
        };
      }
      const otp = await this.cotp(email);
      if (!otp?.status) return otp;
      this.log("Memverifikasi OTP ke WisprFlow...");
      const v_otp = await this.req(`${this.base_url}/email/verify-email-otp`, "POST", {
        code: otp?.result?.code,
        pending_authentication_token: pending_token,
        should_complete_signup: false
      });
      if (!v_otp?.status) return v_otp;
      const token = v_otp?.result?.access_token || null;
      if (!token) {
        return {
          status: false,
          result: {
            error: "Access token tidak ditemukan pada respon verifikasi"
          }
        };
      }
      this.log("Mendaftarkan perangkat virtual...");
      const dev_id = crypto.randomBytes(8).toString("hex");
      const dev = await this.req(`${this.base_url}/api/v1/user/register_device`, "POST", {
        device_id: dev_id,
        device_type: "android",
        device_manufacturer: "realme",
        device_model: "RMX3890",
        device_os_name: "Android",
        device_os_version: "15"
      }, {
        authorization: token
      });
      if (!dev?.status) return dev;
      this.log("✓ Akun WisprFlow berhasil dibuat dan siap digunakan");
      return {
        status: true,
        session: {
          token: token,
          email: email,
          device_id: dev_id,
          created_at: Math.floor(Date.now() / 1e3)
        }
      };
    } catch (err) {
      this.log("Alur registrasi gagal:", err?.message);
      return {
        status: false,
        result: {
          error: err?.message || "Gagal dalam proses registrasi"
        }
      };
    }
  }
  async chk(st) {
    try {
      let s = this.dec(st);
      if (!s?.token) {
        this.log("State tidak ditemukan, otomatis membuat akun baru...");
        const new_acc = await this.reg();
        if (!new_acc?.status) return null;
        return new_acc?.session;
      }
      return s;
    } catch (e) {
      this.log("Error saat verifikasi sesi state:", e?.message);
      const new_acc = await this.reg();
      return new_acc?.session || null;
    }
  }
  async generate({
    state,
    audio,
    ...rest
  } = {}) {
    try {
      if (!audio) {
        this.log('Validasi gagal: Parameter "audio" wajib diisi.');
        return {
          status: false,
          result: {
            error: 'Parameter "audio" wajib diisi (URL, Buffer, atau Base64)'
          },
          state: state || null
        };
      }
      this.log("Memulai transkripsi suara ke teks...");
      let s = await this.chk(state);
      if (!s?.token) {
        return {
          status: false,
          result: {
            error: "Gagal menyiapkan token autentikasi"
          },
          state: state || null
        };
      }
      const c_audio = await this.cva(audio);
      if (!c_audio?.status) {
        return {
          status: false,
          result: {
            error: c_audio?.result?.error || "Format audio tidak valid"
          },
          state: this.enc(s)
        };
      }
      const raw_base64 = c_audio?.result;
      const language = rest?.language || rest?.lang || ["en"];
      const lang_arr = Array.isArray(language) ? language : [language];
      const payload = {
        audio: raw_base64,
        language: lang_arr,
        ...rest
      };
      let res = await this.req(`${this.base_url}/llm/api`, "POST", payload, {
        authorization: s.token
      });
      if (!res?.status && String(res?.result?.error).includes("401")) {
        this.log("Sesi token kedaluwarsa, membuat akun baru...");
        const new_acc = await this.reg();
        if (new_acc?.status) {
          s = new_acc?.session;
          res = await this.req(`${this.base_url}/llm/api`, "POST", payload, {
            authorization: s.token
          });
        }
      }
      if (!res?.status) {
        return {
          status: false,
          result: {
            error: res?.result?.error || "Gagal melakukan transkripsi pada WisprFlow API"
          },
          state: this.enc(s)
        };
      }
      const d = res?.result || {};
      this.log("✓ Transkripsi suara selesai diproses");
      return {
        status: true,
        result: {
          text: d?.text || "",
          total_time: d?.total_time || 0,
          detected_language: d?.detected_language || null,
          generated_tokens: d?.generated_tokens || 0
        },
        state: this.enc(s)
      };
    } catch (err) {
      this.log("Terjadi kesalahan fatal pada generate:", err?.message);
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
    const validActions = ["create", "transcribe", "generate", "auth", "register"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: ["create", "transcribe", "generate", "auth"],
        usage: {
          method: "POST / GET",
          examples: ["/?action=transcribe&audio=https://example.com/sound.mp3&lang=id", "/?action=auth"]
        }
      });
    }
    if (!validActions.includes(action.toLowerCase())) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: ["create", "transcribe", "generate", "auth"]
      });
    }
    const api = new WisprFlow();
    let response;
    const state = params.state || req.headers?.["x-wispr-state"] || null;
    switch (action.toLowerCase()) {
      case "create":
      case "transcribe":
      case "generate": {
        const audio_input = params.audio || params.url || params.file || "";
        if (!audio_input) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' wajib diisi (URL, Base64, atau Buffer)."
          });
        }
        response = await api.generate({
          state: state,
          audio: audio_input,
          language: params.language || params.lang || ["en"],
          ...params
        });
        break;
      }
      case "auth":
      case "register": {
        const reg_res = await api.reg();
        if (reg_res?.status) {
          response = {
            status: true,
            result: {
              email: reg_res.session.email,
              device_id: reg_res.session.device_id
            },
            state: api.enc(reg_res.session)
          };
        } else {
          response = {
            status: false,
            result: {
              error: reg_res?.result?.error || "Gagal melakukan registrasi"
            },
            state: null
          };
        }
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
        error: response?.result?.error || "Gagal memproses request ke WisprFlow API."
      });
    }
  } catch (error) {
    console.error("[FATAL ERROR] Kegagalan pada handler WisprFlow:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}