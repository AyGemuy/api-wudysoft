import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class ImggenAi {
  constructor() {
    console.log("[ImggenAi] Initializing instance...");
    try {
      this.jar = new CookieJar();
      this.client = wrapper(axios.create({
        jar: this.jar,
        withCredentials: true
      }));
      this.base = "https://imggen.ai";
      this.deviceId = this._did();
      this.cfg = {
        "generate-image": ["prompt"],
        "upscale-image": ["image"],
        "remove-watermark": ["image"],
        "unblur-image": ["image"],
        "restore-image": ["image"],
        "remove-text": ["image"],
        "blur-background": ["image"],
        "colorize-image": ["image"],
        "retouch-photo": ["image"],
        "enhance-face": ["image"],
        "generate-shadow": ["image"],
        "brighten-image": ["image"],
        "correct-colors": ["image"],
        "sharpen-image": ["image"],
        "upscale-image-4k": ["image"],
        "unpixelate-image": ["image"],
        "convert-to-hd": ["image"],
        "enhance-photo": ["image"]
      };
      console.log("[ImggenAi] Initialization completed.");
    } catch (error) {
      console.error("[ImggenAi] Error during initialization:", error.message);
    }
  }
  _did() {
    try {
      console.log("[ImggenAi] Generating device fingerprint ID...");
      const fp = {
        userAgent: `Mozilla/5.0 (Linux; Android ${[ 10, 11, 12, 13 ][Math.floor(Math.random() * 4)]}; ${[ "K", "SM-G973F", "Pixel 6" ][Math.floor(Math.random() * 3)]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 8) + 120}.0.0.0 Mobile Safari/537.36`,
        language: ["id-ID", "en-US", "en-GB"][Math.floor(Math.random() * 3)],
        colorDepth: [24, 30][Math.floor(Math.random() * 2)],
        deviceMemory: [4, 6, 8, 12][Math.floor(Math.random() * 4)],
        hardwareConcurrency: [4, 6, 8, 12][Math.floor(Math.random() * 4)],
        ...(() => {
          const res = [
            [1080, 1920],
            [1080, 2400],
            [720, 1280]
          ][Math.floor(Math.random() * 3)];
          const tz = [{
            offset: -420,
            name: "Asia/Jakarta"
          }, {
            offset: -480,
            name: "Asia/Singapore"
          }, {
            offset: 0,
            name: "UTC"
          }][Math.floor(Math.random() * 3)];
          return {
            screenResolution: res,
            availableScreenResolution: res,
            timezoneOffset: tz.offset,
            timezone: tz.name
          };
        })(),
        sessionStorage: true,
        localStorage: true,
        indexedDb: true,
        addBehavior: false,
        openDatabase: false,
        cpuClass: undefined,
        platform: ["Linux armv8l", "Linux x86_64"][Math.floor(Math.random() * 2)],
        plugins: [],
        canvas: "",
        webgl: "",
        webglVendorAndRenderer: "",
        adBlock: Math.random() < .5,
        hasLiedLanguages: false,
        hasLiedResolution: false,
        hasLiedOs: false,
        hasLiedBrowser: false,
        touchSupport: [
          [1, 5, 1],
          [5, 5, 1]
        ][Math.floor(Math.random() * 2)],
        fonts: ["Arial", "Times New Roman", "Courier New", "Verdana", "Georgia"]
      };
      const h1 = crypto.createHash("md5").update(JSON.stringify(fp)).digest("hex");
      const pos = [
        [0, 2],
        [1, 5],
        [2, 3],
        [3, 4],
        [4, 1],
        [5, 7],
        [6, 0],
        [7, 6]
      ];
      const h2 = crypto.createHash("md5").update(pos.toString()).digest("hex");
      const blk1 = [],
        blk2 = [];
      for (let i = 0; i < 32; i += 4) {
        blk1.push(h1.substring(i, i + 4));
        blk2.push(h2.substring(i, i + 4));
      }
      for (const [i1, i2] of pos) {
        const tmp = blk1[i1];
        blk1[i1] = blk2[i2];
        blk2[i2] = tmp;
      }
      const deviceId = blk1.join("") + blk2.join("");
      console.log(`[ImggenAi] Device ID generated: ${deviceId}`);
      return deviceId;
    } catch (error) {
      console.error("[ImggenAi] Error generating Device ID:", error.message);
      return null;
    }
  }
  _hdrs(type = "api", opt = {}) {
    try {
      const devId = opt.deviceId || this.deviceId;
      const common = {
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const headersMap = {
        init: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          priority: "u=0, i",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        api: {
          accept: "text/html, application/xhtml+xml",
          priority: "u=1, i",
          referer: `${this.base}/tools/photo-enhancer`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-device-id": devId,
          "x-inertia": "true",
          "x-inertia-version": "1",
          "x-requested-with": "XMLHttpRequest",
          "x-xsrf-token": opt.token || ""
        }
      };
      return {
        ...common,
        ...headersMap[type] || headersMap.api,
        ...opt.custom
      };
    } catch (error) {
      console.error("[ImggenAi] Error building request headers:", error.message);
      return {};
    }
  }
  async _proc(img) {
    try {
      const isUrl = typeof img === "string" && /^https?:\/\//.test(img);
      const isB64 = typeof img === "string" && img.startsWith("data:");
      if (isUrl) {
        console.log(`[ImggenAi] Resolving image from URL: ${img}`);
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (isB64) {
        console.log("[ImggenAi] Resolving image from Base64 string");
        const clean = img.split(",")[1] || img;
        return Buffer.from(clean, "base64");
      }
      if (Buffer.isBuffer(img)) {
        return img;
      }
      return Buffer.from(img || "");
    } catch (error) {
      console.error("[ImggenAi] Error processing image:", error.message);
      return Buffer.alloc(0);
    }
  }
  async _tk() {
    try {
      const cookies = await this.jar.getCookies(this.base);
      const token = cookies.find(c => c.key === "XSRF-TOKEN");
      if (token) {
        return decodeURIComponent(token.value);
      }
      return "";
    } catch (error) {
      console.error("[ImggenAi] Error extracting XSRF-TOKEN:", error.message);
      return "";
    }
  }
  async generate(payload) {
    try {
      const {
        mode,
        ...rest
      } = payload;
      const devId = rest.deviceId || this.deviceId;
      if (!mode) {
        return {
          status: false,
          result: "Parameter 'mode' is required."
        };
      }
      if (!this.cfg[mode]) {
        return {
          status: false,
          result: `Mode '${mode}' is not supported.`,
          supported_modes: Object.keys(this.cfg)
        };
      }
      const requiredInputs = this.cfg[mode];
      for (const field of requiredInputs) {
        if (!rest[field]) {
          return {
            status: false,
            result: `Field '${field}' is required for mode '${mode}'`
          };
        }
      }
      console.log(`[ImggenAi] Starting task with mode: ${mode}`);
      let endpoint = "";
      switch (mode) {
        case "generate-image":
          endpoint = "/api/v1/ai/generate-image";
          break;
        case "upscale-image":
          endpoint = "/api/v1/ai/upscale-image";
          break;
        case "remove-watermark":
          endpoint = "/api/v1/ai/remove-watermark";
          break;
        case "unblur-image":
          endpoint = "/api/v1/ai/unblur-image";
          break;
        case "restore-image":
          endpoint = "/api/v1/ai/restore-image";
          break;
        case "remove-text":
          endpoint = "/api/v1/ai/remove-text";
          break;
        case "blur-background":
          endpoint = "/api/v1/ai/blur-background";
          break;
        case "colorize-image":
          endpoint = "/api/v1/ai/colorize-image";
          break;
        case "retouch-photo":
          endpoint = "/api/v1/ai/retouch-photo";
          break;
        case "enhance-face":
          endpoint = "/api/v1/ai/enhance-face";
          break;
        case "generate-shadow":
          endpoint = "/api/v1/ai/generate-shadow";
          break;
        case "brighten-image":
          endpoint = "/api/v1/ai/brighten-image";
          break;
        case "correct-colors":
          endpoint = "/api/v1/ai/correct-colors";
          break;
        case "sharpen-image":
          endpoint = "/api/v1/ai/sharpen-image";
          break;
        case "upscale-image-4k":
          endpoint = "/api/v1/ai/upscale-image-4k";
          break;
        case "unpixelate-image":
          endpoint = "/api/v1/ai/unpixelate-image";
          break;
        case "convert-to-hd":
          endpoint = "/api/v1/ai/convert-to-hd";
          break;
        case "enhance-photo":
          endpoint = "/api/v1/ai/enhance-photo";
          break;
        default:
          return {
            status: false,
              result: `Endpoint path mapping for mode '${mode}' was not found.`
          };
      }
      console.log("[ImggenAi] Loading initial tool page...");
      await this.client.get(`${this.base}/tools/photo-enhancer`, {
        headers: this._hdrs("init", {
          deviceId: devId
        })
      });
      const token = await this._tk();
      let requestData;
      let customHeaders = {};
      if (requiredInputs.includes("image")) {
        const fileBuffer = await this._proc(rest.image);
        const form = new FormData();
        form.append("image", fileBuffer, {
          filename: rest.filename || "photo_input.jpg",
          contentType: rest.contentType || "image/jpeg"
        });
        requestData = form;
        customHeaders = {
          ...form.getHeaders(),
          origin: this.base
        };
      } else {
        requestData = {
          prompt: rest.prompt,
          samples: rest.samples || "1",
          token: rest.token || ""
        };
        customHeaders = {
          "Content-Type": "application/json",
          origin: this.base
        };
      }
      console.log(`[ImggenAi] Sending request to: ${endpoint}`);
      const uploadRes = await this.client.post(`${this.base}${endpoint}`, requestData, {
        headers: this._hdrs("api", {
          token: token,
          deviceId: devId,
          custom: customHeaders
        })
      });
      let path = uploadRes?.data?.proccessed_image || uploadRes?.data?.result?.proccessed_image || "";
      if (!path) {
        console.log("[ImggenAi] Checking alternative path source...");
        const dlRes = await this.client.get(`${this.base}/tools/photo-enhancer/download`, {
          headers: this._hdrs("api", {
            token: token,
            deviceId: devId
          })
        });
        path = dlRes?.data?.props?.data?.result?.proccessed_image || "";
      }
      if (path) {
        return {
          status: true,
          result: path.startsWith("http") ? path : `${this.base}${path}`
        };
      } else {
        return {
          status: false,
          result: "Processing succeeded, but output path could not be resolved."
        };
      }
    } catch (err) {
      console.error("[ImggenAi] Error during process:", err.message);
      return {
        status: false,
        result: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ImggenAi();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      status: false,
      result: error.message || "Terjadi kesalahan saat memproses request."
    });
  }
}