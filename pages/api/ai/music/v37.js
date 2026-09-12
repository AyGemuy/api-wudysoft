import axios from "axios";
import * as cheerio from "cheerio";
import {
  createHmac,
  randomBytes
} from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class SongGPT {
  constructor() {
    this.jar = new CookieJar();
    this.axios = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4
    }));
    this.cfg = {
      base: "https://be.songgpt.com/api/v1",
      appUrl: "https://songgpt.com/api/appUrl",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://songgpt.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://songgpt.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      poll: {
        max: 60,
        delay: 3e3
      }
    };
  }
  sec() {
    try {
      const t = Date.now();
      const h = createHmac("sha256", "SONGGPT").update(`${t}-SONGGPT`).digest("hex");
      return JSON.stringify({
        hash: h,
        timestamp: t
      });
    } catch (e) {
      return null;
    }
  }
  gen() {
    try {
      const name = randomBytes(3).toString("hex");
      const c = "abcdefghijklmnopqrstuvwxyz";
      const u = c.toUpperCase();
      const n = "0123456789";
      const s = "@#$%&*!";
      let pass = c[Math.floor(Math.random() * c.length)] + u[Math.floor(Math.random() * u.length)] + n[Math.floor(Math.random() * n.length)] + s[Math.floor(Math.random() * s.length)];
      const all = c + u + n;
      for (let i = 0; i < 4; i++) pass += all[Math.floor(Math.random() * all.length)];
      pass = pass.split("").sort(() => Math.random() - .5).join("");
      return {
        name: name,
        pass: pass
      };
    } catch (e) {
      return {
        name: "User" + Math.floor(Math.random() * 1e3),
        pass: "Aa123456@"
      };
    }
  }
  async prsMed(source) {
    try {
      if (!source) return null;
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http://") || source.startsWith("https://")) {
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(source.replace(/^data:.+;base64,/, ""), "base64");
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  bldMp(flds = {}, files = []) {
    try {
      const bnd = "----WebKitFormBoundary" + randomBytes(16).toString("hex");
      const crlf = "\r\n";
      const chunks = [];
      for (const [k, v] of Object.entries(flds)) {
        if (v !== undefined && v !== null) {
          chunks.push(Buffer.from(`--${bnd}${crlf}Content-Disposition: form-data; name="${k}"${crlf}${crlf}${v}${crlf}`));
        }
      }
      for (const f of files) {
        if (f?.buffer) {
          chunks.push(Buffer.from(`--${bnd}${crlf}Content-Disposition: form-data; name="${f.name}"; filename="${f.filename || "file.bin"}"${crlf}Content-Type: ${f.type || "application/octet-stream"}${crlf}${crlf}`));
          chunks.push(f.buffer);
          chunks.push(Buffer.from(crlf));
        }
      }
      chunks.push(Buffer.from(`--${bnd}--${crlf}`));
      const body = Buffer.concat(chunks);
      return {
        body: body,
        contentType: `multipart/form-data; boundary=${bnd}`,
        contentLength: body.length
      };
    } catch (e) {
      return {
        body: Buffer.alloc(0),
        contentType: "",
        contentLength: 0
      };
    }
  }
  async appCfg({
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.axios.get(this.cfg.appUrl, {
        headers: {
          ...this.cfg.headers,
          ...rest.headers
        },
        ...rest
      });
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed?.backendUrl) this.cfg.base = parsed.backendUrl;
      return parsed;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async guest({
    ...rest
  } = {}) {
    try {
      const config = await this.appCfg(rest);
      return {
        status: true,
        email: config?.guestEmail || "",
        token: config?.guestToken || "",
        config: config || {}
      };
    } catch (e) {
      return {
        status: false,
        error: e?.message
      };
    }
  }
  async mail({
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.axios.get(`${this.cfg.mail}?action=create`, rest);
      return data?.email || null;
    } catch (e) {
      return null;
    }
  }
  async confirmEmailWeb({
    email,
    ...rest
  } = {}) {
    try {
      const sec = this.sec();
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/user/confirm_email_web`, {
        email: email,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          "x-security-code": sec
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getConfirmEmail({
    email,
    ...rest
  } = {}) {
    try {
      const sec = this.sec();
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/user/confirm_email`, {
        params: {
          email: email,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          "x-security-code": sec
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async sendVerificationOtp({
    email,
    ...rest
  } = {}) {
    try {
      await this.confirmEmailWeb({
        email: email
      });
      const sec = this.sec();
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/send_verification_otp`, {
        email: email,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          "x-security-code": sec
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async sendOtpForgotPassword({
    email,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/forgot-password`, {
        email: email,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json"
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async otp({
    email,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.axios.get(`${this.cfg.mail}?action=message&email=${encodeURIComponent(email)}`, rest);
      if (!data?.data?.length) return null;
      const html = data.data[0]?.html_content;
      if (!html) return null;
      const $ = cheerio.load(html);
      const code = $("h2").text().trim().toLowerCase();
      if (code && code.length === 6) return code;
      let divCode = null;
      $("div").each((_, el) => {
        const txt = $(el).text().trim().toLowerCase();
        if (txt.length === 6 && /^[a-f0-9]{6}$/.test(txt)) divCode = txt;
      });
      return divCode;
    } catch (e) {
      return null;
    }
  }
  async pollOtp({
    email,
    ...rest
  } = {}) {
    try {
      for (let i = 1; i <= this.cfg.poll.max; i++) {
        const code = await this.otp({
          email: email,
          ...rest
        });
        if (code) return code;
        await new Promise(r => setTimeout(r, this.cfg.poll.delay));
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async verifyEmailOtp({
    email,
    otp,
    ...rest
  } = {}) {
    try {
      const sec = this.sec();
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/verify_email_otp`, {
        email: email,
        otp: otp,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          "x-security-code": sec
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async register({
    email,
    password,
    name,
    artist = "AI Composer",
    referral_code = null,
    ...rest
  } = {}) {
    try {
      const sec = this.sec();
      const fields = {
        email: email,
        password: password,
        name: name,
        artist: artist,
        ...rest
      };
      if (referral_code) fields.referral_code = referral_code;
      const form = this.bldMp(fields);
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/register`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          "x-security-code": sec,
          "content-length": form.contentLength
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async login({
    email,
    username,
    password,
    ...rest
  } = {}) {
    try {
      const sec = this.sec();
      const form = this.bldMp({
        username: email || username,
        password: password,
        ...rest
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/login`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          "x-security-code": sec,
          "content-length": form.contentLength
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async handleGoogleCallback({
    email,
    name,
    profile_image = null,
    ...rest
  } = {}) {
    try {
      const form = this.bldMp({
        email: email,
        name: name,
        profile_image: profile_image,
        ...rest
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/login/google/mobile`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async resetPassword({
    email,
    otp,
    new_password,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/reset-password`, {
        email: email,
        otp: otp,
        new_password: new_password,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json"
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async changePassword({
    token,
    current_password,
    new_password,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/change-password`, {
        current_password: current_password,
        new_password: new_password,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getUserDetails({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/users/me`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updateUserDetails({
    token,
    name,
    artist,
    description,
    profile_image,
    cover_image,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const files = [];
      const pBuf = await this.prsMed(profile_image);
      if (pBuf) files.push({
        name: "profile_image_url",
        buffer: pBuf,
        filename: "profile.jpg",
        type: "image/jpeg"
      });
      const cBuf = await this.prsMed(cover_image);
      if (cBuf) files.push({
        name: "cover_image_url",
        buffer: cBuf,
        filename: "cover.jpg",
        type: "image/jpeg"
      });
      const form = this.bldMp({
        name: name,
        artist: artist,
        description: description,
        ...rest
      }, files);
      const {
        data
      } = await this.axios.put(`${this.cfg.base}/users/me`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getOnboardingInfo({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/users/get_onboarding_info`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updateOnboardingLanguage({
    token,
    language,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/users/update_onboarding_info`, {
        onboarding_language: language,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updateFCMToken({
    token,
    fcm_token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/update-fcm-token`, {
        fcm_token: fcm_token,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async autoClaim({
    token,
    voucherCode = null,
    userId = null,
    ...rest
  } = {}) {
    try {
      const result = {};
      if (voucherCode) {
        try {
          const {
            data
          } = await this.axios.post(`${this.cfg.base}/voucher/claim`, {
            voucher_code: voucherCode,
            ...rest
          }, {
            headers: {
              ...this.cfg.headers,
              authorization: `Bearer ${token}`
            }
          });
          result.voucher = data;
        } catch (e) {
          result.voucher = {
            error: e?.response?.data || e.message
          };
        }
      }
      if (userId) {
        try {
          const {
            data
          } = await this.axios.post(`${this.cfg.base}/reward`, null, {
            params: {
              user_id: userId,
              ...rest.params
            },
            headers: {
              ...this.cfg.headers,
              authorization: `Bearer ${token}`
            }
          });
          result.reward = data;
        } catch (e) {
          result.reward = {
            error: e?.response?.data || e.message
          };
        }
      }
      return result;
    } catch (e) {
      return {
        status: false,
        error: e.message
      };
    }
  }
  async ensure({
    token = null,
    useGuest = false,
    referralCode = null,
    autoClaimReward = true,
    ...rest
  } = {}) {
    try {
      if (token) return token;
      if (useGuest) {
        const g = await this.guest(rest);
        if (g?.token) return g.token;
      }
      for (let attempt = 1; attempt <= 5; attempt++) {
        const {
          name,
          pass
        } = this.gen();
        const email = await this.mail(rest);
        if (!email) continue;
        const sent = await this.sendVerificationOtp({
          email: email
        });
        if (!sent || sent.status === false) continue;
        const code = await this.pollOtp({
          email: email
        });
        if (!code) continue;
        const verified = await this.verifyEmailOtp({
          email: email,
          otp: code
        });
        if (!verified || verified.status === false) continue;
        const user = await this.register({
          email: email,
          password: pass,
          name: name,
          referral_code: referralCode
        });
        if (user?.id) {
          const loginRes = await this.login({
            email: email,
            password: pass
          });
          if (loginRes?.access_token) {
            if (autoClaimReward) {
              await this.autoClaim({
                token: loginRes.access_token,
                userId: user.id,
                voucherCode: referralCode
              });
            }
            return loginRes.access_token;
          }
        }
        await new Promise(r => setTimeout(r, 2e3));
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async generate({
    token,
    prompt,
    model = "suno",
    free_tier = "false",
    instrumental = "true",
    search = "true",
    use_guest = false,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token,
        useGuest: use_guest
      });
      if (!t) return {
        status: false,
        error: "Authentication token unavailable"
      };
      const formFields = {
        message: prompt,
        model: model,
        free_tier: free_tier,
        is_instrumental: instrumental,
        web_search: search,
        ...rest
      };
      const form = this.bldMp(formFields);
      const reqId = `req_${Date.now()}_${randomBytes(4).toString("hex")}`;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/liveAgent`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          accept: "text/event-stream",
          authorization: `Bearer ${t}`,
          "x-request-id": reqId,
          "content-length": form.contentLength
        },
        responseType: "text"
      });
      const lines = data.split("\n").filter(l => l.startsWith("data:"));
      const last = lines[lines.length - 1]?.replace("data:", "").trim();
      const json = last ? JSON.parse(last) : {};
      return {
        status: true,
        result: {
          task_id: json?.song_generation_task?.task_id,
          session_id: json?.session_id
        },
        token: t,
        info: json
      };
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async checkSongStatusWithAgent({
    token,
    session_id,
    task_id = null,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const sec = this.sec();
      let url = `${this.cfg.base}/callAgent/song-status/${session_id}`;
      if (task_id) url += `?task_id=${task_id}`;
      const {
        data
      } = await this.axios.get(url, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`,
          "x-security-code": sec
        },
        ...rest
      });
      return {
        status: true,
        result: data?.response?.songs || data?.songs || data,
        token: t,
        raw: data
      };
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getSessions({
    token,
    page = 1,
    limit = 80,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/sessions`, {
        params: {
          page: page,
          limit: limit,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data?.sessions || data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async deleteSession({
    token,
    session_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/sessions`, {
        data: {
          session_id: session_id,
          ...rest
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getConversationHistory({
    token,
    session_id,
    skip = 0,
    limit = 400,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/conversations`, {
        session_id: session_id,
        skip: skip,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getNewSongs({
    token,
    page = 1,
    limit = 100,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/latest`, {
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getFeaturedSongs({
    token,
    page = 1,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/featured`, {
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getTrendingSongs({
    token,
    duration = "week",
    page = 1,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/most-played`, {
        page: page,
        limit: limit,
        duration: duration,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getUserSongs({
    token,
    email,
    page = 1,
    limit = 40,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/list`, {
        email: email,
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getSongById({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/id`, {
        song_id: String(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async searchSongs({
    token,
    query,
    q,
    page = 1,
    limit = 100,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/search`, {
        q: query || q,
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async mySearchSongs({
    token,
    query,
    q,
    page = 1,
    limit = 100,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/my_songs/search`, {
        q: query || q,
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getLikedSongs({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/songs/liked`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data?.songs || data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updateLikeCount({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/like`, {
        song_id: Number(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async unlikeSong({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/songs/like`, {
        data: {
          song_id: Number(song_id),
          ...rest
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updatePlayCount({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/play`, {
        song_id: Number(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updateShareCount({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/share`, {
        song_id: Number(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getSongShare({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/share-link`, {
        song_id: Number(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async toggleSongVisibility({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/toggle-visibility`, {
        song_id: Number(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async editSong({
    token,
    song_id,
    title,
    cover_image = null,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const files = [];
      const coverBuf = await this.prsMed(cover_image);
      if (coverBuf) files.push({
        name: "cover_image_url",
        buffer: coverBuf,
        filename: "cover.jpg",
        type: "image/jpeg"
      });
      const form = this.bldMp({
        song_id: String(song_id),
        title: title,
        ...rest
      }, files);
      const {
        data
      } = await this.axios.put(`${this.cfg.base}/songs/id`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async deleteSong({
    token,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/songs/id`, {
        data: {
          song_id: Number(song_id),
          ...rest
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getGenres({
    token,
    page = 1,
    limit = 100,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/songs/genres`, {
        params: {
          page: page,
          limit: limit,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getSongsByGenre({
    token,
    genre,
    offset = 0,
    limit = 100,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/genres/genre`, {
        genre: genre,
        offset: offset,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getTopArtists({
    token,
    page = 1,
    limit = 100,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/top-artists`, {
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getArtistSongs({
    token,
    artist_id,
    id,
    skip = 0,
    limit = 40,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/artist/id`, {
        id: artist_id || id,
        skip: skip,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getPlaylists({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/playlists`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data?.playlists || data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getPlaylistSongs({
    token,
    playlist_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/playlists/id`, {
        playlist_id: Number(playlist_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async createPlaylist({
    token,
    name,
    cover_image = null,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const files = [];
      const coverBuf = await this.prsMed(cover_image);
      if (coverBuf) files.push({
        name: "cover_image",
        buffer: coverBuf,
        filename: "cover.jpg",
        type: "image/jpeg"
      });
      const form = this.bldMp({
        name: name,
        ...rest
      }, files);
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/playlists`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updatePlaylist({
    token,
    playlist_id,
    name,
    cover_image = null,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const files = [];
      const coverBuf = await this.prsMed(cover_image);
      if (coverBuf) files.push({
        name: "cover_image",
        buffer: coverBuf,
        filename: "cover.jpg",
        type: "image/jpeg"
      });
      const form = this.bldMp({
        playlist_id: String(playlist_id),
        name: name,
        ...rest
      }, files);
      const {
        data
      } = await this.axios.put(`${this.cfg.base}/playlists/id`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async deletePlaylist({
    token,
    playlist_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/playlists/id`, {
        data: {
          playlist_id: Number(playlist_id),
          ...rest
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async addSongToPlaylist({
    token,
    playlist_id,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/playlists/song/id`, {
        playlist_id: Number(playlist_id),
        song_id: Number(song_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async removeSongFromPlaylist({
    token,
    playlist_id,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/playlists/song/id`, {
        data: {
          playlist_id: Number(playlist_id),
          song_id: Number(song_id),
          ...rest
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getTrendingPlaylists({
    token,
    duration = "week",
    page = 1,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/playlists/trending`, {
        duration: duration,
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async togglePlaylistVisibility({
    token,
    playlist_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/playlists/toggle-visibility`, {
        playlist_id: Number(playlist_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getPlaylistShareLink({
    token,
    playlist_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/playlists/share-link`, {
        playlist_id: Number(playlist_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return {
        status: true,
        share_link: `https://songgpt.com/playlistShare/${data?.share_link}`,
        raw: data
      };
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getComments({
    token,
    song_id,
    page = 1,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/songs/${song_id}/comments`, {
        params: {
          page: page,
          limit: limit,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async addComment({
    token,
    song_id,
    content,
    parent_id = null,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/songs/${song_id}/comments`, {
        content: content,
        parent_id: parent_id,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async updateComment({
    token,
    comment_id,
    content,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.put(`${this.cfg.base}/comments/${comment_id}`, {
        content: content,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async deleteComment({
    token,
    comment_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/comments/${comment_id}`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async toggleCommentLike({
    token,
    comment_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/comments/${comment_id}/like`, null, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async followUser({
    token,
    user_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/follows/${user_id}`, null, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async unfollowUser({
    token,
    user_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.delete(`${this.cfg.base}/follows/${user_id}`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getFollowingList({
    token,
    user_id,
    page = 1,
    page_size = 40,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/follows/${user_id}/following`, {
        params: {
          page: page,
          page_size: page_size,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data?.following || data?.users || [];
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getFollowersList({
    token,
    user_id,
    page = 1,
    page_size = 40,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/follows/${user_id}/followers`, {
        params: {
          page: page,
          page_size: page_size,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data?.followers || data?.users || [];
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getFollowersAndFollowingStats({
    token,
    user_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/follows/${user_id}/stats`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getFollowerAndFollowingStatus({
    token,
    user_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/follows/${user_id}/status`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getAllStems({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/stems`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getStemStatus({
    token,
    stem_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/stems/${stem_id}`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async separateStems({
    token,
    name = "Stem Track",
    audio_url,
    audio,
    song_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const files = [];
      if (audio_url || audio) {
        const buffer = await this.prsMed(audio_url || audio);
        if (buffer) files.push({
          name: "audio",
          buffer: buffer,
          filename: "track.mp3",
          type: "audio/mpeg"
        });
      }
      const fields = {
        name: name,
        ...rest
      };
      if (song_id) fields.song_id = String(song_id);
      const form = this.bldMp(fields, files);
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/stems/separate`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async generateCoverSongReference({
    token,
    title = "Reference",
    genre = "pop",
    mood = "happy",
    audio_url,
    audio,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const buffer = await this.prsMed(audio_url || audio);
      if (!buffer) return {
        status: false,
        error: "Audio source is required"
      };
      const files = [{
        name: "song_file",
        buffer: buffer,
        filename: "reference.mp3",
        type: "audio/mpeg"
      }];
      const form = this.bldMp({
        title: title,
        genre: genre,
        mood: mood,
        ...rest
      }, files);
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/audio-cloning`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async createCoverSong({
    token,
    title = "Cover",
    lyrics,
    genre = "pop",
    ref_id,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/audio-cloning/create-cover-song`, {
        title: title,
        lyrics: lyrics || "...",
        genre: genre,
        ref_id: Number(ref_id),
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getClonedSongs({
    token,
    email,
    page = 1,
    limit = 40,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/cloned-songs/list`, {
        email: email,
        page: page,
        limit: limit,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async generateVideo({
    token,
    audio_url,
    image_url,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const form = this.bldMp({
        audio_url: audio_url,
        image_url: image_url,
        ...rest
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/video/generate-video`, form.body, {
        headers: {
          ...this.cfg.headers,
          "content-type": form.contentType,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getDeepgramApiKey({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/api-keys/deepgram`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getUserCredits({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/subscriptions/credits/balance`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getActiveSubscription({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/subscriptions/status`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getSubscriptionCreditHistory({
    token,
    skip = 0,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/subscriptions/credit_transactions/history`, {
        params: {
          skip: skip,
          limit: limit,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getSubscriptionHistoryNew({
    token,
    skip = 0,
    limit = 20,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/subscriptions/history_new`, {
        params: {
          skip: skip,
          limit: limit,
          ...rest.params
        },
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async cancelSubscription({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/subscriptions/cancel`, rest, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async notifySubscriptionCancellation({
    token,
    email,
    plan_type,
    reason,
    additional_features,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/subscription/notify`, {
        email: email,
        plan_type: plan_type,
        reason: reason,
        additional_features: additional_features,
        ...rest
      }, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        }
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async getReferralCode({
    token,
    ...rest
  } = {}) {
    try {
      const t = await this.ensure({
        token: token
      });
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/referral/code`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`
        },
        ...rest
      });
      return data;
    } catch (e) {
      return {
        status: false,
        error: e?.response?.data || e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    token,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["app_config", "guest_info", "confirm_email_web", "confirm_email", "send_verification_otp", "send_forgot_otp", "verify_email_otp", "register", "login", "google_login", "reset_password", "change_password", "get_profile", "update_profile", "onboarding_info", "update_onboarding_lang", "update_fcm_token", "generate", "status", "sessions", "delete_session", "conversations", "latest_songs", "featured_songs", "trending_songs", "user_songs", "song_details", "search_songs", "my_search_songs", "liked_songs", "like_song", "unlike_song", "play_song", "share_song", "get_song_share", "toggle_song_visibility", "edit_song", "delete_song", "genres", "songs_by_genre", "top_artists", "artist_songs", "playlists", "playlist_details", "create_playlist", "update_playlist", "delete_playlist", "add_playlist_song", "remove_playlist_song", "trending_playlists", "toggle_playlist_visibility", "playlist_share_link", "comments", "add_comment", "update_comment", "delete_comment", "toggle_comment_like", "follow", "unfollow", "following", "followers", "follow_stats", "follow_status", "all_stems", "stem_status", "separate_stems", "clone_ref", "create_cover", "cloned_songs", "generate_video", "deepgram_key", "credits", "active_subscription", "credit_history", "subscription_history", "cancel_subscription", "notify_cancellation", "claim_voucher", "claim_reward", "referral_code"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' is required",
      valid_actions: validActions
    });
  }
  const api = new SongGPT();
  const requireParams = requiredList => {
    const missing = requiredList.filter(k => params[k] === undefined || params[k] === null || params[k] === "");
    if (missing.length > 0) {
      res.status(400).json({
        status: false,
        error: `Parameter berikut wajib diisi: ${missing.join(", ")}`
      });
      return false;
    }
    return true;
  };
  try {
    let result;
    switch (action) {
      case "app_config":
        result = await api.appCfg(params);
        break;
      case "guest_info":
        result = await api.guest(params);
        break;
      case "confirm_email_web":
        if (!requireParams(["email"])) return;
        result = await api.confirmEmailWeb(params);
        break;
      case "confirm_email":
        if (!requireParams(["email"])) return;
        result = await api.getConfirmEmail(params);
        break;
      case "send_verification_otp":
        if (!requireParams(["email"])) return;
        result = await api.sendVerificationOtp(params);
        break;
      case "send_forgot_otp":
        if (!requireParams(["email"])) return;
        result = await api.sendOtpForgotPassword(params);
        break;
      case "verify_email_otp":
        if (!requireParams(["email", "otp"])) return;
        result = await api.verifyEmailOtp(params);
        break;
      case "register":
        if (!requireParams(["email", "password", "name"])) return;
        result = await api.register(params);
        break;
      case "login":
        if (!params.email && !params.username) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'email' atau 'username' wajib diisi"
          });
        }
        if (!requireParams(["password"])) return;
        result = await api.login(params);
        break;
      case "google_login":
        if (!requireParams(["email", "name"])) return;
        result = await api.handleGoogleCallback(params);
        break;
      case "reset_password":
        if (!requireParams(["email", "otp", "new_password"])) return;
        result = await api.resetPassword(params);
        break;
      case "change_password":
        if (!requireParams(["current_password", "new_password"])) return;
        result = await api.changePassword({
          token: token,
          ...params
        });
        break;
      case "get_profile":
        result = await api.getUserDetails({
          token: token,
          ...params
        });
        break;
      case "update_profile":
        if (!params.name && !params.artist && !params.description && !params.profile_image && !params.cover_image) {
          return res.status(400).json({
            status: false,
            error: "Setidaknya salah satu field profil wajib diisi untuk update"
          });
        }
        result = await api.updateUserDetails({
          token: token,
          ...params
        });
        break;
      case "onboarding_info":
        result = await api.getOnboardingInfo({
          token: token,
          ...params
        });
        break;
      case "update_onboarding_lang":
        if (!requireParams(["language"])) return;
        result = await api.updateOnboardingLanguage({
          token: token,
          ...params
        });
        break;
      case "update_fcm_token":
        if (!requireParams(["fcm_token"])) return;
        result = await api.updateFCMToken({
          token: token,
          ...params
        });
        break;
      case "generate":
        if (!requireParams(["prompt"])) return;
        result = await api.generate({
          token: token,
          ...params
        });
        break;
      case "status":
        if (!requireParams(["session_id"])) return;
        result = await api.checkSongStatusWithAgent({
          token: token,
          ...params
        });
        break;
      case "sessions":
        result = await api.getSessions({
          token: token,
          ...params
        });
        break;
      case "delete_session":
        if (!requireParams(["session_id"])) return;
        result = await api.deleteSession({
          token: token,
          ...params
        });
        break;
      case "conversations":
        if (!requireParams(["session_id"])) return;
        result = await api.getConversationHistory({
          token: token,
          ...params
        });
        break;
      case "latest_songs":
        result = await api.getNewSongs({
          token: token,
          ...params
        });
        break;
      case "featured_songs":
        result = await api.getFeaturedSongs({
          token: token,
          ...params
        });
        break;
      case "trending_songs":
        result = await api.getTrendingSongs({
          token: token,
          ...params
        });
        break;
      case "user_songs":
        result = await api.getUserSongs({
          token: token,
          ...params
        });
        break;
      case "song_details":
        if (!requireParams(["song_id"])) return;
        result = await api.getSongById({
          token: token,
          ...params
        });
        break;
      case "search_songs":
        if (!params.query && !params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 'q' wajib diisi"
          });
        }
        result = await api.searchSongs({
          token: token,
          ...params
        });
        break;
      case "my_search_songs":
        if (!params.query && !params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 'q' wajib diisi"
          });
        }
        result = await api.mySearchSongs({
          token: token,
          ...params
        });
        break;
      case "liked_songs":
        result = await api.getLikedSongs({
          token: token,
          ...params
        });
        break;
      case "like_song":
        if (!requireParams(["song_id"])) return;
        result = await api.updateLikeCount({
          token: token,
          ...params
        });
        break;
      case "unlike_song":
        if (!requireParams(["song_id"])) return;
        result = await api.unlikeSong({
          token: token,
          ...params
        });
        break;
      case "play_song":
        if (!requireParams(["song_id"])) return;
        result = await api.updatePlayCount({
          token: token,
          ...params
        });
        break;
      case "share_song":
        if (!requireParams(["song_id"])) return;
        result = await api.updateShareCount({
          token: token,
          ...params
        });
        break;
      case "get_song_share":
        if (!requireParams(["song_id"])) return;
        result = await api.getSongShare({
          token: token,
          ...params
        });
        break;
      case "toggle_song_visibility":
        if (!requireParams(["song_id"])) return;
        result = await api.toggleSongVisibility({
          token: token,
          ...params
        });
        break;
      case "edit_song":
        if (!requireParams(["song_id", "title"])) return;
        result = await api.editSong({
          token: token,
          ...params
        });
        break;
      case "delete_song":
        if (!requireParams(["song_id"])) return;
        result = await api.deleteSong({
          token: token,
          ...params
        });
        break;
      case "genres":
        result = await api.getGenres({
          token: token,
          ...params
        });
        break;
      case "songs_by_genre":
        if (!requireParams(["genre"])) return;
        result = await api.getSongsByGenre({
          token: token,
          ...params
        });
        break;
      case "top_artists":
        result = await api.getTopArtists({
          token: token,
          ...params
        });
        break;
      case "artist_songs":
        if (!params.artist_id && !params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'artist_id' atau 'id' wajib diisi"
          });
        }
        result = await api.getArtistSongs({
          token: token,
          ...params
        });
        break;
      case "playlists":
        result = await api.getPlaylists({
          token: token,
          ...params
        });
        break;
      case "playlist_details":
        if (!requireParams(["playlist_id"])) return;
        result = await api.getPlaylistSongs({
          token: token,
          ...params
        });
        break;
      case "create_playlist":
        if (!requireParams(["name"])) return;
        result = await api.createPlaylist({
          token: token,
          ...params
        });
        break;
      case "update_playlist":
        if (!requireParams(["playlist_id", "name"])) return;
        result = await api.updatePlaylist({
          token: token,
          ...params
        });
        break;
      case "delete_playlist":
        if (!requireParams(["playlist_id"])) return;
        result = await api.deletePlaylist({
          token: token,
          ...params
        });
        break;
      case "add_playlist_song":
        if (!requireParams(["playlist_id", "song_id"])) return;
        result = await api.addSongToPlaylist({
          token: token,
          ...params
        });
        break;
      case "remove_playlist_song":
        if (!requireParams(["playlist_id", "song_id"])) return;
        result = await api.removeSongFromPlaylist({
          token: token,
          ...params
        });
        break;
      case "trending_playlists":
        result = await api.getTrendingPlaylists({
          token: token,
          ...params
        });
        break;
      case "toggle_playlist_visibility":
        if (!requireParams(["playlist_id"])) return;
        result = await api.togglePlaylistVisibility({
          token: token,
          ...params
        });
        break;
      case "playlist_share_link":
        if (!requireParams(["playlist_id"])) return;
        result = await api.getPlaylistShareLink({
          token: token,
          ...params
        });
        break;
      case "comments":
        if (!requireParams(["song_id"])) return;
        result = await api.getComments({
          token: token,
          ...params
        });
        break;
      case "add_comment":
        if (!requireParams(["song_id", "content"])) return;
        result = await api.addComment({
          token: token,
          ...params
        });
        break;
      case "update_comment":
        if (!requireParams(["comment_id", "content"])) return;
        result = await api.updateComment({
          token: token,
          ...params
        });
        break;
      case "delete_comment":
        if (!requireParams(["comment_id"])) return;
        result = await api.deleteComment({
          token: token,
          ...params
        });
        break;
      case "toggle_comment_like":
        if (!requireParams(["comment_id"])) return;
        result = await api.toggleCommentLike({
          token: token,
          ...params
        });
        break;
      case "follow":
        if (!requireParams(["user_id"])) return;
        result = await api.followUser({
          token: token,
          ...params
        });
        break;
      case "unfollow":
        if (!requireParams(["user_id"])) return;
        result = await api.unfollowUser({
          token: token,
          ...params
        });
        break;
      case "following":
        if (!requireParams(["user_id"])) return;
        result = await api.getFollowingList({
          token: token,
          ...params
        });
        break;
      case "followers":
        if (!requireParams(["user_id"])) return;
        result = await api.getFollowersList({
          token: token,
          ...params
        });
        break;
      case "follow_stats":
        if (!requireParams(["user_id"])) return;
        result = await api.getFollowersAndFollowingStats({
          token: token,
          ...params
        });
        break;
      case "follow_status":
        if (!requireParams(["user_id"])) return;
        result = await api.getFollowerAndFollowingStatus({
          token: token,
          ...params
        });
        break;
      case "all_stems":
        result = await api.getAllStems({
          token: token,
          ...params
        });
        break;
      case "stem_status":
        if (!requireParams(["stem_id"])) return;
        result = await api.getStemStatus({
          token: token,
          ...params
        });
        break;
      case "separate_stems":
        if (!params.audio_url && !params.audio && !params.song_id) {
          return res.status(400).json({
            status: false,
            error: "Setidaknya salah satu parameter 'audio_url', 'audio', atau 'song_id' wajib diisi"
          });
        }
        result = await api.separateStems({
          token: token,
          ...params
        });
        break;
      case "clone_ref":
        if (!params.audio_url && !params.audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio_url' atau 'audio' wajib diisi"
          });
        }
        result = await api.generateCoverSongReference({
          token: token,
          ...params
        });
        break;
      case "create_cover":
        if (!requireParams(["ref_id"])) return;
        result = await api.createCoverSong({
          token: token,
          ...params
        });
        break;
      case "cloned_songs":
        result = await api.getClonedSongs({
          token: token,
          ...params
        });
        break;
      case "generate_video":
        if (!requireParams(["audio_url", "image_url"])) return;
        result = await api.generateVideo({
          token: token,
          ...params
        });
        break;
      case "deepgram_key":
        result = await api.getDeepgramApiKey({
          token: token,
          ...params
        });
        break;
      case "credits":
        result = await api.getUserCredits({
          token: token,
          ...params
        });
        break;
      case "active_subscription":
        result = await api.getActiveSubscription({
          token: token,
          ...params
        });
        break;
      case "credit_history":
        result = await api.getSubscriptionCreditHistory({
          token: token,
          ...params
        });
        break;
      case "subscription_history":
        result = await api.getSubscriptionHistoryNew({
          token: token,
          ...params
        });
        break;
      case "cancel_subscription":
        result = await api.cancelSubscription({
          token: token,
          ...params
        });
        break;
      case "notify_cancellation":
        if (!requireParams(["email", "plan_type", "reason"])) return;
        result = await api.notifySubscriptionCancellation({
          token: token,
          ...params
        });
        break;
      case "claim_voucher":
        if (!requireParams(["voucher_code"])) return;
        const vToken = await api.ensure({
          token: token
        });
        result = await api.autoClaim({
          token: vToken,
          voucherCode: params.voucher_code,
          ...params
        });
        break;
      case "claim_reward":
        if (!requireParams(["user_id"])) return;
        const rToken = await api.ensure({
          token: token
        });
        result = await api.autoClaim({
          token: rToken,
          userId: params.user_id,
          ...params
        });
        break;
      case "referral_code":
        result = await api.getReferralCode({
          token: token,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action '${action}' is not supported`,
          valid_actions: validActions
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({
      status: false,
      error: e?.response?.data || e?.message || "Internal Server Error"
    });
  }
}