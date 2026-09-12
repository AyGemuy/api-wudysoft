import axios from "axios";
class MidgenAI {
  constructor() {
    this.models = {
      sdxl_base: {
        maxSteps: 50,
        defSteps: 20
      },
      flux_schnell: {
        maxSteps: 4,
        defSteps: 4
      }
    };
    this.ratios = {
      "1:1": {
        w: 1024,
        h: 1024
      },
      square: {
        w: 1024,
        h: 1024
      },
      "16:9": {
        w: 1024,
        h: 576
      },
      landscape: {
        w: 1024,
        h: 576
      },
      "9:16": {
        w: 576,
        h: 1024
      },
      portrait: {
        w: 576,
        h: 1024
      },
      "21:9": {
        w: 1024,
        h: 448
      },
      wide: {
        w: 1024,
        h: 448
      },
      "4:3": {
        w: 1024,
        h: 768
      },
      classic: {
        w: 1024,
        h: 768
      },
      "3:2": {
        w: 1024,
        h: 682
      },
      photo: {
        w: 1024,
        h: 682
      },
      "2:3": {
        w: 682,
        h: 1024
      },
      mobile: {
        w: 682,
        h: 1024
      },
      "4:5": {
        w: 800,
        h: 1e3
      },
      social: {
        w: 800,
        h: 1e3
      }
    };
    this.styles = {
      movie: "cinematic movie style, dramatic lighting, ultra realistic, shallow depth of field, 8k",
      cartoon: "cartoon illustration style, vibrant colors, soft shading, cute proportions",
      space: "sci-fi space art, galaxy background, cosmic lighting, futuristic, ultra detailed",
      horror: "dark horror atmosphere, eerie lighting, shadows, cinematic horror style",
      nature: "peaceful nature landscape, natural lighting, realistic, serene mood"
    };
    this.client = axios.create({
      baseURL: "https://www.midgenai.com/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.midgenai.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.midgenai.com/generate/text-to-image",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 12e4
    });
  }
  valMdl(m) {
    try {
      const key = (m?.toLowerCase()?.includes("flux") ? "flux_schnell" : m?.toLowerCase()) || "sdxl_base";
      return this.models[key] ? key : "sdxl_base";
    } catch (err) {
      console.error(`[MidgenAI] Error pada valMdl: ${err?.message}`);
      return "sdxl_base";
    }
  }
  valDim(r, w, h) {
    try {
      if (w && h) return {
        w: Number(w),
        h: Number(h)
      };
      const normRatio = r?.toString()?.toLowerCase() || "1:1";
      return this.ratios[normRatio] || this.ratios["1:1"];
    } catch (err) {
      console.error(`[MidgenAI] Error pada valDim: ${err?.message}`);
      return {
        w: 1024,
        h: 1024
      };
    }
  }
  bldPrompt(p, s) {
    try {
      const stylePrompt = s && this.styles[s?.toLowerCase()] ? `, ${this.styles[s.toLowerCase()]}` : "";
      return `${(p || "").trim()}${stylePrompt}`;
    } catch (err) {
      console.error(`[MidgenAI] Error pada bldPrompt: ${err?.message}`);
      return p || "";
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      console.log("[MidgenAI] Memeriksa input parameter...");
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error("[MidgenAI] Validasi gagal: prompt kosong.");
        return {
          status: false,
          result: 'Field "prompt" wajib diisi dan berupa string tidak kosong.'
        };
      }
      const {
        ratio,
        style,
        steps,
        negativePrompt,
        ...overrides
      } = rest || {};
      const model = this.valMdl(overrides?.model || rest?.model);
      const {
        w,
        h
      } = this.valDim(ratio, overrides?.width, overrides?.height);
      const finalPrompt = this.bldPrompt(prompt, style);
      const maxSteps = this.models[model]?.maxSteps || 20;
      const numSteps = overrides?.num_steps !== undefined ? Number(overrides.num_steps) : steps !== undefined ? Math.min(Number(steps), maxSteps) : this.models[model]?.defSteps;
      const seed = overrides?.seed !== undefined ? Number(overrides.seed) : 0;
      const negPrompt = overrides?.negative_prompt ?? negativePrompt ?? "";
      const guidance = overrides?.guidance_scale !== undefined ? Number(overrides.guidance_scale) : 5;
      const body = {
        prompt: finalPrompt,
        model: model,
        height: h,
        width: w,
        num_steps: numSteps,
        seed: seed,
        negative_prompt: negPrompt,
        guidance_scale: guidance,
        ...overrides
      };
      console.log(`[MidgenAI] Mengirim payload ke API [${body.model} | ${body.width}x${body.height}]...`);
      const response = await this.client.post("/image-generate", body);
      const data = response?.data;
      if (data?.blocked) {
        console.warn(`[MidgenAI] Permintaan diblokir: ${data?.error}`);
        return {
          status: false,
          result: data?.error || "Permintaan diblokir oleh filter keamanan sistem."
        };
      }
      console.log("[MidgenAI] Proses generate selesai dengan sukses.");
      return {
        status: true,
        result: {
          ...data
        }
      };
    } catch (err) {
      console.error(`[MidgenAI] Error koneksi/server: ${err?.response?.data?.error || err?.message}`);
      return {
        status: false,
        result: err?.response?.data?.error || err?.message || "Terjadi kesalahan internal pada saat request."
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
  const api = new MidgenAI();
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