import axios from "axios";
import https from "https";
import qs from "qs";
const HOSTS = ["https://wise-worlds-find.loca.lt/v2/upscale", "https://evil-jars-fail.loca.lt/v2/upscale", "https://smooth-beds-pay.loca.lt/v2/upscale"];
const HEADERS = {
  "User-Agent": "okhttp/4.8.0",
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json",
  "bypass-tunnel-reminder": "your-custom-value"
};
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 6e3,
  maxSockets: 30,
  rejectUnauthorized: false
});
const client = axios.create({
  headers: HEADERS,
  httpsAgent: agent,
  timeout: 6e4,
  paramsSerializer: p => qs.stringify(p, {
    arrayFormat: "brackets"
  })
});
class Upscaler {
  constructor(hosts = HOSTS) {
    this.hosts = hosts;
  }
  async fetchUrl(url) {
    try {
      console.log(`[fetchUrl] → ${url}`);
      const res = await client.get(url, {
        responseType: "arraybuffer"
      });
      const b64 = Buffer.from(res?.data).toString("base64");
      console.log(`[fetchUrl] ok | bytes: ${res?.data?.byteLength ?? 0}`);
      return b64;
    } catch (err) {
      console.error(`[fetchUrl] error: ${err?.message}`);
      throw new Error(`[fetchUrl] failed → ${err?.message}`);
    }
  }
  async toB64(image) {
    try {
      console.log("[toB64] resolving image...");
      if (Buffer.isBuffer(image)) {
        console.log("[toB64] buffer → base64");
        return image.toString("base64");
      }
      if (/^https?:\/\//.test(image)) {
        console.log("[toB64] url → fetch");
        return await this.fetchUrl(image);
      }
      console.log("[toB64] raw base64");
      return image;
    } catch (err) {
      console.error(`[toB64] error: ${err?.message}`);
      throw new Error(`[toB64] failed → ${err?.message}`);
    }
  }
  async post(url, data) {
    try {
      console.log(`[post] → ${url}`);
      const res = await client.request({
        method: "POST",
        url: url,
        data: data
      });
      console.log(`[post] status: ${res?.status} | host: ${url}`);
      return res;
    } catch (err) {
      const status = err?.response?.status ?? "no-response";
      console.warn(`[post] failed ${url} | ${status} | ${err?.message}`);
      throw new Error(`[post] ${url} → ${status}`);
    }
  }
  async parse(res) {
    try {
      console.log("[parse] extracting result...");
      const imgB64 = res?.data?.data?.image || null;
      if (!imgB64) throw new Error("image field missing");
      const contentType = "image/png";
      const buffer = Buffer.from(imgB64, "base64");
      console.log(`[parse] ok | ${contentType} | bytes: ${buffer?.length}`);
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (err) {
      console.error(`[parse] error: ${err?.message}`);
      throw new Error(`[parse] failed → ${err?.message}`);
    }
  }
  async generate({
    image,
    scale = 2,
    ...rest
  }) {
    try {
      console.log(`[upscale] start | scale: ${scale}`);
      const b64 = await this.toB64(image);
      const payload = JSON.stringify({
        image_url: b64,
        upscale: scale,
        ...rest
      });
      for (const url of this.hosts) {
        try {
          console.log(`[upscale] trying host: ${url}`);
          const res = await this.post(url, payload);
          const result = await this.parse(res);
          console.log(`[upscale] done ✓ | host: ${url}`);
          return result;
        } catch (err) {
          console.warn(`[upscale] host failed, next... | ${err?.message}`);
        }
      }
      throw new Error("[upscale] all hosts exhausted");
    } catch (err) {
      console.error(`[upscale] fatal: ${err?.message}`);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new Upscaler();
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