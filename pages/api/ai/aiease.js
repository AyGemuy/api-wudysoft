import axios from "axios";
import CryptoJS from "crypto-js";
class AIEase {
  constructor() {
    this.secretKey = "Q@D24=oueV%]OBS8i,%eK=5I|7WU$PeE";
    this.client = axios.create({
      baseURL: "https://www.aiease.ai",
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.aiease.ai",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    const rawKey = this.secretKey.split("").map(e => {
      const t = e.charCodeAt(0) + 1;
      return String.fromCharCode(t - 1);
    }).join("");
    const keyHash = CryptoJS.SHA256(rawKey).toString(CryptoJS.enc.Hex);
    this.parsedKey = CryptoJS.enc.Hex.parse(keyHash);
    this.models = ["kie_nano_banana_pro", "kie_nano_banana", "see_dream_img", "wf_art", "doubao-4-5", "qwen_edit", "qwen_img"];
    this.token = "";
    this.modes = {
      "ai-gen": {
        validate: input => !!(input.prompt || input.image),
        message: 'Parameter "prompt" atau "image" diperlukan untuk mode "ai-gen"'
      },
      "ai-filter": {
        validate: input => !!input.image,
        message: 'Parameter "image" diperlukan untuk mode "ai-filter"'
      },
      "ai-style": {
        validate: input => !!(input.prompt || input.image),
        message: 'Parameter "prompt" atau "image" diperlukan untuk mode "ai-style"'
      },
      enhance: {
        validate: input => !!input.image,
        message: 'Parameter "image" diperlukan untuk mode "enhance"'
      },
      restore: {
        validate: input => !!input.image,
        message: 'Parameter "image" diperlukan untuk mode "restore"'
      },
      "get-filter-list": {
        validate: () => true,
        message: ""
      },
      "get-style-list": {
        validate: () => true,
        message: ""
      }
    };
  }
  _sk(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._sk(v));
    }
    if (obj !== null && typeof obj === "object") {
      const out = {};
      for (const key of Object.keys(obj)) {
        const sKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/_+/g, "_").replace(/^_+|_+$/g, "");
        out[sKey] = this._sk(obj[key]);
      }
      return out;
    }
    return obj;
  }
  _ec(text) {
    try {
      const encodedText = encodeURIComponent(text);
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(encodedText, this.parsedKey, {
        iv: iv,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding
      });
      return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
    } catch (err) {
      console.log("[LOG] Error Enkripsi:", err.message);
      return "";
    }
  }
  _dc(cipherText) {
    try {
      const encryptedWordArray = CryptoJS.enc.Base64.parse(cipherText);
      const iv = CryptoJS.lib.WordArray.create(encryptedWordArray.words.slice(0, 4), 16);
      const ciphertext = CryptoJS.lib.WordArray.create(encryptedWordArray.words.slice(4), encryptedWordArray.sigBytes - 16);
      const decrypted = CryptoJS.AES.decrypt({
        ciphertext: ciphertext
      }, this.parsedKey, {
        iv: iv,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding
      });
      return decodeURIComponent(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (err) {
      console.log("[LOG] Error Dekripsi:", err.message);
      return "";
    }
  }
  _rn() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  async _tb(img) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[LOG] Mendownload gambar dari URL...");
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (img.startsWith("data:image")) {
          console.log("[LOG] Membaca data base64 URI...");
          return Buffer.from(img.split(",")[1], "base64");
        }
        if (/^[A-Za-z0-9+/=]+$/.test(img)) {
          return Buffer.from(img, "base64");
        }
      }
    } catch (err) {
      console.log("[LOG] Gagal konversi gambar ke Buffer:", err.message);
    }
    return null;
  }
  async _up(buf, mode, token) {
    try {
      if (!buf) return null;
      const isTemp = ["ai-filter", "enhance", "restore"].includes(mode);
      const featureCode = isTemp ? "default_temp" : "default_persistent";
      console.log(`[LOG] Meminta URL Presigned (${featureCode})...`);
      const payload = JSON.stringify({
        length: buf.length,
        filetype: "image/jpeg",
        filename: `${this._rn()}.jpeg`,
        time: Math.random().toString(36).substring(2, 13)
      });
      const encryptedData = this._ec(payload);
      const res = await this.client.post("/api/api/oss/getMediaPreSignedUrl", {
        featureCode: featureCode,
        encryptedData: encryptedData
      }, {
        headers: {
          authorization: `Bearer ${token}`,
          referer: isTemp ? "https://www.aiease.ai/ai-filter/" : "https://www.aiease.ai/ai-image-generator/?tab=text-to-image"
        }
      });
      if (res?.data?.code !== 200 || !res?.data?.result) {
        console.log("[LOG] Gagal mendapatkan URL presigned:", res?.data?.message);
        return null;
      }
      const uploadUrl = this._dc(res.data.result);
      if (!uploadUrl) {
        console.log("[LOG] Gagal mendekripsi URL unggah.");
        return null;
      }
      const downloadUrl = uploadUrl.split("?")[0];
      console.log("[LOG] Mengunggah file biner ke server penyimpanan...");
      await axios.put(uploadUrl, buf, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      console.log("[LOG] File berhasil diunggah:", downloadUrl);
      return downloadUrl;
    } catch (err) {
      console.log("[LOG] Error ketika mengunggah file:", err.message);
      return null;
    }
  }
  async generate({
    token,
    mode,
    prompt,
    image,
    ...rest
  }) {
    try {
      let activeToken = token || this.token;
      const availableModes = Object.keys(this.modes);
      if (!mode || !this.modes[mode]) {
        console.log("[LOG] Validasi mode gagal atau mode kosong.");
        const errMessage = `Mode tidak valid atau kosong. Mode yang didukung: ${availableModes.join(", ")}`;
        return {
          status: "error",
          result: this._sk(errMessage),
          token: activeToken,
          mode: mode || ""
        };
      }
      const activeMode = mode;
      const activeRule = this.modes[activeMode];
      if (activeRule && !activeRule.validate({
          prompt: prompt,
          image: image,
          ...rest
        })) {
        console.log(`[LOG] Validasi input wajib gagal untuk mode: ${activeMode}`);
        return {
          status: "error",
          result: this._sk(activeRule.message),
          token: activeToken,
          mode: activeMode
        };
      }
      if (!activeToken) {
        console.log("[LOG] Token kosong, melakukan registrasi session user...");
        const visitRes = await this.client.post("/api/api/user/v2/visit", {}, {
          headers: {
            authorization: "Bearer ",
            referer: "https://www.aiease.ai/"
          }
        }).catch(() => null);
        activeToken = visitRes?.data?.result?.token || "";
        this.token = activeToken;
        console.log("[LOG] Token berhasil didapatkan:", activeToken ? "Berhasil" : "Gagal");
      }
      if (!activeToken) {
        return {
          status: "error",
          result: this._sk("Otorisasi token gagal didapatkan"),
          token: "",
          mode: activeMode
        };
      }
      let uploadedUrl = null;
      let uploadedUrls = [];
      if (image) {
        if (Array.isArray(image)) {
          console.log(`[LOG] Memproses multi-input gambar (${image.length} file)...`);
          for (const img of image) {
            const buf = await this._tb(img);
            if (buf) {
              const url = await this._up(buf, activeMode, activeToken);
              if (url) uploadedUrls.push(url);
            }
          }
          uploadedUrl = uploadedUrls[0] || null;
        } else {
          const buf = await this._tb(image);
          uploadedUrl = await this._up(buf, activeMode, activeToken);
        }
      }
      let body = {};
      let endpoint = "";
      let headersConfig = {
        authorization: `Bearer ${activeToken}`
      };
      switch (activeMode) {
        case "get-filter-list": {
          console.log("[LOG] Mengambil list filter style dari server...");
          headersConfig["referer"] = "https://www.aiease.ai/ai-filter/";
          const filterRes = await this.client.get("/api/api/common/v2/getAiFilterTemplate", {
            headers: headersConfig
          }).catch(() => null);
          const listData = filterRes?.data?.result || {};
          return {
            status: "success",
            result: this._sk(listData),
            token: activeToken,
            mode: activeMode
          };
        }
        case "get-style-list": {
          console.log("[LOG] Mengambil list art style dari server...");
          headersConfig["platform"] = "web";
          headersConfig["referer"] = "https://www.aiease.ai/app/image-generator";
          const styleRes = await this.client.get("/api/api/common/ai_art_style", {
            headers: headersConfig
          }).catch(() => null);
          const listData = styleRes?.data?.result || {};
          return {
            status: "success",
            result: this._sk(listData),
            token: activeToken,
            mode: activeMode
          };
        }
        case "ai-gen": {
          const activeModel = this.models.includes(rest.model) ? rest.model : "kie_nano_banana";
          const isI2I = !!uploadedUrl;
          endpoint = "/api/api/gen/v2/genImg";
          headersConfig["referer"] = "https://www.aiease.ai/ai-image-generator/?tab=text-to-image";
          body = {
            genType: activeModel,
            model: activeModel,
            params: {
              content: [{
                type: "text",
                text: prompt || "Cute character"
              }, ...uploadedUrl ? [{
                type: "image",
                imgUrl: uploadedUrl
              }] : []],
              command: {
                type: isI2I ? "i2i" : "t2i",
                aspectRatio: isI2I ? "Auto" : "Auto"
              },
              template: ""
            },
            ...rest
          };
          break;
        }
        case "ai-filter": {
          let styleId = rest.styleId || rest.style_id || "48";
          console.log("[LOG] Memvalidasi filter style dari server...");
          headersConfig["referer"] = "https://www.aiease.ai/ai-filter/";
          const filterRes = await this.client.get("/api/api/common/v2/getAiFilterTemplate", {
            headers: headersConfig
          }).catch(() => null);
          const validStyles = filterRes?.data?.result?.styles || [];
          const isStyleValid = validStyles.some(s => String(s.id) === String(styleId));
          if (!isStyleValid && validStyles.length > 0) {
            styleId = String(validStyles[0].id);
            console.log(`[LOG] Style ID dialihkan ke default: ${styleId}`);
          }
          endpoint = "/api/api/gen/v2/img2img";
          body = {
            gen_type: "ai_filter",
            ai_filter_extra_data: {
              img_url: uploadedUrl,
              style_id: String(styleId)
            },
            ...rest
          };
          break;
        }
        case "ai-style": {
          let styleId = rest.styleId || rest.style_id || 68;
          console.log("[LOG] Memvalidasi art style dari server...");
          headersConfig["referer"] = "https://www.aiease.ai/app/image-generator";
          headersConfig["platform"] = "web";
          const styleRes = await this.client.get("/api/api/common/ai_art_style", {
            headers: headersConfig
          }).catch(() => null);
          const categories = styleRes?.data?.result || {};
          const allStyles = [];
          Object.values(categories).forEach(cat => {
            if (Array.isArray(cat)) allStyles.push(...cat);
          });
          const isStyleValid = allStyles.some(s => String(s.id) === String(styleId));
          if (!isStyleValid && allStyles.length > 0) {
            styleId = allStyles[0].id;
            console.log(`[LOG] Art Style ID dialihkan ke default: ${styleId}`);
          }
          const isI2I = !!uploadedUrl;
          endpoint = isI2I ? "/api/api/gen/v2/img2img" : "/api/api/gen/v2/text2img";
          body = {
            gen_type: "art_v1",
            art_v1_extra_data: {
              prompt: prompt || "Add style",
              style_id: Number(styleId),
              size: "1-1",
              batchSize: 1,
              refImg: uploadedUrl || "",
              refWeight: .8,
              workflowType: isI2I ? "art_content_ref" : "art_t2i",
              imgWidth: 769,
              imgHeight: 1024
            },
            ...rest
          };
          break;
        }
        case "enhance": {
          endpoint = "/api/api/gen/v2/img2img";
          headersConfig["referer"] = "https://www.aiease.ai/photo-enhancer/";
          body = {
            gen_type: "enhance",
            enhance_extra_data: {
              img_url: uploadedUrl,
              mode: "general",
              size: "4",
              restore: 1
            },
            ...rest
          };
          break;
        }
        case "restore": {
          endpoint = "/api/api/gen/v2/img2img";
          headersConfig["referer"] = "https://www.aiease.ai/app/restore-photo";
          body = {
            gen_type: "restore",
            restore_extra_data: {
              img_url: uploadedUrl,
              restore_type: "restore_recolor"
            },
            ...rest
          };
          break;
        }
      }
      console.log(`[LOG] Mengirim request generasi untuk mode: ${activeMode}...`);
      const genRes = await this.client.post(endpoint, body, {
        headers: headersConfig
      }).catch(err => {
        console.log("[LOG] Error request generasi:", err.message);
        return null;
      });
      const taskId = genRes?.data?.result?.taskId;
      if (!taskId) {
        return {
          status: "error",
          result: this._sk("Gagal membuat tugas pemrosesan gambar"),
          token: activeToken,
          mode: activeMode
        };
      }
      console.log(`[LOG] Tugas berhasil dibuat. ID Tugas: ${taskId}`);
      let attempts = 0;
      const maxAttempts = 60;
      const interval = 3e3;
      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
        const pollUrl = activeMode === "ai-gen" ? `/api/api/gen/v2/imgResult/${taskId}` : `/api/api/id_photo/task-info?task_id=${taskId}`;
        headersConfig["referer"] = activeMode === "ai-gen" ? "https://www.aiease.ai/ai-image-generator/?tab=text-to-image" : "https://www.aiease.ai/";
        const pollRes = await this.client.get(pollUrl, {
          headers: headersConfig
        }).catch(() => null);
        if (pollRes?.data?.code === 200) {
          const data = pollRes.data.result;
          if (activeMode === "ai-gen") {
            if (data?.images && data.images.length > 0) {
              const urls = data.images.map(img => img.url);
              console.log("[LOG] Polling sukses, hasil didapatkan.");
              return {
                status: "success",
                result: this._sk(urls),
                token: activeToken,
                mode: activeMode
              };
            }
          } else {
            const queueInfo = data?.data?.queue_info || data?.queue_info;
            const results = data?.data?.results || data?.results;
            if (queueInfo?.status === "success" && results?.length > 0) {
              const urls = results.map(r => r.origin || r.url);
              console.log("[LOG] Polling sukses, hasil didapatkan.");
              return {
                status: "success",
                result: this._sk(urls),
                token: activeToken,
                mode: activeMode
              };
            } else if (queueInfo?.status === "failed") {
              return {
                status: "failed",
                result: this._sk("Pemrosesan gagal di sisi server"),
                token: activeToken,
                mode: activeMode
              };
            }
          }
        }
        console.log(`[LOG] Polling percobaan ke-${attempts}/${maxAttempts}...`);
      }
      return {
        status: "timeout",
        result: this._sk("Waktu tunggu polling habis"),
        token: activeToken,
        mode: activeMode
      };
    } catch (err) {
      console.log("[LOG] Terjadi kesalahan fatal:", err.message);
      return {
        status: "error",
        result: this._sk(err.message),
        token: token || "",
        mode: mode
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AIEase();
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