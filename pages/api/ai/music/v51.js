import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class MusicSeed {
  constructor() {
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.chUa = '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"';
    this.gmpId = "1:185113216280:web:e9294ec2e45157dffd0a6d";
    this.defFbKey = "AIzaSyD_rvFYHvpqgK0yi5KhlljOGHUDPz4xqS0";
    this.defApiBase = "https://muapi.musicseed.ai/mus01-web-api";
    this.defKey = "YOVqEWNmIv98KYmq";
    this.defIv = "RuzsW8KPoKppX1Hy";
    this.modelIds = {
      V1_0: "ms-v1.0",
      V1_5: "ms-v1.5",
      V2_0: "ms-v2.0",
      V2_5: "ms-v2.5",
      V3_0: "ms-v3.0"
    };
    this.apiModels = {
      CHIRP_V4: "chirp-v4",
      CHIRP_V4_5: "chirp-v4-5",
      CHIRP_V4_5_PLUS: "chirp-v4-5-plus",
      CHIRP_V5: "chirp-v5",
      CHIRP_V4_5_LITE: "chirp-v4-5-lite",
      CHIRP_AUK: "chirp-auk",
      CHIRP_FENIX: "chirp-fenix"
    };
    this.modelMapping = {
      "ms-v1.0": "chirp-v4-5-lite",
      "ms-v1.5": "chirp-v4",
      "ms-v2.0": "chirp-v4-5",
      "ms-v2.5": "chirp-v4-5-plus",
      "ms-v3.0": "chirp-v5"
    };
    this.modelDefs = [{
      id: "ms-v3.0",
      name: "Master-V3.0",
      api_model: "chirp-v5",
      pro: true,
      credits_per_song: 20,
      generate_cost: 40,
      limits: {
        lyrics: 8e3,
        style: 800,
        title: 80,
        prompt: 800
      }
    }, {
      id: "ms-v2.5",
      name: "Precision-V2.5",
      api_model: "chirp-v4-5-plus",
      pro: true,
      credits_per_song: 15,
      generate_cost: 30,
      limits: {
        lyrics: 5e3,
        style: 500,
        title: 50,
        prompt: 500
      }
    }, {
      id: "ms-v2.0",
      name: "Stable-V2.0",
      api_model: "chirp-v4-5",
      pro: false,
      credits_per_song: 15,
      generate_cost: 30,
      limits: {
        lyrics: 5e3,
        style: 500,
        title: 50,
        prompt: 500
      }
    }, {
      id: "ms-v1.5",
      name: "Elevate-V1.5",
      api_model: "chirp-v4",
      pro: false,
      credits_per_song: 10,
      generate_cost: 20,
      limits: {
        lyrics: 3e3,
        style: 200,
        title: 50,
        prompt: 200
      }
    }, {
      id: "ms-v1.0",
      name: "MS-V1.0",
      api_model: "chirp-v4-5-lite",
      pro: false,
      credits_per_song: 10,
      generate_cost: 20,
      limits: {
        lyrics: 3e3,
        style: 200,
        title: 50,
        prompt: 200
      }
    }];
    this.http = axios.create({
      timeout: 35e3,
      validateStatus: () => true
    });
  }
  _log(m) {
    try {
      console.log(`[MusicSeed] ${m}`);
    } catch {
      return;
    }
  }
  _uuid() {
    try {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : r & 3 | 8).toString(16);
      });
    } catch {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  _slp(ms) {
    try {
      return new Promise(r => setTimeout(r, ms || 1e3));
    } catch {
      return Promise.resolve();
    }
  }
  _resolveModel(inputModel) {
    try {
      const raw = String(inputModel || "ms-v2.0").trim().toLowerCase();
      if (this.modelMapping[raw]) return this.modelMapping[raw];
      const found = this.modelDefs.find(m => m.id.toLowerCase() === raw || m.name.toLowerCase() === raw || m.api_model.toLowerCase() === raw);
      if (found) return found.api_model;
      if (Object.values(this.apiModels).includes(raw)) return raw;
      return this.apiModels.CHIRP_V4_5;
    } catch {
      return "chirp-v4-5";
    }
  }
  _prsJson(val) {
    try {
      if (typeof val !== "string") return val;
      const parsed = JSON.parse(val);
      return typeof parsed === "object" && parsed !== null ? this._snake(parsed) : parsed;
    } catch {
      return val;
    }
  }
  _snake(data) {
    try {
      if (!data || typeof data !== "object") {
        return typeof data === "string" ? this._prsJson(data) : data;
      }
      if (Array.isArray(data)) {
        return data.map(item => this._snake(item));
      }
      return Object.entries(data).reduce((acc, [k, v]) => {
        const sKey = k.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
        const rawVal = typeof v === "string" ? this._prsJson(v) : v;
        return {
          ...acc,
          [sKey]: typeof rawVal === "object" && rawVal !== null ? this._snake(rawVal) : rawVal
        };
      }, {});
    } catch {
      return data || {};
    }
  }
  _encSt(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }
  _decSt(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf8")) : null;
    } catch {
      return null;
    }
  }
  _bldCks(cksObj) {
    try {
      return Object.entries(cksObj || {}).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch {
      return "";
    }
  }
  _prsCks(resHeaders, existingCks = {}) {
    try {
      const raw = resHeaders?.["set-cookie"] || [];
      const merged = {
        ...existingCks || {}
      };
      raw.forEach(cookieStr => {
        const parts = cookieStr.split(";")[0]?.split("=") || [];
        if (parts.length >= 2) {
          const k = parts[0]?.trim();
          const v = parts.slice(1).join("=").trim();
          if (k) merged[k] = v;
        }
      });
      return merged;
    } catch {
      return existingCks || {};
    }
  }
  _decUrl(enc, keyStr, ivStr) {
    try {
      if (!enc || /^https?:\/\//i.test(enc)) return enc;
      const key = Buffer.from(keyStr || this.defKey, "utf8");
      const iv = Buffer.from(ivStr || this.defIv, "utf8");
      let b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
      decipher.setAutoPadding(true);
      let dec = decipher.update(b64, "base64", "utf8");
      dec += decipher.final("utf8");
      return dec;
    } catch (e) {
      this._log(`Decrypt audio url failed: ${e.message}`);
      return enc;
    }
  }
  _fbHds(isCross = true) {
    try {
      return {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.musicseed.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.musicseed.ai/",
        "sec-ch-ua": this.chUa,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": isCross ? "cross-site" : "same-site",
        "user-agent": this.ua,
        "x-client-data": "CLjxygE=",
        "x-client-version": "Chrome/JsCore/12.17.0/FirebaseCore-web",
        "x-firebase-gmpid": this.gmpId
      };
    } catch {
      return {};
    }
  }
  _msHds(st, extra = {}) {
    try {
      return {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        cookie: this._bldCks(st?.cookies),
        "device-id": st?.device_id || "",
        "id-token": st?.id_token || "",
        origin: "https://www.musicseed.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.musicseed.ai/",
        "sec-ch-ua": this.chUa,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": this.ua,
        ...extra || {}
      };
    } catch {
      return extra || {};
    }
  }
  async _initCfg() {
    try {
      this._log("Scraping app configs from https://www.musicseed.ai/home...");
      const res = await this.http.get("https://www.musicseed.ai/home", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          referer: "https://musicseed-e7855.firebaseapp.com/",
          "sec-ch-ua": this.chUa,
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": this.ua
        }
      });
      const _ = cheerio.load(res?.data || "");
      const raw = _(".app-ssr-slot, script").map((i, el) => _(el).text()).get().find(t => t?.includes("window.NUXT") || t?.includes("fieldEncryptKey"));
      return {
        fb_key: raw?.match(/firebaseApiKey:"([^"]+)"/)?.[1] || raw?.match(/apiKey:"([^"]+)"/)?.[1] || this.defFbKey,
        api_base: raw?.match(/apiBase:"([^"]+)"/)?.[1] || this.defApiBase,
        enc_key: raw?.match(/fieldEncryptKey:"([^"]+)"/)?.[1] || this.defKey,
        enc_iv: raw?.match(/fieldEncryptIv:"([^"]+)"/)?.[1] || this.defIv,
        cookies: this._prsCks(res?.headers, {
          ms_pricing_variant: "B"
        })
      };
    } catch (e) {
      this._log(`Fallback config: ${e.message}`);
      return {
        fb_key: this.defFbKey,
        api_base: this.defApiBase,
        enc_key: this.defKey,
        enc_iv: this.defIv,
        cookies: {
          ms_pricing_variant: "B"
        }
      };
    }
  }
  async _genAcc(cfg) {
    try {
      this._log("Creating temp mail account...");
      const {
        data: mData
      } = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = mData?.email || `${this._uuid()}@emailhook.site`;
      const password = "Pass123!Secure";
      const devId = this._uuid();
      let cookies = {
        ...cfg?.cookies || {},
        device_id: devId
      };
      this._log(`Signing up with ${email}...`);
      const {
        data: suData
      } = await this.http.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg?.fb_key || this.defFbKey}`, {
        returnSecureToken: true,
        email: email,
        password: password,
        clientType: "CLIENT_TYPE_WEB"
      }, {
        headers: this._fbHds(true)
      });
      this._log("Sending verification code...");
      await this.http.post(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${cfg?.fb_key || this.defFbKey}`, {
        requestType: "VERIFY_EMAIL",
        idToken: suData?.idToken,
        continueUrl: "https://www.musicseed.ai/success?returnTo=%2F",
        canHandleCodeInApp: true
      }, {
        headers: this._fbHds(true)
      });
      this._log("Polling OTP code from email...");
      let oobCode = null;
      for (let i = 0; i < 15; i++) {
        await this._slp(3e3);
        const {
          data: inbox
        } = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const msg = inbox?.data?.[0]?.text_content || "";
        const match = msg.match(/oobCode=([a-zA-Z0-9_-]+)/) || msg.match(/mode=verifyEmail&oobCode=([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
          oobCode = match[1];
          break;
        }
      }
      if (oobCode) {
        this._log("Confirming account info with OOB code...");
        await this.http.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo?key=${cfg?.fb_key || this.defFbKey}`, {
          oobCode: oobCode
        }, {
          headers: {
            ...this._fbHds(true),
            origin: "https://musicseed-e7855.firebaseapp.com",
            referer: "https://musicseed-e7855.firebaseapp.com/",
            "x-client-version": "Chrome/JsCore/3.7.5/FirebaseCore-web"
          }
        });
      }
      this._log("Logging in to Firebase Auth...");
      const {
        data: auth
      } = await this.http.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg?.fb_key || this.defFbKey}`, {
        returnSecureToken: true,
        email: email,
        password: password,
        clientType: "CLIENT_TYPE_WEB"
      }, {
        headers: this._fbHds(true)
      });
      const idToken = auth?.idToken || suData?.idToken;
      const uid = auth?.localId || suData?.localId;
      this._log("Authenticating session on MusicSeed API...");
      const msLogRes = await this.http.post(`${cfg?.api_base || this.defApiBase}/auth/login`, {}, {
        headers: {
          ...this._fbHds(false),
          "auth-provider": "password",
          "content-length": "0",
          "device-id": devId,
          "id-token": idToken,
          cookie: this._bldCks(cookies)
        }
      });
      cookies = this._prsCks(msLogRes?.headers, cookies);
      this._log("Updating user parameters...");
      await this.http.post(`${cfg?.api_base || this.defApiBase}/user/update`, {
        uid: uid,
        abid: "B",
        gaCountry: "ID",
        gaLanguage: "en"
      }, {
        headers: {
          ...this._fbHds(false),
          cookie: this._bldCks(cookies),
          "device-id": devId,
          "id-token": idToken
        }
      });
      return {
        ...cfg || {},
        email: email,
        uid: uid,
        device_id: devId,
        id_token: idToken,
        refresh_token: auth?.refreshToken,
        cookies: cookies
      };
    } catch (e) {
      this._log(`Account creation error: ${e.message}`);
      return null;
    }
  }
  async _getSess(st) {
    try {
      let parsed = this._decSt(st);
      if (!parsed?.uid || !parsed?.id_token) {
        const cfg = await this._initCfg();
        parsed = await this._genAcc(cfg);
      }
      return parsed;
    } catch {
      return null;
    }
  }
  async models({
    state
  } = {}) {
    try {
      return {
        status: true,
        result: this._snake({
          available_models: this.modelDefs,
          default_model: "ms-v2.0",
          default_api_model: "chirp-v4-5",
          model_mapping: this.modelMapping
        }),
        state: state || null
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e.message
        },
        state: state || null
      };
    }
  }
  async lyrics({
    state,
    prompt,
    ...rest
  } = {}) {
    let sess = null;
    try {
      this._log("Generating lyrics...");
      sess = await this._getSess(state);
      if (!sess) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const payload = {
        prompt: prompt || "Cute lofiii",
        model: rest?.model || "default",
        action: "lyrics",
        ...rest
      };
      const res = await this.http.post(`${sess.api_base}/api/yoyai/lyricsSong`, payload, {
        headers: this._msHds(sess, {
          "content-type": "application/json"
        })
      });
      sess.cookies = this._prsCks(res?.headers, sess.cookies);
      const body = res?.data || {};
      return {
        status: body?.success ?? res?.status === 200,
        result: this._snake({
          code: body?.code || "200",
          message: body?.message || "success",
          data: body?.data || null
        }),
        state: this._encSt(sess)
      };
    } catch (e) {
      this._log(`Lyrics failed: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async create({
    state,
    prompt,
    lyrics,
    ...rest
  } = {}) {
    let sess = null;
    try {
      this._log("Creating music generation task...");
      sess = await this._getSess(state);
      if (!sess) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const isCustom = Boolean(lyrics || rest?.custom);
      const chosenModel = this._resolveModel(rest?.model);
      const payload = {
        action: "generate",
        custom: isCustom,
        model: chosenModel,
        instrumental: rest?.instrumental ?? (!lyrics && !isCustom),
        prompt: isCustom ? "" : prompt || "Viral folk-pop track, 102 BPM, minimal acoustic groove, memorable hook melody",
        lyric: lyrics || rest?.lyric || "",
        title: rest?.title || "",
        style: rest?.style || (isCustom ? "Mood:Thoughtful, Voice:Scream" : ""),
        vocal_gender: rest?.vocal_gender || "random",
        uid: sess.uid,
        ...rest
      };
      const res = await this.http.post(`${sess.api_base}/api/yoyai/generateSong`, payload, {
        headers: this._msHds(sess, {
          "content-type": "application/json"
        })
      });
      sess.cookies = this._prsCks(res?.headers, sess.cookies);
      const body = res?.data || {};
      return {
        status: body?.success ?? res?.status === 200,
        result: this._snake({
          code: body?.code || "200",
          message: body?.message || "success",
          model_used: chosenModel,
          ...body?.data || {}
        }),
        state: this._encSt(sess)
      };
    } catch (e) {
      this._log(`Create music failed: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async status({
    state,
    prompt,
    lyrics,
    ...rest
  } = {}) {
    let sess = null;
    try {
      this._log("Querying task status...");
      sess = await this._getSess(state);
      if (!sess) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const tId = rest?.task_id || rest?.taskId;
      if (!tId) {
        return {
          status: false,
          result: {
            error: "Param task_id or taskId is required"
          },
          state: this._encSt(sess)
        };
      }
      const res = await this.http.get(`${sess.api_base}/api/yoyai/queryGenerateSong/${tId}`, {
        headers: this._msHds(sess, {
          accept: "*/*"
        })
      });
      sess.cookies = this._prsCks(res?.headers, sess.cookies);
      const body = res?.data || {};
      const d = body?.data || {};
      const processedAssets = (d?.assets || []).map(asset => ({
        ...asset,
        audio_url: this._decUrl(asset?.audioUrl, sess.enc_key, sess.enc_iv),
        audio_url_raw: asset?.audioUrl
      }));
      const finalData = {
        code: body?.code || "200",
        message: body?.message || "success",
        ...d,
        is_completed: d?.resultCode === 1,
        assets: processedAssets
      };
      return {
        status: body?.success ?? res?.status === 200,
        result: this._snake(finalData),
        state: this._encSt(sess)
      };
    } catch (e) {
      this._log(`Query status failed: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["lyrics", "create", "status", "models"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          lyrics: "/?action=lyrics&prompt=Cute+lofi+chill",
          create_prompt: "/?action=create&prompt=Acoustic+summer+pop&model=ms-v2.0",
          create_custom: "/?action=create&lyrics=[Verse]...&title=My+Song&style=Acoustic+Pop",
          status: "/?action=status&task_id=YOUR_TASK_ID&state=YOUR_STATE_B64",
          models: "/?action=models"
        }
      }
    });
  }
  const api = new MusicSeed();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.lyrics(params);
        break;
      case "create":
        if (!params.prompt && !params.lyrics && !params.lyric) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'lyrics' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        if (!params.task_id && !params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' atau 'taskId' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
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
        error: response.result?.error || "Gagal memproses request internal API.",
        state: response.state || null
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
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}