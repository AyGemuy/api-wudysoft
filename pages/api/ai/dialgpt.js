import axios from "axios";
const FB_KEY = "AIzaSyD05ZzfprhqTbJRG8XtMB5NKRjbzdyLeKM";
const API_BASE = "https://api.dialgptapi.com/v1";
const MODELS = {
  chat: ["gpt-4.1-nano", "gpt-4.1-2025-04-14", "gpt-5-nano"],
  gen: ["fal-flux-schnell"]
};
const FB_HDR = {
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json",
  "X-Android-Package": "ai.assistant.ask.chatbot.generator",
  "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
  "Accept-Language": "id-ID, en-US",
  "X-Client-Version": "Android/Fallback/X23002001/FirebaseCore-Android",
  "X-Firebase-GMPID": "1:941608613849:android:50b4e841919faaeab8cbc8",
  "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
};
const API_HDR = {
  "User-Agent": "okhttp/5.1.0",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json"
};
class DialGPT {
  constructor() {
    this.uid = null;
    this.fbRef = null;
    this.fbExp = 0;
    this.fbTok = null;
    this.tok = null;
    this.apiRef = null;
  }
  log(tag, msg) {
    console.log(`[${tag}] ${msg}`);
  }
  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  encState(msgs = []) {
    const b64 = Buffer.from(JSON.stringify({
      uid: this.uid,
      fbRef: this.fbRef,
      fbExp: this.fbExp,
      tok: this.tok,
      apiRef: this.apiRef,
      msgs: msgs
    })).toString("base64");
    this.log("STATE", `Exported (${b64.length} chars)`);
    return b64;
  }
  decState(b64) {
    try {
      const s = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      this.uid = s.uid || null;
      this.fbRef = s.fbRef || null;
      this.fbExp = s.fbExp || 0;
      this.tok = s.tok || null;
      this.apiRef = s.apiRef || null;
      this.log("STATE", `Imported — uid: ${this.uid}, msgs: ${s.msgs?.length ?? 0}`);
      return s.msgs ?? [];
    } catch (err) {
      throw new Error(`decState failed: ${err.message}`);
    }
  }
  async resolveOne(img) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) {
        this.log("IMG", "Buffer → base64");
        return img.toString("base64");
      }
      if (typeof img === "string" && img.startsWith("data:")) {
        this.log("IMG", "data-URL → extract base64");
        return img.split(",")[1] ?? img;
      }
      if (typeof img === "string" && /^https?:\/\//.test(img)) {
        this.log("IMG", `URL fetch: ${img}`);
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data).toString("base64");
      }
      this.log("IMG", "raw base64 passthrough");
      return img;
    } catch (err) {
      throw new Error(`resolveOne failed: ${err.message}`);
    }
  }
  async resolveImgs(imgs) {
    try {
      const parts = [];
      const list = Array.isArray(imgs) ? imgs : [imgs];
      for (const img of list) {
        const b64 = await this.resolveOne(img);
        if (!b64) continue;
        parts.push({
          type: "image_url",
          image_url: {
            detail: "low",
            url: `data:image/jpeg;base64,${b64}`
          }
        });
      }
      this.log("IMG", `Resolved ${parts.length} image(s)`);
      return parts;
    } catch (err) {
      throw new Error(`resolveImgs failed: ${err.message}`);
    }
  }
  async solveMsgImgs(msgs) {
    try {
      const out = [];
      for (const msg of msgs) {
        const content = Array.isArray(msg.content) ? msg.content : [{
          type: "text",
          text: msg.content ?? ""
        }];
        const solved = [];
        for (const part of content) {
          if (part.type === "image_url") {
            const raw = part.image_url?.url || part.image_url;
            const b64 = await this.resolveOne(raw);
            solved.push({
              type: "image_url",
              image_url: {
                detail: "low",
                url: `data:image/jpeg;base64,${b64}`
              }
            });
          } else {
            solved.push(part);
          }
        }
        out.push({
          ...msg,
          content: solved
        });
      }
      this.log("MSG", `Solved images in ${msgs.length} message(s)`);
      return out;
    } catch (err) {
      throw new Error(`solveMsgImgs failed: ${err.message}`);
    }
  }
  authHdr() {
    return {
      ...API_HDR,
      authorization: `Bearer ${this.tok}`
    };
  }
  async signup() {
    try {
      this.log("AUTH", "Signing up new Firebase user");
      const id = Math.random().toString(36).slice(2, 18).padEnd(16, "0");
      this.uid = id;
      const {
        data
      } = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${FB_KEY}`, {
        email: `${id}@aiassistant.com`,
        password: id,
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: FB_HDR
      });
      this.fbTok = data.idToken;
      this.fbRef = data.refreshToken;
      this.fbExp = Date.now() + (Number(data.expiresIn) - 60) * 1e3;
      this.log("AUTH", `Signup OK — uid: ${id}`);
    } catch (err) {
      throw new Error(`signup failed: ${err?.response?.data?.error?.message ?? err.message}`);
    }
  }
  async refFb() {
    try {
      this.log("AUTH", "Refreshing Firebase token");
      const {
        data
      } = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${FB_KEY}`, {
        grantType: "refresh_token",
        refreshToken: this.fbRef
      }, {
        headers: FB_HDR
      });
      this.fbTok = data.id_token;
      this.fbRef = data.refresh_token;
      this.fbExp = Date.now() + (Number(data.expires_in) - 60) * 1e3;
      this.log("AUTH", "Firebase token refreshed");
    } catch (err) {
      throw new Error(`refFb failed: ${err?.response?.data?.error?.message ?? err.message}`);
    }
  }
  async ensureFb() {
    try {
      if (!this.fbTok && !this.fbRef) return this.signup();
      if (!this.fbTok || Date.now() >= this.fbExp) return this.refFb();
    } catch (err) {
      throw new Error(`ensureFb failed: ${err.message}`);
    }
  }
  async login() {
    try {
      await this.ensureFb();
      this.log("AUTH", "Logging in to DialGPT API");
      const {
        data
      } = await axios.post(`${API_BASE}/auth/login`, {
        app_name: "chat_gpt_android",
        revenue_cat_app_user_id: this.uid,
        timezone: "GMT+08:00",
        token: this.fbTok
      }, {
        headers: API_HDR
      });
      this.tok = data.access_token;
      this.apiRef = data.refresh_token;
      this.log("AUTH", `Login OK — user_id: ${data.user_id}`);
    } catch (err) {
      throw new Error(`login failed: ${err?.response?.data?.detail ?? err.message}`);
    }
  }
  async ensureLogin() {
    try {
      if (!this.tok) await this.login();
    } catch (err) {
      throw new Error(`ensureLogin failed: ${err.message}`);
    }
  }
  async poll(taskId, interval = 3e3, maxTries = 60) {
    for (let i = 1; i <= maxTries; i++) {
      try {
        this.log("POLL", `Attempt ${i}/${maxTries} — task: ${taskId}`);
        await this.sleep(interval);
        const {
          data
        } = await axios.get(`${API_BASE}/ai/fal/${taskId}`, {
          headers: this.authHdr()
        });
        if (data?.images?.length) {
          this.log("POLL", `Done — ${data.images.length} image(s) ready`);
          return data;
        }
        this.log("POLL", "Not ready, retrying...");
      } catch (err) {
        this.log("POLL", `Attempt ${i} error: ${err.message}`);
      }
    }
    throw new Error(`poll timed out after ${maxTries} attempts`);
  }
  async chat({
    model = "gpt-4.1-nano",
    prompt,
    imgs,
    history = [],
    system,
    max_tokens,
    ...rest
  }) {
    try {
      this.log("CHAT", `Preparing — model: ${model}, history: ${history.length}`);
      const userContent = [{
        type: "text",
        text: String(prompt)
      }];
      if (imgs) {
        const imgParts = await this.resolveImgs(imgs);
        for (const p of imgParts) userContent.push(p);
      }
      const userMsg = {
        role: "user",
        content: userContent
      };
      const nextHistory = [...history, userMsg];
      const solvedHistory = await this.solveMsgImgs(nextHistory);
      const payload = {
        model: model,
        max_completion_tokens: max_tokens ?? 1e3,
        stream: false,
        messages: [{
          role: "system",
          content: [{
            type: "text",
            text: system ?? "Default"
          }]
        }, ...solvedHistory],
        ...rest
      };
      this.log("CHAT", `Sending — total messages: ${payload.messages.length}`);
      const {
        data
      } = await axios.post(`${API_BASE}/ai/services/gpt`, payload, {
        headers: this.authHdr()
      });
      const reply = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
      this.log("CHAT", `Reply (${reply.length} chars)`);
      nextHistory.push({
        role: "assistant",
        content: [{
          type: "text",
          text: reply
        }]
      });
      return {
        data: data,
        history: nextHistory
      };
    } catch (err) {
      throw new Error(`chat failed: ${err?.response?.data?.detail ?? err.message}`);
    }
  }
  async gen({
    model,
    prompt,
    width = 1024,
    height = 1024,
    steps = 6,
    num_images = 1,
    safety = true,
    ...rest
  }) {
    try {
      this.log("GEN", `Submitting — prompt: "${prompt}"`);
      const payload = {
        prompt: prompt,
        num_images: num_images,
        image_size: {
          width: width,
          height: height
        },
        num_inference_steps: steps,
        enable_safety_checker: safety,
        ...rest
      };
      const {
        data
      } = await axios.post(`${API_BASE}/ai/fal`, payload, {
        headers: this.authHdr()
      });
      const taskId = data?.task_id;
      if (!taskId) throw new Error("No task_id returned");
      this.log("GEN", `Task ID: ${taskId}`);
      return this.poll(taskId);
    } catch (err) {
      throw new Error(`gen failed: ${err?.response?.data?.detail ?? err.message}`);
    }
  }
  async run({
    state,
    type = "chat",
    prompt,
    model,
    messages,
    image,
    ...rest
  }) {
    try {
      let history = [];
      if (state) {
        this.log("RUN", "Restoring state");
        history = this.decState(state);
      }
      if (messages?.length) {
        this.log("RUN", `Override history with ${messages.length} message(s)`);
        history = messages;
      }
      await this.ensureLogin();
      if (!prompt?.trim()) throw new Error("prompt is required");
      const t = (type || "chat").toLowerCase();
      const validMdls = MODELS[t] ?? MODELS.chat;
      const mdl = model || validMdls[0];
      if (!validMdls.includes(mdl)) {
        throw new Error(`Invalid model "${mdl}" for type "${t}". Available: ${validMdls.join(", ")}`);
      }
      this.log("RUN", `type=${t} model=${mdl} history=${history.length}`);
      if (t === "gen") {
        const result = await this.gen({
          model: mdl,
          prompt: prompt,
          ...rest
        });
        const newState = this.encState(history);
        return {
          ...result,
          state: newState
        };
      }
      const {
        data,
        history: next
      } = await this.chat({
        model: mdl,
        prompt: prompt,
        imgs: image,
        history: history,
        ...rest
      });
      const newState = this.encState(next);
      return {
        ...data,
        state: newState
      };
    } catch (err) {
      this.log("ERR", err?.response?.data?.detail ?? err.message);
      throw err;
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
  const api = new DialGPT();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}