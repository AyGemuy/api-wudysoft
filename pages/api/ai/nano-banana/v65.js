import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class NanoBanana {
  constructor() {
    this.baseUrl = "https://lipsync.video";
    this.uid = crypto.randomBytes(16).toString("hex");
    this.token = "";
    this.cookies = "";
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.baseUrl,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseUrl}/ai-image-editor`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "user-id": this.uid,
        ...SpoofHead()
      }
    });
  }
  h(d) {
    return crypto.createHash("md5").update(d).digest("hex");
  }
  rid(jt, et, ts) {
    const payload = JSON.stringify({
      job_type: jt || "",
      estimated_time: et === 0 ? "0" : et || 0
    });
    const l = this.h(payload);
    const u = this.h(ts.toString()).slice(0, 16);
    return l + u;
  }
  setCookie(headers) {
    const sc = headers["set-cookie"];
    if (sc) this.cookies = sc.map(c => c.split(";")[0]).join("; ");
  }
  async clm() {
    try {
      console.log(`[Process] Handshake session untuk UID: ${this.uid}`);
      const r1 = await this.api.get("/", {
        headers: {
          accept: "text/html"
        }
      });
      this.setCookie(r1.headers);
      console.log(`[Process] Claiming daily bonus...`);
      const r2 = await this.api.get("/api/credit", {
        headers: {
          "user-login-days": "1",
          cookie: this.cookies
        }
      });
      this.setCookie(r2.headers);
      return r2.data;
    } catch (e) {
      console.error(`[Error] Claim failed: ${e.message}`);
    }
  }
  async ensure() {
    try {
      const {
        data: res
      } = await this.api.get("/api/credit", {
        headers: {
          "user-login-days": "0",
          cookie: this.cookies
        }
      });
      const balance = res?.data?.credit ?? 0;
      console.log(`[Log] Saldo: ${balance} credits.`);
      if (balance < 1) {
        await this.clm();
        await new Promise(r => setTimeout(r, 3e3));
      }
    } catch (e) {
      await this.clm();
    }
  }
  async solv(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          const r = await axios.get(img, {
            responseType: "arraybuffer",
            headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: new URL(img).origin
        }
          });
          return Buffer.from(r.data);
        }
        if (img.startsWith("data:")) return Buffer.from(img.split(",")[1], "base64");
      }
      return img;
    } catch (e) {
      return null;
    }
  }
  async up(buf) {
    try {
      const name = `file_${this.h(Date.now().toString()).slice(0, 8)}.jpeg`;
      const ts = Math.floor(Date.now() / 1e3).toString();
      const uploadPayload = JSON.stringify({
        file: name,
        type: "upload"
      });
      const uploadRid = this.h(uploadPayload) + this.h(ts).slice(0, 16);
      console.log(`[Process] Requesting OSS Slot for ${name}`);
      const {
        data: res
      } = await this.api.post("/api/v2/upload", {
        file: name
      }, {
        headers: {
          "request-time": ts,
          "request-create-id": uploadRid,
          cookie: this.cookies
        }
      });
      const putUrl = res?.data?.upload;
      console.log(`[Process] PUT binary to Aliyun OSS...`);
      await axios.put(putUrl, buf, {
        headers: {
          "Content-Type": "",
          Accept: "*/*"
        }
      });
      const datePath = putUrl.split("upload/")[1]?.split("/")[0] || "2026_03_24";
      return `https://ap-cdn.rockhr.ai/lipsync/cdn/upload/${datePath}/${res.data.file_name}`;
    } catch (e) {
      throw new Error(`Upload Gagal: ${e.message}`);
    }
  }
  async p(id, type) {
    console.log(`[Process] Polling Job ID: ${id}`);
    while (true) {
      try {
        const {
          data: res
        } = await this.api.post("/api/workflow/query", {
          jobs: [{
            id: id,
            type: type
          }]
        }, {
          headers: {
            cookie: this.cookies
          }
        });
        const job = res?.data?.jobs?.[0];
        const status = job?.status?.toLowerCase();
        if (status === "succeeded") return job;
        if (status === "failed") throw new Error("AI Server Fail");
        console.log(`[Info] Status: ${status || "queuing"}...`);
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        throw e;
      }
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      await this.ensure();
      const jobType = rest?.job_type || (image ? "aiImageEditorTemplate" : "aiCharacterTemplate");
      const estTime = rest?.estimated_time || (image ? 9 : 7);
      let refImages = [];
      if (image) {
        console.log(`[Mode] I2I: Memproses gambar referensi...`);
        const list = Array.isArray(image) ? image : [image];
        for (const item of list) {
          const buf = await this.solv(item);
          if (buf) refImages.push(await this.up(buf));
        }
      }
      const ts = Date.now();
      const payload = {
        model: rest?.model || "nano_banana",
        prompt: prompt || "High quality masterpiece",
        style: rest?.style || "Default",
        reference_image: refImages,
        aspect_ratio: rest?.aspect_ratio || "auto",
        job_type: jobType,
        resolution: rest?.resolution || "",
        estimated_time: estTime
      };
      const jobRid = this.rid(jobType, estTime, ts);
      console.log(`[Process] Submitting job...`);
      const {
        data: jobRes
      } = await this.api.post("/api/v2/image/job", payload, {
        headers: {
          "request-time": ts.toString(),
          "request-create-id": jobRid,
          cookie: this.cookies,
          ...this.token && {
            authorization: `Bearer ${this.token}`
          }
        }
      });
      if (jobRes.code !== 1e4) throw new Error(jobRes.message || "Rejected");
      return await this.p(jobRes.data.job_id, jobType);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      console.error(`[Fatal] Error: ${msg}`);
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