import axios from "axios";
class VoiceAiClient {
  constructor() {
    this.cookies = {};
    this.xsrfToken = "";
    const pe = [{
      id: "12",
      avatarUrl: "/img/web-tools/avatars/image12.png",
      uploadedBy: "N3ont"
    }, {
      id: "4",
      avatarUrl: "/img/web-tools/avatars/image4.png",
      uploadedBy: "Blitz_5"
    }, {
      id: "17",
      avatarUrl: "/img/web-tools/avatars/image17.png",
      uploadedBy: "Vortex8"
    }, {
      id: "7",
      avatarUrl: "/img/web-tools/avatars/image7.png",
      uploadedBy: "Z3phyr"
    }, {
      id: "3",
      avatarUrl: "/img/web-tools/avatars/image3.png",
      uploadedBy: "XpyraX"
    }, {
      id: "10",
      avatarUrl: "/img/web-tools/avatars/image10.png",
      uploadedBy: "C0sm0"
    }, {
      id: "9",
      avatarUrl: "/img/web-tools/avatars/image9.png",
      uploadedBy: "XxR3ign"
    }, {
      id: "14",
      avatarUrl: "/img/web-tools/avatars/image14.png",
      uploadedBy: "K1n3tic"
    }, {
      id: "15",
      avatarUrl: "/img/web-tools/avatars/image15.png",
      uploadedBy: "Sypher_98a"
    }];
    this.voices = pe.map(item => ({
      id: item?.id,
      avatar_url: `https://voice.ai${item?.avatarUrl || ""}`,
      uploaded_by: item?.uploadedBy
    }));
    this.baseHeaders = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: "https://voice.ai",
      withCredentials: true,
      headers: {
        ...this.baseHeaders,
        origin: "https://voice.ai",
        referer: "https://voice.ai/tools/voice-changer"
      }
    });
    this.client.interceptors.request.use(config => {
      try {
        const cookieStr = Object.entries(this.cookies).map(([key, val]) => `${key}=${val}`).join("; ");
        config.headers["cookie"] = cookieStr || undefined;
        if (this.xsrfToken) {
          config.headers["x-xsrf-token"] = decodeURIComponent(this.xsrfToken);
        }
        return config;
      } catch (err) {
        console.error("[Interceptor Error] Error preparing request headers:", err?.message);
        return config;
      }
    }, error => Promise.reject(error));
    this.client.interceptors.response.use(response => {
      try {
        const setCookies = response?.headers?.["set-cookie"];
        if (setCookies) {
          setCookies.forEach(cookie => {
            const rawPart = cookie.split(";")[0] || "";
            const eqIndex = rawPart.indexOf("=");
            if (eqIndex !== -1) {
              const key = rawPart.substring(0, eqIndex).trim();
              const val = rawPart.substring(eqIndex + 1).trim();
              this.cookies[key] = val;
              if (key === "XSRF-TOKEN") {
                this.xsrfToken = val;
              }
            }
          });
        }
      } catch (err) {
        console.error("[Interceptor Error] Failed parsing cookies:", err?.message);
      }
      return response;
    }, error => Promise.reject(error));
  }
  async _val_voc(voiceId) {
    try {
      console.log(`[Process] Validating voice ID input: ${voiceId}`);
      const normalizedId = String(voiceId || "");
      const voiceExists = this.voices.some(v => v.id === normalizedId);
      if (!voiceExists) {
        console.error(`[Error] Voice ID "${voiceId}" is invalid or not found in registry`);
        return false;
      }
      console.log("[Process] Voice ID validation passed");
      return true;
    } catch (err) {
      console.error("[Error] Helper _val_voc failed:", err?.message || err);
      return false;
    }
  }
  async _res_aud(input) {
    try {
      console.log("[Process] Analyzing input audio parameter format...");
      if (!input) {
        console.error("[Error] Input audio parameter is undefined or empty");
        return null;
      }
      if (Buffer.isBuffer(input)) {
        console.log("[Process] Audio target resolved: Buffer format");
        return input;
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          console.log("[Process] Audio target resolved: URL string. Downloading resource...");
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer"
          });
          console.log("[Process] URL content fetched successfully");
          return Buffer.from(res?.data);
        }
        if (trimmed.startsWith("data:")) {
          console.log("[Process] Audio target resolved: Base64 Data URI. Extracting and decoding...");
          const base64Data = trimmed.split(";base64,").pop() || "";
          return Buffer.from(base64Data, "base64");
        }
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed);
        if (isBase64) {
          console.log("[Process] Audio target resolved: Raw Base64 string. Decoding...");
          return Buffer.from(trimmed, "base64");
        }
      }
      console.error("[Error] Provided format matches no supported type");
      return null;
    } catch (err) {
      console.error("[Error] Helper _res_aud failed:", err?.message || err);
      return null;
    }
  }
  async _get_pg() {
    try {
      console.log("[Process] Sending page visit request for handshake initiation...");
      await this.client.get("/tools/voice-changer", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          referer: "https://www.google.com/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      console.log("[Process] Handshake complete, local cookies synchronized");
      return true;
    } catch (err) {
      console.error("[Error] Helper _get_pg failed:", err?.message || err);
      return false;
    }
  }
  async _get_url(fileType, filename, extra) {
    try {
      console.log("[Process] Sending request for storage signing transaction...");
      const payload = {
        file_type: fileType || "audio/mpeg",
        filename: filename || null,
        ...extra
      };
      const res = await this.client.post("/api/upload/get-google-url", payload, {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("[Process] Signature response retrieved from endpoint");
      return res?.data || null;
    } catch (err) {
      console.error("[Error] Helper _get_url failed:", err?.message || err);
      return null;
    }
  }
  async _up_gcs(uploadUrl, buffer, fileType) {
    try {
      console.log("[Process] Streaming byte stream to temporary cloud storage destination...");
      await axios.put(uploadUrl, buffer, {
        headers: {
          ...this.baseHeaders,
          accept: "*/*",
          "content-type": fileType || "audio/mpeg",
          "content-length": buffer?.length,
          origin: "https://voice.ai",
          priority: "u=1, i",
          referer: "https://voice.ai/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-client-data": "CLjxygE="
        }
      });
      console.log("[Process] Cloud storage destination updated successfully");
      return true;
    } catch (err) {
      console.error("[Error] Helper _up_gcs failed:", err?.message || err);
      return false;
    }
  }
  async _q_proc(payload, extra) {
    try {
      console.log("[Process] Registering conversion job parameters to background queue...");
      const finalPayload = {
        ...payload,
        ...extra
      };
      const res = await this.client.post("/api/web-tools/queue/store/voice-changer", finalPayload, {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("[Process] Conversion parameters saved to queue successfully");
      return res?.data || null;
    } catch (err) {
      console.error("[Error] Helper _q_proc failed:", err?.message || err);
      return null;
    }
  }
  async generate({
    audio,
    ...rest
  }) {
    try {
      console.log("[Process] Starting generation flow...");
      const fileType = rest?.file_type || "audio/mpeg";
      const filename = rest?.filename || "Hello.mp3";
      const voiceId = rest?.voice_id || "10";
      const pitch = rest?.pitch !== undefined ? rest.pitch : 0;
      const duration = rest?.duration || 15;
      const isVoiceValid = await this._val_voc(voiceId);
      if (!isVoiceValid) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: `Voice ID "${voiceId}" is invalid. Available IDs: ${this.voices.map(v => v.id).join(", ")}`
          }
        };
      }
      const resolvedBuffer = await this._res_aud(audio);
      if (!resolvedBuffer) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Main conversion could not obtain buffer sequence from argument"
          }
        };
      }
      const pageInit = await this._get_pg();
      if (!pageInit) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Failed on initialization handshake stage"
          }
        };
      }
      const signature = await this._get_url(fileType, null, rest);
      const uploadUrl = signature?.url || "";
      if (!uploadUrl) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Failed to resolve target url from signature output"
          }
        };
      }
      const pathSegment = new URL(uploadUrl).pathname;
      const targetPath = pathSegment.substring(pathSegment.indexOf("tmp/")) || "";
      console.log(`[Process] Path reference found: ${targetPath}`);
      const uploadStatus = await this._up_gcs(uploadUrl, resolvedBuffer, fileType);
      if (!uploadStatus) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Direct storage file upload transaction failed"
          }
        };
      }
      const queuePayload = {
        path: targetPath,
        original_filename: filename,
        voice_id: voiceId,
        pitch: pitch,
        duration: duration
      };
      const processInfo = await this._q_proc(queuePayload, rest);
      const outputUrl = processInfo?.data?.url || null;
      if (!outputUrl) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Failed to resolve queue processing return url"
          }
        };
      }
      console.log("[Process] Generation completed successfully");
      return {
        status: "success",
        result: {
          success: true,
          output_url: outputUrl
        }
      };
    } catch (err) {
      console.error("[Process] Error occurred during active pipeline generation:", err?.message || err);
      return {
        status: "error",
        result: {
          success: false,
          error_message: err?.message || "Processing runtime exception"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.audio) {
    return res.status(400).json({
      error: "Parameter 'audio' diperlukan"
    });
  }
  const api = new VoiceAiClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}