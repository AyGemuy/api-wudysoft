import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class EzEnhancer {
  constructor() {
    this.baseUrl = `${proxy}https://api.ezenhancer.ai/api`;
    this.productCode = "067003";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.modes = {
      photo_editor: {
        path: "/web/v1/photo-editor/create-job",
        poll: "/web/v1/photo-editor/get-job",
        req: ["prompt"],
        def: {
          job_category: "4",
          output_format: "jpg",
          aspect_ratio: "default"
        }
      },
      image_enhance: {
        path: "/web/v1/image-enhance/create-job",
        poll: "/web/v1/image-enhance/get-job",
        req: ["image"],
        def: {
          scene: "normal",
          output_format: "jpg"
        }
      },
      photo_restoration: {
        path: "/web/v1/old-photo-restoration/create-job",
        poll: "/web/v1/old-photo-restoration/get-job",
        req: ["image"],
        def: {
          output_format: "jpg",
          is_colorize: "1",
          filter_style: "No_Style"
        }
      },
      image_upscaler: {
        path: "/web/v1/image-upscaler/create-job",
        poll: "/web/v1/image-upscaler/get-job",
        req: ["image"],
        def: {
          output_format: "jpg",
          scale: "2",
          target_resolution: "none"
        }
      },
      unblur_image: {
        path: "/web/v1/unblur-image/create-job",
        poll: "/web/v1/unblur-image/get-job",
        req: ["image"],
        def: {
          output_format: "jpg"
        }
      },
      ideogram: {
        path: "/web/v1/ideogram-v4-turbo/create-job",
        poll: "/web/v1/ideogram-v4-turbo/get-job",
        req: ["prompt"],
        def: {
          job_category: "5",
          resolution: "2048x2048"
        }
      },
      sharpen_image: {
        path: "/web/v1/sharpen-image/create-job",
        poll: "/web/v1/sharpen-image/get-job",
        req: ["image"],
        def: {
          output_format: "jpg"
        }
      },
      unblur_text: {
        path: "/web/v1/unblur-text/create-job",
        poll: "/web/v1/unblur-text/get-job",
        req: ["image"],
        def: {
          output_format: "jpg"
        }
      },
      background_remover: {
        path: "/web/v1/image_background_remover/create-job",
        poll: "/web/v1/image_background_remover/get-job",
        req: ["image"],
        def: {
          output_format: "png"
        }
      },
      watermark_remover: {
        path: "/web/v1/image-watermark-remover/create-job",
        poll: "/web/v1/image-watermark-remover/get-job",
        req: ["image"],
        def: {
          output_format: "jpg"
        }
      },
      remove_glare: {
        path: "/web/v1/remove-glare/create-job",
        poll: "/web/v1/remove-glare/get-job",
        req: ["image"],
        def: {
          output_format: "jpg",
          scene: "normal"
        }
      },
      photo_colorizer: {
        path: "/web/v1/photo-colorizer/create-job",
        poll: "/web/v1/photo-colorizer/get-job",
        req: ["image"],
        def: {
          output_format: "jpg",
          scene: "normal"
        }
      }
    };
  }
  bl(e) {
    try {
      return [3735928559, 1103547991, 2654435769, 2246822507].map((n, r) => {
        let o = n;
        for (let i = 0; i < e.length; i++) {
          o = Math.imul(o ^ e.charCodeAt(i), 2654435761 + r * 374761393);
          o ^= o >>> 16;
        }
        return (o >>> 0).toString(16).padStart(8, "0");
      }).join("").slice(0, 32);
    } catch {
      return "";
    }
  }
  qf(e) {
    try {
      return /^[a-f0-9]{32}$/i.test(e) ? e.toLowerCase() : this.bl(e);
    } catch {
      return "";
    }
  }
  Jm() {
    try {
      const bytes = crypto.randomBytes(16);
      return bytes.toString("hex");
    } catch (err) {
      const e = [Date.now(), Math.random(), "Node.js/" + process.version, process.platform, process.arch].join("|");
      return this.bl(e);
    }
  }
  _serial() {
    try {
      const rawEntropy = this.Jm();
      return this.qf(rawEntropy);
    } catch {
      return "";
    }
  }
  _mime(input, buffer) {
    try {
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          const match = input.match(/data:([^;]+);/);
          if (match) return match[1];
        }
        const ext = input.split("?")[0].split(".").pop()?.toLowerCase();
        if (ext === "png") return "image/png";
        if (ext === "webp") return "image/webp";
        if (ext === "gif") return "image/gif";
        if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
      }
      if (buffer && Buffer.isBuffer(buffer)) {
        const hex = buffer.slice(0, 4).toString("hex").toUpperCase();
        if (hex.startsWith("89504E47")) return "image/png";
        if (hex.startsWith("FFD8FF")) return "image/jpeg";
        if (hex.startsWith("47494638")) return "image/gif";
        if (hex.slice(0, 8) === "52494646" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
      }
      return "image/jpeg";
    } catch {
      return "image/jpeg";
    }
  }
  async img(input) {
    try {
      if (!input) return null;
      let buffer = null;
      let mime = "image/jpeg";
      if (Buffer.isBuffer(input)) {
        buffer = input;
        mime = this._mime(null, buffer);
      } else if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log(`[Process] Mendownload gambar dari URL...`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          mime = this._mime(input, buffer);
        } else if (input.startsWith("data:image")) {
          console.log("[Process] Mengurai Base64 Data URI...");
          const base64 = input.split(";base64,").pop();
          buffer = Buffer.from(base64, "base64");
          mime = this._mime(input, buffer);
        } else if (/^[A-Za-z0-9+/=]+$/.test(input)) {
          console.log("[Process] Mengurai teks Base64...");
          buffer = Buffer.from(input, "base64");
          mime = this._mime(null, buffer);
        }
      }
      if (buffer) {
        return {
          buffer: buffer,
          mime: mime
        };
      }
      return {
        error_type: "invalid_image",
        message: "Format input gambar tidak didukung"
      };
    } catch (err) {
      console.log(`[Error] Konversi gambar gagal: ${err?.message}`);
      return {
        error_type: "image_conversion_failed",
        message: err?.message || "Gagal memproses gambar"
      };
    }
  }
  hdrs() {
    try {
      return {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://ezenhancer.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        "product-code": this.productCode,
        "product-serial": this._serial(),
        referer: "https://ezenhancer.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": this.userAgent
      };
    } catch {
      return {};
    }
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async generate({
    mode,
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log(`[Process] Memulai pemeriksaan parameter input...`);
      if (!mode || !this.modes[mode]) {
        console.log(`[Warning] Mode tidak ditemukan atau salah: "${mode || "null"}"`);
        return {
          status: "error",
          result: null,
          error_type: "invalid_mode",
          message: "Mode kosong atau tidak valid. Silakan pilih salah satu dari daftar mode berikut.",
          available_modes: Object.keys(this.modes)
        };
      }
      const spec = this.modes[mode];
      console.log(`[Process] Menggunakan konfigurasi mode: ${mode}`);
      for (const reqKey of spec.req) {
        if (reqKey === "prompt" && !prompt) {
          console.log(`[Warning] Validasi gagal: Parameter "prompt" diperlukan.`);
          return {
            status: "error",
            result: null,
            error_type: "missing_required_input",
            message: 'Parameter "prompt" wajib diisi untuk mode ini.'
          };
        }
        if (reqKey === "image" && !image) {
          console.log(`[Warning] Validasi gagal: Parameter "image" diperlukan.`);
          return {
            status: "error",
            result: null,
            error_type: "missing_required_input",
            message: 'Parameter "image" wajib diisi untuk mode ini.'
          };
        }
      }
      const form = new FormData();
      switch (mode) {
        case "photo_editor": {
          const imgObj = await this.img(image);
          if (imgObj?.error_type) {
            return {
              status: "error",
              result: null,
              ...imgObj
            };
          }
          if (imgObj?.buffer) {
            form.append("original_image_file", imgObj.buffer, {
              filename: "input.jpg",
              contentType: imgObj.mime
            });
          }
          const payload = {
            ...spec.def,
            prompt: prompt || "",
            ...rest
          };
          if (payload.ref_image) {
            console.log("[Process] Memproses gambar referensi tambahan...");
            const refObj = await this.img(payload.ref_image);
            delete payload.ref_image;
            if (refObj?.error_type) {
              return {
                status: "error",
                result: null,
                ...refObj
              };
            }
            if (refObj?.buffer) {
              form.append("ref_image", refObj.buffer, {
                filename: "ref.jpg",
                contentType: refObj.mime
              });
            }
          }
          for (const [key, val] of Object.entries(payload)) {
            if (val !== undefined && val !== null) {
              form.append(key, String(val));
            }
          }
          break;
        }
        case "ideogram": {
          const payload = {
            ...spec.def,
            prompt: prompt || "",
            ...rest
          };
          for (const [key, val] of Object.entries(payload)) {
            if (val !== undefined && val !== null) {
              form.append(key, String(val));
            }
          }
          break;
        }
        default: {
          const imgObj = await this.img(image);
          if (imgObj?.error_type) {
            return {
              status: "error",
              result: null,
              ...imgObj
            };
          }
          if (imgObj?.buffer) {
            form.append("original_image_file", imgObj.buffer, {
              filename: "input.jpg",
              contentType: imgObj.mime
            });
          }
          const payload = {
            ...spec.def,
            ...rest
          };
          for (const [key, val] of Object.entries(payload)) {
            if (val !== undefined && val !== null) {
              form.append(key, String(val));
            }
          }
          break;
        }
      }
      const url = `${this.baseUrl}${spec.path}`;
      const headers = {
        ...this.hdrs(),
        ...form.getHeaders()
      };
      console.log(`[Process] Mengirimkan request ke server: ${spec.path}`);
      const res = await axios.post(url, form, {
        headers: headers
      });
      const jobData = res?.data?.result;
      const jobId = jobData?.job_id;
      if (!jobId) {
        console.log(`[Error] Pembuatan tugas gagal. Response: ${JSON.stringify(res?.data)}`);
        return {
          status: "error",
          result: null,
          error_type: "api_creation_failed",
          message: res?.data?.message?.en || "Gagal membuat tugas di server"
        };
      }
      console.log(`[Process] Tugas berhasil dibuat. ID: ${jobId}`);
      return await this.pollTask(jobId, spec.poll, mode);
    } catch (err) {
      console.log(`[Error] Terjadi kesalahan sistem dalam generate(): ${err?.message}`);
      return {
        status: "error",
        result: null,
        error_type: "system_error",
        message: err?.message || "Sistem mengalami kegagalan"
      };
    }
  }
  async pollTask(jobId, pollPath, mode) {
    try {
      const maxAttempts = 60;
      const interval = 3e3;
      console.log(`[Process] Memulai pemantauan status pengerjaan untuk ID: ${jobId}`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const url = `${this.baseUrl}${pollPath}/${jobId}`;
          const res = await axios.get(url, {
            headers: this.hdrs()
          });
          const jobResult = res?.data?.result;
          if (jobResult?.status === 1) {
            console.log(`[Process] Pemrosesan tugas selesai pada percobaan ke-${attempt}`);
            return {
              status: "success",
              result: {
                job_id: jobResult?.job_id,
                input_url: jobResult?.input_url || null,
                output_url: jobResult?.output_url || []
              },
              mode: mode,
              attempts: attempt
            };
          }
          console.log(`[Process] Menunggu... (${attempt}/${maxAttempts}) Status: ${jobResult?.status || "processing"}`);
          await this.delay(interval);
        } catch (pollErr) {
          console.log(`[Warning] Kendala jaringan saat cek status: ${pollErr?.message}. Mencoba kembali...`);
          await this.delay(interval);
        }
      }
      console.log(`[Error] Pemantauan tugas mencapai batas waktu maksimal.`);
      return {
        status: "error",
        result: null,
        error_type: "polling_timeout",
        message: "Batas waktu pemantauan pengerjaan telah habis",
        job_id: jobId
      };
    } catch (err) {
      console.log(`[Error] Kegagalan tidak terduga pada pollTask(): ${err?.message}`);
      return {
        status: "error",
        result: null,
        error_type: "polling_system_error",
        message: err?.message || "Gagal menjalankan pemantauan status",
        job_id: jobId
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new EzEnhancer();
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