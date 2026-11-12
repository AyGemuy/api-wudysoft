import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class AIImg {
  constructor() {
    this.cfg = {
      up: "https://upload.aiquickdraw.com/upload",
      api: "https://aiarticle.erweima.ai/api/v1/secondary-page/api",
      pubKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqBONBO8BQgurlvCXiGXj4NcfI+uouuSyJAlWLSktbGSLRo9uQLO0sSruwYOY5cmTN1z2bPK6OydgVTBSqNywZeHx8fqvU2P9h2vM7Ube6CbNy5aQbBYg58H8jSgiScJLTwJHRKSGljzvRnezV6P6Z59C7+oBnWdO2FRA+dSVwY39wvnerZR9ZPfublb6eQvoGMQ419+ncP2eo9n/+tVmxGOSTWqRrZi6/sh0g1vZHWqy5mG+ALJqSzY1Ssv9TrdkXOisJ9LS/lwbQCqD8PnhM7D1xPwGZw9ObfjtTAyY2fPXB2BH3TQkUbrOWQFjHIdY11u2To/K5p2lDM4FmrXX1wIDAQAB",
      ref: "https://www.ai-portraits.org/",
      origin: "https://www.ai-portraits.org",
      ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.uid = crypto.randomBytes(16).toString("hex");
    this.headers = {
      "accept-language": "id-ID",
      origin: this.cfg.origin,
      referer: this.cfg.ref,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": this.cfg.ua,
      priority: "u=1, i"
    };
    this.ax = axios.create({
      headers: this.headers,
      timeout: 6e4
    });
  }
  log(step, msg, type = "info") {
    const ts = new Date().toLocaleTimeString();
    const icon = type === "error" ? "❌" : type === "warn" ? "⚠️" : "ℹ️";
    console.log(`[${ts}][${step}] ${icon} ${msg}`);
  }
  encrypt(data) {
    try {
      const pemKey = `-----BEGIN PUBLIC KEY-----\n${this.cfg.pubKey}\n-----END PUBLIC KEY-----`;
      return crypto.publicEncrypt({
        key: pemKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256"
      }, Buffer.from(data)).toString("base64");
    } catch (err) {
      throw new Error(`Encryption Failed: ${err.message}`);
    }
  }
  async solveImg(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string" && img.startsWith("http")) {
        const res = await axios.get(img, {
          responseType: "arraybuffer",
          timeout: 15e3
        });
        return Buffer.from(res.data);
      }
      if (typeof img === "string" && img.includes("base64,")) {
        return Buffer.from(img.split("base64,")[1], "base64");
      }
      return Buffer.from(img, "base64");
    } catch (err) {
      throw new Error(`Image Solve Failed: ${err.message}`);
    }
  }
  async upImg(img) {
    try {
      const buf = await this.solveImg(img);
      const fname = `${Date.now()}.jpg`;
      const path = "tools/file/userImage";
      const authData = JSON.stringify({
        timestamp: Date.now(),
        path: path,
        fileName: fname
      });
      const authToken = this.encrypt(authData);
      const fd = new FormData();
      fd.append("file", buf, {
        filename: fname,
        contentType: "image/jpeg"
      });
      fd.append("path", path);
      this.log("Upload", `Uploading ${fname}...`);
      const {
        data
      } = await this.ax.post(this.cfg.up, fd, {
        headers: {
          ...fd.getHeaders(),
          accept: "*/*",
          authorization: `Encrypted ${authToken}`
        }
      });
      if (!data.success) throw new Error(data.error || "Upload rejected");
      return data.data.url;
    } catch (err) {
      this.log("Upload", err.message, "error");
      throw err;
    }
  }
  async poll(recordId) {
    this.log("Polling", `Checking task ${recordId}...`);
    const maxRetries = 120;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await this.ax.get(`${this.cfg.api}/${recordId}`, {
          headers: {
            uniqueid: this.uid,
            accept: "application/json, text/plain, */*"
          }
        });
        if (data.code !== 200) continue;
        const {
          state,
          progress,
          completeData,
          failMsg
        } = data.data;
        this.log("Status", `Progress: ${(progress * 100).toFixed(0)}% | State: ${state}`);
        if (state === "success") {
          const parsed = JSON.parse(completeData);
          const urls = parsed.data?.result_urls;
          if (Array.isArray(urls) && urls.length > 0) {
            this.log("Success", `Found ${urls.length} result(s)`);
            return urls;
          }
          throw new Error("Success state but result_urls is empty");
        }
        if (state === "fail" || state === "failed") {
          throw new Error(failMsg || "Task failed on AI server");
        }
      } catch (err) {
        if (err.message.includes("server")) throw err;
        this.log("Polling", `Retry ${i + 1}/${maxRetries}: ${err.message}`, "warn");
      }
    }
    throw new Error("Polling timeout");
  }
  async chat({
    prompt,
    image,
    ...opt
  }) {
    try {
      this.log("Init", `Starting Request | UID: ${this.uid}`);
      if (!prompt) throw new Error("Prompt is required");
      let imgUrls = [];
      if (image) {
        const imageList = Array.isArray(image) ? image : [image];
        for (const [index, img] of imageList.entries()) {
          const url = await this.upImg(img);
          imgUrls.push(url);
        }
      }
      const payload = {
        prompt: prompt,
        channel: opt.channel || "SORA",
        id: opt.id || 2260,
        type: opt.type || "features",
        source: opt.source || "ai-portraits.org",
        negativePrompt: opt.negativePrompt || "",
        size: opt.size || "2:3",
        watermarkFlag: opt.watermarkFlag || false,
        privateFlag: opt.privateFlag || false,
        isTemp: opt.isTemp !== undefined ? opt.isTemp : true,
        batchSize: opt.batchSize || 1,
        imgUrls: imgUrls
      };
      const {
        data
      } = await this.ax.post(`${this.cfg.api}/create`, payload, {
        headers: {
          "content-type": "application/json",
          uniqueid: this.uid,
          verify: ";"
        }
      });
      if (data.code !== 200) throw new Error(`API Error: ${data.msg}`);
      const recordId = data.data?.recordId;
      const result = await this.poll(recordId);
      return {
        success: true,
        recordId: recordId,
        result: result,
        total: result.length
      };
    } catch (err) {
      this.log("Fatal", err.message, "error");
      return {
        success: false,
        error: err.message
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
  const api = new AIImg();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}