import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      maxRedirects: 5,
      validateStatus: () => true
    }));
    this.base = "https://banana-ai.me";
    this.mailBase = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.email = null;
    this.session = null;
  }
  parseTaskLine(raw) {
    try {
      const lines = raw.split("\n");
      const dataLine = lines.find(line => line.includes('"data"') && line.includes('"task"'));
      if (!dataLine) {
        return null;
      }
      const jsonMatch = dataLine.match(/\d+:(\{.*\})/);
      if (!jsonMatch) {
        return null;
      }
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.log(`[!] Parse error: ${e.message}`);
      return null;
    }
  }
  async mail() {
    console.log("[+] Creating temp email...");
    try {
      const {
        data
      } = await this.client.get(`${this.mailBase}?action=create`);
      this.email = data?.email || null;
      console.log(`[✓] Email created: ${this.email}`);
      return this.email;
    } catch (e) {
      console.log(`[✗] Mail creation failed: ${e.message}`);
      throw e;
    }
  }
  async otp(max = 60, delay = 3e3) {
    console.log(`[+] Waiting for OTP (${max} attempts)...`);
    for (let i = 0; i < max; i++) {
      try {
        const {
          data
        } = await this.client.get(`${this.mailBase}?action=message&email=${this.email}`);
        const msg = data?.data?.[0]?.text_content || "";
        const match = msg.match(/verify-email\?token=([^&\s]+)/);
        if (match?.[1]) {
          console.log(`[✓] OTP found on attempt ${i + 1}`);
          return match[1];
        }
      } catch (e) {
        console.log(`[!] OTP check ${i + 1} failed: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error("OTP timeout");
  }
  async reg() {
    console.log("[+] Registering account...");
    try {
      const pass = this.email;
      await this.client.post(`${this.base}/api/auth/sign-up/email`, {
        email: this.email,
        password: pass,
        name: this.email,
        callbackURL: "/generator"
      }, {
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      console.log("[✓] Registration sent");
    } catch (e) {
      console.log(`[✗] Registration failed: ${e.message}`);
      throw e;
    }
  }
  async verify(token) {
    console.log("[+] Verifying email...");
    try {
      const url = `${this.base}/api/auth/verify-email?token=${token}&callbackURL=/generator`;
      await this.client.get(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      console.log("[✓] Email verified");
    } catch (e) {
      console.log(`[✗] Verification failed: ${e.message}`);
      throw e;
    }
  }
  async init() {
    console.log("[+] Initializing session...");
    try {
      await this.client.get(`${this.base}/generator`, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      const cookies = await this.jar.getCookies(this.base);
      this.session = cookies.find(c => c.key === "__Secure-better-auth.session_token")?.value || null;
      console.log(`[✓] Session initialized: ${this.session ? "OK" : "MISSING"}`);
      return this.session;
    } catch (e) {
      console.log(`[✗] Init failed: ${e.message}`);
      throw e;
    }
  }
  async up(img) {
    console.log("[+] Uploading image...");
    try {
      const form = new FormData();
      const isUrl = typeof img === "string" && img.startsWith("http");
      const isB64 = typeof img === "string" && img.startsWith("data:");
      const isBuf = Buffer.isBuffer(img);
      let buf;
      if (isUrl) {
        console.log("[+] Fetching from URL...");
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(data);
      } else if (isB64) {
        console.log("[+] Decoding base64...");
        buf = Buffer.from(img.split(",")[1], "base64");
      } else if (isBuf) {
        buf = img;
      }
      form.append("file", buf, {
        filename: `${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      form.append("folder", "tattoo-generator");
      const {
        data
      } = await this.client.post(`${this.base}/api/storage/upload`, form, {
        headers: {
          ...form.getHeaders(),
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      const url = data?.url || null;
      console.log(`[✓] Upload success: ${url}`);
      return url;
    } catch (e) {
      console.log(`[✗] Upload failed: ${e.message}`);
      throw e;
    }
  }
  async gen(mode, prompt, img = null, opts = {}) {
    console.log(`[+] Generating ${mode}...`);
    try {
      const payload = {
        mode: mode,
        prompt: prompt,
        style: opts.style || "none",
        complexity: opts.complexity || "none",
        lineWeight: opts.lineWeight || "none",
        imageSize: opts.imageSize || "1:1",
        referenceImageUrl: img || "$undefined"
      };
      const {
        data: raw
      } = await this.client.post(`${this.base}/generator`, [payload], {
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "7f1bc0e5830ef7b2f425ee963b970aa665fc26ecf4",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      const json = this.parseTaskLine(raw);
      if (!json) {
        throw new Error("Failed to parse task response");
      }
      console.log(json);
      const taskId = json?.data?.task?.taskId || null;
      if (!taskId) {
        throw new Error("TaskId not found in response");
      }
      console.log(`[✓] Task created: ${taskId}`);
      return taskId;
    } catch (e) {
      console.log(`[✗] Generation failed: ${e.message}`);
      throw e;
    }
  }
  async poll(taskId, max = 60, delay = 3e3) {
    console.log(`[+] Polling task ${taskId} (${max} attempts)...`);
    for (let i = 0; i < max; i++) {
      try {
        const {
          data: raw
        } = await this.client.post(`${this.base}/generator`, [{
          taskId: taskId
        }], {
          headers: {
            "content-type": "text/plain;charset=UTF-8",
            "next-action": "7fa570c60cd513b303b31a3a58387e0a61d9c90c55",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
          }
        });
        const json = this.parseTaskLine(raw);
        if (!json) {
          console.log(`[!] Poll ${i + 1}: Data not found, retrying...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.log(json);
        const task = json?.data?.task || {};
        const status = task.status || "unknown";
        const resultImages = task.resultImages || [];
        console.log(`[+] Poll ${i + 1}: ${status} (Progress: ${task.progress || 0}%)`);
        if (status === "completed" && resultImages.length > 0) {
          console.log(`[✓] Task completed!`);
          console.log(`[✓] Result:`, resultImages);
          return task;
        }
        if (status === "failed") {
          throw new Error("Task failed");
        }
      } catch (e) {
        console.log(`[!] Poll ${i + 1} error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error("Polling timeout");
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.session) {
        await this.mail();
        await this.reg();
        const token = await this.otp();
        await this.verify(token);
        await this.init();
      }
      let imgUrl = null;
      let mode = "text-to-image";
      if (image) {
        mode = "image-edit";
        const imgs = Array.isArray(image) ? image : [image];
        for (const img of imgs) {
          imgUrl = await this.up(img);
        }
      }
      const taskId = await this.gen(mode, prompt, imgUrl, rest);
      const result = await this.poll(taskId);
      return result;
    } catch (e) {
      console.log(`[✗] Generate failed: ${e.message}`);
      throw e;
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