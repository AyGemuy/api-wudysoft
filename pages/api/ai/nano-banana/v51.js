import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import {
  randomUUID
} from "crypto";
class NanoBanana {
  constructor() {
    this.base = "https://bananaai.me";
    const jar = new CookieJar();
    this.ax = wrapper(axios.create({
      jar: jar,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        origin: this.base,
        referer: `${this.base}/`,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
    this.ready = this.init();
  }
  async init() {
    try {
      console.log("🔄 Initializing client...");
      await this.ax.get(this.base);
      const id = this.ax.defaults.jar.store.idx["bananaai.me"]?.["/"]?.ba_client_id?.value || randomUUID();
      this.ax.defaults.headers.cookie = `ba_client_id=${id}`;
      console.log("✅ Client ready:", id);
    } catch (e) {
      console.log("⚠️ Init error:", e.message);
    }
  }
  async toBuffer(img) {
    if (Buffer.isBuffer(img)) return img;
    if (typeof img === "string") {
      if (img.startsWith("http")) {
        console.log("📥 Downloading image...");
        const {
          data
        } = await this.ax.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      if (img.startsWith("data:")) {
        return Buffer.from(img.split(",")[1], "base64");
      }
      return Buffer.from(img, "base64");
    }
    return Buffer.from(img);
  }
  async submit(form) {
    try {
      console.log("📤 Submitting task...");
      const {
        data
      } = await this.ax.post(`${this.base}/api/protected/gen-image`, form, {
        headers: form.getHeaders?.() || {}
      });
      console.log(data);
      return data?.data || null;
    } catch (e) {
      throw new Error(`Submit failed: ${e.response?.data?.message || e.message}`);
    }
  }
  async poll(uuid) {
    const max = 60;
    for (let i = 0; i < max; i++) {
      try {
        console.log(`⏳ Polling ${i + 1}/${max}...`);
        const {
          data
        } = await this.ax.get(`${this.base}/api/protected/get-list`);
        console.log(data);
        const task = data?.data?.find(t => t.uuid === uuid);
        if (!task) {
          await new Promise(r => setTimeout(r, 3e3));
          continue;
        }
        if (task.status === 2) {
          console.log("✅ Task completed!");
          return task;
        }
        if (task.status === 3 || task.error) {
          throw new Error(task.error || "Task failed");
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        if (i === max - 1) throw e;
      }
    }
    throw new Error("Timeout");
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    await this.ready;
    try {
      const form = new FormData();
      form.append("prompt", prompt || "");
      const imgs = Array.isArray(image) ? image : image ? [image] : [];
      const type = imgs.length > 0 ? "image-to-image" : "text-to-image";
      form.append("generation_type", type);
      if (imgs.length > 0) {
        console.log(`🖼️ Processing ${imgs.length} image(s)...`);
        for (const img of imgs) {
          const buf = await this.toBuffer(img);
          form.append("images", buf, {
            filename: "image.jpg",
            contentType: "image/jpeg"
          });
        }
      }
      const task = await this.submit(form);
      if (!task?.uuid) throw new Error("No task UUID");
      const res = await this.poll(task.uuid);
      const urls = res?.result?.resultUrls || [];
      const result = urls.map(u => `${this.base}${u}`);
      return {
        result: result,
        uuid: res.uuid,
        status: res.status_human,
        prompt: res.user_inputs?.prompt,
        images: res.user_inputs?.images,
        createdAt: res.created_at
      };
    } catch (e) {
      console.error("❌ Error:", e.message);
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