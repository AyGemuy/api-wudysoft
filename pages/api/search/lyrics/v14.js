import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";

const NOISE = /(^|\s|\()(cover|tribute|karaoke|remix|acoustic|piano|instrumental|reprise|sampler|edit)(\s|\)|$)|(^|-|\()\s*(live|demo)\b/i;

let cachedToken = null;

class MusixmatchClient {
  constructor() {
    this.base = "https://apic-appmobile.musixmatch.com/ws/1.1";
    this.appId = "android-player-v1.0";
    this.ua = "Musixmatch/8.5.0 (Android 13; Pixel 7)";
  }

  slp(ms) {
    return new Promise((r) => setTimeout(r, ms));
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

  ctx(state, tokenParam) {
    const d = this.b64d(state);
    return {
      token: tokenParam || d?.token || cachedToken || null
    };
  }

  norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  lines(raw) {
    try {
      return JSON.parse(raw).map((x) => ({
        time: x.time.total,
        text: x.text
      }));
    } catch {
      return [];
    }
  }

  stamp(s) {
    const mins = String(Math.floor(s / 60)).padStart(2, "0");
    const secs = String(Math.floor(s % 60)).padStart(2, "0");
    const cs = String(Math.round((s % 1) * 100)).padStart(2, "0");
    return `${mins}:${secs}.${cs}`;
  }

  toLrc(list) {
    return list
      .filter((l) => l.text && l.text.trim())
      .map((l) => `[${this.stamp(l.time)}]${l.text}`)
      .join("\n");
  }

  shape(t) {
    return {
      id: t.track_id,
      title: t.track_name,
      artist: t.artist_name,
      album: t.album_name,
      cover: t.album_coverart_500x500 || t.album_coverart_350x350 || t.album_coverart_100x100 || null,
      rating: t.track_rating,
      favourites: t.num_favourite || 0,
      released: t.first_release_date || null,
      hasLyrics: !!t.has_lyrics,
      hasSynced: !!t.has_subtitles,
      instrumental: !!t.instrumental,
      language: t.lyrics_language || null,
      spotifyId: t.track_spotify_id || null,
      shareUrl: t.track_share_url || null
    };
  }

  async getToken(attempts = 3) {
    let hint = "";
    for (let i = 0; i < attempts; i++) {
      if (i) await this.slp(12000);
      const qs = new URLSearchParams({
        app_id: this.appId,
        format: "json"
      });
      const headers = {
        "user-agent": this.ua,
        "x-requested-with": "com.musixmatch.android.lyrify"
      };
      const res = await fetch(`${this.base}/token.get?${qs}`, { headers });
      const json = await res.json();
      const value = json?.message?.body?.user_token;
      if (value && !/^0+$/.test(value)) {
        cachedToken = value;
        return value;
      }
      hint = json?.message?.header?.hint || `status ${json?.message?.header?.status_code}`;
    }
    throw new Error(`musixmatch: token unavailable (${hint}), retry later`);
  }

  async requestCall(c, path, params = {}, retry = true) {
    if (!c.token) {
      c.token = await this.getToken();
    }

    const cleanParams = {};
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null && v !== "") {
        cleanParams[k] = String(v);
      }
    }

    const qs = new URLSearchParams({
      app_id: this.appId,
      usertoken: c.token,
      format: "json",
      ...cleanParams
    });

    const res = await fetch(`${this.base}/${path}?${qs}`, {
      headers: { "user-agent": this.ua }
    });
    const json = await res.json();
    const header = json?.message?.header || {};

    if (retry && (header.status_code === 401 || header.status_code === 403)) {
      c.token = await this.getToken();
      return this.requestCall(c, path, params, false);
    }

    if (header.status_code !== 200) {
      throw new Error(`musixmatch: ${path} ${header.status_code} ${header.hint || ""}`.trim());
    }

    return json.message.body;
  }

  async versions(c, id) {
    const body = await this.requestCall(c, "track.subtitles.get", {
      track_id: id,
      subtitle_format: "mxm"
    });
    return (body.subtitle_list || []).map((x) => x.subtitle);
  }

  async reg_dev({ state, force = false } = {}) {
    let c = this.ctx(state);
    try {
      const shouldForce = force === true || force === "true";
      if (!c.token || shouldForce) {
        c.token = await this.getToken();
      }
      const b64 = this.b64e(c);
      return {
        status: true,
        result: { token: c.token },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c);
      return {
        status: false,
        result: { error: e?.message || "failed_reg_dev" },
        state: b64,
        State: b64
      };
    }
  }

  async search({ state, token, q, query, track, artist, album, lyrics, limit = 10, sort = "desc", preferOriginal, prefer_original } = {}) {
    const c = this.ctx(state, token);
    try {
      const searchQ = q ?? query;
      if (!searchQ && !track && !artist && !album && !lyrics) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'q', 'track', 'artist', 'album', atau 'lyrics' wajib diisi." },
          state: b64,
          State: b64
        };
      }

      const maxLimit = Number(limit) > 0 ? Number(limit) : 10;
      const body = await this.requestCall(c, "track.search", {
        ...(track || searchQ ? { q_track: track || searchQ } : {}),
        ...(artist ? { q_artist: artist } : {}),
        ...(album ? { q_album: album } : {}),
        ...(lyrics ? { q_lyrics: lyrics } : {}),
        page: 1,
        page_size: Math.max(maxLimit, 10),
        f_has_lyrics: 1,
        s_track_rating: sort || "desc",
        quorum_factor: 1
      });

      const list = (body.track_list || []).map((x) => this.shape(x.track));
      const out = list.filter((x) => !NOISE.test(x.title));
      const ranked = out.length ? out : list;
      ranked.sort(
        (a, b) =>
          b.rating - a.rating ||
          b.favourites - a.favourites ||
          String(a.released).localeCompare(String(b.released))
      );

      const prefOrig = preferOriginal === true || preferOriginal === "true" || prefer_original === true || prefer_original === "true";
      let finalTracks;
      if (!prefOrig || (!track && !searchQ)) {
        finalTracks = ranked.slice(0, maxLimit);
      } else {
        const want = this.norm(track || searchQ);
        const base = ` ${want} `;
        const og = ranked
          .filter((x) => x.title)
          .filter((x) => ` ${this.norm(x.title)} `.startsWith(base))
          .sort(
            (a, b) =>
              String(a.released).localeCompare(String(b.released)) ||
              Number(b.hasSynced) - Number(a.hasSynced)
          );
        finalTracks = (og.length ? og : ranked).slice(0, maxLimit);
      }

      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          total: finalTracks.length,
          tracks: finalTracks
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c);
      return {
        status: false,
        result: { error: e?.message || "failed_search" },
        state: b64,
        State: b64
      };
    }
  }

  async lyrics({
    state,
    token,
    trackId,
    track_id,
    id,
    track,
    artist,
    q,
    query,
    preferOriginal,
    prefer_original,
    language,
    lang,
    richsync = false
  } = {}) {
    const c = this.ctx(state, token);
    try {
      const targetTrackId = trackId || track_id || id;
      const searchQ = q ?? query;
      if (!targetTrackId && !track && !searchQ) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'track_id', 'track', atau 'q' wajib diisi." },
          state: b64,
          State: b64
        };
      }

      const prefOrig = preferOriginal === true || preferOriginal === "true" || prefer_original === true || prefer_original === "true";
      let resolvedId = targetTrackId;

      if (!resolvedId && !track) {
        const sRes = await this.search({
          state: this.b64e(c),
          token: c.token,
          track: searchQ,
          limit: 1,
          preferOriginal: prefOrig
        });
        if (!sRes.status) return sRes;
        resolvedId = sRes.result?.tracks?.[0]?.id;
        if (sRes.state) c.token = this.b64d(sRes.state).token || c.token;
      }

      if (!resolvedId && !track) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "musixmatch: track not found" },
          state: b64,
          State: b64
        };
      }

      const body = await this.requestCall(c, "macro.subtitles.get", {
        namespace: "lyrics_synched",
        subtitle_format: "mxm",
        ...(resolvedId
          ? { track_id: resolvedId }
          : { ...(track ? { q_track: track } : {}), ...(artist ? { q_artist: artist } : {}) })
      });

      const calls = body.macro_calls || {};
      const t = calls["matcher.track.get"]?.message?.body?.track;
      if (!t || !t.track_id) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "musixmatch: track not found" },
          state: b64,
          State: b64
        };
      }

      const plain = calls["track.lyrics.get"]?.message?.body?.lyrics || {};
      const subs = calls["track.subtitles.get"]?.message?.body?.subtitle_list || [];
      let picked = subs[0]?.subtitle || null;
      let langs = [...new Set(subs.map((x) => x.subtitle?.subtitle_language).filter(Boolean))];

      const targetLang = language || lang;
      if (targetLang) {
        const all = await this.versions(c, t.track_id).catch(() => []);
        langs = [...new Set(all.map((s) => s.subtitle_language).filter(Boolean))];
        picked =
          all.find((s) => s.subtitle_language === targetLang && s.published_status === 1) ||
          all.find((s) => s.subtitle_language === targetLang) ||
          picked;
      }

      const synced = picked?.subtitle_body ? this.lines(picked.subtitle_body) : [];
      const wantRich = richsync === true || richsync === "true";
      const rich = wantRich
        ? await this.requestCall(c, "track.richsync.get", { track_id: t.track_id })
            .then((b) => b.richsync?.richsync_body || null)
            .catch(() => null)
        : null;

      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          ...this.shape(t),
          language: picked?.subtitle_language || plain.lyrics_language || t.lyrics_language || null,
          languages: langs,
          lyricId: plain.lyrics_id || null,
          lyrics: plain.lyrics_body || "",
          synced,
          lrc: synced.length ? this.toLrc(synced) : "",
          richsync: rich,
          copyright: plain.lyrics_copyright || picked?.lyrics_copyright || "",
          updatedAt: plain.updated_time || null
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c);
      return {
        status: false,
        result: { error: e?.message || "failed_lyrics" },
        state: b64,
        State: b64
      };
    }
  }

  async request({ state, token, path, endpoint, ...rest } = {}) {
    const c = this.ctx(state, token);
    try {
      const targetPath = path || endpoint;
      if (!targetPath) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: { error: "Parameter 'path' wajib diisi (contoh: track.get)." },
          state: b64,
          State: b64
        };
      }
      const data = await this.requestCall(c, String(targetPath), rest);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: data,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c);
      return {
        status: false,
        result: { error: e?.message || "failed_request" },
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

  const valid_actions = ["reg_dev", "search", "lyrics", "request"];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          search: "/?action=search&q=Fix+You&artist=Coldplay&limit=10&prefer_original=true",
          lyrics_by_query: "/?action=lyrics&q=Coldplay+Yellow&prefer_original=true",
          lyrics_by_id: "/?action=lyrics&track_id=15953433&richsync=true",
          request: "/?action=request&path=chart.tracks.get&page=1&page_size=10&country=id"
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

  const api = new MusixmatchClient();
  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "search": {
        const hasSearch = params.q ?? params.query ?? params.track ?? params.artist ?? params.album ?? params.lyrics;
        if (!hasSearch) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q', 'track', 'artist', 'album', atau 'lyrics' wajib diisi."
          });
        }
        response = await api.search(params);
        break;
      }
      case "lyrics": {
        const hasTarget = params.trackId || params.track_id || params.id || params.track || params.q || params.query;
        if (!hasTarget) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'track_id', 'track', atau 'q' wajib diisi."
          });
        }
        response = await api.lyrics(params);
        break;
      }
      case "request": {
        if (!params.path && !params.endpoint) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'path' wajib diisi."
          });
        }
        response = await api.request(params);
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
        error: response?.result?.error || "Gagal memproses request pada server Musixmatch.",
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