import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class AifacefyClient {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.base = "https://aifacefy.com";
    this.api = "https://api2.aifacefy.com";
    this.mail = `https://${apiConfig.DOMAIN_URL}/api/mails/v22`;
    this.token = null;
    this.cfg = {
      ghiblify: {
        imageType: "ghiblify",
        prompt: "Make this ghibli anime style",
        platformType: 39,
        modelName: "4o-image"
      },
      "ai-image-generator": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "4o-image"
      },
      "action-figure": {
        imageType: "action-figure-generator",
        platformType: 39,
        modelName: "4o-image"
      },
      "pet-to-human": {
        imageType: "ai-pet-to-human",
        platformType: 39,
        modelName: "4o-image",
        prompt: "Transform the pet in this image into a human"
      },
      labubu: {
        imageType: "labubu-toy-generator",
        platformType: 39,
        modelName: "4o-image",
        prompt: "Transform the person in this image into labubu toy style"
      },
      "face-gen": {
        imageType: "ai-face-generator",
        platformType: 39,
        modelName: "4o-image",
        prompt: "A portrait of a woman or man with a street in the background"
      },
      "face-enhance": {
        imageType: "ai-face-enhancer",
        platformType: 27,
        modelName: "image-upscale-crisp",
        prompt: "image upscale scrips"
      },
      "baby-gen": {
        imageType: "ai-baby-generator",
        platformType: 23,
        modelName: "baby-mystic"
      },
      "flux-schnell": {
        imageType: "ai-image-generator",
        platformType: 5,
        modelName: "flux-schnell"
      },
      "flux-dev": {
        imageType: "ai-image-generator",
        platformType: 27,
        modelName: "flux-dev"
      },
      "flux-pro-1.1": {
        imageType: "ai-image-generator",
        platformType: 27,
        modelName: "flux-pro-1-1"
      },
      "flux-pro-ultra": {
        imageType: "ai-image-generator",
        platformType: 27,
        modelName: "flux-pro-1-1-ultra-landscape"
      },
      "flux-pro": {
        imageType: "ai-image-generator",
        platformType: 27,
        modelName: "flux-pro-1-0"
      },
      "flux-kontext-pro-text": {
        imageType: "ai-image-generator",
        platformType: 27,
        modelName: "flux-pro-kontext-pro-text-to-image"
      },
      "flux-kontext-pro-edit": {
        imageType: "flux-kontext",
        platformType: 27,
        modelName: "flux-pro-kontext-pro-editing"
      },
      "flux-kontext-pro-multi": {
        imageType: "flux-kontext",
        platformType: 27,
        modelName: "flux-pro-kontext-pro-editing-exp-multi-image"
      },
      "flux-kontext-max-text": {
        imageType: "ai-image-generator",
        platformType: 27,
        modelName: "flux-pro-kontext-max-text-to-image"
      },
      "flux-kontext-max-edit": {
        imageType: "flux-kontext",
        platformType: 27,
        modelName: "flux-pro-kontext-max-editing"
      },
      "flux-kontext-max-multi": {
        imageType: "flux-kontext",
        platformType: 27,
        modelName: "flux-pro-kontext-max-editing-exp-multi-image"
      },
      "flux-2-pro-text": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "flux-2-pro-text-to-image"
      },
      "flux-2-pro-img": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "flux-2-pro-image-to-image"
      },
      "flux-2-max-text": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "flux-2-max-text-to-image"
      },
      "flux-2-max-img": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "flux-2-max-image-to-image"
      },
      "gpt-1.5-low": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gpt-image-1-5-low"
      },
      "gpt-1.5-low-edit": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gpt-image-1-5-low-edit"
      },
      "gpt-1.5-med": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gpt-image-1-5-medium"
      },
      "gpt-1.5-med-edit": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gpt-image-1-5-medium-edit"
      },
      "gpt-1.5-high": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gpt-image-1-5-high"
      },
      "gpt-1.5-high-edit": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gpt-image-1-5-high-edit"
      },
      "nano-pro": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gemini-3-pro-image-preview"
      },
      "nano-pro-edit": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "gemini-3-pro-image-preview-edit"
      },
      "nano-ai": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "gemini-25-flash-image"
      },
      "nano-ai-edit": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "gemini-25-flash-image-edit"
      },
      "seedream-4": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "seedream-v4"
      },
      "seedream-4-edit": {
        imageType: "ai-image-generator",
        platformType: 44,
        modelName: "seedream-v4-edit"
      },
      "seedream-4.5": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "seedream-v4.5"
      },
      "seedream-4.5-edit": {
        imageType: "ai-image-generator",
        platformType: 39,
        modelName: "seedream-v4.5-edit"
      },
      "old-photo": {
        imageType: "old-photo-restore",
        platformType: 44,
        modelName: "seedream-v4-edit"
      },
      headshot: {
        imageType: "ai-headshot-generator",
        platformType: 44,
        modelName: "seedream-v4-edit"
      },
      "hair-cut": {
        imageType: "ai-hair-cut",
        platformType: 44,
        modelName: "seedream-v4-edit"
      },
      "facial-expr": {
        imageType: "change-facial-expression",
        platformType: 44,
        modelName: "seedream-v4-edit",
        prompt: "Change the facial expression of the person in the image"
      },
      "clothes-change": {
        imageType: "ai-clothes-changer",
        platformType: 27,
        modelName: "flux-pro-kontext-pro-editing"
      },
      halloween: {
        imageType: "ai-halloween-generator",
        platformType: 39,
        modelName: "4o-image"
      }
    };
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.h = {
      accept: "text/x-component",
      "accept-language": "id-ID",
      "content-type": "text/plain;charset=UTF-8",
      origin: this.base,
      referer: `${this.base}/ghibli-style/?ref=awesomeindie.com`,
      "user-agent": this.ua
    };
  }
  async makeMail() {
    console.log("[makeMail] Creating...");
    try {
      const {
        data
      } = await this.client.get(this.mail, {
        params: {
          action: "create"
        }
      });
      console.log(`[makeMail] ${data?.email || "N/A"}`);
      return data;
    } catch (e) {
      console.error("[makeMail]", e?.message || e);
      throw e;
    }
  }
  async getInbox(id) {
    console.log(`[getInbox] ${id}`);
    try {
      const {
        data
      } = await this.client.get(this.mail, {
        params: {
          action: "inbox",
          id: id
        }
      });
      console.log(`[getInbox] Count: ${data?.count || 0}`);
      return data;
    } catch (e) {
      console.error("[getInbox]", e?.message || e);
      throw e;
    }
  }
  async getMsg(region, key) {
    console.log(`[getMsg] ${region}/${key}`);
    try {
      const {
        data
      } = await this.client.get(this.mail, {
        params: {
          action: "message",
          region: region,
          key: key
        }
      });
      const otp = data?.text_content?.match(/\d{6}/)?.[0] || null;
      console.log(`[getMsg] OTP: ${otp || "Not found"}`);
      return {
        ...data,
        otp: otp
      };
    } catch (e) {
      console.error("[getMsg]", e?.message || e);
      throw e;
    }
  }
  async waitOTP(id, to = 6e4) {
    console.log(`[waitOTP] Waiting...`);
    const start = Date.now();
    while (Date.now() - start < to) {
      try {
        const inbox = await this.getInbox(id);
        if (inbox?.messages?.length > 0) {
          const msg = inbox.messages[0];
          const {
            otp
          } = await this.getMsg(msg?.storage?.region, msg?.storage?.key);
          if (otp) return otp;
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        console.error("[waitOTP]", e?.message || e);
      }
    }
    throw new Error("OTP timeout");
  }
  async reg(email) {
    console.log(`[reg] ${email}`);
    try {
      const {
        data
      } = await this.client.post(`${this.base}/ghibli-style/?ref=awesomeindie.com`, JSON.stringify([{
        email: email,
        userName: email,
        password: email
      }]), {
        headers: {
          ...this.h,
          "next-action": "424401cbe4e8b1b79045e4ac3dcf3d788c2156dd"
        }
      });
      const p = data?.split("\n")?.find(l => l.includes('"msg"'));
      console.log(`[reg] ${p || data}`);
      return JSON.parse(p?.match(/\{.*\}/)?.[0] || "{}");
    } catch (e) {
      console.error("[reg]", e?.message || e);
      throw e;
    }
  }
  async verify(email, code) {
    console.log(`[verify] ${email}/${code}`);
    try {
      const {
        data
      } = await this.client.post(`${this.base}/ghibli-style/?ref=awesomeindie.com`, JSON.stringify([{
        email: email,
        emailCode: code
      }]), {
        headers: {
          ...this.h,
          "next-action": "efbaa6169049c8cb5fd4fd1abe810d880738ab19"
        }
      });
      const p = data?.split("\n")?.find(l => l.includes('"msg"'));
      console.log(`[verify] ${p || data}`);
      return JSON.parse(p?.match(/\{.*\}/)?.[0] || "{}");
    } catch (e) {
      console.error("[verify]", e?.message || e);
      throw e;
    }
  }
  async login(email, pass) {
    console.log(`[login] ${email}`);
    try {
      const {
        data
      } = await this.client.post(`${this.base}/ghibli-style/?ref=awesomeindie.com`, JSON.stringify([{
        email: email,
        password: pass
      }]), {
        headers: {
          ...this.h,
          "next-action": "1c7778f900ce2db3f2c455a90e709ef29ae30db3"
        }
      });
      const bearer = data?.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
      if (!bearer) throw new Error("No token");
      console.log(`[login] Token: ${bearer?.slice(0, 20)}...`);
      this.token = `Bearer ${bearer}`;
      return this.token;
    } catch (e) {
      console.error("[login]", e?.message || e);
      throw e;
    }
  }
  async upload(media) {
    console.log("[upload] Uploading...");
    const ups = [];
    for (const item of Array.isArray(media) ? media : [media]) {
      try {
        let buf, mime;
        if (Buffer.isBuffer(item)) {
          buf = item;
          mime = "image/webp";
        } else if (item?.startsWith?.("http")) {
          const res = await this.client.get(item, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(res.data);
          mime = res.headers["content-type"] || "image/webp";
        } else if (item?.startsWith?.("data:")) {
          const [h, b64] = item.split(",");
          buf = Buffer.from(b64, "base64");
          mime = h?.match(/:(.*?);/)?.[1] || "image/webp";
        } else {
          buf = Buffer.from(item, "base64");
          mime = "image/webp";
        }
        const {
          data
        } = await this.client.post(`${this.api}/image/presignedUrl`, {
          site: "aifacefy.com",
          mineType: [mime]
        }, {
          headers: {
            authorization: this.token
          }
        });
        const signed = data?.rows?.[0]?.signedUrl;
        const url = data?.rows?.[0]?.url;
        if (!signed) throw new Error("No signed URL");
        await this.client.put(signed, buf, {
          headers: {
            "content-type": mime
          }
        });
        console.log(`[upload] ${url}`);
        ups.push(url);
      } catch (e) {
        console.error("[upload]", e?.message || e);
      }
    }
    return ups;
  }
  validateInput(type, prompt, image) {
    const availableTypes = Object.keys(this.cfg);
    const config = this.cfg[type];
    if (!config) {
      return {
        success: false,
        message: `Tipe "${type}" tidak ditemukan.`,
        availableTypes: availableTypes
      };
    }
    const needsImage = ["ghiblify", "pet-to-human", "labubu", "face-enhance", "old-photo", "headshot", "hair-cut", "facial-expr", "clothes-change"].includes(type) || type.includes("-edit") || type.includes("-multi") || type.includes("-img");
    if (needsImage && !image) {
      return {
        success: false,
        message: `Input Error: Tipe "${type}" wajib menyertakan gambar (image).`,
        availableTypes: availableTypes
      };
    }
    if (!prompt && !config.prompt && !needsImage) {
      return {
        success: false,
        message: `Input Error: Tipe "${type}" wajib menyertakan deskripsi (prompt).`,
        availableTypes: availableTypes
      };
    }
    return {
      success: true,
      config: config
    };
  }
  async generate({
    type,
    prompt,
    image,
    ...rest
  }) {
    console.log(`[generate] Validating...`);
    const validation = this.validateInput(type, prompt, image);
    if (!validation.success) {
      console.error(`[generate] Validation Failed: ${validation.message}`);
      return validation;
    }
    const cfg = validation.config;
    if (!this.token) await this.createAcc();
    const pay = {
      site: "aifacefy.com",
      imageType: cfg.imageType,
      prompt: prompt || cfg.prompt || "",
      outputPrompt: prompt || cfg.prompt || "",
      platformType: cfg.platformType,
      modelName: cfg.modelName,
      width: cfg.width || 1,
      height: cfg.height || 1,
      ratio: rest.ratio || "1:1",
      isPublic: 1,
      ...rest
    };
    if (image) {
      const imgs = await this.upload(image);
      pay.imageUrlList = imgs;
    }
    try {
      const {
        data: sub
      } = await this.client.post(`${this.api}/image/generator4login/async`, pay, {
        headers: {
          authorization: this.token
        }
      });
      console.log(sub);
      const key = sub?.data?.key;
      if (!key) throw new Error("No key");
      console.log(`[generate] Task: ${key}`);
      return await this.poll(key);
    } catch (e) {
      console.error("[generate]", e?.message || e);
      throw e;
    }
  }
  async poll(key, int = 3e3, max = 12e4) {
    console.log(`[poll] ${key}`);
    const start = Date.now();
    while (Date.now() - start < max) {
      try {
        const {
          data
        } = await this.client.get(`${this.api}/image/getResult/${key}`, {
          params: {
            site: "aifacefy.com"
          },
          headers: {
            authorization: this.token
          }
        });
        console.log(data);
        if (data?.data?.status === "success") {
          console.log("[poll] Done!");
          return data.data.imageResponseVo;
        }
        await new Promise(r => setTimeout(r, int));
      } catch (e) {
        console.error("[poll]", e?.message || e);
      }
    }
    throw new Error("Task timeout");
  }
  async createAcc() {
    console.log("[createAcc] Starting...");
    const mail = await this.makeMail();
    const email = mail?.email;
    await this.reg(email);
    const otp = await this.waitOTP(mail.id);
    await this.verify(email, otp);
    const auth = await this.login(email, email);
    console.log("[createAcc] Ready!", auth);
    return auth;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AifacefyClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}