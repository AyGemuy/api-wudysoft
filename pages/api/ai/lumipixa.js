import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class PhotunaAI {
  constructor() {
    try {
      this.baseUrl = "https://api-gp.aicloudside.com";
      this.installId = crypto.randomUUID();
      this.validModes = ["template", "prompt_edit", "enhance", "beautify", "upscale"];
      this.headers = {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Accept-Language": "id-ID"
      };
      console.log(`[Photuna] Initialized client with install_id: ${this.installId}`);
    } catch (err) {
      console.error("[Photuna] Constructor error:", err?.message || err);
    }
  }
  async slp(ms = 3e3) {
    try {
      return await new Promise(r => setTimeout(r, ms));
    } catch (err) {
      console.error("[Photuna] Sleep error:", err?.message || err);
      return null;
    }
  }
  uuid() {
    try {
      return crypto.randomUUID();
    } catch (err) {
      console.error("[Photuna] UUID generator error:", err?.message || err);
      return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  fixUrl(url) {
    try {
      if (!url || typeof url !== "string") return url || "";
      let fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      const hasParam = fullUrl.includes("?");
      if (!fullUrl.includes("install_id=")) {
        fullUrl += `${hasParam ? "&" : "?"}install_id=${this.installId}`;
      }
      return fullUrl;
    } catch (err) {
      console.error("[Photuna] fixUrl parsing error:", err?.message || err);
      return url;
    }
  }
  toSnake(data) {
    try {
      if (!data || typeof data !== "object") return data;
      if (Array.isArray(data)) return data.map(v => this.toSnake(v));
      return Object.entries(data).reduce((acc, [k, v]) => {
        const key = k.replace(/([A-Z])/g, "_$1").toLowerCase();
        let val = this.toSnake(v);
        if (key === "output_url" && typeof val === "string") {
          val = this.fixUrl(val);
        }
        acc[key] = val;
        return acc;
      }, {});
    } catch (err) {
      console.error("[Photuna] Parsing to snake_case error:", err?.message || err);
      return data;
    }
  }
  async buf(input) {
    try {
      console.log("[Photuna] Resolving image input type...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input !== "string") {
        console.error("[Photuna] Unsupported image type");
        return null;
      }
      if (input.startsWith("http://") || input.startsWith("https://")) {
        console.log("[Photuna] Downloading image from URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return res?.data ? Buffer.from(res.data) : null;
      }
      if (input.startsWith("data:image/") || input.includes(";base64,")) {
        console.log("[Photuna] Resolving base64 data URI...");
        const b64Data = input.split(";base64,").pop() || "";
        return Buffer.from(b64Data, "base64");
      }
      const isB64 = /^[A-Za-z0-9+/=]+$/.test(input.trim());
      if (isB64 && input.length > 100) {
        console.log("[Photuna] Resolving raw base64 string...");
        return Buffer.from(input.trim(), "base64");
      }
      console.error("[Photuna] Invalid image format provided");
      return null;
    } catch (err) {
      console.error("[Photuna] Buffer resolver error:", err?.message || err);
      return null;
    }
  }
  async up(buffer) {
    try {
      if (!buffer) return null;
      console.log("[Photuna] Uploading image asset...");
      const form = new FormData();
      form.append("userfile", buffer, {
        filename: `photuna-${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const url = `${this.baseUrl}/photuna/v1/assets?install_id=${this.installId}&subDir=photuna-inputs&maxWidth=4096`;
      const res = await axios.post(url, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const assetId = res?.data?.data?.asset_id || null;
      if (!assetId) {
        console.error("[Photuna] Failed to retrieve asset ID:", res?.data);
        return null;
      }
      console.log(`[Photuna] Upload success. Asset ID: ${assetId}`);
      return assetId;
    } catch (err) {
      console.error("[Photuna] Asset upload error:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async qc(assetId) {
    try {
      if (!assetId) return false;
      console.log(`[Photuna] Performing quality check for asset: ${assetId}`);
      const res = await axios.post(`${this.baseUrl}/photuna/v1/assets/quality-check`, {
        install_id: this.installId,
        asset_id: assetId
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        }
      });
      const accepted = res?.data?.data?.accepted ?? true;
      console.log(`[Photuna] Quality check status: ${accepted ? "Passed" : "Warning"}`);
      return accepted;
    } catch (err) {
      console.warn("[Photuna] Quality check bypassed due to warning/error:", err?.message || err);
      return false;
    }
  }
  async poll(genKey) {
    try {
      if (!genKey) return null;
      const maxAttempts = 60;
      const interval = 3e3;
      console.log(`[Photuna] Starting poll monitor for generation key: ${genKey}`);
      for (let i = 1; i <= maxAttempts; i++) {
        try {
          console.log(`[Photuna] Polling [${i}/${maxAttempts}] checking progress...`);
          const res = await axios.get(`${this.baseUrl}/photuna/v1/generations/${genKey}?install_id=${this.installId}`, {
            headers: this.headers
          });
          const item = res?.data?.data;
          const status = item?.status?.toLowerCase() || "unknown";
          console.log(`[Photuna] Task progress: ${item?.progress || 0}% | Status: ${status}`);
          if (status === "succeeded") {
            item.output_url = this.fixUrl(item?.output_url);
            console.log(`[Photuna] Generation finished! Output URL: ${item.output_url}`);
            return item;
          }
          if (status === "failed" || status === "rejected") {
            console.error("[Photuna] Generation rejected or failed:", item?.error_category);
            return null;
          }
        } catch (pollErr) {
          console.warn(`[Photuna] Polling network issue on attempt ${i}:`, pollErr?.message || pollErr);
        }
        await this.slp(interval);
      }
      console.error("[Photuna] Polling timed out after 60 attempts");
      return null;
    } catch (err) {
      console.error("[Photuna] Polling handler error:", err?.message || err);
      return null;
    }
  }
  async template({
    limit = 100,
    ...rest
  } = {}) {
    try {
      console.log(`[Photuna] Fetching template list (limit: ${limit})...`);
      const res = await axios.get(`${this.baseUrl}/photuna/v1/templates`, {
        params: {
          limit: limit,
          ...rest || {}
        },
        headers: this.headers
      });
      const items = res?.data?.items || [];
      console.log(`[Photuna] Retrieved ${items.length} templates.`);
      return {
        status: true,
        result: this.toSnake(items)
      };
    } catch (err) {
      console.error("[Photuna] Template fetch error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: {
          error: err?.response?.data?.message || err?.message || "Failed to fetch templates"
        }
      };
    }
  }
  async generate({
    mode,
    image,
    ...rest
  } = {}) {
    try {
      console.log("[Photuna] Validating generation inputs...");
      if (!mode) {
        return {
          status: false,
          result: {
            error: `Mode is required. Allowed modes: ${this.validModes.join(", ")}`
          }
        };
      }
      if (!image) {
        return {
          status: false,
          result: {
            error: "Image input is required (Accepted: Buffer, Base64, or URL)"
          }
        };
      }
      const selectedMode = mode.toLowerCase();
      if (!this.validModes.includes(selectedMode)) {
        return {
          status: false,
          result: {
            error: `Mode "${mode}" is invalid. Allowed modes: ${this.validModes.join(", ")}`
          }
        };
      }
      const templateId = rest?.template_id || rest?.templateId || "";
      if (selectedMode === "template" && !templateId) {
        return {
          status: false,
          result: {
            error: 'Parameter "template_id" is required when mode is "template"'
          }
        };
      }
      const buffer = await this.buf(image);
      if (!buffer) {
        return {
          status: false,
          result: {
            error: "Failed to resolve image to buffer (invalid URL, base64, or format)"
          }
        };
      }
      const assetId = await this.up(buffer);
      if (!assetId) {
        return {
          status: false,
          result: {
            error: "Failed to upload image asset to server"
          }
        };
      }
      await this.qc(assetId);
      console.log(`[Photuna] Dispatching generation request: [${selectedMode}]`);
      const payload = {
        install_id: this.installId,
        idempotency_key: this.uuid(),
        session_id: this.uuid(),
        operation: selectedMode,
        template_id: selectedMode === "template" ? templateId : "",
        input_asset_ids: [assetId],
        parameters: {
          target: rest?.target || "UHD",
          prompt: rest?.prompt || "",
          preset: rest?.preset || "Natural",
          more_natural: rest?.more_natural ?? rest?.moreNatural ?? true,
          face_protection: rest?.face_protection ?? rest?.faceProtection ?? true
        }
      };
      const res = await axios.post(`${this.baseUrl}/photuna/v1/generations`, payload, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        }
      });
      const genKey = res?.data?.data?.generation_key;
      if (!genKey) {
        return {
          status: false,
          result: {
            error: res?.data?.message || "Generation key was not returned by API"
          }
        };
      }
      const finishedData = await this.poll(genKey);
      if (!finishedData) {
        return {
          status: false,
          result: {
            error: "Generation failed, rejected, or timed out during polling"
          }
        };
      }
      return {
        status: true,
        result: this.toSnake(finishedData)
      };
    } catch (err) {
      console.error("[Photuna] Generation execution error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: {
          error: err?.response?.data?.message || err?.message || "Generation execution failed"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const queryParams = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
    const {
      action,
      ...params
    } = queryParams || {};
    const validActions = ["template", "templates", "generate", "enhance", "beautify", "upscale", "prompt_edit"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: ["template", "generate", "enhance", "beautify", "upscale", "prompt_edit"],
        usage: {
          method: "GET / POST",
          examples: ["/?action=template&limit=20", "/?action=generate&mode=template&template_id=xxx&image=https://example.com/foto.jpg", "/?action=enhance&image=https://example.com/foto.jpg", "/?action=beautify&image=https://example.com/foto.jpg", "/?action=upscale&image=https://example.com/foto.jpg&target=UHD", "/?action=prompt_edit&prompt=change background to beach&image=https://example.com/foto.jpg"]
        }
      });
    }
    const normalizedAction = action.toLowerCase();
    if (!validActions.includes(normalizedAction)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: ["template", "generate", "enhance", "beautify", "upscale", "prompt_edit"]
      });
    }
    const api = new PhotunaAI();
    let response;
    switch (normalizedAction) {
      case "template":
      case "templates": {
        response = await api.template(params);
        break;
      }
      case "generate": {
        const mode = params.mode;
        const image = params.image || params.file || params.media;
        if (!mode) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'mode' wajib diisi untuk action 'generate'. Pilihan: ${api.validModes.join(", ")}`
          });
        }
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' (URL, Base64, atau Buffer) wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate({
          mode: mode,
          image: image,
          ...params
        });
        break;
      }
      case "enhance": {
        const image = params.image || params.file || params.media;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' wajib diisi untuk action 'enhance'."
          });
        }
        response = await api.generate({
          mode: "enhance",
          image: image,
          ...params
        });
        break;
      }
      case "beautify": {
        const image = params.image || params.file || params.media;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' wajib diisi untuk action 'beautify'."
          });
        }
        response = await api.generate({
          mode: "beautify",
          image: image,
          ...params
        });
        break;
      }
      case "upscale": {
        const image = params.image || params.file || params.media;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' wajib diisi untuk action 'upscale'."
          });
        }
        response = await api.generate({
          mode: "upscale",
          image: image,
          ...params
        });
        break;
      }
      case "prompt_edit": {
        const image = params.image || params.file || params.media;
        const prompt = params.prompt || params.text;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' wajib diisi untuk action 'prompt_edit'."
          });
        }
        if (!prompt || !String(prompt).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'prompt_edit'."
          });
        }
        response = await api.generate({
          mode: "prompt_edit",
          image: image,
          prompt: prompt,
          ...params
        });
        break;
      }
    }
    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: normalizedAction,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: normalizedAction,
        error: response?.result?.error || "Gagal memproses request."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Handler PhotunaAI:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server PhotunaAI.",
      error: error?.message || "Unknown Error"
    });
  }
}