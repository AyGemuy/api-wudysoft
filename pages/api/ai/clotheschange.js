import axios from "axios";
import crypto from "crypto";
class ClothesChange {
  constructor() {
    try {
      this.debug = true;
      this.api = "https://clotheschange.ai";
      this.authToken = null;
      this.autoRotate = true;
      this.bootstrapToken = "Q7mK2aX9Lp4VtF8zR1cJ6sN0DgW3H5uYbE2iA9fT7kLxP8";
      this.secretExpire = 0;
      this.subtleKey = null;
      this._modelsCache = null;
      this.rotateIdentity();
      this.rawPem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCNDgxYbbANun4
AsXaB8c12HtEPz9w7dnjGwWrWWXv5ozXc9Wxb86k0ka5I1j5hKftRcDHYGcdXGBc
PQFK1ReOsosOsoJPZkSuwYONk39O3CHaRls+Fy93+HKlEafafhGdFOeEMAoMty4m
atKi7XVuVryh1NyPBAoSwLzGTl31VNkfLlX8+pxG8LMDSH6G78HivdnhGXotGmlX
iBXZ3KzYYT6cjJpapQyF7Dzg2k+5vxJ5DOSQFGahz0X6aD2ITVBg9YhtUcv/wOWg
bdlz5vKCJhswEGu0q8jcWrKyNnt4j1dg5smzFF7RxN879w/PuByCciFDk/Th55YU
nbX3YRcjAgMBAAECggEACRX8sQwYyupmzOSC/DM+oJLLGu4jROB5QApXcWUCg2mp
GjrAUIe3cSJTY723H8loj+MiZKbqfBxXzR5KOAWQj2u5XMvWPpUSzo2diYX76qUa
7QWQpu7abjBQsM9gJ9/xFAUn2xk3nHuvgZBK4DY1jHQraXOLiXdkv0GG3iJJfBJS
I2+KgB3R9sAj8h3jTo0ezPzANwOUkZDwIxhvoaczc8rFP0FAWHcXuCFiu2Y60U3A
xObq5Wr+Oq45+zYoxlX0nDOYtwGJWtVzYLwJ8RQIjcUGh9ksZeNfoJkAdK9QF+tm
ZquA4MqDfK0g5ziBz5mgdvzCcCWXSHik6+iBPxBvjQKBgQDjMcRjGmIUAYCZ47Yb
cfCmyWLpbUg6vmTpDkl6+fF5rs0U/aQtrD/5NdaBWO6kLRJQZjqcEo2ZJJKwVj3r
Pr89H0nxAsF9XzBS45zsg4JBQ4eGzAal4YYSadiT+2th3E4AAx95lS/S0zEYEQjX
eIs8N8BWYAJjfDx2yiJnkNtvTwKBgQDa06fSUvaJlljCeqIzgrmOObCrJV2zuXKU
TrUIffgMfgo+oXfsvVvjzR5/K5wOcV36OQf8O/eEspd3QWH4TCNOuzspqFrCO4cp
pceBCzlge4/Ymaona/FOazhEVuFpL8ISqRwxPe9SaTNdt1RiN3et78fskmJfgWvx
FnVdjGmF7QKBgDSTSb0dV+EFT/tMxNGpFmWiaO9XyMU/Vh7QnZSFzqm4F+FpqNqg
59UF7nPUXrVDcN+GKL4BVR9BZWjFLGMKDDtayEOrvZcDti0YWzIoZLYxqGU7RbaR
b/NG50WngvwMfUhncJs0OPLyyIOnPYKPdLkkta/HXAYls+BRepC45u7lAoGAMOVi
doi7Nfs2Uh585+2p8LHLXDK5QVOK2sDLit468u+m8l+6IFgflENdMSVZdZC3YxYj
RqVPpYMSfT9K2OSKbyk/CwvnW8dZaGD2t0r+wyRY/Bk6AB0Kim9C32Jac9qMDwdi
mU4xj8SaCbLRVDD4uRD/J0l+WcDdkb1m9ERPv/ECgYEAx0dWw6J+XY031bEPW+WQ
jVKvM4OyxgXbeWPhCWgm+C0P2DB8uPKybPVwmf+8/uijiUkJXLJCfXWAMUaZl/1L
fWutjh1nNWQb3rKN2H7GvuOiJ6NLIcA8oUhZoJ34vcVkEeCRRbs3ZMBhGbc9Aoru
QvFQg5UJ0NMN5gLjnvqVmD0=
-----END PRIVATE KEY-----`.trim();
      this.http = axios.create({
        baseURL: this.api,
        timeout: 6e4,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: this.api,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `${this.api}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.http.interceptors.request.use(async cfg => {
        try {
          cfg.headers = cfg.headers || {};
          const id = this.cleanIdentity(this.id);
          const nowTs = Math.floor(Date.now() / 1e3);
          cfg.headers["x-identity-id"] = id;
          cfg.headers["cookie"] = `identity_id=${id}; _ga_EMMMB3VBZS=GS2.1.s${nowTs}$o1$g0$t${nowTs}$j60$l0$h0; _ga=GA1.1.${Math.floor(Math.random() * 1e9)}.${nowTs}`;
          if (this.authToken) {
            cfg.headers["authorization"] = this.authToken;
          } else {
            delete cfg.headers["authorization"];
            delete cfg.headers["Authorization"];
          }
          const path = cfg.url?.startsWith("/") ? cfg.url : `/${cfg.url}`;
          const method = (cfg.method || "GET").toUpperCase();
          if (path === "/v6.0/api/creation/app/config") {
            if (!this.signingSecret) {
              cfg.headers["x-bootstrap-token"] = this.bootstrapToken;
            }
          }
          if (path === "/v6.0/api/creation/request" && !this.authToken) {
            const bodyStr = cfg.data ? typeof cfg.data === "string" ? cfg.data : JSON.stringify(cfg.data) : "";
            cfg.data = bodyStr;
            cfg.headers["content-type"] = "application/json";
            cfg.headers["accept"] = "application/json";
            const ts = Math.floor(Date.now() / 1e3).toString();
            const sig = await this.sign(ts, method, path, bodyStr, this.signingSecret, id);
            cfg.headers["x-timestamp"] = ts;
            cfg.headers["x-signature"] = sig;
            this.log("DEBUG", `Signed [${method} ${path}] -> TS: ${ts}, Sig: ${sig}`);
          }
          return cfg;
        } catch (err) {
          this.log("ERROR", `Interceptor Request Error: ${err?.message || err}`);
          return cfg;
        }
      });
      this.http.interceptors.response.use(async res => {
        try {
          await this.parseSecret(res.headers);
          return res;
        } catch (err) {
          this.log("ERROR", `Interceptor Response Error: ${err?.message || err}`);
          return res;
        }
      });
    } catch (err) {
      this.log("ERROR", `Constructor Init Error: ${err?.message || err}`);
    }
  }
  rotateIdentity(customId = null) {
    this.id = customId || this.genVisitorId();
    this.signingSecret = null;
    this.secretExpire = 0;
    this.log("INFO", `Identity set -> ${this.id}`);
    return this.id;
  }
  log(type, msg) {
    if (!this.debug && type === "DEBUG") return;
    const time = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`[ClothesChange:${type}][${time}] ${msg}`);
  }
  genVisitorId() {
    try {
      return crypto.createHash("md5").update(`${Date.now()}_${Math.random()}`).digest("hex");
    } catch (err) {
      return "855c6ae1430e8fda8501cf99933c4790";
    }
  }
  cleanIdentity(idStr) {
    if (!idStr) return "";
    const parts = String(idStr).split(",").map(n => n.trim());
    return parts.length === 2 && parts[0] === parts[1] ? parts[0] || "" : String(idStr).trim();
  }
  async getImportedRsaKey() {
    try {
      if (this.subtleKey) return this.subtleKey;
      const cleanPem = this.rawPem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
      const binaryDer = Buffer.from(cleanPem, "base64");
      this.subtleKey = await crypto.webcrypto.subtle.importKey("pkcs8", binaryDer, {
        name: "RSA-OAEP",
        hash: "SHA-256"
      }, false, ["decrypt"]);
      return this.subtleKey;
    } catch (err) {
      this.log("ERROR", `Import RSA Key Error: ${err?.message || err}`);
      return null;
    }
  }
  async decryptRsa(encryptedBase64) {
    try {
      const key = await this.getImportedRsaKey();
      if (!key) return null;
      const cipherBytes = Buffer.from(encryptedBase64.trim(), "base64");
      const decryptedBuffer = await crypto.webcrypto.subtle.decrypt({
        name: "RSA-OAEP"
      }, key, cipherBytes);
      return new TextDecoder("utf-8").decode(decryptedBuffer);
    } catch (err) {
      this.log("ERROR", `RSA-OAEP Decrypt Error: ${err?.message || err}`);
      return null;
    }
  }
  async parseSecret(headers) {
    try {
      const nextSecret = headers?.["x-next-secret"] || headers?.["X-Next-Secret"];
      const expire = headers?.["x-secret-expire"] || headers?.["X-Secret-Expire"];
      if (!nextSecret) return;
      const decrypted = await this.decryptRsa(nextSecret);
      if (decrypted) {
        this.signingSecret = decrypted;
        this.secretExpire = expire ? parseInt(expire, 10) : 0;
        this.log("DEBUG", `Signing secret updated -> ${this.signingSecret}`);
      }
    } catch (err) {
      this.log("ERROR", `Parse Secret Error: ${err?.message || err}`);
    }
  }
  async sign(ts, method, path, bodyStr, secretKey, id) {
    try {
      if (!secretKey) return "";
      const mS = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const bodyHash = bodyStr === "" ? mS : crypto.createHash("sha256").update(bodyStr).digest("hex");
      const stringToSign = `${ts}\n${method.toUpperCase()}\n${path}\n${bodyHash}\n${id}`;
      return crypto.createHmac("sha256", secretKey).update(stringToSign).digest("hex");
    } catch (err) {
      this.log("ERROR", `HMAC Sign Error: ${err?.message || err}`);
      return "";
    }
  }
  async bootstrap() {
    try {
      this.log("DEBUG", "Menjalankan registrasi visitor session (Origin Ping & Config)...");
      try {
        await this.http.get("/cc-logo.webp", {
          responseType: "arraybuffer"
        });
      } catch (_) {}
      const res = await this.http.get("/v6.0/api/creation/app/config");
      return res?.data?.data || null;
    } catch (err) {
      this.log("ERROR", `Bootstrap Error: ${err?.message || err}`);
      return null;
    }
  }
  async getModels() {
    try {
      if (this._modelsCache) return this._modelsCache;
      const {
        data
      } = await this.http.get("/v6.0/api/creation/image/models");
      this._modelsCache = data?.data || [];
      return this._modelsCache;
    } catch (err) {
      this.log("ERROR", `Get Models Error: ${err?.message || err}`);
      return [];
    }
  }
  async getQuotaStatus(modelCode = "clothes_change_ai", isImg = true) {
    try {
      this.log("DEBUG", `Mengambil kuota (Model: ${modelCode}, has_input_images: ${isImg})...`);
      const {
        data
      } = await this.http.get("/v6.0/api/creation/quota/status", {
        params: {
          app_code: "clothes_changer",
          model_code: modelCode,
          output_count: 1,
          has_input_images: isImg ? "true" : "false"
        }
      });
      const q = data?.data;
      this.log("DEBUG", `Quota Info -> Free Available: ${q?.free_available}, Remaining: ${q?.free_remaining}/${q?.free_limit}`);
      return q;
    } catch (err) {
      this.log("ERROR", `Get Quota Status Error: ${err?.message || err}`);
      return null;
    }
  }
  async toBuf(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        const b64 = img.includes("base64,") ? img.split("base64,")[1] : img;
        return Buffer.from(b64, "base64");
      }
      return null;
    } catch (err) {
      this.log("ERROR", `Konversi buffer gagal: ${err?.message || err}`);
      return null;
    }
  }
  async upload(imgBuffer) {
    try {
      if (!imgBuffer) return null;
      this.log("DEBUG", "Meminta presigned upload URL...");
      const {
        data
      } = await this.http.get("/v6.0/api/creation/file/upload/request", {
        params: {
          count: 1,
          file_suffix: "jpg"
        }
      });
      const presignedUrl = data?.data?.[0];
      if (!presignedUrl) return null;
      this.log("DEBUG", "Mengunggah biner gambar ke Stormforce CDN...");
      await axios.put(presignedUrl, imgBuffer, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-length": imgBuffer.length.toString(),
          "content-type": "image/jpeg",
          origin: this.api,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `${this.api}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      return presignedUrl.split("?")[0];
    } catch (err) {
      this.log("ERROR", `Upload Error: ${err?.message || err}`);
      return null;
    }
  }
  async poll(creationId, maxAttempt = 60, delay = 3e3) {
    try {
      this.log("INFO", `Polling status task ID: ${creationId}`);
      for (let i = 1; i <= maxAttempt; i++) {
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
          const {
            data
          } = await this.http.get("/v6.0/api/creation/history", {
            params: {
              page_no: 1,
              page_size: 20,
              app_code: "clothes_changer"
            }
          });
          const item = data?.data?.list?.find(x => x?.creation_id === creationId);
          const subTask = item?.list?.[0];
          const status = item?.status ?? subTask?.status;
          this.log("DEBUG", `Polling #${i}/${maxAttempt} -> Status: ${status ?? "Waiting"}`);
          if (status === 2) {
            const resultUrls = (item?.list || []).map(res => res?.result_url).filter(Boolean);
            return {
              status: true,
              result: resultUrls
            };
          }
          if (status === 3 || subTask?.failure_code) {
            return {
              status: false,
              result: `Task failed: ${subTask?.failure_code || "Rejected by server"}`
            };
          }
        } catch (pollErr) {
          this.log("WARN", `Polling Warning #${i}: ${pollErr?.message || pollErr}`);
        }
      }
      return {
        status: false,
        result: `Timeout: Task tidak selesai dalam ${maxAttempt * (delay / 1e3)} detik.`
      };
    } catch (err) {
      this.log("ERROR", `Polling Error: ${err?.message || err}`);
      return {
        status: false,
        result: err?.message || "Polling execution failed."
      };
    }
  }
  async validateInput({
    model,
    mode,
    mediaCount,
    prompt,
    aspectRatio,
    resolution,
    outputCount
  }) {
    const models = await this.getModels();
    const modelMeta = models.find(m => m.code === model);
    if (!modelMeta) {
      throw new Error(`Model '${model}' tidak ditemukan. Model yang tersedia: ${models.map(m => m.code).join(", ")}`);
    }
    const cap = modelMeta.capabilities?.[mode];
    if (!cap) {
      throw new Error(`Model '${model}' tidak mendukung mode '${mode}'.`);
    }
    if (mode === "image_to_image") {
      const maxImg = cap.max_input_images ?? 5;
      if (mediaCount > maxImg) {
        throw new Error(`Model '${model}' hanya mendukung maksimal ${maxImg} gambar input.`);
      }
      if (mediaCount === 0) {
        throw new Error(`Mode '${mode}' memerlukan minimal 1 gambar input.`);
      }
    } else if (mode === "text_to_image") {
      if (!prompt || !prompt.trim()) {
        throw new Error(`Mode 'text_to_image' membutuhkan parameter 'prompt'.`);
      }
    }
    if (aspectRatio && cap.aspect_ratios?.length > 0) {
      if (!cap.aspect_ratios.includes(aspectRatio)) {
        throw new Error(`Aspect ratio '${aspectRatio}' tidak valid untuk model '${model}'. Pilihan: ${cap.aspect_ratios.join(", ")}`);
      }
    }
    if (resolution && cap.resolutions?.length > 0) {
      if (!cap.resolutions.includes(resolution)) {
        throw new Error(`Resolusi '${resolution}' tidak valid untuk model '${model}'. Pilihan: ${cap.resolutions.join(", ")}`);
      }
    }
    if (outputCount && cap.output_counts?.length > 0) {
      if (!cap.output_counts.includes(outputCount)) {
        throw new Error(`Output count '${outputCount}' tidak valid untuk model '${model}'. Pilihan: ${cap.output_counts.join(", ")}`);
      }
    }
    return {
      modelMeta: modelMeta,
      cap: cap
    };
  }
  async generate({
    prompt,
    image,
    clothes,
    clothesImage,
    model = "clothes_change_ai",
    aspectRatio,
    resolution,
    outputCount = 1,
    ...rest
  }) {
    try {
      this.log("INFO", `Memulai alur eksekusi generate (Identity: ${this.id})...`);
      const targetClothes = clothes || clothesImage;
      const hasImages = Boolean(image || targetClothes);
      const mode = hasImages ? "image_to_image" : "text_to_image";
      if (!this.signingSecret) {
        await this.bootstrap();
      }
      const quota = await this.getQuotaStatus(model, hasImages);
      if (this.autoRotate && (!quota || quota.free_remaining === 0 || !quota.free_available)) {
        this.log("WARN", "Kuota identity ini habis. Membuat identity baru (Bypass Limit)...");
        this.rotateIdentity();
        await this.bootstrap();
      }
      const mediaUrls = [];
      if (image) {
        const rawImages = Array.isArray(image) ? image : [image];
        for (const imgItem of rawImages) {
          const buffer = await this.toBuf(imgItem);
          if (!buffer) return {
            status: false,
            result: "Gagal mengonversi input gambar ke Buffer."
          };
          const uploadedUrl = await this.upload(buffer);
          if (!uploadedUrl) return {
            status: false,
            result: "Gagal mengunggah file gambar."
          };
          mediaUrls.push(uploadedUrl);
        }
      }
      if (targetClothes) {
        const rawClothes = Array.isArray(targetClothes) ? targetClothes : [targetClothes];
        for (const cItem of rawClothes) {
          const buffer = await this.toBuf(cItem);
          if (!buffer) return {
            status: false,
            result: "Gagal mengonversi input pakaian ke Buffer."
          };
          const uploadedUrl = await this.upload(buffer);
          if (!uploadedUrl) return {
            status: false,
            result: "Gagal mengunggah file pakaian."
          };
          mediaUrls.push(uploadedUrl);
        }
      }
      await this.validateInput({
        model: model,
        mode: mode,
        mediaCount: mediaUrls.length,
        prompt: prompt,
        aspectRatio: aspectRatio,
        resolution: resolution,
        outputCount: outputCount
      });
      const payload = {
        app_code: "clothes_changer",
        model_code: model,
        media_urls: mediaUrls,
        user_prompt: prompt ? String(prompt) : undefined,
        output_count: outputCount,
        token_type: "free",
        ...aspectRatio ? {
          aspect_ratio: aspectRatio
        } : {},
        ...resolution ? {
          resolution: resolution
        } : {},
        ...rest
      };
      this.log("DEBUG", `Submitting creation request -> ${JSON.stringify(payload)}`);
      let res = await this.http.post("/v6.0/api/creation/request", payload);
      let code = Number(res?.data?.code);
      if (code === 615) {
        this.log("WARN", "Signature expired (Code 615). Refreshing secret...");
        this.signingSecret = null;
        await this.bootstrap();
        res = await this.http.post("/v6.0/api/creation/request", payload);
        code = Number(res?.data?.code);
      }
      const resData = res?.data;
      if (code !== 0 || !resData?.data?.creation_id) {
        return {
          status: false,
          result: resData?.message || `Pembuatan task gagal dengan code: ${code}`
        };
      }
      this.log("INFO", `Task berhasil dibuat -> Creation ID: ${resData.data.creation_id}`);
      return await this.poll(resData.data.creation_id, 60, 3e3);
    } catch (err) {
      this.log("ERROR", `Generation failed: ${err?.message || err}`);
      return {
        status: false,
        result: err?.response?.data?.message || err?.message || "Terjadi kesalahan sistem."
      };
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
  const api = new ClothesChange();
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