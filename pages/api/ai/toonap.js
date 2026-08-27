import axios from "axios";
import {
  randomUUID
} from "crypto";
class ToonApp {
  constructor() {
    try {
      this.api = "https://cloud-api.appstr.org";
      this.appId = "com.lyrebirdstudio.cartoon";
      this.platform = "ANDROID";
      this.opType = "facelab";
      this.defStyle = "cosplay-cartoon";
      this.hdrs = {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "x-api-version": "2",
        "Content-Type": "application/json"
      };
      const cdn2 = "https://dhzsqqtiu991d.cloudfront.net/toonapp_v2";
      this.styleList = [{
        id: "cosplay-cartoon",
        name: "Avatar Cosplay",
        image: `${cdn2}/toonartItems/animegan.webp`
      }, {
        id: "bfantasy",
        name: "Belle 01 (Fantasy)",
        image: `${cdn2}/toonartItems/bfantasy.webp`
      }, {
        id: "bnatural",
        name: "Belle 02 (Natural)",
        image: `${cdn2}/toonartItems/bnatural.webp`
      }, {
        id: "broyalty",
        name: "Belle 03 (Royalty)",
        image: `${cdn2}/toonartItems/broyalty.webp`
      }, {
        id: "aura1",
        name: "Aura 01",
        image: `${cdn2}/toonartItems/aura1.webp`
      }, {
        id: "aura2",
        name: "Aura 02",
        image: `${cdn2}/toonartItems/aura2.webp`
      }, {
        id: "zombie",
        name: "Zombie",
        image: `${cdn2}/toonartItems/zombie.webp`
      }, {
        id: "child2d",
        name: "Toon 01 (Child 2D)",
        image: `${cdn2}/toonartItems/child2d.webp`
      }, {
        id: "toon3d",
        name: "Toon 02 (3D)",
        image: `${cdn2}/toonartItems/toon3d.webp`
      }, {
        id: "royal2d",
        name: "Toon 03 (Royal 2D)",
        image: `${cdn2}/toonartItems/royal2d.webp`
      }, {
        id: "toon2d",
        name: "Toon 04 (2D)",
        image: `${cdn2}/toonartItems/toon2d.webp`
      }, {
        id: "kbaby",
        name: "Pop 01 (Baby)",
        image: `${cdn2}/toonartItems/kbaby.webp`
      }, {
        id: "kdigitalart",
        name: "Pop 02 (Digital Art)",
        image: `${cdn2}/toonartItems/kdigitalart.webp`
      }, {
        id: "ktoon",
        name: "Pop 03 (Toon)",
        image: `${cdn2}/toonartItems/ktoon.webp`
      }, {
        id: "painting1",
        name: "Art 01 (Oil)",
        image: `${cdn2}/toonartItems/painting1.webp`
      }, {
        id: "painting2",
        name: "Art 02 (Painting)",
        image: `${cdn2}/toonartItems/painting2.webp`
      }, {
        id: "painting3",
        name: "Art 03 (Classic)",
        image: `${cdn2}/toonartItems/painting3.webp`
      }, {
        id: "aura",
        name: "Anime Gan",
        image: `${cdn2}/toonartItems/animegan.webp`
      }, {
        id: "broyalty-old",
        name: "Old 01",
        image: `${cdn2}/toonartItems/old_01.webp`
      }, {
        id: "bfantasy-old",
        name: "Old 02",
        image: `${cdn2}/toonartItems/old_02.webp`
      }, {
        id: "bnatural-old",
        name: "Old 03",
        image: `${cdn2}/toonartItems/old_03.webp`
      }, {
        id: "child3d",
        name: "Disney 01 (Child 3D)",
        image: `${cdn2}/toonartItems/child3d.webp`
      }, {
        id: "childb3d",
        name: "Disney 02 (Baby 3D)",
        image: `${cdn2}/toonartItems/childb3d.webp`
      }, {
        id: "shocked3d",
        name: "Disney 03 (Shocked 3D)",
        image: `${cdn2}/toonartItems/shocked3d.webp`
      }, {
        id: "royal3d",
        name: "Fable 01 (Royal 3D)",
        image: `${cdn2}/toonartItems/royal3d.webp`
      }, {
        id: "angry3d",
        name: "Fable 02 (Angry 3D)",
        image: `${cdn2}/toonartItems/angry3d.webp`
      }, {
        id: "cartoon2",
        name: "Comic 01",
        image: `${cdn2}/toonartItems/cartoon2.webp`
      }, {
        id: "cartoon1",
        name: "Comic 02",
        image: `${cdn2}/toonartItems/cartoon1.webp`
      }, {
        id: "cartoon3",
        name: "Comic 03",
        image: `${cdn2}/toonartItems/cartoon3.webp`
      }, {
        id: "simpsons",
        name: "Simpsons Style",
        image: `${cdn2}/toonartItems/simpsons.webp`
      }];
    } catch (err) {
      console.error(`[ToonApp Constructor Error] ${err?.message || err}`);
    }
  }
  models() {
    return this.styles();
  }
  styles() {
    try {
      return {
        status: true,
        result: this.styleList || []
      };
    } catch (err) {
      return {
        status: false,
        result: `Gagal memuat list model/style: ${err?.message || err}`
      };
    }
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms || 3e3));
  }
  async toBuf(img) {
    try {
      if (!img) return {
        status: false,
        result: "Data gambar tidak boleh kosong"
      };
      if (Buffer.isBuffer(img)) return {
        status: true,
        result: img
      };
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return res?.data ? {
            status: true,
            result: Buffer.from(res.data)
          } : {
            status: false,
            result: "Gagal mengunduh buffer gambar dari URL"
          };
        }
        const b64 = img.includes(",") ? img.split(",")[1] : img;
        return {
          status: true,
          result: Buffer.from(b64, "base64")
        };
      }
      return {
        status: false,
        result: "Format gambar harus Buffer, URL string, atau Base64 string"
      };
    } catch (err) {
      return {
        status: false,
        result: `Gagal memproses gambar: ${err?.message || err}`
      };
    }
  }
  vldStyle(st) {
    try {
      const target = String(st || this.defStyle).toLowerCase().trim();
      const found = (this.styleList || []).find(x => x.id.toLowerCase() === target || x.name.toLowerCase() === target);
      if (!found) {
        return {
          status: false,
          result: `Style "${st}" tidak ditemukan dalam daftar. Gunakan action 'styles' atau 'models' untuk melihat list.`
        };
      }
      return {
        status: true,
        result: found.id
      };
    } catch (err) {
      return {
        status: false,
        result: `Gagal validasi style: ${err?.message || err}`
      };
    }
  }
  async poll(cid, targetState = "READY", max = 60, interval = 3e3) {
    try {
      for (let i = 1; i <= max; i++) {
        await this.slp(interval);
        try {
          const res = await axios.get(`${this.api}/image-process/state-fetching`, {
            params: {
              app_id: this.appId,
              app_platform: this.platform,
              correlation_id: cid,
              operation_type: this.opType
            },
            headers: this.hdrs
          });
          const data = res?.data?.data || {};
          const stateCat = data?.process?.sub_state_category || "";
          const subState = data?.process?.sub_state || "";
          if (stateCat === targetState || targetState === "READY" && subState === "FILTERS_READY" || targetState === "COMPLETED" && subState === "PROCESS_COMPLETED") {
            return {
              status: true,
              result: data
            };
          }
          if (subState?.includes("FAILED") || stateCat === "ERROR") {
            return {
              status: false,
              result: `Task gagal pada server dengan status: ${subState || stateCat}`
            };
          }
        } catch (pollErr) {
          if (i === max) return {
            status: false,
            result: `Polling error: ${pollErr?.message || pollErr}`
          };
        }
      }
      return {
        status: false,
        result: `Waktu proses habis (timeout) setelah ${max * (interval / 1e3)} detik`
      };
    } catch (err) {
      return {
        status: false,
        result: `Error pada loop polling: ${err?.message || err}`
      };
    }
  }
  async generate({
    image,
    style
  } = {}) {
    try {
      if (!image) {
        return {
          status: false,
          result: 'Parameter "image" wajib diisi (URL, Base64, atau Buffer).'
        };
      }
      const validStyleRes = this.vldStyle(style ? style : this.defStyle);
      if (!validStyleRes.status) return validStyleRes;
      const selectedStyle = validStyleRes.result;
      const bufRes = await this.toBuf(image);
      if (!bufRes.status) return bufRes;
      const imgBuffer = bufRes.result;
      const fileKey = randomUUID();
      const signRes = await axios.post(`${this.api}/image-process/signed-url`, {
        file_key: fileKey,
        app_id: this.appId,
        app_platform: this.platform,
        operation_type: this.opType
      }, {
        headers: this.hdrs
      }).catch(err => ({
        error: err
      }));
      if (signRes?.error) {
        return {
          status: false,
          result: `Gagal meminta signed URL: ${signRes?.error?.message || signRes.error}`
        };
      }
      const uploadUrl = signRes?.data?.data?.upload_url;
      const correlationId = signRes?.data?.data?.correlation_id;
      if (!uploadUrl || !correlationId) {
        return {
          status: false,
          result: "Respon server tidak memuat upload_url atau correlation_id yang valid."
        };
      }
      const uploadRes = await axios.put(uploadUrl, imgBuffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      }).catch(err => ({
        error: err
      }));
      if (uploadRes?.error) {
        return {
          status: false,
          result: `Gagal mengunggah gambar: ${uploadRes?.error?.message || uploadRes.error}`
        };
      }
      const readyRes = await this.poll(correlationId, "READY", 60, 3e3);
      if (!readyRes.status) return readyRes;
      const faceId = readyRes?.result?.context?.face_details?.[0]?.face_id;
      const imageId = readyRes?.result?.context?.image_id;
      if (!faceId || !imageId) {
        return {
          status: false,
          result: "Wajah tidak terdeteksi pada gambar atau parameter context tidak ditemukan."
        };
      }
      const applyRes = await axios.post(`${this.api}/image-process/apply-filter`, {
        app_id: this.appId,
        app_platform: this.platform,
        correlation_id: correlationId,
        face_id: faceId,
        filter_id: selectedStyle,
        image_id: imageId,
        operation_type: this.opType
      }, {
        headers: this.hdrs
      }).catch(err => ({
        error: err
      }));
      if (applyRes?.error) {
        return {
          status: false,
          result: `Gagal menerapkan filter: ${applyRes?.error?.message || applyRes.error}`
        };
      }
      const finishRes = await this.poll(correlationId, "COMPLETED", 60, 3e3);
      if (!finishRes.status) return finishRes;
      const resultUrl = finishRes?.result?.signed_urls?.[0] || null;
      if (!resultUrl) {
        return {
          status: false,
          result: "URL hasil filter tidak ditemukan dalam respon server."
        };
      }
      return {
        status: true,
        result: {
          url: resultUrl,
          style: selectedStyle,
          correlation_id: correlationId,
          face_id: faceId
        }
      };
    } catch (err) {
      return {
        status: false,
        result: `Terjadi kesalahan tak terduga: ${err?.message || err}`
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "styles", "models"];
  if (!action) {
    return res.status(400).json({
      status: false,
      result: `Parameter 'action' wajib diisi. Pilihan action yang tersedia: ${validActions.join(", ")}`
    });
  }
  const app = new ToonApp();
  try {
    let response;
    switch (action) {
      case "styles":
      case "models":
        response = app.styles();
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            status: false,
            result: "Parameter 'image' (berupa URL atau Base64 string) wajib diisi untuk action 'generate'."
          });
        }
        response = await app.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          result: `Action '${action}' tidak valid. Pilihan action yang tersedia: ${validActions.join(", ")}`
        });
    }
    const statusCode = response.status ? 200 : 400;
    return res.status(statusCode).json(response);
  } catch (error) {
    return res.status(500).json({
      status: false,
      result: error.message || "Internal Server Error"
    });
  }
}