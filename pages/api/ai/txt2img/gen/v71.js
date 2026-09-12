import axios from "axios";
import qs from "qs";
class GenImage {
  constructor() {
    this.baseUrl = "https://getimg-x4mrsuupda-uc.a.run.app/";
    this.endpoint = "api-premium";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip"
    };
  }
  async generate({
    prompt,
    width = 1024,
    height = 1024,
    steps = 30,
    ...rest
  }) {
    console.log("[GEN]", {
      prompt: prompt,
      width: width,
      height: height,
      steps: steps,
      ...rest
    });
    if (!prompt?.trim()) {
      return {
        status: "error",
        result: {
          error: "Prompt is required"
        }
      };
    }
    const payload = qs.stringify({
      prompt: prompt,
      width: width,
      height: height,
      num_inference_steps: steps,
      ...rest
    });
    try {
      const res = await axios.post(this.baseUrl + this.endpoint, payload, {
        headers: this.headers
      });
      return {
        status: "success",
        result: res?.data ?? {}
      };
    } catch (err) {
      return {
        status: "error",
        result: {
          error: err?.response?.data || err?.message || "Request failed"
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
  const api = new GenImage();
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