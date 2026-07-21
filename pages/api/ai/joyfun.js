import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class JoyFun {
  constructor() {
    this.vToken = "";
    this.baseURL = "https://backend.joyfun.ai";
    this.secret = "e82ckenh8dichen8";
    this.delim = "-36cd479b6b5-";
    this.client = axios.create({
      baseURL: this.baseURL
    });
  }
  sk(o) {
    if (Array.isArray(o)) return o.map(x => this.sk(x));
    if (o !== null && typeof o === "object") {
      return Object.keys(o).reduce((a, k) => {
        const s = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        a[s] = this.sk(o[k]);
        return a;
      }, {});
    }
    return o;
  }
  bi() {
    try {
      const info = {
        language: "id-ID",
        languages: ["id-ID"],
        timeZone: "Asia/Makassar",
        timezoneOffset: -480,
        userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        timeString: new Date().toString()
      };
      return encodeURIComponent(JSON.stringify(info));
    } catch (err) {
      return "";
    }
  }
  hd(additional = {}) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en",
      "browser-info": this.bi(),
      "cache-control": "no-cache",
      gaclientid: `GA1.1.${Math.floor(Math.random() * 1e9)}.${Math.floor(Date.now() / 1e3)}`,
      locale: "en",
      origin: "https://joyfun.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://joyfun.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      token: "",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...additional
    };
    if (this.vToken) {
      headers["vtoken"] = this.vToken;
    }
    return headers;
  }
  enc(endpoint, payload) {
    try {
      const jsonStr = JSON.stringify(payload);
      const raw = `${endpoint}${this.delim}${jsonStr}`;
      const hash = crypto.createHash("md5").update(raw).digest("hex");
      const plain = `${raw}${this.delim}${hash}`;
      const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(this.secret, "utf8"), null);
      cipher.setAutoPadding(true);
      let encrypted = cipher.update(plain, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted.toUpperCase();
    } catch (err) {
      console.error("[Process] Enkripsi gagal:", err.message);
      return null;
    }
  }
  async res(imgInput) {
    try {
      if (Buffer.isBuffer(imgInput)) {
        return {
          buffer: imgInput,
          mime: "image/jpeg"
        };
      }
      if (typeof imgInput === "string") {
        if (imgInput.startsWith("data:")) {
          const parts = imgInput.split(",");
          const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
          const bin = Buffer.from(parts[1], "base64");
          return {
            buffer: bin,
            mime: mime
          };
        }
        if (imgInput.startsWith("http://") || imgInput.startsWith("https://")) {
          console.log(`[Process] Mengunduh gambar dari url: ${imgInput.slice(0, 50)}...`);
          const res = await axios.get(imgInput, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          return {
            buffer: Buffer.from(res.data),
            mime: mime
          };
        }
        try {
          const bin = Buffer.from(imgInput, "base64");
          return {
            buffer: bin,
            mime: "image/jpeg"
          };
        } catch (_) {}
      }
      return null;
    } catch (err) {
      console.error("[Process] Gagal memproses gambar:", err.message);
      return null;
    }
  }
  async reg() {
    try {
      console.log("[Process] Memulai registrasi akun sementara...");
      const uuidVal = crypto.randomUUID().replace(/-/g, "");
      const payload = {
        uuid: uuidVal,
        endpoint_type: "web",
        subscribe_type: "0"
      };
      const endpoint = "/v2/user/register";
      const encrypted = this.enc(endpoint, payload);
      if (!encrypted) {
        return null;
      }
      const headers = this.hd({
        "content-type": "application/json"
      });
      const res = await this.client.post(`/api${endpoint}`, {
        params: encrypted
      }, {
        headers: headers
      });
      const token = res?.data?.data?.vToken || "";
      if (token) {
        this.vToken = token;
        console.log(`[Process] Registrasi berhasil. Token aktif: ${this.vToken.slice(0, 15)}...`);
        return token;
      }
      return null;
    } catch (err) {
      console.error("[Process] Registrasi Error:", err.message);
      return null;
    }
  }
  async crd() {
    try {
      const endpoint = "/v3/user/creditsCount";
      const encrypted = this.enc(endpoint, {});
      if (!encrypted) {
        return 0;
      }
      const headers = this.hd({
        "content-type": "application/json"
      });
      const res = await this.client.post(`/api${endpoint}`, {
        params: encrypted
      }, {
        headers: headers
      });
      return res?.data?.data?.credits ?? 0;
    } catch (err) {
      console.error("[Process] Gagal mengecek sisa kredit:", err.message);
      return 0;
    }
  }
  async mdl(isI2I) {
    try {
      const endpoint = isI2I ? "/tools/image/img2imageModel" : "/tools/image/txt2imageModel";
      const headers = this.hd();
      const res = await this.client.get(`/api${endpoint}`, {
        headers: headers
      });
      return res?.data?.data || null;
    } catch (err) {
      console.error("[Process] Gagal memuat daftar model:", err.message);
      return null;
    }
  }
  async pol(jobId) {
    try {
      console.log(`[Process] Memantau pekerjaan ${jobId}...`);
      const limit = 60;
      const delay = 3e3;
      for (let i = 0; i < limit; i++) {
        const headers = this.hd();
        const res = await this.client.get(`/api/tools/job/records?job_ids=${jobId}`, {
          headers: headers
        });
        const record = res?.data?.data?.records?.[0];
        if (record) {
          const status = record?.status;
          console.log(`[Process] Pemantauan #${i + 1}: Status saat ini = ${status}`);
          if (status === "success") {
            return {
              status: "success",
              result: record?.output_resource || record?.job?.output_resource || "",
              info: record
            };
          }
          if (status === "failed") {
            return {
              status: "failed",
              result: null,
              info: record
            };
          }
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return {
        status: "timeout",
        result: null,
        info: null
      };
    } catch (err) {
      console.error("[Process] Pemantauan Error:", err.message);
      return {
        status: "error",
        result: null,
        info: err.message
      };
    }
  }
  async generate({
    token,
    prompt,
    image,
    ...rest
  }) {
    let modelsList = [];
    let matchedModel = null;
    try {
      this.vToken = token || this.vToken || "";
      if (!this.vToken) {
        const registered = await this.reg();
        if (!registered) {
          return this.sk({
            status: "error",
            result: null,
            token: null,
            models: [],
            selectedModel: null,
            error: "Registrasi otomatis gagal."
          });
        }
      }
      if (!prompt) {
        return this.sk({
          status: "error",
          result: null,
          token: this.vToken,
          models: [],
          selectedModel: null,
          error: "Prompt wajib diisi."
        });
      }
      const isI2I = image ? true : false;
      let resolvedImages = [];
      if (isI2I) {
        console.log("[Process] Mode Image-to-Image terdeteksi.");
        const rawImages = Array.isArray(image) ? image : [image];
        for (const img of rawImages) {
          const resolved = await this.res(img);
          if (resolved) {
            resolvedImages.push(resolved);
          }
        }
        if (resolvedImages.length === 0) {
          return this.sk({
            status: "error",
            result: null,
            token: this.vToken,
            models: [],
            selectedModel: null,
            error: "Gambar yang dimasukkan gagal diproses."
          });
        }
      } else {
        console.log("[Process] Mode Text-to-Image terdeteksi.");
      }
      const modelData = await this.mdl(isI2I);
      modelsList = modelData?.models || [];
      const defaultModel = modelData?.defaultModel || "JoyFun Spicy";
      const targetModelName = rest.name || rest.model || defaultModel;
      matchedModel = modelsList.find(m => m.name.toLowerCase() === targetModelName.toLowerCase()) || modelsList[0];
      if (!matchedModel) {
        return this.sk({
          status: "error",
          result: null,
          token: this.vToken,
          models: modelsList,
          selectedModel: null,
          error: `Model '${targetModelName}' tidak tersedia.`
        });
      }
      const userCredits = await this.crd();
      console.log(`[Process] Saldo kredit Anda: ${userCredits} token`);
      let baseCost = parseInt(matchedModel.cost || 0);
      let calculatedCost = baseCost;
      if (isI2I && rest.resolution) {
        const resItem = matchedModel.options?.resolution?.items?.find(i => i.title === rest.resolution || i.value === rest.resolution);
        if (resItem?.cost?.startsWith("*")) {
          const multiplier = parseFloat(resItem.cost.replace("*", "")) || 1;
          calculatedCost = baseCost * multiplier;
        }
      }
      if (userCredits < calculatedCost) {
        console.log(`[Process] Kredit tidak cukup untuk model ${matchedModel.name} (${calculatedCost} kredit). Mencari alternatif model yang muat di sisa kredit...`);
        const affordableModels = modelsList.map(m => {
          let mBaseCost = parseInt(m.cost || 0);
          let mCost = mBaseCost;
          if (isI2I && rest.resolution) {
            const resItem = m.options?.resolution?.items?.find(i => i.title === rest.resolution || i.value === rest.resolution);
            if (resItem?.cost?.startsWith("*")) {
              const multiplier = parseFloat(resItem.cost.replace("*", "")) || 1;
              mCost = mBaseCost * multiplier;
            }
          }
          return {
            model: m,
            cost: mCost
          };
        }).filter(item => userCredits >= item.cost).sort((a, b) => b.cost - a.cost);
        if (affordableModels.length > 0) {
          const chosen = affordableModels[0];
          matchedModel = chosen.model;
          calculatedCost = chosen.cost;
          console.log(`[Process] Beralih otomatis ke alternatif optimal: ${matchedModel.name} (${calculatedCost} kredit)`);
        } else {
          const absoluteCheapest = modelsList.map(m => {
            let mBaseCost = parseInt(m.cost || 0);
            let mCost = mBaseCost;
            if (isI2I && rest.resolution) {
              const resItem = m.options?.resolution?.items?.find(i => i.title === rest.resolution || i.value === rest.resolution);
              if (resItem?.cost?.startsWith("*")) {
                const multiplier = parseFloat(resItem.cost.replace("*", "")) || 1;
                mCost = mBaseCost * multiplier;
              }
            }
            return {
              model: m,
              cost: mCost
            };
          }).sort((a, b) => a.cost - b.cost)[0];
          if (absoluteCheapest) {
            matchedModel = absoluteCheapest.model;
            calculatedCost = absoluteCheapest.cost;
          }
          return this.sk({
            status: "error",
            result: null,
            token: this.vToken,
            models: modelsList,
            selectedModel: matchedModel,
            error: `Kredit tidak mencukupi bahkan untuk model alternatif termurah (${matchedModel?.name || "N/A"}). Saldo Anda: ${userCredits} kredit.`
          });
        }
      } else {
        console.log(`[Process] Menggunakan model valid: ${matchedModel.name}`);
      }
      const options = {
        prompt: prompt,
        publicVisibility: "0",
        ...isI2I ? {} : {
          aspectRatio: "1:1"
        },
        ...rest.options,
        ...rest
      };
      delete options.model;
      delete options.name;
      delete options.image;
      delete options.token;
      delete options.options;
      if (matchedModel.mapping_key) {
        for (const [key, target] of Object.entries(matchedModel.mapping_key)) {
          const userVal = options[key] || (key === "aspectRatio" ? "1:1" : "2K");
          const items = matchedModel.options?.[key]?.items || [];
          const matchedItem = items.find(i => i.title === userVal || i.value === userVal) || items[0];
          if (matchedItem) {
            options[target] = matchedItem.value;
            options[key] = matchedItem.title;
          }
        }
      }
      const endpoint = isI2I ? "/tools/image/img2image" : "/tools/image/txt2image";
      const payload = {
        name: matchedModel.name,
        options: options
      };
      const encryptedParams = this.enc(endpoint, payload);
      if (!encryptedParams) {
        return this.sk({
          status: "error",
          result: null,
          token: this.vToken,
          models: modelsList,
          selectedModel: matchedModel,
          error: "Gagal mengenkripsi parameter payload."
        });
      }
      const form = new FormData();
      if (isI2I) {
        resolvedImages.forEach((imgObj, idx) => {
          form.append("images[]", imgObj.buffer, {
            filename: `image_${idx}.jpg`,
            contentType: imgObj.mime
          });
        });
      }
      form.append("params", encryptedParams);
      console.log(`[Process] Mengirim request ke endpoint ${endpoint}...`);
      const headers = this.hd(form.getHeaders());
      const res = await this.client.post(`/api${endpoint}`, form, {
        headers: headers
      });
      const code = res?.data?.code;
      const data = res?.data?.data;
      if (code === 1 && data?.job_id) {
        console.log(`[Process] Request terkirim. Job ID: ${data.job_id}`);
        const pollRes = await this.pol(data.job_id);
        const finalOutput = {
          status: pollRes.status,
          result: pollRes.result,
          token: this.vToken,
          models: modelsList,
          selectedModel: matchedModel,
          ...pollRes.info || {}
        };
        return this.sk(finalOutput);
      } else {
        return this.sk({
          status: "error",
          result: null,
          token: this.vToken,
          models: modelsList,
          selectedModel: matchedModel,
          error: res?.data?.msg || "Respon API JoyFun tidak sesuai."
        });
      }
    } catch (err) {
      console.error("[Process] Generasi gagal:", err.message);
      return this.sk({
        status: "error",
        result: null,
        token: this.vToken || null,
        models: modelsList,
        selectedModel: matchedModel,
        error: err.message
      });
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
  const api = new JoyFun();
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