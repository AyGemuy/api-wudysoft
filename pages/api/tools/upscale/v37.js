import axios from "axios";
import FormData from "form-data";
import https from "https";
class AIPhotoEnhancer {
  constructor() {
    this.cfg = {
      apis: {
        enhance: ["http://api.enhance.zeezoo.mobi:8080", "http://api1.alibb.zeezoo.mobi:8080", "http://api2.alibb.zeezoo.mobi:8080", "http://api3.alibb.zeezoo.mobi:8080", "http://api4.alibb.zeezoo.mobi:8080", "http://api5.alibb.zeezoo.mobi:8080", "http://api6.alibb.zeezoo.mobi:8080", "http://api7.alibb.zeezoo.mobi:8080", "http://res2.aiphoto.zeezoo.mobi:8080", "http://res3.aiphoto.zeezoo.mobi:8080", "http://res4.aiphoto.zeezoo.mobi:8080", "http://res5.aiphoto.zeezoo.mobi:8080", "http://res6.aiphoto.zeezoo.mobi:8080"],
        descratch: ["http://res2.aiphoto.zeezoo.mobi:8080", "http://api.descratch.zeezoo.mobi:8080", "http://api1.alibb.zeezoo.mobi:8080", "http://api2.alibb.zeezoo.mobi:8080", "http://api3.alibb.zeezoo.mobi:8080", "http://api4.alibb.zeezoo.mobi:8080", "http://api5.alibb.zeezoo.mobi:8080", "http://api6.alibb.zeezoo.mobi:8080", "http://api7.alibb.zeezoo.mobi:8080"]
      },
      pollInterval: 3e3,
      pollTimeout: 6e4,
      headers: {
        "User-Agent": "okhttp/4.3.1",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
      })
    };
  }
  async toBuf(image) {
    console.log("[toBuf] Converting...");
    try {
      if (Buffer.isBuffer(image)) {
        console.log("[toBuf] Buffer");
        return {
          success: true,
          data: image
        };
      }
      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          console.log("[toBuf] Base64");
          const b64 = image.split(",")[1] || image;
          return {
            success: true,
            data: Buffer.from(b64, "base64")
          };
        }
        if (image.startsWith("http")) {
          console.log("[toBuf] URL");
          const {
            data
          } = await axios.get(image, {
            responseType: "arraybuffer",
            httpsAgent: this.cfg.httpsAgent
          });
          return {
            success: true,
            data: Buffer.from(data)
          };
        }
      }
      console.error("[toBuf] Invalid format");
      return {
        success: false,
        error: "Invalid image format"
      };
    } catch (err) {
      console.error("[toBuf] Error:", err?.message);
      return {
        success: false,
        error: err?.message || "Convert failed"
      };
    }
  }
  async proc(api, mode, buffer, ver = 2, fVer = 1) {
    console.log(`[proc] ${api} - ${mode}`);
    try {
      const form = new FormData();
      form.append("type", mode);
      form.append("version", ver.toString());
      form.append("f_version", fVer.toString());
      form.append("file", buffer, {
        filename: `img_${Date.now()}.jpg`
      });
      const {
        data
      } = await axios.post(`${api}/photo/process`, form, {
        headers: {
          ...this.cfg.headers,
          ...form.getHeaders()
        },
        httpsAgent: this.cfg.httpsAgent,
        timeout: 3e4
      });
      console.log("[proc] Response:", data?.msg || "N/A");
      return {
        success: true,
        data: data
      };
    } catch (err) {
      console.error("[proc] Error:", err?.message);
      return {
        success: false,
        error: err?.message || "Process failed"
      };
    }
  }
  async poll(api, task, timeout = this.cfg.pollTimeout, interval = this.cfg.pollInterval) {
    console.log("[poll] Start...");
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const payload = {
          code: 0,
          images: task?.images?.map(img => ({
            id: img?.id?.toLowerCase() || "v1",
            name: img?.name || "",
            size: img?.size || {},
            url: img?.url || ""
          })) || []
        };
        const {
          data
        } = await axios.post(`${api}/photo/get_images`, payload, {
          headers: {
            ...this.cfg.headers,
            "Content-Type": "application/json"
          },
          httpsAgent: this.cfg.httpsAgent,
          timeout: 15e3
        });
        console.log("[poll] Status:", data?.msg || "N/A");
        if (data?.code === 0 && data?.images?.[0]?.url) {
          console.log("[poll] Success!");
          return {
            success: true,
            data: {
              result: data.images[0].url,
              ...data
            }
          };
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (err) {
        console.error("[poll] Error:", err?.message);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    console.error("[poll] Timeout");
    return {
      success: false,
      error: "Polling timeout"
    };
  }
  async tryAll(apis, mode, buffer, ...rest) {
    console.log(`[tryAll] ${apis.length} APIs - ${mode}`);
    for (const api of apis) {
      try {
        console.log(`[tryAll] Try: ${api}`);
        const taskRes = await this.proc(api, mode, buffer, ...rest);
        if (!taskRes.success) continue;
        const task = taskRes.data;
        if (task?.code === 2 || task?.images?.[0]) {
          const pollRes = await this.poll(api, task);
          if (pollRes.success) return pollRes;
        }
      } catch (err) {
        console.error(`[tryAll] Failed ${api}:`, err?.message);
        continue;
      }
    }
    console.error("[tryAll] All APIs failed");
    return {
      success: false,
      error: `All ${mode} APIs failed`
    };
  }
  async generate({
    mode = "enhance",
    image,
    version,
    fVersion,
    ...rest
  } = {}) {
    console.log(`[generate] Mode: ${mode}`);
    if (!image) {
      console.error("[generate] Image required");
      return {
        success: false,
        error: "Image is required"
      };
    }
    const validModes = Object.keys(this.cfg.apis);
    if (!validModes.includes(mode)) {
      console.error("[generate] Invalid mode");
      return {
        success: false,
        error: `Invalid mode. Use: ${validModes.join(", ")}`
      };
    }
    try {
      const bufRes = await this.toBuf(image);
      if (!bufRes.success) return bufRes;
      const buffer = bufRes.data;
      const apis = this.cfg.apis?.[mode] || [];
      if (!apis.length) {
        console.error("[generate] No APIs");
        return {
          success: false,
          error: `No APIs for mode: ${mode}`
        };
      }
      const ver = version ?? rest?.v ?? 2;
      const fVer = fVersion ?? rest?.fv ?? 1;
      const result = await this.tryAll(apis, mode, buffer, ver, fVer);
      if (result.success) {
        console.log("[generate] Done!");
        const {
          result: url,
          images,
          faces,
          msg,
          ...info
        } = result.data;
        return {
          success: true,
          result: url,
          images: images,
          faces: faces,
          msg: msg,
          ...info
        };
      }
      return result;
    } catch (err) {
      console.error("[generate] Error:", err?.message);
      return {
        success: false,
        error: err?.message || "Generation failed"
      };
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
  const api = new AIPhotoEnhancer();
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