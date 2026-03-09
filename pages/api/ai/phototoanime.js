import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
class PhotoToAnime {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
    this.base = "https://phototoanime.com";
    this.email = null;
    this.password = null;
    this.authed = false;
  }
  rand() {
    return randomBytes(16).toString("hex");
  }
  async hasCookie() {
    try {
      const cookies = await this.jar.getCookies(this.base);
      const hasSession = cookies?.some(c => c?.key?.includes("session_token"));
      return hasSession || false;
    } catch {
      return false;
    }
  }
  async auth() {
    try {
      if (this.authed && await this.hasCookie()) {
        console.log("Already authenticated");
        return true;
      }
      this.authed = false;
      this.email = `${this.rand()}@emailhook.site`;
      this.password = this.email;
      console.log("Creating account...");
      console.log("Email:", this.email);
      try {
        await this.http.post(`${this.base}/api/auth/sign-up/email`, {
          email: this.email,
          password: this.password,
          name: this.email
        }, {
          headers: {
            "content-type": "application/json",
            origin: this.base,
            referer: `${this.base}/sign-up`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
      } catch (e) {
        console.log("Sign up error:", e?.message);
      }
      await new Promise(r => setTimeout(r, 2e3));
      console.log("Checking session...");
      try {
        const {
          data
        } = await this.http.get(`${this.base}/api/auth/get-session`, {
          headers: {
            referer: `${this.base}/sign-up`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
        if (data?.session?.token) {
          console.log("Session created");
        }
      } catch (e) {
        console.log("Get session error:", e?.message);
      }
      const hasAuth = await this.hasCookie();
      this.authed = hasAuth;
      console.log(hasAuth ? "Auth success" : "Auth failed");
      return hasAuth;
    } catch (e) {
      console.log("Auth error:", e?.message);
      return false;
    }
  }
  isUrl(str) {
    return typeof str === "string" && (str.startsWith("http://") || str.startsWith("https://"));
  }
  async toBuf(img) {
    try {
      if (this.isUrl(img)) {
        console.log("Downloading from URL...");
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      if (Buffer.isBuffer(img)) {
        return img;
      }
      if (img?.startsWith?.("data:")) {
        return Buffer.from(img.split(",")[1], "base64");
      }
      return Buffer.from(img, "base64");
    } catch (e) {
      console.log("toBuf error:", e?.message);
      throw e;
    }
  }
  async upload(img) {
    try {
      console.log("Processing image...");
      const buf = await this.toBuf(img);
      console.log("Uploading...");
      const form = new FormData();
      form.append("files", buf, {
        filename: `${Date.now()}.jpg`
      });
      const {
        data
      } = await this.http.post(`${this.base}/api/storage/upload-image`, form, {
        headers: {
          ...form.getHeaders(),
          origin: this.base,
          referer: `${this.base}/`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      const url = data?.data?.urls?.[0];
      console.log("Upload done:", url);
      return url;
    } catch (e) {
      console.log("Upload error:", e?.message);
      throw e;
    }
  }
  async poll(id, max = 60) {
    try {
      console.log("Polling task:", id);
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        try {
          const {
            data
          } = await this.http.post(`${this.base}/api/ai/query`, {
            taskId: id
          }, {
            headers: {
              "content-type": "application/json",
              origin: this.base,
              referer: `${this.base}/`,
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin"
            }
          });
          const status = data?.data?.status;
          console.log(`Poll ${i + 1}/${max}:`, status);
          if (status === "success") {
            console.log("Task completed");
            const taskInfo = JSON.parse(data?.data?.taskInfo || "{}");
            const images = taskInfo || [];
            return images;
          }
          if (status === "failed" || status === "error") {
            console.log("Task failed");
            return [];
          }
        } catch (e) {
          console.log(`Poll ${i + 1}/${max} error:`, e?.message);
        }
      }
      console.log("Poll timeout");
      return [];
    } catch (e) {
      console.log("Poll error:", e?.message);
      return [];
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.authed || !await this.hasCookie()) {
        console.log("Need authentication...");
        const success = await this.auth();
        if (!success) {
          console.log("Auth failed, cannot generate");
          return [];
        }
      }
      const isI2I = !!image;
      const body = {
        mediaType: rest?.mediaType || "image",
        provider: rest?.provider || "replicate",
        model: isI2I ? rest?.model || "prunaai/flux-kontext-fast" : rest?.model || "black-forest-labs/flux-schnell",
        prompt: prompt || "studio ghibli style, whimsical, detailed, hand-drawn feel",
        scene: isI2I ? "image-to-image" : "text-to-image",
        options: {}
      };
      if (isI2I) {
        const imgs = Array.isArray(image) ? image : [image];
        const url = await this.upload(imgs[0]);
        if (url) body.options.img_cond_path = url;
      }
      console.log("Generating:", body.scene);
      console.log("Model:", body.model);
      const {
        data
      } = await this.http.post(`${this.base}/api/ai/generate`, body, {
        headers: {
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        },
        validateStatus: status => status < 500
      });
      if (data?.code !== 0 || !data?.data?.id) {
        console.log("Generate failed, response:", data);
        console.log("Retrying with fresh auth...");
        this.authed = false;
        await this.auth();
        const retry = await this.http.post(`${this.base}/api/ai/generate`, body, {
          headers: {
            "content-type": "application/json",
            origin: this.base,
            referer: `${this.base}/`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        });
        const taskId = retry?.data?.data?.id;
        if (!taskId) {
          console.log("Retry failed, no taskId");
          return [];
        }
        return await this.poll(taskId);
      }
      const taskId = data?.data?.id;
      return await this.poll(taskId);
    } catch (e) {
      console.log("Generate error:", e?.message, e?.response?.status);
      if (e?.response?.status === 402 || e?.response?.status === 401) {
        console.log("Auth error detected, retry once...");
        try {
          this.authed = false;
          await this.auth();
          return await this.generate({
            prompt: prompt,
            image: image,
            ...rest
          });
        } catch (retryErr) {
          console.log("Retry failed:", retryErr?.message);
        }
      }
      return [];
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
  const api = new PhotoToAnime();
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