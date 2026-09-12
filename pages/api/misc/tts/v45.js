import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class VoxClone {
  constructor() {
    this.apiURL = "https://voxcloneai-backend-125302944202.us-central1.run.app/api";
    this.mailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.voicesUrl = "https://raw.githubusercontent.com/SubtitleEdit/subtitleedit/6f7b1e2b0098269831dd21549322b6a4c8756016/src/ui/Assets/TextToSpeech/GoogleVoices.json";
    this.cachedVoices = null;
  }
  toState(obj) {
    try {
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (err) {
      console.error("[State] Gagal melakukan encode ke Base64:", err.message);
      throw err;
    }
  }
  fromState(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : null;
    } catch (err) {
      console.error("[State] Gagal melakukan decode dari Base64:", err.message);
      return null;
    }
  }
  _client(session) {
    try {
      const headers = {
        Accept: "application/json"
      };
      if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
      if (session?.cookies?.length) {
        headers["Cookie"] = session.cookies.join("; ");
        const csrf = session.cookies.join("; ").match(/csrftoken=([^;]+)/);
        if (csrf) headers["X-CSRFToken"] = csrf[1];
      }
      return axios.create({
        baseURL: this.apiURL,
        headers: headers,
        withCredentials: true
      });
    } catch (err) {
      console.error("[Client] Gagal mengonfigurasi axios client:", err.message);
      throw err;
    }
  }
  _saveCookies(res, session) {
    try {
      const cookies = res.headers["set-cookie"];
      if (cookies) {
        session.cookies = cookies;
        console.log("[Cookies] Berhasil memperbarui session cookies.");
      }
    } catch (err) {
      console.error("[Cookies] Gagal menyimpan cookies dari response:", err.message);
    }
  }
  async _prepareFile(input, defaultFilename = "audio.wav") {
    console.log("[File] Mempersiapkan file audio input...");
    try {
      if (Buffer.isBuffer(input) || input && typeof input.pipe === "function") {
        console.log("[File] Input terdeteksi sebagai Buffer atau Stream.");
        return {
          data: input,
          filename: defaultFilename,
          contentType: "audio/wav"
        };
      }
      if (typeof input === "string") {
        const isBase64 = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(input) && input.length % 4 === 0;
        if (isBase64) {
          console.log("[File] Input terdeteksi sebagai Base64 string.");
          return {
            data: Buffer.from(input, "base64"),
            filename: defaultFilename,
            contentType: "audio/wav"
          };
        }
        console.log(`[File] Mengunduh file dari URL: ${input}`);
        const response = await axios.get(input, {
          responseType: "arraybuffer"
        });
        const contentType = response.headers["content-type"] || "audio/wav";
        let filename = defaultFilename;
        const urlPath = new URL(input).pathname;
        const urlFilename = urlPath.split("/").pop();
        if (urlFilename && urlFilename.includes(".")) filename = urlFilename;
        console.log(`[File] Download selesai. Filename: ${filename}, Content-Type: ${contentType}`);
        return {
          data: Buffer.from(response.data),
          filename: filename,
          contentType: contentType
        };
      }
      throw new Error("Format input tidak dikenali (Harus Buffer, Stream, Base64, atau URL).");
    } catch (err) {
      console.error("[File] Kesalahan pemrosesan file audio:", err.message);
      throw err;
    }
  }
  async _createMail() {
    console.log("[Mail] Mengakses API TempMail untuk membuat email baru...");
    try {
      const res = await axios.get(`${this.mailUrl}?action=create`);
      if (!res.data?.email) throw new Error("Format response API TempMail tidak valid.");
      console.log(`[Mail] Email berhasil dibuat: ${res.data.email}`);
      return res.data.email;
    } catch (err) {
      console.error("[Mail] Gagal membuat email sementara:", err.message);
      throw err;
    }
  }
  async _waitOTP(email, max = 15, delay = 3e3) {
    console.log(`[Mail] Memulai pemantauan kotak masuk untuk: ${email}`);
    for (let i = 1; i <= max; i++) {
      try {
        const res = await axios.get(`${this.mailUrl}?action=message&email=${email}`);
        const messages = res.data?.data || [];
        console.log(`[Mail] Cek inbox ke-${i}/${max}: Menemukan ${messages.length} pesan.`);
        for (const msg of messages) {
          const otp = (msg.text_content || "").match(/\b\d{6}\b/);
          if (otp) {
            console.log(`[Mail] OTP ditemukan: ${otp[0]}`);
            return otp[0];
          }
        }
      } catch (err) {
        console.log(`[Mail] Gagal membaca pesan pada percobaan ke-${i}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error("Timeout! OTP tidak masuk ke dalam inbox hingga batas maksimal.");
  }
  async auth() {
    console.log("[Auth] Memulai siklus registrasi & otentikasi akun baru...");
    try {
      const email = await this._createMail();
      const rand = crypto.randomBytes(4).toString("hex");
      const user = `usr_${rand}`;
      const pass = `P@ss_${crypto.randomBytes(6).toString("base64url")}`;
      console.log(`[Auth][Signup] Mendaftarkan kredensial user: ${user}`);
      const client = this._client();
      const signupRes = await client.post("/auth/signup/", {
        email: email,
        username: user,
        first_name: `Gen_${rand}`,
        last_name: "User",
        password: pass,
        password_confirm: pass,
        profession: "developer",
        purpose: "personal"
      });
      console.log("[Auth][Signup] Response sukses:", signupRes.data?.message || "Akun terdaftar.");
      const otp = await this._waitOTP(email);
      const session = {
        cookies: [],
        token: null,
        email: email,
        pass: pass
      };
      console.log("[Auth][Verify] Mengirimkan verifikasi kode OTP ke server...");
      const verifyRes = await client.post("/auth/verify-email/", {
        email: email,
        code: otp
      });
      this._saveCookies(verifyRes, session);
      if (verifyRes.data?.token) session.token = verifyRes.data.token;
      console.log("[Auth][Verify] Email berhasil diverifikasi.");
      console.log("[Auth][Login] Melakukan login untuk mengaktifkan session cookie final...");
      const loginRes = await this._client(session).post("/auth/login/", {
        email: email,
        password: pass
      });
      this._saveCookies(loginRes, session);
      if (loginRes.data?.token) session.token = loginRes.data.token;
      console.log("[Auth] Seluruh rangkaian proses autentikasi berhasil diselesaikan.");
      return {
        result: {
          message: "Authentication successful",
          state: this.toState(session)
        }
      };
    } catch (err) {
      console.error("[Auth] Kegagalan sistem pada alur registrasi/autentikasi:", err.message);
      if (err.response) console.error("[Auth API Error Detail]:", err.response.data);
      throw err;
    }
  }
  async voice_list() {
    console.log("[VoiceList] Meminta daftar real Google Voice dari GitHub...");
    try {
      if (!this.cachedVoices) {
        console.log(`[VoiceList] Fetching remote data: ${this.voicesUrl}`);
        const response = await axios.get(this.voicesUrl);
        if (response.data && Array.isArray(response.data.voices)) {
          this.cachedVoices = response.data.voices.map(v => v.name);
          console.log(`[VoiceList] Berhasil caching ${this.cachedVoices.length} nama voice dari remote data.`);
        } else {
          throw new Error("Format skema dokumen JSON dari GitHub tidak sesuai.");
        }
      } else {
        console.log("[VoiceList] Menggunakan data list yang tersimpan di memori cache.");
      }
      return {
        result: this.cachedVoices
      };
    } catch (err) {
      console.error("[VoiceList] Kegagalan mengambil data voice list:", err.message);
      throw err;
    }
  }
  async generate({
    state,
    type = "tts",
    text,
    voice = "id-ID-Standard-A",
    file,
    language_code = "id-ID",
    platform = "mobile_app",
    filename,
    ...rest
  } = {}) {
    console.log(`[Generate] Memulai pemicuan proses generasi dengan type: [${type}]`);
    try {
      if (!text) throw new Error("Parameter konten 'text' wajib diisi.");
      const validModes = ["tts", "cloning", "stt"];
      if (!validModes.includes(type.toLowerCase())) {
        throw new Error(`Tipe type '${type}' tidak didukung! Opsi yang tersedia: ${validModes.join(", ")}`);
      }
      let activeState = state;
      if (!activeState) {
        console.log("[Generate] Parameter 'state' tidak ditemukan. Memanggil pemicu Auto-Auth...");
        const authData = await this.auth();
        activeState = authData.result.state;
      }
      console.log("[Generate] Parsing data session state...");
      const session = this.fromState(activeState);
      if (!session) throw new Error("Session state kedaluwarsa atau struktur string base64 rusak.");
      if (type.toLowerCase() === "tts") {
        console.log(`[Generate][TTS] Mengirim payload TTS ke endpoint. Voice: ${voice}, Lang: ${language_code}`);
        const client = this._client(session);
        const res = await client.post("/tts/generate/", {
          text: text,
          voice_name: voice,
          language_code: language_code,
          ...rest
        });
        console.log("[Generate][TTS] Berhasil diproses oleh backend server.");
        return {
          result: res.data,
          state: activeState
        };
      }
      if (type.toLowerCase() === "cloning" || type.toLowerCase() === "stt") {
        if (!file) throw new Error(`Parameter 'file' tidak boleh kosong untuk pemrosesan type ${type}.`);
        const {
          data: fileData,
          filename: detectedFilename,
          contentType
        } = await this._prepareFile(file, filename);
        console.log(`[Generate][${type.toUpperCase()}] Menyusun muatan multipart/form-data...`);
        const form = new FormData();
        form.append("text_content", text);
        form.append("platform", platform);
        form.append("reference_audio", fileData, {
          filename: detectedFilename,
          contentType: contentType
        });
        if (voice) form.append("gallery_audio_name", voice);
        Object.keys(rest).forEach(k => {
          if (k !== "filename" && k !== "platform") form.append(k, rest[k]);
        });
        console.log(`[Generate][${type.toUpperCase()}] Mengirim data stream file ke backend server...`);
        const client = this._client(session);
        const res = await client.post("/cloning/request/", form, {
          headers: {
            ...form.getHeaders()
          }
        });
        console.log(`[Generate][${type.toUpperCase()}] Request berhasil diproses.`);
        return {
          result: res.data,
          state: activeState
        };
      }
    } catch (err) {
      console.error(`[Generate] Operasi gagal dieksekusi pada type [${type}]:`, err.message);
      if (err.response) console.error("[Generate API Error Response]:", err.response.data);
      throw err;
    }
  }
  async history({
    state,
    type = "cloning",
    ...rest
  } = {}) {
    console.log(`[History] Meminta log riwayat transaksi untuk sub-kategori: ${type}...`);
    try {
      let activeState = state;
      if (!activeState) {
        console.log("[History] Sesi state kosong. Memicu otentikasi otomatis...");
        const authData = await this.auth();
        activeState = authData.result.state;
      }
      console.log("[History] Memvalidasi keabsahan data session token...");
      const session = this.fromState(activeState);
      if (!session) throw new Error("Sesi Base64 tidak dapat terbaca dengan benar.");
      const endpoint = type === "cloning" ? "/cloning/my-requests/" : "/tts/history/";
      console.log(`[History] Mengirim request GET ke ${endpoint}`);
      const res = await this._client(session).get(endpoint, {
        params: rest
      });
      console.log(`[History] Data riwayat berhasil diperoleh.`);
      return {
        result: res.data,
        state: activeState
      };
    } catch (err) {
      console.error("[History] Gagal memuat data riwayat transaksi:", err.message);
      if (err.response) console.error("[History API Error Response]:", err.response.data);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "voice_list", "history"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&text=Halo+dunia"
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
  const api = new VoxClone();
  try {
    let response;
    switch (action) {
      case "voice_list":
        response = await api.voice_list();
        break;
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "history":
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'history'."
          });
        }
        response = await api.history(params);
        break;
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}