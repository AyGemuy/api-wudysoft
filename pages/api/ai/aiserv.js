import axios from "axios";
class AiChat {
  constructor() {
    this.cfg = {
      base: "https://aiserv.org/api/v2",
      tokUrl: "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyD7w2BvFDOoPofWuBWzDZGsRNG-3eX4CUc",
      plat: "android",
      ver: "3.3.0",
      fallbackModel: "openrouter/auto"
    };
    this.token = null;
    this.exp = 0;
    this.history = [];
    this.client = axios.create({
      baseURL: this.cfg.base,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
      }
    });
    console.log("[System] Robust Engine initialized.");
  }
  _build(role, content) {
    try {
      console.log(`[Process] Building message payload for [${role}]...`);
      return {
        id: Math.random().toString(36).substring(2, 15),
        role: role || "user",
        content: content || "Hai",
        files: [],
        created: Date.now(),
        status: "success",
        quote: "",
        ...role === "assistant" ? {
          streaming: false
        } : {}
      };
    } catch (err) {
      console.error("[Error _build]", err.message);
      throw err;
    }
  }
  async _token() {
    console.log("[Auth] Fetching new token from Google Identity...");
    try {
      const res = await this.client.request({
        method: "POST",
        url: this.cfg.tokUrl,
        data: {
          returnSecureToken: true
        }
      });
      this.token = res?.data || null;
      this.exp = Date.now() + (parseInt(this.token?.expiresIn || "3600", 10) - 60) * 1e3;
      console.log("[Auth] Token persistent allocation complete.");
      return this.token?.idToken;
    } catch (err) {
      console.error("[Error _token]", err?.response?.data || err.message);
      throw err;
    }
  }
  async _stream(id, tk) {
    console.log(`[Stream] Attaching pipeline to Job ID: ${id}`);
    try {
      const res = await this.client.request({
        method: "GET",
        url: `/chat/stream/${id}`,
        headers: {
          Accept: "text/event-stream",
          "cache-control": "no-cache",
          authorization: `Bearer ${tk}`,
          "x-platform": this.cfg.plat
        }
      });
      console.log("[Stream] Parsing chunks via index slicing...");
      const lines = (res?.data || "").split("\n");
      let txt = "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const json = JSON.parse(line.slice(5).trim());
            if (json?.type === "data") txt += json?.content || "";
          } catch (_) {}
        }
      }
      console.log("[Stream] Parsing complete.");
      return txt;
    } catch (err) {
      console.error("[Error _stream]", err?.response?.data || err.message);
      throw err;
    }
  }
  async chat({
    token,
    prompt,
    messages,
    ...rest
  }) {
    console.log("[Engine] Context compilation initialized...");
    try {
      const isExp = Date.now() >= this.exp;
      const actTok = token || !isExp && this.token?.idToken || await this._token();
      if (Array.isArray(messages) && messages.length > 0) {
        console.log("[Engine] Syncing external history context...");
        this.history = [...messages];
      }
      this.history.push(this._build("user", prompt || "Hai"));
      console.log("[Validation] Inspecting available server models array...");
      let chosenModel = rest?.model || this.cfg.fallbackModel;
      try {
        const resModels = await this.client.request({
          method: "GET",
          url: "/chat/models",
          headers: {
            authorization: `Bearer ${actTok}`,
            "x-platform": this.cfg.plat,
            "x-app-version": rest?.appVersion || this.cfg.ver
          }
        });
        const modelsList = Array.isArray(resModels?.data) ? resModels.data : [];
        const isModelValid = modelsList.some(m => m?.model === chosenModel || m?.id === chosenModel);
        if (!isModelValid) {
          console.warn(`[Validation Warning] Model [${chosenModel}] unavailable. Fallback to default allocation logic.`);
          chosenModel = this.cfg.fallbackModel;
        } else {
          console.log(`[Validation] Verified model target: [${chosenModel}]`);
        }
      } catch (errModels) {
        console.warn("[Validation Warning] Validation stream connection failure, using target request raw parameter instead.", errModels.message);
      }
      console.log(`[Engine] Transmitting payload under verified model ID: ${chosenModel}`);
      const res = await this.client.request({
        method: "POST",
        url: "/chat/stream",
        headers: {
          authorization: `Bearer ${actTok}`,
          "x-platform": this.cfg.plat,
          "x-app-version": rest?.appVersion || this.cfg.ver
        },
        data: {
          mode: rest?.mode || "text",
          action: rest?.action || "create",
          isPro: rest?.isPro ?? false,
          model: chosenModel,
          messages: this.history
        }
      });
      const id = res?.data?.jobId;
      if (!id) throw new Error("Missing transactional server Job ID mapping token.");
      console.log(`[Engine] Execution pointer assigned to Job ID: ${id}`);
      const reply = await this._stream(id, actTok);
      this.history.push(this._build("assistant", reply));
      console.log("[Engine] Context cycle operation successfully completed.");
      return {
        result: reply,
        history: [...this.history],
        token: actTok,
        info: {
          id: id,
          model: chosenModel,
          limit: res?.data?.limit || null
        }
      };
    } catch (err) {
      console.error("[Error chat]", err?.response?.data || err.message);
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
  const api = new AiChat();
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