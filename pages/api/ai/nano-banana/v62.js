import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
const PUB = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const attempt = async (fn, tries = 3, ms = 2e3) => {
  let last;
  let i = 0;
  while (i < tries) {
    i++;
    try {
      return await fn();
    } catch (e) {
      last = e;
      console.warn(`[attempt] ${i}/${tries} gagal: ${e?.response?.data ? "http error" : e.message}, retry ${ms}ms...`);
      if (i < tries) await sleep(ms);
    }
  }
  throw last;
};
class NanoBanana {
  constructor() {
    this.fp = crypto.randomUUID();
    this.tv = null;
    this.ax = wrapper(axios.create({
      baseURL: "https://aifaceswap.io",
      jar: new CookieJar(),
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        origin: "https://aifaceswap.io",
        referer: "https://aifaceswap.io/nano-banana-ai/"
      }
    }));
  }
  async tv_get() {
    if (this.tv) return this.tv;
    try {
      console.log("[tv] fetch html...");
      const {
        data: html
      } = await this.ax.get("/nano-banana-ai/");
      const m1 = html.match(/src="([^"]*aifaceswap_nano_banana[^"]*\.js)"/);
      if (!m1) throw new Error("js not found");
      const jsUrl = m1[1].startsWith("http") ? m1[1] : `https://aifaceswap.io${m1[1]}`;
      console.log("[tv] fetch js:", jsUrl);
      const {
        data: js
      } = await this.ax.get(jsUrl);
      const m2 = js.match(/headers\["theme-version"\]="([^"]+)"/);
      this.tv = m2?.[1] || "EC25Co3HGfI91bGmpWR6JF0JKD+nZ/mD0OYvKNm5WUXcLfKnEE/80DQg60MXcYpM";
    } catch (e) {
      console.error("[tv] error:", e.message);
      this.tv = "EC25Co3HGfI91bGmpWR6JF0JKD+nZ/mD0OYvKNm5WUXcLfKnEE/80DQg60MXcYpM";
    }
    console.log("[tv]", this.tv);
    return this.tv;
  }
  async sig() {
    try {
      const tv = await this.tv_get();
      const key = crypto.randomBytes(8).toString("hex");
      const xg = crypto.publicEncrypt({
        key: PUB,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, Buffer.from(key)).toString("base64");
      const ci = crypto.createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(key));
      const fp1 = ci.update("aifaceswap:" + this.fp, "utf8", "base64") + ci.final("base64");
      return {
        fp: this.fp,
        fp1: fp1,
        "x-guide": xg,
        "x-code": Date.now().toString(),
        "theme-version": tv
      };
    } catch (e) {
      console.error("[sig] error:", e.message);
      throw e;
    }
  }
  async buf(image) {
    try {
      if (Buffer.isBuffer(image)) {
        console.log("[buf] dari buffer");
        return {
          buf: image,
          ext: "jpg"
        };
      }
      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          const [meta, b64] = image.split(",");
          const ext = meta.match(/\/(\w+)/)?.[1] || "jpg";
          console.log("[buf] dari base64, ext:", ext);
          return {
            buf: Buffer.from(b64, "base64"),
            ext: ext
          };
        }
        if (image.startsWith("http")) {
          console.log("[buf] download url:", image);
          const {
            data
          } = await this.ax.get(image, {
            responseType: "arraybuffer",
            baseURL: ""
          });
          const ext = image.split("?")[0].split(".").pop() || "jpg";
          return {
            buf: Buffer.from(data),
            ext: ext
          };
        }
      }
      throw new Error("image harus url/base64/buffer");
    } catch (e) {
      console.error("[buf] error:", e.message);
      throw e;
    }
  }
  async up(image) {
    try {
      console.log("[up] preparing...");
      const {
        buf,
        ext
      } = await this.buf(image);
      const fname = crypto.randomUUID().replace(/-/g, "") + "." + ext;
      const ps = await attempt(async () => {
        const sg = await this.sig();
        console.log("[up] presign:", fname);
        const {
          data
        } = await this.ax.post("/api/upload_file", {
          file_name: fname,
          type: "image",
          request_from: 1,
          origin_from: "4b06e7fa483b761a"
        }, {
          headers: {
            ...sg,
            "Content-Type": "application/json"
          }
        });
        return data;
      });
      const putUrl = ps?.data?.url;
      if (!putUrl) throw new Error("presign url kosong");
      await attempt(async () => {
        console.log("[up] put storage...");
        await this.ax.put(putUrl, buf, {
          baseURL: "",
          headers: {
            "Content-Type": `image/${ext}`,
            "x-oss-storage-class": "Standard"
          }
        });
      });
      const k = putUrl.split("?")[0].split(".aliyuncs.com/")[1];
      console.log("[up] key:", k);
      return k;
    } catch (e) {
      console.error("[up] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async mk(imgKey, prompt, rest = {}) {
    try {
      console.log("[mk] task, prompt:", prompt);
      const {
        input: ri,
        ...rr
      } = rest;
      return await attempt(async () => {
        const sg = await this.sig();
        const {
          data
        } = await this.ax.post("/api/aikit/create", {
          fn_name: "demo-nano-banana",
          call_type: 1,
          input: {
            prompt: prompt,
            scene: "standard",
            resolution: "1K",
            aspect_ratio: "auto",
            ...imgKey && {
              source_images: [imgKey]
            },
            ...ri
          },
          consume_type: 0,
          request_from: 1,
          origin_from: "4b06e7fa483b761a",
          ...rr
        }, {
          headers: {
            ...sg,
            "Content-Type": "application/json"
          }
        });
        const taskId = data?.data?.task_id;
        if (!taskId) throw new Error("task_id kosong");
        console.log("[mk] task_id:", taskId);
        return taskId;
      });
    } catch (e) {
      console.error("[mk] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async ck(taskId) {
    try {
      return await attempt(async () => {
        const sg = await this.sig();
        const {
          data
        } = await this.ax.post("/api/aikit/check_status", {
          task_id: taskId,
          fn_name: "demo-nano-banana",
          call_type: 1,
          request_from: 1,
          origin_from: "4b06e7fa483b761a"
        }, {
          headers: {
            ...sg,
            "Content-Type": "application/json"
          }
        });
        const d = data?.data;
        if (!d) throw new Error("response kosong");
        return d;
      }, 5, 3e3);
    } catch (e) {
      console.error("[ck] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      const imgKey = image ? await this.up(image) : null;
      console.log("[generate] membuat task...");
      const taskId = await this.mk(imgKey, prompt, rest);
      let result = null;
      let i = 0;
      while (i < 60) {
        i++;
        console.log(`[poll] ${i}/60, tunggu 3s...`);
        await sleep(3e3);
        result = await this.ck(taskId);
        console.log("[poll] status:", result?.status);
        if (!result || result.status !== 0 && result.status !== 1) break;
      }
      const out = {
        job_id: taskId,
        image: result?.result_image || null
      };
      console.log("[done]", out);
      return out;
    } catch (e) {
      console.error("[generate] error:", e?.response?.data || e.message);
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