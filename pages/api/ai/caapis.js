import axios from "axios";
import FormData from "form-data";
import qs from "qs";
class CaapisAI {
  constructor() {
    try {
      this.modes = ["gen", "filter", "upscale", "nobg"];
      this.headers = {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip"
      };
      this.ciphers = {
        filter: "6f6e6f3f6968393e6b3e6a3e6e3963393e6e6a3b6238396e3c6f6c696e3b6e68",
        bg: "626b3b626b3f6d3c6b68396d636c6c6b633c3f3f393b6b696a6f3e6a3c6e623c",
        gen: "3c626b38396f633f626e633f6262693b3e6f6a3b626d6c636262636f6c3e383c"
      };
      console.log("[Caapis] Client initialized successfully");
    } catch (err) {
      console.error("[Caapis] Constructor error:", err?.message || err);
    }
  }
  tok(type) {
    try {
      const hex = this.ciphers?.[type] || this.ciphers.gen;
      const buf = Buffer.from(hex, "hex");
      let res = "";
      for (let i = 0; i < buf.length; i++) {
        res += String.fromCharCode(buf[i] ^ 90);
      }
      return res;
    } catch (err) {
      console.error("[Caapis] Token decryption error:", err?.message || err);
      return null;
    }
  }
  mime(buf, mode = "") {
    try {
      if (Buffer.isBuffer(buf) && buf.length >= 4) {
        if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) {
          return "image/png";
        }
        if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
          return "image/jpeg";
        }
      }
      const m = mode.toLowerCase();
      if (m === "nobg") return "image/png";
      if (m === "gen") return "image/png";
      if (m === "upscale") return "image/jpeg";
      return "image/png";
    } catch (err) {
      return mode === "nobg" ? "image/png" : "image/jpeg";
    }
  }
  async buf(input) {
    try {
      console.log("[Caapis] Validating & resolving input image...");
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return input.length > 0 ? input : null;
      }
      if (typeof input !== "string") return null;
      if (input.startsWith("http://") || input.startsWith("https://")) {
        console.log("[Caapis] Fetching image from remote URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return res?.data ? Buffer.from(res.data) : null;
      }
      if (input.startsWith("data:image/") || input.includes(";base64,")) {
        console.log("[Caapis] Parsing base64 URI...");
        const b64 = input.split(";base64,").pop() || "";
        return Buffer.from(b64, "base64");
      }
      const cleanB64 = input.trim();
      if (/^[A-Za-z0-9+/=]+$/.test(cleanB64) && cleanB64.length > 50) {
        console.log("[Caapis] Parsing raw base64 string...");
        return Buffer.from(cleanB64, "base64");
      }
      return null;
    } catch (err) {
      console.error("[Caapis] Input resolver error:", err?.message || err);
      return null;
    }
  }
  async up(url, buffer, fileType = "source") {
    try {
      console.log(`[Caapis] Uploading image asset (${fileType})...`);
      const form = new FormData();
      form.append("hash", "");
      form.append("file_type", fileType);
      form.append("file", buffer, {
        filename: `upload_${Date.now()}.png`,
        contentType: "image/png"
      });
      const res = await axios.post(url, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const hash = res?.data?.hash || null;
      if (!hash) {
        console.error("[Caapis] Upload failed, hash not returned:", res?.data);
        return null;
      }
      console.log(`[Caapis] Upload success! Hash: ${hash}`);
      return hash;
    } catch (err) {
      console.error("[Caapis] Upload error:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async parseOut(data, mode = "") {
    try {
      if (data?.base64_image) {
        console.log("[Caapis] Decoding base64 output buffer...");
        const b64 = data.base64_image.split(";base64,").pop() || "";
        const buffer = Buffer.from(b64, "base64");
        const contentType = this.mime(buffer, mode);
        console.log(`[Caapis] Detected Content-Type: ${contentType}`);
        return {
          buffer: buffer,
          contentType: contentType
        };
      }
      const downloadUrl = data?.image_1 || data?.image || data?.url;
      if (downloadUrl && typeof downloadUrl === "string") {
        console.log("[Caapis] Downloading result from remote image URL...");
        const res = await axios.get(downloadUrl, {
          responseType: "arraybuffer"
        });
        const buffer = Buffer.from(res.data);
        const contentType = this.mime(buffer, mode);
        console.log(`[Caapis] Detected Content-Type: ${contentType}`);
        return {
          buffer: buffer,
          contentType: contentType
        };
      }
      return null;
    } catch (err) {
      console.error("[Caapis] Output parsing error:", err?.message || err);
      return null;
    }
  }
  val(mode, params) {
    try {
      if (!mode || typeof mode !== "string") {
        return `Mode is required. Available modes: [${this.modes.join(", ")}]`;
      }
      const m = mode.toLowerCase();
      if (!this.modes.includes(m)) {
        return `Invalid mode "${mode}". Allowed modes: [${this.modes.join(", ")}]`;
      }
      if (m === "gen") {
        if (!params?.prompt || typeof params.prompt !== "string" || !params.prompt.trim()) {
          return 'Parameter "prompt" (string) is required for mode "gen".';
        }
      }
      if (m === "filter") {
        if (!params?.image) {
          return 'Parameter "image" (Buffer, URL, or Base64) is required for mode "filter".';
        }
        if (!params?.prompt || typeof params.prompt !== "string" || !params.prompt.trim()) {
          return 'Parameter "prompt" (string) is required for mode "filter".';
        }
      }
      if (m === "nobg" || m === "upscale") {
        if (!params?.image) {
          return `Parameter "image" (Buffer, URL, or Base64) is required for mode "${m}".`;
        }
      }
      return null;
    } catch (err) {
      return `Validation error: ${err?.message || err}`;
    }
  }
  async generate({
    mode,
    image,
    ...rest
  } = {}) {
    try {
      console.log("[Caapis] Starting generate request...");
      const errValidation = this.val(mode, {
        image: image,
        ...rest
      });
      if (errValidation) {
        console.error(`[Caapis] Validation error: ${errValidation}`);
        return {
          status: false,
          buffer: null,
          contentType: null,
          error: errValidation
        };
      }
      const selectedMode = mode.toLowerCase();
      if (selectedMode === "gen") {
        console.log("[Caapis] Processing Text-to-Image (gen)...");
        const token = rest?.token || this.tok("gen");
        const body = qs.stringify({
          token: token,
          prompt: rest.prompt.trim(),
          width: String(rest?.width || "1024"),
          height: String(rest?.height || "1024")
        });
        const res = await axios.post("https://img.caapis.com/ca-logo-gen-v1", body, {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        const parsed = await this.parseOut(res?.data, selectedMode);
        if (!parsed) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: res?.data?.message || "Failed to retrieve output buffer"
          };
        }
        console.log("[Caapis] Generation completed successfully!");
        return {
          status: true,
          buffer: parsed.buffer,
          contentType: parsed.contentType
        };
      }
      const buffer = await this.buf(image);
      if (!buffer) {
        return {
          status: false,
          buffer: null,
          contentType: null,
          error: "Invalid image format. Supported: Buffer, HTTP/HTTPS URL, or Base64 string."
        };
      }
      if (selectedMode === "filter") {
        const hash = await this.up("https://flt.caapis.com/fileupload_v2", buffer, "source");
        if (!hash) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: "Failed to upload image asset"
          };
        }
        console.log("[Caapis] Applying AI filter style...");
        const token = rest?.token || this.tok("filter");
        const form = new FormData();
        form.append("prompt", rest.prompt.trim());
        form.append("negative_prompt", rest?.negative_prompt || rest?.negativePrompt || "");
        form.append("hash", hash);
        form.append("token", token);
        const res = await axios.post("https://flt.caapis.com/ai_filter", form, {
          headers: {
            ...this.headers,
            ...form.getHeaders()
          }
        });
        const parsed = await this.parseOut(res?.data, selectedMode);
        if (!parsed) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: res?.data?.message || "Filter transformation failed"
          };
        }
        console.log("[Caapis] Filter applied successfully!");
        return {
          status: true,
          buffer: parsed.buffer,
          contentType: parsed.contentType
        };
      }
      if (selectedMode === "nobg") {
        const hash = await this.up("https://img.caapis.com/fileupload_new", buffer, "bg_remover");
        if (!hash) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: "Failed to upload image for background removal"
          };
        }
        console.log("[Caapis] Processing background removal...");
        const token = rest?.access_token || rest?.accessToken || this.tok("bg");
        const body = qs.stringify({
          hash: hash,
          access_token: token
        });
        const res = await axios.post("https://img.caapis.com/image_bg_remove_v2", body, {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        const parsed = await this.parseOut(res?.data, selectedMode);
        if (!parsed) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: res?.data?.message || "Failed to remove background"
          };
        }
        console.log("[Caapis] Background removed successfully!");
        return {
          status: true,
          buffer: parsed.buffer,
          contentType: parsed.contentType
        };
      }
      if (selectedMode === "upscale") {
        const hash = await this.up("https://img.caapis.com/fileupload_new", buffer, "upscaler");
        if (!hash) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: "Failed to upload image for upscaling"
          };
        }
        console.log("[Caapis] Processing image upscaling...");
        const token = rest?.access_token || rest?.accessToken || this.tok("bg");
        const body = qs.stringify({
          hash: hash,
          access_token: token
        });
        const res = await axios.post("https://img.caapis.com/image_upscale_v2", body, {
          headers: {
            ...this.headers,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        const parsed = await this.parseOut(res?.data, selectedMode);
        if (!parsed) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: res?.data?.message || "Failed to upscale image"
          };
        }
        console.log("[Caapis] Image upscaled successfully!");
        return {
          status: true,
          buffer: parsed.buffer,
          contentType: parsed.contentType
        };
      }
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: "Execution branch not found"
      };
    } catch (err) {
      console.error("[Caapis] Execution error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: err?.response?.data?.message || err?.message || "Unexpected processing error"
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    console.log(`[Handler] Menerima request HTTP ${req.method}...`);
    const params = req.method === "GET" ? req.query : req.body;
    const api = new CaapisAI();
    const data = await api.generate(params);
    if (data?.status && data?.buffer) {
      res.setHeader("Content-Type", data?.contentType || "image/png");
      return res.status(200).end(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    console.log(`[Error] Handler gagal: ${error?.message || error}`);
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}