import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class MuvAi {
  constructor() {
    this.apiBase = "https://api.muvai.ai/app-api";
    this.fbKey = "AIzaSyAbzLLY7wVjcNmrRIBjEdC5pg2jVeBT_vU";
    this.appVersion = "1.1.3";
    this.tenantId = "1";
    this.requestSource = "2";
    this.rsaPubKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA04YdT1uHLZA0B+gLzsAH
wWEJRgiXDVYvpZcJtpF7Gh1DvUNayYhHzlkNnluY3315WoQvexBG290/WcFPBk54
dgaM1uTtwGqsEzv9sprgtJMSZWIDt8F1ZxypVIYLcJRSJtMUn/Mg0M+C4faxiJQI
mADrPNjRvMIP4T0wlJruLyL2IGX2aGHw4qm34zFT307wgTBjKtxflRbNXTWKyc0+
b7LPHK1l6kS8igf0MGCuev2kzEI/F42HW/5hRmqMQupibXSUErLysNrrvHWVNjwP
GQW9TU0b0va//ZU+Xu5CF3j1FqwguRjUxlNA/NI21VUFOHP64bMnSHT+BDeiLx+H
bwIDAQAB
-----END PUBLIC KEY-----`;
    this.fbHeaders = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "X-Android-Package": "ai.mv.music.video.vibeat",
      "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      "Accept-Language": "id-ID, en-US",
      "X-Client-Version": "Android/Fallback/X23002001/FirebaseCore-Android",
      "X-Firebase-GMPID": "1:731148747587:android:b62127003ed3121c19e5f6",
      "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
    };
    this.modelsList = [{
      id: "chirp-v4-5+",
      name: "Chirp v4.5 Plus",
      description: "Classical crossover, pop, and nuanced orchestration",
      default: true
    }, {
      id: "chirp-v5",
      name: "Chirp v5.0",
      description: "Latest generation model with high quality lyric alignment"
    }, {
      id: "chirp-v4-5",
      name: "Chirp v4.5",
      description: "Balanced quality model"
    }, {
      id: "chirp-v4",
      name: "Chirp v4.0",
      description: "Standard model"
    }];
    this.http = axios.create({
      timeout: 45e3,
      validateStatus: () => true
    });
  }
  _log(m) {
    try {
      console.log(`[MuvAi] ${m}`);
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
  _encryptUid(uidStr) {
    try {
      const buffer = Buffer.from(String(uidStr).trim(), "utf8");
      const encrypted = crypto.publicEncrypt({
        key: this.rsaPubKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, buffer);
      return encrypted.toString("base64");
    } catch (e) {
      this._log(`RSA encrypt error: ${e.message}`);
      return String(uidStr);
    }
  }
  _muvHds(token = "", extra = {}) {
    try {
      const headers = {
        "User-Agent": "Dart/3.12 (dart:io)",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        language: "id-id",
        "accept-language": "id-id",
        "tenant-id": this.tenantId,
        "app-version": this.appVersion,
        "request-source": this.requestSource,
        ...extra
      };
      if (token) {
        headers["authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
      }
      return headers;
    } catch {
      return extra || {};
    }
  }
  async _uploadFile(sess, fileInput, category = "image") {
    try {
      if (!fileInput) return null;
      if (typeof fileInput === "string" && fileInput.includes("cdn.muvai.ai")) {
        return fileInput;
      }
      this._log(`Uploading ${category} to MuvAi CDN...`);
      const form = new FormData();
      form.append("category", category);
      form.append("directory", "muvAi");
      const defaultExt = category === "audio" ? "mp3" : "webp";
      const defaultMime = category === "audio" ? "audio/mpeg" : "image/webp";
      const fileName = `upload_${Date.now()}.${defaultExt}`;
      if (Buffer.isBuffer(fileInput)) {
        form.append("file", fileInput, {
          filename: fileName,
          contentType: defaultMime
        });
      } else if (typeof fileInput === "string" && /^https?:\/\//i.test(fileInput)) {
        const downloadRes = await axios.get(fileInput, {
          responseType: "arraybuffer",
          timeout: 3e4
        });
        const contentType = downloadRes.headers["content-type"] || defaultMime;
        form.append("file", Buffer.from(downloadRes.data), {
          filename: fileName,
          contentType: contentType
        });
      } else if (typeof fileInput === "string" && fileInput.startsWith("data:")) {
        const base64Data = fileInput.replace(/^data:[^;]+;base64,/, "");
        form.append("file", Buffer.from(base64Data, "base64"), {
          filename: fileName,
          contentType: defaultMime
        });
      } else if (typeof fileInput === "string") {
        form.append("file", Buffer.from(fileInput, "base64"), {
          filename: fileName,
          contentType: defaultMime
        });
      } else {
        throw new Error(`Unsupported input format for ${category}`);
      }
      const res = await this.http.post(`${this.apiBase}/infra/file/upload`, form, {
        headers: this._muvHds(sess.token, form.getHeaders())
      });
      if (res.data?.code === 0 && res.data?.data) {
        this._log(`Uploaded ${category} successfully: ${res.data.data}`);
        return res.data.data;
      } else {
        throw new Error(res.data?.msg || `Failed to upload ${category}`);
      }
    } catch (e) {
      this._log(`Upload error for ${category}: ${e.message}`);
      throw e;
    }
  }
  async _genAcc() {
    try {
      this._log("Creating temp mail via v41...");
      const {
        data: createData
      } = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v41?action=create`);
      const email = createData?.result?.address;
      const mailState = createData?.state;
      const password = "Pass123!Secure";
      if (!email || !mailState) throw new Error("Failed to create mail with v41");
      this._log(`[Firebase] Signing up with ${email}...`);
      const suRes = await this.http.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.fbKey}`, {
        email: email,
        password: password,
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: this.fbHeaders
      });
      const suData = suRes?.data || {};
      const idToken = suData?.idToken;
      const localId = suData?.localId;
      if (!idToken || !localId) throw new Error(suData?.error?.message || "Firebase sign up failed");
      await this.http.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${this.fbKey}`, {
        idToken: idToken
      }, {
        headers: this.fbHeaders
      });
      this._log("[Firebase] Requesting OOB verification code...");
      await this.http.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=${this.fbKey}`, {
        requestType: 4,
        idToken: idToken,
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: this.fbHeaders
      });
      this._log("[Mail v41] Polling inbox for verification code...");
      let oobCode = null;
      let verifyUrl = null;
      for (let i = 0; i < 30; i++) {
        await this._slp(3e3);
        const {
          data: msgRes
        } = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v41?action=message&state=${encodeURIComponent(mailState)}`);
        const emails = msgRes?.result?.emails || msgRes?.result?.messages || [];
        const mail = emails[0];
        if (mail) {
          const text = `${mail?.detail?.text || ""} ${mail?.detail?.html?.join(" ") || ""} ${mail?.text_preview || ""}`;
          const matchUrl = text.match(/https?:\/\/[^\s"'>]+mode=verifyEmail[^\s"'>]+/i) || text.match(/https?:\/\/[^\s"'>]+oobCode=[^\s"'>]+/i);
          if (matchUrl?.[0]) verifyUrl = matchUrl[0].replace(/&amp;/g, "&");
          const matchCode = text.match(/oobCode=([a-zA-Z0-9_-]+)/i);
          if (matchCode?.[1]) {
            oobCode = matchCode[1];
            break;
          }
        }
      }
      if (!oobCode) throw new Error("Failed to receive OOB Code from email");
      if (verifyUrl) {
        try {
          await this.http.get(verifyUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
          });
        } catch {}
      }
      this._log("[Firebase] Confirming setAccountInfo with OOB code...");
      await this.http.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo?key=${this.fbKey}`, {
        oobCode: oobCode
      }, {
        headers: {
          "Content-Type": "application/json",
          origin: "https://vibeat-mv.firebaseapp.com",
          referer: "https://vibeat-mv.firebaseapp.com/",
          "x-client-version": "Chrome/JsCore/3.7.5/FirebaseCore-web",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      this._log("[Firebase] Getting verified account info...");
      const accRes = await this.http.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${this.fbKey}`, {
        idToken: idToken
      }, {
        headers: this.fbHeaders
      });
      const verifiedUid = accRes?.data?.users?.[0]?.localId || localId;
      await this._slp(1e3);
      this._log("[MuvAi] Encrypting UID & Executing loginReg...");
      const encryptedUid = this._encryptUid(verifiedUid);
      const logRes = await this.http.post(`${this.apiBase}/member/auth/loginReg`, {
        email: email,
        uid: encryptedUid,
        userType: "email"
      }, {
        headers: this._muvHds("", {
          "Content-Type": "application/json"
        })
      });
      const logData = logRes?.data;
      const accessToken = logData?.data?.accessToken;
      if (!accessToken) {
        throw new Error(logData?.msg || "Failed to retrieve access token from MuvAi");
      }
      this._log("[MuvAi] Fetching account profile & points...");
      const {
        data: userRes
      } = await this.http.get(`${this.apiBase}/member/user/get`, {
        headers: this._muvHds(accessToken)
      });
      const userData = userRes?.data || {};
      this._log(`[MuvAi] Session ready! Points: ${userData?.point ?? 0}, Nickname: ${userData?.nickname || "-"}`);
      return {
        email: email,
        user_id: userData?.id || logData?.data?.userId,
        point: userData?.point ?? 10,
        token: accessToken,
        refresh_token: logData?.data?.refreshToken
      };
    } catch (e) {
      this._log(`Account creation error: ${e.message}`);
      return null;
    }
  }
  async _getSess(st) {
    try {
      let parsed = this._decSt(st);
      if (typeof st === "string" && !parsed && st.length > 20) {
        parsed = {
          token: st
        };
      }
      if (parsed?.token) {
        const {
          data: uData
        } = await this.http.get(`${this.apiBase}/member/user/get`, {
          headers: this._muvHds(parsed.token)
        });
        if (uData?.code === 0 && uData?.data) {
          parsed.point = uData.data.point;
          parsed.nickname = uData.data.nickname;
          if (parsed.point <= 0) {
            this._log("[MuvAi] Points exhausted (0). Auto-generating fresh session...");
            parsed = await this._genAcc();
          }
          return parsed;
        }
      }
      parsed = await this._genAcc();
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
          models: this.modelsList,
          default_model: "chirp-v4-5+"
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
  async user({
    state,
    ...rest
  } = {}) {
    let sess = null;
    try {
      sess = await this._getSess(state || rest?.token);
      if (!sess?.token) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const res = await this.http.get(`${this.apiBase}/member/user/get`, {
        headers: this._muvHds(sess.token)
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake(body?.data || {
          msg: body?.msg
        }),
        state: this._encSt(sess)
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async randomPrompt({
    state,
    ...rest
  } = {}) {
    try {
      const res = await this.http.get(`${this.apiBase}/member/music/app/simple-random-prompt`, {
        headers: this._muvHds()
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake(body?.data || {}),
        state: state || null
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: state || null
      };
    }
  }
  async randomLyric({
    state,
    ...rest
  } = {}) {
    let sess = null;
    try {
      sess = await this._getSess(state || rest?.token);
      const res = await this.http.get(`${this.apiBase}/member/music/app/simple-random-lyric`, {
        headers: this._muvHds(sess?.token)
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake(body?.data || {}),
        state: sess ? this._encSt(sess) : state || null
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async genres({
    state,
    ...rest
  } = {}) {
    let sess = null;
    try {
      sess = await this._getSess(state || rest?.token);
      const res = await this.http.get(`${this.apiBase}/member/mv-generate/music-genres`, {
        headers: this._muvHds(sess?.token)
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake(body?.data || {}),
        state: sess ? this._encSt(sess) : state || null
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async randomRemark({
    state,
    ...rest
  } = {}) {
    let sess = null;
    try {
      sess = await this._getSess(state || rest?.token);
      const res = await this.http.get(`${this.apiBase}/member/mv-generate/random-rec-remark`, {
        headers: this._muvHds(sess?.token)
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake(body?.data || {}),
        state: sess ? this._encSt(sess) : state || null
      };
    } catch (e) {
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
    lyric,
    title,
    tags,
    model,
    instrumental,
    ...rest
  } = {}) {
    let sess = null;
    try {
      this._log("Creating music task...");
      sess = await this._getSess(state || rest?.token);
      if (!sess?.token) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const songLyric = lyrics || lyric || "";
      const isCustom = Boolean(songLyric);
      const selectedModel = model || (isCustom ? "chirp-v5" : "chirp-v4-5+");
      const payload = {
        inputType: isCustom ? 20 : 10,
        makeInstrumental: instrumental ?? (!songLyric && !prompt),
        mvVersion: selectedModel,
        gptDescriptionPrompt: isCustom ? "" : prompt || "",
        prompt: songLyric,
        title: title || "",
        tags: tags || ""
      };
      const res = await this.http.post(`${this.apiBase}/member/music/app/submit`, payload, {
        headers: this._muvHds(sess.token, {
          "Content-Type": "application/json"
        })
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake({
          code: body?.code,
          msg: body?.msg,
          model_used: selectedModel,
          input_type: payload.inputType,
          point_remaining: sess?.point ?? null,
          ...body?.data
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
    music_id,
    batch_group_id,
    page_no = 1,
    page_size = 20,
    ...rest
  } = {}) {
    let sess = null;
    try {
      this._log("Querying song status...");
      sess = await this._getSess(state || rest?.token);
      if (!sess?.token) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const res = await this.http.get(`${this.apiBase}/member/music/app/my-page?pageNo=${page_no}&pageSize=${page_size}`, {
        headers: this._muvHds(sess.token)
      });
      const body = res?.data || {};
      const list = body?.data?.list || [];
      const targetId = Number(music_id || rest?.musicId || rest?.id);
      const targetBatchId = Number(batch_group_id || rest?.batchGroupId);
      let targetItems = list;
      if (targetId) {
        targetItems = list.filter(item => item.id === targetId);
      } else if (targetBatchId) {
        targetItems = list.filter(item => item.id === targetBatchId || item.id === targetBatchId + 1);
      }
      const formattedList = (targetItems.length > 0 ? targetItems : list).map(item => ({
        ...item,
        is_completed: item.musicGenerateStatus === 3,
        is_processing: item.musicGenerateStatus === 2,
        is_failed: item.musicGenerateStatus === 4 || item.musicGenerateStatus === -1
      }));
      return {
        status: body?.code === 0,
        result: this._snake({
          code: body?.code,
          msg: body?.msg,
          total: body?.data?.total || 0,
          list: formattedList
        }),
        state: this._encSt(sess)
      };
    } catch (e) {
      this._log(`Status query failed: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async upload({
    state,
    image,
    file,
    category = "image",
    ...rest
  } = {}) {
    let sess = null;
    try {
      sess = await this._getSess(state || rest?.token);
      if (!sess?.token) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const fileData = image || file || rest?.audio;
      if (!fileData) {
        return {
          status: false,
          result: {
            error: "Parameter 'image' or 'file' is required."
          },
          state: this._encSt(sess)
        };
      }
      const uploadedUrl = await this._uploadFile(sess, fileData, category);
      return {
        status: true,
        result: this._snake({
          url: uploadedUrl,
          category: category
        }),
        state: this._encSt(sess)
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e?.message
        },
        state: sess ? this._encSt(sess) : state || null
      };
    }
  }
  async createMv({
    state,
    audio_url,
    cover_image,
    music_id,
    story_plot,
    gender = "man",
    ...rest
  } = {}) {
    let sess = null;
    try {
      this._log("Initializing Create MV Task...");
      sess = await this._getSess(state || rest?.token);
      if (!sess?.token) {
        return {
          status: false,
          result: {
            error: "Failed to initialize session"
          },
          state: state || null
        };
      }
      const inputAudio = audio_url || rest?.audioUrl || rest?.audio;
      const inputCover = cover_image || rest?.coverImage || rest?.cover || rest?.image;
      if (!inputAudio) {
        return {
          status: false,
          result: {
            error: "Parameter 'audio_url' is required."
          },
          state: this._encSt(sess)
        };
      }
      const finalAudioUrl = await this._uploadFile(sess, inputAudio, "audio");
      let finalCoverImage = "";
      if (inputCover) {
        finalCoverImage = await this._uploadFile(sess, inputCover, "image");
      }
      let plot = story_plot || rest?.custom_story_plot || rest?.customStoryPlot || "";
      if (!plot) {
        try {
          const {
            data: remData
          } = await this.http.get(`${this.apiBase}/member/mv-generate/random-rec-remark`, {
            headers: this._muvHds(sess.token)
          });
          plot = remData?.data?.remark || "An expressive music video performance with cinematic visuals.";
        } catch {
          plot = "An expressive music video performance with cinematic visuals.";
        }
      }
      const payload = {
        audioUrl: finalAudioUrl,
        coverImage: finalCoverImage,
        imageComp: rest?.image_comp || rest?.imageComp || "9:16",
        subDurationScope: rest?.sub_duration_scope || rest?.subDurationScope || "0,130",
        isWatermark: rest?.is_watermark || rest?.isWatermark || 0,
        isLyric: rest?.is_lyric || rest?.isLyric || 0,
        chargingModel: 0,
        musicId: Number(music_id || rest?.musicId || 0),
        gender: gender,
        customStoryPlot: plot
      };
      this._log(`Submitting MV task for audio: ${finalAudioUrl}`);
      const res = await this.http.post(`${this.apiBase}/member/mv-generate/create`, payload, {
        headers: this._muvHds(sess.token, {
          "Content-Type": "application/json"
        })
      });
      const body = res?.data || {};
      return {
        status: body?.code === 0,
        result: this._snake({
          code: body?.code,
          msg: body?.msg,
          audio_url: finalAudioUrl,
          cover_image: finalCoverImage,
          story_plot: plot,
          ...body?.data || {}
        }),
        state: this._encSt(sess)
      };
    } catch (e) {
      this._log(`Create MV failed: ${e.message}`);
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
  const validActions = ["models", "user", "create", "status", "genres", "random_prompt", "random_lyric", "random_remark", "upload", "create_mv"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          models: "/?action=models",
          user: "/?action=user&state=YOUR_STATE_B64",
          random_prompt: "/?action=random_prompt",
          random_lyric: "/?action=random_lyric",
          random_remark: "/?action=random_remark",
          genres: "/?action=genres",
          create_prompt: "/?action=create&prompt=An+elegant+Classical+crossover+with+violin&model=chirp-v4-5+",
          create_custom: "/?action=create&lyrics=[Intro]...&title=My+Song&tags=pop,rock&model=chirp-v5",
          status: "/?action=status&music_id=17667&state=YOUR_STATE_B64",
          upload: "/?action=upload&image=https://example.com/cover.jpg&category=image&state=YOUR_STATE_B64",
          create_mv: "/?action=create_mv&audio_url=https://example.com/song.mp3&cover_image=https://example.com/cover.jpg&story_plot=..."
        }
      }
    });
  }
  const api = new MuvAi();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "user":
        response = await api.user(params);
        break;
      case "random_prompt":
        response = await api.randomPrompt(params);
        break;
      case "random_lyric":
        response = await api.randomLyric(params);
        break;
      case "random_remark":
        response = await api.randomRemark(params);
        break;
      case "genres":
        response = await api.genres(params);
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
        response = await api.status(params);
        break;
      case "upload":
        if (!params.image && !params.file && !params.audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' atau 'file' (URL/Base64/Buffer) wajib diisi untuk action 'upload'."
          });
        }
        response = await api.upload(params);
        break;
      case "create_mv":
        if (!params.audio_url && !params.audioUrl && !params.audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio_url' wajib diisi untuk action 'create_mv'."
          });
        }
        response = await api.createMv(params);
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