import axios from "axios";
const BASE = "https://modelslab.com/api/v1/enterprise";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36",
  "Content-Type": "application/json",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Android WebView";v="146"',
  "sec-ch-ua-mobile": "?1",
  origin: "null",
  "x-requested-with": "com.waiimagemaker",
  "sec-fetch-site": "cross-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  priority: "u=1, i"
};
const DEFAULTS = {
  negative_prompt: "bad quality, blurry, distorted, low resolution",
  width: "768",
  height: "768",
  samples: 1,
  safety_checker: true,
  seed: null,
  base64: false,
  webhook: null,
  track_id: null
};
const ok = data => ({
  status: "success",
  data: data
});
const err = (message, raw) => ({
  status: "error",
  message: message,
  ...raw ? {
    raw: raw
  } : {}
});
class ModelsLab {
  constructor() {
    this.keys = ["tlszdqhzwfn1mg"];
    this.http = axios.create({
      baseURL: BASE,
      headers: HEADERS
    });
  }
  async post(path, body) {
    let lastError;
    for (const key of this.keys) {
      try {
        const {
          data
        } = await this.http.post(path, {
          key: key,
          ...body
        });
        return data;
      } catch (e) {
        lastError = e;
        console.warn(`[post] Key failed: ${key} -`, e?.response?.data ?? e.message);
      }
    }
    throw lastError;
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      if (!prompt) {
        return err("Missing required field: prompt");
      }
      const payload = {
        prompt: prompt,
        ...DEFAULTS,
        ...rest
      };
      console.log(`[generate] Creating image with prompt: "${prompt}"`);
      const data = await this.post("/realtime/text2img", payload);
      return ok(data);
    } catch (e) {
      const errorMsg = e?.response?.data?.message ?? e.message;
      console.error("[generate] Error:", errorMsg);
      return err(errorMsg, e?.response?.data);
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
  const api = new ModelsLab();
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