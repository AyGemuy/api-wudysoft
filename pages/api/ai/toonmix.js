import axios from "axios";
class ToonMix {
  constructor() {
    this.authUrl = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyCtEPD7MFc27-uR8FB2diwOy9FxXOsHu1o";
    this.api = "https://us-central1-media-generator-b03ac.cloudfunctions.net";
    this.sess = {};
    this.ua = {
      main: "okhttp/3.12.13",
      auth: "Dalvik/2.1.0 (Linux; U; Android 15; 25028RN03A Build/AP3A.240905.015.A2)"
    };
    this.head = {
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json; charset=utf-8",
      "firebase-instance-id-token": "e4u8BWbsR0Kmsh1mJp7eLW:APA91bESjXNGuiWgSc_Wj7xBpMw4FIQDwT3ZcsCfooTg5Yw20cIHlWR4Ogwjz-Z_uG2uLcKT0BGh9agoehsxZOI_JtVkn6fitN_LzYtksnJDzAYb-HZvBRk"
    };
  }
  async solve(img) {
    try {
      console.log("[ToonMix] Processing image...");
      if (Buffer.isBuffer(img)) return img.toString("base64");
      if (typeof img === "string" && img.startsWith("http")) {
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data).toString("base64");
      }
      return img;
    } catch (e) {
      console.log("[ToonMix] Image solve failed:", e.message);
      return null;
    }
  }
  make(prompt, params = {}) {
    const def = {
      seed: Math.floor(Math.random() * 1e9),
      width: 1024,
      height: 1024,
      steps: 28,
      scale: 5,
      model: "nai-diffusion-4-5-curated",
      sampler: "k_euler_ancestral"
    };
    const p = {
      ...def,
      ...params
    };
    return {
      negative_prompt: p.negative_prompt || null,
      params: {
        cfg_rescale: 0,
        seed: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: String(p.seed)
        },
        cfgScale: p.scale,
        noise_schedule: "karras",
        width: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: String(p.width)
        },
        model: p.model,
        steps: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: String(p.steps)
        },
        height: {
          "@type": "type.googleapis.com/google.protobuf.Int64Value",
          value: String(p.height)
        },
        cfg_scale: p.scale,
        sampler: p.sampler,
        add_quality_tags: true,
        negative_quality_tags_type: "heavy"
      },
      prompt: prompt
    };
  }
  async auth() {
    try {
      console.log("[ToonMix] Authenticating...");
      const headers = {
        "User-Agent": this.ua.auth,
        "X-Android-Package": "com.mediagenerator.toonmix",
        "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android"
      };
      const {
        data
      } = await axios.post(this.authUrl, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: headers
      });
      this.sess.token = data?.idToken;
      console.log(this.sess.token ? "[ToonMix] Auth Success." : "[ToonMix] Auth Failed.");
      return this.sess.token;
    } catch (e) {
      console.error("[ToonMix] Auth Error:", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      const token = this.sess.token || await this.auth();
      if (!token) throw new Error("Authentication failed");
      const imgBase64 = image ? await this.solve(image) : null;
      const endpoint = imgBase64 ? "/generateImg2Img" : "/generateImage";
      console.log(`[ToonMix] Mode: ${imgBase64 ? "Image-to-Image" : "Text-to-Image"}`);
      const coreParams = this.make(prompt, rest);
      const payload = {
        data: imgBase64 ? {
          ...coreParams,
          image: imgBase64,
          strength: rest.strength || .7,
          noise: rest.noise || .2
        } : coreParams
      };
      const {
        data
      } = await axios.post(`${this.api}${endpoint}`, payload, {
        headers: {
          ...this.head,
          "User-Agent": this.ua.main,
          authorization: `Bearer ${token}`
        }
      });
      const raw = data?.result?.image;
      if (!raw) throw new Error("No image data returned");
      console.log("[ToonMix] Generation success.");
      return {
        buffer: Buffer.from(raw, "base64"),
        contentType: "image/png",
        meta: data?.result?.metadata
      };
    } catch (e) {
      console.error(`[ToonMix] Error: ${e.response?.data?.error?.message || e.message}`);
      return {
        buffer: null,
        contentType: null
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
  const api = new ToonMix();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}