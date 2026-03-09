import axios from "axios";
import ApiKey from "@/configs/api-key";
class Fireworks {
  constructor() {
    this.keys = ApiKey.fire;
    this.base = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models";
  }
  async _ri(image) {
    console.log("  [Image] Processing input image...");
    try {
      if (!image) return null;
      if (Buffer.isBuffer(image)) {
        console.log("  [Image] Converted Buffer to Base64");
        return image.toString("base64");
      }
      if (/^https?:\/\//.test(image)) {
        console.log(`  [Image] Downloading from URL: ${image.substring(0, 30)}...`);
        const r = await axios.get(image, {
          responseType: "arraybuffer"
        });
        console.log("  [Image] Download success, converting to Base64");
        return Buffer.from(r.data).toString("base64");
      }
      console.log("  [Image] Using Raw Base64");
      return image.replace(/^data:[^;]+;base64,/, "");
    } catch (e) {
      console.error("  [Image] Error processing image:", e.message);
      throw new Error("Image processing failed");
    }
  }
  async _rk(fn) {
    let lastError;
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      try {
        console.log(`  [Auth] Using Key #${i + 1} (${key.slice(0, 5)}***)`);
        return await fn(key);
      } catch (e) {
        lastError = e;
        const status = e.response?.status;
        const msg = e.response?.data?.message || e.message;
        console.warn(`  [Auth] Key #${i + 1} Failed (${status}): ${msg}`);
        if (![401, 403, 429].includes(status)) throw e;
      }
    }
    console.error("  [Auth] All keys exhausted.");
    throw lastError;
  }
  async _rp(model, id, key) {
    console.log(`  [Poll] Starting polling for Task ID: ${id}`);
    const url = `${this.base}/${model}/get_result`;
    for (let i = 1; i <= 30; i++) {
      try {
        await new Promise(r => setTimeout(r, 2e3));
        const {
          data
        } = await axios.post(url, {
          id: id
        }, {
          headers: {
            Authorization: `Bearer ${key}`
          }
        });
        const state = data.status?.state ?? data.status;
        console.log(`  [Poll] Attempt ${i}/30 - Status: ${state}`);
        if (["Ready", "SUCCESS", "COMPLETE", "succeeded"].includes(state) || data.result) {
          console.log("  [Poll] Task Finished!");
          return data;
        }
        if (["FAILED", "ERROR", "failed"].includes(state)) {
          throw new Error(`Task Failed: ${JSON.stringify(data.status)}`);
        }
      } catch (e) {
        if (e.message.startsWith("Task Failed")) throw e;
        console.warn(`  [Poll] Network blip: ${e.message}`);
      }
    }
    throw new Error("Polling timeout (60s)");
  }
  async generate({
    prompt,
    image,
    model,
    ...options
  }) {
    console.log("\n[Fireworks] === Start Generation ===");
    try {
      const isI2I = !!image;
      let selectedModel = model;
      if (!selectedModel) {
        selectedModel = isI2I ? "flux-kontext-pro" : "flux-1-schnell-fp8";
      }
      console.log(`  [Config] Mode: ${isI2I ? "I2I (Image-to-Image)" : "T2I (Text-to-Image)"}`);
      console.log(`  [Config] Model: ${selectedModel}`);
      console.log(`  [Config] Prompt: "${prompt.substring(0, 50)}..."`);
      const payload = {
        prompt: prompt,
        ...isI2I && {
          input_image: await this._ri(image)
        },
        ...options
      };
      if (!isI2I) {
        return await this._rk(async key => {
          console.log("  [Req] Sending T2I Request...");
          const response = await axios.post(`${this.base}/${selectedModel}/text_to_image`, payload, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
              Accept: "image/jpeg"
            },
            responseType: "arraybuffer"
          });
          console.log(`  [Res] Received ${response.data.length} bytes`);
          console.log("[Fireworks] === Success ===\n");
          return {
            buffer: Buffer.from(response.data),
            contentType: response.headers["content-type"] || "image/jpeg"
          };
        });
      } else {
        let activeKey;
        const initData = await this._rk(async key => {
          console.log("  [Req] Sending I2I Request (Async)...");
          activeKey = key;
          const {
            data
          } = await axios.post(`${this.base}/${selectedModel}`, payload, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`
            }
          });
          return data;
        });
        const taskId = initData.id || initData.request_id;
        console.log(`  [Req] Task ID Created: ${taskId}`);
        const resultJson = await this._rp(selectedModel, taskId, activeKey);
        console.log("  [Down] Processing result url...");
        const res = resultJson.result || {};
        let finalBuffer;
        if (res.sample) {
          console.log(`  [Down] Downloading from sample URL...`);
          const dl = await axios.get(res.sample, {
            responseType: "arraybuffer"
          });
          finalBuffer = Buffer.from(dl.data);
          console.log(`  [Down] Downloaded ${finalBuffer.length} bytes`);
        } else if (res.base64) {
          console.log(`  [Down] Converting result Base64 to Buffer...`);
          finalBuffer = Buffer.from(res.base64, "base64");
        } else {
          throw new Error("Response structure unknown (no sample/base64)");
        }
        console.log("[Fireworks] === Success ===\n");
        return {
          buffer: finalBuffer,
          contentType: "image/jpeg"
        };
      }
    } catch (e) {
      console.error("[Fireworks] === Failed ===");
      let errorMessage = e.message;
      if (e.response) {
        const raw = e.response.data;
        errorMessage = Buffer.isBuffer(raw) ? raw.toString() : JSON.stringify(raw);
        console.error(`  [Error] Status: ${e.response.status}`);
      }
      console.error(`  [Error] Detail: ${errorMessage}\n`);
      throw new Error(errorMessage);
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
  const api = new Fireworks();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data.contentType);
    return res.status(200).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}