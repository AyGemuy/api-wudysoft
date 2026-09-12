import crypto from "crypto";
import {
  v7 as uuidv7
} from "uuid";
import axios from "axios";
class TheBetterAi {
  constructor() {
    this.base = "https://api.thebetter.ai";
    this.auth_base = "https://saas.castbox.fm";
    this.app_id = "photo-enhancer";
  }
  uid(bytes = 8) {
    return crypto.randomBytes(bytes).toString("hex");
  }
  hdr(token) {
    const dev_id = this.uid(8);
    return {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-app-id": this.app_id,
      "x-device-info": `appIdentifier=ai.photo.enhancer.ig.tiktok.editor.remini.pixelup.hd.free;appVersion=3.11.1-26071646;deviceType=android;deviceCountry=ID;appCountry=id;local=id_ID;language=id;timezone=Asia/Makassar;brand=realme;model=RMX3890;androidId=${dev_id}`,
      "x-access-token": token || ""
    };
  }
  signS3Put({
    bucket,
    key,
    region = "us-east-1",
    payload,
    mime,
    accessKeyId,
    secretAccessKey,
    sessionToken
  }) {
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = datetime.substring(0, 8);
    const host = `${bucket}.s3.amazonaws.com`;
    const canonicalUri = "/" + key.split("/").map(encodeURIComponent).join("/");
    const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
    const headers = {
      "content-type": mime,
      host: host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": datetime,
      "x-amz-security-token": sessionToken
    };
    const sortedKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k].trim()}\n`).join("");
    const signedHeaders = sortedKeys.join(";");
    const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", datetime, credentialScope, crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
    const kDate = hmac(`AWS4${secretAccessKey}`, date);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return {
      url: `https://${host}${canonicalUri}`,
      headers: {
        "Content-Type": mime,
        Host: host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": datetime,
        "x-amz-security-token": sessionToken,
        Authorization: authorization
      }
    };
  }
  signS3Get({
    bucket,
    key,
    region = "us-east-1",
    accessKeyId,
    secretAccessKey,
    sessionToken
  }) {
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = datetime.substring(0, 8);
    const host = `${bucket}.s3.amazonaws.com`;
    const canonicalUri = "/" + key.split("/").map(encodeURIComponent).join("/");
    const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const headers = {
      host: host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": datetime
    };
    if (sessionToken) headers["x-amz-security-token"] = sessionToken;
    const sortedKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k].trim()}\n`).join("");
    const signedHeaders = sortedKeys.join(";");
    const canonicalRequest = ["GET", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", datetime, credentialScope, crypto.createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
    const kDate = hmac(`AWS4${secretAccessKey}`, date);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return {
      url: `https://${host}${canonicalUri}`,
      headers: {
        Host: host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": datetime,
        ...sessionToken ? {
          "x-amz-security-token": sessionToken
        } : {},
        Authorization: authorization
      }
    };
  }
  async downloadImage(poll_res) {
    try {
      const item = poll_res?.list?.[0];
      if (!item) return null;
      const directUrl = item?.url;
      const hasAwsCreds = Boolean(poll_res?.access_key_id && poll_res?.secret_access_key);
      let res;
      if (directUrl || !hasAwsCreds) {
        const targetUrl = directUrl || `https://${poll_res?.bucket || "evoke-user-public"}.s3.amazonaws.com/${item?.img_key}`;
        console.log("[LOG] Downloading public image directly from:", targetUrl);
        res = await axios.get(targetUrl, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "okhttp/4.12.0"
          }
        });
      } else {
        console.log("[LOG] Downloading private image from S3 using session credentials...");
        const signed = this.signS3Get({
          bucket: poll_res.bucket || "evoke-user-image",
          key: item.img_key,
          accessKeyId: poll_res.access_key_id,
          secretAccessKey: poll_res.secret_access_key,
          sessionToken: poll_res.session_token
        });
        res = await axios.get(signed.url, {
          headers: signed.headers,
          responseType: "arraybuffer"
        });
      }
      return {
        buffer: Buffer.from(res.data),
        contentType: res.headers["content-type"] || "image/jpeg"
      };
    } catch (err) {
      console.log("[LOG] Download error:", err?.message || err);
      return null;
    }
  }
  async gtok() {
    try {
      console.log("[LOG] Requesting provider auth token...");
      const res = await axios.post(`${this.auth_base}/auth/api/v1/tokens/provider/secret`, {
        secret: uuidv7()
      }, {
        headers: {
          "x-app-id": this.app_id,
          "Content-Type": "application/json"
        }
      });
      return res?.data?.data?.token || null;
    } catch (err) {
      console.log("[LOG] Auth token generation failed:", err?.message || err);
      return null;
    }
  }
  async chk(token) {
    return token || await this.gtok() || "";
  }
  async tok(token) {
    try {
      console.log("[LOG] Requesting S3 upload credentials...");
      const active_tok = await this.chk(token);
      const res = await axios.get(`${this.base}/api/v2/upload/credentials`, {
        headers: this.hdr(active_tok)
      });
      return res?.data?.data || null;
    } catch (err) {
      console.log("[LOG] Failed to get upload credentials:", err?.message || err);
      return null;
    }
  }
  async med(item, token) {
    try {
      console.log("[LOG] Resolving media item...");
      let buf = null;
      let mime = "image/jpeg";
      if (Buffer.isBuffer(item)) {
        buf = item;
      } else if (typeof item === "string" && item.startsWith("http")) {
        console.log("[LOG] Fetching media from URL...");
        const res = await axios.get(item, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res?.data);
        mime = res?.headers?.["content-type"] || mime;
      } else if (typeof item === "string") {
        console.log("[LOG] Decoding base64 media...");
        const b64 = item.includes("base64,") ? item.split("base64,")[1] : item;
        buf = Buffer.from(b64, "base64");
      }
      if (!buf) return null;
      const active_tok = await this.chk(token);
      const creds = await this.tok(active_tok);
      if (!creds?.object_key || !creds?.access_key_id) return null;
      const s3_key = creds.object_key;
      const bucket = creds.bucket || "evoke-user-image";
      console.log("[LOG] Signing S3 PUT request manually...");
      const signed = this.signS3Put({
        bucket: bucket,
        key: s3_key,
        payload: buf,
        mime: mime,
        accessKeyId: creds.access_key_id,
        secretAccessKey: creds.secret_access_key,
        sessionToken: creds.session_token
      });
      console.log("[LOG] Uploading media to S3...");
      await axios.put(signed.url, buf, {
        headers: signed.headers
      });
      console.log("[LOG] Media uploaded successfully.");
      return {
        bucket: bucket,
        key: s3_key
      };
    } catch (err) {
      console.log("[LOG] Media upload error:", err?.message || err);
      return null;
    }
  }
  async poll(id, token, delay = 3e3, max = 60) {
    try {
      console.log("[LOG] Polling result for inference_id:", id);
      const active_tok = await this.chk(token);
      for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, delay));
        console.log(`[LOG] Polling iteration ${i + 1}/${max}...`);
        const res = await axios.get(`${this.base}/api/v3/image/inference_result`, {
          params: {
            inference_id: id
          },
          headers: this.hdr(active_tok)
        });
        const data = res?.data?.data || {};
        if (data?.status === 1) {
          console.log("[LOG] Task processing complete!");
          return data;
        }
      }
      console.log("[LOG] Polling reached maximum retry limit.");
      return null;
    } catch (err) {
      console.log("[LOG] Polling error:", err?.message || err);
      return null;
    }
  }
  async templates({
    query = "",
    theme_id = "",
    page = 1,
    ai_type = 1,
    ai_subtype = 1,
    token = "",
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Fetching themes or templates...");
      const active_tok = await this.chk(token);
      let url = "";
      let params = {};
      if (query) {
        console.log("[LOG] Executing theme search query:", query);
        url = `${this.base}/api/v3/themes/search`;
        params = {
          search_key: query,
          ...rest
        };
      } else if (theme_id) {
        console.log("[LOG] Fetching theme images for theme_id:", theme_id);
        url = `${this.base}/api/v1/theme/images`;
        params = {
          theme_id: theme_id,
          ...rest
        };
      } else {
        console.log("[LOG] Fetching subtype themes list...");
        url = `${this.base}/api/v1/subtype/themes`;
        params = {
          page: page,
          version: 2,
          ai_type: ai_type,
          ai_subtype: ai_subtype,
          ...rest
        };
      }
      const res = await axios.get(url, {
        params: params,
        headers: this.hdr(active_tok)
      });
      const list_data = res?.data?.data?.list || res?.data?.data || [];
      return {
        status: true,
        result: {
          code: res?.data?.code || 0,
          msg: res?.data?.msg || "success",
          list: list_data
        }
      };
    } catch (err) {
      console.log("[LOG] Error fetching templates:", err?.message || err);
      return {
        status: false,
        result: {
          error_message: err?.message || "Failed to fetch templates"
        }
      };
    }
  }
  async generate({
    image,
    mode = "enhance",
    theme_id = "",
    theme_key = "",
    prompt = "",
    speed_type = "quick",
    version = "1",
    use_point = 1,
    watch_ad = 1,
    is_vip = false,
    token = "",
    delay = 3e3,
    max_retry = 60,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Initializing generation task...");
      const active_tok = await this.chk(token);
      const media = await this.med(image, active_tok);
      if (!media?.key) {
        return {
          status: false,
          buffer: null,
          contentType: null
        };
      }
      const formattedMode = mode.toLowerCase().replace(/_/g, "-");
      const payload = {
        is_vip: Boolean(is_vip),
        speed_type: speed_type,
        version: version,
        use_point: Number(use_point),
        watch_ad: Number(watch_ad),
        ...rest
      };
      switch (formattedMode) {
        case "chat-edit":
          payload.model_type = "chat-edit";
          payload.mode_id = "chat-edit";
          payload.bucket = media.bucket || "evoke-user-image";
          payload.key = media.key;
          if (prompt) payload.prompt = prompt;
          break;
        case "face-swapper":
        case "faceswapper":
          payload.model_type = "face-swapper";
          payload.mode_id = "rp";
          payload.bucket = media.bucket || "evoke-user-image";
          payload.key = media.key;
          if (theme_id || rest.themeId) payload.theme_id = theme_id || rest.themeId;
          if (theme_key || rest.themeKey || rest.themeImageKey) {
            payload.theme_key = theme_key || rest.themeKey || rest.themeImageKey;
          }
          break;
        case "colorize":
        case "descratch":
        case "restore":
        case "enhance":
        default:
          payload.model_type = "enhance";
          payload.mode_id = ["colorize", "descratch", "restore"].includes(formattedMode) ? formattedMode : "enhance";
          payload.bucket = media.bucket || "evoke-user-image";
          payload.key = media.key;
          break;
      }
      console.log(`[LOG] Creating async generation task (Mode: ${formattedMode})...`);
      const res = await axios.post(`${this.base}/api/v3/image/create_async`, payload, {
        headers: this.hdr(active_tok)
      });
      const inference_id = res?.data?.data?.inference_id;
      if (!inference_id) {
        console.log("[LOG] Failed to obtain inference_id from server.", res?.data);
        return {
          status: false,
          buffer: null,
          contentType: null
        };
      }
      const poll_res = await this.poll(inference_id, active_tok, delay, max_retry);
      if (!poll_res || !poll_res?.list?.[0]) {
        return {
          status: false,
          buffer: null,
          contentType: null
        };
      }
      const download = await this.downloadImage(poll_res);
      if (!download?.buffer) {
        return {
          status: false,
          buffer: null,
          contentType: null
        };
      }
      return {
        status: true,
        buffer: download.buffer,
        contentType: download.contentType
      };
    } catch (err) {
      console.log("[LOG] Generation execution error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        buffer: null,
        contentType: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["templates", "generate"];
  const validModes = ["enhance", "colorize", "descratch", "restore", "face-swapper", "chat-edit"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  const api = new TheBetterAi();
  try {
    switch (action) {
      case "templates": {
        const templatesRes = await api.templates(params);
        return res.status(200).json({
          status: true,
          action: action,
          ...templatesRes
        });
      }
      case "generate": {
        const {
          mode,
          image
        } = params;
        if (!mode || !validModes.includes(mode)) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'mode' tidak valid.`,
            valid_modes: validModes
          });
        }
        if (!image) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'image' wajib diisi.`
          });
        }
        if (mode === "chat-edit" && !params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk mode 'chat-edit'."
          });
        }
        const response = await api.generate({
          mode: mode,
          ...params
        });
        if (!response?.status || !response?.buffer) {
          return res.status(500).json({
            status: false,
            error: "Gagal memproses gambar dari server AI."
          });
        }
        res.setHeader("Content-Type", response.contentType || "image/jpeg");
        return res.status(200).send(response.buffer);
      }
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}