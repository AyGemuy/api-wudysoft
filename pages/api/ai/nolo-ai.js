import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class NoloAI {
  constructor() {
    try {
      this.corsProxy = proxy;
      this.originBase = "https://www.nolo-app.com";
      this.http = axios.create({
        baseURL: `${this.corsProxy}${this.originBase}`,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://www.nolo-app.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.nolo-app.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
    } catch (e) {
      console.error("[NOLO Init Error]:", e?.message);
    }
  }
  _genNoloId() {
    try {
      const bytes = new Uint8Array(40);
      crypto.webcrypto.getRandomValues(bytes);
      const A = "abcdefghijklmnopqrstuvwxyz0123456789";
      let s = "";
      for (let i = 0; i < bytes.length; i++) {
        s += A[bytes[i] % 36];
      }
      return "nolo_" + s;
    } catch {
      return `nolo_${Date.now()}${Math.random().toString(36).slice(2)}`;
    }
  }
  _sid() {
    try {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let s = "";
      const bytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
      return `${Date.now()}-${s}`;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
  _streamId() {
    try {
      return crypto.randomUUID ? crypto.randomUUID() : this._genNoloId().replace("nolo_", "");
    } catch {
      return this._sid();
    }
  }
  _b64Enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch {
      return null;
    }
  }
  _b64Dec(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch {
      return null;
    }
  }
  async _formatImageBase64(img) {
    try {
      if (!img || typeof img !== "string") return null;
      if (img.startsWith("data:image/")) return img;
      if (img.startsWith("http://") || img.startsWith("https://")) {
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        const mime = res.headers["content-type"] || "image/jpeg";
        const b64 = Buffer.from(res.data).toString("base64");
        return `data:${mime};base64,${b64}`;
      }
      return `data:image/jpeg;base64,${img}`;
    } catch {
      return null;
    }
  }
  _sanitizeHistory(msgs) {
    try {
      if (!Array.isArray(msgs)) return [];
      return msgs.map(msg => {
        const role = msg?.role || "user";
        const content = msg?.content;
        if (typeof content === "string") return {
          role: role,
          content: content
        };
        if (Array.isArray(content)) {
          const parts = content.map(p => {
            if (p?.type === "text") return {
              type: "text",
              text: p.text || ""
            };
            if (p?.type === "image_url") return p.image_url?.url ? {
              type: "image_url",
              image_url: {
                url: p.image_url.url
              }
            } : null;
            return null;
          }).filter(Boolean);
          if (!parts.length) return null;
          if (parts.length === 1 && parts[0].type === "text") {
            return {
              role: role,
              content: parts[0].text || ""
            };
          }
          return {
            role: role,
            content: parts
          };
        }
        return null;
      }).filter(Boolean);
    } catch {
      return [];
    }
  }
  _cleanText(txt) {
    try {
      let s = String(txt || "");
      s = s.replace(/<!--\s*(NOLO_IMAGE_DECK|NOLO_SLIDES|MEM):[\s\S]*?-->/gi, "");
      s = s.replace(/\[(?:SEARCH|MARKET|IMAGE_EDIT|IMAGE|WEATHER|HTML|QR|MAP|VISION_REVIEW):[\s\S]{0,2200}?\]/gi, "");
      s = s.replace(/\[\+?\d+\s*sources?\]/gi, "").replace(/\[search\]/gi, "").replace(/\[web_search\]/gi, "");
      s = s.replace(/\[source:[^\]]{0,120}\]/gi, "").replace(/\[result(?:[_ ]search)?[^\]]{0,120}\]/gi, "");
      s = s.replace(/\u3010[^\u3011]{0,120}\u3011/g, "").replace(/\[\d+[\u2020\u2021*†][^\]]{0,40}\]/g, "");
      s = s.replace(/\[\[\d+\]\]/g, "").replace(/\[\d{1,3}\](?:[ \t]?\[\d{1,3}\])*/g, "");
      s = s.replace(/\[ARTIFACT(?:[ _]EDIT)?(?:\s+id="[^"]+")?\][\s\S]*?\[\/ARTIFACT(?:[ _]EDIT)?\]/g, "");
      s = s.replace(/\[ARTIFACT(?:[ _]EDIT)?(?:\s+id="[^"]+")?\][\s\S]*$/, "");
      s = s.replace(/\[FILE\][\s\S]*?\[\/FILE\]/g, "").replace(/```[ \t]*\[?FILE\]?[ \t]*\r?\n[\s\S]*?```/gi, "");
      s = s.replace(/\[FILE\][\s\S]*$/, "").replace(/```[ \t]*\[?FILE\]?[ \t]*\r?\n[\s\S]*$/i, "");
      s = s.replace(/^[ \t]*[<{(]\s*use[ _]?skill\s*:\s*[a-z_]+\s*[>})][ \t]*$/gim, "");
      s = s.replace(/\n{3,}/g, "\n\n");
      return s.trim();
    } catch {
      return String(txt || "").trim();
    }
  }
  async _parseWorkerStream(stream) {
    try {
      return new Promise((resolve, reject) => {
        let fullText = "";
        let imagesPrefix = "";
        const chunks = [];
        const seenImgs = new Set();
        let buffer = "";
        stream.on("data", chunk => {
          try {
            buffer += chunk.toString("utf-8");
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                chunks.push(parsed);
                if (parsed?.type === "image_generated" && typeof parsed.url === "string") {
                  if (!seenImgs.has(parsed.url)) {
                    seenImgs.add(parsed.url);
                    const safePrompt = String(parsed.prompt || "").replace(/[\[\]()]/g, "").slice(0, 300);
                    imagesPrefix += `![${safePrompt || "Generated image"}](${parsed.url})\n\n`;
                  }
                }
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                }
              } catch {}
            }
          } catch (e) {
            reject(e);
          }
        });
        stream.on("end", () => resolve({
          fullText: fullText,
          imagesPrefix: imagesPrefix,
          chunks: chunks
        }));
        stream.on("error", err => reject(err));
      });
    } catch (e) {
      return {
        fullText: "",
        imagesPrefix: "",
        chunks: []
      };
    }
  }
  async checkUsage(userId) {
    try {
      console.log("[NOLO] Checking usage limits...");
      const uid = userId || "nolo_xrapeaw8qjgx7xofz9pme0omkcw8aadt9jium81q";
      const res = await this.http.post("/api/usage", {
        action: "check",
        userId: uid
      });
      return {
        status: true,
        result: res?.data || null,
        chunks: [],
        state: null
      };
    } catch (error) {
      console.error("[NOLO Error] checkUsage:", error?.message);
      return {
        status: false,
        result: error?.response?.data || error?.message || "Error checking usage",
        chunks: [],
        state: null
      };
    }
  }
  async generateTitle(prompt) {
    try {
      console.log("[NOLO] Generating chat title...");
      const res = await this.http.post("/api/chat", {
        messages: [{
          role: "user",
          content: prompt || "New Chat"
        }],
        titleGen: true,
        existingTitles: []
      });
      return {
        status: true,
        result: res?.data?.title || null,
        chunks: [],
        state: null
      };
    } catch (error) {
      console.error("[NOLO Error] generateTitle:", error?.message);
      return {
        status: false,
        result: error?.response?.data || error?.message || "Error generating title",
        chunks: [],
        state: null
      };
    }
  }
  async chat({
    state,
    prompt,
    messages,
    image,
    model,
    ...rest
  }) {
    try {
      console.log("[NOLO] Initializing chat stream...");
      const decodedState = state ? this._b64Dec(state) : null;
      const userId = rest?.userId || decodedState?.user_id || "nolo_xrapeaw8qjgx7xofz9pme0omkcw8aadt9jium81q";
      const sessionId = rest?.sessionId || decodedState?.session_id || this._sid();
      const streamId = rest?.streamId || this._streamId();
      let chatTitle = decodedState?.title || null;
      console.log(`[NOLO] Validating credits for user: ${userId}...`);
      const usageCheck = await this.checkUsage(userId);
      const usageData = usageCheck?.status ? usageCheck.result : null;
      let creditsLeft = usageData?.creditsLeft ?? decodedState?.credits_left ?? null;
      if (creditsLeft !== null && creditsLeft <= 0) {
        console.warn("[NOLO] Credit limit reached.");
        return {
          status: false,
          result: {
            text: "Credit limit reached. Daily reset required.",
            chat_result: null,
            job_result: null,
            title: chatTitle,
            credits_left: 0
          },
          chunks: [],
          state: state || null
        };
      }
      const baseMessages = Array.isArray(messages) ? [...messages] : decodedState?.messages ? [...decodedState.messages] : [];
      if (prompt !== undefined && prompt !== null && prompt !== "") {
        let userContent;
        if (image) {
          const imgB64 = await this._formatImageBase64(image);
          userContent = [{
            type: "text",
            text: prompt
          }, {
            type: "image_url",
            image_url: {
              url: imgB64
            }
          }];
        } else {
          userContent = prompt;
        }
        baseMessages.push({
          role: "user",
          content: userContent
        });
      }
      let titlePromise = null;
      if (!chatTitle && baseMessages.length === 1) {
        const firstPromptText = typeof baseMessages[0].content === "string" ? baseMessages[0].content : Array.isArray(baseMessages[0].content) ? baseMessages[0].content.find(p => p.type === "text")?.text || "" : "";
        if (firstPromptText) {
          titlePromise = this.generateTitle(firstPromptText).then(res => res?.status ? res.result : null).catch(() => null);
        }
      }
      const payload = {
        messages: this._sanitizeHistory(baseMessages),
        artifactContext: rest?.artifactContext || [],
        fileInputs: rest?.fileInputs || [],
        settings: {
          model: model || rest?.model || "nolo-fast",
          memory: rest?.memory || "",
          learnedMemory: rest?.learnedMemory || [],
          projectInstructions: rest?.projectInstructions || "",
          chatPin: rest?.chatPin || "",
          contextWindowTokens: rest?.contextWindowTokens || 64e3,
          imageQuality: rest?.imageQuality || "medium",
          autoPhotos: rest?.autoPhotos ?? true,
          backgroundStream: rest?.backgroundStream ?? true,
          ...rest?.settings || {}
        },
        streamId: streamId,
        sessionId: sessionId,
        stream: rest?.stream ?? true,
        userId: userId,
        notifyOnComplete: rest?.notifyOnComplete ?? false,
        notifyBodyText: rest?.notifyBodyText || "That's it! Come back whenever you're ready",
        notifyBodyImage: rest?.notifyBodyImage || "Finished creating your image, come see it",
        notifyBodyOther: rest?.notifyBodyOther || "Finished what you asked for, take a look",
        currentDate: rest?.currentDate || "Thu, 27 Aug 2026 04:52:03 GMT",
        thinking: rest?.thinking || "off",
        thinkingSeconds: rest?.thinkingSeconds || 60,
        velocidad: rest?.velocidad || "auto",
        webSearch: rest?.webSearch ?? true,
        ...rest
      };
      console.log(`[NOLO] Sending chat POST (Model: ${payload.settings.model}, User: ${userId})...`);
      const response = await this.http.post("/api/chat", payload, {
        responseType: "stream"
      });
      let fullText = "";
      let imagesPrefix = "";
      let chunks = [];
      let workerJob = null;
      let chatResult = null;
      let jobResult = null;
      const seenImgs = new Set();
      const readerPromise = new Promise((resolve, reject) => {
        try {
          let buffer = "";
          response.data.on("data", chunk => {
            try {
              buffer += chunk.toString("utf-8");
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  chunks.push(parsed);
                  if (parsed?.type === "job" && parsed?.url && parsed?.jobId && parsed?.readToken) {
                    workerJob = parsed;
                  }
                  if (parsed?.type === "usage" && typeof parsed.credits === "number") {
                    creditsLeft = usageData?.creditsBudget ? Math.max(0, usageData.creditsBudget - parsed.credits) : creditsLeft;
                  }
                  if (parsed?.type === "image_generated" && typeof parsed.url === "string") {
                    if (!seenImgs.has(parsed.url)) {
                      seenImgs.add(parsed.url);
                      const safePrompt = String(parsed.prompt || "").replace(/[\[\]()]/g, "").slice(0, 300);
                      imagesPrefix += `![${safePrompt || "Generated image"}](${parsed.url})\n\n`;
                    }
                  }
                  const delta = parsed?.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullText += delta;
                  }
                } catch {}
              }
            } catch (e) {
              reject(e);
            }
          });
          response.data.on("end", () => resolve());
          response.data.on("error", err => reject(err));
        } catch (e) {
          reject(e);
        }
      });
      await readerPromise;
      chatResult = {
        text: this._cleanText((imagesPrefix + fullText).trim()),
        has_job: !!workerJob,
        job_info: workerJob || null
      };
      if (workerJob?.url && workerJob?.jobId) {
        try {
          console.log("[NOLO] Reading worker stream job...");
          const workerUrl = `${this.corsProxy}${workerJob.url}/v1/jobs/${workerJob.jobId}?from=0`;
          const workerRes = await axios.get(workerUrl, {
            headers: {
              accept: "*/*",
              "accept-language": "id-ID",
              authorization: `Bearer ${workerJob.readToken}`,
              "cache-control": "no-cache",
              origin: "https://www.nolo-app.com",
              pragma: "no-cache",
              priority: "u=1, i",
              referer: "https://www.nolo-app.com/",
              "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
              "sec-ch-ua-mobile": "?1",
              "sec-ch-ua-platform": '"Android"',
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "cross-site",
              "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
            },
            responseType: "stream"
          });
          const workerOut = await this._parseWorkerStream(workerRes.data);
          if (!fullText) {
            fullText = workerOut.fullText;
            imagesPrefix = workerOut.imagesPrefix || imagesPrefix;
          }
          chunks = [...chunks, ...workerOut.chunks];
          jobResult = {
            job_id: workerJob.jobId,
            url: workerJob.url,
            raw_text: (workerOut.imagesPrefix + workerOut.fullText).trim(),
            cleaned_text: this._cleanText((workerOut.imagesPrefix + workerOut.fullText).trim())
          };
          axios.delete(`${this.corsProxy}${workerJob.url}/v1/jobs/${workerJob.jobId}`, {
            headers: {
              authorization: `Bearer ${workerJob.readToken}`
            }
          }).catch(() => {});
        } catch (e) {
          console.error("[NOLO Worker Job Error]:", e?.message);
        }
      }
      if (titlePromise) {
        chatTitle = await titlePromise || chatTitle;
      }
      const combinedRaw = (imagesPrefix + fullText).trim();
      const finalResultText = this._cleanText(combinedRaw);
      const updatedMessages = [...baseMessages, {
        role: "assistant",
        content: finalResultText
      }];
      const nextState = this._b64Enc({
        user_id: userId,
        session_id: sessionId,
        title: chatTitle,
        credits_left: creditsLeft,
        messages: updatedMessages
      });
      return {
        status: true,
        result: {
          text: finalResultText,
          chat_result: chatResult,
          job_result: jobResult,
          title: chatTitle,
          credits_left: creditsLeft
        },
        chunks: chunks,
        state: nextState
      };
    } catch (error) {
      let errorDetail = error?.message || "Chat request failed";
      try {
        if (error?.response?.data) {
          if (typeof error.response.data.read === "function") {
            const buf = error.response.data.read();
            errorDetail = buf ? buf.toString("utf-8") : errorDetail;
          } else {
            errorDetail = error.response.data;
          }
        }
      } catch {}
      console.error("[NOLO Error] chat:", typeof errorDetail === "object" ? JSON.stringify(errorDetail) : errorDetail);
      return {
        status: false,
        result: {
          text: typeof errorDetail === "object" ? JSON.stringify(errorDetail) : errorDetail,
          chat_result: null,
          job_result: null,
          title: null,
          credits_left: null
        },
        chunks: [],
        state: state || null
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
  const api = new NoloAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}