import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class TohAI {
  constructor() {
    this.apiBase = "https://as.tohaiall.com/api";
    this.authBase = "https://tohauth.com/api";
    this.androidKey = "AIzaSyA15Tk0E9pWpd0NU_EUSvj60qaH1rbIPGY";
    this.webKey = "AIzaSyAP4OekRisxN_6cerYRru3dR4VOYqADMrQ";
  }
  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (err) {
      console.log(`[b64e] Gagal encode state: ${err?.message || err}`);
      return "";
    }
  }
  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : null;
    } catch (err) {
      console.log(`[b64d] Gagal decode state: ${err?.message || err}`);
      return null;
    }
  }
  uuid() {
    try {
      return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : r & 3 | 8).toString(16);
      });
    } catch (err) {
      console.log(`[uuid] Gagal generate uuid: ${err?.message || err}`);
      return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  sleep(ms) {
    try {
      return new Promise(resolve => setTimeout(resolve, ms || 1e3));
    } catch {
      return Promise.resolve();
    }
  }
  async chkMedia(input) {
    try {
      console.log("[Media] Memeriksa format file...");
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return {
          buffer: input,
          filename: `upload_${Date.now()}.png`,
          mime: "image/png"
        };
      }
      if (typeof input === "string") {
        if (/^https?:\/\//i.test(input)) {
          console.log(`[Media] Mengunduh berkas dari URL: ${input}`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = res.headers?.["content-type"] || "image/png";
          const ext = mime.split("/")[1]?.split(";")[0] || "png";
          return {
            buffer: Buffer.from(res.data),
            filename: `media_${Date.now()}.${ext}`,
            mime: mime
          };
        }
        if (input.startsWith("data:")) {
          const match = input.match(/^data:([^;]+);base64,(.*)$/);
          const mime = match?.[1] || "image/png";
          const b64 = match?.[2] || input;
          const ext = mime.split("/")[1]?.split(";")[0] || "png";
          return {
            buffer: Buffer.from(b64, "base64"),
            filename: `media_${Date.now()}.${ext}`,
            mime: mime
          };
        }
        return {
          buffer: Buffer.from(input, "base64"),
          filename: `media_${Date.now()}.png`,
          mime: "image/png"
        };
      }
      return null;
    } catch (err) {
      console.log(`[Media] Gagal resolusi media: ${err?.message || err}`);
      return null;
    }
  }
  async authAnd() {
    try {
      console.log("[Auth] Menginisiasi sesi anonim Android Firebase...");
      const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.androidKey}`;
      const payload = {
        returnSecureToken: true,
        clientType: "CLIENT_TYPE_ANDROID"
      };
      const res = await axios.post(url, payload, {
        headers: {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
          "Content-Type": "application/json",
          "X-Android-Package": "com.thsoft.manyai",
          "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
          "X-Client-Version": "Android/Fallback/X23002001/FirebaseCore-Android",
          "X-Firebase-GMPID": "1:445679068444:android:585f6a448e1cf8394ec6d9"
        }
      });
      const idToken = res.data?.idToken;
      if (!idToken) return null;
      console.log("[Auth] Menukarkan token Android ke TohAI Auth Gateway...");
      const exRes = await axios.post(`${this.authBase}/client/auth/exchange`, {
        platform: "android"
      }, {
        headers: {
          "User-Agent": "okhttp/5.3.2",
          "Content-Type": "application/json",
          authorization: `Bearer ${idToken}`
        }
      });
      return {
        access_token: exRes.data?.access_token || null,
        user_id: exRes.data?.user?.id || null,
        platform: "android"
      };
    } catch (err) {
      console.log(`[Auth] Registrasi Android error: ${err?.response?.data?.error?.message || err?.message}`);
      return null;
    }
  }
  async authWeb() {
    try {
      console.log("[Auth] Mencoba fallback ke sesi anonim Web...");
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.webKey}`;
      const payload = {
        returnSecureToken: true
      };
      const res = await axios.post(url, payload, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          "Content-Type": "application/json",
          origin: "https://manyai.com"
        }
      });
      const idToken = res.data?.idToken;
      if (!idToken) return null;
      console.log("[Auth] Menukarkan token Web ke TohAI Auth Gateway...");
      const exRes = await axios.post(`${this.authBase}/client/auth/exchange`, {
        platform: "web"
      }, {
        headers: {
          "Content-Type": "application/json",
          origin: "https://manyai.com",
          authorization: `Bearer ${idToken}`,
          "x-device-id": this.uuid(),
          "x-device-name": "Chrome on Node.js"
        }
      });
      return {
        access_token: exRes.data?.access_token || null,
        user_id: exRes.data?.user?.id || null,
        platform: "web"
      };
    } catch (err) {
      console.log(`[Auth] Registrasi Web error: ${err?.response?.data?.error?.message || err?.message}`);
      return null;
    }
  }
  async getAuth(currentState) {
    try {
      const s = this.b64d(currentState);
      if (s?.access_token) {
        console.log("[Auth] Memakai sesi token aktif dari state.");
        return s;
      }
      const androidSession = await this.authAnd();
      if (androidSession?.access_token) return androidSession;
      console.log("[Auth] Android gagal, otomatis beralih ke Web API...");
      const webSession = await this.authWeb();
      return webSession?.access_token ? webSession : null;
    } catch (err) {
      console.log(`[Auth] getAuth error: ${err?.message || err}`);
      return null;
    }
  }
  async fetchConfig(token) {
    try {
      console.log("[Config] Mengambil konfigurasi model terkini...");
      const res = await axios.get(`${this.apiBase}/ai/v1/config?client-version=2`, {
        headers: {
          "User-Agent": "okhttp/5.3.2",
          Accept: "application/json",
          authorization: `Bearer ${token}`
        }
      });
      return res.data?.data || null;
    } catch (err) {
      console.log(`[Config] Gagal memuat konfigurasi: ${err?.message || err}`);
      return null;
    }
  }
  async upFile(token, fileData) {
    try {
      console.log(`[Upload] Mengirim berkas ${fileData.filename} via form-data...`);
      const form = new FormData();
      form.append("file", fileData.buffer, {
        filename: fileData.filename,
        contentType: fileData.mime
      });
      const res = await axios.post(`${this.apiBase}/file/v1/file/upload`, form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": "okhttp/5.3.2",
          Accept: "application/json",
          authorization: `Bearer ${token}`
        }
      });
      console.log(`[Upload] Sukses, File ID: ${res.data?.id}`);
      return res.data?.id || null;
    } catch (err) {
      console.log(`[Upload] Gagal mengunggah: ${err?.response?.data?.message || err?.message}`);
      return null;
    }
  }
  async pollStream(token, payload, platform) {
    try {
      console.log("[Chat] Membuka streaming dialog ke TohAI API...");
      const res = await axios.post(`${this.apiBase}/ai/v1/chat/ask`, payload, {
        headers: {
          "User-Agent": platform === "android" ? "okhttp/5.3.2" : "Mozilla/5.0 (Linux; Android 10)",
          Accept: "application/x-ndjson",
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`
        },
        responseType: "text"
      });
      const lines = (res.data || "").split("\n").filter(l => l.trim().length > 0);
      const chunks = [];
      let content = "";
      let convId = null;
      let title = null;
      let isCompleted = false;
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);
          chunks.push(chunk);
          convId = convId || chunk?.conversationId;
          if (chunk?.role === "TOH_TITLE") {
            title = chunk?.contents?.[0]?.content || title;
          }
          if (chunk?.role === "TOH_ASSISTANT") {
            content += chunk?.contents?.[0]?.content || "";
          }
          if (chunk?.role === "TOH_ASSISTANT_DONE" || chunk?.finishStatus === "COMPLETED") {
            isCompleted = true;
          }
        } catch {}
      }
      return {
        reply: content.trim(),
        title: title || "New Conversation",
        conversation_id: convId,
        is_completed: isCompleted,
        chunks: chunks
      };
    } catch (err) {
      console.log(`[Stream] Parsing error: ${err?.message || err}`);
      return null;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    media,
    ...rest
  }) {
    try {
      console.log("[Chat] Validasi parameter masukan...");
      const hasPrompt = Boolean(prompt && typeof prompt === "string" && prompt.trim().length > 0);
      const hasMessages = Array.isArray(messages) && messages.length > 0;
      const hasMedia = Boolean(media && (Array.isArray(media) && media.length > 0 || !Array.isArray(media)));
      if (!hasPrompt && !hasMessages && !hasMedia) {
        return {
          status: false,
          result: {
            error_code: "VALIDATION_ERROR",
            error_message: "Input wajib: sertakan minimal prompt, messages, atau media"
          },
          state: state || null
        };
      }
      const session = await this.getAuth(state);
      const token = session?.access_token;
      if (!token) {
        return {
          status: false,
          result: {
            error_code: "AUTH_FAILED",
            error_message: "Gagal membuat atau memvalidasi sesi otentikasi"
          },
          state: null
        };
      }
      const remoteConfig = await this.fetchConfig(token);
      let targetModelId = rest?.modelConfigId ? Number(rest.modelConfigId) : 4;
      let targetCategoryId = rest?.categoryId ? Number(rest.categoryId) : 1;
      if (remoteConfig?.modelConfigs) {
        const availableModels = remoteConfig.modelConfigs.map(m => m.id);
        if (!availableModels.includes(targetModelId)) {
          console.log(`[Validate] Model ID ${targetModelId} tidak valid, diarahkan ke fallback default (4)...`);
          targetModelId = 4;
        }
      }
      if (remoteConfig?.categories) {
        const availableCategories = remoteConfig.categories.map(c => c.id);
        if (!availableCategories.includes(targetCategoryId)) {
          console.log(`[Validate] Category ID ${targetCategoryId} tidak valid, diarahkan ke default (1)...`);
          targetCategoryId = 1;
        }
      }
      const fileList = [];
      const mediaList = Array.isArray(media) ? media : media ? [media] : [];
      for (const item of mediaList) {
        const resolved = await this.chkMedia(item);
        if (resolved) {
          const fileId = await this.upFile(token, resolved);
          if (fileId) {
            fileList.push({
              fileId: fileId
            });
          }
        }
      }
      let promptText = prompt || "";
      const msgList = Array.isArray(messages) ? messages : messages ? [messages] : [];
      for (const msg of msgList) {
        const text = typeof msg === "string" ? msg : msg?.content || msg?.text || "";
        const role = (msg?.role || "user").toLowerCase();
        if (text) {
          promptText = promptText ? `${role.toUpperCase()}: ${text}\n${promptText}` : `${role.toUpperCase()}: ${text}`;
        }
      }
      const payload = {
        modelConfigId: targetModelId,
        prompt: promptText,
        categoryId: targetCategoryId,
        tools: rest?.tools || [],
        files: fileList,
        isPending: false,
        isIgnored: true
      };
      const streamRes = await this.pollStream(token, payload, session?.platform);
      if (!streamRes) {
        return {
          status: false,
          result: {
            error_code: "REQUEST_FAILED",
            error_message: "Tidak ada respons yang diterima dari server"
          },
          state: this.b64e(session)
        };
      }
      const nextSession = {
        ...session,
        conversation_id: streamRes.conversation_id || session?.conversation_id || null
      };
      console.log("[Chat] Pesan berhasil diproses.");
      return {
        status: true,
        result: {
          reply: streamRes.reply,
          title: streamRes.title,
          conversation_id: streamRes.conversation_id,
          files_attached: fileList.length,
          model_used: targetModelId,
          is_completed: streamRes.is_completed,
          chunks: streamRes.chunks || []
        },
        state: this.b64e(nextSession)
      };
    } catch (err) {
      console.log(`[Chat] Terjadi kesalahan tak terduga: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_code: "UNEXPECTED_ERROR",
          error_message: err?.response?.data || err?.message || "Chat operation failed"
        },
        state: state || null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new TohAI();
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