import axios from "axios";
import FormData from "form-data";
class ImagineAI {
  constructor() {
    try {
      this.baseUrl = "https://imagine-ai-dot-calaiproject-471016.uc.r.appspot.com";
      this.headers = {
        Accept: "application/json",
        "User-Agent": "okhttp/4.12.0"
      };
      console.log("[ImagineAI] Client initialized successfully");
    } catch (err) {
      console.error("[ImagineAI] Constructor error:", err?.message || err);
    }
  }
  async slp(ms = 3e3) {
    try {
      return await new Promise(r => setTimeout(r, ms));
    } catch (err) {
      console.error("[ImagineAI] Sleep error:", err?.message || err);
      return null;
    }
  }
  async buf(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input.length > 0 ? input : null;
      if (typeof input !== "string") return null;
      if (input.startsWith("http://") || input.startsWith("https://")) {
        console.log("[ImagineAI] Downloading input image from URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return res?.data ? Buffer.from(res.data) : null;
      }
      if (input.startsWith("data:image/") || input.includes(";base64,")) {
        console.log("[ImagineAI] Decoding base64 data URI...");
        const b64 = input.split(";base64,").pop() || "";
        return Buffer.from(b64, "base64");
      }
      const cleanB64 = input.trim();
      if (/^[A-Za-z0-9+/=]+$/.test(cleanB64) && cleanB64.length > 50) {
        console.log("[ImagineAI] Decoding raw base64 string...");
        return Buffer.from(cleanB64, "base64");
      }
      return null;
    } catch (err) {
      console.error("[ImagineAI] Buffer resolver error:", err?.message || err);
      return null;
    }
  }
  async up(buffers) {
    try {
      console.log(`[ImagineAI] Uploading ${buffers.length} image asset(s)...`);
      const form = new FormData();
      for (let i = 0; i < buffers.length; i++) {
        form.append("files", buffers[i], {
          filename: `input_${Date.now()}_${i}.jpg`,
          contentType: "image/jpeg"
        });
      }
      const res = await axios.post(`${this.baseUrl}/upload/images`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const sessionId = res?.data?.session_id || res?.data?.sessionId || null;
      if (!sessionId) {
        console.error("[ImagineAI] Upload failed, sessionId missing:", res?.data);
        return null;
      }
      console.log(`[ImagineAI] Upload success! Session ID: ${sessionId}`);
      return sessionId;
    } catch (err) {
      console.error("[ImagineAI] Upload error:", err?.response?.data || err?.message || err);
      return null;
    }
  }
  async poll(jobId) {
    try {
      const maxAttempts = 60;
      const interval = 3e3;
      console.log(`[ImagineAI] Starting polling for Job ID: ${jobId}`);
      for (let i = 1; i <= maxAttempts; i++) {
        console.log(`[ImagineAI] Polling [${i}/${maxAttempts}] checking result...`);
        const res = await axios.get(`${this.baseUrl}/generate/result/${jobId}`, {
          headers: this.headers
        });
        const data = res?.data;
        const status = data?.status?.toLowerCase() || "";
        const hasResult = data?.output_url || data?.result_url || data?.image_url || data?.result || data?.images;
        if (status === "completed" || status === "succeeded" || hasResult) {
          console.log("[ImagineAI] Job finished successfully!");
          return data;
        }
        if (status === "failed" || status === "error") {
          console.error("[ImagineAI] Generation job failed on server:", data);
          return null;
        }
        await this.slp(interval);
      }
      console.error("[ImagineAI] Polling timed out after 60 attempts");
      return null;
    } catch (err) {
      console.error("[ImagineAI] Polling handler error:", err?.message || err);
      return null;
    }
  }
  async template({
    limit = 50,
    ...rest
  } = {}) {
    try {
      console.log("[ImagineAI] Fetching styles list...");
      const res = await axios.get(`${this.baseUrl}/styles`, {
        headers: this.headers,
        params: {
          ...rest || {}
        }
      });
      const list = Array.isArray(res?.data) ? res.data : res?.data?.styles || res?.data?.items || [];
      const result = typeof limit === "number" ? list.slice(0, limit) : list;
      return {
        status: true,
        result: result
      };
    } catch (err) {
      console.error("[ImagineAI] Styles fetch error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data?.message || err?.message || "Failed to fetch styles"
      };
    }
  }
  async generate({
    prompt,
    user_prompt,
    style_id,
    styleId,
    image,
    images,
    ...rest
  } = {}) {
    try {
      console.log("[ImagineAI] Validating generate parameters...");
      const rawImages = images || image;
      if (!rawImages) {
        return {
          status: false,
          error: 'Parameter "image" or "images" is required'
        };
      }
      const imgList = Array.isArray(rawImages) ? rawImages : [rawImages];
      let buffers = [];
      for (const item of imgList) {
        const resolved = await this.buf(item);
        if (resolved) buffers.push(resolved);
      }
      if (buffers.length === 0) {
        return {
          status: false,
          error: "Failed to resolve input images into valid buffer format"
        };
      }
      if (buffers.length === 1) {
        console.log("[ImagineAI] Only 1 image provided. Auto-duplicating to meet server requirement (2-10 images)...");
        buffers.push(Buffer.from(buffers[0]));
      }
      if (buffers.length > 10) {
        console.log("[ImagineAI] More than 10 images provided. Trimming to maximum 10...");
        buffers = buffers.slice(0, 10);
      }
      const sessionId = await this.up(buffers);
      if (!sessionId) {
        return {
          status: false,
          error: "Failed to upload images and acquire session_id"
        };
      }
      const finalPrompt = prompt || user_prompt || "";
      const finalStyle = style_id || styleId || "None";
      console.log(`[ImagineAI] Sending generation request (Style: "${finalStyle}", Session: "${sessionId}")...`);
      const payload = {
        user_prompt: finalPrompt,
        style_id: finalStyle,
        session_id: sessionId,
        ...rest || {}
      };
      const res = await axios.post(`${this.baseUrl}/generate/request`, payload, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        }
      });
      const jobId = res?.data?.job_id || res?.data?.jobId || null;
      if (!jobId) {
        return {
          status: false,
          error: res?.data?.message || "Server did not return job_id"
        };
      }
      console.log(`[ImagineAI] Generation started. Job ID: ${jobId}`);
      const resultData = await this.poll(jobId);
      if (!resultData) {
        return {
          status: false,
          error: "Generation failed or polling timed out"
        };
      }
      const finalUrl = resultData?.result_url || resultData?.output_url || resultData?.image_url || resultData?.result || (Array.isArray(resultData?.images) ? resultData?.images[0] : "");
      const finalId = resultData?.job_id || resultData?.jobId || jobId;
      return {
        status: true,
        result: {
          id: finalId,
          url: finalUrl,
          status: resultData?.status || "completed",
          metadata: resultData?.metadata || null
        }
      };
    } catch (err) {
      console.error("[ImagineAI] Generation error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        error: err?.response?.data?.message || err?.message || "Generation execution failed"
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
    const validActions = ["template", "templates", "styles", "style", "generate", "create"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: ["template", "styles", "generate"],
        usage: {
          method: "GET / POST",
          examples: ["/?action=template&limit=20", "/?action=styles", "/?action=generate&prompt=cyberpunk anime warrior&style_id=Cyberpunk&image=https://example.com/foto.jpg"]
        }
      });
    }
    const normalizedAction = action.toLowerCase();
    if (!validActions.includes(normalizedAction)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: ["template", "styles", "generate"]
      });
    }
    const api = new ImagineAI();
    let response;
    switch (normalizedAction) {
      case "template":
      case "templates":
      case "styles":
      case "style": {
        response = await api.template(params);
        break;
      }
      case "generate":
      case "create": {
        const image = params.image || params.images || params.file || params.files || params.media;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' atau 'images' (URL, Base64, atau Buffer) wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate({
          image: image,
          prompt: params.prompt || params.user_prompt || params.text,
          style_id: params.style_id || params.styleId || params.style,
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
        error: response?.error || response?.result?.error || "Gagal memproses request."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Handler ImagineAI:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server ImagineAI.",
      error: error?.message || "Unknown Error"
    });
  }
}