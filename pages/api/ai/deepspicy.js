import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class DeepSpicy {
  constructor() {
    this.apikey = "AIzaSyAxXKeWMujmvD13LCnuzbEutnCt22gX5qA";
    this.cookies = {};
    this.visitorId = this.vid();
  }
  vid() {
    try {
      const generated = crypto.randomBytes(16).toString("hex");
      console.log(`[Debug] Generated visitorId: ${generated}`);
      return generated;
    } catch (error) {
      console.log(`[Debug] Error generating visitorId, fallback applied: ${error?.message}`);
      return "855c6ae1430e8fda8501cf99933c4790";
    }
  }
  dec(token) {
    try {
      const parts = token?.split(".") || [];
      if (parts.length < 2) {
        console.log("[Debug] Invalid token format for parsing JWT payload");
        return {};
      }
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const raw = Buffer.from(base64, "base64").toString("utf8");
      const parsed = JSON.parse(raw);
      console.log(`[Debug] Token decoded payload user_id: ${parsed?.user_id || "anonymous"}`);
      return parsed;
    } catch (error) {
      console.log(`[Debug] Token payload decoding failed: ${error?.message}`);
      return {};
    }
  }
  _save(cookieHeaders) {
    if (!cookieHeaders) return;
    try {
      const list = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
      for (const cookie of list) {
        const pair = cookie.split(";")[0]?.split("=") || [];
        if (pair.length === 2) {
          const key = pair[0].trim();
          const val = pair[1].trim();
          this.cookies[key] = val;
          console.log(`[Debug] Cookie saved: ${key}=${val.substring(0, 8)}...`);
        }
      }
    } catch (error) {
      console.log(`[Debug] Saving cookies failed: ${error?.message}`);
    }
  }
  _load() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ") || "";
  }
  headers(token = null) {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      ...token ? {
        authorization: `Bearer ${token}`
      } : {},
      "cache-control": "no-cache",
      origin: "https://deepspicy.com",
      pragma: "no-cache",
      referer: "https://deepspicy.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
    };
  }
  async req(options) {
    try {
      const headers = options.headers || {};
      const cookieStr = this._load();
      if (cookieStr) {
        headers["Cookie"] = cookieStr;
      }
      console.log(`[Debug] Sending Request: ${options.method || "GET"} -> ${options.url}`);
      const response = await axios({
        ...options,
        headers: headers
      });
      const setCookie = response?.headers["set-cookie"] || response?.headers["Set-Cookie"];
      if (setCookie) {
        this._save(setCookie);
      }
      console.log(`[Debug] Response Success: Code ${response?.status}`);
      return response?.data || null;
    } catch (error) {
      const errorMsg = error?.response?.data?.error?.message || error?.message;
      console.log(`[Debug] HTTP Request failure: ${errorMsg}`);
      return null;
    }
  }
  async mail() {
    try {
      console.log("[Process] Creating new email hook...");
      const res = await this.req({
        method: "GET",
        url: `https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`,
        headers: this.headers()
      });
      const email = res?.email || null;
      if (!email) {
        console.log("[Debug] Target email is missing in mail server response payload");
        return null;
      }
      console.log(`[Process] Email active: ${email}`);
      return email;
    } catch (error) {
      console.log(`[Debug] Mail generation failed: ${error?.message}`);
      return null;
    }
  }
  async otp(email, retries = 30) {
    try {
      console.log(`[Process] Checking inbox for verification email...`);
      for (let i = 0; i < retries; i++) {
        const res = await this.req({
          method: "GET",
          url: `https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`,
          headers: this.headers()
        });
        const messages = res?.data || [];
        console.log(`[Debug] Poll inbox: Received ${messages.length} message(s) in attempt ${i + 1}/${retries}`);
        for (const msg of messages) {
          const html = msg?.html_content || "";
          if (!html) continue;
          const $ = cheerio.load(html);
          const href = $('a[href*="oobCode="]').attr("href");
          console.log(`[Debug] Extracted link candidate: ${href || "None"}`);
          if (href) {
            const match = href.match(/oobCode=([^&"'\s]+)/);
            if (match?.[1]) {
              console.log("[Process] oobCode parameter successfully parsed from HTML.");
              return match[1];
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
      console.log("[Debug] Verification link polling timed out");
      return null;
    } catch (error) {
      console.log(`[Debug] Verification link parsing error: ${error?.message}`);
      return null;
    }
  }
  async tok(customEmail = null) {
    try {
      const email = customEmail || await this.mail();
      if (!email) {
        console.log("[Debug] Session initialization stopped: Invalid temporary email context");
        return {
          token: null,
          email: null
        };
      }
      console.log(`[Process] Dispatching OOB Code request...`);
      const oobSendResult = await this.req({
        method: "POST",
        url: `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${this.apikey}`,
        headers: this.headers(),
        data: {
          requestType: "EMAIL_SIGNIN",
          email: email,
          clientType: "CLIENT_TYPE_WEB",
          continueUrl: "https://deepspicy.com",
          canHandleCodeInApp: true
        }
      });
      if (!oobSendResult) {
        console.log("[Debug] Failed dispatching OOB Code link trigger");
        return {
          token: null,
          email: null
        };
      }
      const oobCode = await this.otp(email);
      if (!oobCode) {
        console.log("[Debug] Exiting authentication pipeline: No verification oobCode acquired");
        return {
          token: null,
          email: null
        };
      }
      console.log("[Process] Exchanging action link (oobCode) for authentic ID Token...");
      const authRes = await this.req({
        method: "POST",
        url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${this.apikey}`,
        headers: this.headers(),
        data: {
          email: email,
          oobCode: oobCode
        }
      });
      const idToken = authRes?.idToken || null;
      if (!idToken) {
        console.log("[Debug] Identity exchange process returned null or invalid session token");
        return {
          token: null,
          email: null
        };
      }
      console.log("[Process] Verified authentication session successfully loaded.");
      return {
        token: idToken,
        email: email
      };
    } catch (error) {
      console.log(`[Debug] Authorization routine failed: ${error?.message}`);
      return {
        token: null,
        email: null
      };
    }
  }
  async img(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) {
        console.log("[Debug] Normalizing image from raw Buffer format");
        return {
          buffer: input,
          mime: "image/jpeg"
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log(`[Process] Fetching external image: ${input}`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = res?.headers?.["content-type"] || "image/jpeg";
          return {
            buffer: Buffer.from(res?.data),
            mime: mime
          };
        }
        if (input.startsWith("data:image")) {
          console.log("[Debug] Parsing image from base64 Data URI string");
          const match = input.match(/^data:(image\/[^;]+);base64,(.+)$/);
          if (match) {
            return {
              buffer: Buffer.from(match[2], "base64"),
              mime: match[1]
            };
          }
        }
        console.log("[Debug] Converting raw string input directly to Base64 buffer");
        return {
          buffer: Buffer.from(input, "base64"),
          mime: "image/jpeg"
        };
      }
    } catch (error) {
      console.log(`[Debug] Image converter system error: ${error?.message}`);
    }
    return null;
  }
  async upl(imageInput, token) {
    try {
      const resolved = await this.img(imageInput);
      if (!resolved) {
        console.log("[Debug] Upload aborted: Unresolved image descriptor input");
        return null;
      }
      const payload = this.dec(token);
      const userId = payload?.user_id || payload?.sub || "anonymous";
      const timestamp = Date.now();
      const randStr = crypto.randomBytes(5).toString("hex");
      const storagePath = `fal-image/${userId}/${timestamp}-${randStr}_processed.jpg`;
      console.log(`[Process] Uploading image to storage: ${storagePath}`);
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/ai-generator-67bc6.firebasestorage.app/o?name=${encodeURIComponent(storagePath)}`;
      const storageHeaders = {
        ...this.headers(),
        authorization: `Firebase ${token}`,
        "content-type": resolved.mime,
        "x-firebase-storage-version": "webjs/11.7.1"
      };
      const res = await this.req({
        method: "POST",
        url: uploadUrl,
        headers: storageHeaders,
        data: resolved.buffer
      });
      if (!res) {
        console.log("[Debug] Upload aborted: No storage metadata response returned");
        return null;
      }
      const downloadToken = res?.downloadTokens || "";
      const finalUrl = `https://firebasestorage.googleapis.com/v0/b/ai-generator-67bc6.firebasestorage.app/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
      console.log("[Process] Upload complete. Firebase media URL created.");
      return finalUrl;
    } catch (error) {
      console.log(`[Debug] Presigned upload operation error: ${error?.message}`);
      return null;
    }
  }
  async poll(token, sinceTimestamp, visitorId, targetTaskIds, limit = 60) {
    try {
      const targets = Array.isArray(targetTaskIds) ? targetTaskIds : [targetTaskIds];
      const completedTasks = {};
      console.log(`[Process] Monitoring ${targets.length} active generation task(s)...`);
      for (let i = 1; i <= limit; i++) {
        console.log(`[Process] Checking generation state (Attempt ${i}/${limit})...`);
        const res = await this.req({
          method: "POST",
          url: "https://us-central1-ai-generator-67bc6.cloudfunctions.net/getMyGenerationHistory",
          headers: this.headers(token),
          data: {
            data: {
              sinceTimestamp: sinceTimestamp,
              modelTypes: ["flux", "fluxNsfw", "Realism", "Anime", "basic_fal_wan_image_to_image", "pro_fal_wan_image_to_image", "plus_mulerouter_image_to_image"],
              visitorId: visitorId
            }
          }
        });
        const tasks = res?.result?.data?.tasks || res?.result?.tasks || [];
        console.log(`[Debug] Poll tasks retrieved: found ${tasks.length} tasks matching search constraints`);
        for (const id of targets) {
          if (completedTasks[id]) continue;
          const match = tasks.find(t => t.id === id);
          if (match) {
            const status = match.prediction_status || "failed";
            console.log(`[Debug] Tracked taskId ${id} state update: ${status}`);
            if (status === "succeeded") {
              completedTasks[id] = {
                status: "succeeded",
                url: match.output_url || match.output_url_inner || null
              };
            } else if (status === "failed" || status === "canceled") {
              completedTasks[id] = {
                status: "failed",
                url: null
              };
            }
          }
        }
        const completedCount = Object.keys(completedTasks).length;
        if (completedCount === targets.length) {
          console.log("[Process] All active tasks resolved.");
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
      const outputUrls = targets.map(id => completedTasks[id]?.url).filter(Boolean);
      console.log(`[Debug] Resolved output urls payload: ${outputUrls.length} file(s) created`);
      return {
        status: outputUrls.length === targets.length ? "succeeded" : "failed",
        result: Array.isArray(targetTaskIds) ? outputUrls : outputUrls[0] || null
      };
    } catch (error) {
      console.log(`[Debug] Polling operation error: ${error?.message}`);
      return {
        status: "error",
        result: null
      };
    }
  }
  async generate({
    token,
    prompt,
    image,
    ...rest
  }) {
    try {
      let activeToken = token || null;
      let activeEmail = rest?.email || null;
      const startTimestamp = Date.now();
      if (!activeToken) {
        console.log("[Process] Token is missing, initializing verified login session...");
        const authData = await this.tok();
        activeToken = authData?.token;
        activeEmail = authData?.email;
        if (!activeToken) {
          console.log("[Debug] Execution stopped: Authentication token dispatch failed");
          return {
            status: "error",
            result: "Identity token verification failed",
            token: null
          };
        }
      }
      const currentVisitorId = rest?.visitorId || this.visitorId;
      const modelType = rest?.model_type || "Realism";
      const numOutputs = rest?.num_outputs || 1;
      const version = rest?.version || "basic";
      const isRealismOrAnime = modelType === "Realism" || modelType === "Anime";
      const steps = rest?.steps || (isRealismOrAnime ? version === "pro" ? 30 : 20 : 8);
      const resolution = isRealismOrAnime ? "1K" : rest?.resolution || "1K";
      let triggerUrl = "https://us-central1-ai-generator-67bc6.cloudfunctions.net/fluxV2";
      let payloadData = {
        prompt: prompt || "Scenic view",
        num_outputs: numOutputs,
        aspect_ratio: rest?.aspect_ratio || "1:1",
        model_type: modelType,
        steps: steps,
        resolution: resolution,
        email: activeEmail || "temporary_user@emailhook.site",
        visitorId: currentVisitorId,
        ...isRealismOrAnime ? {
          version: version
        } : {},
        ...modelType === "fluxNsfw" ? {
          guidance_scale: rest?.guidance_scale || 3
        } : {}
      };
      if (image) {
        const uploadedImageUrl = await this.upl(image, activeToken);
        if (!uploadedImageUrl) {
          console.log("[Debug] Image editing aborted: Media upload step was unresolved");
          return {
            status: "error",
            result: "Image upload failed",
            token: activeToken
          };
        }
        triggerUrl = "https://us-central1-ai-generator-67bc6.cloudfunctions.net/imageToImage";
        payloadData = {
          visitorId: currentVisitorId,
          modelVersion: version,
          prompt: prompt || "Scenic view",
          imageUrl: uploadedImageUrl,
          email: activeEmail || "temporary_user@emailhook.site",
          image_size: rest?.image_size || "default",
          source_image_width: rest?.source_image_width || 2560,
          source_image_height: rest?.source_image_height || 2560
        };
      } else if (numOutputs > 1) {
        triggerUrl = "https://us-central1-ai-generator-67bc6.cloudfunctions.net/fluxV2Batch";
      }
      console.log(`[Process] Executing pipeline trigger to: ${triggerUrl}`);
      const triggerRes = await this.req({
        method: "POST",
        url: triggerUrl,
        headers: {
          ...this.headers(activeToken),
          "content-type": "application/json"
        },
        data: {
          data: payloadData
        }
      });
      if (!triggerRes) {
        console.log("[Debug] Pipeline processing aborted: Null trigger response payload returned");
        return {
          status: "error",
          result: "Trigger invocation failed",
          token: activeToken
        };
      }
      let targetTaskIds = [];
      const dataItems = triggerRes?.result?.items || triggerRes?.result?.data?.items || [];
      if (dataItems.length > 0) {
        targetTaskIds = dataItems.filter(item => item.success && item.taskId).map(item => item.taskId);
      } else {
        const singleTaskId = triggerRes?.result?.taskId || triggerRes?.result?.data?.taskId;
        if (singleTaskId) {
          targetTaskIds = [singleTaskId];
        }
      }
      console.log(`[Debug] Task list created for tracking: ${targetTaskIds.join(", ")}`);
      if (targetTaskIds.length === 0) {
        console.log("[Debug] Trigger completed but target taskId list is empty");
        return {
          status: "error",
          result: "Failed starting cloud tasks",
          token: activeToken
        };
      }
      const pollResult = await this.poll(activeToken, startTimestamp, currentVisitorId, numOutputs > 1 ? targetTaskIds : targetTaskIds[0], 60);
      return {
        status: pollResult?.status || "failed",
        result: pollResult?.result || null,
        token: activeToken
      };
    } catch (error) {
      console.log(`[Error] Generation core aborted: ${error?.message}`);
      return {
        status: "error",
        result: error?.message || "Unidentified pipeline error",
        token: token || null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new DeepSpicy();
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