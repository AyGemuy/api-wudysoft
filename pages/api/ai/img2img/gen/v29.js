import axios from "axios";
import crypto from "crypto";
import PROMPT from "@/configs/ai-prompt";
class Rollip {
  constructor() {
    try {
      this.baseUrl = "https://app.rollip.com/api/v1";
      this.cdnUrl = "https://i1.rollip.com";
      this.apiKey = "aj8237nfbfb!!jdshfSFDAHe183y8yhHAF01831847jj";
      this.userId = this.uid();
      this.pollInterval = 3e3;
      this.pollTimeout = 6e4;
      this.http = axios.create({
        headers: {
          "User-Agent": "okhttp/4.12.0",
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "x-api-key": this.apiKey
        }
      });
      this.lg("init", `userId=${this.userId}`);
    } catch (e) {
      console.error(`[rollip:init] error: ${e.message}`);
      throw e;
    }
  }
  lg(tag, msg) {
    console.log(`[rollip:${tag}] ${msg}`);
  }
  uid() {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return "5cc5acc7-c9db-497a-9708-7fdbef63325d";
    }
  }
  fid(ext = "jpg") {
    return `upload/${this.uid()}-${crypto.randomInt(1e9, 9999999999)}.${ext}`;
  }
  async rImg(image) {
    try {
      let buffer, mime;
      if (Buffer.isBuffer(image)) {
        buffer = image;
        mime = "image/jpeg";
      } else if (typeof image === "string" && (image.startsWith("data:") || /^[A-Za-z0-9+/]+=*$/.test(image.slice(0, 64)))) {
        const raw = image.startsWith("data:") ? image.split(",")[1] : image;
        const match = image.match(/data:(image\/\w+);base64/);
        mime = match ? match[1] : "image/jpeg";
        buffer = Buffer.from(raw, "base64");
      } else if (typeof image === "string" && image.startsWith("http")) {
        const res = await axios.get(image, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(image).origin
          }
        });
        mime = res.headers["content-type"] || "image/jpeg";
        buffer = Buffer.from(res.data);
      } else {
        throw new Error("Format image tidak didukung");
      }
      const ext = mime.split("/")[1] || "jpg";
      return {
        buffer: buffer,
        mime: mime,
        ext: ext
      };
    } catch (e) {
      this.lg("rImg", `error: ${e.message}`);
      throw e;
    }
  }
  async up(image) {
    try {
      const {
        buffer,
        mime,
        ext
      } = await this.rImg(image);
      const path = this.fid(ext);
      const url = `${this.cdnUrl}/${path}`;
      this.lg("up", `uploading as ${mime} to ${url}`);
      await axios.put(url, buffer, {
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Content-Type": mime
        }
      });
      return {
        path: path,
        size: buffer.byteLength,
        mime: mime
      };
    } catch (e) {
      this.lg("up", `error: ${e.message}`);
      throw e;
    }
  }
  async balance() {
    try {
      this.lg("bal", `GET balance user=${this.userId}`);
      const {
        data
      } = await this.http.get(`${this.baseUrl}/credits/balance`, {
        params: {
          user_id: this.userId,
          credit_type: "reward_credits"
        }
      });
      this.lg("bal", `result: ${JSON.stringify(data)}`);
      return data;
    } catch (e) {
      this.lg("bal", `warn: ${e.message}`);
      return null;
    }
  }
  async mkJob(uploadPath, {
    prompt,
    category = "travel",
    size = 0,
    mime = "image/jpeg",
    ...rest
  }) {
    try {
      const promptMsg = Array.isArray(prompt) ? prompt[0] : prompt;
      const defaultBody = {
        upload_path: uploadPath,
        upload_host: "i1",
        client_filename: uploadPath.split("/").pop(),
        content_type: mime,
        filesize: size,
        anonymous_user_id: this.userId,
        metadata: {
          aspect_ratio: "auto",
          category_key: category,
          prompt_messages_history: [promptMsg],
          prompt_messages_details: [{
            text: promptMsg,
            source: "custom",
            key: `custom-${Date.now()}`,
            title: null
          }],
          prompt_messages: [promptMsg],
          prompt: promptMsg,
          ...rest.metadata
        },
        prompt_messages: [promptMsg],
        ...rest
      };
      this.lg("job", "POST media_processings");
      const {
        data
      } = await this.http.post(`${this.baseUrl}/media_processings`, defaultBody, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return data;
    } catch (e) {
      this.lg("job", `error: ${e.message}`);
      throw e;
    }
  }
  async effects({
    reload = false
  } = {}) {
    try {
      this.lg("fx", `refreshing effects (reload=${reload})`);
      const {
        data
      } = await this.http.get(`${this.baseUrl}/effects`, {
        params: reload ? {
          reload: "true"
        } : {}
      });
      return data;
    } catch (e) {
      this.lg("fx", `error: ${e.message}`);
      return null;
    }
  }
  async poll(jobId) {
    const url = `${this.baseUrl}/media_processings/${jobId}`;
    const start = Date.now();
    try {
      while (Date.now() - start < this.pollTimeout) {
        try {
          const {
            data
          } = await this.http.get(url);
          this.lg("poll", `status=${data.status}`);
          if (data.status === "processed") return data;
          if (data.status === "failed") {
            this.lg("poll", "job failed, merging with effects reload...");
            return {
              ...data,
              reloaded_effects: await this.effects({
                reload: true
              })
            };
          }
        } catch (e) {
          if (e.response?.status !== 304) throw e;
        }
        await new Promise(r => setTimeout(r, this.pollInterval));
      }
      throw new Error("Polling timeout");
    } catch (e) {
      this.lg("poll", `error: ${e.message}`);
      throw e;
    }
  }
  async generate({
    prompt = PROMPT.text,
    image,
    category = "travel",
    ...rest
  }) {
    try {
      this.lg("main", "sequence start");
      const upData = await this.up(image);
      await this.balance();
      const job = await this.mkJob(upData.path, {
        prompt: prompt,
        category: category,
        size: upData.size,
        mime: upData.mime,
        ...rest
      });
      const result = await this.poll(job.public_id);
      this.lg("main", `done (status: ${result.status})`);
      return result;
    } catch (e) {
      this.lg("main", `error: ${e.message}`);
      await this.effects({
        reload: true
      });
      throw e;
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
  const api = new Rollip();
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