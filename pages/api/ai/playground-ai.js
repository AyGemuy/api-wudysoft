import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import https from "https";
class PlaygroundAI {
  constructor() {
    this.baseUrl = "http://56.228.38.227:8122";
    this.authToken = "mU0ywP5obtdbPzetH3KG7SNMmJDC0rvjaGW97rNmSo";
    this.sigKey = "LI5u9TCUxYqRQ3wcXHWDCLYhnUP2v8roOerX902WV2aePuz1kB";
    this.mdls = [];
    this.apiEndpoints = {
      text_to_image: "/ios/text-to-image/v3",
      text_to_video: "/ios/text-to-video/v3",
      multiple_images_to_image: "/multiple-images-to-image/v3",
      image_to_image: "/ios/image-to-image/v3",
      image_to_video: "/ios/image-to-video/v3",
      video_to_video: "/ios/video-to-video/v3",
      video_to_dubbing: "/ios/video-dubbing/v3",
      image_to_3d: "/ios/image-to-3d/v3"
    };
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    this.client = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: agent,
      timeout: 36e4
    });
    console.log("[Init] PlaygroundAI Client initialized.");
  }
  non() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({
      length: 15
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  sig(method, path, payload) {
    console.log("[Signature] Generating request signature...");
    const ts = Math.floor(Date.now() / 1e3).toString();
    const nonce = this.non();
    const canonical = {};
    if (payload?.category !== undefined) canonical.category = payload.category;
    if (payload?.model !== undefined) canonical.model = payload.model;
    const canonStr = JSON.stringify(canonical);
    const toSign = `${method}|${path}|${ts}|${nonce}|${canonStr}`;
    const signature = crypto.createHmac("sha256", this.sigKey).update(toSign).digest("base64");
    return {
      timestamp: ts,
      nonce: nonce,
      signature: signature
    };
  }
  async res(inp, ext = "png") {
    if (!inp) return null;
    console.log(`[Media] Resolving media input (default extension: ${ext})...`);
    try {
      if (Buffer.isBuffer(inp)) {
        return {
          data: inp,
          filename: `input.${ext}`
        };
      }
      if (typeof inp === "string") {
        if (inp.startsWith("http://") || inp.startsWith("https://")) {
          const res = await axios.get(inp, {
            responseType: "arraybuffer"
          });
          const ct = res?.headers?.["content-type"];
          const actualExt = ct ? ct.split("/")[1] : ext;
          return {
            data: Buffer.from(res?.data),
            filename: `input.${actualExt}`
          };
        }
        if (inp.startsWith("data:")) {
          const parts = inp.split(";base64,");
          const mediaType = parts[0]?.split(":")?.[1]?.split(";")?.[0] || "";
          const actualExt = mediaType.split("/")[1] || ext;
          return {
            data: Buffer.from(parts[1], "base64"),
            filename: `input.${actualExt}`
          };
        }
        return {
          data: Buffer.from(inp, "base64"),
          filename: `input.${ext}`
        };
      }
    } catch (e) {
      console.log("[Media] Failed to resolve media:", e?.message);
    }
    return null;
  }
  async models() {
    console.log("[API] Fetching models list...");
    try {
      const res = await this.client.get("/models/fetch-all", {
        headers: {
          "User-Agent": "Dart/3.12 (dart:io)",
          Accept: "application/json",
          authorization: this.authToken
        }
      });
      this.mdls = res?.data?.models || [];
      return {
        status: true,
        result: this.mdls
      };
    } catch (err) {
      console.log("[API] Models fetch failed:", err?.message);
      return {
        status: false,
        result: err?.message || "Failed to fetch models"
      };
    }
  }
  detectMode({
    image,
    video,
    ...rest
  }) {
    if (rest?.mode && this.apiEndpoints[rest.mode]) {
      return rest.mode;
    }
    const hasImages = !!(rest?.images && rest.images.length > 0) || Array.isArray(image) && image.length > 1;
    const hasImage = !!image && (!Array.isArray(image) || image.length === 1);
    const hasVideo = !!video;
    const hasRefVideo = !!rest?.ref_video;
    if (hasRefVideo && (hasImage || hasImages)) return "video_to_video";
    if (hasVideo && !hasImage && !hasImages) return "text_to_video";
    if (hasImage && hasVideo) return "image_to_video";
    if (hasImages && !hasImage) return "multiple_images_to_image";
    if (hasImage && !hasVideo) return "image_to_image";
    return "text_to_image";
  }
  async generate({
    prompt,
    image,
    video,
    ...rest
  }) {
    console.log("[API] Initiating generation execution...");
    try {
      const mode = this.detectMode({
        image: image,
        video: video,
        ...rest
      });
      const path = this.apiEndpoints[mode];
      if (!path) {
        return {
          status: false,
          result: `api_error: Capability mode "${mode}" is unknown.`
        };
      }
      if (!this.mdls || this.mdls.length === 0) {
        await this.models();
      }
      let capModel = null;
      let cap = null;
      let finalModel = rest?.model;
      if (finalModel) {
        capModel = this.mdls?.find(m => m?.capabilities?.[mode]?.sources?.includes(finalModel));
        cap = capModel?.capabilities?.[mode];
      } else {
        let lowestCredit = Infinity;
        let selectedModel = null;
        let selectedCapModel = null;
        let selectedCap = null;
        const availableModels = this.mdls?.filter(m => m?.capabilities?.[mode]?.available === true) || [];
        for (const m of availableModels) {
          const c = m?.capabilities?.[mode];
          const sourceCaps = c?.source_capabilities || {};
          for (const source of c?.sources || []) {
            const sourceInfo = sourceCaps[source];
            const credit = sourceInfo?.credit_required !== undefined ? sourceInfo.credit_required : c?.credit_required || 0;
            if (credit < lowestCredit) {
              lowestCredit = credit;
              selectedModel = source;
              selectedCapModel = m;
              selectedCap = c;
            }
          }
        }
        if (selectedModel) {
          finalModel = selectedModel;
          capModel = selectedCapModel;
          cap = selectedCap;
          console.log(`[Auto-Find] Cheapest model chosen: "${finalModel}" (${lowestCredit} credits) for mode "${mode}".`);
        }
      }
      const modeToCategory = {
        text_to_image: "Text to Image",
        image_to_image: "Image to Image",
        text_to_video: "Text to Video",
        image_to_video: "Image to Video",
        video_to_video: "Video to Video",
        video_to_dubbing: "Dubbing",
        image_to_3d: "Image to 3D",
        multiple_images_to_image: "Multiple Images to Image"
      };
      const finalCategory = rest?.category || modeToCategory[mode] || "Text to Image";
      const {
        model,
        category,
        aspect_ratio,
        image_size,
        resolution,
        enhance_prompt,
        num_images,
        ref_video,
        images,
        mode: _m,
        ...extra
      } = rest;
      if (cap) {
        const isPromptReq = cap?.source_capabilities?.[finalModel]?.prompt_required ?? true;
        if (isPromptReq && !prompt) {
          return {
            status: false,
            result: `validation_error: prompt is required for model "${finalModel}".`
          };
        }
        if (aspect_ratio && cap?.image_sizes?.length > 0 && !cap.image_sizes.includes(aspect_ratio)) {
          return {
            status: false,
            result: `validation_error: aspect_ratio "${aspect_ratio}" is invalid. Supported: ${cap.image_sizes.join(", ")}`
          };
        }
        if (resolution && cap?.supported_resolutions?.length > 0 && !cap.supported_resolutions.includes(resolution)) {
          return {
            status: false,
            result: `validation_error: resolution "${resolution}" is invalid. Supported: ${cap.supported_resolutions.join(", ")}`
          };
        }
        if (num_images && cap?.num_images_options?.length > 0 && !cap.num_images_options.includes(Number(num_images))) {
          return {
            status: false,
            result: `validation_error: num_images "${num_images}" is invalid. Supported: ${cap.num_images_options.join(", ")}`
          };
        }
        if (extra?.duration && cap?.supported_durations?.length > 0 && !cap.supported_durations.includes(extra.duration)) {
          return {
            status: false,
            result: `validation_error: duration "${extra.duration}" is invalid. Supported: ${cap.supported_durations.join(", ")}`
          };
        }
      } else if (!prompt && mode !== "video_to_dubbing" && mode !== "image_to_3d") {
        return {
          status: false,
          result: "validation_error: prompt is required."
        };
      }
      const payload = {
        category: finalCategory,
        prompt: prompt || "",
        model: finalModel,
        enhance_prompt: enhance_prompt || "true",
        ...extra
      };
      if (cap) {
        if (cap.image_sizes?.length > 0) {
          payload.aspect_ratio = aspect_ratio || cap.image_sizes[0];
        }
        if (cap.supported_resolutions?.length > 0) {
          payload.resolution = resolution || cap.supported_resolutions[0];
          payload.image_size = image_size || cap.supported_resolutions[0];
        }
        if (cap.supported_durations?.length > 0) {
          payload.duration = extra?.duration || cap.supported_durations[0];
        }
        if (cap.num_images_options?.length > 0) {
          payload.num_images = num_images || cap.num_images_options[0];
        }
        if (cap.supported_texture_sizes?.length > 0) {
          payload.texture_size = extra?.texture_size || cap.supported_texture_sizes[0];
        }
      } else {
        if (aspect_ratio) payload.aspect_ratio = aspect_ratio;
        if (resolution) payload.resolution = resolution;
        if (image_size) payload.image_size = image_size;
        if (num_images) payload.num_images = num_images;
      }
      const {
        timestamp,
        nonce,
        signature
      } = this.sig("POST", path, payload);
      const form = new FormData();
      for (const [key, val] of Object.entries(payload)) {
        if (val !== undefined && val !== null) {
          form.append(key, String(val));
        }
      }
      const imageList = [];
      if (image) {
        if (Array.isArray(image)) {
          imageList.push(...image.map(img => ({
            type: "single",
            value: img
          })));
        } else {
          imageList.push({
            type: "single",
            value: image
          });
        }
      }
      if (Array.isArray(images)) {
        imageList.push(...images.map(img => ({
          type: "multi",
          value: img
        })));
      }
      let multiIdx = 0;
      for (const imgItem of imageList) {
        const resolved = await this.res(imgItem.value, "png");
        if (resolved) {
          if (imgItem.type === "single" && mode !== "multiple_images_to_image") {
            form.append("image", resolved.data, {
              filename: resolved.filename
            });
            console.log("[Form] Attached single image.");
          } else {
            form.append("images", resolved.data, {
              filename: `images_${multiIdx}.png`
            });
            console.log(`[Form] Attached multi-image at index ${multiIdx}.`);
            multiIdx++;
          }
        }
      }
      if (video && typeof video !== "boolean") {
        const resVid = await this.res(video, "mp4");
        if (resVid) form.append("video", resVid.data, {
          filename: resVid.filename
        });
      }
      if (ref_video) {
        const resRefVid = await this.res(ref_video, "mp4");
        if (resRefVid) form.append("ref_video", resRefVid.data, {
          filename: resRefVid.filename
        });
      }
      console.log(`[API] [${mode.toUpperCase()}] Transmitting request to: ${path}`);
      const response = await this.client.post(path, form, {
        headers: {
          "User-Agent": "Dart/3.12 (dart:io)",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/multipart-formdata",
          "keep-alive": "timeout=1800",
          "x-app-timestamp": timestamp,
          "x-app-nonce": nonce,
          authorization: this.authToken,
          "x-app-signature": signature,
          ...form.getHeaders()
        }
      });
      console.log("[API] Generation completed.");
      const resData = response?.data?.result || response?.data || null;
      return {
        status: true,
        result: resData
      };
    } catch (error) {
      console.log("[API] Execution failed:", error?.message);
      const errorData = error?.response?.data || error?.message || "Unknown API Exception";
      return {
        status: false,
        result: errorData
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          models: "/?action=models",
          generate: "/?action=generate&prompt=A cute car&model=fal-ai/nano-banana"
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
  const scraper = new PlaygroundAI();
  try {
    let response;
    switch (action) {
      case "models":
        response = await scraper.models();
        break;
      case "generate":
        response = await scraper.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
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
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}