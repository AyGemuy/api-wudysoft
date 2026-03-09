import axios from "axios";
import FormData from "form-data";
import qs from "qs";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class NanoBanana {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.base = "https://nanobananaproai.io/api";
    this.fp = this.genFp();
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  genFp() {
    return crypto.randomBytes(16).toString("hex");
  }
  async proc(url, data, type = "json") {
    try {
      console.log(`[REQ] ${type.toUpperCase()}: ${url}`);
      const res = await this.client({
        method: "post",
        url: url,
        data: data,
        headers: this.hdr(type)
      });
      console.log(`[RES] Code: ${res?.data?.code || "N/A"}`);
      return res?.data || res;
    } catch (e) {
      console.error(`[ERR] ${e?.message || e}`);
      throw e;
    }
  }
  async poll(url) {
    try {
      console.log(`[POLL] ${url}`);
      const res = await this.client({
        method: "get",
        url: url,
        headers: this.hdr("get")
      });
      console.log(`[RES] Status: ${res?.data?.data?.task?.status || "N/A"}`);
      return res?.data || res;
    } catch (e) {
      console.error(`[ERR] Poll: ${e?.message || e}`);
      throw e;
    }
  }
  hdr(type = "json") {
    const h = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://nanobananaproai.io",
      referer: "https://nanobananaproai.io/",
      "user-agent": this.ua,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      pragma: "no-cache",
      priority: "u=1, i"
    };
    if (type === "json") {
      h["content-type"] = "application/json";
      h["x-fingerprint-id"] = this.fp;
    } else if (type === "form") {
      h["content-type"] = "multipart/form-data";
    }
    return h;
  }
  async resolveImg(img) {
    try {
      console.log(`[IMG] Resolving...`);
      if (Buffer.isBuffer(img)) {
        console.log(`[IMG] Buffer detected`);
        return img;
      }
      if (img?.startsWith?.("http")) {
        console.log(`[IMG] Downloading: ${img}`);
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        console.log(`[IMG] Downloaded: ${data?.length || 0} bytes`);
        return Buffer.from(data);
      }
      if (img?.startsWith?.("data:")) {
        console.log(`[IMG] Base64 detected`);
        return Buffer.from(img.split(",")[1] || img, "base64");
      }
      throw Error("Unsupported image format");
    } catch (e) {
      console.error(`[ERR] Resolve image: ${e?.message || e}`);
      throw e;
    }
  }
  async wait(ms) {
    console.log(`[WAIT] ${ms}ms`);
    return new Promise(r => setTimeout(r, ms));
  }
  async generate({
    prompt = "Add hr",
    image,
    aspectRatio = "1x1",
    imageCount = 4,
    ...rest
  }) {
    try {
      console.log(`[START] Generate process`);
      const isMulti = Array.isArray(image);
      const imgs = isMulti ? image : image ? [image] : [];
      const hasImg = imgs?.length > 0;
      console.log(`[MODE] ${hasImg ? "Image-to-Image" : "Text-to-Image"}`);
      console.log(`[IMG] Total images: ${imgs?.length || 0}`);
      let init, ep, tid;
      if (hasImg) {
        ep = "gen-ghibli-image-4o";
        const form = new FormData();
        for (const [idx, img] of imgs.entries()) {
          try {
            console.log(`[IMG] Processing ${idx + 1}/${imgs.length}`);
            const buf = await this.resolveImg(img);
            form.append("image", buf, {
              filename: `uploaded-image-${idx}.jpg`,
              contentType: "image/jpeg"
            });
            console.log(`[IMG] Added to form: ${idx + 1}`);
          } catch (e) {
            console.error(`[ERR] Image ${idx + 1}: ${e?.message || e}`);
            throw e;
          }
        }
        form.append("prompt", prompt);
        form.append("aspectRatio", aspectRatio);
        form.append("fingerprintId", this.fp);
        form.append("imageCount", String(imageCount));
        init = await this.proc(`${this.base}/${ep}`, form, "form");
      } else {
        ep = "gen-text-to-image";
        const payload = {
          prompt: prompt,
          aspectRatio: aspectRatio,
          imageCount: imageCount,
          fingerprintId: this.fp
        };
        init = await this.proc(`${this.base}/${ep}`, JSON.stringify(payload), "json");
      }
      tid = init?.data?.taskId;
      if (!tid) {
        console.error(`[ERR] No taskId in response`);
        throw Error("No taskId");
      }
      console.log(`[TASK] ID: ${tid}`);
      for (let i = 0; i < 60; i++) {
        try {
          await this.wait(3e3);
          const pollUrl = `${this.base}/${ep}?${qs.stringify({
taskId: tid,
fingerprintId: this.fp
})}`;
          const res = await this.poll(pollUrl);
          const status = res?.data?.task?.status;
          console.log(`[POLL] ${i + 1}/60 - Status: ${status || "unknown"}`);
          if (status === "completed") {
            console.log(`[SUCCESS] Task completed`);
            const {
              result,
              ...info
            } = res?.data?.task || {};
            return {
              result: result?.url || result,
              ...info
            };
          }
          if (status === "failed") {
            console.error(`[ERR] Task failed`);
            throw Error("Task failed");
          }
        } catch (e) {
          if (e?.message === "Task failed") throw e;
          console.error(`[WARN] Poll ${i + 1} error: ${e?.message || e}`);
          if (i >= 59) throw e;
        }
      }
      console.error(`[ERR] Timeout after 60 attempts`);
      throw Error("Timeout");
    } catch (e) {
      console.error(`[ERR] Generate: ${e?.message || e}`);
      throw e;
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
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}