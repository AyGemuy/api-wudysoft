import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class ImageToImageAI {
  constructor() {
    try {
      this.baseUrl = "https://www.imagetoimageai.ai";
      this.models = [{
        value: "gpt-image-2-image-to-image",
        label: "GPT-Image 2",
        provider: "kie",
        scenes: ["image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["auto", "1:1", "9:16", "16:9", "4:3", "3:4"],
        maxImages: 16,
        maxSizeMB: 10,
        resolution: ["1K", "2K", "4K"],
        defaultResolution: "1K"
      }, {
        value: "gpt-image-2-text-to-image",
        label: "GPT-Image 2",
        provider: "kie",
        scenes: ["text-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["auto", "1:1", "9:16", "16:9", "4:3", "3:4"],
        resolution: ["1K", "2K", "4K"],
        defaultResolution: "1K"
      }, {
        value: "wan/2-7-image",
        label: "Wan 2.7 Image",
        provider: "kie",
        scenes: ["text-to-image", "image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "auto"],
        maxImages: 9,
        maxSizeMB: 10,
        maxN: 4,
        resolution: ["1K", "2K"],
        defaultResolution: "1K"
      }, {
        value: "google/nano-banana-edit",
        label: "Nano Banana",
        provider: "kie",
        scenes: ["image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "auto"],
        maxImages: 10,
        maxSizeMB: 10
      }, {
        value: "google/nano-banana",
        label: "Nano Banana",
        provider: "kie",
        scenes: ["text-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "auto"]
      }, {
        value: "nano-banana-2",
        label: "Nano Banana 2",
        provider: "kie",
        scenes: ["text-to-image", "image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "1:4", "4:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "1:8", "8:1", "5:4", "4:5", "21:9", "auto"],
        maxImages: 14,
        maxSizeMB: 30,
        resolution: ["1K", "2K", "4K"],
        defaultResolution: "1K"
      }, {
        value: "nano-banana-pro",
        label: "Nano Banana Pro",
        provider: "kie",
        scenes: ["text-to-image", "image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "auto"],
        maxImages: 8,
        maxSizeMB: 30,
        resolution: ["1K", "2K", "4K"],
        defaultResolution: "1K"
      }, {
        value: "gpt-image/1.5-image-to-image",
        label: "GPT-Image 1.5",
        provider: "kie",
        scenes: ["image-to-image"],
        defaultSize: "3:2",
        aspectRatios: ["1:1", "2:3", "3:2"],
        maxImages: 16,
        maxSizeMB: 10,
        resolution: ["medium", "high"],
        defaultResolution: "medium"
      }, {
        value: "gpt-image/1.5-text-to-image",
        label: "GPT-Image 1.5",
        provider: "kie",
        scenes: ["text-to-image"],
        defaultSize: "3:2",
        aspectRatios: ["1:1", "2:3", "3:2"],
        resolution: ["medium", "high"],
        defaultResolution: "medium"
      }, {
        value: "gpt4o",
        label: "GPT-4o",
        provider: "kie",
        scenes: ["text-to-image", "image-to-image"],
        defaultSize: "3:2",
        aspectRatios: ["1:1", "2:3", "3:2"],
        maxImages: 1,
        maxSizeMB: 10
      }, {
        value: "seedream/4.5-text-to-image",
        label: "Seedream 4.5",
        provider: "kie",
        scenes: ["text-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "21:9"],
        quality: ["basic", "high"]
      }, {
        value: "seedream/4.5-edit",
        label: "Seedream 4.5",
        provider: "kie",
        scenes: ["image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "21:9"],
        maxImages: 14,
        maxSizeMB: 10,
        quality: ["basic", "high"]
      }, {
        value: "flux-2/pro-image-to-image",
        label: "Flux 2 Pro",
        provider: "kie",
        scenes: ["image-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "auto"],
        maxImages: 8,
        maxSizeMB: 10,
        resolution: ["1K", "2K"],
        defaultResolution: "1K"
      }, {
        value: "flux-2/pro-text-to-image",
        label: "Flux 2 Pro",
        provider: "kie",
        scenes: ["text-to-image"],
        defaultSize: "16:9",
        aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "auto"],
        resolution: ["1K", "2K"],
        defaultResolution: "1K"
      }];
      this.allAspectRatios = ["auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "1:4", "4:1", "1:8", "8:1"];
    } catch (err) {
      console.error(`[ImageToImageAI] Error constructor: ${err?.message}`);
    }
  }
  _createClient(cookieString = "") {
    try {
      return axios.create({
        baseURL: this.baseUrl,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: this.baseUrl,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `${this.baseUrl}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          ...cookieString ? {
            cookie: cookieString
          } : {}
        },
        timeout: 12e4
      });
    } catch (err) {
      console.error(`[ImageToImageAI] Error _createClient: ${err?.message}`);
      return axios.create({
        baseURL: this.baseUrl
      });
    }
  }
  async _resolveSession(state) {
    try {
      if (state && typeof state === "string") {
        try {
          const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
          if (decoded.token && decoded.cookie) {
            return {
              ...decoded,
              rawState: state
            };
          }
        } catch (parseErr) {
          console.warn(`[ImageToImageAI] Parse state warning: ${parseErr?.message}`);
        }
      }
      console.log("[ImageToImageAI] Mengenerate akun sesi baru...");
      const randHex = crypto.randomBytes(4).toString("hex");
      const email = `user_${Date.now()}_${randHex}@gmail.com`;
      const password = `Pass!${crypto.randomBytes(6).toString("hex")}123`;
      const name = `Jhon_${randHex}`;
      const now = Date.now();
      const gaId = `${crypto.randomInt(1e8, 999999999)}.${Math.floor(now / 1e3)}`;
      const gState = JSON.stringify({
        i_l: 0,
        i_ll: now,
        i_b: `${crypto.randomBytes(16).toString("base64")}`,
        i_e: {
          enable_itp_optimization: 24
        },
        i_et: now
      });
      const gaSession = `GS2.1.s${Math.floor(now / 1e3)}$o1$g1$t${Math.floor(now / 1e3)}$j30$l0$h0`;
      const initialCookies = `_ga=GA1.1.${gaId}; g_state=${gState}; _ga_0FCZ80SYXG=${gaSession}`;
      const client = this._createClient(initialCookies);
      const signUpRes = await client.post("/api/auth/sign-up/email", {
        email: email,
        password: password,
        name: name
      });
      const data = signUpRes?.data;
      const token = data?.token;
      const userId = data?.user?.id;
      let sessionTokenCookie = "";
      const setCookieHeader = signUpRes.headers["set-cookie"];
      if (Array.isArray(setCookieHeader)) {
        const found = setCookieHeader.find(c => c.includes("session_token"));
        if (found) sessionTokenCookie = found.split(";")[0];
      }
      if (!sessionTokenCookie && token) {
        const sigSuffix = encodeURIComponent(crypto.randomBytes(16).toString("base64"));
        sessionTokenCookie = `__Secure-better-auth.session_token=${token}.${sigSuffix}`;
      }
      const fullCookie = `${initialCookies}; ${sessionTokenCookie}`;
      const sessionObj = {
        token: token,
        userId: userId,
        email: email,
        password: password,
        cookie: fullCookie
      };
      const rawState = Buffer.from(JSON.stringify(sessionObj)).toString("base64");
      console.log(`[ImageToImageAI] Sesi baru berhasil didaftarkan: ${email}`);
      return {
        ...sessionObj,
        rawState: rawState
      };
    } catch (err) {
      console.error(`[ImageToImageAI] Error _resolveSession: ${err?.message}`);
      throw new Error(`Gagal mendaftarkan akun sesi: ${err?.response?.data?.message || err?.message}`);
    }
  }
  async _resolveToBuffer(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return input;
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("data:")) {
          const base64Data = trimmed.split(",")[1];
          return Buffer.from(base64Data, "base64");
        }
        if (/^https?:\/\//i.test(trimmed)) {
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer",
            timeout: 2e4
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(trimmed, "base64");
      }
      return null;
    } catch (err) {
      console.error(`[ImageToImageAI] Error _resolveToBuffer: ${err?.message}`);
      return null;
    }
  }
  async _uploadImageStream(imageBuffer, client) {
    try {
      const fileName = `${crypto.randomUUID()}.jpg`;
      const fileType = "image/jpeg";
      const fileSize = imageBuffer.length;
      const presignRes = await client.post("/api/upload-file/presign", {
        fileName: fileName,
        fileType: fileType,
        fileSize: fileSize
      });
      const presignData = presignRes?.data?.data;
      if (!presignData?.uploadUrl || !presignData?.token) {
        throw new Error(presignRes?.data?.message || "Gagal memperoleh URL presign.");
      }
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: fileName,
        contentType: fileType,
        knownLength: fileSize
      });
      form.append("uploadPath", presignData.uploadPath);
      form.append("fileName", presignData.fileName);
      const uploadRes = await axios.post(presignData.uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID",
          authorization: `Bearer ${presignData.token}`,
          "cache-control": "no-cache",
          origin: this.baseUrl,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `${this.baseUrl}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        timeout: 6e4
      });
      const downloadUrl = uploadRes?.data?.data?.downloadUrl;
      if (!downloadUrl) {
        throw new Error("Gagal mendapatkan downloadUrl hasil upload.");
      }
      return downloadUrl;
    } catch (err) {
      console.error(`[ImageToImageAI] Error _uploadImageStream: ${err?.message}`);
      throw err;
    }
  }
  async _processAndUploadImages(rawImages, client) {
    try {
      const uploadedList = [];
      const imageArray = Array.isArray(rawImages) ? rawImages : [rawImages];
      for (const item of imageArray) {
        if (!item) continue;
        const imgBuffer = await this._resolveToBuffer(item);
        if (imgBuffer) {
          console.log(`[ImageToImageAI] Mengunggah input gambar (${imgBuffer.length} bytes)...`);
          const uploadedUrl = await this._uploadImageStream(imgBuffer, client);
          if (uploadedUrl) {
            uploadedList.push(uploadedUrl);
          }
        }
      }
      return uploadedList;
    } catch (err) {
      console.error(`[ImageToImageAI] Error _processAndUploadImages: ${err?.message}`);
      return [];
    }
  }
  _valModel(m, isImg2Img = false) {
    try {
      const scene = isImg2Img ? "image-to-image" : "text-to-image";
      if (!m) {
        const defModelValue = isImg2Img ? "wan/2-7-image" : "google/nano-banana";
        return this.models.find(item => item.value === defModelValue) || this.models[0];
      }
      const clean = m.toString().toLowerCase().trim();
      let matched = this.models.find(item => (item.value.toLowerCase() === clean || item.label.toLowerCase() === clean) && item.scenes.includes(scene));
      if (!matched) {
        matched = this.models.find(item => item.value.toLowerCase().includes(clean) && item.scenes.includes(scene));
      }
      if (!matched) {
        matched = this.models.find(item => item.scenes.includes(scene));
      }
      return matched || {
        value: m,
        provider: "kie",
        defaultSize: "auto",
        scenes: [scene]
      };
    } catch (err) {
      console.error(`[ImageToImageAI] Error _valModel: ${err?.message}`);
      return this.models[0];
    }
  }
  _valRatio(r, modelConfig) {
    try {
      const allowed = modelConfig.aspectRatios || this.allAspectRatios;
      const def = modelConfig.defaultSize || "auto";
      if (!r) return def;
      const clean = r.toString().toLowerCase().trim();
      return allowed.includes(clean) ? clean : def;
    } catch (err) {
      console.error(`[ImageToImageAI] Error _valRatio: ${err?.message}`);
      return "auto";
    }
  }
  _valResolution(res, modelConfig, currentRatio) {
    try {
      if (!modelConfig.resolution || !Array.isArray(modelConfig.resolution) || modelConfig.resolution.length === 0) {
        return undefined;
      }
      let allowedResolutions = [...modelConfig.resolution];
      if (modelConfig.value.startsWith("gpt-image-2-")) {
        if (currentRatio === "auto" || !currentRatio) {
          allowedResolutions = ["1K"];
        } else if (currentRatio === "1:1") {
          allowedResolutions = allowedResolutions.filter(item => item !== "4K");
        }
      }
      if (!res) {
        return allowedResolutions[0] || modelConfig.defaultResolution || "1K";
      }
      const clean = res.toString().trim();
      return allowedResolutions.includes(clean) ? clean : allowedResolutions[0] || "1K";
    } catch (err) {
      console.error(`[ImageToImageAI] Error _valResolution: ${err?.message}`);
      return undefined;
    }
  }
  _safeJsonParse(val) {
    try {
      if (typeof val !== "string") return val;
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) {
        for (const key in parsed) {
          parsed[key] = this._safeJsonParse(parsed[key]);
        }
      }
      return parsed;
    } catch (_) {
      return val;
    }
  }
  _autoParseResult(data) {
    try {
      if (!data || typeof data !== "object") return data;
      const parsed = {
        ...data
      };
      if (parsed.options) parsed.options = this._safeJsonParse(parsed.options);
      if (parsed.taskInfo) parsed.taskInfo = this._safeJsonParse(parsed.taskInfo);
      if (parsed.taskResult) parsed.taskResult = this._safeJsonParse(parsed.taskResult);
      const images = [];
      if (parsed.taskInfo?.images && Array.isArray(parsed.taskInfo.images)) {
        for (const item of parsed.taskInfo.images) {
          if (item?.imageUrl) images.push(item.imageUrl);
        }
      }
      if (parsed.taskResult?.resultJson?.resultUrls && Array.isArray(parsed.taskResult.resultJson.resultUrls)) {
        for (const url of parsed.taskResult.resultJson.resultUrls) {
          if (url && !images.includes(url)) images.push(url);
        }
      }
      parsed.images = images;
      parsed.imageUrl = images[0] || null;
      return parsed;
    } catch (err) {
      console.error(`[ImageToImageAI] Error _autoParseResult: ${err?.message}`);
      return data;
    }
  }
  async _pollResult(taskId, client, maxRetries = 60, interval = 3e3) {
    try {
      console.log(`[ImageToImageAI] Polling status task (ID: ${taskId})...`);
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        const res = await client.post("/api/ai/query", {
          taskId: taskId
        });
        const data = res?.data?.data;
        if (data?.status === "success") {
          return {
            status: true,
            data: data
          };
        }
        if (data?.status === "failed") {
          return {
            status: false,
            error: data?.errorMessage || "Task generate gagal diproses."
          };
        }
        console.log(`[ImageToImageAI] Polling ke-${i + 1}: status [${data?.status || "processing"}]`);
      }
      return {
        status: false,
        error: "Polling timeout: Waktu render habis."
      };
    } catch (err) {
      console.error(`[ImageToImageAI] Error _pollResult: ${err?.message}`);
      return {
        status: false,
        error: err?.message || "Terjadi kesalahan saat polling status."
      };
    }
  }
  async generate({
    state,
    prompt,
    image_input,
    ratio,
    aspect_ratio,
    model,
    resolution,
    n,
    imageCount,
    ...rest
  }) {
    try {
      console.log("[ImageToImageAI] Memeriksa parameter input...");
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error("[ImageToImageAI] Validasi gagal: prompt kosong.");
        return {
          status: false,
          result: 'Field "prompt" wajib diisi dan berupa string tidak kosong.'
        };
      }
      const session = await this._resolveSession(state);
      const client = this._createClient(session.cookie);
      const rawImageInput = image_input || rest?.image || rest?.images || rest?.init_image || rest?.base64img;
      const isImg2Img = Boolean(rawImageInput && (Array.isArray(rawImageInput) ? rawImageInput.length > 0 : true));
      const scene = isImg2Img ? "image-to-image" : "text-to-image";
      const modelConfig = this._valModel(model || rest?.model_id, isImg2Img);
      const finalRatio = this._valRatio(aspect_ratio || ratio, modelConfig);
      const finalResolution = this._valResolution(resolution, modelConfig, finalRatio);
      const cleanPrompt = prompt.trim();
      const options = {
        aspect_ratio: finalRatio,
        ...finalResolution ? {
          resolution: finalResolution
        } : {},
        ...rest?.options || {}
      };
      const count = n || imageCount;
      if (count && modelConfig.maxN && modelConfig.maxN > 1) {
        options.n = Math.min(Number(count), modelConfig.maxN);
      }
      if (isImg2Img) {
        console.log("[ImageToImageAI] Memproses dan mengunggah image_input...");
        const uploadedUrls = await this._processAndUploadImages(rawImageInput, client);
        if (uploadedUrls.length === 0) {
          return {
            status: false,
            result: "Gagal mengunggah file untuk image_input."
          };
        }
        options.image_input = uploadedUrls;
      }
      const body = {
        mediaType: "image",
        scene: scene,
        provider: modelConfig.provider || "kie",
        model: modelConfig.value,
        prompt: cleanPrompt,
        options: options,
        ...rest
      };
      console.log(`[ImageToImageAI] Mengirim request generate [Scene: ${body.scene} | Model: ${body.model} | Ratio: ${body.options.aspect_ratio}]...`);
      const createRes = await client.post("/api/ai/generate", body);
      const resData = createRes?.data;
      if (resData?.code !== 0 || !resData?.data?.id) {
        return {
          status: false,
          result: resData?.message || "Gagal memulai task generate."
        };
      }
      const taskId = resData.data.id;
      const pollRes = await this._pollResult(taskId, client);
      if (!pollRes.status) {
        return {
          status: false,
          result: pollRes.error
        };
      }
      console.log("[ImageToImageAI] Proses generate berhasil.");
      return {
        status: true,
        result: {
          ...this._autoParseResult(pollRes.data),
          state: session.rawState
        }
      };
    } catch (err) {
      const errData = err?.response?.data;
      const errMsg = errData?.message || errData?.msg || err?.message || "Terjadi kesalahan internal pada request.";
      console.error(`[ImageToImageAI] Error koneksi/server: ${typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg}`);
      return {
        status: false,
        result: errData || errMsg
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params?.prompt) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'prompt' diperlukan"
      });
    }
    const api = new ImageToImageAI();
    const data = await api.generate(params);
    return res.status(data.status ? 200 : 500).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}