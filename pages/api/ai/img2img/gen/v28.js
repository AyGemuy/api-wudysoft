import axios from "axios";
import crypto from "crypto";
const log = (t, ...a) => console.log(`[debug][${t}]`, ...a);
class FaceClient {
  constructor() {
    this.BASE = "https://api.videofaceswap.io/api";
    this.APP_ID = "ai_videofaceswap";
    this.SECRET = "NHGNy5YFz7HeFb";
    this.PUB_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
    this.uid = this._getUid();
    this.client = axios.create({
      baseURL: this.BASE,
      timeout: 6e4,
      headers: {
        accept: "application/json",
        origin: "https://videofaceswap.io",
        referer: "https://videofaceswap.io/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        verify: "fa77acd6e45a910160c13972cf4cfe88"
      }
    });
  }
  _randStr(n) {
    return crypto.randomBytes(n).toString("hex").slice(0, n);
  }
  _aesEnc(text, keyStr) {
    const key = Buffer.from(keyStr, "utf8");
    const iv = Buffer.from(keyStr, "utf8");
    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  }
  _rsaEnc(plaintext) {
    return crypto.publicEncrypt({
      key: this.PUB_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(plaintext)).toString("base64");
  }
  _mkSign() {
    const t = Math.floor(Date.now() / 1e3);
    const nonce = crypto.randomUUID();
    const randKey = this._randStr(16);
    const secretKey = this._rsaEnc(randKey);
    const msg = `${this.APP_ID}:${this.SECRET}:${t}:${nonce}:${secretKey}`;
    const sign = this._aesEnc(msg, randKey);
    return {
      app_id: this.APP_ID,
      t: t,
      nonce: nonce,
      sign: sign,
      secret_key: secretKey
    };
  }
  _getUid() {
    return crypto.createHash("sha256").update(crypto.randomBytes(16).toString("hex") + Date.now()).digest("hex");
  }
  async _toBuf(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          log("img", "fetch url...");
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
        return Buffer.from(img.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("Invalid format");
    } catch (e) {
      throw new Error(`toBuf: ${e.message}`);
    }
  }
  _mime(buf) {
    const s = buf.slice(0, 4).toString("hex");
    if (s.startsWith("ffd8")) return "image/jpeg";
    if (s.startsWith("89504e47")) return "image/png";
    if (s.startsWith("52494646")) return "image/webp";
    return "image/png";
  }
  async upload(buf, mime) {
    try {
      log("up", "hashing...");
      const hash = crypto.createHash("sha256").update(buf).digest("hex");
      const sp = this._mkSign();
      log("up", "get sign url");
      const r = await this.client.post(`/face/v2/upload-sign?${new URLSearchParams(sp)}`, {
        filename: `up_${Date.now()}.${mime.split("/")[1]}`,
        hash: hash
      });
      console.log("[debug] Respon Upload Sign:", r.data);
      if (r.data?.code !== 200) throw new Error(r.data?.msg);
      const {
        url
      } = r.data.data;
      await axios.put(url, buf, {
        headers: {
          "content-type": mime
        },
        timeout: 12e4
      });
      const cdn = url.split("?")[0].replace("mrpa-chatpdf.oss-us-west-1.aliyuncs.com", "cdn.videofaceswap.io");
      log("up", "done", cdn);
      return cdn;
    } catch (e) {
      throw e;
    }
  }
  async gen(opt) {
    try {
      log("gen", "start");
      let imgUrl = opt.image;
      if (typeof imgUrl !== "string" || !imgUrl.startsWith("http")) {
        const b = await this._toBuf(opt.image);
        imgUrl = await this.upload(b, this._mime(b));
      }
      const sp = this._mkSign();
      const body = {
        image: imgUrl,
        prompt: opt.prompt,
        output_format: opt.format || "jpg",
        user_id: this.uid
      };
      const r = await this.client.post(`/imgtoimg/v5/free/task?${new URLSearchParams(sp)}`, body);
      console.log("[debug] Respon Task:", r.data);
      if (r.data?.code !== 200) throw new Error(r.data?.msg);
      return await this.poll(r.data.data.job_id);
    } catch (e) {
      log("error", e.message);
      return {
        status: "error",
        message: e.message
      };
    }
  }
  async poll(id, tries = 60) {
    log("poll", "id", id);
    for (let i = 0; i < tries; i++) {
      try {
        const sp = this._mkSign();
        const r = await this.client.get(`/imgtoimg/v5/free/task?user_id=${this.uid}&job_id=${id}&${new URLSearchParams(sp)}`);
        console.log(`[debug] Poll ${i + 1}:`, r.data);
        if (r.data?.code === 200 && r.data?.data?.generate_url) {
          return {
            status: "success",
            url: r.data.data.generate_url,
            job_id: id
          };
        }
      } catch (e) {
        log("poll_err", e.message);
      }
      await new Promise(res => setTimeout(res, 3e3));
    }
    return {
      status: "timeout",
      job_id: id
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new FaceClient();
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