import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class AISongMaker {
  constructor() {
    try {
      this.base_url = "https://www.aisongmaker.io";
      this.supa_url = "https://yeppcqwsdijdkjlsesnl.supabase.co";
      this.mail_api = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHBjcXdzZGlqZGtqbHNlc25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MjQwOTUsImV4cCI6MjA1MDIwMDA5NX0.A6BT-UIcCeKCCA4v-tdg4hFFOe_Qri4PvsM9aaw3h0k";
      this.cookies = {};
      this.access_token = null;
      this.user_id = null;
      this.last_task_id = null;
      this.http = axios.create({
        baseURL: this.base_url,
        timeout: 6e4
      });
      this.http.interceptors.response.use(res => {
        try {
          const set_cookie = res?.headers?.["set-cookie"];
          if (set_cookie) {
            this.sav_ck(set_cookie);
          }
        } catch (err) {
          console.error("[ERR] Interceptor error:", err?.message);
        }
        return res;
      });
    } catch (err) {
      console.error("[ERR] Constructor error:", err?.message);
    }
  }
  slp(ms = 1e3) {
    try {
      return new Promise(resolve => setTimeout(resolve, ms));
    } catch (err) {
      console.error("[ERR] Sleep error:", err?.message);
      return Promise.resolve();
    }
  }
  hsh(val = "") {
    try {
      return crypto.createHash("sha256").update(String(val)).digest("hex");
    } catch (err) {
      console.error("[ERR] Hash error:", err?.message);
      return "";
    }
  }
  b64(buf) {
    try {
      return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (err) {
      console.error("[ERR] Base64 error:", err?.message);
      return "";
    }
  }
  pkce() {
    try {
      const verifier = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(verifier).digest();
      const challenge = this.b64(hash);
      return {
        verifier: verifier,
        challenge: challenge
      };
    } catch (err) {
      console.error("[ERR] PKCE error:", err?.message);
      const fallback = crypto.randomBytes(16).toString("hex");
      return {
        verifier: fallback,
        challenge: fallback
      };
    }
  }
  enc(data = {}) {
    try {
      return Buffer.from(JSON.stringify(data)).toString("base64");
    } catch (err) {
      console.error("[ERR] Encode error:", err?.message);
      return "";
    }
  }
  dec(str = "") {
    try {
      if (!str || typeof str !== "string") return null;
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch (err) {
      console.error("[ERR] Decode error:", err?.message);
      return null;
    }
  }
  sav_ck(list = []) {
    try {
      const arr = Array.isArray(list) ? list : [list];
      for (const item of arr) {
        const pair = item?.split(";")[0]?.trim();
        if (pair) {
          const [k, ...v] = pair.split("=");
          if (k) this.cookies[k.trim()] = v.join("=").trim();
        }
      }
    } catch (err) {
      console.error("[ERR] Save cookie error:", err?.message);
    }
  }
  get_ck() {
    try {
      return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (err) {
      console.error("[ERR] Get cookie error:", err?.message);
      return "";
    }
  }
  hdr(custom = {}) {
    try {
      const ck = this.get_ck();
      return {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base_url}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...ck ? {
          cookie: ck
        } : {},
        ...custom
      };
    } catch (err) {
      console.error("[ERR] Header builder error:", err?.message);
      return custom;
    }
  }
  supa_hdr(custom = {}) {
    try {
      const token = this.access_token || this.anon_key;
      return {
        accept: "*/*",
        "accept-language": "id-ID",
        apikey: this.anon_key,
        authorization: `Bearer ${token}`,
        "cache-control": "no-cache",
        origin: this.base_url,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base_url}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-client-info": "@supabase/auth-helpers-nextjs@0.10.0",
        ...custom
      };
    } catch (err) {
      console.error("[ERR] Supabase header error:", err?.message);
      return custom;
    }
  }
  async c_mail() {
    try {
      console.log("[LOG] Membuat temporary email...");
      const res = await axios.get(`${this.mail_api}?action=create`);
      const email = res?.data?.email || null;
      if (!email) throw new Error("Gagal mendapatkan temporary email.");
      console.log(`[LOG] Email berhasil dibuat: ${email}`);
      return email;
    } catch (err) {
      console.error("[ERR] c_mail error:", err?.message);
      throw err;
    }
  }
  async f_link(email, retries = 15, delay = 3e3) {
    try {
      console.log(`[LOG] Menunggu konfirmasi email untuk ${email}...`);
      for (let i = 0; i < retries; i++) {
        await this.slp(delay);
        const res = await axios.get(`${this.mail_api}?action=message&email=${encodeURIComponent(email)}`);
        const list = res?.data?.data || [];
        for (const item of list) {
          const content = item?.text_content || item?.html_content || "";
          const match = content.match(/https:\/\/yeppcqwsdijdkjlsesnl\.supabase\.co\/auth\/v1\/verify\?[^\]\s"'>]+/);
          if (match?.[0]) {
            console.log("[LOG] Link verifikasi ditemukan.");
            return match[0];
          }
        }
      }
      throw new Error("Timeout: Link konfirmasi email tidak ditemukan.");
    } catch (err) {
      console.error("[ERR] f_link error:", err?.message);
      throw err;
    }
  }
  async reg() {
    try {
      console.log("[LOG] Memulai registrasi akun baru AISongMaker...");
      const email = await this.c_mail();
      const {
        verifier,
        challenge
      } = this.pkce();
      this.cookies["sb-yeppcqwsdijdkjlsesnl-auth-token-code-verifier"] = `"${verifier}"`;
      console.log("[LOG] Mengirim OTP request ke Supabase...");
      await axios.post(`${this.supa_url}/auth/v1/otp?redirect_to=${encodeURIComponent(`${this.base_url}/api/auth/callback?redirect=null`)}`, {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: "s256"
      }, {
        headers: this.supa_hdr({
          "content-type": "application/json;charset=UTF-8",
          "x-supabase-api-version": "2024-01-01"
        })
      });
      const verify_link = await this.f_link(email);
      console.log("[LOG] Memverifikasi link signup...");
      const verify_res = await axios.get(verify_link, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "id-ID",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      const redirect_url = verify_res?.headers?.["location"] || "";
      const auth_code_match = redirect_url.match(/code=([^&]+)/);
      const auth_code = auth_code_match ? decodeURIComponent(auth_code_match[1]) : null;
      if (!auth_code) throw new Error("Authorization code tidak ditemukan pada URL redirect.");
      console.log("[LOG] Melakukan pertukaran callback auth code...");
      const cb_res = await this.http.get(`/api/auth/callback?code=${auth_code}&redirect=null`, {
        headers: this.hdr({
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "upgrade-insecure-requests": "1"
        }),
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      if (cb_res?.headers?.["set-cookie"]) {
        this.sav_ck(cb_res.headers["set-cookie"]);
      }
      const auth_cookie_raw = this.cookies["sb-yeppcqwsdijdkjlsesnl-auth-token"];
      if (auth_cookie_raw) {
        try {
          const parsed = JSON.parse(decodeURIComponent(auth_cookie_raw));
          if (Array.isArray(parsed) && parsed[0]) {
            this.access_token = parsed[0];
          }
        } catch {
          this.access_token = null;
        }
      }
      console.log("[LOG] Mengambil info user Supabase...");
      const user_res = await axios.get(`${this.supa_url}/auth/v1/user`, {
        headers: this.supa_hdr({
          "x-supabase-api-version": "2024-01-01"
        })
      });
      this.user_id = user_res?.data?.id || null;
      console.log("[LOG] Mengambil info profil user...");
      const prof_res = await axios.get(`${this.supa_url}/rest/v1/profiles?select=*&id=eq.${this.user_id}`, {
        headers: this.supa_hdr({
          accept: "application/vnd.pgrst.object+json",
          "accept-profile": "public"
        })
      });
      const sess_data = {
        email: email,
        user_id: this.user_id,
        access_token: this.access_token,
        cookies: this.cookies,
        profile: prof_res?.data || {},
        last_task_id: this.last_task_id,
        created_at: Date.now(),
        hash: this.hsh(email + Date.now())
      };
      const session = this.enc(sess_data);
      console.log("[LOG] Registrasi selesai, credit awal:", prof_res?.data?.credit ?? 20);
      return session;
    } catch (err) {
      console.error("[ERR] Gagal pada reg():", err?.message);
      throw err;
    }
  }
  async ens(session) {
    try {
      if (session) {
        const parsed = this.dec(session);
        if (parsed?.cookies && parsed?.user_id) {
          this.cookies = {
            ...this.cookies,
            ...parsed.cookies
          };
          this.user_id = parsed.user_id;
          this.access_token = parsed.access_token || null;
          this.last_task_id = parsed.last_task_id || this.last_task_id;
          return session;
        }
      }
      return await this.reg();
    } catch (err) {
      console.error("[ERR] ens() error:", err?.message);
      return await this.reg();
    }
  }
  async gen_lyrics({
    session,
    prompt,
    theme,
    keywords,
    genre = "Random",
    emotion = "Random",
    duration = "Random",
    language = "English",
    structure = "Verse Chorus",
    ...rest
  } = {}) {
    try {
      const act_sess = await this.ens(session);
      const payload_theme = theme || prompt || rest?.text || "Cute song";
      const payload_keywords = keywords || rest?.keyword || "Melody, Rhythm";
      console.log(`[LOG] Membuat lirik untuk tema: "${payload_theme}"...`);
      const res = await this.http.post("/api/gen/lyrics-to-song-linlong/lyrics", {
        theme: payload_theme,
        keywords: payload_keywords,
        genre: genre,
        emotion: emotion,
        duration: duration,
        language: language,
        structure: structure,
        ...rest
      }, {
        headers: this.hdr({
          "content-type": "application/json",
          origin: this.base_url
        })
      });
      const data = res?.data?.data || res?.data || {};
      return {
        status: data?.lyrics ? true : false,
        result: {
          id: data?.id || null,
          title: data?.title || null,
          lyrics: data?.lyrics || null
        },
        session: act_sess
      };
    } catch (err) {
      console.error("[ERR] Error pada gen_lyrics:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: session || null
      };
    }
  }
  async create({
    session,
    prompt,
    lyrics,
    title,
    styles,
    model = 5,
    instrumental = false,
    ...rest
  } = {}) {
    try {
      let act_sess = await this.ens(session);
      let endpoint = "";
      let payload = {};
      const is_lyrics_mode = Boolean(lyrics || rest?.text && !prompt);
      if (is_lyrics_mode) {
        endpoint = "/api/gen/lyrics-to-song-linlong";
        payload = {
          model: Number(model) || 5,
          lyrics: lyrics || rest?.text || "",
          title: title || rest?.name || "Untitled Song",
          styles: styles || rest?.style || "Pop, Classical",
          excludeStyles: rest?.exclude_styles || rest?.excludeStyles || "",
          voice: rest?.voice || "",
          instrumental: Boolean(instrumental),
          type: 2,
          coverSongAudioId: rest?.cover_song_audio_id || null,
          extendUploadSongAudioId: rest?.extend_upload_song_audio_id || null,
          extendStart: rest?.extend_start || null,
          addVocalsAudioId: rest?.add_vocals_audio_id || null,
          addInstrumentalAudioId: rest?.add_instrumental_audio_id || null,
          ...rest
        };
      } else {
        endpoint = "/api/gen/text-to-song-linlong";
        payload = {
          model: Number(model) || 5,
          prompt: prompt || rest?.text || "An exuberant cheerful song with positive vibes",
          instrumental: Boolean(instrumental),
          type: 1,
          albumId: rest?.album_id || rest?.albumId || null,
          ...rest
        };
      }
      console.log(`[LOG] Membuat lagu via ${endpoint}...`);
      const res = await this.http.post(endpoint, payload, {
        headers: this.hdr({
          "content-type": "application/json",
          origin: this.base_url
        })
      });
      const data = res?.data?.data || res?.data || {};
      const task_id = data?.id || null;
      if (task_id) {
        this.last_task_id = task_id;
        const decoded = this.dec(act_sess) || {};
        decoded.last_task_id = task_id;
        act_sess = this.enc(decoded);
      }
      return {
        status: task_id ? true : false,
        result: {
          task_id: task_id,
          status: data?.status || "ready",
          credit: data?.credit ?? null,
          mode: is_lyrics_mode ? "lyrics-to-song" : "text-to-song"
        },
        session: act_sess
      };
    } catch (err) {
      console.error("[ERR] Error pada create:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: session || null
      };
    }
  }
  async status({
    session,
    task_id,
    id,
    ...rest
  } = {}) {
    try {
      const act_sess = await this.ens(session);
      const parsed_sess = this.dec(act_sess);
      const target_id = task_id || id || rest?.taskId || parsed_sess?.last_task_id || this.last_task_id;
      const target_user_id = this.user_id || parsed_sess?.user_id;
      console.log(`[LOG] Mengecek status lagu... (ID: ${target_id || "Latest Song"})`);
      let songs = [];
      if (target_user_id) {
        const query_res = await axios.get(`${this.supa_url}/rest/v1/songs?select=*&user_id=eq.${target_user_id}&order=created_at.desc&offset=0&limit=20`, {
          headers: this.supa_hdr({
            "accept-profile": "public"
          })
        });
        songs = Array.isArray(query_res?.data) ? query_res.data : [];
      }
      let matched = null;
      if (target_id) {
        matched = songs.filter(s => s?.uuid_ref === target_id || s?.id === target_id || s?.generation_id === target_id);
      }
      if (!matched || matched.length === 0) {
        if (songs.length > 0) {
          const first_ref = songs[0]?.uuid_ref;
          matched = first_ref ? songs.filter(s => s?.uuid_ref === first_ref) : [songs[0]];
        }
      }
      const formatted_items = (matched || []).map(item => ({
        id: item?.id || null,
        task_id: item?.uuid_ref || target_id,
        generation_id: item?.generation_id || null,
        title: item?.title || null,
        style: item?.style || null,
        status: item?.status || "unknown",
        audio_url: item?.url || null,
        image_url: item?.img_url || null,
        duration: item?.duration || null,
        lyrics: item?.lyrics || null,
        created_at: item?.created_at || null,
        updated_at: item?.update_at || null
      }));
      const is_all_done = formatted_items.length > 0 && formatted_items.every(i => i.status === "succeeded" || i.status === "failed");
      return {
        status: formatted_items.length > 0,
        result: {
          task_id: target_id || formatted_items?.[0]?.task_id || null,
          status: is_all_done ? "completed" : formatted_items?.[0]?.status || "processing",
          songs: formatted_items
        },
        session: act_sess
      };
    } catch (err) {
      console.error("[ERR] Error pada status:", err?.message);
      return {
        status: false,
        result: {
          error: err?.response?.data || err?.message
        },
        session: session || null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["register", "create", "status", "lyrics"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&prompt=A song for Christmas"
      }
    });
  }
  const api = new AISongMaker();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.prompt && !params.lyrics && !params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'lyrics' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        response = await api.status(params);
        break;
      case "lyrics":
        if (!params.theme && !params.prompt && !params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'theme' atau 'prompt' wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.gen_lyrics(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === false) {
      return res.status(500).json({
        status: false,
        action: action,
        error: response.result?.error || "Gagal memproses permintaan."
      });
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
      action: action,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}