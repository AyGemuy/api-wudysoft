import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
import crypto from "crypto";

const GENRES = [
  "Pop", "Rap", "Rock", "EDM", "R&B", "Hip-hop", "Country", "Latin", "K-Pop",
  "Classical", "Jazz", "Reggae", "Indie", "House", "Afro House", "Folk", "Trance",
  "Dance", "Soul", "Blues", "Metal", "Funk", "Downtempo", "Electro Pop",
  "Electro Techno", "Electronic Grunge", "Celtic", "Jungle", "Electro-Classical",
  "Acoustic", "Dubstep", "Disco", "Trap", "Drum’n’bass", "Salsa", "Tango",
  "Deathcore", "Blues Rock", "Gospel", "Drill", "Phonk", "Afrobeats", "Punk",
  "Amapiano", "Hardstyle", "Reggaeton", "Dancehall", "Emo", "Alternative",
  "Schlager", "Manele", "Sertanejo", "Pagode", "Corrido", "Corrido Tumbado",
  "Banda", "Forró", "Samba", "Bachata", "Cumbia", "Norteño", "Mariachi",
  "Arrocha", "Piseiro", "Zouk", "Kizomba", "Kompa"
];

const MOODS = [
  "Happy", "Romantic", "Uplifting", "Motivational", "Joyful", "Melancholic",
  "Confident", "Productivity", "Dreamy", "Depressive", "Chill", "Hype", "Slow",
  "Dark", "Nostalgic", "Passionate", "Spiritual", "Whimsical", "Eclectic",
  "Emotion", "Hard", "Lyrical", "Magical", "Cinematic", "Anime"
];

const VOCAL_GENDERS = ["female", "male"];
const RECORD_TYPES = ["studio", "live"];

const SEARCH_TYPES = {
  popular: "popular",
  populer: "popular",
  recent: "recent",
  new: "recent",
  baru: "recent",
  trending: "trending",
  clips: "clips",
  clip: "clips",
  klip: "clips"
};

const GENRE_ALIASES = {
  "hip hop": "Hip-hop",
  hiphop: "Hip-hop",
  rnb: "R&B",
  "r and b": "R&B",
  kpop: "K-Pop",
  "drum and bass": "Drum’n’bass",
  "drum n bass": "Drum’n’bass",
  dnb: "Drum’n’bass",
  "electro classical": "Electro-Classical",
  afrobeat: "Afrobeats",
  "afro beats": "Afrobeats"
};

const MOOD_ALIASES = {
  energetic: "Hype",
  energy: "Hype",
  focus: "Productivity",
  relaxing: "Chill",
  relax: "Chill"
};

const XOR_KEY = Buffer.from("3a1c2ou68jox9dlj3v", "utf8");
const IBJ_A = Buffer.from([94, 86, 68, 22, 67, 88, 1, 95, 13, 82, 30, 72, 8, 8, 91, 1]);
const IBJ_B = Buffer.from([94, 81, 94, 10, 92, 28, 71, 87, 78, 2, 9, 10, 72, 14, 92, 27, 92, 14, 4, 15]);
const IBJ_C = Buffer.from([85, 86, 4, 1, 84, 89, 71, 82, 12, 95, 90, 27, 8, 83, 13, 94]);
const FI0_B = Buffer.from([5, 88, 1, 80, 2, 87, 23, 83, 8, 94, 10, 26, 12, 7, 9, 94]);
const X2J_A = Buffer.from([
  91, 189, 83, 100, 202, 30, 78, 248, 167, 214, 46, 109, 31, 18, 118, 56,
  3, 215, 108, 125, 214, 1, 176, 251, 43, 211, 69, 68, 27, 120, 183, 92,
  219, 170, 156, 223, 64, 57, 28, 35, 230, 143, 225, 5, 31, 44, 249, 107,
  175, 37, 108, 238, 236, 181, 1, 199, 78, 36, 96, 142, 82, 123, 154, 72
]);

