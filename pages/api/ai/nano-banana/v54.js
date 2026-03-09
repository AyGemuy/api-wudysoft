import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://nano-banana2.org",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        origin: "https://nano-banana2.org",
        referer: "https://nano-banana2.org/"
      }
    }));
    this.wudy = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v22`
    });
    this.session = {};
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async createMail() {
    try {
      this.log("Creating temp email...", "MAIL");
      const {
        data
      } = await this.wudy.get("?action=create");
      if (!data?.email) throw new Error("Failed to create email");
      this.emailData = {
        email: data?.email,
        id: data?.id
      };
      this.log(`Email: ${this.emailData?.email}`, "MAIL");
      return this.emailData;
    } catch (e) {
      throw e;
    }
  }
  async getMailCode(retry = 0) {
    if (retry > 60) throw new Error("OTP Timeout");
    try {
      const {
        data
      } = await this.wudy.get(`?action=inbox&id=${this.emailData?.id}`);
      const target = (data?.messages || []).find(m => m.subject?.includes("verification code"));
      const code = target?.subject?.match(/(\d{6})/)?.[1];
      if (code) {
        this.log(`OTP Found: ${code}`, "MAIL");
        return code;
      }
      await this.sleep(3e3);
      return this.getMailCode(retry + 1);
    } catch (e) {
      await this.sleep(3e3);
      return this.getMailCode(retry + 1);
    }
  }
  async login() {
    try {
      this.log("Authenticating...", "AUTH");
      await this.createMail();
      const {
        data
      } = await this.client.get("/api/auth/csrf");
      const csrfToken = data?.csrfToken;
      await this.client.post("/api/auth/send-code", {
        email: this.emailData?.email,
        csrfToken: csrfToken
      });
      const code = await this.getMailCode();
      const params = new URLSearchParams({
        email: this.emailData?.email,
        code: code,
        csrfToken: csrfToken,
        callbackUrl: "https://nano-banana2.org/",
        redirect: "false"
      });
      await this.client.post("/api/auth/callback/email-code?", params.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const sessionRes = await this.client.get("/api/auth/session");
      if (!sessionRes?.data?.user) throw new Error("No Session");
      this.user = sessionRes?.data?.user;
      this.log(`Logged in: ${this.user?.email}`, "SUCCESS");
      return true;
    } catch (e) {
      this.log(`Login Error: ${e.message}`, "ERROR");
      throw e;
    }
  }
  async resolveImage(input) {
    if (typeof input === "string" && input.startsWith("http")) {
      try {
        this.log("Fetching external image to buffer...", "PROCESS");
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return {
          buffer: Buffer.from(data),
          url: null,
          isUpload: true
        };
      } catch (e) {
        throw new Error(`Failed to fetch image url: ${e.message}`);
      }
    }
    let buffer = Buffer.isBuffer(input) ? input : typeof input === "string" ? Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64") : null;
    if (!buffer) throw new Error("Invalid image format");
    return {
      buffer: buffer,
      url: null,
      isUpload: true
    };
  }
  async uploadImage(buffer) {
    try {
      const filename = `${crypto.randomUUID()}.jpg`;
      const {
        data: presign
      } = await this.client.get("/api/upload", {
        params: {
          filename: filename,
          contentType: "image/jpeg",
          fileSize: buffer?.length
        }
      });
      if (!presign?.uploadUrl) throw new Error("No Upload URL");
      this.log(`Uploading ${buffer?.length} bytes...`, "UPLOAD");
      await axios.put(presign?.uploadUrl, buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": buffer?.length
        }
      });
      if (presign?.publicUrl) return presign.publicUrl;
      return presign?.url || presign?.uploadUrl?.split("?")?.[0];
    } catch (e) {
      this.log(`Upload Fail: ${e.message}`, "ERROR");
      return null;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.user) await this.login();
      let payload = {
        prompt: prompt || "Masterpiece",
        num_images: rest?.num_images || 1,
        image_size: rest?.image_size || "auto",
        output_format: rest?.output_format || "png",
        type: "text-to-image",
        ...rest
      };
      if (image) {
        this.log("Processing images (i2i)...", "PROCESS");
        const inputs = Array.isArray(image) ? image : [image];
        const finalUrls = [];
        for (const img of inputs) {
          const meta = await this.resolveImage(img);
          if (meta?.isUpload) {
            const uploadedUrl = await this.uploadImage(meta?.buffer);
            if (uploadedUrl) {
              this.log(`Image ready: ${uploadedUrl}`, "UPLOAD");
              finalUrls.push(uploadedUrl);
            }
          } else if (meta?.url) {
            finalUrls.push(meta?.url);
          }
        }
        if (finalUrls?.length > 0) {
          payload.type = "image-to-image";
          payload.image_urls = finalUrls;
        }
      }
      this.log("Submitting task...", "PROCESS");
      const {
        data: submit
      } = await this.client.post("/api/nano-banana/kie/submit", payload);
      if (!submit?.success) throw new Error(submit?.message || "Submit failed");
      return await this.pollTask(submit?.task_id);
    } catch (e) {
      this.log(`Gen Error: ${e.message}`, "ERROR");
      if (e.response?.status === 401) this.user = null;
      return {
        success: false,
        error: e.message
      };
    }
  }
  async pollTask(taskId) {
    const timeout = 6e4,
      interval = 3e3;
    const start = Date.now();
    this.log(`Polling ID: ${taskId}`, "WAIT");
    while (Date.now() - start < timeout) {
      try {
        const {
          data
        } = await this.client.get(`/api/nano-banana/status/${taskId}`);
        if (data?.status === "completed") {
          this.log("Task Completed", "SUCCESS");
          return {
            success: true,
            result: data?.result?.images?.map(i => i?.url) || [],
            meta: data?.result?._kieData || {},
            credits: data?.credits_used
          };
        }
        if (data?.status === "failed") {
          throw new Error(`Task Failed: ${data?.error || "Unknown Error"}`);
        }
        await this.sleep(interval);
      } catch (e) {
        if (e.message.includes("Failed")) throw e;
        await this.sleep(interval);
      }
    }
    throw new Error("Timeout");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}