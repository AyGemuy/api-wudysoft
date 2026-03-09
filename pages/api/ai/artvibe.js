import axios from "axios";
import {
  createHash,
  randomBytes
} from "crypto";
class ArtVibeAPI {
  constructor() {
    this.baseURL = "https://api-ga-bp.artvibe.info";
    this.workflowURL = "https://api-ga-aws.artvibe.info";
    this.imageURL = "https://image.artvibe.info";
    this.timezone = this.randTZ();
    this.userId = "";
    this.packName = "com.yes366.etm";
    this.appVersion = "9.9.9.9.9.9";
    this.deviceId = this.randHex(16);
    this.timeout = 36e4;
    this.headers = {
      "User-Agent": this.randUA(),
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "y-timezone": this.timezone,
      "cache-control": "no-cache",
      "y-user-id": this.userId,
      "y-pack-name": this.packName,
      "y-versions": JSON.stringify(this.genVer())
    };
  }
  randUA() {
    const devices = ["RMX3890", "RMX3686", "SM-G998B", "M2102J20SG", "2201116SG"];
    const builds = ["RE5C91L1", "TP1A.220905.001", "SP1A.210812.016"];
    const androidVer = [13, 14, 15][Math.floor(Math.random() * 3)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const build = builds[Math.floor(Math.random() * builds.length)];
    return `ETM/${this.appVersion} (Android ${androidVer}; ${device}; ${build}; arm64-v8a)`;
  }
  randTZ() {
    const zones = ["WIB | UTC +07:00", "WITA | UTC +08:00", "WIT | UTC +09:00"];
    return zones[Math.floor(Math.random() * zones.length)];
  }
  randHex(len) {
    return randomBytes(len).toString("hex").slice(0, len);
  }
  genVer() {
    const now = new Date();
    const insTime = new Date(now.getTime() - Math.random() * 864e5 * 30);
    const cuoTime = new Date(now.getTime());
    return {
      plt: "Android",
      pver: ["13", "14", "15"][Math.floor(Math.random() * 3)],
      aver: this.appVersion,
      "uid-gg-app-id": this.randHex(32),
      "uid-gg-aut-id": "",
      "uid-se-dis-id": this.deviceId,
      "coun-code": ["ID", "MY", "SG"][Math.floor(Math.random() * 3)],
      "lang-code": ["id", "en", "ms"][Math.floor(Math.random() * 3)],
      "ins-time": insTime.toISOString().slice(0, 19).replace("T", " "),
      "cuo-time": cuoTime.toISOString().slice(0, 19).replace("T", " "),
      attr: "",
      "m-cid": "-1",
      "m-gid": "",
      "m-pid": "",
      "m-aid": "",
      ast: 0,
      asts: {
        5: 0,
        6: 0,
        7: 0
      },
      "ads-rh": {},
      "app-rh": {},
      "app-uap": false
    };
  }
  sign(ts) {
    return createHash("md5").update(`${ts}${this.packName}`).digest("hex");
  }
  async cfg() {
    console.log("[CFG] Fetching config...");
    try {
      const res = await axios.get(`${this.imageURL}/app/config/Android-${this.packName}.json`, {
        headers: {
          "User-Agent": "Dart/3.7 (dart:io)",
          "Accept-Encoding": "gzip"
        },
        timeout: this.timeout
      });
      console.log("[CFG] Config fetched");
      return res?.data;
    } catch (err) {
      console.error("[CFG] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Config failed: ${err?.message || "Unknown error"}`);
    }
  }
  async rec({
    type = "civitai_images",
    nsfwLevel = "Soft",
    page = 1,
    pageSize = 20,
    ...rest
  }) {
    console.log("[REC] Fetching prompts...");
    const ts = Math.floor(Date.now() / 1e3);
    try {
      const payload = {
        type: type,
        nsfw_level: nsfwLevel,
        page: page,
        page_size: pageSize,
        ...rest
      };
      const res = await axios.post(`${this.baseURL}/v2/square/prompts/recommend`, payload, {
        headers: {
          ...this.headers,
          Accept: "application/json",
          "x-timestamp": ts,
          "x-sign": this.sign(ts)
        },
        timeout: this.timeout
      });
      console.log("[REC] Prompts fetched");
      return res?.data;
    } catch (err) {
      console.error("[REC] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Recommend failed: ${err?.message || "Unknown error"}`);
    }
  }
  async tr({
    text,
    source: sourceLang,
    target: targetLang,
    enhance: promptEnhance,
    model: modelType,
    ...rest
  }) {
    console.log("[TR] Translating...");
    const ts = Math.floor(Date.now() / 1e3);
    try {
      const payload = {
        text: text,
        source_language: sourceLang || "auto",
        target_language: targetLang || "en",
        prompt_enhance: promptEnhance ?? false,
        sd_model_type: modelType || "sdxl",
        ...rest
      };
      const res = await axios.post(`${this.baseURL}/v2/call_translate`, payload, {
        headers: {
          ...this.headers,
          Accept: "application/json",
          "x-timestamp": ts,
          "x-sign": this.sign(ts)
        },
        timeout: this.timeout
      });
      console.log("[TR] Translation done");
      return res?.data;
    } catch (err) {
      console.error("[TR] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Translation failed: ${err?.message || "Unknown error"}`);
    }
  }
  async sug({
    text: idea,
    lang: languages,
    count,
    ast,
    asts,
    ...rest
  }) {
    console.log("[SUG] Generating suggestions...");
    const ts = Math.floor(Date.now() / 1e3);
    try {
      const payload = {
        idea: idea,
        languages: languages || ["en", "id"],
        count: count || 3,
        ...rest
      };
      const ver = JSON.parse(this.headers["y-versions"]);
      ver.ast = ast || 0;
      ver.asts = asts || {
        5: 0,
        6: 0,
        7: 0
      };
      const res = await axios.post(`${this.baseURL}/v2/ai_prompt_suggestion`, payload, {
        headers: {
          ...this.headers,
          Accept: "application/json",
          "x-timestamp": ts,
          "x-sign": this.sign(ts),
          "y-versions": JSON.stringify(ver)
        },
        timeout: this.timeout
      });
      console.log("[SUG] Suggestions done");
      return res?.data?.data || res?.data;
    } catch (err) {
      console.error("[SUG] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Suggestion failed: ${err?.message || "Unknown error"}`);
    }
  }
  async gen({
    prompt,
    imageUrl,
    seed,
    steps,
    cfg,
    width,
    height,
    denoise,
    negative,
    referenceUrl,
    loraStack,
    controlNet,
    ...rest
  }) {
    console.log(`[GEN] Starting ${imageUrl ? "I2I" : "T2I"}...`);
    const ts = Math.floor(Date.now() / 1e3);
    const genSeed = seed || Math.floor(Math.random() * 1e15).toString();
    try {
      let imgData = null;
      let uploadFile = null;
      if (imageUrl) {
        console.log("[GEN] Processing image...");
        const proc = await this.procImg(imageUrl);
        imgData = proc?.base64;
        uploadFile = proc?.filename;
      }
      const opts = {
        seed: genSeed,
        steps: steps || (imageUrl ? 22 : 25),
        cfg: cfg || (imageUrl ? 7.5 : 7),
        width: width || (imageUrl ? 1024 : 768),
        height: height || (imageUrl ? 1024 : 1152),
        denoise: denoise || .55,
        negative: negative || "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
        referenceUrl: referenceUrl || "",
        loraStack: loraStack || null,
        controlNet: controlNet || null,
        ...rest
      };
      const wf = imageUrl ? this.buildI2I(prompt, imgData, uploadFile, genSeed, opts) : this.buildT2I(prompt, genSeed, opts);
      const ver = JSON.parse(this.headers["y-versions"]);
      if (imageUrl && referenceUrl) {
        ver.wty = 23;
        ver.ast = 1;
        ver.asts = {
          5: 0,
          6: 0,
          7: 0,
          11: 1
        };
      } else if (imageUrl) {
        ver.wty = 23;
        ver.ast = 1;
        ver.asts = {
          5: 0,
          6: 0,
          7: 0
        };
      } else {
        ver.wty = 11;
        ver.ast = 0;
        ver.asts = {
          5: 0,
          6: 0,
          7: 0
        };
      }
      const headers = {
        ...this.headers,
        Accept: "text/event-stream",
        "x-timestamp": ts,
        "x-sign": this.sign(ts),
        "y-versions": JSON.stringify(ver)
      };
      const res = await axios.post(`${this.workflowURL}/v2/call_workflow`, {
        input: wf,
        toolType: ver.wty
      }, {
        headers: headers,
        responseType: "stream",
        timeout: this.timeout
      });
      return await this.poll(res?.data);
    } catch (err) {
      console.error("[GEN] Error:", err?.response?.data || err?.message || err);
      throw new Error(`Generation failed: ${err?.message || "Unknown error"}`);
    }
  }
  async procImg(input) {
    try {
      let b64;
      const ts = Date.now();
      const filename = `upload_${ts}.png`;
      if (Buffer.isBuffer(input)) {
        console.log("[PROC] Buffer to base64...");
        b64 = input.toString("base64");
      } else if (input?.startsWith("data:image")) {
        console.log("[PROC] Extract base64...");
        b64 = input.split(",")[1];
      } else if (input?.match(/^[A-Za-z0-9+/=]+$/)) {
        console.log("[PROC] Using base64...");
        b64 = input;
      } else {
        console.log("[PROC] Fetch from URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer",
          timeout: this.timeout
        });
        b64 = Buffer.from(res?.data).toString("base64");
      }
      return {
        base64: b64,
        filename: filename
      };
    } catch (err) {
      console.error("[PROC] Error:", err?.message || err);
      throw new Error(`Image processing failed: ${err?.message || "Unknown error"}`);
    }
  }
  buildT2I(prompt, seed, opts) {
    const wf = {
      images: null,
      workflow: {
        5: {
          inputs: {
            add_noise: "enable",
            noise_seed: seed,
            steps: opts?.steps,
            cfg: opts?.cfg,
            sampler_name: opts?.sampler || "dpmpp_2m",
            scheduler: opts?.scheduler || "karras",
            start_at_step: 0,
            end_at_step: 1e4,
            return_with_leftover_noise: "disable",
            preview_method: "none",
            vae_decode: "true",
            model: ["6", 0],
            positive: ["6", 1],
            negative: ["6", 2],
            latent_image: ["6", 3],
            optional_vae: ["6", 4]
          },
          class_type: "KSampler Adv. (Efficient)",
          _meta: {
            title: "KSampler Adv. (Efficient)"
          }
        },
        6: {
          inputs: {
            ckpt_name: opts?.model || "leosamsHelloworldXL_helloworldXL60.safetensors",
            vae_name: opts?.vae || "Baked VAE",
            clip_skip: opts?.clipSkip || -2,
            lora_name: opts?.lora || "add-detail-xl.safetensors",
            lora_model_strength: opts?.loraModelStrength || 1,
            lora_clip_strength: opts?.loraClipStrength || 1,
            positive: prompt,
            negative: opts?.negative,
            token_normalization: "none",
            weight_interpretation: "comfy",
            empty_latent_width: opts?.width.toString(),
            empty_latent_height: opts?.height.toString(),
            batch_size: opts?.batchSize || 1,
            lora_stack: opts?.loraStack ? ["9", 0] : undefined,
            cnet_stack: opts?.controlNet ? ["32", 0] : undefined
          },
          class_type: "Efficient Loader",
          _meta: {
            title: "Efficient Loader"
          }
        },
        44: {
          inputs: {
            filename_prefix: "ComfyUI",
            format: opts?.format || "webp",
            webp_quality: opts?.quality || 75,
            images: ["5", 5]
          },
          class_type: "ETM_SaveImage",
          _meta: {
            title: "ETM Save Image"
          }
        }
      },
      workflow_parameters: {
        seed: seed,
        prompt: prompt,
        width: opts?.width.toString(),
        height: opts?.height.toString(),
        add_detail: opts?.addDetail || 1,
        batch_size: opts?.batchSize || 1
      }
    };
    if (opts?.loraStack) {
      wf.workflow["9"] = {
        inputs: {
          switch_1: "On",
          lora_name_1: opts?.loraStack?.lora1 || "None",
          model_weight_1: 1,
          clip_weight_1: 1,
          switch_2: "Off",
          lora_name_2: "None",
          model_weight_2: 1,
          clip_weight_2: 1,
          switch_3: "Off",
          lora_name_3: "None",
          model_weight_3: 1,
          clip_weight_3: 1
        },
        class_type: "CR LoRA Stack",
        _meta: {
          title: "💊 CR LoRA Stack"
        }
      };
    }
    return wf;
  }
  buildI2I(prompt, imgData, uploadFile, seed, opts) {
    return {
      images: [{
        name: uploadFile,
        image: imgData
      }],
      workflow: {
        6: {
          inputs: {
            ckpt_name: opts?.model || "animagineXLV31_v31.safetensors",
            vae_name: opts?.vae || "Baked VAE",
            clip_skip: opts?.clipSkip || -2,
            lora_name: "None",
            lora_model_strength: 1,
            lora_clip_strength: 1,
            positive: ["58", 2],
            negative: opts?.negative,
            token_normalization: "none",
            weight_interpretation: "comfy",
            empty_latent_width: opts?.width,
            empty_latent_height: opts?.height,
            batch_size: opts?.batchSize || 1
          },
          class_type: "Efficient Loader",
          _meta: {
            title: "Efficient Loader"
          }
        },
        44: {
          inputs: {
            weight: opts?.ipWeight || 1,
            style_boost: opts?.styleBoost || 2,
            combine_embeds: "concat",
            start_at: 0,
            end_at: 1,
            embeds_scaling: "V only",
            model: ["6", 0],
            ipadapter: ["45", 0],
            image: ["55", 0],
            clip_vision: ["47", 0]
          },
          class_type: "IPAdapterPreciseStyleTransfer",
          _meta: {
            title: "IPAdapter Precise Style Transfer"
          }
        },
        45: {
          inputs: {
            ipadapter_file: "ip-adapter_sdxl_vit-h.safetensors"
          },
          class_type: "IPAdapterModelLoader",
          _meta: {
            title: "IPAdapter Model Loader"
          }
        },
        47: {
          inputs: {
            clip_name: "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors.safetensors"
          },
          class_type: "CLIPVisionLoader",
          _meta: {
            title: "Load CLIP Vision"
          }
        },
        49: {
          inputs: {
            image: opts?.referenceUrl || "https://image.artvibe.info/metadata/loras/ipstyles/ip_1_412.webp",
            keep_alpha_channel: false,
            output_mode: false,
            "choose image to upload": "image"
          },
          class_type: "LoadImageFromUrl",
          _meta: {
            title: "Load Image From URL"
          }
        },
        50: {
          inputs: {
            image: uploadFile,
            upload: "image"
          },
          class_type: "LoadImage",
          _meta: {
            title: "Load Image"
          }
        },
        51: {
          inputs: {
            pixels: ["50", 0],
            vae: ["6", 4]
          },
          class_type: "VAEEncode",
          _meta: {
            title: "VAE Encode"
          }
        },
        52: {
          inputs: {
            max_width: 832,
            max_height: 1536,
            min_width: 0,
            min_height: 0,
            crop_if_required: "no",
            images: ["50", 0]
          },
          class_type: "ConstrainImage|pysssss",
          _meta: {
            title: "Constrain Image 🐍"
          }
        },
        55: {
          inputs: {
            interpolation: "LANCZOS",
            crop_position: "top",
            sharpening: 0,
            image: ["49", 0]
          },
          class_type: "PrepImageForClipVision",
          _meta: {
            title: "Prep Image For ClipVision"
          }
        },
        57: {
          inputs: {
            seed: seed,
            steps: opts?.steps,
            cfg: opts?.cfg,
            sampler_name: opts?.sampler || "euler_ancestral",
            scheduler: opts?.scheduler || "normal",
            denoise: opts?.denoise,
            preview_method: "none",
            vae_decode: "true",
            model: ["44", 0],
            positive: ["6", 1],
            negative: ["6", 2],
            latent_image: ["51", 0],
            optional_vae: ["6", 4]
          },
          class_type: "KSampler (Efficient)",
          _meta: {
            title: "KSampler (Efficient)"
          }
        },
        58: {
          inputs: {
            text_input: "",
            task: "prompt_gen_tags",
            fill_mask: true,
            keep_model_loaded: false,
            max_new_tokens: 1024,
            num_beams: 3,
            do_sample: true,
            output_mask_select: "",
            seed: Math.floor(Math.random() * 1e15),
            image: ["52", 0],
            florence2_model: ["59", 0]
          },
          class_type: "Florence2Run",
          _meta: {
            title: "Florence2Run"
          }
        },
        59: {
          inputs: {
            model: "Florence-2-base-prompt",
            precision: "fp16",
            attention: "eager"
          },
          class_type: "Florence2ModelLoader",
          _meta: {
            title: "Florence2ModelLoader"
          }
        },
        60: {
          inputs: {
            filename_prefix: "ComfyUI",
            format: opts?.format || "webp",
            webp_quality: opts?.quality || 75,
            images: ["57", 5]
          },
          class_type: "ETM_SaveImage",
          _meta: {
            title: "ETM Save Image"
          }
        }
      },
      workflow_parameters: {
        seed: seed,
        upload: uploadFile,
        reference_image_url: opts?.referenceUrl || "https://image.artvibe.info/metadata/loras/ipstyles/ip_1_412.webp"
      }
    };
  }
  async poll(stream) {
    console.log("[POLL] Polling stream...");
    let buf = "";
    let lastProg = 0;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Stream timeout after 6 minutes"));
      }, this.timeout);
      stream.on("data", chunk => {
        try {
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim() || !line.startsWith("{")) continue;
            try {
              const data = JSON.parse(line);
              if (data?.progress && data.progress !== lastProg) {
                console.log(`[POLL] ${(data.progress * 100).toFixed(1)}% - ${data?.title || "Processing..."}`);
                lastProg = data.progress;
              }
              if (data?.type === "result" && data?.message) {
                console.log("[POLL] Result received");
                clearTimeout(timeout);
                const imgBuf = Buffer.from(data.message, "base64");
                resolve({
                  buffer: imgBuf,
                  length: imgBuf.length,
                  base64: data.message,
                  time: data?.time,
                  cache: data?.cache,
                  suggestion: data?.suggestion
                });
              }
              if (data?.status === "error") {
                clearTimeout(timeout);
                reject(new Error(data?.message || "Stream error"));
              }
            } catch (parseErr) {
              console.error("[POLL] Parse error:", parseErr?.message);
            }
          }
        } catch (err) {
          console.error("[POLL] Chunk error:", err?.message);
        }
      });
      stream.on("end", () => {
        clearTimeout(timeout);
        console.log("[POLL] Stream ended");
        reject(new Error("Stream ended without result"));
      });
      stream.on("error", err => {
        clearTimeout(timeout);
        console.error("[POLL] Stream error:", err?.message || err);
        reject(err);
      });
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      supportedActions: ["tr", "sug", "gen", "rec", "cfg"]
    });
  }
  const api = new ArtVibeAPI();
  try {
    let response;
    switch (action) {
      case "cfg":
      case "config":
        response = await api.cfg();
        return res.status(200).json(response);
      case "rec":
      case "recommend":
        response = await api.rec(params);
        return res.status(200).json(response);
      case "tr":
      case "translate":
        if (!params?.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'tr'."
          });
        }
        response = await api.tr(params);
        return res.status(200).json(response);
      case "sug":
      case "suggestion":
        if (!params?.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'sug'."
          });
        }
        response = await api.sug(params);
        return res.status(200).json(response);
      case "gen":
      case "generate":
        if (!params?.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'gen'."
          });
        }
        response = await api.gen(params);
        if (response?.buffer instanceof Buffer) {
          res.setHeader("Content-Type", "image/webp");
          res.setHeader("Content-Length", response?.length);
          return res.status(200).send(response.buffer);
        } else {
          return res.status(500).json({
            success: false,
            error: "Output 'gen' tidak valid atau tidak berisi data gambar."
          });
        }
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supportedActions: ["tr", "sug", "gen", "rec", "cfg"]
        });
    }
  } catch (error) {
    console.error(`[FATAL] Action '${action}' error:`, error?.message);
    if (error?.response?.data) {
      console.error("API Response:", error.response.data);
    }
    return res.status(500).json({
      success: false,
      error: error?.message || "Terjadi kesalahan internal pada server.",
      action: action
    });
  }
}