function xorWithKey(input) {
  const output = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i += 1) {
    output[i] = input[i] ^ XOR_KEY[i % XOR_KEY.length];
  }
  return output;
}

function deriveKey(encrypted) {
  const source =
    xorWithKey(IBJ_A).toString("utf8") +
    xorWithKey(IBJ_B).toString("utf8") +
    "com.sonivamusic.ai";
  const digest = crypto.createHash("sha512").update(source, "utf8").digest();
  const key = Buffer.alloc(encrypted.length);
  for (let i = 0; i < encrypted.length; i += 1) {
    key[i] = encrypted[i] ^ digest[i];
  }
  return key;
}

const SIGNING_KEY = deriveKey(X2J_A);
const SIGNATURE_SALT = xorWithKey(FI0_B).toString("utf8") + xorWithKey(IBJ_C).toString("utf8");

class SonivaMusic {
  constructor() {
    this.baseUrl = "https://api.sonivamusic.com/musicai/";
    this.firebaseApiKey = "AIzaSyA5IwVHBnETgpJ-gwhJSz2YP0giDOAUFR0";
    this.firebaseSignupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseApiKey}`;
    this.firebaseRefreshUrl = `https://securetoken.googleapis.com/v1/token?key=${this.firebaseApiKey}`;
    this.appVersion = "2.0.3";
    this.versionCode = "146";
    this.userAgent = "SonivaMusic/2.0.3 (build:146; Android 14; Google Pixel 7)";
    this.requestTimeout = 120000;
    this.tokenMarginMs = 5 * 60 * 1000;
    this.defaultPollIntervalMs = 5000;
    this.defaultPollTimeoutMs = 10 * 60 * 1000;
  }

  slp(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  ctx(state) {
    const d = this.b64d(state);
    return {
      device_id: d?.device_id || null,
      id_token: d?.id_token || null,
      refresh_token: d?.refresh_token || null,
      firebase_uid: d?.firebase_uid || null,
      token_expires_at: Number(d?.token_expires_at) || 0,
      user_id: d?.user_id || null,
      referral_code: d?.referral_code || null,
      bound: Boolean(d?.bound)
    };
  }

  normalizeLabel(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ");
  }

  resolveOption(value, list, aliases, name) {
    const target = this.normalizeLabel(value);
    if (aliases[target]) return aliases[target];
    const found = list.find((item) => this.normalizeLabel(item) === target);
    if (found) return found;
    throw new Error(`Invalid ${name} "${value}". Valid values: ${list.join(", ")}`);
  }

  resolveGenre(value) {
    return this.resolveOption(value, GENRES, GENRE_ALIASES, "genre");
  }

  resolveMood(value) {
    return this.resolveOption(value, MOODS, MOOD_ALIASES, "mood");
  }

  resolveVocalGender(value) {
    const target = String(value).trim().toLowerCase();
    if (VOCAL_GENDERS.includes(target)) return target;
    throw new Error(`Invalid vocal gender "${value}". Valid values: ${VOCAL_GENDERS.join(", ")}`);
  }

  resolveRecordType(value) {
    const target = String(value).trim().toLowerCase();
    if (RECORD_TYPES.includes(target)) return target;
    throw new Error(`Invalid record type "${value}". Valid values: ${RECORD_TYPES.join(", ")}`);
  }

  async firebaseSignUp(c) {
    console.log("[AUTH] Firebase anonymous sign-up...");
    const response = await axios.post(
      this.firebaseSignupUrl,
      { returnSecureToken: true },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
        validateStatus: () => true
      }
    );
    if (response.status >= 400) {
      const message = response.data?.error?.message || JSON.stringify(response.data);
      throw new Error(`Firebase anonymous sign-up failed: ${message}`);
    }
    const data = response.data;
    c.id_token = data.idToken;
    c.refresh_token = data.refreshToken;
    c.firebase_uid = data.localId;
    c.token_expires_at = Date.now() + Number(data.expiresIn || 3600) * 1000;
    c.bound = false;
  }

  async refreshFirebase(c) {
    if (!c.refresh_token) throw new Error("Firebase refresh token is missing");
    console.log("[AUTH] Refreshing Firebase token...");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: c.refresh_token
    }).toString();

    const response = await axios.post(this.firebaseRefreshUrl, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
      validateStatus: () => true
    });
    if (response.status >= 400) {
      const message = response.data?.error?.message || JSON.stringify(response.data);
      throw new Error(`Firebase token refresh failed: ${message}`);
    }
    const data = response.data;
    c.id_token = data.id_token || data.idToken;
    c.refresh_token = data.refresh_token || data.refreshToken || c.refresh_token;
    c.firebase_uid = data.user_id || c.firebase_uid;
    c.token_expires_at = Date.now() + Number(data.expires_in || data.expiresIn || 3600) * 1000;
  }

  buildHeaders(c, messageId, timestamp, signature) {
    const headers = {
      "User-Agent": this.userAgent,
      "X-Device-ID": c.device_id,
      "X-Request-Time": timestamp,
      "X-Message-ID": messageId,
      "X-Platform": "android",
      "X-App-Version": this.appVersion,
      "X-Version-Code": this.versionCode,
      "X-Signature-ID": signature,
      "X-Request-ID": signature,
      "Accept-Language": "en-US",
      "Content-Type": "application/json"
    };
    if (c.id_token) headers.Authorization = `Bearer ${c.id_token}`;
    return headers;
  }

  async signedRequest(c, method, endpoint, body, retry = true) {
    const messageId = crypto.randomUUID();
    const timestamp = String(Date.now());
    const signature = crypto
      .createHmac("sha256", SIGNING_KEY)
      .update(messageId + SIGNATURE_SALT + c.device_id + timestamp, "utf8")
      .digest("base64");

    const response = await axios.request({
      method,
      url: this.baseUrl + endpoint,
      data: body,
      headers: this.buildHeaders(c, messageId, timestamp, signature),
      timeout: this.requestTimeout,
      validateStatus: () => true
    });

    if (response.status === 401 && retry) {
      try {
        await this.refreshFirebase(c);
      } catch {
        await this.firebaseSignUp(c);
      }
      return this.signedRequest(c, method, endpoint, body, false);
    }

    if (response.status >= 400) {
      const data = response.data;
      const detail = typeof data === "string" ? data : JSON.stringify(data);
      const code = data && (data.error_code || data.error || data.message);
      const error = new Error(
        `${method} ${endpoint} failed with HTTP ${response.status}${code ? ` (${code})` : ""}: ${detail}`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return response.data;
  }

  async bindIdentity(c, force = false) {
    if (!force && c.bound) return;
    await this.signedRequest(c, "POST", "v2/identity/bind", {
      legacy_user_id: c.user_id
    });
    c.bound = true;
  }

  async ensure_c(state, forceNew = false) {
    const c = this.ctx(forceNew ? null : state);
    if (!c.device_id) {
      c.device_id = crypto.randomUUID();
    }
    if (!c.id_token || !c.refresh_token) {
      await this.firebaseSignUp(c);
    } else if (Date.now() >= Number(c.token_expires_at || 0) - this.tokenMarginMs) {
      try {
        await this.refreshFirebase(c);
      } catch {
        await this.firebaseSignUp(c);
      }
    }
    if (!c.user_id) {
      console.log(`[REGISTER] Registrasi device_id (${c.device_id}) via v2/register...`);
      const data = await this.signedRequest(c, "POST", "v2/register", {
        device_id: c.device_id
      });
      c.user_id = data.user_id;
      c.referral_code = data.referral_code;
      c.bound = false;
    }
    if (!c.bound) {
      await this.bindIdentity(c);
    }
    return c;
  }

  async apiRequest(c, method, endpoint, body, options = {}) {
    try {
      return await this.signedRequest(c, method, endpoint, body);
    } catch (error) {
      const code = error.data && error.data.error_code;
      if (code === "bind_required" && !options.rebound) {
        await this.bindIdentity(c, true);
        return this.apiRequest(c, method, endpoint, body, { ...options, rebound: true });
      }
      throw error;
    }
  }

  buildSongPayload(options = {}) {
    const isInstrumental = options.instrumental === true || options.instrumental === "true" || options.no_vocal === true || options.no_vocal === "true" || options.noVocal === true;
    const hasVocal = isInstrumental ? false : options.hasVocal !== false && options.hasVocal !== "false";
    const isDual = options.dual === true || options.dual === "true" || options.is_dual_song_enabled === true || options.is_dual_song_enabled === "true" || options.isDualSongEnabled === true;

    return {
      mood: this.resolveMood(options.mood || "Happy"),
      genre: this.resolveGenre(options.genre || "Pop"),
      has_vocal: hasVocal,
      vocal_gender: this.resolveVocalGender(options.vocalGender || options.vocal_gender || options.gender || "female"),
      record_type: this.resolveRecordType(options.recordType || options.record_type || options.record || "studio"),
      is_dual_song_enabled: Boolean(isDual)
    };
  }

  buildSearchQuery(options = {}) {
    const page = Number(options.page || 1);
    const limit = Number(options.limit || 20);
    if (!Number.isInteger(page) || page < 1) throw new Error("page must be a positive integer");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("limit must be between 1 and 100");
    }
    return { page, limit };
  }

  async waitForJobInternal(c, jobId, options = {}) {
    const intervalMs = Number(options.intervalMs || options.interval) || this.defaultPollIntervalMs;
    const timeoutMs = Number(options.timeoutMs || options.timeout) || this.defaultPollTimeoutMs;
    const startedAt = Date.now();

    for (;;) {
      const lastJob = await this.apiRequest(c, "GET", `v2/songs/${jobId}`);
      const status = String(lastJob.status || "").toLowerCase();

      if (status === "complete") {
        const ids = [lastJob.id, lastJob.variant_id].filter(Boolean);
        if (!ids.length) throw new Error(`Job ${jobId} completed without song ids`);
        const songs = [];
        for (const id of ids) {
          try {
            songs.push(await this.apiRequest(c, "GET", `v2/songs/${id}/details`));
          } catch (error) {
            songs.push({ id, error: error.message });
          }
        }
        return { job: lastJob, songs };
      }

      if (["error", "failed", "cancelled", "canceled"].includes(status)) {
        throw new Error(
          `Song generation ${status}: ${lastJob.error_message || lastJob.error_type || "unknown error"}`
        );
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for job ${jobId} (last status: ${lastJob.status})`);
      }

      await this.slp(intervalMs);
    }
  }

  async reg_dev({ state, force = false } = {}) {
    let c = null;
    try {
      const shouldForce = force === true || force === "true";
      c = await this.ensure_c(state, shouldForce);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          device_id: c.device_id,
          firebase_uid: c.firebase_uid,
          user_id: c.user_id,
          referral_code: c.referral_code,
          bound: Boolean(c.bound),
          token_expires_at: c.token_expires_at
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_reg_dev" },
        state: b64,
        State: b64
      };
    }
  }

  async info({ state } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const data = await this.apiRequest(c, "GET", `v2/users/${c.user_id}/info`);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: data,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_info" },
        state: b64,
        State: b64
      };
    }
  }

  async genres({ state } = {}) {
    const c = this.ctx(state);
    const b64 = this.b64e(c);
    return {
      status: true,
      result: {
        total: GENRES.length,
        genres: GENRES
      },
      state: b64,
      State: b64
    };
  }

  async moods({ state } = {}) {
    const c = this.ctx(state);
    const b64 = this.b64e(c);
    return {
      status: true,
      result: {
        total: MOODS.length,
        moods: MOODS
      },
      state: b64,
      State: b64
    };
  }

  async lyrics({ state, prompt, content, task = "askai" } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const b64 = this.b64e(c);
      const cleanContent = String(prompt || content || "").trim();
      if (!cleanContent) {
        return {
          status: false,
          result: { error: "Parameter 'prompt' wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const data = await this.apiRequest(c, "POST", "v2/lyrics/generate", {
        task: task || "askai",
        content: cleanContent
      });
      const updatedB64 = this.b64e(c);
      return {
        status: true,
        result: data,
        state: updatedB64,
        State: updatedB64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_lyrics" },
        state: b64,
        State: b64
      };
    }
  }

  async create({ state, lyrics, title, description, desc, prompt, wait = true, ...rest } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const cleanLyrics = String(lyrics || "").trim();
      const cleanTitle = String(title || "").trim();
      const cleanDesc = String(description || desc || prompt || "").trim();
      const shouldWait = wait !== false && wait !== "false";

      let job;
      if (cleanLyrics) {
        if (!cleanTitle) {
          const b64 = this.b64e(c);
          return {
            status: false,
            result: { error: "Parameter 'title' wajib diisi saat menggunakan 'lyrics'." },
            state: b64,
            State: b64
          };
        }
        const payload = this.buildSongPayload(rest);
        payload.lyrics = cleanLyrics;
        payload.title = cleanTitle;
        job = await this.apiRequest(c, "POST", `v2/users/${c.user_id}/songs/lyrics`, payload);
      } else {
        if (!cleanDesc) {
          const b64 = this.b64e(c);
          return {
            status: false,
            result: { error: "Parameter 'description' (atau 'prompt'/'lyrics') wajib diisi." },
            state: b64,
            State: b64
          };
        }
        const payload = this.buildSongPayload(rest);
        payload.prompt = cleanDesc;
        job = await this.apiRequest(c, "POST", `v2/users/${c.user_id}/songs/prompt`, payload);
      }

      const result = shouldWait
        ? await this.waitForJobInternal(c, job.job_id, rest)
        : job;

      const b64 = this.b64e(c);
      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_create" },
        state: b64,
        State: b64
      };
    }
  }

  async search({ state, type = "popular", page = 1, limit = 20, range = "week" } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const rawType = String(type || "").trim().toLowerCase();
      const query = this.buildSearchQuery({ page, limit });

      let result;
      if (rawType === "all") {
        result = {};
        await Promise.all(
          ["popular", "recent", "trending", "clips"].map(async (kind) => {
            const params = new URLSearchParams({
              page: String(query.page),
              limit: String(query.limit)
            });
            if (kind === "popular" || kind === "trending") {
              params.set("range", range || "week");
            }
            result[kind] = await this.apiRequest(c, "GET", `v2/explore/${kind}?${params.toString()}`);
          })
        );
      } else {
        const kind = SEARCH_TYPES[rawType];
        if (!kind) {
          const b64 = this.b64e(c);
          return {
            status: false,
            result: { error: `Invalid search type "${type}". Valid values: popular, recent, trending, clips, all` },
            state: b64,
            State: b64
          };
        }
        const params = new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit)
        });
        if (kind === "popular" || kind === "trending") {
          params.set("range", range || "week");
        }
        result = await this.apiRequest(c, "GET", `v2/explore/${kind}?${params.toString()}`);
      }

      const b64 = this.b64e(c);
      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_search" },
        state: b64,
        State: b64
      };
    }
  }

  async library({ state, page = 1, limit = 20, q = "", sortAsc, sort_asc, sort } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const query = this.buildSearchQuery({ page, limit });
      const asc = sortAsc ?? sort_asc ?? sort ?? false;
      const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit),
        sortAsc: String(asc === true || asc === "true"),
        q: String(q || "")
      });

      const result = await this.apiRequest(c, "GET", `v2/users/${c.user_id}/library?${params.toString()}`);
      const b64 = this.b64e(c);
      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_library" },
        state: b64,
        State: b64
      };
    }
  }

  async song({ state, song_id, songId, id } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = song_id || songId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'song_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const result = await this.apiRequest(c, "GET", `v2/songs/${targetId}/details`);
      const b64 = this.b64e(c);
      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_song" },
        state: b64,
        State: b64
      };
    }
  }

  async job({ state, job_id, jobId, id } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = job_id || jobId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'job_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const result = await this.apiRequest(c, "GET", `v2/songs/${targetId}`);
      const b64 = this.b64e(c);
      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_job" },
        state: b64,
        State: b64
      };
    }
  }

  async wait({ state, job_id, jobId, id, interval, intervalMs, timeout, timeoutMs } = {}) {
    let c = null;
    try {
      c = await this.ensure_c(state);
      const targetId = job_id || jobId || id;
      if (!targetId) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'job_id' (atau 'id') wajib diisi." },
          state: b64,
          State: b64
        };
      }
      const result = await this.waitForJobInternal(c, targetId, {
        intervalMs: intervalMs || interval,
        timeoutMs: timeoutMs || timeout
      });
      const b64 = this.b64e(c);
      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: { error: e?.message || "failed_wait" },
        state: b64,
        State: b64
      };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = [
    "reg_dev",
    "info",
    "genres",
    "moods",
    "lyrics",
    "create",
    "search",
    "library",
    "song",
    "job",
    "wait"
  ];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          info: "/?action=info&state=BASE64_STATE",
          genres: "/?action=genres",
          moods: "/?action=moods",
          lyrics: "/?action=lyrics&prompt=Lagu+tentang+senja+di+pantai",
          create_from_desc: {
            url: "/?action=create",
            body: {
              description: "Lagu pop ceria tentang pagi hari",
              genre: "Pop",
              mood: "Happy",
              gender: "female",
              record: "studio",
              wait: true
            }
          },
          create_from_lyrics: {
            url: "/?action=create",
            body: {
              title: "Senja",
              lyrics: "[Verse]\nMatahari terbenam...",
              genre: "Indie",
              mood: "Chill",
              wait: false
            }
          },
          search: "/?action=search&type=popular&page=1&limit=20&range=week",
          library: "/?action=library&state=BASE64_STATE&page=1&limit=20",
          song: "/?action=song&song_id=SONG_ID",
          job: "/?action=job&job_id=JOB_ID",
          wait: "/?action=wait&job_id=JOB_ID"
        }
      }
    });
  }

  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions
    });
  }

  const api = new SonivaMusic();
  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "info":
        response = await api.info(params);
        break;
      case "genres":
        response = await api.genres(params);
        break;
      case "moods":
        response = await api.moods(params);
        break;
      case "lyrics": {
        const prompt = params.prompt || params.content;
        if (!prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' (atau 'content') wajib diisi."
          });
        }
        response = await api.lyrics(params);
        break;
      }
      case "create": {
        const hasLyrics = Boolean(params.lyrics && String(params.lyrics).trim());
        const hasDesc = Boolean((params.description || params.desc || params.prompt || "").trim());
        if (hasLyrics && !params.title) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'title' wajib diisi saat membuat lagu dengan 'lyrics'."
          });
        }
        if (!hasLyrics && !hasDesc) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'description' (atau 'prompt'/'lyrics') wajib diisi."
          });
        }
        response = await api.create(params);
        break;
      }
      case "search":
        response = await api.search(params);
        break;
      case "library":
        response = await api.library(params);
        break;
      case "song": {
        const songId = params.song_id || params.songId || params.id;
        if (!songId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'song_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.song(params);
        break;
      }
      case "job": {
        const jobId = params.job_id || params.jobId || params.id;
        if (!jobId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'job_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.job(params);
        break;
      }
      case "wait": {
        const jobId = params.job_id || params.jobId || params.id;
        if (!jobId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'job_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.wait(params);
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada server SonivaMusic.",
        result: response?.result || null,
        state: response?.state || null
      });
    }

    return res.status(200).json({
      action,
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

export default withApiLog(withRateLimit(handler));