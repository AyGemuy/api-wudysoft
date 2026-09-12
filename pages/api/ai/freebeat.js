import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
class FreeBeat {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.token = null;
    this.email = null;
    this.sid = null;
    this.configs = {
      BASE: "https://freebeat.ai",
      API: "https://api.freebeatfit.com",
      MAIL: `https://${apiConfig.DOMAIN_URL}/api/mails/v37`,
      UA: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ACTION_OTP: "404332890f476afd4eb2bcd3390fcbdec519c94140",
      ACTION_LOGIN: "404332890f476afd4eb2bcd3390fcbdec519c94140",
      DEPLOY_ID: "dpl_HwCEnPu4Bx1iHkeAvNBdJwsqeTji",
      TREE: "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%2Cnull%2Cnull%5D"
    };
    this.availableModes = ["audio", "image", "video", "upscale"];
  }
  exportState() {
    try {
      const serializedCookies = this.jar.toJSON();
      return Buffer.from(JSON.stringify({
        token: this.token,
        email: this.email,
        sid: this.sid,
        cookies: serializedCookies
      })).toString("base64");
    } catch (e) {
      console.error("[state] export failed:", e.message);
      return null;
    }
  }
  importState(stateB64) {
    try {
      if (!stateB64) return false;
      const decoded = Buffer.from(stateB64, "base64").toString("utf-8");
      const stateObj = JSON.parse(decoded);
      this.token = stateObj.token || null;
      this.email = stateObj.email || null;
      this.sid = stateObj.sid || null;
      if (stateObj.cookies) {
        this.jar = CookieJar.fromJSON(stateObj.cookies);
        this.http = wrapper(axios.create({
          jar: this.jar,
          withCredentials: true
        }));
      }
      console.log("[state] session successfully restored for:", this.email);
      return true;
    } catch (e) {
      console.error("[state] import failed:", e.message);
      return false;
    }
  }
  _getHead(ext = {}) {
    const defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "fb-language": "en",
      origin: this.configs.BASE,
      referer: `${this.configs.BASE}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.configs.UA,
      "x-platform-type": "web"
    };
    if (this.token) {
      defaultHeaders["authorization"] = this.token;
      defaultHeaders["token"] = this.token;
      defaultHeaders["udt"] = this.token;
    }
    return {
      ...defaultHeaders,
      ...ext
    };
  }
  async _mkMail() {
    try {
      console.log("[mail] creating temp email...");
      const {
        data
      } = await this.http.get(this.configs.MAIL, {
        params: {
          action: "create"
        }
      });
      this.email = data?.email;
      this.sid = data?.sid;
      console.log("[mail] address:", this.email);
      return {
        success: true,
        data: data
      };
    } catch (e) {
      console.error("[mail] error creating mail:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _rdMail() {
    try {
      const {
        data
      } = await this.http.get(this.configs.MAIL, {
        params: {
          action: "message",
          email: this.email,
          sid: this.sid
        }
      });
      return {
        success: true,
        data: data
      };
    } catch (e) {
      console.error("[mail] error reading mail:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _sendOTP() {
    try {
      console.log("[otp] sending to", this.email);
      await this.http.post(`${this.configs.BASE}/api/proxy/v1/user/com/sendEmailVerifyCodeV2`, {
        email: this.email,
        verifySource: "WEB_SHOPIFY_LOGIN"
      }, {
        headers: this._getHead({
          "content-type": "application/json"
        })
      });
      console.log("[otp] status: sent");
      return {
        success: true
      };
    } catch (e) {
      if (e.response?.status === 404) {
        console.log("[otp] proxy-v1 404, rolling fallback server action...");
        try {
          await this.http.post(`${this.configs.BASE}/`, JSON.stringify([{
            email: this.email,
            verifySource: "WEB_SHOPIFY_LOGIN"
          }]), {
            headers: this._getHead({
              accept: "text/x-component",
              "content-type": "text/plain;charset=UTF-8",
              "next-action": this.configs.ACTION_OTP
            })
          });
          console.log("[otp] status: sent (fallback action)");
          return {
            success: true
          };
        } catch (err) {
          console.error("[otp] fallback action failed:", err.message);
          return {
            success: false,
            error: err.message
          };
        }
      }
      console.error("[otp] error sending code:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _getCode() {
    console.log("[otp] waiting for code...");
    try {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const res = await this._rdMail();
        if (!res.success) {
          console.log(`[otp] retry ${i + 1}/20 (mail fetch failed)`);
          continue;
        }
        const msgs = res.data?.mails || [];
        const body = msgs[0]?.text || "";
        const code = body.match(/\b(\d{6})\b/)?.[1];
        if (code) {
          console.log("[otp] got:", code);
          return {
            success: true,
            code: code
          };
        }
        console.log(`[otp] retry ${i + 1}/20`);
      }
      console.error("[otp] timeout waiting for code");
      return {
        success: false,
        error: "OTP timeout"
      };
    } catch (e) {
      console.error("[otp] error matching code:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _login(code) {
    try {
      console.log("[auth] submitting code...");
      await this.http.post(`${this.configs.BASE}/`, JSON.stringify([{
        email: this.email,
        code: code
      }]), {
        headers: this._getHead({
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": this.configs.ACTION_LOGIN,
          "next-router-state-tree": this.configs.TREE,
          "x-deployment-id": this.configs.DEPLOY_ID
        })
      });
      const cookies = await this.jar.getCookies(this.configs.BASE);
      this.token = cookies.find(c => c.key === "authToken")?.value || null;
      console.log("[auth] token acquired:", this.token ? `${this.token.slice(0, 12)}…` : "none");
      if (!this.token) {
        return {
          success: false,
          error: "authToken key missing from jar session storage"
        };
      }
      return {
        success: true,
        token: this.token
      };
    } catch (e) {
      console.error("[auth] login error:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _claim() {
    console.log("[claim] linking registration session profile...");
    try {
      const {
        data: lc
      } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/member/pay/linkCard`, {
        urlSuccess: `${this.configs.BASE}/agent`
      }, {
        headers: this._getHead({
          "content-type": "application/json"
        })
      });
      console.log("[claim] card handler response status:", lc?.code === 0 ? "ok" : lc?.msg);
    } catch (e) {
      console.log("[claim] card registration skipped:", e?.response?.data?.msg || e.message);
    }
    console.log("[claim] executioning user check-in payload...");
    try {
      const {
        data: signRes
      } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/user/signin/submit`, {}, {
        headers: this._getHead({
          "content-type": "application/json"
        })
      });
      if (signRes?.code === 0) {
        console.log(`[claim] success! Message: ${signRes.data?.message}, Reward Amount: ${signRes.data?.rewardAmount}`);
      } else {
        console.log("[claim] failed sign-in status:", signRes?.msg);
      }
    } catch (e) {
      console.log("[claim] signin handler exception thrown:", e?.response?.data?.msg || e.message);
    }
  }
  async _init() {
    try {
      console.log("[init] starting full authentication flow...");
      await this.http.get(this.configs.BASE, {
        headers: this._getHead({
          accept: "text/html"
        })
      });
      const mailRes = await this._mkMail();
      if (!mailRes.success) return mailRes;
      const otpRes = await this._sendOTP();
      if (!otpRes.success) return otpRes;
      const codeRes = await this._getCode();
      if (!codeRes.success) return codeRes;
      const loginRes = await this._login(codeRes.code);
      if (!loginRes.success) return loginRes;
      await this._claim();
      console.log("[init] fully authenticated ✓");
      return {
        success: true
      };
    } catch (e) {
      console.error("[init] flow failed:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _resImg(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (/^https?:\/\//.test(img)) {
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      return Buffer.from(img.replace(/^data:[^;]+;base64,/, ""), "base64");
    } catch (e) {
      console.error("[resolveImg] error parsing image:", e.message);
      return null;
    }
  }
  async _upload(img, pathPattern = "dance/webm") {
    try {
      const buf = await this._resImg(img);
      if (!buf) return {
        success: false,
        error: "Failed to resolve image buffer"
      };
      const ts = Date.now();
      const name = `${ts}-${Math.random().toString(36).slice(2, 10)}`;
      const key = `${pathPattern}/${ts}.jpg`;
      console.log("[upload] getting signed url...");
      const {
        data: sd
      } = await this.http.post(`${this.configs.API}/api/v2/file/genUploadSignUrl`, {
        reqList: [{
          key: key,
          fileName: `${name}.jpg`,
          bucketName: "freebeat-static"
        }]
      }, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: this.configs.BASE,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `${this.configs.BASE}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": this.configs.UA
        }
      });
      const {
        signURL,
        finalStaticUrl
      } = sd?.data?.[0] || {};
      if (!signURL) return {
        success: false,
        error: "Signed URL definition missing"
      };
      console.log("[upload] putting to S3...");
      const s3Client = axios.create();
      await s3Client.put(signURL, buf, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "multipart/form-data",
          Origin: this.configs.BASE,
          Pragma: "no-cache",
          Referer: `${this.configs.BASE}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": this.configs.UA,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      console.log("[upload] done:", finalStaticUrl);
      return {
        success: true,
        url: finalStaticUrl,
        name: name
      };
    } catch (e) {
      console.error("[upload] failed:", e.response?.data ? JSON.stringify(e.response.data) : e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async _poll(fn, check, ms = 3e3, max = 60) {
    try {
      for (let i = 0; i < max; i++) {
        const r = await fn();
        if (check(r)) return {
          success: true,
          data: r
        };
        console.log(`[poll] ${i + 1}/${max}`);
        await new Promise(r => setTimeout(r, ms));
      }
      return {
        success: false,
        error: "Polling timeout reached"
      };
    } catch (e) {
      return {
        success: false,
        error: e.message
      };
    }
  }
  async genAudio({
    prompt,
    instrumental = false,
    modelId = 85,
    credits = 38,
    ...rest
  }) {
    try {
      console.log("[audio] prompt:", prompt);
      const {
        data
      } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/text2audio/audio/createAudioTask`, {
        prompt: prompt,
        instrumental: instrumental,
        modelId: modelId,
        credits: credits,
        ...rest
      }, {
        headers: this._getHead({
          "content-type": "application/json",
          referer: `${this.configs.BASE}/music-generator`
        })
      });
      const id = data?.data;
      if (!id) return {
        success: false,
        error: "Audio task id creation failed"
      };
      console.log("[audio] task id:", id);
      return await this._poll(async () => {
        const {
          data: r
        } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/text2audio/audio/getAudioTaskList`, {
          limit: 500,
          anchor: 1
        }, {
          headers: this._getHead({
            "content-type": "application/json",
            referer: `${this.configs.BASE}/music-video/library/music-list`
          })
        });
        return r?.data?.list?.find(x => x.id === id);
      }, r => r && r.status === 100);
    } catch (e) {
      console.error("[audio] flow error:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async genImg({
    prompt,
    image,
    modelId = 53,
    size = "16:9",
    outputFormat = "png",
    ...rest
  }) {
    try {
      let body = {
        prompt: prompt,
        modelId: modelId,
        size: size,
        outputFormat: outputFormat
      };
      if (image) {
        const imgs = Array.isArray(image) ? image : [image];
        const urls = [];
        const names = [];
        for (const img of imgs) {
          const upRes = await this._upload(img, "dance/webm");
          if (!upRes.success) return upRes;
          urls.push(upRes.url);
          names.push(upRes.name);
        }
        body = {
          prompt: prompt,
          modelId: modelId,
          size: "",
          quality: "",
          seed: "",
          resolution: "",
          outputFormat: outputFormat,
          names: names,
          images: urls,
          count: 1,
          businessType: 11,
          generationType: 8,
          ...rest
        };
      }
      console.log("[image] prompt:", prompt);
      const {
        data
      } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/aiImageGenerator/create`, body, {
        headers: this._getHead({
          "content-type": "application/json",
          referer: `${this.configs.BASE}/${image ? "image-edit" : "ai-image-generator"}`
        })
      });
      const sn = data?.data;
      if (!sn) return {
        success: false,
        error: "Image task serial number failure"
      };
      console.log("[image] serial:", sn);
      return await this._poll(async () => {
        const {
          data: r
        } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/aiImageGenerator/list`, {
          limit: 500,
          anchor: 1
        }, {
          headers: this._getHead({
            "content-type": "application/json",
            referer: `${this.configs.BASE}/music-video/library/images-list`
          })
        });
        return r?.data?.list?.find(x => x.serialNo === sn || x.serialNo?.startsWith?.(`${sn}_`));
      }, r => r?.status === 100);
    } catch (e) {
      console.error("[image] flow error:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async genVideo({
    prompt,
    image,
    model = "pixverse-v5",
    modelId = 52,
    duration = 5,
    resolution = "720p",
    aspectRatio = "16:9",
    watermark = 1,
    ...rest
  }) {
    try {
      let uploadedUrls = [""];
      let generationType = 1;
      let nameStr = "";
      if (image) {
        generationType = 0;
        console.log("[video] processing reference image(s)...");
        const imgs = Array.isArray(image) ? image : [image];
        const urls = [];
        const names = [];
        for (const img of imgs) {
          const upRes = await this._upload(img, "dance/aivideo");
          if (!upRes.success) return upRes;
          urls.push(upRes.url);
          names.push(upRes.name);
        }
        uploadedUrls = urls;
        nameStr = names[0] || "";
      }
      const body = {
        generationType: generationType,
        model: model,
        modelId: modelId,
        duration: duration,
        resolution: resolution,
        style: "",
        images: uploadedUrls,
        prompt: prompt,
        watermark: watermark,
        name: nameStr,
        aspectRatio: aspectRatio,
        extraParams: {},
        ...rest
      };
      console.log("[video] prompt:", prompt, image ? `(Image-to-Video dengan ${uploadedUrls.length} image)` : "(Text-to-Video)");
      const {
        data
      } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/aiVideo/createAiVideo`, body, {
        headers: this._getHead({
          "content-type": "application/json",
          referer: `${this.configs.BASE}/${image ? "image-to-video" : "text-to-video"}/${model}`
        })
      });
      const serialNo = data?.data;
      if (!serialNo) return {
        success: false,
        error: "Video task serial number creation failed"
      };
      console.log("[video] serial:", serialNo);
      return await this._poll(async () => {
        const {
          data: r
        } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/aiVideo/list`, {
          limit: 500,
          anchor: 1
        }, {
          headers: this._getHead({
            "content-type": "application/json",
            referer: `${this.configs.BASE}/music-video/library/ai-video-list`
          })
        });
        return r?.data?.list?.find(x => x.serialNo === serialNo);
      }, r => r?.status === 100);
    } catch (e) {
      console.error("[video] flow error:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async upscaleImg({
    image,
    prompt = "No blur",
    negativePrompt = "low quality",
    upscaleFactor = 2,
    modelId = 38,
    ...rest
  }) {
    try {
      if (!image) return {
        success: false,
        error: "Image parameter is required for upscale mode"
      };
      console.log("[upscale] uploading source image...");
      const upRes = await this._upload(image, "dance/webm");
      if (!upRes.success) return upRes;
      const body = {
        name: upRes.name,
        picUrl: upRes.url,
        prompt: prompt,
        negativePrompt: negativePrompt,
        upscaleFactor: upscaleFactor,
        creativity: .3,
        resemblance: .6,
        guidanceScale: 4,
        numInferenceSteps: 18,
        businessType: 9,
        generationType: 11,
        modelId: modelId,
        seed: "",
        customResolution: 1,
        resolution: "640x640",
        ...rest
      };
      console.log("[upscale] triggering image enhancement...");
      const {
        data
      } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/aiImageGenerator/create`, body, {
        headers: this._getHead({
          "content-type": "application/json",
          referer: `${this.configs.BASE}/image-upscaler`
        })
      });
      const sn = data?.data;
      if (!sn) return {
        success: false,
        error: "Upscale task serial number creation failed"
      };
      console.log("[upscale] serial:", sn);
      return await this._poll(async () => {
        const {
          data: r
        } = await this.http.post(`${this.configs.BASE}/api/proxy/v1/aiImageGenerator/list`, {
          limit: 500,
          anchor: 1
        }, {
          headers: this._getHead({
            "content-type": "application/json",
            referer: `${this.configs.BASE}/music-video/library/images-list`
          })
        });
        return r?.data?.list?.find(x => x.serialNo === sn);
      }, r => r?.status === 100);
    } catch (e) {
      console.error("[upscale] flow error:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async generate({
    state,
    mode = "audio",
    prompt,
    image,
    ...rest
  }) {
    try {
      if (state) {
        console.log("[gen] state parameter provided, attempting reuse...");
        this.importState(state);
      }
      if (!this.availableModes.includes(mode)) {
        console.error(`[validate] unknown mode error: ${mode}`);
        return {
          status: false,
          result: `Unknown mode: "${mode}". Available modes: ${this.availableModes.join(", ")}`,
          state: null
        };
      }
      if (!this.token) {
        console.log("[gen] token not found, running auto login sequence...");
        const initRes = await this._init();
        if (!initRes.success) {
          return {
            status: false,
            result: initRes.error,
            state: null
          };
        }
      }
      console.log(`[gen] mode=${mode} processing...`);
      if (!prompt && mode !== "upscale") {
        console.error(`[validate] missing required field "prompt" for ${mode} mode`);
        return {
          status: false,
          result: `Field "prompt" is required for ${mode} mode`,
          state: this.exportState()
        };
      }
      let runResult;
      switch (mode) {
        case "audio":
          runResult = await this.genAudio({
            prompt: prompt,
            ...rest
          });
          break;
        case "image":
          runResult = await this.genImg({
            prompt: prompt,
            image: image,
            ...rest
          });
          break;
        case "video":
          runResult = await this.genVideo({
            prompt: prompt,
            image: image,
            ...rest
          });
          break;
        case "upscale":
          runResult = await this.upscaleImg({
            image: image,
            prompt: prompt,
            ...rest
          });
          break;
        default:
          break;
      }
      return {
        status: runResult.success,
        result: runResult.success ? runResult.data : runResult.error,
        state: this.exportState()
      };
    } catch (e) {
      console.error("[gen] main process error:", e.message);
      return {
        status: false,
        result: e.message,
        state: this.exportState()
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new FreeBeat();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}