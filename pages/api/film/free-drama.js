import axios from "axios";
import crypto from "crypto";
class FreeDrama {
  constructor() {
    this.base = "https://api.kukufm.com";
    this.cf_base = "https://d31ntp24xvh0tq.cloudfront.net";
    this.def_h = {
      "User-Agent": "free-drama-android/5.8.2",
      "Accept-Encoding": "gzip",
      "install-source": "google_play",
      lang: "english",
      "app-version": "50802",
      "package-name": "com.drama.free",
      "build-number": "5080202",
      "client-country": "ID"
    };
  }
  _rnd() {
    console.log("[LOG] Membuat android_id acak...");
    try {
      return crypto.randomBytes(8).toString("hex");
    } catch (e) {
      console.log(`[ERROR] _rnd gagal: ${e.message}`);
      return "0666b2e8da418dfa";
    }
  }
  async chk_tok(token, android_id) {
    console.log("[LOG] Memeriksa status token...");
    try {
      if (token) return token;
      console.log("[LOG] Token kosong, memicu alur auto-token...");
      const fb = await this.fb_sign();
      if (!fb.status) return null;
      const fb_tok = fb.result?.idToken;
      if (!fb_tok) return null;
      const sess = await this.session({
        firebase_token: fb_tok,
        android_id: android_id
      });
      return sess.status ? sess.result?.access_token : null;
    } catch (e) {
      console.log(`[ERROR] chk_tok gagal: ${e.message}`);
      return null;
    }
  }
  async fb_sign() {
    console.log("[LOG] Mengirim POST ke RelyingParty Signup...");
    try {
      const res = await axios.post("https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyCKncphbcD-b6vIRNByOnfnQlI1kqnNqNg", {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "X-Android-Package": "com.drama.free",
          "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
          "Accept-Language": "id-ID, en-US",
          "X-Client-Version": "Android/Fallback/X23002000/FirebaseCore-Android",
          "X-Firebase-GMPID": "1:850220037081:android:fa0f4cb5bc8f97b7275fc8",
          "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
          "X-Firebase-AppCheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
        }
      });
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.log(`[ERROR] fb_sign gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async session({
    firebase_token,
    android_id,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim POST ke get-session-token...");
    try {
      if (!firebase_token) {
        return {
          status: false,
          result: "Missing required input: firebase_token"
        };
      }
      const bodyParams = {
        app_name: "com.drama.free",
        os_type: "android",
        app_build_number: "50802",
        installed_version: "5.8.2",
        firebase_token: firebase_token,
        ad_uri: "",
        appsflyer_data: "",
        user_name: "",
        user_image_url: "",
        advertising_id: "",
        android_id: android_id || this._rnd(),
        ...rest
      };
      const body = new URLSearchParams(bodyParams);
      const res = await axios.post(`${this.base}/api/v1.1/users/get-session-token/`, body.toString(), {
        headers: {
          "User-Agent": "free-drama-android/5.8.2",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/x-www-form-urlencoded",
          "install-source": "google_play",
          "app-version": "50802",
          "package-name": "com.drama.free",
          "build-number": "5080202"
        }
      });
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.log(`[ERROR] session gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async refreshToken({
    refresh_token,
    android_id,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim POST ke refresh token...");
    try {
      if (!refresh_token) {
        return {
          status: false,
          result: "Missing refresh_token"
        };
      }
      const bodyParams = {
        refresh_token: refresh_token,
        android_id: android_id || this._rnd(),
        ...rest
      };
      const body = new URLSearchParams(bodyParams);
      const res = await axios.post(`${this.base}/api/v1.1/users/refresh-token/`, body.toString(), {
        headers: {
          "User-Agent": "free-drama-android/5.8.2",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/x-www-form-urlencoded",
          "install-source": "google_play",
          "app-version": "50802",
          "package-name": "com.drama.free",
          "build-number": "5080202"
        }
      });
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.log(`[ERROR] refreshToken gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async config({
    token,
    android_id,
    headers = {},
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim POST ke master config...");
    try {
      const aid = android_id || this._rnd();
      const act_tok = await this.chk_tok(token, aid);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null,
          cookie: null
        };
      }
      const payload = {
        lang: "english",
        langs_required: true,
        android_id: aid,
        advertising_id: "",
        play_store_country_code: "IN",
        ...rest
      };
      const requestHeaders = {
        ...this.def_h,
        ...headers,
        "Content-Type": "application/json",
        authorization: `jwt ${act_tok}`
      };
      const res = await axios.post(`${this.base}/api/v1.0/config/master/android/`, payload, {
        headers: requestHeaders
      });
      let cookie = null;
      if (res.headers["set-cookie"]) {
        cookie = res.headers["set-cookie"].join("; ");
      }
      return {
        status: true,
        result: res.data,
        token: act_tok,
        cookie: cookie
      };
    } catch (e) {
      console.log(`[ERROR] config gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null,
        cookie: null
      };
    }
  }
  async download({
    url,
    token,
    android_id,
    ...rest
  } = {}) {
    console.log("[LOG] Memulai download dengan auto-init cookie (header okhttp)...");
    try {
      if (!url) {
        return {
          status: false,
          result: "Missing required input: url",
          token: null,
          cookie: null
        };
      }
      const cfg = await this.config({
        token: token,
        android_id: android_id,
        headers: {
          "User-Agent": "okhttp/4.12.0"
        },
        ...rest
      });
      if (!cfg.status) {
        return {
          status: false,
          result: cfg.result,
          token: null,
          cookie: null
        };
      }
      const {
        cookie,
        token: newToken
      } = cfg;
      return {
        status: true,
        url: url,
        cookie: cookie,
        token: newToken
      };
    } catch (e) {
      console.log(`[ERROR] download gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null,
        cookie: null
      };
    }
  }
  async home({
    token,
    page,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke home all...");
    try {
      if (!page) {
        return {
          status: false,
          result: "Missing required input: page",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams({
        page: page,
        ...rest
      });
      const res = await axios.get(`${this.base}/api/v3/home/all/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] home gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async detail({
    token,
    channel_id,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke channel details...");
    try {
      if (!channel_id) {
        return {
          status: false,
          result: "Missing required input: channel_id",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams({
        is_store_visited: "false",
        lang: "english",
        is_coin_based_monetization: "false",
        ...rest
      });
      const res = await axios.get(`${this.base}/api/v1.2/channels/${channel_id}/details/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] detail gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async autoplay({
    token,
    last_show_ids,
    last_rank,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke next episode autoplay...");
    try {
      if (!last_show_ids || !last_rank) {
        return {
          status: false,
          result: "Missing required input: last_show_ids or last_rank",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams({
        last_recommended_show_ids: last_show_ids,
        last_episode_channel_rank: last_rank,
        ...rest
      });
      const res = await axios.get(`${this.base}/api/v1.2/shows/next-episode-autoplay/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] autoplay gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async more_like({
    token,
    include_shows,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke more like this shows...");
    try {
      if (!include_shows) {
        return {
          status: false,
          result: "Missing required input: include_shows",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams({
        lang: "english",
        include_shows: include_shows,
        ...rest
      });
      const res = await axios.get(`${this.base}/api/v2/groups/more-like-this/shows/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] more_like gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async for_you({
    token,
    page,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke home for you...");
    try {
      if (!page) {
        return {
          status: false,
          result: "Missing required input: page",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams({
        page: page,
        ...rest
      });
      const res = await axios.get(`${this.base}/api/v1.0/home/for-you/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] for_you gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async recommend({
    token,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke search recommend...");
    try {
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams(rest);
      const res = await axios.get(`${this.base}/api/v2/search/recommendations/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] recommend gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async episode({
    token,
    channel_id,
    page,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke channels episodes...");
    try {
      if (!channel_id || !page) {
        return {
          status: false,
          result: "Missing required input: channel_id or page",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams({
        page: page,
        lang: "english",
        is_coin_based_monetization: "false",
        page_size: "10",
        ...rest
      });
      const res = await axios.get(`${this.base}/api/v2.3/channels/${channel_id}/episodes/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] episode gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async crew({
    token,
    show_slug,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke show cast crew details...");
    try {
      if (!show_slug) {
        return {
          status: false,
          result: "Missing required input: show_slug",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams(rest);
      const res = await axios.get(`${this.base}/api/v1.1/shows/${show_slug}/show-cast-crew-details/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] crew gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async rewards({
    token,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke rewards list...");
    try {
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams(rest);
      const res = await axios.get(`${this.base}/api/v1.0/rewards/list/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] rewards gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async claim_reward({
    token,
    id,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim POST ke claim rewards...");
    try {
      if (!id) {
        return {
          status: false,
          result: "Missing required input: id",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const payload = {
        id: id,
        claim_all: true,
        ...rest
      };
      const res = await axios.post(`${this.base}/api/v1.0/rewards/claim/`, payload, {
        headers: {
          ...this.def_h,
          "Content-Type": "application/json",
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] claim_reward gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async daily_reward({
    token,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke daily checkin reward...");
    try {
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const query = new URLSearchParams(rest);
      const res = await axios.get(`${this.base}/api/v1.0/rewards/daily-checkin/reward/?${query.toString()}`, {
        headers: {
          ...this.def_h,
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] daily_reward gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
  async search({
    token,
    q,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim GET ke search endpoint (base utama dulu)...");
    try {
      if (!q) {
        return {
          status: false,
          result: "Missing required input: q",
          token: null,
          fallback: false
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null,
          fallback: false
        };
      }
      const query = new URLSearchParams({
        q: q,
        language_ids: "1",
        click_analytics: "true",
        lang: "english",
        user_set: "7",
        has_premium: "false",
        ...rest
      });
      let res;
      let usedFallback = false;
      try {
        res = await axios.get(`${this.base}/api/v3/search/?${query.toString()}`, {
          headers: {
            ...this.def_h,
            authorization: `jwt ${act_tok}`
          }
        });
      } catch (err) {
        console.log("[LOG] Base utama gagal, fallback ke CloudFront...");
        usedFallback = true;
        res = await axios.get(`${this.cf_base}/api/v3/search/?${query.toString()}`, {
          headers: {
            ...this.def_h,
            authorization: `jwt ${act_tok}`
          }
        });
      }
      return {
        status: true,
        result: res.data,
        token: act_tok,
        fallback: usedFallback
      };
    } catch (e) {
      console.log(`[ERROR] search gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null,
        fallback: false
      };
    }
  }
  async update_settings({
    token,
    settings,
    ...rest
  } = {}) {
    console.log("[LOG] Mengirim POST ke update settings...");
    try {
      if (!settings || typeof settings !== "object") {
        return {
          status: false,
          result: "Missing or invalid required input: settings",
          token: null
        };
      }
      const act_tok = await this.chk_tok(token);
      if (!act_tok) {
        return {
          status: false,
          result: "Token verification failed",
          token: null
        };
      }
      const defaultSettings = {
        "audio-quality": "Auto",
        "autoplay-next-show": true,
        "cellular-download-quality": "auto",
        "cellular-video-quality": "best_quality",
        "current-playback-speed": 1,
        "download-default-selected": false,
        "download-audio-quality": "Normal",
        "screen-awake": false,
        "smart-playback": true,
        "wifi-download-quality": "auto",
        "wifi-video-quality": "best_quality",
        ...settings,
        ...rest
      };
      const res = await axios.post(`${this.base}/api/v1.0/users/me/update-settings/`, defaultSettings, {
        headers: {
          ...this.def_h,
          "Content-Type": "application/json",
          authorization: `jwt ${act_tok}`
        }
      });
      return {
        status: true,
        result: res.data,
        token: act_tok
      };
    } catch (e) {
      console.log(`[ERROR] update_settings gagal: ${e.message}`);
      return {
        status: false,
        result: e.response?.data || e.message,
        token: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["session", "refresh_token", "config", "home", "detail", "autoplay", "more_like", "for_you", "recommend", "episode", "crew", "rewards", "claim_reward", "daily_reward", "search", "update_settings", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          session: "/free-drama?action=session&firebase_token=...",
          refresh_token: "/free-drama?action=refresh_token&refresh_token=...",
          config: "/free-drama?action=config&token=...",
          home: "/free-drama?action=home&token=...&page=1",
          detail: "/free-drama?action=detail&token=...&channel_id=276857",
          search: "/free-drama?action=search&token=...&q=guard",
          update_settings: '/free-drama?action=update_settings&token=...&settings={"audio-quality":"Auto"}',
          download: "/free-drama?action=download&url=https://media.cdn.kukufm.com/video-episode/.../480p.m3u8"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new FreeDrama();
  let response;
  try {
    switch (action) {
      case "session":
        response = await api.session(params);
        break;
      case "refresh_token":
        response = await api.refreshToken(params);
        break;
      case "config":
        response = await api.config(params);
        break;
      case "home":
        response = await api.home(params);
        break;
      case "detail":
        response = await api.detail(params);
        break;
      case "autoplay":
        response = await api.autoplay(params);
        break;
      case "more_like":
        response = await api.more_like(params);
        break;
      case "for_you":
        response = await api.for_you(params);
        break;
      case "recommend":
        response = await api.recommend(params);
        break;
      case "episode":
        response = await api.episode(params);
        break;
      case "crew":
        response = await api.crew(params);
        break;
      case "rewards":
        response = await api.rewards(params);
        break;
      case "claim_reward":
        response = await api.claim_reward(params);
        break;
      case "daily_reward":
        response = await api.daily_reward(params);
        break;
      case "search":
        response = await api.search(params);
        break;
      case "update_settings":
        response = await api.update_settings(params);
        break;
      case "download":
        response = await api.download(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action '${action}' tidak dikenali.`
        });
    }
    if (!response || !response.status) {
      return res.status(502).json({
        status: false,
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      action: action,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}