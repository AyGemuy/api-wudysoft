import axios from "axios";
import NodeRSA from "node-rsa";
const BASE_URLS = {
  ACCOUNT: "https://llm-account-service.aperogroup.ai",
  AI_METART: "https://api-metart.aperogroup.ai",
  IMG_GEN_WRAPPER: "https://api-img-gen-wrapper.aperogroup.ai",
  ART_PREMIUM: "https://art-premium-core.aperogroup.ai",
  BEAUTY: "https://beauty-core.aperogroup.ai",
  CLOTHES: "https://cloth-change-core.aperogroup.ai",
  ENHANCE: "https://enhance-core.aperogroup.ai",
  OUTPAINT: "https://core-outpaint.aperogroup.ai",
  FITTING: "https://fitting-core.aperogroup.ai",
  RESTORE: "https://image-restore-core.aperogroup.ai",
  REMOVE_OBJECT: "https://objectremoval-core.aperogroup.ai",
  SEGMENT: "https://segment-core.aperogroup.ai",
  STYLE_MANAGER: "https://api-style-manager.aperogroup.ai",
  STYLE_MANAGER_VN: "https://api-style-manager.apero.vn",
  CONTENT_MANAGEMENT: "https://content-management.dev.aperogroup.ai",
  VIDEO_GEN: "https://video-gen-core.aperogroup.ai"
};
const EP = {
  SILENT_LOGIN: "/saas-user-service/v1/users/silent-login",
  GET_CATEGORIES: "/api/v1/strapi/categories",
  GET_CATEGORY_TEMPLATES: "/api/v1/strapi/categories/{categoryId}/templates",
  PRESIGNED_URL: "/api/ai-generation/presigned-url",
  GENERATE_IMAGE: "/api/ai-generation/image",
  TIMESTAMP: "/timestamp",
  ART_AI_PRESIGNED: "/api/v5/image-ai/presigned-link",
  ART_AI_GENERATE: "/api/v5/image-ai",
  ART_PREMIUM_PRESIGNED: "/api/v5/art-premium/presigned-link",
  ART_PREMIUM_GENERATE: "/api/v5/art-premium",
  ENHANCE_PRESIGNED: "/api/v5/image-enhance/presigned-link",
  ENHANCE_GENERATE: "/api/v5/image-enhance",
  BEAUTY_PRESIGNED: "/api/v5/beauty/presigned-link",
  BEAUTY_GENERATE: "/api/v5/beauty",
  BODY_BEAUTIFY_V4: "/api/v4/beauty",
  CLOTHES_PRESIGNED: "/api/v5/clothes-changing/presigned-link",
  CLOTHES_GENERATE: "/api/v5/clothes-changing",
  FITTING_PRESIGNED: "/api/v5/fitting/presigned-link",
  FITTING_GENERATE: "/api/v5/fitting",
  REMOVE_BG_PRESIGNED: "/api/v5/remove-background/presigned-link",
  REMOVE_BG_GENERATE: "/api/v5/remove-background",
  REMOVE_OBJECT_PRESIGNED: "/api/v5/remove-object/presigned-link",
  REMOVE_OBJECT_GENERATE: "/api/v5/remove-object",
  SEGMENT_PRESIGNED: "/api/v5/segment/presigned-link",
  SEGMENT_GENERATE: "/api/v5/segment",
  RESTORE_PRESIGNED: "/api/v5/image-restore/presigned-link",
  RESTORE_GENERATE: "/api/v5/image-restore",
  EXPAND_PRESIGNED: "/api/v5/image-outpainting/presigned-link",
  EXPAND_GENERATE: "/api/v5/image-outpainting",
  INPAINTING_GENERATE: "/api/v1/image-inpainting",
  ANIMAL_FUSION_PRESIGNED: "/api/v5/image-2-video/presigned-link",
  ANIMAL_FUSION_GENERATE: "/api/v5/image-2-video",
  ANIMAL_FUSION_VIDEO_INFO: "/api/v5/image-2-video/video/{videoId}",
  TEXT_TO_IMAGE_GENERATE: "/api/v5/premium/text-2-image",
  QWEN_PRESIGNED: "/api/v5.1/qwen-editing/presigned-link",
  QWEN_GENERATE: "/api/v5.1/qwen-editing",
  AI_STYLES: "/category",
  STYLE_EXTERNAL: "/style-external/styles",
  BEAUTY_STYLES_CMS: "/api/aip-698s"
};
class Apero {
  constructor() {
    const defKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5z8DrSdxAFy5ju27JzxUDGD5OdPRnKVrXPypiBVT7NK4ltgbcud3+Li3H1DiAFNvaSDPumZMEbAkfGWZ6s3KtiI7TRmZwQ2yyH6mug6GhrCLD6CZJUQ2CPmhO3JYTYOgN53E6hwm/Teb9I156S04qHjLLLBxk9Mklu5X06kdhMBYwHFAZ3oByeoWUryrQC0Mv9C5ZahKzoQNuJNL2sv+ws2e5Zaj8Rid4AjhvqB6dYhWP4QM+0IiNjs/j08aRgcyOrenbQEIieU+XF6mQWF2Jfg317e0KjWnpru+uPVVgrEn9rNvQeXu2u4SZhT6rnLQzBLbJrngNw3gXfxxsoowIDAQAB";
    this.pubKey = defKey.replace(/\s+/g, "");
    this.keyId = "sk-7uHS6fiWRSsMs2P4VChqSeReLlWp7w24yUmTWTuUaZFACiX4AT";
    this.token = "not_get_api_token";
    this.baseHdrs = {
      "User-Agent": "okhttp/4.12.0",
      Accept: "application/json",
      "country-code": "en",
      "app-name": "AI_AIP688_Superminds_Android",
      device: "android",
      "x-api-bundleid": "aiart.ai.photo.aiphotogenerator",
      "app-version": "2.3.1"
    };
    this.VALID_MODES = ["image", "image-p", "qwen", "enhance", "restore", "beauty", "clothes", "fitting", "removebg", "removeobject", "segment", "expand", "animalfusion", "inpainting", "texttoimage"];
    this.REQUIRED_INPUTS = {
      image: ["image", "prompt", "styleId"],
      "image-p": ["image", "prompt", "styleId"],
      qwen: ["image", "prompt"],
      enhance: ["image"],
      restore: ["image"],
      beauty: ["image", "styleId"],
      clothes: ["image", "styleId"],
      fitting: ["image", "styleId"],
      removebg: ["image"],
      removeobject: ["image"],
      segment: ["image"],
      expand: ["image"],
      animalfusion: ["image", "styleId"],
      inpainting: [],
      texttoimage: ["prompt"]
    };
  }
  fmtKey(b64) {
    const clean = b64.replace(/[\r\n\s]+/g, "");
    const chunks = clean.match(/.{1,64}/g) || [clean];
    return `-----BEGIN PUBLIC KEY-----\n${chunks.join("\n")}\n-----END PUBLIC KEY-----`;
  }
  sig(ts) {
    try {
      const rsa = new NodeRSA();
      rsa.importKey(this.fmtKey(this.pubKey), "public");
      rsa.setOptions({
        encryptionScheme: "pkcs1"
      });
      const rnd = Math.floor(Math.random() * 1e6);
      return rsa.encrypt(Buffer.from(`${ts}@@@${this.keyId}@@@${rnd}`, "utf8"), "base64");
    } catch (err) {
      console.error(" ✘ [Sig Error]:", err.message);
      return "";
    }
  }
  hdrs() {
    const ts = String(Date.now());
    return {
      ...this.baseHdrs,
      "x-api-signature": this.sig(ts),
      "x-api-timestamp": ts,
      "x-api-keyid": this.keyId,
      "x-api-token": this.token
    };
  }
  async img(src) {
    try {
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("http")) {
          console.log(" ✦ [Fetch Img] Mengunduh gambar asset...");
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (/^[A-Za-z0-9+/=]+$/.test(src.replace(/[\n\s]/g, "")) || src.includes("base64,")) {
          return Buffer.from(src.includes("base64,") ? src.split("base64,")[1] : src, "base64");
        }
      }
      return null;
    } catch (err) {
      console.error(" ✘ [Img Error]:", err.message);
      return null;
    }
  }
  async generate(options = {}) {
    try {
      let {
        mode,
        prompt,
        image,
        file,
        styleId,
        ...rest
      } = options;
      if (!mode || !this.VALID_MODES.includes(mode.toLowerCase())) {
        return {
          success: false,
          error: "INVALID_MODE",
          message: `Mode "${mode}" tidak terdaftar dalam manifest routing system.`,
          availableModes: this.VALID_MODES
        };
      }
      mode = mode.toLowerCase();
      console.log(` ✦ [Alur Mulai] Memulai pemrosesan AI dengan Mode: [${mode.toUpperCase()}]`);
      const targetImage = image || file;
      const payloadMapForCheck = {
        mode: mode,
        prompt: prompt,
        image: targetImage,
        file: targetImage,
        styleId: styleId
      };
      const missingFields = [];
      for (const reqField of this.REQUIRED_INPUTS[mode]) {
        if (!payloadMapForCheck[reqField]) {
          missingFields.push(reqField);
        }
      }
      if (missingFields.length > 0) {
        return {
          success: false,
          error: "MISSING_REQUIRED_INPUT",
          message: `Gagal memproses mode [${mode.toUpperCase()}]. Field berikut wajib diisi!`,
          missingFields: missingFields,
          requiredSchema: this.REQUIRED_INPUTS[mode]
        };
      }
      const rawSources = targetImage || [];
      const sources = Array.isArray(rawSources) ? rawSources : [rawSources];
      let buffers = [];
      if (mode !== "texttoimage" && mode !== "inpainting") {
        for (const src of sources) {
          const buf = await this.img(src);
          if (buf) buffers.push(buf);
        }
        if (buffers.length === 0) {
          return {
            success: false,
            error: "BUFFER_CONVERSION_FAILED",
            message: "Seluruh input file/image gagal diubah menjadi buffer."
          };
        }
      }
      let preUrl = "";
      let renderUrl = "";
      let payload = {};
      switch (mode) {
        case "image":
          preUrl = BASE_URLS.IMG_GEN_WRAPPER + EP.ART_AI_PRESIGNED;
          renderUrl = BASE_URLS.IMG_GEN_WRAPPER + EP.ART_AI_GENERATE;
          break;
        case "image-p":
          preUrl = BASE_URLS.ART_PREMIUM + EP.ART_PREMIUM_PRESIGNED;
          renderUrl = BASE_URLS.ART_PREMIUM + EP.ART_PREMIUM_GENERATE;
          break;
        case "qwen":
          preUrl = BASE_URLS.IMG_GEN_WRAPPER + EP.QWEN_PRESIGNED;
          renderUrl = BASE_URLS.IMG_GEN_WRAPPER + EP.QWEN_GENERATE;
          break;
        case "enhance":
          preUrl = BASE_URLS.ENHANCE + EP.ENHANCE_PRESIGNED;
          renderUrl = BASE_URLS.ENHANCE + EP.ENHANCE_GENERATE;
          break;
        case "restore":
          preUrl = BASE_URLS.RESTORE + EP.RESTORE_PRESIGNED;
          renderUrl = BASE_URLS.RESTORE + EP.RESTORE_GENERATE;
          break;
        case "beauty":
          preUrl = BASE_URLS.BEAUTY + EP.BEAUTY_PRESIGNED;
          renderUrl = BASE_URLS.BEAUTY + EP.BEAUTY_GENERATE;
          break;
        case "clothes":
          preUrl = BASE_URLS.CLOTHES + EP.CLOTHES_PRESIGNED;
          renderUrl = BASE_URLS.CLOTHES + EP.CLOTHES_GENERATE;
          break;
        case "fitting":
          preUrl = BASE_URLS.FITTING + EP.FITTING_PRESIGNED;
          renderUrl = BASE_URLS.FITTING + EP.FITTING_GENERATE;
          break;
        case "removebg":
          preUrl = BASE_URLS.OUTPAINT + EP.REMOVE_BG_PRESIGNED;
          renderUrl = BASE_URLS.OUTPAINT + EP.REMOVE_BG_GENERATE;
          break;
        case "removeobject":
          preUrl = BASE_URLS.REMOVE_OBJECT + EP.REMOVE_OBJECT_PRESIGNED;
          renderUrl = BASE_URLS.REMOVE_OBJECT + EP.REMOVE_OBJECT_GENERATE;
          break;
        case "segment":
          preUrl = BASE_URLS.SEGMENT + EP.SEGMENT_PRESIGNED;
          renderUrl = BASE_URLS.SEGMENT + EP.SEGMENT_GENERATE;
          break;
        case "expand":
          preUrl = BASE_URLS.OUTPAINT + EP.EXPAND_PRESIGNED;
          renderUrl = BASE_URLS.OUTPAINT + EP.EXPAND_GENERATE;
          break;
        case "animalfusion":
          preUrl = BASE_URLS.VIDEO_GEN + EP.ANIMAL_FUSION_PRESIGNED;
          renderUrl = BASE_URLS.VIDEO_GEN + EP.ANIMAL_FUSION_GENERATE;
          break;
        case "inpainting":
          renderUrl = BASE_URLS.IMG_GEN_WRAPPER + EP.INPAINTING_GENERATE;
          break;
        case "texttoimage":
          renderUrl = BASE_URLS.IMG_GEN_WRAPPER + EP.TEXT_TO_IMAGE_GENERATE;
          break;
      }
      let s3Paths = [];
      const bypassPresigned = ["inpainting", "texttoimage"].includes(mode);
      if (!bypassPresigned) {
        for (const buf of buffers) {
          console.log(` ✦ [S3 Link] Mengambil token upload ke-[${s3Paths.length + 1}] untuk mode: [${mode.toUpperCase()}]`);
          const linkRes = await axios.get(preUrl, {
            headers: this.hdrs()
          });
          const {
            url: upUrl,
            path: pathKey,
            presignedUrl,
            objectKey
          } = linkRes?.data?.data || linkRes?.data || {};
          const finalUploadUrl = upUrl || presignedUrl;
          const finalPath = pathKey || objectKey || "";
          if (!finalUploadUrl || !finalPath) {
            console.error(" ✘ [S3 Error]: Gagal mendapatkan key upload untuk buffer ini. Skip.");
            continue;
          }
          console.log(` ✦ [S3 Upload] Mentransfer upload buffer (${buf.length} bytes) ke Cloud...`);
          await axios.put(finalUploadUrl, buf, {
            headers: {
              "Content-Type": "image/png",
              "Content-Length": buf.length
            }
          });
          s3Paths.push(finalPath);
        }
        if (s3Paths.length === 0) {
          return {
            success: false,
            error: "S3_UPLOAD_FAILED",
            message: "Gagal mengupload semua data gambar ke AWS S3 Storage."
          };
        }
      }
      const structureSingle = s3Paths[0] || "";
      switch (mode) {
        case "image":
        case "image-p":
        case "beauty":
        case "clothes":
        case "fitting":
        case "removebg":
        case "removeobject":
        case "segment":
        case "expand":
        case "animalfusion":
          payload = {
            file: structureSingle,
            files: s3Paths,
            prompt: prompt || "",
            styleId: styleId || "",
            ...rest
          };
          break;
        case "qwen":
          payload = {
            files: s3Paths,
            mode: rest.qwenMode || "editing",
            positivePrompt: prompt || "",
            ...rest
          };
          break;
        case "enhance":
        case "restore":
          payload = {
            file: structureSingle,
            ...rest
          };
          break;
        case "inpainting":
          payload = rest;
          break;
        case "texttoimage":
          payload = {
            prompt: prompt || "",
            ...rest
          };
          break;
      }
      console.log(" ✦ [Core Render] Menembak payload akhir ke Core Microservice Gateway...");
      const isFormData = payload instanceof Object && payload.constructor?.name === "FormData" || typeof payload?.append === "function";
      const res = await axios.post(renderUrl, payload, {
        headers: {
          ...this.hdrs(),
          ...isFormData ? {} : {
            "Content-Type": "application/json"
          }
        }
      });
      console.log(` ✔ [Sukses] Operasi mode [${mode.toUpperCase()}] selesai diproses.`);
      return res?.data?.data || res?.data || null;
    } catch (err) {
      console.error(" ✘ [Generate Error Failure]:", err.response?.data || err.message);
      return null;
    }
  }
  async styles(options = {}) {
    try {
      let {
        mode = "image",
          project,
          styleType,
          isApp,
          appName,
          sheet,
          pageNumber = 1,
          itemsPerPage = 20
      } = options;
      if (!this.VALID_MODES.includes(mode.toLowerCase()) && mode.toLowerCase() !== "cms" && mode.toLowerCase() !== "external") {
        return {
          success: false,
          error: "INVALID_STYLES_MODE",
          message: `Gagal menarik kategori gaya. Mode "${mode}" tidak valid.`,
          availableModes: [...this.VALID_MODES, "cms", "external"]
        };
      }
      const type = mode.toLowerCase();
      console.log(` ✦ [Styles API] Mengambil data kategori gaya untuk mode: [${type.toUpperCase()}]`);
      if (["clothes", "image-p", "animalfusion", "external"].includes(type)) {
        const targetApp = appName || "AI_AIP688_Superminds_Android";
        const targetSheet = sheet || (type === "clothes" ? "clothes" : type === "animalfusion" ? "animal_fusion" : "art_premium");
        const res = await axios.get(BASE_URLS.STYLE_MANAGER + EP.STYLE_EXTERNAL, {
          headers: this.hdrs(),
          params: {
            appName: targetApp,
            sheet: targetSheet
          }
        });
        return res?.data?.data || res?.data || [];
      }
      if (["beauty", "cms"].includes(type)) {
        const res = await axios.get(BASE_URLS.CONTENT_MANAGEMENT + EP.BEAUTY_STYLES_CMS, {
          headers: this.hdrs(),
          params: {
            "pagination[page]": pageNumber,
            "pagination[pageSize]": itemsPerPage,
            "sort[0]": "id:asc",
            populate: "*"
          }
        });
        return res?.data?.data || res?.data || null;
      }
      const proj = project || "AI_Mitu_Supermind_Android";
      const sType = styleType || "";
      const app = isApp !== undefined ? isApp : "true";
      const url = `${BASE_URLS.STYLE_MANAGER_VN}${EP.AI_STYLES}?project=${proj}&styleType=${sType}&isApp=${app}`;
      const res = await axios.get(url, {
        headers: this.hdrs()
      });
      return res?.data?.data || res?.data || [];
    } catch (err) {
      console.error(` ✘ [Styles Error Mode ${options.mode}]:`, err.response?.data || err.message);
      return [];
    }
  }
  async getTimestamp() {
    try {
      const res = await axios.get(BASE_URLS.IMG_GEN_WRAPPER + EP.TIMESTAMP, {
        headers: this.hdrs()
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      return null;
    }
  }
  async getVideoInfo(videoId) {
    try {
      console.log(` ✦ [Video Info] Polling videoId: ${videoId}...`);
      const endpoint = EP.ANIMAL_FUSION_VIDEO_INFO.replace("{videoId}", videoId);
      const res = await axios.get(BASE_URLS.VIDEO_GEN + endpoint, {
        headers: this.hdrs()
      });
      return res?.data?.data || res?.data || null;
    } catch (err) {
      console.error(" ✘ [Video Info Error]:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "styles"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=styles"
      }
    });
  }
  const api = new Apero();
  try {
    let response;
    switch (action) {
      case "generate":
        response = await api.generate(params);
        break;
      case "styles":
        response = await api.styles(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      status: true,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}