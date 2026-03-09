import axios from "axios";
import PROMPT from "@/configs/ai-prompt";
class GPTImage {
  constructor() {
    this.baseUrl = "https://ghibli-proxy.netlify.app/.netlify/functions/ghibli-proxy";
    this.availableModels = ["gpt-image-1", "gpt-image-1.5"];
  }
  async generate({
    prompt = PROMPT.text,
    image,
    model = "gpt-image-1",
    n = 1,
    size = "auto",
    quality = "low",
    ...rest
  } = {}) {
    try {
      if (!prompt) throw new Error("Prompt is required.");
      if (!image) throw new Error("Image (URL, Buffer, or Base64) is required.");
      if (!this.availableModels.includes(model)) {
        throw new Error(`Available models: ${this.availableModels.join(", ")}.`);
      }
      let imageBuffer;
      if (Buffer.isBuffer(image)) {
        imageBuffer = image;
      } else if (typeof image === "string") {
        if (image.startsWith("http")) {
          const response = await axios.get(image, {
            responseType: "arraybuffer"
          });
          imageBuffer = Buffer.from(response.data, "binary");
        } else if (image.includes("base64,")) {
          imageBuffer = Buffer.from(image.split("base64,")[1], "base64");
        } else {
          imageBuffer = Buffer.from(image, "base64");
        }
      } else {
        throw new Error("Unsupported image format. Use Buffer, URL, or Base64 string.");
      }
      const {
        data
      } = await axios.post(this.baseUrl, {
        image: "data:image/png;base64," + imageBuffer.toString("base64"),
        prompt: prompt,
        model: model,
        n: n,
        size: size,
        quality: quality,
        ...rest
      }, {
        headers: {
          origin: "https://overchat.ai",
          referer: "https://overchat.ai/",
          "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
        }
      });
      const resultB64 = data?.data?.[0]?.b64_json;
      if (!resultB64) throw new Error("No result found in API response.");
      const finalBuffer = Buffer.from(resultB64, "base64");
      return {
        buffer: finalBuffer,
        contentType: "image/png"
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new GPTImage();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}