import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class AIAnime {
  constructor() {
    this.http = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        origin: "https://aianime.io",
        referer: "https://aianime.io/",
        ...SpoofHead()
      }
    });
    this.base = "https://api.aianime.io/api";
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
  async poll(id, max = 60) {
    try {
      console.log("Polling job:", id);
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        try {
          const {
            data
          } = await this.http.get(`${this.base}/result/get?job_id=${id}`, {
            headers: {
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-site"
            }
          });
          console.log(`Poll ${i + 1}/${max}:`, data?.code);
          if (data?.code === 200 && data?.result !== null) {
            console.log("Job completed");
            return data || [];
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
  async t2i({
    prompt,
    negative_prompt,
    model_type,
    aspect_ratio,
    ...rest
  }) {
    try {
      console.log("Text to Image...");
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("negative_prompt", negative_prompt || "");
      form.append("model_type", model_type || "standard");
      form.append("aspect_ratio", aspect_ratio || "2:3");
      const {
        data
      } = await this.http.post(`${this.base}/image-generate/text2image`, form, {
        headers: {
          ...form.getHeaders(),
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const jobId = data?.result?.job_id;
      if (!jobId) {
        console.log("No job_id");
        return [];
      }
      console.log("Job created:", jobId);
      return await this.poll(jobId);
    } catch (e) {
      console.log("t2i error:", e?.message);
      return [];
    }
  }
  async i2i({
    prompt,
    image,
    negative_prompt,
    model_type,
    aspect_ratio,
    ...rest
  }) {
    try {
      console.log("Image to Image...");
      const buf = await this.toBuf(image);
      const form = new FormData();
      form.append("image", buf, {
        filename: `${Date.now()}.jpg`
      });
      form.append("prompt", prompt);
      form.append("negative_prompt", negative_prompt || "");
      form.append("model_type", model_type || "standard");
      form.append("aspect_ratio", aspect_ratio || "match_input_image");
      const {
        data
      } = await this.http.post(`${this.base}/image-generate/image2image`, form, {
        headers: {
          ...form.getHeaders(),
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const jobId = data?.result?.job_id;
      if (!jobId) {
        console.log("No job_id");
        return [];
      }
      console.log("Job created:", jobId);
      return await this.poll(jobId);
    } catch (e) {
      console.log("i2i error:", e?.message);
      return [];
    }
  }
  async t2v({
    prompt,
    ...rest
  }) {
    try {
      console.log("Text to Video...");
      const form = new FormData();
      form.append("prompt", prompt);
      const {
        data
      } = await this.http.post(`${this.base}/video-generate/text2video`, form, {
        headers: {
          ...form.getHeaders(),
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const jobId = data?.result?.job_id;
      if (!jobId) {
        console.log("No job_id");
        return [];
      }
      console.log("Job created:", jobId);
      return await this.poll(jobId);
    } catch (e) {
      console.log("t2v error:", e?.message);
      return [];
    }
  }
  async i2v({
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log("Image to Video...");
      const buf = await this.toBuf(image);
      const form = new FormData();
      form.append("image", buf, {
        filename: `${Date.now()}.jpg`
      });
      form.append("prompt", prompt);
      const {
        data
      } = await this.http.post(`${this.base}/video-generate/image2video`, form, {
        headers: {
          ...form.getHeaders(),
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const jobId = data?.result?.job_id;
      if (!jobId) {
        console.log("No job_id");
        return [];
      }
      console.log("Job created:", jobId);
      return await this.poll(jobId);
    } catch (e) {
      console.log("i2v error:", e?.message);
      return [];
    }
  }
  async generate({
    prompt,
    image,
    video,
    ...rest
  }) {
    try {
      if (video && image) {
        return await this.i2v({
          prompt: prompt,
          image: image,
          ...rest
        });
      }
      if (video) {
        return await this.t2v({
          prompt: prompt,
          ...rest
        });
      }
      if (image) {
        return await this.i2i({
          prompt: prompt,
          image: image,
          ...rest
        });
      }
      return await this.t2i({
        prompt: prompt,
        ...rest
      });
    } catch (e) {
      console.log("Generate error:", e?.message);
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
  const api = new AIAnime();
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