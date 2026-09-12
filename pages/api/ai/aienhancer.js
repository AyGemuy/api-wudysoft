import axios from "axios";
import CryptoJS from "crypto-js";
import SpoofHead from "@/lib/spoof-head";
class AiEnhancer {
  constructor() {
    try {
      this.base_url = "https://aienhancer.ai/api/v1";
      this.aes_key = "ai-enhancer-web__aes-key";
      this.aes_iv = "aienhancer-aesiv";
      this.guest_id = this._gid();
      this.available_models = {
        NANO_BANANA: {
          id: 2,
          ratios: ["match_input_image", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
          defaultRatio: "match_input_image",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "nano-banana",
            cost: 6
          })
        },
        GPT_IMAGE_2: {
          id: 14,
          ratios: ["1:1", "3:2", "2:3"],
          defaultRatio: "1:1",
          ratioKey: "aspect_ratio",
          getFn: opts => {
            const q = String(opts.quality || "medium").toLowerCase();
            if (q === "high") return {
              name: "gpt-image-2-quality-high",
              cost: 24
            };
            if (q === "low") return {
              name: "gpt-image-2-quality-low",
              cost: 6
            };
            return {
              name: "gpt-image-2-quality-medium",
              cost: 8
            };
          }
        },
        GPT_IMAGE_1_5: {
          id: 15,
          ratios: ["1:1", "3:2", "2:3"],
          defaultRatio: "1:1",
          ratioKey: "aspect_ratio",
          getFn: opts => {
            const q = String(opts.quality || "medium").toLowerCase();
            if (q === "high") return {
              name: "gpt-image-1.5-quality-high",
              cost: 10
            };
            return {
              name: "gpt-image-1.5-quality-medium",
              cost: 6
            };
          }
        },
        NANO_BANANA_2: {
          id: 17,
          ratios: ["auto", "9:16", "16:9", "1:1", "4:5", "5:4", "4:3", "3:4", "3:2", "2:3", "21:9"],
          defaultRatio: "auto",
          ratioKey: "aspect_ratio",
          getFn: opts => {
            const r = String(opts.resolution || "1k").toLowerCase();
            if (r === "4k") return {
              name: "nano-banana-2-resolution-4k",
              cost: 8
            };
            if (r === "2k") return {
              name: "nano-banana-2-resolution-2k",
              cost: 6
            };
            return {
              name: "nano-banana-2-resolution-1k",
              cost: 6
            };
          }
        },
        NANO_BANANA_PRO: {
          id: 18,
          ratios: ["auto", "9:16", "16:9", "1:1", "4:5", "5:4", "4:3", "3:4", "3:2", "2:3", "21:9"],
          defaultRatio: "auto",
          ratioKey: "aspect_ratio",
          getFn: opts => {
            const r = String(opts.resolution || "1k").toLowerCase();
            if (r === "4k") return {
              name: "nano-banana-pro-resolution-4k",
              cost: 8
            };
            if (r === "2k") return {
              name: "nano-banana-pro-resolution-2k",
              cost: 6
            };
            return {
              name: "nano-banana-pro-resolution-1k",
              cost: 6
            };
          }
        },
        SEEDREAM_4: {
          id: 5,
          ratios: ["2K", "2048x2048", "2304x1728", "1728x2304", "2560x1440", "1440x2560", "2496x1664", "1664x2496", "3024x1296"],
          defaultRatio: "2K",
          ratioKey: "size",
          getFn: () => ({
            name: "seedream-4",
            cost: 6
          })
        },
        SEEDREAM_4_5: {
          id: 12,
          ratios: ["2K", "2048x2048", "2304x1728", "1728x2304", "2560x1440", "1440x2560", "2496x1664", "1664x2496", "3024x1296"],
          defaultRatio: "2K",
          ratioKey: "size",
          getFn: () => ({
            name: "seedream-4-5",
            cost: 6
          })
        },
        SEEDREAM_5_LITE: {
          id: 19,
          ratios: ["2K", "2048x2048", "2304x1728", "1728x2304", "2560x1440", "1440x2560", "2496x1664", "1664x2496", "3024x1296"],
          defaultRatio: "2K",
          ratioKey: "size",
          getFn: () => ({
            name: "seedream-5-lite",
            cost: 6
          })
        },
        QWEN_IMAGE_EDIT_PLUS: {
          id: 9,
          ratios: ["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4"],
          defaultRatio: "match_input_image",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "qwen-image-edit-plus",
            cost: 6
          })
        },
        QWEN_IMAGE: {
          id: 11,
          ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
          defaultRatio: "1:1",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "qwen-image",
            cost: 6
          })
        },
        FLUX_KONTEXT_PRO: {
          id: 8,
          ratios: ["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9", "9:21", "2:1", "1:2"],
          defaultRatio: "match_input_image",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "flux-kontext-pro",
            cost: 6
          })
        },
        FLUX_KONTEXT_MAX: {
          id: 21,
          ratios: ["match_input_image", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9", "9:21", "2:1", "1:2"],
          defaultRatio: "match_input_image",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "flux-kontext-max",
            cost: 8
          })
        },
        FLUX_KONTEXT_DEV: {
          id: 22,
          ratios: ["match_input_image", "1:1", "16:9", "21:9", "3:2", "2:3", "4:5", "5:4", "3:4", "4:3", "9:16", "9:21"],
          defaultRatio: "match_input_image",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "flux-kontext-dev",
            cost: 6
          })
        },
        FLUX_2_MAX: {
          id: 20,
          ratios: ["match_input_image", "1:1", "16:9", "3:2", "2:3", "4:5", "5:4", "9:16", "3:4", "4:3"],
          defaultRatio: "match_input_image",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "flux-2-max",
            cost: 8
          })
        },
        RECRAFT_V4: {
          id: 23,
          ratios: ["Not set", "1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16", "1:2", "2:1", "14:10", "10:14", "4:5", "5:4", "6:10"],
          defaultRatio: "Not set",
          ratioKey: "aspect_ratio",
          getFn: () => ({
            name: "recraft-v4",
            cost: 6
          })
        },
        IDEOGRAM_V4: {
          id: 24,
          ratios: ["None", "2048x2048", "1440x2880", "2880x1440", "1664x2496", "2496x1664", "1792x2240", "2240x1792", "1440x2560", "2560x1440", "1600x2560", "2560x1600", "1728x2304", "2304x1728", "1296x3168", "3168x1296", "1152x2944", "2944x1152", "1248x3328", "3328x1248", "1280x3072", "3072x1280"],
          defaultRatio: "None",
          ratioKey: "resolution",
          getFn: () => ({
            name: "ideogram-v4-quality",
            cost: 12
          })
        }
      };
      this.client = axios.create({
        baseURL: this.base_url,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://aienhancer.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://aienhancer.ai/?utm_source=vdraw-func",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-guest-id": this.guest_id,
          ...SpoofHead()
        }
      });
    } catch (err) {
      this._log(`Constructor error: ${err?.message || err}`);
    }
  }
  _log(m) {
    try {
      console.log(`[AiEnhancer] ${m}`);
    } catch {}
  }
  _wait(ms) {
    try {
      return new Promise(r => setTimeout(r, ms || 1e3));
    } catch {
      return Promise.resolve();
    }
  }
  _gid() {
    try {
      return CryptoJS.lib.WordArray.random(16).toString();
    } catch {
      return "dd2a265c7dfcd90f9ea4f6ba0183ef11";
    }
  }
  _enc(v) {
    try {
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      return CryptoJS.AES.encrypt(val, CryptoJS.enc.Utf8.parse(this.aes_key), {
        iv: CryptoJS.enc.Utf8.parse(this.aes_iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
    } catch (err) {
      this._log(`Encryption error: ${err?.message || err}`);
      return null;
    }
  }
  _normalizeModel(modelInput) {
    if (!modelInput) return null;
    if (typeof modelInput === "number" || !isNaN(Number(modelInput))) {
      const numericId = Number(modelInput);
      const match = Object.entries(this.available_models).find(([_, info]) => info.id === numericId);
      if (match) {
        return {
          name: match[0],
          ...match[1]
        };
      }
      return null;
    }
    const normalizedInput = String(modelInput).toUpperCase().replace(/[\s-.]+/g, "_");
    if (this.available_models[normalizedInput]) {
      return {
        name: normalizedInput,
        ...this.available_models[normalizedInput]
      };
    }
    const fuzzyMatch = Object.entries(this.available_models).find(([name, _]) => name.replace(/_/g, "").includes(normalizedInput.replace(/_/g, "")));
    if (fuzzyMatch) {
      return {
        name: fuzzyMatch[0],
        ...fuzzyMatch[1]
      };
    }
    return null;
  }
  async _imgs(input) {
    try {
      if (!input) return [];
      const list = Array.isArray(input) ? input : [input];
      const out = [];
      for (const item of list) {
        if (!item) continue;
        if (Buffer.isBuffer(item)) {
          out.push(`data:image/jpeg;base64,${item.toString("base64")}`);
        } else if (typeof item === "string") {
          if (item.startsWith("data:")) {
            out.push(item);
          } else if (item.startsWith("http")) {
            this._log("Fetching remote image URL...");
            const res = await axios.get(item, {
              responseType: "arraybuffer"
            });
            const mime = res.headers?.["content-type"] || "image/jpeg";
            out.push(`data:${mime};base64,${Buffer.from(res.data).toString("base64")}`);
          } else {
            out.push(`data:image/jpeg;base64,${item}`);
          }
        }
      }
      return out;
    } catch (err) {
      this._log(`Image conversion error: ${err?.message || err}`);
      return [];
    }
  }
  async _check(taskId) {
    try {
      if (!taskId) {
        return {
          status: "error",
          result: {
            error_message: "task_id is required"
          }
        };
      }
      this._log(`Checking task status for: ${taskId}`);
      const res = await this.client.post("/r/image-enhance/result", {
        task_id: taskId
      });
      const data = res?.data?.data || res?.data || {};
      return {
        status: "success",
        result: data
      };
    } catch (err) {
      this._log(`Status check failed: ${err?.message || err}`);
      return {
        status: "error",
        result: {
          error_message: err?.response?.data?.message || err?.message || "Check result failed"
        }
      };
    }
  }
  async generate({
    prompt = "",
    image = null,
    model = "NANO_BANANA",
    aspectRatio,
    ...rest
  }) {
    try {
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        this._log("Validation error: Prompt is required");
        return {
          status: "error",
          result: {
            error_message: "Prompt is required and must be a non-empty string"
          }
        };
      }
      const modelMeta = this._normalizeModel(model);
      if (!modelMeta) {
        this._log(`Validation error: Model '${model}' is not supported.`);
        return {
          status: "error",
          result: {
            error_message: `Model '${model}' is not supported. Please use valid model name or ID.`
          }
        };
      }
      this._log(`Selected model: ${modelMeta.name} (ID: ${modelMeta.id})`);
      this._log("Processing input and converting image(s)...");
      const b64List = await this._imgs(image);
      const isI2I = b64List.length > 0;
      const finalRatioKey = modelMeta.ratioKey || "aspect_ratio";
      let selectedRatio = aspectRatio;
      if (!selectedRatio) {
        selectedRatio = isI2I && modelMeta.ratios.includes("match_input_image") ? "match_input_image" : modelMeta.defaultRatio;
      } else if (!modelMeta.ratios.includes(selectedRatio)) {
        this._log(`Warning: Ratio '${selectedRatio}' may not be supported by ${modelMeta.name}. Falling back to default: ${modelMeta.defaultRatio}`);
        selectedRatio = modelMeta.defaultRatio;
      }
      const advOpts = {
        [finalRatioKey]: selectedRatio,
        output_format: "jpeg",
        disable_safety_checker: false
      };
      const settingsObj = {
        prompt: prompt.trim(),
        ...advOpts
      };
      const historyObj = {
        type: isI2I ? "editor" : "generator",
        settings: {
          selectedModel: modelMeta.id,
          prompt: prompt.trim(),
          advancedOptions: advOpts
        }
      };
      const fnResolution = modelMeta.getFn(rest);
      const finalFnName = fnResolution.name;
      this._log(`Resolved function endpoint: '${finalFnName}' (cost: ${fnResolution.cost} credits)`);
      const fnEnc = this._enc(finalFnName);
      const setEnc = this._enc(settingsObj);
      const histEnc = this._enc(historyObj);
      if (!fnEnc || !setEnc || !histEnc) {
        return {
          status: "error",
          result: {
            error_message: "Failed to encrypt parameters"
          }
        };
      }
      const defaultPayload = {
        model: modelMeta.id,
        function: fnEnc,
        settings: setEnc,
        history_detail: histEnc,
        batch_size: 1,
        batch_index: 1,
        ...isI2I ? {
          image: b64List
        } : {}
      };
      const payload = {
        ...defaultPayload,
        ...rest
      };
      const endpoint = isI2I ? "/r/image-enhance/create" : "/image/generator/create";
      this._log(`Submitting ${isI2I ? "Image-to-Image" : "Text-to-Image"} task to ${endpoint}...`);
      const resCreate = await this.client.post(endpoint, payload);
      const taskId = resCreate?.data?.data?.id;
      if (!taskId) {
        return {
          status: "error",
          result: {
            error_message: resCreate?.data?.message || "Failed to obtain task ID from server"
          }
        };
      }
      this._log(`Task created successfully with ID: ${taskId}`);
      this._log("Starting polling loop for completion...");
      while (true) {
        await this._wait(3e3);
        const checkRes = await this._check(taskId);
        const taskStatus = checkRes?.result?.status || "starting";
        this._log(`Polling status: ${taskStatus}`);
        if (taskStatus === "succeeded") {
          this._log("Task completed successfully!");
          return checkRes;
        }
        if (taskStatus === "failed") {
          return {
            status: "error",
            result: {
              task_id: taskId,
              error_message: checkRes?.result?.error || "Task processing failed on server"
            }
          };
        }
      }
    } catch (err) {
      this._log(`Generation error: ${err?.response?.data?.message || err?.message || err}`);
      return {
        status: "error",
        result: {
          error_message: err?.response?.data?.message || err?.message || String(err)
        }
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
  const api = new AiEnhancer();
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