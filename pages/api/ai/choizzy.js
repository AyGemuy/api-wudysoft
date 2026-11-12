import axios from "axios";
import crypto from "crypto";
const BASE = "https://choizzy.io/api/ai/video/candy";
const RC_BASE = "https://api.revenuecat.com/v1";
const PLATFORM = "WEB2_CANDY_STUDIO";
const RC_KEY = "goog_ObhuNZFAoXiCHpBWOxxXbzTnlUA";
const INTERVAL = 3e3;
const TIMEOUT = 12e4;
const MODELS = {
  image: [{
    id: "candyImage",
    price: 30,
    maxImages: 2,
    extraCostPerImage: 10,
    addExtraCostStartingFromImage: 3
  }, {
    id: "regularBanana",
    price: 60,
    maxImages: 2,
    extraCostPerImage: 10,
    addExtraCostStartingFromImage: 3
  }, {
    id: "genius",
    price: 70,
    maxImages: 2,
    extraCostPerImage: 10,
    addExtraCostStartingFromImage: 3
  }, {
    id: "bananaPro",
    price: 90,
    maxImages: 2,
    extraCostPerImage: 10,
    addExtraCostStartingFromImage: 2
  }],
  video: [{
    id: "PV",
    durationOptions: [3, 5, 8, 10],
    pricePerSecond: 20,
    isStyleSelectionAllowed: true,
    isAspectRatioSelectionAllowed: true,
    isSoundEffectsAllowed: true,
    maxImages: 1
  }, {
    id: "SEEDANCE_2",
    durationOptions: [4, 6, 8, 10, 12],
    pricePerSecond: 45,
    isStyleSelectionAllowed: false,
    isAspectRatioSelectionAllowed: true,
    isSoundEffectsAllowed: false,
    maxImages: 1
  }, {
    id: "VEO3_1_FAST",
    durationOptions: [4, 6, 8],
    pricePerSecond: 66,
    isStyleSelectionAllowed: false,
    isAspectRatioSelectionAllowed: true,
    isSoundEffectsAllowed: false,
    maxImages: 2
  }, {
    id: "SORA2",
    durationOptions: [4, 8, 12],
    pricePerSecond: 44,
    isStyleSelectionAllowed: false,
    isAspectRatioSelectionAllowed: true,
    isSoundEffectsAllowed: false,
    maxImages: 1
  }]
};
class Choizzy {
  constructor() {
    this.uid = null;
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        "User-Agent": "Ktor client",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Accept-Charset": "UTF-8",
        Connection: "Keep-Alive"
      },
      params: {
        platform: PLATFORM
      }
    });
    this.rc = axios.create({
      baseURL: RC_BASE,
      headers: {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        "Accept-Encoding": "gzip",
        "X-Platform": "android",
        "X-Platform-Flavor": "native",
        "X-Platform-Version": "35",
        "X-Platform-Device": "RMX3890",
        "X-Platform-Brand": "realme",
        "X-Version": "9.14.1",
        "X-Client-Version": "1.1.4",
        "X-Client-Bundle-ID": "io.candy.studio",
        "X-Observer-Mode-Enabled": "false",
        "X-Is-Debug-Build": "false",
        Authorization: `Bearer ${RC_KEY}`
      }
    });
  }
  _log(tag, msg, x = "") {
    console.log(`[${new Date().toISOString()}] [${tag}]`, msg, x ?? "");
  }
  async _preCheck() {
    this._log("PRECHECK", "Fetching user generations history…");
    try {
      await this.http.get("user/generations", {
        params: {
          walletAddress: this.uid,
          limit: 20
        }
      });
      return {
        success: true
      };
    } catch (e) {
      this._log("PRECHECK", "Warn (non-fatal) →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async _rcReg() {
    this._log("RC", "Simulating RevenueCat bootstrapping…");
    const encoded = encodeURIComponent(this.uid);
    try {
      await this.rc.get(`/subscribers/${encoded}/offerings`);
    } catch (e) {
      this._log("RC", "Offerings warn →", e?.message);
    }
    try {
      await this.rc.get(`/subscribers/${encoded}`, {
        headers: {
          "X-Nonce": crypto.randomBytes(8).toString("base64")
        }
      });
      this._log("RC", "Subscriber registration profile verified ✓");
      return {
        success: true
      };
    } catch (e) {
      this._log("RC", "Profile warn →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async _auth() {
    this._log("AUTH", "Push register token…");
    try {
      const fakeFcmToken = "es1bcLhXR1q3AQL-" + crypto.randomBytes(70).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 140);
      await this.http.post("push/register", {
        walletAddress: this.uid,
        token: fakeFcmToken
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      this._log("AUTH", "Push token registered.");
      return {
        success: true
      };
    } catch (e) {
      this._log("AUTH", "Warn (non-fatal) →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async _activate() {
    this._log("ACTIVATE", "Hitting /user endpoint to provision account…");
    try {
      const {
        data
      } = await this.http.get("user", {
        params: {
          walletAddress: this.uid
        }
      });
      this._log("ACTIVATE", "Account Created/Synced → ID:", data?.user?.userId);
      return {
        success: true,
        data: data
      };
    } catch (e) {
      this._log("ACTIVATE", "Error activating user →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async init() {
    this._log("INIT", "Starting formal registration flow…");
    try {
      this.uid = `$RCAnonymousID:${crypto.randomUUID().replace(/-/g, "")}`;
      this._log("INIT", "Generated UID →", this.uid);
      await this._preCheck();
      await this._rcReg();
      await this._auth();
      const activeRes = await this._activate();
      if (!activeRes.success) return activeRes;
      this._log("INIT", "Registration done ✓");
      return {
        success: true,
        uid: this.uid
      };
    } catch (e) {
      this._log("INIT", "Fatal Registration Error →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async _bal() {
    this._log("CREDIT", "Fetching balance…");
    try {
      const {
        data
      } = await this.http.get("user/credits", {
        params: {
          walletAddress: this.uid
        }
      });
      this._log("CREDIT", "Current Balance →", data?.credits);
      return {
        success: true,
        credits: data?.credits ?? 0
      };
    } catch (e) {
      this._log("CREDIT", "Error →", e?.message);
      return {
        success: false,
        credits: 0,
        error: e?.message
      };
    }
  }
  async _claim() {
    this._log("CLAIM", "Claiming free credits…");
    try {
      const {
        data
      } = await this.http.post("claim", {}, {
        params: {
          walletAddress: this.uid,
          source: "candyStudio"
        }
      });
      this._log("CLAIM", "Result →", data?.success ? `+${data.creditsAmount}` : "FAIL");
      return {
        success: data?.success ?? false,
        data: data
      };
    } catch (e) {
      this._log("CLAIM", "Fatal Error →", e?.response?.data ? JSON.stringify(e.response.data) : e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async _ensureBal(needed) {
    this._log("CREDIT", `Need ${needed}`);
    let balRes = await this._bal();
    let credits = balRes.credits;
    if (credits < needed) {
      this._log("CREDIT", `Low (${credits} < ${needed}), claiming free pack…`);
      await this._claim();
      await new Promise(r => setTimeout(r, 1e3));
      balRes = await this._bal();
      credits = balRes.credits;
    }
    if (credits < needed) {
      return {
        success: false,
        error: `Not enough credits: ${credits} < ${needed}`
      };
    }
    return {
      success: true,
      credits: credits
    };
  }
  _find(type, id) {
    return (MODELS[type] ?? []).find(m => m.id === id);
  }
  _valModel(type, id) {
    const info = this._find(type, id);
    if (!info) return {
      success: false,
      error: `Unknown model "${id}"`
    };
    return {
      success: true,
      info: info
    };
  }
  _cost(info, imgCnt, dur) {
    if (info.pricePerSecond != null) return info.pricePerSecond * (dur || info.durationOptions?.[0] || 4);
    const extras = Math.max(0, imgCnt - ((info.addExtraCostStartingFromImage ?? 1) - 1));
    return info.price + extras * (info.extraCostPerImage ?? 0);
  }
  async _b64(src) {
    try {
      if (Buffer.isBuffer(src)) return src.toString("base64");
      if (typeof src === "string" && src.startsWith("data:")) return src.split(",")[1];
      if (typeof src === "string" && /^https?:\/\//.test(src)) {
        this._log("IMG", "URL fetch →", src);
        const {
          data
        } = await this.http.get(src, {
          responseType: "arraybuffer",
          params: {}
        });
        return Buffer.from(data).toString("base64");
      }
      return src;
    } catch (e) {
      this._log("IMG", "Error →", e?.message);
      return null;
    }
  }
  async _poll(imageId) {
    const deadline = Date.now() + TIMEOUT;
    this._log("POLL", "Polling loop started for Image ID →", imageId);
    try {
      while (Date.now() < deadline) {
        const {
          data
        } = await this.http.get("images/status", {
          params: {
            imageId: imageId,
            userId: this.uid
          }
        });
        this._log("POLL", `[Status: ${data?.status}]`, data?.imageUrl || "Processing…");
        if (data?.status === "completed") {
          this._log("POLL", "Generation successful ✓ Result URL ready.");
          return {
            success: true,
            ...data
          };
        }
        if (data?.status === "failed" || data?.errorReason) {
          return {
            success: false,
            error: `Generation failed at server: ${data?.errorReason ?? "unknown"}`
          };
        }
        await new Promise(r => setTimeout(r, INTERVAL));
      }
      return {
        success: false,
        error: `Poll timeout reached after ${TIMEOUT / 1e3} seconds`
      };
    } catch (e) {
      this._log("POLL", "Fatal Polling Error →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
  async generate(options = {}) {
    const {
      model = "regularBanana",
        aspectRatio = "1:1",
        prompt = "",
        image, ...rest
    } = options;
    try {
      if (!this.uid) {
        const initRes = await this.init();
        if (!initRes.success) return initRes;
      }
      const type = this._find("video", model) && !this._find("image", model) ? "video" : "image";
      this._log("GEN", "Type detection →", type);
      const mCheck = this._valModel(type, model);
      if (!mCheck.success) return mCheck;
      const info = mCheck.info;
      const imgs = [];
      if (image != null) {
        const inputs = Array.isArray(image) ? image : [image];
        this._log("IMG", `Resolving ${inputs.length} image inputs…`);
        for (const inp of inputs) {
          const b64Str = await this._b64(inp);
          if (b64Str) imgs.push(b64Str);
        }
      }
      if (imgs.length > (info.maxImages ?? Infinity)) {
        return {
          success: false,
          error: `Model "${model}" max allowable images is ${info.maxImages}, got ${imgs.length}`
        };
      }
      const cost = this._cost(info, imgs.length, rest?.duration);
      const balCheck = await this._ensureBal(cost);
      if (!balCheck.success) return balCheck;
      const basePayload = {
        userId: this.uid,
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio,
        ...imgs.length && {
          imagesBase64: imgs
        }
      };
      const payload = {
        ...basePayload,
        ...rest
      };
      this._log("GEN", "Submitting Generation task to queue…");
      const {
        data
      } = await this.http.post("images/generate/v3", payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      this._log("GEN", "Task accepted! Response ID →", data?.imageId);
      if (data?.status === "completed" && data?.imageUrl) {
        this._log("GEN", "Task resolved instantly →", data?.imageUrl);
        return {
          success: true,
          ...data
        };
      }
      return await this._poll(data?.imageId);
    } catch (e) {
      this._log("GEN", "Fatal Generator Error →", e?.message);
      return {
        success: false,
        error: e?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Choizzy();
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