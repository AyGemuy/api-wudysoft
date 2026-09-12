import axios from "axios";
import crypto from "crypto";
class StufferAI {
  constructor() {
    try {
      this.models = {
        "wan2.2-t2v": "Wan2.2-T2V-A14B-HighNoise-Q4_K_S.gguf",
        "wan2.2-i2v": "Wan2.2-I2V-A14B-HighNoise-Q4_K_S.gguf",
        "ltx2-t2v": "ltx2-t2v",
        "ltx2-i2v": "ltx2-i2v",
        "minimax-h3-t2v": "minimax-h3-t2v",
        "minimax-h3-i2v": "minimax-h3-i2v",
        "qwen-image-2512": "Qwen-Image-2512",
        anima: "Anima",
        "z-image": "Z-Image",
        "qwen-edit": "Qwen-Rapid-AIO-NSFW-v19.safetensors",
        hyperfusion: "hyperfusionVpred_v9Vpred_final.safetensors",
        "hyperfusion-v9-final": "hyperfusionVpred_v9Vpred_final.safetensors",
        "hyperfusion-v9-ep13": "hyperfusion_3082k_v9_v-pred_ep13_test.safetensors",
        "hyperfusion-v9-ep11": "hyperfusion_3082k_v9_v-pred_ep11_test.safetensors",
        "hyperfusion-v9-ep9": "hyperfusion_3082k_v9_v-pred_ep9_test.safetensors",
        "hyperfusion-v8": "hyperfusion_1401k_v8_test_ep12_finetune.safetensors",
        "hyperfusion-v7": "hyperfusionFinetune_v7.safetensors",
        pornmaster: "pornmaster_proSDXLV7.safetensors",
        "pornmaster-v7": "pornmaster_proSDXLV7.safetensors",
        "pornmaster-v6": "pornmaster_proSDXLV6VAE.safetensors",
        cyberrealistic: "cyberrealistic_v70DMD2.safetensors",
        "cyberrealistic-v7": "cyberrealistic_v70DMD2.safetensors",
        "cyberillustrious-v5": "cyberillustrious_v50.safetensors",
        waiillustrious: "waiIllustriousSDXL_v160.safetensors",
        "waiillustrious-v16": "waiIllustriousSDXL_v160.safetensors",
        "wainsfwillustrious-v14": "waiNSFWIllustrious_v140.safetensors",
        "no-skinny-chicks": "noSkinnyChicks_aeaeaGladeIII.safetensors",
        "bbw-aurora-borealis": "bbw_Aurora Borealis.safetensors",
        bigbellybabes: "bigbellybabes_v20.safetensors",
        "bigbellybabes-v2": "bigbellybabes_v20.safetensors",
        "bigbellybabes-v1": "bigbellybabes_v10.safetensors",
        "flux-krea": "svdq-fp4_r32-flux.1-krea-dev.safetensors",
        "flux-kontext": "svdq-int4_r32-flux.1-kontext-dev.safetensors"
      };
      this.ratios = {
        "832x1216": {
          w: "832",
          h: "1216"
        },
        "1216x832": {
          w: "1216",
          h: "832"
        },
        "1024x1024": {
          w: "1024",
          h: "1024"
        },
        "896x896": {
          w: "896",
          h: "896"
        },
        "704x832": {
          w: "704",
          h: "832"
        },
        "832x704": {
          w: "832",
          h: "704"
        },
        "512x512": {
          w: "512",
          h: "512"
        },
        "512x768": {
          w: "512",
          h: "768"
        },
        "768x512": {
          w: "768",
          h: "512"
        },
        "352x640": {
          w: "352",
          h: "640"
        },
        "640x352": {
          w: "640",
          h: "352"
        },
        "480x704": {
          w: "480",
          h: "704"
        },
        "704x480": {
          w: "704",
          h: "480"
        },
        "480x832": {
          w: "480",
          h: "832"
        },
        "832x480": {
          w: "832",
          h: "480"
        },
        "544x960": {
          w: "544",
          h: "960"
        },
        "960x544": {
          w: "960",
          h: "544"
        },
        "960x720": {
          w: "960",
          h: "720"
        },
        "920x544": {
          w: "920",
          h: "544"
        },
        "544x920": {
          w: "544",
          h: "920"
        },
        portrait: {
          w: "832",
          h: "1216"
        },
        landscape: {
          w: "1216",
          h: "832"
        },
        square: {
          w: "1024",
          h: "1024"
        },
        "1:1": {
          w: "1024",
          h: "1024"
        },
        "2:3": {
          w: "832",
          h: "1216"
        },
        "3:2": {
          w: "1216",
          h: "832"
        },
        "9:16": {
          w: "544",
          h: "960"
        },
        "16:9": {
          w: "960",
          h: "544"
        }
      };
    } catch (err) {
      console.error(`[StufferAI] Error pada constructor: ${err?.message}`);
    }
  }
  _resolveSession(state) {
    try {
      if (state && typeof state === "string") {
        try {
          const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
          if (decoded.clientUUID && decoded.fingerprint && decoded.ageCookie) {
            const cookies = `clientUUID=${decoded.clientUUID}; ageok=${decoded.ageCookie}; ban_track=${decoded.banTrack}`;
            return {
              ...decoded,
              cookies: cookies,
              rawState: state
            };
          }
        } catch (parseErr) {
          console.warn(`[StufferAI] Gagal decode state base64: ${parseErr?.message}`);
        }
      }
      const clientUUID = crypto.randomUUID();
      const fingerprint = crypto.createHash("md5").update(crypto.randomBytes(16)).digest("hex");
      const banTrack = crypto.createHash("md5").update(crypto.randomBytes(16)).digest("hex");
      const now = Date.now();
      const agePayload = Buffer.from(JSON.stringify({
        v: 2,
        ts: now,
        scope: "18plus",
        accepted: true
      })).toString("base64url");
      const ageSig = crypto.randomBytes(32).toString("base64url");
      const ageCookie = `${agePayload}.${ageSig}`;
      const sessionObj = {
        clientUUID: clientUUID,
        fingerprint: fingerprint,
        banTrack: banTrack,
        ageCookie: ageCookie
      };
      const cookies = `clientUUID=${clientUUID}; ageok=${ageCookie}; ban_track=${banTrack}`;
      const rawState = Buffer.from(JSON.stringify(sessionObj)).toString("base64");
      return {
        ...sessionObj,
        cookies: cookies,
        rawState: rawState
      };
    } catch (err) {
      console.error(`[StufferAI] Error pada _resolveSession: ${err?.message}`);
      return {
        clientUUID: crypto.randomUUID(),
        fingerprint: "unknown",
        banTrack: "unknown",
        ageCookie: "",
        cookies: "",
        rawState: ""
      };
    }
  }
  async _resolveImage(input) {
    try {
      if (!input) return "";
      if (Buffer.isBuffer(input)) {
        return input.toString("base64");
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("data:")) {
          return trimmed.split(",")[1] || "";
        }
        if (/^https?:\/\//i.test(trimmed)) {
          try {
            const res = await axios.get(trimmed, {
              responseType: "arraybuffer",
              timeout: 2e4
            });
            return Buffer.from(res.data).toString("base64");
          } catch (fetchErr) {
            console.warn(`[StufferAI] Gagal mengunduh gambar dari URL: ${fetchErr?.message}`);
            return "";
          }
        }
        return trimmed;
      }
      return "";
    } catch (err) {
      console.error(`[StufferAI] Error pada _resolveImage: ${err?.message}`);
      return "";
    }
  }
  _valDim(r, w, h) {
    try {
      if (w && h) return {
        w: String(w),
        h: String(h)
      };
      const normRatio = r?.toString()?.toLowerCase() || "portrait";
      return this.ratios[normRatio] || this.ratios["portrait"];
    } catch (err) {
      console.error(`[StufferAI] Error pada _valDim: ${err?.message}`);
      return {
        w: "832",
        h: "1216"
      };
    }
  }
  _valModel(m) {
    try {
      if (!m) return "pornmaster_proSDXLV7.safetensors";
      const clean = m.toString().trim().toLowerCase().replace(/[\s_]+/g, "-");
      return this.models[clean] || m;
    } catch (err) {
      console.error(`[StufferAI] Error pada _valModel: ${err?.message}`);
      return "pornmaster_proSDXLV7.safetensors";
    }
  }
  _buildModelConfig(selectedModel, prompt, negativePrompt, steps, guidance, cfgScale, vae, loraPayload, wanLoras) {
    try {
      let cleanPrompt = (prompt || "").trim();
      let negPrompt = (negativePrompt || "").trim();
      let scheduler = "lcm";
      let finalSteps = steps ? String(steps) : "8";
      let finalCfg = String(cfgScale || guidance || "1");
      let finalVae = vae || "baked";
      let finalLoraPayload = loraPayload ? typeof loraPayload === "string" ? loraPayload : JSON.stringify(loraPayload) : "{}";
      let finalWanLoras = wanLoras || null;
      const isHyperfusion = selectedModel.includes("hyperfusion");
      const isFlux = selectedModel.includes("flux.1");
      const isQwen = selectedModel.includes("Qwen") || selectedModel === "Anima" || selectedModel === "Z-Image";
      const isFastGen = selectedModel.includes("pornmaster") || selectedModel.includes("wai") || selectedModel.includes("cyber");
      if (isHyperfusion) {
        scheduler = "euler_ancestral";
        finalSteps = steps ? String(steps) : "20";
        finalCfg = selectedModel.includes("ep13") || selectedModel.includes("final") ? "8" : "7";
        if (!cleanPrompt.startsWith("best quality, high rating, ")) {
          cleanPrompt = `best quality, high rating, ${cleanPrompt}`;
        }
        if (!negPrompt) {
          negPrompt = "worst quality, low rating, (signature),";
        }
      } else if (isFlux) {
        scheduler = "ddim";
        finalSteps = steps ? String(steps) : "20";
        finalCfg = "3.5";
        negPrompt = "";
      } else if (isQwen) {
        if (selectedModel === "Qwen-Image-2512" || selectedModel === "Qwen-Rapid-AIO-NSFW-v19.safetensors") {
          scheduler = "euler";
          finalSteps = "4";
          finalCfg = "1";
          negPrompt = "";
        } else if (selectedModel === "Anima" || selectedModel === "Z-Image") {
          scheduler = "er_sde";
          finalSteps = steps ? String(steps) : "30";
          finalCfg = "4";
        }
      } else if (isFastGen) {
        scheduler = "lcm";
        finalSteps = "8";
        finalCfg = selectedModel.includes("cyberrealistic_v70DMD2") ? "1.5" : "1";
        finalVae = "baked";
      }
      return {
        cleanPrompt: cleanPrompt,
        negPrompt: negPrompt,
        scheduler: scheduler,
        finalSteps: finalSteps,
        finalCfg: finalCfg,
        finalVae: finalVae,
        finalLoraPayload: finalLoraPayload,
        finalWanLoras: finalWanLoras
      };
    } catch (err) {
      console.error(`[StufferAI] Error pada _buildModelConfig: ${err?.message}`);
      return {
        cleanPrompt: (prompt || "").trim(),
        negPrompt: (negativePrompt || "").trim(),
        scheduler: "lcm",
        finalSteps: "8",
        finalCfg: "1",
        finalVae: "baked",
        finalLoraPayload: "{}",
        finalWanLoras: null
      };
    }
  }
  async generate({
    state,
    prompt,
    negativePrompt,
    ratio,
    model,
    steps,
    guidance,
    cfgScale,
    seed,
    width,
    height,
    ...rest
  }) {
    try {
      console.log("[StufferAI] Memeriksa input parameter...");
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error("[StufferAI] Validasi gagal: prompt kosong.");
        return {
          status: false,
          result: 'Field "prompt" wajib diisi dan berupa string tidak kosong.'
        };
      }
      const session = this._resolveSession(state);
      const generationUuid = crypto.randomUUID();
      const selectedModel = this._valModel(model || rest?.model_id);
      const {
        w,
        h
      } = this._valDim(ratio, width, height);
      const inputImg1 = rest?.image || rest?.init_image || rest?.base64img;
      const resolvedImg1 = await this._resolveImage(inputImg1);
      const inputImg2 = rest?.image2 || rest?.base64img2;
      const resolvedImg2 = await this._resolveImage(inputImg2);
      const config = this._buildModelConfig(selectedModel, prompt, negativePrompt || rest?.negative_prompt, steps, guidance, cfgScale || rest?.cfg_scale, rest?.vae, rest?.loraPayload, rest?.wanLoras);
      const client = axios.create({
        baseURL: "https://stuffer.ai",
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          "content-type": "application/json",
          cookie: session.cookies,
          origin: "https://stuffer.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://stuffer.ai/?steps=${config.finalSteps}&guidance=${config.finalCfg}&strength=1&resolution=${w}x${h}&model=${selectedModel}&scheduler=${config.scheduler}&prompt=${encodeURIComponent(config.cleanPrompt)}&negativeprompt=${encodeURIComponent(config.negPrompt)}&tokenInterpretation=A1111&tokenNormalization=none&clipSkip=-1&vae=${config.finalVae}&loraPayload=%7B%7D&wanLoras=null`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-age-acknowledgement": session.ageCookie,
          "x-fingerprint": session.fingerprint
        },
        timeout: 3e5
      });
      const body = {
        model_id: selectedModel,
        prompt: config.cleanPrompt,
        negative_prompt: config.negPrompt,
        imgWidth: w,
        imgHeight: h,
        steps: config.finalSteps,
        seed: seed !== undefined && seed !== null && Number(seed) !== -1 ? String(seed) : "",
        scheduler: config.scheduler,
        cfg_scale: config.finalCfg,
        denoising_strength: String(rest?.denoising_strength || "1"),
        base64img: resolvedImg1,
        base64img2: resolvedImg2,
        img2imgstrength: String(rest?.img2imgstrength || "0.6"),
        start_percent: String(rest?.start_percent || "0"),
        end_percent: String(rest?.end_percent || "0.5"),
        controlnetmodel: rest?.controlnetmodel || "controlnet++_canny_sd15_fp16.safetensors",
        client_ip: "stuffer.ai",
        faceDetailer: rest?.faceDetailer || null,
        tokenInterpretation: rest?.tokenInterpretation || "A1111",
        tokenNormalization: rest?.tokenNormalization || "none",
        clipSkip: rest?.clipSkip ? String(rest.clipSkip) : "-1",
        vae: config.finalVae,
        loraPayload: config.finalLoraPayload,
        wanLoras: config.finalWanLoras,
        generationUuid: generationUuid,
        ...rest
      };
      console.log(`[StufferAI] Mengirim payload ke API [${body.model_id} | ${body.imgWidth}x${body.imgHeight} | Steps: ${body.steps}]...`);
      const response = await client.post("/generate", body);
      const data = response?.data;
      if (data?.error) {
        return {
          status: false,
          result: data.error
        };
      }
      console.log("[StufferAI] Request generate selesai.");
      return {
        status: true,
        result: {
          ...data,
          state: session.rawState
        }
      };
    } catch (err) {
      const errData = err?.response?.data;
      const errMsg = errData?.error || errData?.message || errData || err?.message || "Terjadi kesalahan internal pada request.";
      console.error(`[StufferAI] Error koneksi/server: ${typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg}`);
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
    const api = new StufferAI();
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