import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import PROMPT from "@/configs/ai-prompt";
class AIImageGenerator {
  constructor() {
    this.baseUrl = "https://ai-image.apihub.today";
    this.secretKey = "RtDpifY8lO57qqB6jnlR-TSqQw9l7Oe4PF4yWMD3dWc=";
    this.maxPollAttempts = 60;
    this.pollInterval = 3e3;
    const keyBytes = Buffer.from(this.secretKey, "base64");
    this.signingKey = keyBytes.slice(0, 16);
    this.encryptionKey = keyBytes.slice(16, 32);
  }
  fmtData(data, mode = "enc") {
    try {
      if (mode === "enc") {
        console.log("🔐 Encrypting data...");
        const dataStr = typeof data === "string" ? data : JSON.stringify(data);
        const iv = crypto.randomBytes(16);
        const timestamp = Math.floor(Date.now() / 1e3);
        const cipher = crypto.createCipheriv("aes-128-cbc", this.encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(dataStr, "utf8"), cipher.final()]);
        const version = Buffer.from([128]);
        const timestampBuffer = Buffer.allocUnsafe(8);
        timestampBuffer.writeBigInt64BE(BigInt(timestamp));
        const payload = Buffer.concat([version, timestampBuffer, iv, encrypted]);
        const hmac = crypto.createHmac("sha256", this.signingKey);
        hmac.update(payload);
        const signature = hmac.digest();
        const token = Buffer.concat([payload, signature]);
        return token.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      } else if (mode === "dec") {
        console.log("🔓 Decrypting data...");
        const tokenStr = data.replace(/-/g, "+").replace(/_/g, "/");
        const paddingNeeded = (4 - tokenStr.length % 4) % 4;
        const paddedToken = tokenStr + "=".repeat(paddingNeeded);
        const token = Buffer.from(paddedToken, "base64");
        const version = token[0];
        if (version !== 128) {
          throw new Error(`Unsupported version: 0x${version.toString(16)}`);
        }
        const timestamp = token.readBigInt64BE(1);
        console.log("📅 Token timestamp:", new Date(Number(timestamp) * 1e3).toISOString());
        const iv = token.slice(9, 25);
        const ciphertext = token.slice(25, -32);
        const receivedHmac = token.slice(-32);
        const payload = token.slice(0, -32);
        const hmac = crypto.createHmac("sha256", this.signingKey);
        hmac.update(payload);
        const computedHmac = hmac.digest();
        if (!receivedHmac.equals(computedHmac)) {
          throw new Error("HMAC verification failed - data may be tampered");
        }
        const decipher = crypto.createDecipheriv("aes-128-cbc", this.encryptionKey, iv);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const decryptedStr = decrypted.toString("utf8");
        try {
          return JSON.parse(decryptedStr);
        } catch {
          return decryptedStr;
        }
      } else {
        throw new Error(`Invalid mode: ${mode}. Use 'enc' or 'dec'`);
      }
    } catch (error) {
      console.error(`❌ ${mode === "enc" ? "Encryption" : "Decryption"} error:`, error?.message || error);
      throw error;
    }
  }
  async processImage(imageInput) {
    try {
      console.log("📸 Processing image input...");
      if (typeof imageInput === "string") {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
          console.log("🌐 Detected URL input");
          const response = await axios.get(imageInput, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response.data);
        } else if (imageInput.startsWith("data:image")) {
          console.log("📋 Detected base64 input");
          const base64Data = imageInput.split(",")[1] || imageInput;
          return Buffer.from(base64Data, "base64");
        } else {
          console.log("🔤 Detected base64 string");
          return Buffer.from(imageInput, "base64");
        }
      } else if (Buffer.isBuffer(imageInput)) {
        console.log("💾 Detected buffer input");
        return imageInput;
      }
      throw new Error("Invalid image format");
    } catch (error) {
      console.error("❌ Image processing error:", error?.message || error);
      throw error;
    }
  }
  async pollStatus(requestId) {
    console.log(`🔄 Starting polling for request: ${requestId}`);
    for (let attempt = 1; attempt <= this.maxPollAttempts; attempt++) {
      try {
        console.log(`📡 Poll attempt ${attempt}/${this.maxPollAttempts}`);
        const response = await axios.get(`${this.baseUrl}/get-request-status/${requestId}`, {
          headers: {
            "User-Agent": "okhttp/4.10.0",
            Accept: "application/json",
            "Accept-Encoding": "gzip"
          }
        });
        const status = response?.data?.gen_video_request?.status || response?.data?.status;
        console.log(`📊 Status: ${status}`);
        if (status === "COMPLETED") {
          const result = response?.data?.gen_video_request?.result || response?.data?.result;
          console.log("✅ Generation completed:", result);
          return result;
        } else if (status === "FAILED") {
          throw new Error("Generation failed");
        }
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      } catch (error) {
        console.error(`⚠️ Poll attempt ${attempt} error:`, error?.message || error);
        if (attempt === this.maxPollAttempts) throw error;
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    image,
    image2,
    prompt,
    width,
    height,
    quality = "normal",
    ...rest
  }) {
    try {
      console.log("🚀 Starting generation process...");
      const isMultiImage = image2 !== undefined && image2 !== null;
      const isLowQuality = quality === "low";
      console.log(`📊 Mode: ${isMultiImage ? "Multi-Image" : "Single-Image"} | Quality: ${quality}`);
      const imageBuffer = await this.processImage(image);
      const imageBuffer2 = isMultiImage ? await this.processImage(image2) : null;
      const defaultPrompt = PROMPT.text;
      const payloadData = {
        prompt: prompt || defaultPrompt,
        width: width || 594,
        height: height || 594,
        webhook_url: "https://ai-image.apihub.today/test-webhook",
        ...rest
      };
      console.log("📦 Payload:", payloadData);
      const encryptedData = this.fmtData(payloadData, "enc");
      const formData = new FormData();
      formData.append("encrypted", encryptedData, {
        contentType: "text/plain; charset=utf-8",
        filename: ""
      });
      formData.append("image_file", imageBuffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      if (isMultiImage && imageBuffer2) {
        formData.append("image2_file", imageBuffer2, {
          filename: "image2.jpg",
          contentType: "image/jpeg"
        });
      }
      let endpoint;
      if (isMultiImage) {
        endpoint = `${this.baseUrl}/v2/gen-image-from-multi-ref-image-form`;
        console.log("📤 Using multi-image endpoint");
      } else if (isLowQuality) {
        endpoint = `${this.baseUrl}/v2/gen-low-image-from-ref-image`;
        console.log("📤 Using low-quality endpoint");
      } else {
        endpoint = `${this.baseUrl}/v2/gen-image-from-ref-image`;
        console.log("📤 Using normal-quality endpoint");
      }
      console.log("📤 Sending request to:", endpoint);
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          "User-Agent": "okhttp/4.10.0",
          Accept: "application/json",
          "Accept-Encoding": "gzip"
        }
      });
      const requestId = response?.data?.request_id;
      if (!requestId) {
        throw new Error("No request_id received");
      }
      console.log("🎫 Request ID:", requestId);
      const resultUrl = await this.pollStatus(requestId);
      return {
        success: true,
        id: requestId,
        result: resultUrl,
        quality: quality,
        mode: isMultiImage ? "multi" : "single",
        data: response.data
      };
    } catch (error) {
      console.error("❌ Generation error:", error?.response?.data || error?.message || error);
      return {
        success: false,
        error: error?.response?.data || error?.message || "Unknown error"
      };
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
  const api = new AIImageGenerator();
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