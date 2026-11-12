import axios from "axios";
import ApiKey from "@/configs/api-key";
class SegmindAI {
  constructor() {
    this.apiKeys = ApiKey.segmind || [];
    this.currentKeyIndex = 0;
    this.baseUrl = "https://api.segmind.com/v2";
  }
  getHeaders() {
    return {
      "x-api-key": this.apiKeys[this.currentKeyIndex],
      "Content-Type": "application/json"
    };
  }
  rotateKey() {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      console.log(`[SegmindAI] Switching to API Key Index: ${this.currentKeyIndex}`);
    }
  }
  _formatResult(status, message, data = null) {
    return {
      status: status,
      message: message,
      data: data,
      models: this.models()
    };
  }
  _findModel(modelName) {
    const allGroups = this.models();
    for (const key in allGroups) {
      const found = allGroups[key].find(m => m.model === modelName);
      if (found) return found;
    }
    return null;
  }
  models() {
    return {
      banana: [{
        model: "nano-banana-2",
        payload: {
          prompt: "",
          seed: 420875,
          image_urls: [],
          web_search: false,
          aspect_ratio: "1:1",
          output_format: "jpg",
          thinking_level: "minimal",
          safety_tolerance: 4,
          output_resolution: "1K",
          response_modalities: "TEXT_AND_IMAGE"
        }
      }, {
        model: "nano-banana-2-lite",
        payload: {
          prompt: "",
          seed: 778812,
          aspect_ratio: "1:1",
          output_format: "jpg",
          thinking_level: "high",
          safety_tolerance: 4,
          output_resolution: "1K",
          response_modalities: "TEXT_AND_IMAGE"
        }
      }],
      ideogram: [{
        model: "ideogram-v4-fast",
        payload: {
          prompt: "",
          rendering_speed: "DEFAULT",
          resolution: "2048x2048",
          enable_copyright_detection: false
        }
      }, {
        model: "ideogram-4",
        payload: {
          prompt: "",
          rendering_speed: "QUALITY",
          image_size: "square_hd",
          num_images: 1,
          enable_prompt_expansion: true,
          output_format: "jpeg",
          seed: 123456,
          enable_safety_checker: true
        }
      }],
      seedream: [{
        model: "seedream-5-pro",
        payload: {
          prompt: "",
          image_input: [],
          aspect_ratio: "3:2",
          size: "2K",
          output_format: "jpeg",
          watermark: false
        }
      }],
      google: [{
        model: "imagen-4-fast",
        payload: {
          prompt: "",
          negative_prompt: "blurry, pixelated, ugly, distorted, low quality",
          aspect_ratio: "16:9"
        }
      }, {
        model: "imagen-4-ultra",
        payload: {
          prompt: "",
          negative_prompt: "blurry, pixelated, ugly, deformed, cartoon, painting",
          aspect_ratio: "1:1"
        }
      }],
      heygen: [{
        model: "heygen-generate-look",
        payload: {
          prompt: "wearing a smart casual outfit in a bright modern studio",
          group_id: "",
          orientation: "square",
          pose: "half_body",
          style: "Realistic"
        }
      }],
      higgsfield: [{
        model: "higgsfield-soul-2",
        payload: {
          prompt: "",
          aspect_ratio: "3:4",
          resolution: "1080p",
          image_url: "",
          seed: 123456
        }
      }],
      gpt: [{
        model: "gpt-image-2",
        payload: {
          size: "1536x1024",
          prompt: "",
          quality: "high",
          background: "opaque",
          image_urls: [],
          moderation: "auto",
          output_format: "png",
          output_compression: 100
        }
      }],
      video: [{
        model: "seedance-2.0-mini",
        payload: {
          prompt: "",
          duration: 5,
          resolution: "720p",
          aspect_ratio: "16:9",
          generate_audio: true,
          seed: 42,
          first_frame_url: ""
        }
      }, {
        model: "grok-imagine-video",
        payload: {
          prompt: "",
          duration: 6,
          resolution: "480p",
          aspect_ratio: "16:9"
        }
      }]
    };
  }
  async generate({
    model,
    ...inputRest
  }) {
    try {
      console.log(`\n[SegmindAI] Processing request for: ${model}`);
      const modelData = this._findModel(model);
      if (!modelData) {
        return this._formatResult(false, `Model '${model}' tidak ditemukan.`);
      }
      const defaultPayload = modelData.payload;
      const input = {
        ...defaultPayload,
        ...inputRest
      };
      const mandatoryKeys = ["prompt", "image_url", "image_urls", "image_input", "first_frame_url", "group_id"];
      for (const key of mandatoryKeys) {
        if (key in defaultPayload) {
          const val = input[key];
          const isEmpty = val === "" || val === null || val === undefined || Array.isArray(val) && val.length === 0;
          if (isEmpty) {
            return this._formatResult(false, `Parameter '${key}' wajib diisi untuk model '${model}'`);
          }
        }
      }
      const payload = {
        ...input
      };
      let createData = null;
      let success = false;
      let lastErrorMsg = "Unknown error";
      for (let i = 0; i < this.apiKeys.length; i++) {
        try {
          const response = await axios.post(`${this.baseUrl}/${model}`, payload, {
            headers: this.getHeaders()
          });
          createData = response.data;
          if (!createData || !createData.request_id) {
            const apiMsg = createData?.message || "Invalid API response";
            throw new Error(apiMsg);
          }
          success = true;
          break;
        } catch (error) {
          lastErrorMsg = error?.response?.data?.message || error?.response?.data?.error || error.message;
          console.error(`[SegmindAI] Error pada API Key Index [${this.currentKeyIndex}]: ${lastErrorMsg}`);
          this.rotateKey();
          continue;
        }
      }
      if (!success) {
        return this._formatResult(false, `Semua API key gagal digunakan. Error terakhir: ${lastErrorMsg}`);
      }
      const requestId = createData.request_id;
      console.log(`[SegmindAI] Task Created ID: ${requestId}`);
      return await this._poll(requestId);
    } catch (error) {
      console.error("[SegmindAI] System Error:", error.message);
      return this._formatResult(false, `System Error: ${error.message}`);
    }
  }
  async _poll(requestId) {
    let isComplete = false;
    while (!isComplete) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const {
          data: checkData
        } = await axios.get(`${this.baseUrl}/requests/${requestId}/status`, {
          headers: this.getHeaders()
        });
        const state = (checkData?.status || "").toUpperCase();
        process.stdout.write(`\r[SegmindAI] Status: ${state}...`);
        if (state === "COMPLETED") {
          console.log("\n[SegmindAI] Finished!");
          isComplete = true;
          const {
            data: resultData
          } = await axios.get(`${this.baseUrl}/requests/${requestId}`, {
            headers: this.getHeaders()
          });
          return this._formatResult(true, "Task completed successfully", {
            requestId: requestId,
            ...resultData
          });
        } else if (state === "FAILED") {
          console.log("\n[SegmindAI] Failed.");
          return this._formatResult(false, "Proses pada server Segmind gagal.");
        }
      } catch (err) {
        if (err?.response?.status === 422) {
          console.log("\n[SegmindAI] Failed (HTTP 422).");
          return this._formatResult(false, `Task Failed: ${err?.response?.data?.message || "Unprocessable Entity"}`);
        }
        return this._formatResult(false, `Polling Error: ${err.message}`);
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new SegmindAI();
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