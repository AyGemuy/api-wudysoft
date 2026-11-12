import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class ZskyClient {
  constructor() {
    this.auth_base_url = "https://auth.zsky.ai";
    this.api_base_url = "https://zsky.ai";
    this.mail_api_url = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.gen_api_url = "https://zsky.ai/api/generations";
    this.anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlya2ZwdXRrdmlvanNodG5ndXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDE5NjIsImV4cCI6MjA3ODkxNzk2Mn0.YU4LUdgrjNN5SDvB4E3XNNZvxeel3l5BhxtJaAwt2pc";
    this.default_headers = {
      "User-Agent": "okhttp/5.1.0",
      "Accept-Encoding": "gzip",
      "x-zsky-client": "android",
      "Content-Type": "application/json"
    };
    this.http = axios.create({
      timeout: 0
    });
    this.http.interceptors.request.use(cfg => {
      cfg.headers = cfg?.headers || {};
      return cfg;
    }, err => Promise.reject(err));
    this.http.interceptors.response.use(res => res, err => Promise.reject(err));
  }
  slp(ms = 1e3) {
    try {
      return new Promise(resolve => setTimeout(resolve, ms));
    } catch (e) {
      console.log(`[Sleep Error] ${e?.message || e}`);
      return Promise.resolve();
    }
  }
  b64Enc(data) {
    try {
      return Buffer.from(JSON.stringify(data || {})).toString("base64");
    } catch (e) {
      console.log(`[b64Enc Error] ${e?.message || e}`);
      return null;
    }
  }
  b64Dec(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf8")) : null;
    } catch (e) {
      console.log(`[b64Dec Error] ${e?.message || e}`);
      return null;
    }
  }
  rndStr(len = 16) {
    try {
      return crypto.randomBytes(len).toString("hex");
    } catch (e) {
      console.log(`[rndStr Error] ${e?.message || e}`);
      return Math.random().toString(36).substring(2, 2 + len);
    }
  }
  genPkce() {
    try {
      const verifier = crypto.randomBytes(32).toString("base64url");
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      return {
        verifier: verifier,
        challenge: challenge
      };
    } catch (e) {
      console.log(`[genPkce Error] ${e?.message || e}`);
      return {
        verifier: "",
        challenge: ""
      };
    }
  }
  async parseBuf(input) {
    try {
      if (Buffer.isBuffer(input)) {
        return {
          buf: input,
          mime: "image/jpeg"
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log(`[Media] Mengunduh media dari URL: ${input}`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = res?.headers?.["content-type"] || "image/jpeg";
          return {
            buf: Buffer.from(res?.data || []),
            mime: mime
          };
        }
        if (input.startsWith("data:")) {
          const parts = input.split(",");
          const mimeMatch = parts?.[0]?.match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
          return {
            buf: Buffer.from(parts?.[1] || "", "base64"),
            mime: mime
          };
        }
        return {
          buf: Buffer.from(input, "base64"),
          mime: "image/jpeg"
        };
      }
      return null;
    } catch (e) {
      console.log(`[parseBuf Error] ${e?.message || e}`);
      return null;
    }
  }
  async regAcc() {
    try {
      console.log("[Auth] Mengambil email sementara...");
      const mailRes = await this.http.get(`${this.mail_api_url}?action=create`);
      const email = mailRes?.data?.email;
      if (!email) {
        console.log("[Auth] Gagal mendapatkan email dari penyedia sementara");
        return null;
      }
      const password = `Zsky${this.rndStr(4)}!A1`;
      const {
        challenge
      } = this.genPkce();
      console.log(`[Auth] Mendaftarkan akun baru: ${email}`);
      await this.http.post(`${this.auth_base_url}/auth/v1/signup?redirect_to=zskyai://auth-callback`, {
        email: email,
        password: password,
        code_challenge: challenge,
        code_challenge_method: "s256"
      }, {
        headers: {
          "Content-Type": "application/json",
          apikey: this.anon_key,
          authorization: `Bearer ${this.anon_key}`,
          "x-client-info": "supabase-kt/3.2.6",
          "x-supabase-client-platform": "Android"
        }
      });
      console.log("[Auth] Menunggu email link verifikasi masuk...");
      let verifyUrl = null;
      while (!verifyUrl) {
        await this.slp(3e3);
        const msgRes = await this.http.get(`${this.mail_api_url}?action=message&email=${email}`);
        const list = msgRes?.data?.data || [];
        for (const item of list) {
          const content = item?.text_content || item?.html_content || "";
          const match = content.match(/https:\/\/auth\.zsky\.ai\/auth\/v1\/verify\?[^\s'"<>]+/);
          if (match) {
            verifyUrl = match[0];
            break;
          }
        }
      }
      console.log("[Auth] Mengeksekusi verifikasi akun...");
      await axios.get(verifyUrl, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("[Auth] Mengambil token akses (Login)...");
      const loginRes = await this.http.post(`${this.auth_base_url}/auth/v1/token?grant_type=password&redirect_to=zskyai://auth-callback`, {
        email: email,
        password: password
      }, {
        headers: {
          "Content-Type": "application/json",
          apikey: this.anon_key,
          authorization: `Bearer ${this.anon_key}`,
          "x-client-info": "supabase-kt/3.2.6",
          "x-supabase-client-platform": "Android"
        }
      });
      const token = loginRes?.data?.access_token;
      const userId = loginRes?.data?.user?.id;
      if (!token) {
        console.log("[Auth] Gagal memperoleh access token");
        return null;
      }
      console.log("[Auth] Konfirmasi batasan umur (confirm adult age)...");
      await this.http.post(`${this.auth_base_url}/rest/v1/rpc/confirm_adult_age`, {}, {
        headers: {
          apikey: this.anon_key,
          authorization: `Bearer ${token}`,
          "x-client-info": "supabase-kt/3.2.6",
          "x-supabase-client-platform": "Android"
        }
      });
      return {
        access_token: token,
        user_id: userId,
        email: email,
        password: password
      };
    } catch (e) {
      console.log(`[regAcc Error] ${e?.response?.data?.msg || e?.message || e}`);
      return null;
    }
  }
  async upMedia(mediaItem, token) {
    try {
      const parsed = await this.parseBuf(mediaItem);
      if (!parsed?.buf) {
        console.log("[Media] Resolusi payload biner media gagal");
        return null;
      }
      const {
        buf,
        mime
      } = parsed;
      const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
      const sizeBytes = buf.length;
      console.log(`[Media] Meminta presigned URL upload (SHA: ${sha256.substring(0, 8)}...)...`);
      const intakeRes = await this.http.post(`${this.api_base_url}/api/intake/v1/uploads`, {
        content_type: mime,
        sha256: sha256,
        size_bytes: sizeBytes
      }, {
        headers: {
          ...this.default_headers,
          authorization: `Bearer ${token}`
        }
      });
      const {
        object_key,
        upload_url,
        required_headers
      } = intakeRes?.data || {};
      if (!upload_url) {
        console.log("[Media] Gagal mendapatkan URL upload dari intake API");
        return null;
      }
      console.log("[Media] Mengunggah buffer media ke storage cloud...");
      await axios.put(upload_url, buf, {
        headers: {
          "Content-Type": "application/octet-stream",
          ...required_headers
        }
      });
      console.log("[Media] Media berhasil diunggah sepenuhnya");
      return {
        content_type: mime,
        object_key: object_key,
        sha256: sha256,
        size_bytes: sizeBytes
      };
    } catch (e) {
      console.log(`[upMedia Error] ${e?.response?.data || e?.message || e}`);
      return null;
    }
  }
  async getJob(jobId, token) {
    try {
      console.log(`[Job] Cek status intake job: ${jobId}`);
      const res = await this.http.get(`${this.api_base_url}/api/intake/v1/jobs/${jobId}`, {
        headers: {
          ...this.default_headers,
          authorization: `Bearer ${token}`
        }
      });
      return res?.data;
    } catch (e) {
      console.log(`[getJob Error] ${e?.response?.data || e?.message || e}`);
      return {
        error: e?.message || "Failed to get job status"
      };
    }
  }
  async getGen(token, rest = {}) {
    try {
      console.log("[Generations] Mengambil generation list dari /api/generations...");
      const page = rest?.page || 1;
      const perPage = rest?.per_page || 20;
      const filter = rest?.filter || "all";
      const res = await this.http.get(`${this.gen_api_url}?page=${page}&per_page=${perPage}&filter=${filter}`, {
        headers: {
          ...this.default_headers,
          authorization: `Bearer ${token}`
        }
      });
      return res?.data;
    } catch (e) {
      console.log(`[getGen Error] ${e?.response?.data || e?.message || e}`);
      return {
        error: e?.message || "Failed to fetch generations"
      };
    }
  }
  async status({
    state,
    job_id,
    ...rest
  } = {}) {
    try {
      console.log("[Status] Memeriksa status task...");
      const authData = this.b64Dec(state);
      if (!authData?.access_token) {
        console.log("[Status Validation] State valid dengan access_token diperlukan.");
        return {
          status: false,
          result: {
            error: "valid state with access_token is required"
          },
          state: state || null
        };
      }
      const token = authData.access_token;
      if (job_id) {
        const jobRes = await this.getJob(job_id, token);
        const jobState = jobRes?.job?.state || jobRes?.state;
        console.log(`[Status] State job: ${jobState || "unknown"}`);
        if (jobState === "dispatched" || jobState === "completed" || jobState === "succeeded") {
          console.log("[Status] Job sudah dispatched, mengambil generation list...");
          const genRes = await this.getGen(token, rest);
          return {
            status: true,
            result: genRes,
            state: this.b64Enc(authData)
          };
        }
        return {
          status: true,
          result: jobRes,
          state: this.b64Enc(authData)
        };
      }
      const genRes = await this.getGen(token, rest);
      return {
        status: true,
        result: genRes,
        state: this.b64Enc(authData)
      };
    } catch (err) {
      console.log(`[status Error] ${err?.response?.data || err?.message || err}`);
      return {
        status: false,
        result: err?.response?.data || {
          error: err?.message || "Status check error"
        },
        state: state || null
      };
    }
  }
  async generate({
    state,
    prompt,
    media,
    ...rest
  } = {}) {
    try {
      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        console.log("[Generate Validation] Parameter prompt wajib diisi.");
        return {
          status: false,
          result: {
            error: "prompt is required and must be a non-empty string"
          },
          state: state || null
        };
      }
      console.log("[Process] Memulai submit task generasi (tanpa polling)...");
      let authData = this.b64Dec(state);
      if (!authData?.access_token) {
        console.log("[Auth] State kosong/kadaluarsa, mendaftarkan akun baru...");
        authData = await this.regAcc();
        if (!authData?.access_token) {
          return {
            status: false,
            result: {
              error: "Gagal membuat atau mengautentikasi akun"
            },
            state: null
          };
        }
      } else {
        console.log(`[Auth] Sesi digunakan: ${authData?.email || "authenticated"}`);
      }
      const mediaPayload = [];
      const mediaList = media ? Array.isArray(media) ? media : [media] : [];
      for (const item of mediaList) {
        const uploaded = await this.upMedia(item, authData.access_token);
        if (uploaded) {
          mediaPayload.push(uploaded);
        }
      }
      const hasMedia = mediaPayload.length > 0;
      const kind = rest?.kind || (hasMedia ? "i2i" : "image_hd");
      const jobBody = {
        kind: kind,
        media: mediaPayload,
        params: {
          width: rest?.width || 832,
          height: rest?.height || 1216,
          quality: rest?.quality || "hd",
          resolution: rest?.resolution || "hd",
          ...rest?.params
        },
        prompt: prompt.trim()
      };
      const idempotencyKey = `android-${crypto.randomUUID()}`;
      console.log(`[Job] Mengirim payload ke intake jobs (Jenis: ${kind})...`);
      const submitRes = await this.http.post(`${this.api_base_url}/api/intake/v1/jobs`, jobBody, {
        headers: {
          ...this.default_headers,
          "idempotency-key": idempotencyKey,
          authorization: `Bearer ${authData.access_token}`
        }
      });
      console.log("[Process] Task berhasil dikirim ke antrean server.");
      return {
        status: true,
        result: submitRes?.data,
        state: this.b64Enc(authData)
      };
    } catch (err) {
      console.log(`[generate Error] ${err?.message || err}`);
      return {
        status: false,
        result: err?.response?.data || {
          error: err?.message || "Internal generate error"
        },
        state: state || null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["generate", "status", "list", "init"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          generate: "/?action=generate&prompt=Cyberpunk+car (Bisa POST dengan { prompt, state, media, width, height, quality })",
          status: "/?action=status&job_id=xxx&state=yyy (Cek status job; otomatis get list generasi jika dispatched)",
          list: "/?action=list&state=yyy (Ambil seluruh riwayat output generasi)",
          init: "/?action=init (Registrasi akun baru & dapatkan base64 state)"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new ZskyClient();
  try {
    let response;
    switch (action) {
      case "generate": {
        if (!params?.prompt || typeof params.prompt !== "string" || params.prompt.trim() === "") {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi string untuk action generate."
          });
        }
        response = await api.generate({
          state: params?.state,
          prompt: params?.prompt,
          media: params?.media,
          ...params
        });
        break;
      }
      case "status": {
        if (!params?.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib disertakan untuk action status."
          });
        }
        response = await api.status({
          state: params?.state,
          job_id: params?.job_id,
          ...params
        });
        break;
      }
      case "list": {
        if (!params?.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib disertakan untuk action list."
          });
        }
        response = await api.status({
          state: params?.state,
          page: params?.page,
          per_page: params?.per_page,
          filter: params?.filter
        });
        break;
      }
      case "init": {
        const authData = await api.regAcc();
        if (!authData?.access_token) {
          response = {
            status: false,
            result: {
              error: "Gagal membuat sesi akun baru."
            },
            state: null
          };
        } else {
          response = {
            status: true,
            result: {
              email: authData?.email,
              user_id: authData?.user_id
            },
            state: api.b64Enc(authData)
          };
        }
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || !response.status) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error || "Gagal memproses permintaan ke server target.",
        result: response?.result || null,
        state: response?.state || null
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}