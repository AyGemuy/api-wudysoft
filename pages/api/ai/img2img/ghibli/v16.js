import axios from "axios";
import FormData from "form-data";
class LiftApp {
  constructor() {
    this.client = axios.create({
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: "https://liftapp.ai",
        Pragma: "no-cache",
        Referer: "https://liftapp.ai/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
    this.token = null;
  }
  log(msg) {
    console.log(`[LiftApp] ${msg}`);
  }
  async auth() {
    try {
      this.log("Auth...");
      const {
        data
      } = await this.client.post("https://api.liftstory.com/anonymous-user", {
        source: "web-app"
      });
      this.token = data?.token || null;
      this.log(this.token ? "Auth success" : "Auth failed");
      return this.token;
    } catch (err) {
      this.log(`Auth error: ${err.message}`);
      return null;
    }
  }
  async templates({
    token,
    ...rest
  }) {
    try {
      this.log("Fetch templates...");
      this.token = token;
      if (!this.token) await this.auth();
      if (!this.token) throw new Error("No token");
      const {
        data
      } = await this.client.get("https://api.liftstory.com/v2/ai-image-to-image/web/templates", {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      this.log(`Templates: ${data?.length || 0}`);
      const result = data || [];
      return {
        result: result,
        token: this.token
      };
    } catch (err) {
      this.log(`Template error: ${err.message}`);
      throw err;
    }
  }
  async uploadPresign(mime = "image/jpeg") {
    try {
      this.log("Get upload URL...");
      const {
        data
      } = await this.client.post("https://api.liftstory.com/v4/image-services/upload-data", {
        mimeType: mime
      });
      this.log(data?.uploadUrl ? "Upload URL OK" : "Upload URL failed");
      return data || null;
    } catch (err) {
      this.log(`Presign error: ${err.message}`);
      return null;
    }
  }
  async uploadImage(uploadData, buffer) {
    try {
      this.log(`Upload image (${buffer?.length || 0} bytes)...`);
      const form = new FormData();
      for (const [key, value] of Object.entries(uploadData?.payload || {})) {
        form.append(key, value);
      }
      form.append("file", buffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      await axios.post(uploadData?.uploadUrl || "", form, {
        headers: form.getHeaders()
      });
      const finalUrl = uploadData?.url || uploadData?.mediaUrl || uploadData?.viewUrl || null;
      this.log("Upload OK");
      return finalUrl;
    } catch (err) {
      this.log(`Upload error: ${err.message}`);
      return null;
    }
  }
  async toBuffer(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith("http")) {
        this.log("Download image...");
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      return Buffer.from(input, "base64");
    } catch (err) {
      this.log(`Buffer error: ${err.message}`);
      throw err;
    }
  }
  async generate({
    token,
    imageUrl: image,
    template,
    ...rest
  }) {
    try {
      this.log("=== Generate start ===");
      this.token = token;
      if (!this.token) await this.auth();
      if (!this.token) throw new Error("No token");
      const buffer = await this.toBuffer(image);
      const uploadData = await this.uploadPresign();
      if (!uploadData) throw new Error("Upload presign failed");
      const imageURL = await this.uploadImage(uploadData, buffer);
      if (!imageURL) throw new Error("Upload failed");
      const templateId = template || "69270b334335d0214b9a5c28";
      this.log(`Generate with template: ${templateId}`);
      const payload = {
        imageURL: imageURL,
        templateId: templateId,
        userInput: rest?.userInput || []
      };
      const {
        data
      } = await this.client.post("https://api.liftstory.com/v5/image-service/ai-image-to-image", payload, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      this.log("Generate OK");
      this.log("=== Complete ===");
      const {
        imageUrl,
        ...info
      } = data || {};
      return {
        result: imageUrl || null,
        token: this.token,
        ...info
      };
    } catch (err) {
      this.log(`Error: ${err.message}`);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["templates", "generate"]
    });
  }
  const api = new LiftApp();
  try {
    let response;
    switch (action) {
      case "templates":
        response = await api.templates(params);
        break;
      case "generate":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: ["templates", "generate"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}