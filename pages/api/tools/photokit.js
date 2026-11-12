import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import crypto from "crypto";
class PhotokitAI {
  constructor() {
    this.baseUrl = "https://photokit.com/editor/aiedit_api.php";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
  }
  getHeaders(extra = {}) {
    try {
      return {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://photokit.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://photokit.com/editor/",
        "sec-ch-ua": '"Mises";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.ua,
        ...extra
      };
    } catch (e) {
      return extra;
    }
  }
  generateKey(dataLength) {
    try {
      return crypto.createHmac("md5", "zxw").update(String(dataLength)).digest("hex");
    } catch (e) {
      throw new Error(`Gagal membuat signature key: ${e.message}`);
    }
  }
  generateSessionHash() {
    try {
      const chars = "abcdefghijkmnopqrstuvwxyz0123456789";
      let str = "";
      for (let i = 0; i < 12; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return str;
    } catch (e) {
      return Math.random().toString(36).substring(2, 14);
    }
  }
  async fetchImageBuffer(url) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: this.getHeaders(),
        timeout: 3e4
      });
      const contentType = res.headers["content-type"] || "image/jpeg";
      return {
        buffer: Buffer.from(res.data),
        contentType: contentType
      };
    } catch (e) {
      throw new Error(`Gagal mengunduh gambar output: ${e.message}`);
    }
  }
  async resolveMedia(media) {
    try {
      if (!media) throw new Error("Parameter 'media' (image) tidak boleh kosong.");
      if (typeof media === "string") {
        if (media.startsWith("data:image/")) {
          return {
            dataUri: media,
            length: media.length
          };
        }
        if (/^https?:\/\//i.test(media)) {
          const res = await axios.get(media, {
            responseType: "arraybuffer",
            headers: this.getHeaders(),
            timeout: 2e4
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          const base64 = Buffer.from(res.data).toString("base64");
          const dataUri = `data:${mime};base64,${base64}`;
          return {
            dataUri: dataUri,
            length: dataUri.length
          };
        }
        const dataUri = `data:image/jpeg;base64,${media}`;
        return {
          dataUri: dataUri,
          length: dataUri.length
        };
      }
      if (Buffer.isBuffer(media)) {
        const base64 = media.toString("base64");
        const dataUri = `data:image/jpeg;base64,${base64}`;
        return {
          dataUri: dataUri,
          length: dataUri.length
        };
      }
      throw new Error("Tipe input gambar tidak didukung (harus URL, Buffer, atau Base64).");
    } catch (e) {
      throw new Error(`Gagal memproses media input: ${e.message}`);
    }
  }
  async generate({
    image,
    prompt,
    strength = 1,
    use_cutout = true,
    seed = null,
    timeout = 18e4
  }) {
    try {
      if (!image) throw new Error("Parameter 'image' wajib diisi.");
      if (!prompt) throw new Error("Parameter 'prompt' wajib diisi.");
      const media = await this.resolveMedia(image);
      const sessionHash = this.generateSessionHash();
      const key = this.generateKey(media.length);
      const finalSeed = seed || Math.random().toFixed(6).slice(-6);
      const form = new FormData();
      form.append("type", "queue_join");
      form.append("image", media.dataUri);
      form.append("session_hash", sessionHash);
      form.append("key", key);
      form.append("prompt", String(prompt));
      form.append("seed", String(finalSeed));
      form.append("strength", String(strength < .5 ? .9 : strength));
      form.append("use_cutout", String(use_cutout));
      const postHeaders = this.getHeaders(form.getHeaders());
      const res = await axios.post(this.baseUrl, form, {
        headers: postHeaders,
        timeout: 3e4
      });
      const eventId = res.data?.event_id;
      if (!eventId) {
        throw new Error(`Gagal bergabung ke antrean: ${JSON.stringify(res.data)}`);
      }
      return await new Promise(resolve => {
        try {
          const sseUrl = `${this.baseUrl}?type=queue_data&session_hash=${sessionHash}`;
          const sseHeaders = this.getHeaders({
            accept: "text/event-stream"
          });
          const es = new EventSource(sseUrl, {
            headers: sseHeaders
          });
          const timer = setTimeout(() => {
            try {
              es.close();
            } catch {}
            resolve({
              status: false,
              error: "Batas waktu pemrosesan AI habis (Timeout)."
            });
          }, timeout);
          es.onmessage = async e => {
            try {
              if (!e.data) return;
              const data = JSON.parse(e.data);
              if (data.msg === "process_completed") {
                clearTimeout(timer);
                try {
                  es.close();
                } catch {}
                let finalBuffer = null;
                let finalContentType = "image/jpeg";
                if (data.output?.data?.status === 200 && data.output?.data?.image_base64) {
                  finalBuffer = Buffer.from(data.output.data.image_base64, "base64");
                  finalContentType = "image/jpeg";
                } else {
                  const rawOutput = data.output?.data?.[2] || data.output?.data || data.output;
                  if (typeof rawOutput === "string") {
                    if (rawOutput.startsWith("data:")) {
                      finalContentType = rawOutput.split(";")[0].replace("data:", "");
                      finalBuffer = Buffer.from(rawOutput.split(",")[1], "base64");
                    } else if (/^https?:\/\//i.test(rawOutput)) {
                      const fetched = await this.fetchImageBuffer(rawOutput);
                      finalBuffer = fetched.buffer;
                      finalContentType = fetched.contentType;
                    }
                  }
                }
                if (finalBuffer) {
                  resolve({
                    status: true,
                    buffer: finalBuffer,
                    contentType: finalContentType
                  });
                } else {
                  resolve({
                    status: false,
                    error: data.output?.data?.message || data.output?.error || "Gagal mengurai gambar hasil proses."
                  });
                }
              }
            } catch (err) {
              clearTimeout(timer);
              try {
                es.close();
              } catch {}
              resolve({
                status: false,
                error: `Error saat memproses data SSE: ${err.message}`
              });
            }
          };
          es.onerror = err => {
            clearTimeout(timer);
            try {
              es.close();
            } catch {}
            resolve({
              status: false,
              error: `Koneksi EventSource terputus: ${err.message || "Unknown error"}`
            });
          };
        } catch (errSse) {
          resolve({
            status: false,
            error: `Gagal menginisialisasi EventSource: ${errSse.message}`
          });
        }
      });
    } catch (e) {
      return {
        status: false,
        error: e.response?.data?.message || e.message || "Terjadi kesalahan internal pada Photokit AI."
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const image = params.image || params.imageUrl;
  const prompt = params.prompt;
  if (!image || !prompt) {
    return res.status(400).json({
      error: "Parameter 'image' (atau 'imageUrl') dan 'prompt' diperlukan."
    });
  }
  const api = new PhotokitAI();
  try {
    const data = await api.generate({
      image: image,
      prompt: prompt,
      strength: params.strength ? Number(params.strength) : 1,
      use_cutout: params.use_cutout !== "false" && params.use_cutout !== false,
      seed: params.seed || null
    });
    if (data.status && data.buffer) {
      res.setHeader("Content-Type", data.contentType || "image/jpeg");
      return res.status(200).send(data.buffer);
    }
    return res.status(500).json({
      error: data.error || "Gagal memproses gambar melalui Photokit AI."
    });
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses permintaan.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}