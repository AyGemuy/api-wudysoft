import axios from "axios";
import crypto from "crypto";
import OSS from "ali-oss";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class VidMageClient {
  constructor() {
    this.auth = this._genAuth("200000h5");
    if (!this.auth) {
      throw new Error("Authorization token harus disediakan.");
    }
    this.baseUrl = "https://vidmage.ai/api/internal/cloud-make";
    this.ossCredsUrl = "https://api-usa.vidmage.ai/api/rest/oss/base/upload";
    this.taskResultUrl = "https://vidmage.ai/api/face-swap/task-result";
    this.parseUrl = `${this.baseUrl}/parse-result`;
    const pollInterval = 3e3;
    const maxPollDuration = 6e4;
    const maxAttempts = Math.ceil(maxPollDuration / pollInterval);
    this.config = {
      productId: 318,
      appKey: "200000h5",
      language: "en_US",
      regionCode: "US",
      device: "Ax00001",
      log: console.log,
      pollInterval: pollInterval,
      maxAttempts: maxAttempts,
      mimicHeaders: {
        Origin: "https://vidmage.ai",
        Referer: "https://vidmage.ai/id/image-upscaler",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "Sec-Fetch-Site": "same-origin",
        "Accept-Language": "id-ID",
        Accept: "*/*"
      }
    };
    this.config.log(`INFO: Token Otorisasi: ${this.auth} (Otomatis dibuat/Disediakan)`);
  }
  _genAuth(key) {
    const timestamp = Date.now();
    const dataToHash = `${timestamp}${key}`.toLowerCase();
    const hash = crypto.createHash("md5").update(dataToHash).digest("hex");
    return hash;
  }
  async req(url, data, method = "post", config = {}) {
    let headers = {};
    if (url.startsWith(this.baseUrl) || url.startsWith(this.taskResultUrl)) {
      headers = {
        ...this.config.mimicHeaders
      };
    }
    if (url.startsWith(this.ossCredsUrl)) {
      headers = {
        Authorization: this.auth,
        "content-type": "application/json",
        accept: "application/json"
      };
    }
    headers = {
      ...headers,
      ...config.headers
    };
    const fullConfig = {
      url: url,
      method: method,
      data: data,
      headers: headers,
      ...config
    };
    this.config.log(`--> Kirim permintaan [${method.toUpperCase()}] ke: ${url}`);
    this.config.log(`    Payload: ${data ? JSON.stringify(data)?.substring(0, 100) + "..." : "N/A"}`);
    try {
      const response = await axios(fullConfig);
      const resData = response.data;
      if (resData.success === false || resData.code && resData.code !== 200) {
        throw new Error(`API Error (${resData.code || "UNKNOWN"}): ${resData.message || "Gagal tanpa pesan."}`);
      }
      this.config.log(`<-- Berhasil menerima respon: ${resData.message || "OK"}`);
      return resData;
    } catch (error) {
      this.config.log(`<-- GAGAL pada permintaan ke ${url}`);
      const apiMessage = error.response?.data?.message || error.message;
      throw new Error(`Permintaan gagal: ${apiMessage}`);
    }
  }
  async prep(media) {
    this.config.log("Proses: Mempersiapkan data media.");
    let buffer, contentType, ext = ".jpg",
      isVideo = false;
    try {
      if (Buffer.isBuffer(media)) {
        buffer = media;
        contentType = "image/jpeg";
      } else if (typeof media === "string") {
        if (media.startsWith("data:")) {
          const parts = media.split(",");
          contentType = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
          buffer = Buffer.from(parts.pop(), "base64");
        } else if (media.startsWith("http")) {
          this.config.log("Proses: Media adalah URL, mengunduh konten...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          contentType = res.headers["content-type"] || "image/jpeg";
        } else {
          throw new Error("Input media harus berupa Buffer, string Base64, atau URL (http/https).");
        }
      } else {
        throw new Error("Input media harus berupa Buffer, string Base64, atau URL (http/https).");
      }
      if (contentType.includes("video")) {
        isVideo = true;
        ext = ".mp4";
      } else if (contentType.includes("image")) {
        isVideo = false;
        ext = ".jpg";
      }
      if (typeof media === "string" && media.startsWith("http")) {
        const urlPath = new URL(media).pathname;
        const urlParts = urlPath.split(".");
        const urlExt = "." + (urlParts.pop() || (isVideo ? "mp4" : "jpg"));
        if (!isVideo && (urlExt.includes("mp4") || urlExt.includes("mov") || urlExt.includes("avi"))) {
          isVideo = true;
        }
        ext = urlExt;
      }
      const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
      this.config.log(`Proses: Media berhasil dimuat. File: ${filename}, Tipe: ${contentType}, isVideo: ${isVideo}`);
      return {
        buffer: buffer,
        filename: filename,
        contentType: contentType,
        isVideo: isVideo
      };
    } catch (err) {
      this.config.log(`GAGAL mempersiapkan media: ${err.message}`);
      throw err;
    }
  }
  async upl(mediaData) {
    const {
      buffer,
      filename,
      contentType
    } = mediaData;
    this.config.log("Proses: Mendapatkan kredensial OSS.");
    const ossPayload = {
      productId: this.config.productId,
      appKey: this.config.appKey,
      content: {
        fileName: filename,
        dirSceneType: 20
      },
      device: this.config.device,
      language: this.config.language,
      regionCode: this.config.regionCode
    };
    const ossRes = await this.req(this.ossCredsUrl, ossPayload);
    const ossData = ossRes.data;
    this.config.log("Proses: Mengunggah file ke OSS menggunakan ali-oss.");
    try {
      const ossClient = new OSS({
        accessKeyId: ossData.accessKey,
        accessKeySecret: ossData.accessSecret,
        stsToken: ossData.securityToken,
        bucket: ossData.bucket,
        region: ossData.region,
        endpoint: ossData.uploadHost.replace("http://", "https://")
      });
      await ossClient.put(ossData.filePath, buffer, {
        headers: {
          "Content-Type": contentType
        }
      });
      this.config.log("Proses: Upload OSS berhasil.");
      return ossData.accessUrl;
    } catch (error) {
      this.config.log(`GAGAL mengunggah ke OSS: ${error.message}`);
      throw new Error(`Upload OSS gagal: ${error.message} - ${error.name || ""}`);
    }
  }
  async cnvUrl(privateURL) {
    this.config.log("Proses: Mengonversi URL privat ke URL publik bertanda tangan.");
    const url = `${this.baseUrl}/convert-url`;
    const res = await this.req(url, {
      privateURL: privateURL
    });
    const publicURL = res.publicURL || res.data?.publicURL;
    if (!publicURL) {
      throw new Error("Gagal mendapatkan URL publik.");
    }
    this.config.log("Proses: Konversi URL berhasil.");
    return publicURL;
  }
  async conv({
    mediaUrl,
    isVideo,
    scale,
    ...rest
  }) {
    this.config.log(`Proses: Memulai tugas upscaling (${isVideo ? "Video" : "Gambar"}).`);
    const endpoint = isVideo ? "video-upscale" : "image-upscale";
    const dataKey = isVideo ? "videoURL" : "imageURL";
    const type = isVideo ? "video" : "image";
    const url = `${this.baseUrl}/${endpoint}`;
    const payload = {
      [dataKey]: mediaUrl,
      scale: scale || 2,
      priority: 0,
      language: this.config.language,
      regionCode: this.config.regionCode,
      ...rest
    };
    if (isVideo) {
      const duration = rest.duration || 15e3;
      this.config.log(`Proses: Memotong video menjadi ${duration}ms (video-cut).`);
      const cutUrl = `${this.baseUrl}/video-cut`;
      const cutPayload = {
        fileURL: mediaUrl,
        duration: duration,
        priority: 0,
        language: this.config.language,
        regionCode: this.config.regionCode
      };
      const cutRes = await this.req(cutUrl, cutPayload);
      const cutBusinessId = cutRes.businessId;
      const cutResult = await this.poll(cutBusinessId, "videoCut");
      const parsedCutResult = await this.parse(cutResult, "videoCut");
      payload.videoURL = parsedCutResult;
      this.config.log("Proses: Melanjutkan ke video-upscale dengan video yang sudah dipotong.");
    }
    const res = await this.req(url, payload);
    const businessId = res.businessId;
    if (!businessId) {
      throw new Error("Gagal mendapatkan businessId untuk memulai tugas.");
    }
    this.config.log(`Proses: Tugas berhasil dimulai dengan Business ID: ${businessId}`);
    return {
      businessId: businessId,
      type: type + "Upscale"
    };
  }
  async poll(businessId, type) {
    this.config.log(`Proses: Memulai polling tugas (${type})...`);
    const data = {
      businessId: businessId,
      lastQuery: false,
      language: this.config.language,
      regionCode: this.config.regionCode
    };
    let result = null;
    let attempt = 0;
    const maxAttempts = this.config.maxAttempts;
    while (!result && attempt < maxAttempts) {
      attempt++;
      await sleep(this.config.pollInterval);
      this.config.log(`Proses: Polling percobaan ke-${attempt} dari ${maxAttempts}...`);
      try {
        const res = await this.req(this.taskResultUrl, data);
        if (res.data?.fileUrl || res.data?.taskId) {
          result = res;
          this.config.log("Proses: Tugas Selesai.");
          break;
        }
      } catch (err) {
        this.config.log(`Peringatan Polling: ${err.message}. Mencoba lagi...`);
      }
    }
    if (!result) {
      throw new Error(`Polling batas waktu tercapai setelah ${this.config.maxAttempts} percobaan (${this.config.maxAttempts * this.config.pollInterval / 1e3} detik). Tugas tidak selesai.`);
    }
    return result;
  }
  async parse(taskResult, type) {
    this.config.log("Proses: Mengurai hasil tugas...");
    const parseType = type === "imageUpscale" || type === "videoUpscale" ? "swapFace" : "videoCut";
    const data = {
      type: parseType,
      result: taskResult,
      language: this.config.language,
      regionCode: this.config.regionCode
    };
    const res = await this.req(this.parseUrl, data);
    const finalUrl = res.data;
    if (!finalUrl) {
      throw new Error("Gagal mendapatkan URL hasil akhir.");
    }
    this.config.log(`Proses: URL Hasil Akhir: ${finalUrl.substring(0, 80)}...`);
    return finalUrl;
  }
  async dl(url) {
    this.config.log("Proses: Mengunduh file hasil akhir...");
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"] || "application/octet-stream";
      this.config.log(`Proses: Download berhasil. Content-Type: ${contentType}`);
      return {
        buffer: Buffer.from(res.data),
        contentType: contentType
      };
    } catch (error) {
      this.config.log(`GAGAL mengunduh file hasil akhir: ${error.message}`);
      const apiMessage = error.response?.status ? `HTTP Error ${error.response.status}` : error.message;
      throw new Error(`Download file gagal: ${apiMessage}`);
    }
  }
  async generate({
    imageUrl: image,
    scale = 2,
    ...rest
  }) {
    try {
      this.config.log("========== Memulai Proses Upscale ==========");
      const mediaData = await this.prep(image);
      const {
        isVideo
      } = mediaData;
      const privateUrl = await this.upl(mediaData);
      const publicUrl = await this.cnvUrl(privateUrl);
      const {
        businessId,
        type
      } = await this.conv({
        mediaUrl: publicUrl,
        isVideo: isVideo,
        scale: scale,
        ...rest
      });
      const taskResult = await this.poll(businessId, type);
      const finalUrl = await this.parse(taskResult, type);
      const finalResult = await this.dl(finalUrl);
      this.config.log("========== Proses Upscale Selesai ==========");
      return finalResult;
    } catch (error) {
      this.config.log(`!!!!!!!! Proses Gagal Total: ${error.message} !!!!!!!!`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new VidMageClient();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}