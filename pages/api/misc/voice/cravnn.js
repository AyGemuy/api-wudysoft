import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class DazedVoice {
  constructor() {
    this.base = "https://api.cravnn.com";
    this.poll_ms = 3e3;
    this.poll_max = 60;
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }
  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }
  gen_uuid_v4() {
    return crypto.randomUUID();
  }
  ctx(state) {
    const d = this.b64d(state);
    return {
      device_id: d?.device_id || this.gen_uuid_v4(),
      android_id: d?.android_id || crypto.randomBytes(8).toString("hex"),
      platform: d?.platform || "android",
      app_version: d?.app_version || "1.0.0",
      api_key: d?.api_key || null,
      session_token: d?.session_token || null,
      balance: d?.balance ?? 0
    };
  }
  async ensure_c(state) {
    let is_new = false;
    const c = this.ctx(state);
    if (!c.api_key) {
      console.log(`[FLOW-1] Registrasi UUID v4 (${c.device_id}) via GET /api/dazed-voice/auth/device...`);
      const r = await this.req("get", "/api/dazed-voice/auth/device", c, null, {}, null, false);
      if (r.ok && r.data?.api_key) {
        c.api_key = r.data.api_key;
        is_new = true;
        console.log(`[FLOW-1] Sukses! API Key: ${c.api_key} (Bonus Awal: ${r.data?.welcome_tokens || 0})`);
      } else {
        console.warn("[FLOW-1] Gagal registrasi device:", r.error);
      }
    }
    if (is_new) {
      console.log("[FLOW-2] Menjalankan Claim Daily Reward & Lucky Spin...");
      try {
        await this.req("post", "/api/dazed-voice/daily-reward/claim", c, null, {}, null, false);
      } catch {}
      try {
        await this.req("post", "/api/dazed-voice/rewards/spin", c, {
          current_rotation: 0
        }, {}, null, false);
      } catch {}
      console.log("[FLOW-3] Mengecek saldo akhir akun...");
      const b = await this.req("get", "/api/dazed-voice/balance", c, null, {}, null, false);
      c.balance = b.ok ? b.data?.balance ?? 0 : 0;
      console.log(`[FLOW-3] Total saldo siap pakai: ${c.balance} tokens`);
    }
    return c;
  }
  fix_url(url) {
    if (!url || typeof url !== "string") return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `${this.base}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  fix_obj(data) {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map(item => this.fix_obj(item));
    const obj = {
      ...data
    };
    for (const key of ["audio_url", "icon_url"]) {
      if (typeof obj[key] === "string" && obj[key]) {
        obj[key] = this.fix_url(obj[key]);
      }
    }
    return obj;
  }
  hdr(c, extra = {}) {
    const h = {
      "x-platform": c?.platform || "android",
      "x-device-id": c?.device_id,
      "x-android-id": c?.android_id,
      "x-app-version": c?.app_version || "1.0.0",
      "x-requested-with": "com.dazed.voicetone",
      origin: "https://localhost",
      referer: "https://localhost/",
      "sec-ch-ua": '"Not:A-Brand";v="8", "Chromium";v="156", "Android WebView";v="156"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-site": "cross-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/156.0.8078.47 Mobile Safari/537.36",
      ...extra
    };
    if (c?.api_key) h["x-api-key"] = c.api_key;
    if (c?.session_token) h["x-session-token"] = c.session_token;
    return h;
  }
  async res_aud(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        const str = input.trim();
        if (/^https?:\/\//i.test(str)) {
          console.log(`[AUDIO] Mengunduh audio dari URL: ${str}`);
          const res = await axios.get(str, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        console.log("[AUDIO] Decode audio base64...");
        const clean = str.replace(/^data:audio\/[^;]+;base64,/, "");
        return Buffer.from(clean, "base64");
      }
      return null;
    } catch (e) {
      console.error(`[AUDIO ERROR] Gagal decode audio: ${e?.message}`);
      return null;
    }
  }
  async req(method, path, c, data = null, custom_h = {}, params = null, retry_auth = true) {
    try {
      const url = `${this.base}${path}`;
      const headers = this.hdr(c, custom_h);
      if (data && !(data instanceof FormData) && !headers["content-type"] && !headers["Content-Type"]) {
        headers["content-type"] = "application/json";
      }
      console.log(`[HTTP] ${method.toUpperCase()} -> ${path}`);
      const res = await axios({
        method: method,
        url: url,
        headers: headers,
        data: data,
        params: params,
        validateStatus: () => true
      });
      if (res.status === 401 && retry_auth) {
        console.warn("[HTTP 401] Token expired. Re-authenticating via GET /auth/device...");
        const r_auth = await this.req("get", "/api/dazed-voice/auth/device", c, null, {}, null, false);
        if (r_auth.ok && r_auth.data?.api_key) {
          c.api_key = r_auth.data.api_key;
          return await this.req(method, path, c, data, custom_h, params, false);
        }
      }
      if (res.status === 429 && retry_auth) {
        console.warn("[HTTP 429] Antrean terkunci. Auto reset-lock...");
        await this.req("post", "/api/dazed-voice/generate/reset-lock", c, {}, {}, null, false);
        await this.slp(1e3);
        return await this.req(method, path, c, data, custom_h, params, false);
      }
      if (res.status >= 400) {
        const err_msg = res.data?.error || res.data?.message || JSON.stringify(res.data) || `HTTP ${res.status}`;
        console.error(`[HTTP ERROR] ${method.toUpperCase()} ${path} (${res.status}):`, err_msg);
        return {
          ok: false,
          error: err_msg,
          code: res.status,
          data: res.data
        };
      }
      return {
        ok: true,
        data: res.data?.data ?? res.data
      };
    } catch (e) {
      return {
        ok: false,
        error: e?.message || "network_error"
      };
    }
  }
  async poll_task(c, task_id, is_song = false) {
    console.log(`[POLL] Memulai polling task: ${task_id}`);
    for (let i = 0; i < this.poll_max; i++) {
      await this.slp(this.poll_ms);
      console.log(`[POLL] Cek status task (${i + 1}/${this.poll_max})...`);
      const ep = is_song ? "/api/songs/history" : "/api/dazed-voice/history";
      const r = await this.req("get", ep, c, null, {}, {
        limit: 10,
        offset: 0
      });
      if (!r.ok) continue;
      const list = r.data?.generations || (Array.isArray(r.data) ? r.data : []);
      const item = list.find(x => (x?.id || x?.generation_id) === task_id);
      if (item) {
        const s = item?.status?.toLowerCase();
        if (s === "completed" || s === "ready") {
          console.log(`[POLL] Task sukses selesai: ${task_id}`);
          return {
            ok: true,
            data: this.fix_obj(item)
          };
        }
        if (s === "failed" || s === "error") {
          return {
            ok: false,
            error: item?.error_message || "generation_failed"
          };
        }
      }
    }
    return {
      ok: false,
      error: "polling_timeout"
    };
  }
  async reg_dev({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          device_id: c.device_id,
          android_id: c.android_id,
          api_key: c.api_key,
          balance: c.balance ?? 0
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_reg_dev"
        },
        state: b64,
        State: b64
      };
    }
  }
  async get_bal({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      console.log("[BALANCE] Mengambil saldo akun...");
      const r = await this.req("get", "/api/dazed-voice/balance", c, null, {}, rest);
      const b64 = this.b64e(c);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      c.balance = r.data?.balance ?? 0;
      return {
        status: true,
        result: {
          balance: c.balance,
          lifetime_earned: r.data?.lifetime_earned ?? 0,
          lifetime_spent: r.data?.lifetime_spent ?? 0,
          subscription_active: r.data?.subscription_active ?? false,
          ad_free: r.data?.ad_free ?? false
        },
        state: this.b64e(c),
        State: this.b64e(c)
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_get_bal"
        },
        state: b64,
        State: b64
      };
    }
  }
  async auto_claim({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      console.log("[REWARD] Menjalankan claim streak dan lucky spin...");
      const res = {
        daily_claimed: false,
        spin_claimed: false
      };
      const c_res = await this.req("post", "/api/dazed-voice/daily-reward/claim", c, rest);
      if (c_res.ok) {
        res.daily_claimed = true;
        res.daily_data = c_res.data || null;
      }
      const s_res = await this.req("post", "/api/dazed-voice/rewards/spin", c, {
        current_rotation: 0,
        ...rest
      });
      if (s_res.ok) {
        res.spin_claimed = true;
        res.spin_data = s_res.data || null;
      }
      const bal = await this.get_bal({
        state: this.b64e(c)
      });
      res.balance = bal.result?.balance ?? c.balance;
      const b64 = this.b64e(c);
      return {
        status: true,
        result: res,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_auto_claim"
        },
        state: b64,
        State: b64
      };
    }
  }
  async list_voice({
    state,
    search = "",
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      console.log("[VOICE] Mengambil list preset dan uploads...");
      const [p, u] = await Promise.all([this.req("get", "/api/dazed-voice/presets", c, null, {}, rest), this.req("get", "/api/dazed-voice/uploads", c, null, {}, rest)]);
      let presets = p.ok ? Array.isArray(p.data) ? p.data : p.data?.presets || [] : [];
      let uploads = u.ok ? Array.isArray(u.data) ? u.data : u.data?.uploads || [] : [];
      presets = this.fix_obj(presets);
      uploads = this.fix_obj(uploads);
      if (search) {
        const q = search.toLowerCase();
        presets = presets.filter(x => x?.name?.toLowerCase().includes(q));
        uploads = uploads.filter(x => x?.name?.toLowerCase().includes(q));
      }
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          presets: presets,
          uploads: uploads,
          total: presets.length + uploads.length
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_list_voice"
        },
        state: b64,
        State: b64
      };
    }
  }
  async voice_prev({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      console.log("[VOICE] Mengambil audio preview preset...");
      const r = await this.req("get", "/api/dazed-voice/presets/previews", c, null, {}, rest);
      const b64 = this.b64e(c);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          previews: this.fix_obj(r.data)
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_voice_prev"
        },
        state: b64,
        State: b64
      };
    }
  }
  async up_voice({
    state,
    audio,
    name,
    ref_text = "",
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!audio || !name) {
        return {
          status: false,
          result: {
            error: "parameter audio dan name wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      const audio_buf = await this.res_aud(audio);
      if (!audio_buf) {
        return {
          status: false,
          result: {
            error: "format audio tidak valid (harus buffer/url/base64)"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[UPLOAD] Uploading audio form-data (${audio_buf.length} bytes): ${name}...`);
      const form = new FormData();
      form.append("audio", audio_buf, {
        filename: "recording.wav",
        contentType: "audio/wav"
      });
      form.append("name", name);
      if (ref_text) form.append("reference_text", ref_text);
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== null) form.append(k, String(v));
      }
      const r = await this.req("post", "/api/dazed-voice/uploads", c, form, form.getHeaders());
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          upload_id: r.data?.id,
          name: r.data?.name,
          audio_url: this.fix_url(r.data?.audio_url),
          created_at: r.data?.created_at
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_up_voice"
        },
        state: b64,
        State: b64
      };
    }
  }
  async del_voice({
    state,
    upload_id,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!upload_id) {
        return {
          status: false,
          result: {
            error: "upload_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[UPLOAD] Menghapus audio clone: ${upload_id}...`);
      const r = await this.req("delete", `/api/dazed-voice/uploads/${upload_id}`, c, null, {}, rest);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          deleted_id: upload_id
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_del_voice"
        },
        state: b64,
        State: b64
      };
    }
  }
  async tts({
    state,
    text,
    preset_id,
    lang = "English",
    wait = true,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!text || !preset_id) {
        return {
          status: false,
          result: {
            error: "text dan preset_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[TTS] Memproses generate preset (${preset_id})...`);
      await this.wake_spc({
        state: b64
      });
      const body = {
        text: text,
        mode: rest.mode || "clone",
        preset_id: preset_id,
        language: lang || "English",
        ...rest
      };
      const g = await this.req("post", "/api/dazed-voice/generate", c, body);
      if (!g.ok) {
        return {
          status: false,
          result: {
            error: g.error,
            detail: g.data
          },
          state: b64,
          State: b64
        };
      }
      const task_id = g.data?.id;
      if (!wait) {
        return {
          status: true,
          result: {
            task_id: task_id,
            status: g.data?.status || "queued",
            tokens_charged: g.data?.tokens_charged ?? 0
          },
          state: b64,
          State: b64
        };
      }
      const polled = await this.poll_task(c, task_id, false);
      if (!polled.ok) return {
        status: false,
        result: {
          error: polled.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          task_id: polled.data?.id,
          status: polled.data?.status,
          audio_url: this.fix_url(polled.data?.audio_url),
          audio_filename: polled.data?.audio_filename,
          tokens_charged: polled.data?.tokens_charged
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_tts"
        },
        state: b64,
        State: b64
      };
    }
  }
  async clone({
    state,
    text,
    audio,
    upload_id,
    name,
    ref_text = "",
    lang = "English",
    wait = true,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!text) {
        return {
          status: false,
          result: {
            error: "text wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      let target_upload_id = upload_id;
      if (!target_upload_id && audio) {
        console.log("[CLONE] Parameter audio terdeteksi. Melakukan auto-upload sample suara...");
        const up = await this.up_voice({
          state: b64,
          audio: audio,
          name: name || `Clone_${Date.now()}`,
          ref_text: ref_text,
          ...rest
        });
        if (!up.status || !up.result?.upload_id) {
          return {
            status: false,
            result: {
              error: `Gagal auto-upload audio: ${up.result?.error || "unknown_upload_error"}`
            },
            state: b64,
            State: b64
          };
        }
        target_upload_id = up.result.upload_id;
        console.log(`[CLONE] Auto-upload berhasil. ID Upload: ${target_upload_id}`);
      }
      if (!target_upload_id) {
        return {
          status: false,
          result: {
            error: "audio (url/base64/buffer) atau upload_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[CLONE] Memproses generate clone suara (Upload ID: ${target_upload_id})...`);
      await this.wake_spc({
        state: b64
      });
      const body = {
        text: text,
        mode: rest.mode || "clone",
        user_upload_id: target_upload_id,
        language: lang || "English",
        ...rest
      };
      const g = await this.req("post", "/api/dazed-voice/generate", c, body);
      if (!g.ok) {
        return {
          status: false,
          result: {
            error: g.error,
            detail: g.data
          },
          state: b64,
          State: b64
        };
      }
      const task_id = g.data?.id;
      if (!wait) {
        return {
          status: true,
          result: {
            task_id: task_id,
            upload_id: target_upload_id,
            status: g.data?.status || "queued",
            tokens_charged: g.data?.tokens_charged ?? 0
          },
          state: b64,
          State: b64
        };
      }
      const polled = await this.poll_task(c, task_id, false);
      if (!polled.ok) return {
        status: false,
        result: {
          error: polled.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          task_id: polled.data?.id,
          upload_id: target_upload_id,
          status: polled.data?.status,
          audio_url: this.fix_url(polled.data?.audio_url),
          audio_filename: polled.data?.audio_filename,
          tokens_charged: polled.data?.tokens_charged
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_clone"
        },
        state: b64,
        State: b64
      };
    }
  }
  async chk_task({
    state,
    task_id,
    is_song = false,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!task_id) {
        return {
          status: false,
          result: {
            error: "task_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[TASK] Single-check status task: ${task_id}...`);
      const ep = is_song ? "/api/songs/history" : "/api/dazed-voice/history";
      const q = {
        limit: 20,
        offset: 0,
        ...rest
      };
      const r = await this.req("get", ep, c, null, {}, q);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      const list = r.data?.generations || (Array.isArray(r.data) ? r.data : []);
      const item = list.find(x => (x?.id || x?.generation_id) === task_id);
      if (!item) {
        return {
          status: false,
          result: {
            error: "task_not_found"
          },
          state: b64,
          State: b64
        };
      }
      return {
        status: true,
        result: {
          task_id: item?.id || item?.generation_id,
          status: item?.status,
          audio_url: this.fix_url(item?.audio_url),
          audio_filename: item?.audio_filename,
          tokens_charged: item?.tokens_charged,
          error_message: item?.error_message
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_chk_task"
        },
        state: b64,
        State: b64
      };
    }
  }
  async wait_task({
    state,
    task_id,
    is_song = false,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!task_id) {
        return {
          status: false,
          result: {
            error: "task_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      const polled = await this.poll_task(c, task_id, Boolean(is_song));
      if (!polled.ok) return {
        status: false,
        result: {
          error: polled.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          task_id: polled.data?.id,
          status: polled.data?.status,
          audio_url: this.fix_url(polled.data?.audio_url),
          audio_filename: polled.data?.audio_filename,
          tokens_charged: polled.data?.tokens_charged
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_wait_task"
        },
        state: b64,
        State: b64
      };
    }
  }
  async cancel_gen({
    state,
    gen_id,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!gen_id) {
        return {
          status: false,
          result: {
            error: "gen_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[HIST] Cancel task id: ${gen_id}...`);
      const r = await this.req("post", `/api/dazed-voice/history/${gen_id}/cancel`, c, rest);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          generation_id: gen_id,
          cancelled: true
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_cancel_gen"
        },
        state: b64,
        State: b64
      };
    }
  }
  async del_hist({
    state,
    gen_id,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!gen_id) {
        return {
          status: false,
          result: {
            error: "gen_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[HIST] Hapus history: ${gen_id}...`);
      const r = await this.req("delete", `/api/dazed-voice/history/${gen_id}`, c, null, {}, rest);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          deleted_id: gen_id
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_del_hist"
        },
        state: b64,
        State: b64
      };
    }
  }
  async fav_hist({
    state,
    gen_id,
    fav = true,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!gen_id) {
        return {
          status: false,
          result: {
            error: "gen_id wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[HIST] Set favourite status: ${gen_id}...`);
      const body = {
        favourite: Boolean(fav),
        ...rest
      };
      const r = await this.req("post", `/api/dazed-voice/history/${gen_id}/favourite`, c, body);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          generation_id: gen_id,
          is_favourite: Boolean(fav)
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_fav_hist"
        },
        state: b64,
        State: b64
      };
    }
  }
  async fix_txt({
    state,
    text,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!text) {
        return {
          status: false,
          result: {
            error: "text wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log("[AI] Perbaikan grammar/teks via AI...");
      const r = await this.req("post", "/api/dazed-voice/ai/fix-text", c, {
        text: text,
        ...rest
      });
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          original: r.data?.original || text,
          corrected: r.data?.corrected || text
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_fix_txt"
        },
        state: b64,
        State: b64
      };
    }
  }
  async chat_ai({
    state,
    messages,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!messages || !Array.isArray(messages)) {
        return {
          status: false,
          result: {
            error: "messages array wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log("[AI] Chat AI penulis naskah...");
      const r = await this.req("post", "/api/dazed-voice/ai/chat-speech", c, {
        messages: messages,
        ...rest
      });
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          reply: r.data
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_chat_ai"
        },
        state: b64,
        State: b64
      };
    }
  }
  async wake_spc({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      console.log("[SPACE] Bangunkan server TTS space...");
      const r = await this.req("post", "/api/dazed-voice/space/wake", c, rest);
      return {
        status: true,
        result: {
          waking: r.ok,
          detail: r.data || null
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_wake_spc"
        },
        state: b64,
        State: b64
      };
    }
  }
  async reset_lock({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      console.log("[SYS] Reset queue generate lock...");
      const r = await this.req("post", "/api/dazed-voice/generate/reset-lock", c, rest);
      return {
        status: true,
        result: {
          unlocked: r.ok
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_reset_lock"
        },
        state: b64,
        State: b64
      };
    }
  }
  async gen_story({
    state,
    genre = "fantasy",
    premise,
    len = 3,
    style = "casual",
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!premise) {
        return {
          status: false,
          result: {
            error: "premise wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log("[STORY] Generate naskah cerita...");
      const body = {
        genre: genre,
        premise: premise,
        length: len || 3,
        writingStyle: style || "casual",
        ...rest
      };
      const r = await this.req("post", "/api/dazed-voice/ai/generate-story", c, body);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          story: r.data
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_gen_story"
        },
        state: b64,
        State: b64
      };
    }
  }
  async gen_song({
    state,
    lyrics,
    tags = "pop",
    dur = 120,
    wait = true,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!lyrics) {
        return {
          status: false,
          result: {
            error: "lyrics wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log("[SONG] Menjalankan request generate musik...");
      await this.song_warm({
        state: b64
      });
      const body = {
        lyrics: lyrics,
        tags: tags || "pop",
        max_duration_seconds: dur || 120,
        temperature: 1,
        topk: 50,
        cfg_scale: 1.5,
        ...rest
      };
      const s = await this.req("post", "/api/songs/generate", c, body);
      if (!s.ok) return {
        status: false,
        result: {
          error: s.error
        },
        state: b64,
        State: b64
      };
      const task_id = s.data?.id || s.data?.task_id;
      if (!wait) {
        return {
          status: true,
          result: {
            task_id: task_id,
            status: s.data?.status || "queued"
          },
          state: b64,
          State: b64
        };
      }
      const polled = await this.poll_task(c, task_id, true);
      if (!polled.ok) return {
        status: false,
        result: {
          error: polled.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          song_id: polled.data?.id,
          status: polled.data?.status,
          audio_url: this.fix_url(polled.data?.audio_url),
          lyrics: polled.data?.lyrics,
          tags: polled.data?.tags
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_gen_song"
        },
        state: b64,
        State: b64
      };
    }
  }
  async gen_lyr({
    state,
    theme,
    genre = "pop",
    mood = "happy",
    prompt = "",
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!theme) {
        return {
          status: false,
          result: {
            error: "theme wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[SONG] Membuat lirik lagu untuk tema: "${theme}"...`);
      const body = {
        theme: theme,
        genre: genre || "pop",
        mood: mood || "happy",
        ...prompt ? {
          customPrompt: prompt
        } : {},
        ...rest
      };
      const r = await this.req("post", "/api/songs/generate-lyrics", c, body);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          theme: theme,
          genre: genre,
          lyrics: r.data?.lyrics || r.data
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_gen_lyr"
        },
        state: b64,
        State: b64
      };
    }
  }
  async song_hist({
    state,
    limit = 20,
    offset = 0,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      console.log("[SONG] Mengambil riwayat pembuatan lagu...");
      const q = {
        limit: limit || 20,
        offset: offset || 0,
        ...rest
      };
      const r = await this.req("get", "/api/songs/history", c, null, {}, q);
      const b64 = this.b64e(c);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          songs: this.fix_obj(r.data)
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_song_hist"
        },
        state: b64,
        State: b64
      };
    }
  }
  async song_warm({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      console.log("[SONG] Bangunkan server musik space...");
      const r = await this.req("post", "/api/songs/space-warm", c, rest);
      return {
        status: true,
        result: {
          warmed: r.ok
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_song_warm"
        },
        state: b64,
        State: b64
      };
    }
  }
  async ref_code({
    state,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      console.log("[REF] Mengambil my referral code...");
      const r = await this.req("get", "/api/dazed-voice/referral/my-code", c, null, {}, rest);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          referral_code: r.data?.code || r.data
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_ref_code"
        },
        state: b64,
        State: b64
      };
    }
  }
  async claim_ref({
    state,
    code,
    ...rest
  } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      if (!code) {
        return {
          status: false,
          result: {
            error: "code referral wajib diisi"
          },
          state: b64,
          State: b64
        };
      }
      console.log(`[REF] Claim referral: ${code}...`);
      const body = {
        code: code,
        ...rest
      };
      const r = await this.req("post", "/api/dazed-voice/referral/claim", c, body);
      if (!r.ok) return {
        status: false,
        result: {
          error: r.error
        },
        state: b64,
        State: b64
      };
      return {
        status: true,
        result: {
          success: true,
          detail: r.data
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_claim_ref"
        },
        state: b64,
        State: b64
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["reg_dev", "get_bal", "auto_claim", "list_voice", "voice_prev", "up_voice", "del_voice", "tts", "clone", "chk_task", "wait_task", "cancel_gen", "del_hist", "fav_hist", "fix_txt", "chat_ai", "gen_story", "gen_song", "gen_lyr", "song_hist", "ref_code", "claim_ref"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          get_bal: "/?action=get_bal&state=BASE64_STATE",
          auto_claim: "/?action=auto_claim&state=BASE64_STATE",
          list_voice: "/?action=list_voice&search=Santa",
          voice_prev: "/?action=voice_prev",
          up_voice: {
            url: "/?action=up_voice",
            body: {
              name: "Suara Baru",
              audio: "https://.../sample.wav atau base64"
            }
          },
          del_voice: "/?action=del_voice&upload_id=UPLOAD_ID",
          tts: "/?action=tts&text=Halo+Dunia&preset_id=7256b304-3e46-41a0-9378-226bf03fb0e5",
          clone: {
            url: "/?action=clone",
            body: {
              text: "Yooo!",
              audio: "https://.../audio.wav (auto upload & clone)"
            }
          },
          chk_task: "/?action=chk_task&task_id=TASK_ID",
          wait_task: "/?action=wait_task&task_id=TASK_ID",
          cancel_gen: "/?action=cancel_gen&gen_id=GEN_ID",
          del_hist: "/?action=del_hist&gen_id=GEN_ID",
          fav_hist: "/?action=fav_hist&gen_id=GEN_ID&fav=true",
          fix_txt: "/?action=fix_txt&text=gw+mau+makan",
          chat_ai: {
            url: "/?action=chat_ai",
            body: {
              prompt: "Tulis naskah iklan 30 detik"
            }
          },
          gen_story: {
            url: "/?action=gen_story",
            body: {
              premise: "Penjaga mercusuar menemukan pintu rahasia",
              genre: "fantasy"
            }
          },
          gen_song: {
            url: "/?action=gen_song",
            body: {
              lyrics: "[Verse]\nHello world\n[Chorus]\nLa la la",
              tags: "pop,lofi"
            }
          },
          gen_lyr: "/?action=gen_lyr&theme=pantai+senja&genre=lo-fi",
          song_hist: "/?action=song_hist&limit=10&offset=0",
          ref_code: "/?action=ref_code",
          claim_ref: "/?action=claim_ref&code=AB3K"
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
  const api = new DazedVoice();
  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "get_bal":
        response = await api.get_bal(params);
        break;
      case "auto_claim":
        response = await api.auto_claim(params);
        break;
      case "list_voice":
        response = await api.list_voice(params);
        break;
      case "voice_prev":
        response = await api.voice_prev(params);
        break;
      case "up_voice": {
        const {
          audio,
          name
        } = params;
        if (!audio || !name) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' (URL/Base64/Buffer) dan 'name' wajib diisi."
          });
        }
        response = await api.up_voice(params);
        break;
      }
      case "del_voice": {
        const upload_id = params.upload_id || params.id;
        if (!upload_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'upload_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.del_voice({
          upload_id: upload_id,
          ...params
        });
        break;
      }
      case "tts": {
        const text = params.text;
        const preset_id = params.preset_id || params.voice_id || params.id;
        if (!text || !preset_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' dan 'preset_id' wajib diisi."
          });
        }
        response = await api.tts({
          text: text,
          preset_id: preset_id,
          ...params
        });
        break;
      }
      case "clone": {
        const text = params.text;
        const audio = params.audio;
        const upload_id = params.upload_id || params.id;
        if (!text || !audio && !target_upload_id && !upload_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' serta salah satu dari 'audio' (URL/Base64/Buffer) atau 'upload_id' wajib diisi."
          });
        }
        response = await api.clone({
          text: text,
          audio: audio,
          upload_id: upload_id,
          ...params
        });
        break;
      }
      case "chk_task": {
        const task_id = params.task_id || params.id;
        if (!task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.chk_task({
          task_id: task_id,
          ...params
        });
        break;
      }
      case "wait_task": {
        const task_id = params.task_id || params.id;
        if (!task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.wait_task({
          task_id: task_id,
          ...params
        });
        break;
      }
      case "cancel_gen": {
        const gen_id = params.gen_id || params.id;
        if (!gen_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'gen_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.cancel_gen({
          gen_id: gen_id,
          ...params
        });
        break;
      }
      case "del_hist": {
        const gen_id = params.gen_id || params.id;
        if (!gen_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'gen_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.del_hist({
          gen_id: gen_id,
          ...params
        });
        break;
      }
      case "fav_hist": {
        const gen_id = params.gen_id || params.id;
        if (!gen_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'gen_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.fav_hist({
          gen_id: gen_id,
          ...params
        });
        break;
      }
      case "fix_txt": {
        const text = params.text;
        if (!text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi."
          });
        }
        response = await api.fix_txt({
          text: text,
          ...params
        });
        break;
      }
      case "chat_ai": {
        let messages = params.messages;
        if (!messages && (params.prompt || params.text)) {
          messages = [{
            role: "user",
            content: params.prompt || params.text
          }];
        }
        if (!messages) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'messages' (Array) atau 'prompt' (String) wajib diisi."
          });
        }
        response = await api.chat_ai({
          messages: messages,
          ...params
        });
        break;
      }
      case "gen_story": {
        const premise = params.premise || params.prompt || params.text;
        if (!premise) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'premise' (ide cerita) wajib diisi."
          });
        }
        response = await api.gen_story({
          premise: premise,
          ...params
        });
        break;
      }
      case "gen_song": {
        const lyrics = params.lyrics || params.text;
        if (!lyrics) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'lyrics' wajib diisi."
          });
        }
        response = await api.gen_song({
          lyrics: lyrics,
          ...params
        });
        break;
      }
      case "gen_lyr": {
        const theme = params.theme || params.topic || params.prompt;
        if (!theme) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'theme' wajib diisi."
          });
        }
        response = await api.gen_lyr({
          theme: theme,
          ...params
        });
        break;
      }
      case "song_hist":
        response = await api.song_hist(params);
        break;
      case "ref_code":
        response = await api.ref_code(params);
        break;
      case "claim_ref": {
        const code = params.code;
        if (!code) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'code' (kode referral) wajib diisi."
          });
        }
        response = await api.claim_ref({
          code: code,
          ...params
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || response?.status === false) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error || "Gagal memproses request pada server Cravnn.",
        result: response?.result || null,
        state: response?.state || null
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}