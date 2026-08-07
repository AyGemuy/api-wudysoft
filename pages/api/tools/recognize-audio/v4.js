import axios from "axios";
import crypto from "crypto";
import https from "https";
import FormData from "form-data";
class SongFinder {
  constructor() {
    this.agt = new https.Agent({
      rejectUnauthorized: false
    });
    this.acrHost = "identify-eu-west-1.acrcloud.com";
    this.acrKey = "3138199725df57d391c9ac556bef6321";
    this.acrSecKey = "ql3fa7zhCsViTeoelgOeSFsSpV5hyOABLaoVRnvk";
    this.acrApi = axios.create({
      baseURL: `https://${this.acrHost}`,
      httpsAgent: this.agt
    });
  }
  _snk(obj) {
    try {
      if (obj === null || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(v => this._snk(v));
      const out = {};
      for (const key of Object.keys(obj)) {
        const sKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        out[sKey] = this._snk(obj[key]);
      }
      return out;
    } catch (e) {
      console.log(`[Process] Gagal format snake_case: ${e.message}`);
      return obj;
    }
  }
  _mime(buf) {
    try {
      if (buf.length >= 3 && buf[0] === 73 && buf[1] === 68 && buf[2] === 51) {
        return {
          mime: "audio/mpeg",
          ext: ".mp3"
        };
      }
      if (buf.length >= 2 && buf[0] === 255 && (buf[1] & 224) === 224) {
        return {
          mime: "audio/mpeg",
          ext: ".mp3"
        };
      }
      return {
        mime: "audio/wav",
        ext: ".wav"
      };
    } catch (e) {
      return {
        mime: "audio/wav",
        ext: ".wav"
      };
    }
  }
  async _aud(audio) {
    try {
      console.log("[Process] Membaca masukan audio...");
      if (Buffer.isBuffer(audio)) {
        return {
          status: true,
          result: audio
        };
      }
      if (typeof audio === "string") {
        if (/^https?:\/\//i.test(audio)) {
          console.log(`[Process] Mengunduh audio eksternal: ${audio}`);
          const res = await axios.get(audio, {
            responseType: "arraybuffer",
            httpsAgent: this.agt,
            headers: {
              "user-agent": "Mozilla/5.0"
            }
          });
          return {
            status: true,
            result: Buffer.from(res.data)
          };
        }
        if (/^[A-Za-z0-9+/=]+$/i.test(audio)) {
          console.log("[Process] Mendekode Base64...");
          return {
            status: true,
            result: Buffer.from(audio, "base64")
          };
        }
      }
      return {
        status: false,
        result: {
          error: "Format input tidak didukung."
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal memuat audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  _hmac(data, key) {
    try {
      return crypto.createHmac("sha1", key).update(data).digest("base64");
    } catch (e) {
      return "";
    }
  }
  async identifyACR({
    audio
  }) {
    try {
      console.log("[Process] Memulai identifikasi audio lewat mesin ACRCloud...");
      const audRes = await this._aud(audio);
      if (!audRes.status) return {
        ...audRes
      };
      const buf = audRes.result;
      const detect = this._mime(buf);
      const timestamp = Math.floor(Date.now() / 1e3).toString();
      const signatureString = ["POST", "/v1/identify", this.acrKey, "audio", "1", timestamp].join("\n");
      const signature = this._hmac(signatureString, this.acrSecKey);
      console.log(`[Process] Mengalkulasi signature HMAC-SHA1 untuk ACRCloud...`);
      const form = new FormData();
      form.append("access_key", this.acrKey);
      form.append("sample_bytes", buf.length.toString());
      form.append("timestamp", timestamp);
      form.append("signature", signature);
      form.append("data_type", "audio");
      form.append("signature_version", "1");
      form.append("sample", buf, {
        filename: "sample.mp3",
        contentType: detect.mime
      });
      const res = await this.acrApi.post("/v1/identify", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const hasMatch = res.data?.status?.code === 0 && res.data?.metadata?.music?.length > 0;
      if (!hasMatch) {
        return {
          status: false,
          result: {
            error: res.data?.status?.msg || "Lagu tidak terdaftar di database ACRCloud.",
            ...res.data
          }
        };
      }
      return {
        status: true,
        result: {
          ...this._snk(res.data)
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal memproses identifikasi ACRCloud: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async search({
    audio = null,
    ...rest
  }) {
    try {
      console.log("[Process] Menginisialisasi portal pencarian audio SongFinder...");
      if (!audio) {
        return {
          status: false,
          result: {
            error: "Parameter 'audio' diperlukan."
          }
        };
      }
      const audRes = await this._aud(audio);
      if (!audRes.status) return {
        ...audRes
      };
      const buf = audRes.result;
      console.log("[Process] Mencoba identifikasi lewat mesin ACRCloud...");
      const acrMatch = await this.identifyACR({
        audio: buf
      });
      if (acrMatch.status) {
        return {
          status: true,
          result: {
            ...this._snk({
              ...acrMatch.result.result,
              engine: "acrcloud",
              ...rest
            })
          }
        };
      }
      return {
        status: false,
        result: {
          error: "Lagu gagal diidentifikasi pada mesin ACRCloud."
        }
      };
    } catch (e) {
      console.log(`[Process] Gangguan pada proses portal pencarian: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message || "Unknown error occurred"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.audio) {
    return res.status(400).json({
      error: "Parameter 'audio' diperlukan"
    });
  }
  const api = new SongFinder();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}