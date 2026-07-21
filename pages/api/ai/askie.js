import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class AskieClient {
  constructor() {
    try {
      console.log("[PROSES] Menginisialisasi AskieClient...");
      this.modes = ["chat", "image"];
      this.urls = {
        mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
        auth: "https://sbenodiz.uk.auth0.com",
        api: "https://askie-backend-production.up.railway.app/api/generate"
      };
      this.ax = axios.create({
        timeout: 6e4
      });
      this._intercept();
    } catch (err) {
      console.error("[ERR] Gagal memproses konstruktor:", err.message);
    }
  }
  _intercept() {
    try {
      console.log("[PROSES] Memasang interceptor jaringan...");
      this.ax.interceptors.request.use(config => {
        console.log(`[REQ] ${config.method?.toUpperCase()} -> ${config.url}`);
        return config;
      }, error => {
        console.error("[REQ ERROR]", error?.message || error);
        return Promise.reject(error);
      });
      this.ax.interceptors.response.use(response => {
        console.log(`[RES] ${response.status} <- ${response.config.url}`);
        return response;
      }, error => {
        if (error?.config?.responseType !== "stream") {
          console.error("[RES ERROR]", error?.response?.data || error?.message || error);
        }
        return Promise.reject(error);
      });
    } catch (err) {
      console.error("[ERR] Gagal memasang interceptor:", err.message);
    }
  }
  _rnd(len = 6) {
    try {
      console.log(`[PROSES] Menghasilkan string acak hex (${len} byte)...`);
      return crypto.randomBytes(len).toString("hex");
    } catch (err) {
      console.error("[ERR] Gagal generate string acak:", err.message);
      return "abc123";
    }
  }
  _num(min = 1, max = 100) {
    try {
      console.log(`[PROSES] Menghasilkan angka acak rentang ${min}-${max}...`);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (err) {
      console.error("[ERR] Gagal generate angka acak:", err.message);
      return min;
    }
  }
  async _mail() {
    try {
      console.log("[PROSES] Meminta pembuatan email sementara baru...");
      const res = await this.ax.get(`${this.urls.mail}?action=create`);
      const email = res.data?.email || null;
      console.log(`[PROSES] Email sementara didapatkan: ${email}`);
      return email;
    } catch (err) {
      console.error("[ERR] Gagal membuat email sementara:", err.message);
      return null;
    }
  }
  async _otp(email) {
    try {
      console.log(`[PROSES] Mengambil kotak masuk email untuk: ${email}`);
      const res = await this.ax.get(`${this.urls.mail}?action=message&email=${email}`);
      const messages = res.data?.data || [];
      console.log(`[PROSES] Ditemukan ${messages.length} pesan di kotak masuk.`);
      for (const msg of messages) {
        const text = msg?.text_content || "";
        const match = text.match(/https:\/\/sbenodiz\.uk\.auth0\.com\/u\/email-verification\?ticket=[a-zA-Z0-9_-]+/);
        if (match) {
          console.log("[PROSES] Link verifikasi bersih berhasil diisolasi.");
          return match[0];
        }
      }
    } catch (err) {
      console.error("[ERR] Gagal memeriksa kotak masuk:", err.message);
    }
    return null;
  }
  _enc(obj) {
    try {
      console.log("[PROSES] Menyandikan state objek ke Base64...");
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (err) {
      console.error("[ERR] Gagal menyandikan data ke Base64:", err.message);
      return "";
    }
  }
  _dec(str) {
    try {
      console.log("[PROSES] Mendekode data state dari Base64...");
      if (!str) return null;
      return JSON.parse(Buffer.from(str, "base64").toString("utf8"));
    } catch (err) {
      console.error("[ERR] Gagal mendekode Base64 ke objek:", err.message);
      return null;
    }
  }
  _mime(input) {
    try {
      console.log("[PROSES] Mengidentifikasi format Mime-Type secara otomatis...");
      if (Buffer.isBuffer(input)) {
        const hex = input.toString("hex", 0, 4).toUpperCase();
        if (hex.startsWith("89504E47")) return "image/png";
        if (hex.startsWith("FFD8FF")) return "image/jpeg";
        if (hex.startsWith("47494638")) return "image/gif";
        if (input.toString("ascii", 8, 12) === "WEBP") return "image/webp";
      } else if (typeof input === "string") {
        if (input.startsWith("data:")) {
          const match = input.match(/data:(image\/[a-zA-Z+]+);base64,/);
          if (match) return match[1];
        }
        const clean = input.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim().substring(0, 10);
        if (clean.startsWith("iVBORw0KGgo")) return "image/png";
        if (clean.startsWith("/9j/")) return "image/jpeg";
        if (clean.startsWith("R0lGOD")) return "image/gif";
        if (clean.startsWith("UklGR")) return "image/webp";
      }
    } catch (err) {
      console.error("[ERR] Kegagalan memindai tipe mime:", err.message);
    }
    return "image/jpeg";
  }
  async _img(input) {
    try {
      console.log("[PROSES] Memulai pemrosesan input gambar...");
      if (!input) return null;
      let buffer = null;
      let mimeType = "image/jpeg";
      let base64Data = "";
      if (Buffer.isBuffer(input)) {
        console.log("[PROSES] Gambar terbaca sebagai biner Buffer.");
        buffer = input;
        mimeType = this._mime(buffer);
        base64Data = buffer.toString("base64");
      } else if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log(`[PROSES] Gambar terbaca sebagai tautan URL: ${input}`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          const typeHeader = res.headers?.["content-type"];
          mimeType = typeHeader?.startsWith("image/") ? typeHeader : this._mime(buffer);
          base64Data = buffer.toString("base64");
        } else if (input.startsWith("data:image")) {
          console.log("[PROSES] Gambar terbaca sebagai Data-URL Base64.");
          mimeType = this._mime(input);
          base64Data = input.split(",")[1] || "";
        } else {
          console.log("[PROSES] Gambar terbaca sebagai raw Base64 string.");
          mimeType = this._mime(input);
          base64Data = input;
        }
      }
      console.log(`[PROSES] Deteksi selesai. Mime: ${mimeType}, Ukuran karakter: ${base64Data.length}`);
      return {
        data: base64Data,
        mimeType: mimeType
      };
    } catch (err) {
      console.error("[ERR] Gagal menyelesaikan konversi data gambar:", err.message);
      return null;
    }
  }
  async _verifyEmail(verificationUrl) {
    try {
      const userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36";
      const resGet = await this.ax.get(verificationUrl, {
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "id,ms;q=0.9,en;q=0.8"
        }
      });
      const cookies = resGet.headers["set-cookie"] || [];
      const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");
      const html = resGet.data || "";
      const stateMatch = html.match(/name="state"\s+value="([^"]+)"/) || html.match(/value="([^"]+)"\s+name="state"/);
      if (!stateMatch) {
        console.warn("[WARN] Parameter state konfirmasi verifikasi gagal diisolasi secara otomatis.");
        return false;
      }
      const stateValue = stateMatch[1];
      console.log(`[PROSES] State verifikasi didapatkan: ${stateValue}. Mengirim formulir konfirmasi...`);
      await this.ax.post(verificationUrl, `state=${encodeURIComponent(stateValue)}`, {
        headers: {
          "User-Agent": userAgent,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieHeader,
          Origin: this.urls.auth,
          Referer: verificationUrl,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
      });
      console.log("[PROSES] Status email berhasil diverifikasi sepenuhnya.");
      return true;
    } catch (err) {
      console.error("[ERR] Gagal memproses rantai konfirmasi verifikasi email:", err.message);
      return false;
    }
  }
  async _auth(savedState) {
    try {
      console.log("[PROSES] Mengecek status kredensial yang diajukan...");
      const stateData = this._dec(savedState || "");
      let email = stateData?.email;
      let pass = stateData?.password;
      if (email && pass) {
        console.log("[PROSES] Kredensial ditemukan dalam state. Melompati pendaftaran dan langsung login...");
      } else {
        console.log("[PROSES] Kredensial tidak ditemukan. Memulai pendaftaran akun baru...");
        email = await this._mail();
        if (!email) return null;
        pass = `Askie_${this._rnd(3).toUpperCase()}${this._rnd(3).toLowerCase()}${this._num(10, 99)}!`;
        const name = `user_${this._rnd(4)}`;
        console.log("[PROSES] Mendaftarkan pengguna baru pada platform Auth0...");
        const signupRes = await this.ax.post(`${this.urls.auth}/dbconnections/signup`, {
          email: email,
          password: pass,
          connection: "Username-Password-Authentication",
          client_id: "Se3v7Wy5lKq2ZBTeDBDWWfGiFoWiNecl",
          name: name
        }, {
          headers: {
            "User-Agent": "okhttp/4.12.0",
            "Content-Type": "application/json",
            "auth0-client": "eyJuYW1lIjoiQXV0aDAuQW5kcm9pZCIsImVudiI6eyJhbmRyb2lkIjoiMzUifSwidmVyc2lvbiI6IjIuMTAuMiJ9"
          }
        }).catch(err => {
          console.error("[ERR] Penolakan pendaftaran oleh Auth0:", err.message);
          return null;
        });
        if (!signupRes) return null;
        let verificationUrl = null;
        for (let i = 0; i < 30; i++) {
          console.log(`[PROSES] Memantau email masuk (Siklus ${i + 1}/8)...`);
          await new Promise(r => setTimeout(r, 3e3));
          verificationUrl = await this._otp(email);
          if (verificationUrl) break;
        }
        if (!verificationUrl) {
          console.error("[ERR] Batas waktu penantian tautan aktivasi habis.");
          return null;
        }
        console.log("[PROSES] Menjalankan verifikasi akun melalui rantai pengalihan rute...");
        const isVerified = await this._verifyEmail(verificationUrl);
        if (!isVerified) {
          console.error("[ERR] Proses pendaftaran terhenti karena gagal memvalidasi email.");
          return null;
        }
      }
      console.log("[PROSES] Menukarkan kredensial dengan akses token...");
      const tokenRes = await this.ax.post(`${this.urls.auth}/oauth/token`, {
        client_id: "Se3v7Wy5lKq2ZBTeDBDWWfGiFoWiNecl",
        scope: "openid profile email offline_access",
        username: email,
        password: pass,
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        realm: "Username-Password-Authentication",
        audience: "https://askie-api.sbenodiz.com"
      }, {
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Content-Type": "application/json",
          "auth0-client": "eyJuYW1lIjoiQXV0aDAuQW5kcm9pZCIsImVudiI6eyJhbmRyb2lkIjoiMzUifSwidmVyc2lvbiI6IjIuMTAuMiJ9"
        }
      }).catch(err => {
        console.error("[ERR] Gagal memvalidasi token akses:", err.message);
        return null;
      });
      const token = tokenRes?.data?.access_token;
      if (!token) return null;
      return {
        email: email,
        password: pass,
        token: token
      };
    } catch (err) {
      console.error("[ERR] Kesalahan fatal dalam siklus autentikasi:", err.message);
      return null;
    }
  }
  async generate({
    state,
    mode,
    prompt = "",
    messages = [],
    image = null,
    ...rest
  }) {
    try {
      const selectedMode = typeof mode === "string" ? mode.trim().toLowerCase() : "";
      if (!selectedMode || !this.modes.includes(selectedMode)) {
        console.error(`[ERR] Percobaan akses menggunakan mode tidak valid: "${mode}"`);
        return {
          status: false,
          result: `Mode tidak valid atau kosong. Silakan tentukan parameter 'mode' yang sesuai.`,
          available_modes: this.modes,
          state: state
        };
      }
      if (selectedMode === "chat" && !prompt && (!messages || messages.length === 0)) {
        console.error('[ERR] Parameter wajib "prompt" atau "messages" tidak terpenuhi untuk mode chat.');
        return {
          status: false,
          result: `Input required: Parameter 'prompt' atau 'messages' wajib diisi untuk mode 'chat'.`,
          state: state
        };
      }
      if (selectedMode === "image" && !prompt) {
        console.error('[ERR] Parameter wajib "prompt" tidak terpenuhi untuk mode image.');
        return {
          status: false,
          result: `Input required: Parameter 'prompt' wajib diisi untuk mode 'image'.`,
          state: state
        };
      }
      console.log(`[PROSES] Menyiapkan generate dengan mode: ${selectedMode}`);
      const session = await this._auth(state);
      if (!session) {
        console.error("[GAGAL] Kredensial tidak valid untuk proses generasi.");
        return {
          status: false,
          result: "Sesi autentikasi gagal diperoleh.",
          state: state
        };
      }
      const activeState = this._enc({
        email: session.email,
        password: session.password
      });
      const randSecToken = `askie_android_${this._num(1e5, 999999)}`;
      const headers = {
        authorization: `Bearer ${session.token}`,
        "x-request-source": "android-app",
        "x-app-version": "1.0.0",
        "x-security-token": rest.securityToken || randSecToken,
        "Content-Type": "application/json",
        "User-Agent": "okhttp/4.12.0"
      };
      const resolvedImage = await this._img(image);
      switch (selectedMode) {
        case "image": {
          console.log("[PROSES] Menyiapkan parameter image generation...");
          const payload = {
            childAge: rest.childAge || this._num(5, 12),
            childId: rest.childId || `child-${this._rnd(8)}`,
            context: {
              contextWindowSize: 3,
              messages: messages.length ? messages : [{
                content: prompt,
                role: "user",
                timestamp: new Date().toISOString()
              }],
              timestamp: new Date().toISOString()
            },
            imageStyle: rest.imageStyle || {
              description: "Fun animated style like Disney/Pixar",
              emoji: "🎨",
              id: `style-${this._rnd(8)}`,
              name: "Cartoon",
              promptModifier: "in a cartoon style, colorful 3D animated movie style"
            },
            prompt: prompt,
            sessionId: rest.sessionId || `session-${this._rnd(12)}`,
            type: "IMAGE",
            ...rest
          };
          if (resolvedImage) {
            payload.context.messages = [{
              content: "[User uploaded image for editing]",
              imageData: {
                data: resolvedImage.data,
                mimeType: resolvedImage.mimeType
              },
              role: "model",
              timestamp: new Date().toISOString()
            }];
          }
          console.log("[PROSES] Mengirim paket permintaan gambar...");
          const res = await this.ax.post(`${this.urls.api}/image`, payload, {
            headers: headers
          });
          return {
            status: true,
            result: res.data?.content || res.data,
            chunks: [],
            state: activeState
          };
        }
        case "chat": {
          console.log("[PROSES] Menyiapkan parameter percakapan teks...");
          const activeMessages = [...messages];
          if (prompt) {
            activeMessages.push({
              role: "user",
              content: prompt
            });
          }
          const payload = {
            prompt: prompt,
            childAge: rest.childAge || this._num(5, 12),
            childId: rest.childId || crypto.randomUUID(),
            sessionId: rest.sessionId || `session-${this._rnd(12)}`,
            context: {
              messages: activeMessages
            },
            ...rest
          };
          if (resolvedImage) {
            payload.imageData = `data:${resolvedImage.mimeType};base64,${resolvedImage.data}`;
          }
          console.log("[PROSES] Memulai pengiriman request stream ke server...");
          const res = await this.ax.post(`${this.urls.api}/chat/stream`, payload, {
            headers: headers,
            responseType: "stream",
            validateStatus: status => status >= 200 && status < 500
          });
          if (res.status >= 400) {
            let errorData = "";
            return new Promise(resolve => {
              res.data.on("data", chunk => {
                errorData += chunk.toString();
              });
              res.data.on("end", () => {
                console.error(`[ERR] Server menolak paket request stream dengan status ${res.status}:`, errorData);
                resolve({
                  status: false,
                  result: `Server Error (${res.status}): ${errorData || "Gagal memproses stream"}`,
                  state: undefined
                });
              });
            });
          }
          let completeResponse = "";
          const chunks = [];
          return new Promise(resolve => {
            res.data.on("data", chunk => {
              try {
                const lines = chunk.toString().split("\n");
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith("data:")) {
                    const rawData = trimmed.substring(5).trim();
                    if (rawData) {
                      const parsed = JSON.parse(rawData);
                      chunks.push(parsed);
                      if (parsed.type === "chunk" && parsed.content) {
                        completeResponse += parsed.content;
                      }
                      if (parsed.type === "complete") {
                        completeResponse = parsed.fullContent || completeResponse;
                      }
                    }
                  }
                }
              } catch (e) {}
            });
            res.data.on("end", () => {
              console.log("[PROSES] Aliran stream data telah selesai diterima.");
              resolve({
                status: true,
                result: completeResponse,
                chunks: chunks,
                state: activeState
              });
            });
            res.data.on("error", err => {
              console.error("[ERR] Kesalahan pada tengah penerimaan stream:", err.message);
              resolve({
                status: false,
                result: err.message,
                chunks: chunks,
                state: activeState
              });
            });
          });
        }
        default: {
          return {
            status: false,
            result: "Mode tidak dikenali.",
            state: state
          };
        }
      }
    } catch (err) {
      console.error("[GAGAL] Terjadi hambatan pemrosesan generatif:", err.message);
      return {
        status: false,
        result: err.message,
        state: state
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AskieClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}