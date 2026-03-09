import axios from "axios";
import FormData from "form-data";
const KEY = "3d2a2547bce5ff422cc7f236f7805e35";
const BASE = "https://api.nanobananaapi.ai/api/v1";
const HDR = {
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json"
};
class NanoBanana {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE,
      headers: HDR
    });
  }
  async resolve(image) {
    try {
      if (Buffer.isBuffer(image)) return {
        buffer: image,
        mime: "image/jpeg"
      };
      if (typeof image === "string" && image.startsWith("data:")) {
        const [meta, b64] = image.split(",");
        const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
        return {
          buffer: Buffer.from(b64, "base64"),
          mime: mime
        };
      }
      if (typeof image === "string" && image.startsWith("http")) {
        console.log("[resolve] fetching url:", image);
        const res = await axios.get(image, {
          responseType: "arraybuffer"
        });
        return {
          buffer: Buffer.from(res.data),
          mime: res.headers?.["content-type"] ?? "image/jpeg"
        };
      }
      throw new Error("unsupported image type");
    } catch (e) {
      console.error("[resolve] error:", e?.message);
      throw e;
    }
  }
  async uploadOne(image) {
    try {
      const {
        buffer,
        mime
      } = await this.resolve(image);
      const fd = new FormData();
      fd.append("file", buffer, {
        filename: "image.jpg",
        contentType: mime,
        knownLength: buffer.length
      });
      console.log("[uploadOne] uploading...");
      const res = await axios.post("https://tmpfiles.org/api/v1/upload", fd, {
        headers: fd.getHeaders()
      });
      const originalURL = res?.data?.data?.url;
      return originalURL ? `https://tmpfiles.org/dl/${originalURL.split("/").slice(-2).join("/")}` : null;
    } catch (e) {
      console.error("[uploadOne] error:", e?.message);
      throw e;
    }
  }
  async upload(image) {
    try {
      const list = Array.isArray(image) ? image : [image];
      const urls = [];
      for (const img of list) {
        console.log(`[upload] processing ${urls.length + 1}/${list.length}`);
        const url = await this.uploadOne(img);
        console.log("[upload] url:", url);
        urls.push(url);
      }
      return list.length === 1 ? urls[0] : urls;
    } catch (e) {
      console.error("[upload] error:", e?.message);
      throw e;
    }
  }
  async poll(taskId, max = 60, delay = 3e3) {
    try {
      console.log(`[poll] taskId=${taskId}`);
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, delay));
        console.log(`[poll] attempt ${i + 1}/${max}`);
        try {
          const {
            data
          } = await this.ax.get("/nanobanana/record-info", {
            params: {
              taskId: taskId
            }
          });
          const d = data?.data;
          if (d?.successFlag === 1) {
            console.log("[poll] done!");
            const {
              response,
              ...info
            } = d;
            return {
              result: response?.resultImageUrl ?? response?.originImageUrl ?? null,
              ...info
            };
          }
          if (d?.errorCode && d.errorCode !== 0) throw new Error(d?.errorMessage ?? "task failed");
        } catch (e) {
          console.error("[poll] attempt error:", e?.message);
        }
      }
      throw new Error("polling timeout");
    } catch (e) {
      console.error("[poll] error:", e?.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image,
    pro = false,
    ...rest
  }) {
    try {
      console.log(`[generate] pro=${pro} prompt="${prompt}"`);
      let imageUrl = null;
      if (image) {
        imageUrl = await this.upload(image);
        console.log("[generate] imageUrl:", imageUrl);
      }
      let taskId;
      if (pro) {
        const imageUrls = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
        const body = {
          prompt: prompt,
          imageUrls: imageUrls,
          resolution: rest.resolution ?? "2K",
          aspectRatio: rest.aspectRatio ?? "16:9",
          callBackUrl: rest.callBackUrl ?? "https://example-callback.com",
          ...rest
        };
        console.log("[generate] calling generate-pro...");
        const {
          data
        } = await this.ax.post("/nanobanana/generate-pro", body);
        taskId = data?.data?.taskId;
      } else {
        const singleUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
        const body = {
          prompt: prompt,
          numImages: rest.numImages ?? 1,
          type: singleUrl ? "IMAGETOIAMGE" : "TEXTTOIAMGE",
          image_size: rest.image_size ?? "16:9",
          ...singleUrl && {
            imageUrl: singleUrl
          },
          callBackUrl: rest.callBackUrl ?? "https://your-callback-url.com/callback",
          ...rest
        };
        console.log("[generate] calling generate...");
        const {
          data
        } = await this.ax.post("/nanobanana/generate", body);
        taskId = data?.data?.taskId;
      }
      if (!taskId) throw new Error("no taskId returned");
      console.log("[generate] taskId:", taskId);
      const output = await this.poll(taskId);
      console.log("[generate] result:", output?.result);
      return output;
    } catch (e) {
      console.error("[generate] failed:", e?.message);
      throw e;
    }
  }
  async credit() {
    try {
      console.log("[credit] fetching...");
      const {
        data
      } = await this.ax.get("/common/credit");
      const c = data?.data ?? 0;
      console.log("[credit]", c);
      return c;
    } catch (e) {
      console.error("[credit] error:", e?.message);
      return null;
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