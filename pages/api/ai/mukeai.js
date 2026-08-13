import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class MukeAI {
  constructor() {
    try {
      this.apiBase = "https://api.mukeai.app";
      this.token = "";
      this.serial = this.getSerial();
      this.client = axios.create({
        baseURL: this.apiBase,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://mukeai.app",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://mukeai.app/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.setup();
    } catch (err) {
      console.log("[Constructor Error]", err?.message || err);
    }
  }
  getSerial() {
    try {
      const r1 = crypto.randomBytes(8).toString("hex");
      const r2 = crypto.randomBytes(8).toString("hex");
      const r3 = crypto.randomBytes(8).toString("hex") || "node-server";
      const platformInfo = `${r1}-${r2}-${r3}`;
      return crypto.createHash("sha256").update(platformInfo).digest("hex").substring(0, 32);
    } catch (err) {
      return "dd2a265c7dfcd90f9ea4f6ba0183ef11";
    }
  }
  setup() {
    try {
      this.client.interceptors.request.use(conf => {
        try {
          console.log(`[Request] Mengirim permintaan ke: ${conf.url}`);
          if (this.token) {
            conf.headers["Authorization"] = `${this.token}`;
          }
          conf.headers["product-serial"] = this.serial;
          return conf;
        } catch (err) {
          return conf;
        }
      }, err => {
        console.log("[Request Error]", err?.message || err);
        return Promise.reject(err);
      });
      this.client.interceptors.response.use(res => {
        try {
          console.log(`[Response] Status ${res.status} dari ${res.config.url}`);
          return res;
        } catch (err) {
          return res;
        }
      }, err => {
        console.log("[Response Error]", err?.response?.data || err?.message || err);
        return Promise.reject(err);
      });
    } catch (err) {
      console.log("[Setup Error]", err?.message || err);
    }
  }
  val(model, ratio) {
    try {
      const models = ["standard", "high_quality"];
      const ratios = ["1:1", "3:4", "4:3", "9:16", "16:9", "match_input_image"];
      return {
        model: models.includes(model) ? model : "standard",
        ratio: ratios.includes(ratio) ? ratio : "match_input_image"
      };
    } catch (err) {
      return {
        model: "standard",
        ratio: "match_input_image"
      };
    }
  }
  async res(img) {
    try {
      if (!img) {
        return {
          error: "Parameter gambar wajib disertakan."
        };
      }
      if (Buffer.isBuffer(img)) {
        console.log("[Resolver] Memproses gambar berbasis Buffer");
        return {
          data: img,
          name: "input_source.jpg",
          mime: "image/jpeg"
        };
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[Resolver] Mengunduh gambar dari URL: ${img}`);
          const response = await axios.get(img, {
            responseType: "arraybuffer"
          });
          const mime = response.headers["content-type"] || "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          return {
            data: Buffer.from(response.data),
            name: `input_source.${ext}`,
            mime: mime
          };
        }
        if (img.startsWith("data:")) {
          console.log("[Resolver] Mengekstrak gambar berbasis Base64 Data URI");
          const matches = img.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mime = matches[1];
            const ext = mime.split("/")[1] || "jpg";
            const data = Buffer.from(matches[2], "base64");
            return {
              data: data,
              name: `input_source.${ext}`,
              mime: mime
            };
          }
        }
        console.log("[Resolver] Memproses gambar berbasis Base64 murni");
        return {
          data: Buffer.from(img, "base64"),
          name: "input_source.jpg",
          mime: "image/jpeg"
        };
      }
      return {
        error: "Format input gambar tidak dikenali."
      };
    } catch (err) {
      return {
        error: err?.message || "Error occurred during image resolution."
      };
    }
  }
  async poll(jobId, interval, maxAttempts) {
    try {
      let attempts = 0;
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`[Poll] Memeriksa status pekerjaan (${attempts}/${maxAttempts}) untuk Job ID: ${jobId}`);
          const response = await this.client.get("/api/result/get", {
            params: {
              job_id: jobId,
              _t: Date.now()
            }
          });
          const data = response?.data || {};
          if (data?.code === 200 && data?.result) {
            const resObj = data.result;
            const urls = resObj?.image_url || [];
            if (urls.length > 0) {
              console.log("[Poll] Selesai memproses hasil gambar.");
              return {
                status: "completed",
                result: {
                  job_id: jobId,
                  image_urls: urls,
                  free_limit_value: resObj?.free_limit_value || null
                }
              };
            }
          }
          await wait(interval);
        } catch (err) {
          console.log("[Poll Warning] Terjadi interupsi pada iterasi polling:", err?.message || err);
          await wait(interval);
        }
      }
      return {
        status: "timeout",
        result: {
          job_id: jobId,
          message: "Batas polling maksimum terlewati tanpa pengembalian data gambar."
        }
      };
    } catch (err) {
      return {
        status: "error",
        result: {
          message: err?.message || "Gagal mengeksekusi modul polling."
        }
      };
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log("[MukeAI] Menjalankan proses generasi gambar");
      const resolved = await this.res(image);
      if (resolved?.error) {
        return {
          status: "failed",
          result: {
            message: resolved.error
          }
        };
      }
      const validation = this.val(rest?.model_type, rest?.aspect_ratio);
      const form = new FormData();
      form.append("image", resolved.data, {
        filename: resolved.name,
        contentType: resolved.mime
      });
      form.append("prompt", prompt || "");
      form.append("negative_prompt", rest?.negative_prompt || "");
      form.append("model_type", validation.model);
      form.append("aspect_ratio", validation.ratio);
      console.log("[MukeAI] Mengirimkan data form-data ke API endpoint...");
      const response = await this.client.post("/api/muke/image-generate/image2image", form, {
        headers: form.getHeaders()
      });
      const data = response?.data || {};
      if (data?.code !== 200) {
        return {
          status: "failed",
          result: {
            error_code: data?.code || 500,
            message: data?.message || "Respon API menyatakan proses tidak berhasil."
          }
        };
      }
      const jobId = data?.result?.job_id || "";
      console.log(`[MukeAI] ID Pekerjaan berhasil dibuat: ${jobId}`);
      const pollingResult = await this.poll(jobId, rest?.interval || 3e3, rest?.max_attempts || 60);
      return pollingResult;
    } catch (error) {
      console.log("[MukeAI Error] Gagal memproses perintah generate:", error?.message || error);
      return {
        status: "error",
        result: {
          message: error?.message || "Error internal pada saat pemrosesan request."
        }
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
  const api = new MukeAI();
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