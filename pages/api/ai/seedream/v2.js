import axios from "axios";
import FormData from "form-data";
import https from "https";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
const httpsAgent = new https.Agent({
  keepAlive: true
});
const commonHeaders = {
  accept: "*/*",
  "accept-language": "id-ID",
  origin: "https://www.seedream.best",
  priority: "u=1, i",
  referer: "https://www.seedream.best/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  ...SpoofHead()
};
const MODELS = {
  "seedream-5.0-lite": {
    endpoint: "/image-to-image",
    resolutions: ["2K", "3K", "4K"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
    allowMultiImages: true,
    maxGenerateImages: 15
  },
  "seedream-4.5": {
    endpoint: "/image-to-image",
    resolutions: ["2K", "4K"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
    allowMultiImages: true,
    maxGenerateImages: 15
  },
  "seedream-4.0": {
    endpoint: "/image-to-image",
    resolutions: ["1K", "2K", "4K"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
    allowMultiImages: true,
    maxGenerateImages: 15
  },
  "nano-banana": {
    endpoint: "/async-images/nano-banana-pro",
    resolutions: ["1K"],
    aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
    allowMultiImages: false,
    maxGenerateImages: 1
  },
  "nano-banana-2": {
    endpoint: "/async-images/nano-banana-pro",
    resolutions: ["1K", "2K", "4K"],
    aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "1:4", "4:1", "1:8", "8:1"],
    allowMultiImages: false,
    maxGenerateImages: 1
  },
  "nano-banana-pro": {
    endpoint: "/async-images/nano-banana-pro",
    resolutions: ["1K", "2K", "4K"],
    aspectRatios: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
    allowMultiImages: false,
    maxGenerateImages: 1
  },
  "gpt-image-2": {
    endpoint: "/image-to-image",
    resolutions: ["2K"],
    aspectRatios: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9", "9:21", "2:1", "1:2", "3:1", "1:3"],
    allowMultiImages: false,
    maxGenerateImages: 1
  }
};
class SeedreamAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://www.seedream.best/api",
      headers: commonHeaders,
      httpsAgent: httpsAgent
    });
    console.log("SeedreamAPI instance created with native model configurations.");
  }
  async _upload(image) {
    console.log("Starting image upload process...");
    try {
      const form = new FormData();
      let imageBuffer;
      const filename = "image.jpg";
      if (typeof image === "string" && image.startsWith("http")) {
        console.log("Downloading image from URL...");
        const response = await axios.get(image, {
          responseType: "arraybuffer",
          httpsAgent: httpsAgent
        });
        imageBuffer = Buffer.from(response.data);
      } else if (typeof image === "string") {
        console.log("Decoding Base64 image...");
        imageBuffer = Buffer.from(image, "base64");
      } else if (image instanceof Buffer) {
        console.log("Using image from Buffer...");
        imageBuffer = image;
      } else {
        throw new Error("Unsupported image format. Use URL, Base64, or Buffer.");
      }
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("folder", "seedream/uploads");
      const response = await this.api.post("/storage/upload", form, {
        headers: {
          ...this.api.defaults.headers.common,
          ...form.getHeaders()
        }
      });
      if (!response.data?.url) {
        throw new Error("Upload successful, but no URL was returned.");
      }
      const uploadedUrl = response.data.url;
      console.log("Image uploaded successfully:", uploadedUrl);
      return uploadedUrl;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error during upload:", error.response?.data || error.message);
      } else {
        console.error("Generic error during upload:", error.message);
      }
      throw error;
    }
  }
  async generate({
    prompt,
    model = "seedream-5.0-lite",
    imageUrl = null,
    aspectRatio,
    resolution,
    numberOfImages = 1,
    ...rest
  }) {
    console.log("Starting generation process...");
    if (!prompt) {
      throw new Error("Prompt is a required field.");
    }
    const config = MODELS[model];
    if (!config) {
      throw new Error(`Invalid model. Available models: ${Object.keys(MODELS).join(", ")}`);
    }
    const finalAspectRatio = aspectRatio && config.aspectRatios.includes(aspectRatio) ? aspectRatio : config.aspectRatios[0];
    const finalResolution = resolution && config.resolutions.includes(resolution) ? resolution : config.resolutions[0];
    const finalNumberOfImages = config.allowMultiImages ? Math.min(numberOfImages, config.maxGenerateImages) : 1;
    let finalImageUrl = null;
    let mode = "text-to-image";
    if (imageUrl) {
      mode = "image-to-image";
      finalImageUrl = await this._upload(imageUrl);
    }
    const payload = {
      prompt: prompt,
      model: model,
      mode: mode,
      aspectRatio: finalAspectRatio,
      resolution: finalResolution,
      numberOfImages: finalNumberOfImages,
      saveToStorage: rest.saveToStorage ?? true,
      ...finalImageUrl && {
        imageUrl: finalImageUrl
      },
      ...rest
    };
    const endpoint = config.endpoint;
    console.log(`Using endpoint: ${endpoint} | Mode: ${mode}`);
    console.log("Payload yang dikirim:", JSON.stringify(payload, null, 2));
    try {
      const response = await this.api.post(endpoint, payload, {
        headers: {
          ...this.api.defaults.headers.common,
          "content-type": "application/json"
        }
      });
      console.log("Generation successful.");
      return response.data || {};
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`API request failed with status ${error.response?.status}:`, error.response?.data || error.message);
      } else {
        console.error("Error during generation:", error.message);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new SeedreamAPI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}