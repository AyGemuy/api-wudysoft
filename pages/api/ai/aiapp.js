import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
class AiAppAI {
  constructor() {
    this.A_PROFILES = "https://api.adapty.io/api/v1/sdk/analytics/profiles/";
    this.A_ATTR = "https://api.adapty.io/api/v1/sdk/attribution/profile/set/data/";
    this.A_KEY = "public_live_kjJoclwx.YrAVMtyGU1jSlAoU1GCw";
    this.FB_KEY = "AIzaSyB7JuY4pytLXJln8aiamCp5ARs9u-LpQzU";
    this.FB_SIGNUP = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.FB_KEY}`;
    this.FB_REFRESH = `https://securetoken.googleapis.com/v1/token?key=${this.FB_KEY}`;
    this.BASE = "https://api.aiapp.ai/api";
    this.STORAGE = "https://firebasestorage.googleapis.com/v0/b/ai-app-ai-prod.appspot.com/o";
    this.PKG = "ai.app.ai";
    this.CERT = "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81";
    this.GMPID = "1:784973900488:android:118ecd41d563e281dd53fd";
    this.APPCHECK = "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==";
    this.MODELS = [{
      key: 0,
      value: "mpwyUrxHu4Xa47BP5lPEgwk/NcaFFlnhBk3SA745INc="
    }, {
      key: 2,
      value: "utq91e3b3StjmuMJGullm0fDoieGv2EhMsvPdq2jc34="
    }, {
      key: 3,
      value: "FIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQogrY="
    }, {
      key: 4,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQoaaa="
    }, {
      key: 5,
      value: "nIjaUTDhbb/r4IxrhYKBUzRLrshrJldlVgKL8EQobbb="
    }, {
      key: 6,
      value: "nIjaUTDhcc/r4IxrhYKBUzRLrshrJldlVgKL8EQoccc="
    }, {
      key: 7,
      value: "nIjaUTDhdd/r4IxrhYKBUzRLrshrJldlVgKL8EQoddd="
    }, {
      key: 8,
      value: "nIjaUTDhee/r4IxrhYKBUzRLrshrJldlVgKL8EQoeee="
    }, {
      key: 9,
      value: "nIjaUTDhff/r4IxrhYKBUzRLrshrJldlVgKL8EQofff="
    }, {
      key: 10,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQoggg="
    }, {
      key: 11,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQohhh="
    }, {
      key: 12,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQojjj="
    }, {
      key: 13,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQokkk="
    }, {
      key: 14,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQolll="
    }, {
      key: 15,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQommm="
    }, {
      key: 16,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQonnn="
    }, {
      key: 18,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQorrr="
    }, {
      key: 21,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQouuu="
    }, {
      key: 22,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQovvv="
    }, {
      key: 23,
      value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQoyyy="
    }, {
      key: 26,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozab="
    }, {
      key: 29,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozae="
    }, {
      key: 30,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaf="
    }, {
      key: 31,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozag="
    }, {
      key: 32,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozah="
    }, {
      key: 33,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozai="
    }, {
      key: 49,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozay="
    }, {
      key: 50,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaz="
    }, {
      key: 42,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozar="
    }, {
      key: 43,
      value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozas="
    }];
    this.IMG = {
      schnell: 2,
      ideo3: 4,
      pro: 6,
      banana: 10,
      qwen: 11
    };
    this.token = null;
    this.refresh = null;
    this.exp = 0;
    this.uid = null;
    this.userId = null;
    this.aProfileId = null;
    this.aDeviceId = null;
    console.log("[Init] Class AiAppAI initialized.");
  }
  setModelMap(newMap) {
    if (Array.isArray(newMap)) {
      console.log(`[Model Map] Updating dinamic model mapping configuration with ${newMap.length} items.`);
      this.MODELS = newMap;
    } else {
      console.warn("[Model Map] Failed to set model map: Input must be an Array.");
    }
  }
  saveState() {
    console.log("[State] Saving state...");
    try {
      const s = {
        token: this.token,
        refresh: this.refresh,
        exp: this.exp,
        uid: this.uid,
        userId: this.userId,
        aProfileId: this.aProfileId,
        aDeviceId: this.aDeviceId
      };
      const b64 = Buffer.from(JSON.stringify(s)).toString("base64");
      console.log("[State] Save successful.");
      return b64;
    } catch (e) {
      console.error("[State] Save failed:", e.message);
      return null;
    }
  }
  loadState(b64) {
    console.log("[State] Loading state from Base64...");
    try {
      const s = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      Object.assign(this, s);
      console.log("[State] Load successful. Restored userId:", this.userId);
    } catch (e) {
      console.error("[State] Load failed:", e.message);
    }
  }
  hex(n) {
    try {
      return Array.from({
        length: n
      }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    } catch (e) {
      console.error("[Helper] hex generation failed:", e.message);
      return "";
    }
  }
  alnum(n) {
    try {
      const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return Array.from({
        length: n
      }, () => c[Math.floor(Math.random() * c.length)]).join("");
    } catch (e) {
      console.error("[Helper] alnum generation failed:", e.message);
      return "";
    }
  }
  async imgData(src) {
    console.log("[Image Processing] Parsing image source...");
    try {
      if (Buffer.isBuffer(src)) {
        console.log("[Image Processing] Source is Buffer.");
        return {
          b64: src.toString("base64"),
          mime: "image/jpeg"
        };
      }
      if (typeof src === "string") {
        if (src.startsWith("data:")) {
          console.log("[Image Processing] Source is Data URI.");
          const [meta, b64] = src.split(",");
          return {
            b64: b64,
            mime: meta.replace("data:", "").replace(";base64", "")
          };
        }
        if (src.startsWith("http")) {
          console.log("[Image Processing] Source is URL. Fetching...", src);
          const {
            data
          } = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return {
            b64: Buffer.from(data).toString("base64"),
            mime: "image/jpeg"
          };
        }
        console.log("[Image Processing] Source is assumed raw Base64 string.");
        return {
          b64: src,
          mime: "image/jpeg"
        };
      }
      throw new Error("Unsupported image type");
    } catch (e) {
      console.error("[Image Processing] Failed to parse image:", e.message);
      throw e;
    }
  }
  parse(raw) {
    console.log("[Parser] Parsing SSE stream data...");
    try {
      const chunks = [];
      let result = "";
      for (const line of String(raw).split("\n")) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const json = t.slice(5).trim();
        if (json === "[DONE]") break;
        try {
          const content = JSON.parse(json)?.choices?.[0]?.delta?.content;
          if (content) {
            chunks.push(content);
            result += content;
          }
        } catch {}
      }
      console.log(`[Parser] Done. Extracted ${chunks.length} chunks.`);
      return {
        status: true,
        result: result || String(raw),
        chunks: chunks
      };
    } catch (e) {
      console.error("[Parser] Parse error:", e.message);
      return {
        status: true,
        result: String(raw),
        chunks: [],
        parseError: e.message
      };
    }
  }
  async signup() {
    console.log("[Auth] Registering/Signing up new Firebase user...");
    try {
      const h = {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "X-Android-Package": this.PKG,
        "X-Android-Cert": this.CERT,
        "Accept-Language": "id-ID, en-US",
        "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android",
        "X-Firebase-GMPID": this.GMPID,
        "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
        "X-Firebase-AppCheck": this.APPCHECK
      };
      const {
        data
      } = await axios.post(this.FB_SIGNUP, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: h
      });
      this.token = data.idToken;
      this.refresh = data.refreshToken;
      this.uid = data.localId;
      this.exp = Date.now() + (Number(data.expiresIn) - 60) * 1e3;
      console.log("[Auth] Signup OK. uid:", this.uid);
    } catch (e) {
      console.error("[Auth] Signup request failed:", e.message);
      throw e;
    }
  }
  async fbRefresh() {
    console.log("[Auth] Token expired. Refreshing token...");
    try {
      const {
        data
      } = await axios.post(this.FB_REFRESH, {
        grantType: "refresh_token",
        refreshToken: this.refresh
      }, {
        headers: {
          "User-Agent": "Dalvik/2.1.0",
          "Content-Type": "application/json"
        }
      });
      this.token = data.id_token;
      this.refresh = data.refresh_token;
      this.uid = data.user_id;
      this.exp = Date.now() + (Number(data.expires_in) - 60) * 1e3;
      console.log("[Auth] Token Refresh OK.");
    } catch (e) {
      console.error("[Auth] Token Refresh failed, falling back to Signup:", e.message);
      await this.signup();
    }
  }
  async auth() {
    console.log("[Auth] Checking token validity...");
    try {
      if (!this.token) {
        console.log("[Auth] No token found.");
        await this.signup();
      } else if (Date.now() >= this.exp) {
        console.log("[Auth] Token lifecycle expired.");
        await this.fbRefresh();
      } else {
        console.log("[Auth] Existing token is still valid.");
      }
    } catch (e) {
      console.error("[Auth] Authentication workflow failed:", e.message);
      throw e;
    }
  }
  async adapty(userId) {
    console.log("[Adapty] Starting registration workflow...");
    try {
      const profileId = uuidv4();
      this.aDeviceId = uuidv4();
      const sessionId = uuidv4();
      const meta = {
        adapty_sdk_version: "3.11.1",
        advertising_id: uuidv4(),
        android_id: this.hex(16),
        app_build: "999999",
        android_app_set_id: uuidv4(),
        app_version: "9.9.9.9.9.9",
        device: "Realme RMX3890",
        device_id: this.aDeviceId,
        locale: "id-ID",
        os: "15",
        platform: "Android",
        timezone: "Asia/Makassar",
        user_agent: "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.215 Mobile Safari/537.36"
      };
      const hdr = (pid, ct = "application/vnd.api+json") => ({
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "Content-Type": ct,
        "adapty-sdk-profile-id": pid,
        "adapty-sdk-platform": "Android",
        "adapty-sdk-version": "3.11.1",
        "adapty-sdk-session": sessionId,
        "adapty-sdk-device-id": this.aDeviceId,
        "adapty-sdk-observer-mode-enabled": "false",
        "adapty-sdk-android-billing-new": "true",
        "adapty-sdk-store": "play_store",
        Authorization: `Api-Key ${this.A_KEY}`,
        "adapty-app-version": "9.9.9.9.9.9",
        "adapty-sdk-crossplatform-name": "react-native",
        "adapty-sdk-crossplatform-version": "3.11.3"
      });
      const url = `${this.A_PROFILES}${profileId}/`;
      console.log("[Adapty] Step 1/4: Creating anonymous profile...");
      await axios.post(url, {
        data: {
          type: "adapty_analytics_profile",
          id: profileId,
          attributes: {
            installation_meta: meta
          }
        }
      }, {
        headers: hdr(profileId)
      });
      console.log("[Adapty] 1/4 anonymous OK");
      console.log("[Adapty] Step 2/4: Linking customer_user_id...");
      const r2 = await axios.post(url, {
        data: {
          type: "adapty_analytics_profile",
          id: profileId,
          attributes: {
            customer_user_id: userId,
            installation_meta: meta
          }
        }
      }, {
        headers: hdr(profileId)
      });
      const realId = r2.data?.data?.id || profileId;
      this.aProfileId = realId;
      console.log("[Adapty] 2/4 link OK → realId:", realId);
      console.log("[Adapty] Step 3/4: Fetching public IP for geo tracking...");
      let ip = null;
      try {
        ip = (await axios.get("https://api.ipify.org?format=json", {
          timeout: 4e3
        })).data?.ip;
      } catch (errIp) {
        console.warn("[Adapty] IP fetch failed (non-critical):", errIp.message);
      }
      if (ip) {
        await axios.patch(`${this.A_PROFILES}${realId}/`, {
          data: {
            type: "adapty_analytics_profile",
            id: realId,
            attributes: {
              ip_v4_address: ip
            }
          }
        }, {
          headers: hdr(realId)
        });
        console.log("[Adapty] 3/4 ip PATCH OK:", ip);
      }
      console.log("[Adapty] Step 4/4: Posting organic attribution...");
      await axios.post(this.A_ATTR, {
        attribution_json: JSON.stringify({
          media_source: "",
          campaign: "",
          adset: "",
          af_status: "Organic",
          af_channel: "",
          adgroup: "",
          click_time: ""
        }),
        profile_id: realId,
        source: "appsflyer"
      }, {
        headers: hdr(realId, "application/json")
      });
      console.log("[Adapty] 4/4 attribution profile setup OK");
    } catch (e) {
      console.error("[Adapty] Error occurred inside pipeline (non-critical):", e.message);
    }
  }
  async register() {
    console.log("[Register] Registering account initialization on AIApp backend...");
    try {
      if (!this.userId) this.userId = this.hex(32);
      console.log("[Register] Generating random unit ID:", this.userId);
      await this.adapty(this.userId);
      const h = {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        x_user_id: this.userId,
        x_platform: "android",
        x_token: this.token,
        x_dev: "false",
        x_pr: "false"
      };
      const {
        data
      } = await axios.post(`${this.BASE}/v3/users/${this.userId}`, {
        model: this.MODELS
      }, {
        headers: h
      });
      console.log("[Register] Registration request verified. Credit status:", data?.data?.credit);
      return data;
    } catch (e) {
      console.error("[Register] Error during user registration:", e.message);
      throw e;
    }
  }
  async ensure() {
    console.log("[Ensure] Safeguarding session state initialization...");
    try {
      await this.auth();
      if (!this.userId) {
        console.log("[Ensure] No valid session userId found, forcing registration...");
        await this.register();
      } else {
        console.log("[Ensure] Session checkpoint verified successfully.");
      }
    } catch (e) {
      console.error("[Ensure] Guard check failed:", e.message);
      throw e;
    }
  }
  async tc(content, model = 2) {
    console.log("[Token Count] Requesting token evaluation from API...");
    try {
      const h = {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        x_user_id: this.userId,
        x_platform: "android",
        x_token: this.token,
        x_dev: "false",
        x_pr: "false"
      };
      const {
        data
      } = await axios.post(`${this.BASE}/token-count`, {
        content: content,
        id: model,
        model: 3
      }, {
        headers: h
      });
      const counts = data?.token ?? 0;
      console.log("[Token Count] Evaluated weight size:", counts);
      return counts;
    } catch (e) {
      console.error("[Token Count] Failed to calculate tokens:", e.message);
      return 0;
    }
  }
  async upload(b64, mime = "image/jpeg") {
    console.log("[Uploader] Initializing resumable session on Firebase Storage...");
    try {
      const ts = Date.now(),
        ext = mime.split("/")[1] || "jpg";
      const fileName = `vision/${this.uid}/${ts}/vision-image-input-${this.alnum(8)}.${ext}`;
      const encoded = encodeURIComponent(fileName);
      const initUrl = `${this.STORAGE}?name=${encoded}&uploadType=resumable&upload_protocol=resumable`;
      const buf = Buffer.from(b64, "base64");
      const sh = {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        "x-firebase-appcheck": this.APPCHECK,
        "X-Firebase-Storage-Version": "Android/22.0.1",
        "x-firebase-gmpid": this.GMPID,
        Authorization: `Firebase ${this.token}`
      };
      console.log("[Uploader] Posting chunk handshake initialization...");
      const init = await axios.post(initUrl, null, {
        headers: {
          ...sh,
          "Content-Type": mime,
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Header-Content-Length": buf.length,
          "X-Goog-Upload-Header-Content-Type": mime
        }
      });
      const uploadUrl = init.headers["x-goog-upload-url"] || init.headers["location"];
      console.log("[Uploader] Transmitting stream buffer array payload...");
      await axios.post(uploadUrl, buf, {
        headers: {
          ...sh,
          "Content-Type": "application/octet-stream",
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Offset": "0"
        },
        maxBodyLength: Infinity
      });
      console.log("[Uploader] Upload processing finalized successfully! Path:", fileName);
      return fileName;
    } catch (e) {
      console.error("[Uploader] Asset conversion file upload failed:", e.message);
      throw e;
    }
  }
  async generate({
    state,
    mode,
    prompt,
    ...rest
  }) {
    console.log(`[Generate Engine] Triggered core wrapper processing. [Mode: ${mode}]`);
    try {
      if (state) {
        console.log("[Generate Engine] State arguments detected.");
        this.loadState(state);
      }
      await this.ensure();
      switch (mode) {
        case "chat": {
          try {
            const model = rest.model || 11;
            const image = rest.image || null;
            const chatId = rest.chatId || null;
            console.log("[Chat Pipeline] Running model:", model, "| Prompt preview:", prompt.slice(0, 60));
            const tcCount = await this.tc(prompt, model);
            const id = chatId || this.alnum(20);
            const content = [{
              type: "text",
              text: prompt
            }];
            if (image) {
              console.log("[Chat Pipeline] Multi-modal payload detected. Handling asset integration...");
              const {
                b64,
                mime
              } = await this.imgData(image);
              const pathName = await this.upload(b64, mime);
              content.push({
                type: "image",
                fileUrl: `/${pathName}`,
                mimeType: mime
              });
            }
            const h = {
              "User-Agent": "okhttp/4.12.0",
              Accept: "text/event-stream",
              "Accept-Encoding": "gzip",
              "Content-Type": "application/json",
              "cache-control": "no-cache",
              "x-requested-with": "XMLHttpRequest",
              x_user_id: this.userId,
              x_platform: "android",
              x_token: this.token,
              x_dev: "false",
              x_pr: "false",
              x_token_count: String(tcCount),
              x_model: String(model),
              x_stream: "true",
              x_chat_id: id
            };
            console.log("[Chat Pipeline] Sending streaming prompt message array payload...");
            const {
              data
            } = await axios.post(`${this.BASE}/chat`, {
              messages: [{
                role: "user",
                content: content
              }],
              modelMap: this.MODELS,
              ...rest
            }, {
              headers: h
            });
            const parsed = this.parse(data);
            console.log("[Chat Pipeline] Stream processed successfully. Length content:", parsed.result.length);
            return {
              ...parsed,
              state: this.saveState()
            };
          } catch (e) {
            console.error("[Chat Pipeline] Fatal exception inside inner core execution:", e.message);
            return {
              status: false,
              result: null,
              chunks: [],
              error: e.message,
              state: this.saveState()
            };
          }
        }
        case "image": {
          try {
            const modelId = rest.modelId || 4;
            console.log("[Image Pipeline] Preparing engine settings. ModelId:", modelId, "| Prompt:", prompt.slice(0, 60));
            const h = {
              "User-Agent": "okhttp/4.12.0",
              "Accept-Encoding": "gzip",
              "Content-Type": "application/json",
              x_token_count: "38",
              x_model: String(modelId),
              x_user_id: this.userId,
              x_platform: "android",
              x_token: this.token,
              x_dev: "false",
              x_pr: "false"
            };
            const body = {
              messages: [{
                role: "user",
                content: prompt
              }],
              tokenCount: "38",
              modelId: String(modelId),
              modelMap: this.MODELS,
              engine: {
                title: "Image Generation",
                modelId: String(modelId),
                engine: "image-generator",
                isPremium: false
              },
              isStream: "false",
              ...rest
            };
            console.log("[Image Pipeline] Requesting context rendering target generation...");
            const {
              data
            } = await axios.post(`${this.BASE}/chat/image`, body, {
              headers: h
            });
            const url = data?.url || data?.data?.url;
            if (!url) throw new Error("No image structural URL found in responses");
            console.log("[Image Pipeline] Target path acquired. Downloading asset binary content...", url);
            const img = await axios.get(url, {
              responseType: "arraybuffer",
              headers: {
                "User-Agent": "okhttp/4.12.0"
              }
            });
            console.log("[Image Pipeline] Image buffer transmission saved complete.");
            return {
              status: true,
              buffer: Buffer.from(img.data),
              contentType: img.headers["content-type"] || "image/jpeg",
              url: url,
              state: this.saveState()
            };
          } catch (e) {
            console.error("[Image Pipeline] Exception during image pipeline lifecycle:", e.message);
            return {
              status: false,
              error: e.message,
              state: this.saveState()
            };
          }
        }
        default:
          console.error(`[Generate Engine] Error: Unsupported workflow operation matching rule '${mode}'`);
          throw new Error(`Unsupported mode: ${mode}. Use 'chat' or 'image'.`);
      }
    } catch (globalErr) {
      console.error("[Generate Engine] Outer wrapper general processing error:", globalErr.message);
      return {
        status: false,
        error: globalErr.message,
        state: this.saveState()
      };
    }
  }
}
export default async function handler(req, res) {
  console.log(`[Handler] Received API Request: ${req.method}`);
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const {
      state: stateB64,
      prompt,
      mode,
      ...rest
    } = params;
    if (!prompt) {
      console.warn("[Handler] Rejected: Missing 'prompt' in request parameters.");
      return res.status(400).json({
        status: false,
        error: "Parameter 'prompt' is required."
      });
    }
    if (mode && mode !== "chat" && mode !== "image") {
      console.warn(`[Handler] Rejected: Invalid mode provided [${mode}]`);
      return res.status(400).json({
        status: false,
        error: `Invalid mode: '${mode}'. Available modes are 'chat' or 'image'.`
      });
    }
    const targetMode = mode || (rest.modelId ? "image" : "chat");
    const api = new AiAppAI();
    switch (targetMode) {
      case "image": {
        console.log("[Handler] Routing to Mode ──> [image]");
        const result = await api.generate({
          state: stateB64,
          mode: "image",
          prompt: prompt,
          ...rest
        });
        if (!result.status) {
          return res.status(500).json({
            status: false,
            error: result.error
          });
        }
        res.setHeader("Content-Type", result.contentType);
        return res.status(200).send(result.buffer);
      }
      case "chat": {
        console.log("[Handler] Routing to Mode ──> [chat]");
        const result = await api.generate({
          state: stateB64,
          mode: "chat",
          prompt: prompt,
          ...rest
        });
        return res.status(200).json(result);
      }
      default:
        console.warn("[Handler] Rejected: Unknown execution mode.");
        return res.status(400).json({
          status: false,
          error: "Unsupported operation mode."
        });
    }
  } catch (err) {
    console.error("[Handler] Critical runtime crash caught inside lambda endpoint:", err.message);
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
}