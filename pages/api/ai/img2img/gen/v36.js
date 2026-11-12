import axios from "axios";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
class LuckissAI {
  constructor() {
    this.base = "https://api.luckiss.ai";
    this.models = ["Base", "Banana", "Banana_2", "Banana_pro"];
    this.ratios = ["match_input_image", "1:1", "3:4", "4:3", "9:16", "16:9"];
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://luckiss.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://luckiss.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: this.base,
      timeout: 6e4,
      headers: this.headers
    });
  }
  async slp(ms = 3e3) {
    try {
      return await new Promise(r => setTimeout(r, ms));
    } catch (e) {
      console.error("[Luckiss] Sleep error:", e?.message || e);
      return null;
    }
  }
  async buf(input, idx = 0) {
    try {
      if (Buffer.isBuffer(input)) {
        return {
          status: true,
          data: input,
          filename: `input_${idx}_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        };
      }
      if (typeof input === "string") {
        if (/^https?:\/\//i.test(input)) {
          console.log(`[Luckiss] Mengunduh gambar URL: ${input.slice(0, 45)}...`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const ct = res?.headers?.["content-type"] || "image/jpeg";
          return {
            status: true,
            data: Buffer.from(res?.data),
            filename: `input_${idx}_${Date.now()}.jpg`,
            contentType: ct
          };
        }
        const b64 = input.includes(";base64,") ? input.split(";base64,").pop() : input;
        return {
          status: true,
          data: Buffer.from(b64, "base64"),
          filename: `input_${idx}_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        };
      }
      return {
        status: false,
        result: "Format gambar tidak valid (harus URL, Base64, atau Buffer)"
      };
    } catch (e) {
      console.error(`[Luckiss] Gagal resolve buffer gambar [${idx}]:`, e?.message || e);
      return {
        status: false,
        result: e?.message || "Gagal memproses file gambar"
      };
    }
  }
  val(prompt, image, model, ratio) {
    try {
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return {
          status: false,
          result: 'Parameter "prompt" wajib diisi string non-empty'
        };
      }
      if (!image || Array.isArray(image) && image.length === 0) {
        return {
          status: false,
          result: 'Parameter "image" wajib diisi (URL / Base64 / Buffer)'
        };
      }
      const validModel = this.models.includes(model) ? model : "Base";
      const validRatio = this.ratios.includes(ratio) ? ratio : "match_input_image";
      return {
        status: true,
        validModel: validModel,
        validRatio: validRatio
      };
    } catch (e) {
      console.error("[Luckiss] Validasi input error:", e?.message || e);
      return {
        status: false,
        result: e?.message || "Validasi parameter gagal"
      };
    }
  }
  async chk(jobId) {
    try {
      console.log(`[Luckiss] Mengecek status task: ${jobId}`);
      const res = await this.client.get("/api/common/get", {
        params: {
          job_id: jobId
        }
      });
      return {
        status: true,
        result: res?.data
      };
    } catch (e) {
      console.error("[Luckiss] Cek task error:", e?.message || e);
      return {
        status: false,
        result: e?.message || "Gagal mengecek status job"
      };
    }
  }
  async poll(jobId, interval = 3e3, max = 60) {
    try {
      for (let i = 1; i <= max; i++) {
        console.log(`[Luckiss] Polling progress [${i}/${max}] untuk job: ${jobId}`);
        const chkRes = await this.chk(jobId);
        if (!chkRes?.status) {
          console.warn(`[Luckiss] Gagal fetch info job pada iterasi ${i}, mencoba lagi...`);
          await this.slp(interval);
          continue;
        }
        const data = chkRes.result;
        if (data?.code === 200 && data?.data?.image_url?.length > 0) {
          console.log(`[Luckiss] Task sukses selesai!`);
          const imgUrl = Array.isArray(data.data.image_url) ? data.data.image_url[0] : data.data.image_url;
          return {
            status: true,
            result: imgUrl
          };
        }
        if (data?.code && data?.code !== 200 && data?.code !== 202) {
          return {
            status: false,
            result: data?.message || `Task gagal dengan status code ${data?.code}`
          };
        }
        await this.slp(interval);
      }
      return {
        status: false,
        result: "Waktu polling task habis (Timeout)"
      };
    } catch (e) {
      console.error("[Luckiss] Polling error:", e?.message || e);
      return {
        status: false,
        result: e?.message || "Terjadi kesalahan saat polling job"
      };
    }
  }
  async generate({
    prompt = PROMPT.text,
    image,
    model,
    ratio,
    ...rest
  }) {
    try {
      console.log(`[Luckiss] Memulai proses generate...`);
      const v = this.val(prompt, image, model, ratio);
      if (!v?.status) return v;
      const {
        validModel,
        validRatio
      } = v;
      const images = Array.isArray(image) ? image.slice(0, 4) : [image];
      const form = new FormData();
      console.log(`[Luckiss] Menyiapkan upload ${images.length} gambar...`);
      let idx = 0;
      for (const imgItem of images) {
        const parsed = await this.buf(imgItem, idx++);
        if (!parsed?.status) {
          return parsed;
        }
        form.append("image_inputs", parsed.data, {
          filename: parsed.filename,
          contentType: parsed.contentType
        });
      }
      form.append("prompt", prompt);
      form.append("aspect_ratio", validRatio);
      form.append("model_name", validModel);
      if (validModel === "Banana_2") {
        form.append("google_search", String(rest?.google_search ?? false));
        form.append("image_search", String(rest?.image_search ?? false));
      }
      console.log(`[Luckiss] Mengirim request form-data ke photo-editor...`);
      const res = await this.client.post("/api/luckiss/img2img/photo-editor", form, {
        headers: {
          ...form.getHeaders(),
          ...rest?.token ? {
            Authorization: rest.token
          } : {}
        }
      });
      if (res?.data?.code !== 200) {
        return {
          status: false,
          result: res?.data?.message || `Request API ditolak dengan code: ${res?.data?.code}`
        };
      }
      const jobId = res?.data?.data?.job_id;
      if (!jobId) {
        return {
          status: false,
          result: "Job ID tidak ditemukan dalam response API"
        };
      }
      console.log(`[Luckiss] Task terdaftar. Job ID: ${jobId}`);
      const pollRes = await this.poll(jobId, 3e3, 60);
      if (!pollRes?.status) {
        return pollRes;
      }
      return {
        status: true,
        result: {
          job_id: jobId,
          image_url: pollRes.result,
          input_image: res?.data?.data?.input_image || null,
          model: validModel,
          aspect_ratio: validRatio
        }
      };
    } catch (e) {
      console.error(`[Luckiss] Generate exception: ${e?.message || e}`);
      return {
        status: false,
        result: e?.response?.data?.message || e?.message || "Terjadi kesalahan sistem saat generate gambar"
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
  const api = new LuckissAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}