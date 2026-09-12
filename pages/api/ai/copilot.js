import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import WebSocket from "ws";
class CopilotClient {
  constructor() {
    this.cfg = {
      base: "https://copilot.microsoft.com",
      ua: "BingNative/latest-prod (Linux; Android 10; K)"
    };
    this.activeCookie = null;
    this.activeSessionId = this.genId();
    this.initialized = false;
  }
  genId() {
    try {
      return crypto.randomUUID();
    } catch (err) {
      console.error(`[CRYPTO ERR] Failed to generate UUID: ${err.message}`);
      return "12345678-1234-4321-1234-1234567890ab";
    }
  }
  async upload(imageBuffer, mimeType = "image/jpeg") {
    console.log("[ATTACHMENT] Uploading image payload via FormData...");
    try {
      if (!this.activeCookie) {
        return {
          status: "failed",
          result: "Cookie missing for attachment upload."
        };
      }
      const form = new FormData();
      form.append("file", imageBuffer, {
        filename: "upload.jpg",
        contentType: mimeType
      });
      const res = await axios.post(`${this.cfg.base}/c/api/attachments`, form, {
        headers: {
          "User-Agent": this.cfg.ua,
          "X-Search-UILang": "en",
          Cookie: this.activeCookie,
          ...form.getHeaders()
        }
      });
      if (res.data && res.data.url) {
        console.log(`[ATTACHMENT SUCCESS] Image uploaded: ${res.data.url}`);
        return {
          status: "success",
          result: res.data.url
        };
      }
      return {
        status: "failed",
        result: `Failed to upload attachment: ${JSON.stringify(res.data)}`
      };
    } catch (error) {
      console.error(`[ATTACHMENT ERR] Upload process failed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async start(conversationId = "") {
    console.log("[CONVERSATION] Handshaking new chat session...");
    try {
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": this.cfg.ua,
        "X-Search-UILang": "en"
      };
      if (this.activeCookie) {
        headers["Cookie"] = this.activeCookie;
      }
      const res = await axios.post(`${this.cfg.base}/c/api/start`, {
        timeZone: "Asia/Makassar",
        startNewConversation: !conversationId,
        teenSupportEnabled: true,
        correctPersonalizationSetting: true,
        deferredDataUseCapable: true
      }, {
        headers: headers
      });
      const setCookie = res.headers["set-cookie"];
      if (setCookie && setCookie.length > 0) {
        const newCookies = setCookie.map(c => c.split(";")[0]).join("; ");
        this.activeCookie = this.activeCookie ? `${this.activeCookie}; ${newCookies}` : newCookies;
      }
      let activeConvId = conversationId;
      if (!activeConvId) {
        if (!res.data?.currentConversationId) {
          return {
            status: "failed",
            result: "Failed to create Copilot conversation."
          };
        }
        activeConvId = res.data.currentConversationId;
      }
      console.log(`[CONVERSATION SUCCESS] Sesi terikat: ${activeConvId}`);
      this.initialized = true;
      return {
        status: "success",
        result: activeConvId
      };
    } catch (error) {
      console.error(`[CONVERSATION ERR] Sesi handshake gagal: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async slvM(media) {
    try {
      if (Buffer.isBuffer(media)) {
        return media;
      }
      if (typeof media === "string") {
        if (media.startsWith("http")) {
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(media.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      return {
        status: "failed",
        result: "Format media tidak didukung"
      };
    } catch (error) {
      console.error(`[MEDIA ERR] Error resolving buffer: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async chat(question, {
    mode = "search",
    conversationId = "",
    imageUrl = "",
    imageBuffer = null
  } = {}) {
    try {
      const MODELS = ["search", "study", "default"];
      if (!question && !imageUrl && !imageBuffer) {
        return {
          status: "failed",
          result: "Question or Image is required."
        };
      }
      if (!MODELS.includes(mode)) {
        return {
          status: "failed",
          result: `Available modes: ${MODELS.join(", ")}.`
        };
      }
      if (!conversationId || !this.activeCookie) {
        const startRes = await this.start(conversationId);
        if (startRes.status === "failed") return startRes;
        conversationId = startRes.result;
      }
      let attachmentPath = null;
      if (imageBuffer) {
        const uploadRes = await this.upload(imageBuffer);
        if (uploadRes.status === "failed") return uploadRes;
        attachmentPath = uploadRes.result;
      } else if (imageUrl && imageUrl.startsWith("http")) {
        const buf = await this.slvM(imageUrl);
        if (buf.status === "failed") return buf;
        const uploadRes = await this.upload(buf);
        if (uploadRes.status === "failed") return uploadRes;
        attachmentPath = uploadRes.result;
      } else if (imageUrl && imageUrl.startsWith("/attachments/")) {
        attachmentPath = imageUrl;
      }
      return new Promise(resolve => {
        console.log("[WEBSOCKET] Initiating live connection to Copilot chat endpoint...");
        const wsUrl = `wss://copilot.microsoft.com/c/api/chat?api-version=2&clientSessionId=${this.activeSessionId}`;
        const ws = new WebSocket(wsUrl, {
          headers: {
            "User-Agent": this.cfg.ua,
            "X-Search-UILang": "en",
            Cookie: this.activeCookie || ""
          }
        });
        let fullText = "";
        let messageId = null;
        let isResolved = false;
        ws.on("open", () => {
          console.log("[WEBSOCKET] Connected. Writing handshake option frame...");
          ws.send(JSON.stringify({
            event: "setOptions",
            supportedCards: ["consentV2", "finance", "flashcard", "image", "local", "personalArtifacts", "quiz", "recipe", "safetyHelpline", "sports", "navigation"],
            supportedActions: [],
            supportedFeatures: ["composer-prefill-conversation-action", "composer-send-conversation-action-v2", "short-conversation-action", "session-duration-nudge"]
          }));
          const contentPayload = [];
          if (attachmentPath) {
            contentPayload.push({
              type: "image",
              url: attachmentPath
            });
          }
          if (question) {
            contentPayload.push({
              type: "text",
              text: question
            });
          }
          const sendPayload = {
            event: "send",
            content: contentPayload,
            conversationId: conversationId
          };
          if (mode !== "default") {
            sendPayload.mode = mode;
          }
          ws.send(JSON.stringify(sendPayload));
        });
        ws.on("message", event => {
          try {
            const data = JSON.parse(event.toString());
            if (data.event === "appendText" && data.text) {
              fullText += data.text;
              process.stdout.write(data.text);
            }
            if (data.event === "done") {
              messageId = data.messageId;
              isResolved = true;
              ws.close();
              resolve({
                status: "success",
                result: {
                  text: fullText.trim(),
                  conversationId: conversationId,
                  parentMessageId: messageId
                }
              });
            }
          } catch (err) {}
        });
        ws.on("error", err => {
          if (!isResolved) {
            isResolved = true;
            resolve({
              status: "failed",
              result: `WebSocket error: ${err.message || err}`
            });
          }
        });
        ws.on("close", () => {
          if (!isResolved) {
            isResolved = true;
            resolve({
              status: "success",
              result: {
                text: fullText.trim(),
                conversationId: conversationId,
                parentMessageId: messageId
              }
            });
          }
        });
      });
    } catch (error) {
      console.error(`[CHAT CONTROL ERR] Live chat session crashed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async generate({
    mode = "search",
    prompt,
    media,
    ...rest
  }) {
    try {
      const response = await this.chat(prompt, {
        mode: mode,
        imageUrl: typeof media === "string" ? media : "",
        imageBuffer: Buffer.isBuffer(media) ? media : null,
        ...rest
      });
      return response;
    } catch (error) {
      console.error(`[GEN CONTROL ERR] General execution crashed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
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
  const api = new CopilotClient();
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