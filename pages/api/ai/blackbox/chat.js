import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class Blackbox {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 3e4
    }));
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.ready = null;
  }
  log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
  uid() {
    return crypto.randomUUID();
  }
  async init() {
    if (this.ready) return this.ready;
    this.ready = async function doInit(self) {
      try {
        const r = await self.client.get("https://www.blackbox.ai?mobile=true", {
          headers: {
            "User-Agent": self.ua
          }
        });
        self.log(`Init: ${r?.status}`);
      } catch (e) {
        self.log(`Init error: ${e?.message}`);
      }
    }(this);
    return this.ready;
  }
  async chat({
    prompt,
    messages,
    history = [],
    ...rest
  }) {
    await this.init();
    this.log(`Chat: "${prompt?.substring(0, 30)}..."`);
    const msgId = rest?.id ?? this.uid();
    const base = messages?.length ? [...messages] : [...history];
    if (prompt) base.push({
      id: msgId,
      role: "user",
      content: prompt
    });
    const msgs = base;
    const payload = {
      messages: msgs,
      id: this.uid(),
      previewToken: null,
      userId: null,
      codeModelMode: true,
      trendingAgentMode: {},
      isMicMode: false,
      userSystemPrompt: null,
      maxTokens: 1024,
      playgroundTopP: null,
      playgroundTemperature: null,
      isChromeExt: false,
      githubToken: "",
      clickedAnswer2: false,
      clickedAnswer3: false,
      clickedForceWebSearch: false,
      visitFromDelta: false,
      isMemoryEnabled: false,
      mobileClient: false,
      userSelectedModel: null,
      userSelectedAgent: "VscodeAgent",
      validated: "a38f5889-8fef-46d4-8ede-bf4668b6a9bb",
      imageGenerationMode: false,
      imageGenMode: "autoMode",
      webSearchModePrompt: false,
      deepSearchMode: false,
      promptSelection: "",
      domains: null,
      vscodeClient: false,
      codeInterpreterMode: false,
      customProfile: {
        name: "",
        occupation: "",
        traits: [],
        additionalInfo: "",
        enableNewChats: false
      },
      webSearchModeOption: {
        autoMode: true,
        webMode: false,
        offlineMode: false
      },
      session: null,
      isPremium: false,
      teamAccount: "",
      subscriptionCache: null,
      beastMode: false,
      reasoningMode: false,
      designerMode: false,
      workspaceId: "",
      asyncMode: false,
      isTaskPersistent: false,
      selectedElement: null,
      ...rest
    };
    try {
      const res = await this.client.post("https://app.blackbox.ai/api/chat", payload, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://app.blackbox.ai",
          referer: "https://app.blackbox.ai/",
          "user-agent": this.ua,
          "sec-ch-ua-platform": '"Android"',
          "x-requested-with": "com.blackbox.blackboxapp"
        }
      });
      const result = typeof res?.data === "string" ? res.data : res?.data?.result ?? null;
      const updatedHistory = [...msgs];
      if (result) updatedHistory.push({
        id: this.uid(),
        role: "assistant",
        content: result
      });
      return {
        result: result,
        uid: msgId,
        history: updatedHistory
      };
    } catch (err) {
      this.log(`Error: ${err?.response?.status || err?.message}`);
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
  const api = new Blackbox();
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