import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class AIFluxGenerator {
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 6e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9",
        Accept: "*/*",
        ...SpoofHead()
      }
    });
    this.setupInterceptors();
    this.cookies = {};
    this.bearerToken = null;
    this.email = null;
    this.emailUuid = null;
    this.password = `P@ssw0rd${Math.floor(Math.random() * 1e6)}`;
    this.userName = `User${Math.floor(Math.random() * 1e6)}`;
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      if (Object.keys(this.cookies).length > 0) {
        config.headers["Cookie"] = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
      }
      if (this.bearerToken && !config.headers["Authorization"]) {
        config.headers["Authorization"] = this.bearerToken;
      }
      config.headers["Cache-Control"] = "no-cache";
      config.headers["Pragma"] = "no-cache";
      return config;
    }, error => {
      console.error("❌ Request Interceptor Error:", error.message);
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        console.log("🍪 Set-Cookie Header Received:", setCookieHeader);
        setCookieHeader.forEach(cookie => {
          const [cookiePair] = cookie.split(";")[0].split("=");
          const name = cookiePair[0];
          const value = cookiePair[1];
          if (name && value) {
            const trimmedName = name.trim();
            const trimmedValue = value.trim();
            this.cookies[trimmedName] = trimmedValue;
            console.log(`🍪 Cookie Updated: ${trimmedName}=${trimmedValue}`);
            if (trimmedName === "FE_TOKEN" && trimmedValue.match(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
              if (!this.bearerToken) {
                this.bearerToken = trimmedValue;
                console.log("✅ Bearer token (FE_TOKEN) extracted from cookie!");
              }
            }
            if (trimmedName.startsWith("_ga")) {
              console.log(`🍪 Google Analytics Cookie Captured: ${trimmedName}=${trimmedValue}`);
            }
          }
        });
      }
      try {
        if (response.data && response.data.data && response.data.data.token) {
          const tokenFromResponse = response.data.data.token;
          if (tokenFromResponse.match(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
            if (!this.bearerToken) {
              this.bearerToken = tokenFromResponse;
              console.log("✅ Bearer token extracted from response body (login success)");
            } else {
              console.log("✅ Bearer token already set. Skipping extraction from response body.");
            }
          }
        }
      } catch (e) {
        console.warn("⚠️ Could not parse response data or extract token from body:", e.message);
      }
      return response;
    }, error => {
      console.error("❌ Response Interceptor Error:", error.message);
      if (error.response) {
        console.error(`❌ Response Status: ${error.response.status}`);
        console.error("❌ Response Data:", JSON.stringify(error.response.data));
      }
      return Promise.reject(error);
    });
  }
  async createTempEmail() {
    try {
      const response = await this.axiosInstance.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      this.email = response.data.email;
      this.emailUuid = response.data.uuid;
      console.log("✅ Temporary email created:", this.email);
      console.log("📦 Create Email Response Data (Partial):", JSON.stringify({
        email: response.data.email,
        uuid: response.data.uuid
      }, null, 2));
      return response.data;
    } catch (error) {
      console.error("❌ Failed to create temporary email:", error.message);
      throw error;
    }
  }
  async requestOtp() {
    console.log(`🚀 Requesting OTP for email ${this.email} from aiflux.cc...`);
    try {
      const payload = {
        email: this.email
      };
      const response = await this.axiosInstance.post("https://aiflux.cc/api/auth/verify-code", payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://aiflux.cc",
          Referer: "https://aiflux.cc/auth/login"
        }
      });
      console.log("✅ OTP request sent. Response:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error("❌ Failed to request OTP:", error.message);
      if (error.response) {
        console.error("❌ OTP Request Error Response Data:", JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  async pollForOTP(maxAttempts = 60, intervalMs = 3e3) {
    console.log("🔄 Polling for OTP from email service...");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.axiosInstance.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`);
        if (response.data.data && response.data.data.length > 0) {
          const message = response.data.data[0];
          console.log(`📦 Poll OTP Message (Attempt ${attempt}):`, message.text_content ? message.text_content.substring(0, 100) + "..." : "[No content]");
          const otpMatch = message.text_content.match(/Your verification code is:\s*(\d+)/);
          if (otpMatch) {
            const otp = otpMatch[1];
            console.log("✅ OTP received:", otp);
            return otp;
          }
        } else {
          console.log(`📦 Poll OTP Response Data (Attempt ${attempt}): [No new messages]`);
        }
        console.log(`⏳ Attempt ${attempt}/${maxAttempts} - No OTP yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error(`❌ Error polling OTP (attempt ${attempt}):`, error.message);
        if (attempt === maxAttempts) {
          throw new Error("Failed to receive OTP after maximum attempts");
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error("OTP polling timeout");
  }
  async login(otp) {
    console.log(`🚀 Attempting to log in to aiflux.cc with email ${this.email} and OTP ${otp}...`);
    try {
      const payload = {
        email: this.email,
        verifyCode: otp
      };
      const response = await this.axiosInstance.post("https://aiflux.cc/api/auth/login", payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://aiflux.cc",
          Referer: "https://aiflux.cc/auth/login"
        }
      });
      console.log("✅ Login successful");
      console.log("📦 Login Response Status:", response.status);
      console.log("📦 Login Response Data:", JSON.stringify(response.data, null, 2));
      if (response.data && response.data.data && response.data.data.token) {
        this.bearerToken = response.data.data.token;
        console.log("✅ Bearer token obtained from login response.");
      } else {
        console.warn("⚠️ Token not found in login response.");
      }
      return response.data;
    } catch (error) {
      console.error("❌ Failed to login:", error.message);
      if (error.response) {
        console.error("❌ Login Error Response Data:", JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  async startImageGeneration({
    prompt,
    is_public = true,
    ...rest
  }) {
    console.log("🚀 Starting image generation for aiflux.cc...");
    try {
      const payload = {
        prompt: prompt,
        is_public: is_public,
        ...rest
      };
      const response = await this.axiosInstance.post("https://aiflux.cc/api/generate/handle", payload, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://aiflux.cc",
          Referer: "https://aiflux.cc/",
          Authorization: this.bearerToken
        }
      });
      console.log("✅ Image generation started, task ID:", response.data.data);
      console.log("📦 Start Generation Response Data (Task ID):", JSON.stringify(response.data, null, 2));
      return response.data.data;
    } catch (error) {
      console.error("❌ Failed to start image generation:", error.message);
      if (error.response) {
        console.error("❌ Start Generation Error Response Data:", JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  async pollTaskResult(taskId, maxAttempts = 60, intervalMs = 3e3) {
    console.log("🔄 Polling for generation result...");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload = {
          task_id: taskId
        };
        const statusResponse = await this.axiosInstance.post("https://aiflux.cc/api/generate/status", payload, {
          headers: {
            "Content-Type": "application/json",
            Origin: "https://aiflux.cc",
            Referer: "https://aiflux.cc/",
            Authorization: this.bearerToken
          }
        });
        const status = statusResponse.data.data.status;
        if (status === 3) {
          console.log("✅ Generation completed successfully");
          console.log("📦 Poll Result Response Data (Success):", JSON.stringify(statusResponse.data.data, null, 2));
          const imageUrlPage = `https://aiflux.cc/flux-img/${taskId}`;
          console.log(`Fetching image details from page: ${imageUrlPage}`);
          const htmlResponse = await this.axiosInstance.get(imageUrlPage, {
            headers: {
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              Origin: "https://aiflux.cc",
              Referer: "https://aiflux.cc/"
            }
          });
          const $ = cheerio.load(htmlResponse.data);
          const imageElement = $(".ant-image-img.max-w-\\[95\\%\\]");
          const directImageUrl = imageElement.attr("src");
          const imageAltText = imageElement.attr("alt");
          if (directImageUrl) {
            console.log(`🖼️ Extracted direct image URL: ${directImageUrl}`);
            console.log(`📝 Extracted image Alt Text: ${imageAltText}`);
            return {
              status: "success",
              imageUrl: directImageUrl,
              imageAlt: imageAltText,
              fullData: statusResponse.data.data
            };
          } else {
            console.warn("⚠️ Could not find the direct image URL in the HTML page. Returning page URL.");
            return {
              status: "success",
              imageUrl: imageUrlPage,
              imageAlt: null,
              fullData: statusResponse.data.data
            };
          }
        } else if (status === 2) {
          console.log("📦 Poll Result Response Data (Failed):", JSON.stringify(statusResponse.data.data, null, 2));
          throw new Error("Generation failed on AIFlux.");
        } else {
          console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Status: ${status} (0: Init, 1: Proc, 2: Fail, 3: Comp), waiting...`);
          console.log("📦 Poll Result Response Data (Current Status):", JSON.stringify(statusResponse.data.data, null, 2));
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error(`❌ Error polling result (attempt ${attempt}):`, error.message);
        if (error.response) {
          console.error("❌ Poll Result Error Response Data:", JSON.stringify(error.response.data, null, 2));
        }
        if (attempt === maxAttempts) {
          throw new Error("Failed to get result after maximum attempts");
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error("Task polling timeout");
  }
  async generate({
    prompt = "a majestic dragon flying over a fantasy castle at sunset",
    is_public = true,
    ...rest
  }) {
    try {
      console.log("🚀 Starting AIFlux generation process...");
      if (!prompt) {
        throw new Error("Prompt is required for image generation.");
      }
      await this.createTempEmail();
      await this.requestOtp();
      const otp = await this.pollForOTP();
      await this.login(otp);
      if (!this.bearerToken) {
        throw new Error("Failed to obtain bearer token after login.");
      }
      const taskId = await this.startImageGeneration({
        prompt: prompt,
        is_public: is_public,
        ...rest
      });
      const result = await this.pollTaskResult(taskId);
      console.log("🎉 AIFlux generation process completed!");
      return {
        success: true,
        generatedImageUrl: result.imageUrl,
        generatedImageAlt: result.imageAlt,
        fullResult: result.fullData
      };
    } catch (error) {
      console.error("💥 AIFlux generation process failed:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new AIFluxGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}

export default withApiLog(handler);
