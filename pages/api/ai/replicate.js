import axios from "axios";
import FormData from "form-data";
import ApiKey from "@/configs/api-key";
class ReplicateAPI {
  constructor() {
    this.apikey = ApiKey.replicate;
    this.baseURL = "https://api.replicate.com/v1";
    this.uploadURL = "https://bytech-services.live/bygen/api/upload.php";
    this.headers = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      TE: "gzip, deflate; q=0.5"
    };
  }
  async req(url, data, key) {
    console.log(`[REQ] ${url}`);
    try {
      const res = await axios.post(url, data, {
        headers: {
          ...this.headers,
          "Content-Type": "text/plain",
          Authorization: `Bearer ${key}`
        }
      });
      return res?.data || null;
    } catch (err) {
      console.log(`[ERR] ${err?.response?.status || err?.message}`);
      throw err;
    }
  }
  async get(url, key) {
    console.log(`[GET] ${url}`);
    try {
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${key}`
        }
      });
      return res?.data || null;
    } catch (err) {
      console.log(`[ERR] ${err?.response?.status || err?.message}`);
      throw err;
    }
  }
  async toBuf(url) {
    console.log(`[TOBUF] Downloading: ${url}`);
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: this.headers
      });
      return Buffer.from(res?.data || []);
    } catch (err) {
      console.log(`[TOBUF ERR] ${err?.message}`);
      throw err;
    }
  }
  async upload(image) {
    console.log("[UPLOAD] Processing image...");
    try {
      const form = new FormData();
      let buffer;
      if (typeof image === "string" && image.startsWith("http")) {
        console.log("[UPLOAD] URL detected, downloading...");
        buffer = await this.toBuf(image);
      } else if (Buffer.isBuffer(image)) {
        buffer = image;
      } else if (typeof image === "string" && image.startsWith("data:")) {
        buffer = Buffer.from(image.split(",")[1], "base64");
      } else {
        throw new Error("Unsupported image format");
      }
      form.append("image", buffer, {
        filename: "image.jpg",
        contentType: "image/*"
      });
      const res = await axios.post(this.uploadURL, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log(`[UPLOAD] Success: ${res?.data?.url}`);
      return res?.data?.url || null;
    } catch (err) {
      console.log(`[UPLOAD ERR] ${err?.message}`);
      throw err;
    }
  }
  async poll(id, key) {
    console.log(`[POLL] Task ${id}`);
    const maxAttempts = 60;
    const delay = 3e3;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await this.get(`${this.baseURL}/predictions/${id}`, key);
        console.log(`[POLL] Status: ${status?.status}`);
        if (status?.status === "succeeded") {
          return status;
        } else if (status?.status === "failed") {
          throw new Error(status?.error || "Task failed");
        }
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        if (i === maxAttempts - 1) throw err;
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    prompt,
    image,
    model,
    ...rest
  }) {
    console.log("[GEN] Starting generation...");
    const isI2I = !!image;
    let payload = {
      input: {
        prompt: prompt,
        ...rest
      }
    };
    let endpoint = "";
    if (isI2I) {
      console.log("[GEN] Mode: I2I");
      const imgs = Array.isArray(image) ? image : [image];
      const uploaded = [];
      for (const img of imgs) {
        const url = await this.upload(img);
        if (url) uploaded.push(url);
      }
      endpoint = model || "prunaai/p-image-edit";
      payload.input = {
        prompt: prompt,
        images: uploaded,
        disable_safety_checker: false,
        aspect_ratio: "3:4",
        turbo: true,
        ...rest
      };
      if (!endpoint.includes("edit")) {
        payload.input.image = uploaded;
        delete payload.input.images;
        payload.version = rest?.version || "972e2beef7079fb6d2f9ea53131c4aa15938d72b1f78dbcd429d8dcab826f01e";
      }
    } else {
      console.log("[GEN] Mode: T2I");
      endpoint = model || "prunaai/z-image-turbo";
      payload.input = {
        prompt: prompt,
        disable_safety_checker: false,
        height: 1024,
        width: 768,
        num_inference_steps: 8,
        output_format: "jpg",
        output_quality: 90,
        ...rest
      };
    }
    for (const key of this.apikey) {
      try {
        console.log(`[GEN] Trying key: ${key.slice(0, 8)}...`);
        const url = `${this.baseURL}/models/${endpoint}/predictions`;
        const result = await this.req(url, payload, key);
        const taskId = result?.id;
        if (!taskId) throw new Error("No task ID");
        const output = await this.poll(taskId, key);
        console.log("[GEN] Success!");
        return output;
      } catch (err) {
        console.log(`[GEN] Key failed: ${err?.message}`);
        if (this.apikey.indexOf(key) === this.apikey.length - 1) throw err;
      }
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
  const api = new ReplicateAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}