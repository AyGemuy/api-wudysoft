import axios from "axios";
import crypto from "crypto";
import {
  JSDOM
} from "jsdom";
class DuckAI {
  constructor() {
    try {
      this.baseURL = "https://duck.ai";
      this.timeout = 6e4;
      this.defaultModel = "gpt-5.6-luna";
      this.maxRetries = 5;
      this.availableModels = [{
        model: "gpt-5.4",
        modelName: "GPT-5.4",
        modelVariant: null,
        modelShortName: "GPT-5.4",
        createdBy: "OpenAI",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low", "medium"],
        moderationLevel: "HIGH",
        availableTo: ["INTERNAL", "PLUS", "PRO"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 10
          },
          maxDimension: 1024
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "261",
        supportedTools: ["WebSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "LocationPrompt", "GenerateImage"],
        costRank: 8
      }, {
        model: "gpt-5.6-terra",
        modelName: "GPT-5.6",
        modelVariant: "Terra",
        modelShortName: "5.6-Terra",
        createdBy: "OpenAI",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low", "medium"],
        moderationLevel: "HIGH",
        availableTo: ["INTERNAL"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 10
          },
          maxDimension: 1024
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "271",
        supportedTools: ["WebSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "LocationPrompt", "GenerateImage"],
        costRank: 7
      }, {
        model: "gpt-5.6-luna",
        modelName: "GPT-5.6",
        modelVariant: "Luna",
        modelShortName: "5.6 Luna",
        createdBy: "OpenAI",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low"],
        moderationLevel: "HIGH",
        availableTo: ["INTERNAL", "FREE", "PLUS", "PRO"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 5
          },
          maxDimension: 512
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "290",
        supportedTools: ["WebSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "LocationPrompt", "GenerateImage"],
        costRank: 2
      }, {
        model: "gpt-5.4-mini",
        modelName: "GPT-5.4",
        modelVariant: "mini",
        modelShortName: "5.4 mini",
        createdBy: "OpenAI",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low", "medium"],
        moderationLevel: "HIGH",
        availableTo: ["FREE", "PLUS", "PRO", "INTERNAL"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 5
          },
          maxDimension: 512
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "262",
        supportedTools: ["WebSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "LocationPrompt", "GenerateImage"],
        costRank: 4
      }, {
        model: "claude-sonnet-4-6",
        modelName: "Claude",
        modelVariant: "Sonnet 4.6",
        modelShortName: "Sonnet 4.6",
        createdBy: "Anthropic",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low"],
        moderationLevel: "HIGH",
        availableTo: ["PLUS", "PRO", "INTERNAL"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 10
          },
          maxDimension: 1024
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "259",
        supportedTools: ["WebSearch", "NewsSearch", "VideosSearch", "LocalSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "WeatherForecast", "LocationPrompt", "GenerateImage"],
        costRank: 9
      }, {
        model: "claude-haiku-4-5",
        modelName: "Claude",
        modelVariant: "Haiku 4.5",
        modelShortName: "Haiku 4.5",
        createdBy: "Anthropic",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low"],
        moderationLevel: "HIGH",
        availableTo: ["FREE", "PLUS", "PRO", "INTERNAL"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 5
          },
          maxDimension: 512
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "1",
        supportedTools: ["WebSearch", "NewsSearch", "VideosSearch", "LocalSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "WeatherForecast", "LocationPrompt"],
        costRank: 6
      }, {
        model: "gpt-5.6-sol",
        modelName: "GPT-5.6",
        modelVariant: "Sol",
        modelShortName: "5.6-Sol",
        createdBy: "OpenAI",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low", "medium"],
        moderationLevel: "HIGH",
        availableTo: ["INTERNAL"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 10
          },
          maxDimension: 1024
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "268",
        supportedTools: ["WebSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "LocationPrompt", "GenerateImage"],
        costRank: 10
      }, {
        model: "claude-opus-4-8",
        modelName: "Claude",
        modelVariant: "Opus 4.8",
        modelShortName: "Opus 4.8",
        createdBy: "Anthropic",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low", "medium"],
        moderationLevel: "HIGH",
        availableTo: ["PRO", "INTERNAL"],
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 10
          },
          maxDimension: 1024
        },
        inputFileSupport: {
          isAvailable: true,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "264",
        supportedTools: ["WebSearch", "RelatedSearchTerms", "FindInDocument", "ReadDocumentSelection", "ReadDocument", "GenerateImage"],
        costRank: 11
      }, {
        model: "mistral-small-2603",
        modelName: "Mistral",
        modelVariant: "Small 4",
        modelShortName: "Mistral",
        createdBy: "Mistral AI",
        modelType: "general",
        moderationLevel: "LOW",
        availableTo: ["FREE", "PLUS", "PRO", "INTERNAL"],
        isOpenSource: true,
        inputCharLimit: 16e3,
        settingId: "6",
        costRank: 1
      }, {
        model: "tinfoil/gpt-oss-120b",
        modelName: "gpt-oss",
        modelVariant: "120B",
        modelShortName: "gpt-oss",
        createdBy: "OpenAI",
        modelType: "reasoning",
        supportedReasoningEffort: ["low"],
        moderationLevel: "HIGH",
        availableTo: ["FREE", "PLUS", "PRO", "INTERNAL"],
        isOpenSource: true,
        isEncrypted: true,
        inputCharLimit: 16e3,
        settingId: "251",
        supportedTools: ["WebSearch", "LocationPrompt", "FindInDocument", "ReadDocumentSelection", "ReadDocument"],
        costRank: 5
      }, {
        model: "tinfoil/gemma4-31b",
        modelName: "Gemma 4",
        modelVariant: "31B",
        modelShortName: "Gemma",
        createdBy: "Google",
        modelType: "reasoning",
        supportedReasoningEffort: ["none", "low"],
        moderationLevel: "LOW",
        availableTo: ["INTERNAL", "FREE", "PLUS", "PRO"],
        isOpenSource: true,
        isEncrypted: true,
        isBeta: true,
        inputCharLimit: 16e3,
        inputImageSupport: {
          isAvailable: true,
          inputMessageLimits: {
            imageCount: 3,
            textCharacters: 4500
          },
          conversationLimits: {
            totalImageCount: 5
          },
          maxDimension: 512
        },
        inputFileSupport: {
          isAvailable: false,
          supportedMediaTypes: ["application/pdf"],
          limitsByAccessTier: {
            FREE: {
              maxFileSizeBytes: 5242880,
              totalFileCount: 3,
              combinedFileSize: 5242880,
              maxPagesPerFile: 15
            },
            PLUS: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 35
            },
            PRO: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            },
            INTERNAL: {
              maxFileSizeBytes: 26214400,
              totalFileCount: 5,
              combinedFileSize: 26214400,
              maxPagesPerFile: 50
            }
          }
        },
        settingId: "270",
        supportedTools: ["WebSearch", "LocationPrompt", "FindInDocument", "ReadDocumentSelection", "ReadDocument"],
        costRank: 3
      }, {
        model: "voice-mode",
        serviceModelId: "gpt-realtime-2.1-mini",
        modelName: "Voice Chat",
        modelVariant: null,
        modelShortName: "Voice Chat",
        createdBy: "OpenAI",
        modelType: "general",
        moderationLevel: "HIGH",
        availableTo: [],
        inputCharLimit: 0,
        settingId: "102",
        supportedTools: []
      }, {
        model: "DuckAssist",
        modelName: "Assist",
        modelVariant: "",
        modelShortName: "Assist",
        createdBy: "DuckDuckGo",
        modelType: "general",
        moderationLevel: "LOW",
        availableTo: ["INTERNAL"],
        inputCharLimit: 16e3,
        settingId: "100"
      }];
      this.cookies = {};
      this.feVersion = null;
      this.entryScript = null;
      this.sessionExpire = 0;
      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: this.timeout
      });
      this.client.interceptors.request.use(config => {
        try {
          config.headers["x-ddg-journey-id"] = config.headers?.["x-ddg-journey-id"] || crypto.randomBytes(16).toString("hex");
          config.headers["x-fe-signals"] = config.headers?.["x-fe-signals"] || this._sig();
          if (this.feVersion) {
            config.headers["x-fe-version"] = config.headers?.["x-fe-version"] || this.feVersion;
          }
          const cookieHeader = this._cookie();
          if (cookieHeader) {
            config.headers["cookie"] = config.headers?.["cookie"] || cookieHeader;
          }
        } catch (e) {
          console.error(`[DuckAI] Error pada request interceptor: ${e?.message || e}`);
        }
        return config;
      }, error => Promise.reject(error));
      this.client.interceptors.response.use(response => {
        try {
          this._saveCookie(response.headers?.["set-cookie"]);
        } catch (e) {
          console.error(`[DuckAI] Error pada response interceptor: ${e?.message || e}`);
        }
        return response;
      }, error => {
        try {
          this._saveCookie(error?.response?.headers?.["set-cookie"]);
        } catch (e) {
          console.error(`[DuckAI] Error menyimpan cookie dari response: ${e?.message || e}`);
        }
        return Promise.reject(error);
      });
    } catch (e) {
      console.error(`[DuckAI] Error pada constructor: ${e?.message || e}`);
    }
  }
  _hdr() {
    try {
      return {
        accept: "text/event-stream",
        "accept-language": "id-ID,en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://duck.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://duck.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
    } catch (e) {
      console.error(`[DuckAI] Error pada _hdr: ${e?.message || e}`);
      return {};
    }
  }
  _saveCookie(raw) {
    try {
      if (!raw) return;
      const list = Array.isArray(raw) ? raw : [raw];
      for (const item of list) {
        const match = item.match(/^([^=]+)=([^;]+)/);
        if (match) {
          this.cookies[match[1].trim()] = match[2].trim();
        }
      }
    } catch (e) {
      console.error(`[DuckAI] Error pada _saveCookie: ${e?.message || e}`);
    }
  }
  _cookie() {
    try {
      const entries = Object.entries(this.cookies);
      return entries.length > 0 ? entries.map(([k, v]) => `${k}=${v}`).join("; ") : null;
    } catch (e) {
      console.error(`[DuckAI] Error pada _cookie: ${e?.message || e}`);
      return null;
    }
  }
  async _init(forceRefresh = false) {
    try {
      const now = Date.now();
      if (!forceRefresh && this.feVersion && this.entryScript && this.sessionExpire > now) return;
      console.log("[DuckAI] Menginisialisasi session live dari https://duck.ai/...");
      const res = await axios.get("https://duck.ai/", {
        headers: {
          ...this._hdr(),
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "upgrade-insecure-requests": "1"
        },
        timeout: 25e3
      });
      this._saveCookie(res.headers?.["set-cookie"]);
      const html = String(res.data || "");
      const verRegex = /(?:serp|duckai|v)_[0-9]{8}_[0-9]{6}_ET-[a-f0-9]+/i;
      const feVerMatch = html.match(verRegex) || html.match(/"fe_version"\s*:\s*"([^"]+)"/i) || html.match(/"version"\s*:\s*"([^"]+)"/i);
      if (feVerMatch) {
        this.feVersion = feVerMatch[1] || feVerMatch[0];
      } else {
        const d = new Date();
        const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
        const timeStr = d.toTimeString().slice(0, 8).replace(/:/g, "");
        this.feVersion = `serp_${dateStr}_${timeStr}_ET-${crypto.randomBytes(20).toString("hex")}`;
      }
      console.log(`[DuckAI] Auto FE-Version: ${this.feVersion}`);
      const scriptMatch = html.match(/(?:https:\/\/duck\.ai)?\/dist\/duckai-dist\/(entry\.duckai\.[a-f0-9]+\.js)/i) || html.match(/(entry\.duckai\.[a-f0-9]+\.js)/i);
      this.entryScript = scriptMatch ? scriptMatch[1] || scriptMatch[0] : "entry.duckai.js";
      console.log(`[DuckAI] Auto Entry Script: ${this.entryScript}`);
      try {
        await this.client.get("/duckchat/v1/auth/token", {
          headers: {
            ...this._hdr(),
            accept: "*/*"
          }
        });
        await this.client.get("/duckchat/v1/capabilities", {
          headers: {
            ...this._hdr(),
            accept: "*/*"
          }
        });
      } catch (_) {}
      this.sessionExpire = now + 20 * 60 * 1e3;
    } catch (e) {
      console.warn(`[DuckAI] Gagal inisialisasi session live: ${e?.message || e}`);
      const d = new Date();
      this.feVersion = this.feVersion || `serp_${d.toISOString().slice(0, 10).replace(/-/g, "")}_120000_ET-${crypto.randomBytes(20).toString("hex")}`;
      this.entryScript = this.entryScript || "entry.duckai.js";
      this.sessionExpire = Date.now() + 5 * 60 * 1e3;
    }
  }
  _sig() {
    try {
      const now = Date.now();
      const payload = {
        start: now - Math.floor(Math.random() * 2e3 + 2e3),
        events: [{
          name: "onboarding_impression",
          delta: Math.floor(Math.random() * 100 + 200)
        }, {
          name: "action",
          delta: Math.floor(Math.random() * 500 + 1e3),
          trusted: true
        }, {
          name: "startNewChat_free",
          delta: Math.floor(Math.random() * 500 + 2800)
        }],
        end: Math.floor(Math.random() * 500 + 3e3)
      };
      return Buffer.from(JSON.stringify(payload)).toString("base64");
    } catch (e) {
      console.error(`[DuckAI] Error pada _sig: ${e?.message || e}`);
      return "";
    }
  }
  _val(targetModel, {
    hasMedia = false,
    reasoningEffort = null,
    generateImage = false,
    search = false,
    charLength = 0
  } = {}) {
    try {
      let selected = this.availableModels.find(m => m.model === targetModel || m.modelShortName?.toLowerCase() === targetModel?.toLowerCase() || m.modelName?.toLowerCase() === targetModel?.toLowerCase() || m.settingId === targetModel);
      if (!selected) {
        console.warn(`[DuckAI] Model "${targetModel}" tidak ditemukan. Menggunakan default "${this.defaultModel}".`);
        selected = this.availableModels.find(m => m.model === this.defaultModel) || this.availableModels[2];
      }
      if (selected.inputCharLimit > 0 && charLength > selected.inputCharLimit) {
        console.warn(`[DuckAI] Input melebihi limit karakter model ${selected.model} (${charLength}/${selected.inputCharLimit}).`);
      }
      if (hasMedia && !selected?.inputImageSupport?.isAvailable) {
        console.warn(`[DuckAI] Model ${selected.model} tidak mendukung input gambar secara native.`);
      }
      let finalEffort = "none";
      if (selected?.supportedReasoningEffort?.length > 0) {
        if (reasoningEffort && selected.supportedReasoningEffort.includes(reasoningEffort)) {
          finalEffort = reasoningEffort;
        } else if (selected.supportedReasoningEffort.includes("none")) {
          finalEffort = "none";
        } else {
          finalEffort = selected.supportedReasoningEffort[0];
        }
      }
      const supportedTools = selected?.supportedTools || [];
      const canGenImage = Boolean(generateImage && supportedTools.includes("GenerateImage"));
      const canSearch = Boolean(search && (supportedTools.includes("WebSearch") || supportedTools.includes("NewsSearch")));
      return {
        model: selected.model,
        modelInfo: selected,
        reasoningEffort: finalEffort,
        generateImage: canGenImage,
        search: canSearch
      };
    } catch (e) {
      console.error(`[DuckAI] Error pada _val: ${e?.message || e}`);
      return {
        model: this.defaultModel,
        modelInfo: null,
        reasoningEffort: "none",
        generateImage: Boolean(generateImage),
        search: Boolean(search)
      };
    }
  }
  async _media(item) {
    try {
      if (!item) return null;
      let mime = "image/jpeg";
      let b64 = "";
      if (Buffer.isBuffer(item)) {
        b64 = item.toString("base64");
        if (item[0] === 137 && item[1] === 80) mime = "image/png";
        else if (item[0] === 71 && item[1] === 73) mime = "image/gif";
        else if (item[0] === 82 && item[1] === 73 && item[8] === 87) mime = "image/webp";
      } else if (typeof item === "string") {
        if (item.startsWith("data:")) {
          const match = item.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mime = match[1] || "image/jpeg";
            b64 = match[2] || "";
          }
        } else if (/^https?:\/\//i.test(item)) {
          console.log(`[DuckAI] Mengunduh media dari URL: ${item}...`);
          const res = await axios.get(item, {
            responseType: "arraybuffer",
            timeout: 25e3
          });
          mime = res.headers?.["content-type"] || "image/jpeg";
          b64 = Buffer.from(res.data).toString("base64");
        } else {
          b64 = item;
        }
      } else if (item?.image || item?.data) {
        b64 = item?.image || item?.data;
        mime = item?.mimeType || item?.type || "image/jpeg";
      }
      if (!b64) return null;
      return {
        type: "image",
        mimeType: mime,
        image: b64.startsWith("data:") ? b64 : `data:${mime};base64,${b64}`
      };
    } catch (e) {
      console.error(`[DuckAI] Error pada _media: ${e?.message || e}`);
      return null;
    }
  }
  async _solv(challengeB64, ua) {
    try {
      console.log("[DuckAI] Memecahkan VQD Challenge dengan JSDOM...");
      const jsCode = Buffer.from(challengeB64, "base64").toString("utf-8");
      const dom = new JSDOM("<!DOCTYPE html><body></body>", {
        url: "https://duck.ai/",
        referrer: "https://duck.ai/",
        userAgent: ua,
        runScripts: "dangerously"
      });
      const {
        window
      } = dom;
      Object.defineProperty(window.navigator, "userAgent", {
        get: () => ua,
        configurable: true
      });
      Object.defineProperty(window.navigator, "webdriver", {
        get: () => false,
        configurable: true
      });
      Object.defineProperty(window.HTMLDivElement.prototype, "offsetHeight", {
        get: () => 10,
        configurable: true
      });
      Object.defineProperty(window.HTMLDivElement.prototype, "offsetWidth", {
        get: () => 10,
        configurable: true
      });
      Object.defineProperty(window.HTMLDivElement.prototype, "scrollHeight", {
        get: () => 10,
        configurable: true
      });
      window.HTMLDivElement.prototype.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        right: 10,
        bottom: 10,
        width: 10,
        height: 10
      });
      Object.defineProperty(window.HTMLIFrameElement.prototype, "contentWindow", {
        get: () => ({
          self: {
            toString: () => "[object Window]"
          }
        }),
        configurable: true
      });
      try {
        const script = window.document.createElement("script");
        script.textContent = `window.__res = ${jsCode}`;
        window.document.body.appendChild(script);
        return await window.__res;
      } finally {
        dom.window.close();
      }
    } catch (e) {
      console.error(`[DuckAI] Error pada _solv: ${e?.message || e}`);
      return null;
    }
  }
  _jwk() {
    try {
      const {
        publicKey
      } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048
      });
      const rawJwk = publicKey.export({
        format: "jwk"
      });
      return {
        alg: "RSA-OAEP-256",
        e: rawJwk?.e || "AQAB",
        ext: true,
        key_ops: ["encrypt"],
        kty: "RSA",
        n: rawJwk?.n || "",
        use: "enc"
      };
    } catch (e) {
      console.error(`[DuckAI] Error pada _jwk: ${e?.message || e}`);
      return {};
    }
  }
  _sse(raw) {
    try {
      const lines = (raw || "").split("\n");
      const chunks = [];
      const roles = {};
      let textResult = "";
      let reasoning = "";
      let chatTitle = null;
      const generatedImages = [];
      const imageTitles = [];
      const tools = [];
      const tokens = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.replace(/^data:\s*/, "").trim();
        if (!dataStr || dataStr === "[DONE]" || dataStr === "[PING]") continue;
        if (dataStr.startsWith("[CHAT_TITLE:")) {
          chatTitle = dataStr.replace(/^\[CHAT_TITLE:\s*/, "").replace(/\]$/, "").trim();
          continue;
        }
        try {
          const json = JSON.parse(dataStr);
          chunks.push(json);
          const roleName = json?.role || json?.type || json?.action || "unknown";
          if (!roles[roleName]) {
            roles[roleName] = [];
          }
          roles[roleName].push(json);
          if (json?.role === "assistant") {
            if (json?.message) textResult += json.message;
            else if (json?.text) textResult += json.text;
          }
          if (json?.role === "reasoning") {
            if (json?.text) {
              reasoning += json.text;
            } else if (Array.isArray(json?.summaryText)) {
              reasoning += json.summaryText.join("\n");
            }
          }
          if (json?.role === "ui-component") {
            if (json?.data?.b64Image && json?.data?.status === "success") {
              generatedImages.push(`data:image/jpeg;base64,${json.data.b64Image}`);
            }
            if (json?.data?.title) {
              imageTitles.push(json.data.title);
            }
          }
          if (json?.role === "tool-invocation" || json?.toolName) {
            tools.push({
              id: json?.toolCallId || json?.id || null,
              name: json?.toolName || null,
              state: json?.state || null,
              arguments: json?.toolArguments || null,
              result: json?.result || null
            });
          }
          if (json?.role === "image-validated" || json?.tokens) {
            if (Array.isArray(json?.tokens)) {
              tokens.push(...json.tokens);
            }
          }
        } catch (_) {}
      }
      return {
        result: {
          text: textResult.trim(),
          images: generatedImages.length > 0 ? generatedImages : null,
          imageTitle: imageTitles.length > 0 ? imageTitles.join(", ") : null,
          reasoning: reasoning.trim() || null,
          tools: tools.length > 0 ? tools : null,
          tokens: tokens.length > 0 ? tokens : null,
          title: chatTitle,
          roles: Object.keys(roles).length > 0 ? roles : null
        },
        chunks: chunks
      };
    } catch (e) {
      console.error(`[DuckAI] Error pada _sse: ${e?.message || e}`);
      return {
        result: null,
        chunks: []
      };
    }
  }
  async chat({
    prompt,
    messages = [],
    media = null,
    state = null,
    model = null,
    search = false,
    generateImage = false,
    reasoningEffort = null,
    retries = null,
    ...rest
  } = {}) {
    try {
      console.log("[DuckAI] Memproses request chat...");
      const maxAttempts = retries || this.maxRetries || 5;
      let decodedState = null;
      if (state && typeof state === "string") {
        try {
          decodedState = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
          console.log("[DuckAI] State sebelumnya berhasil di-load.");
        } catch (err) {
          console.warn("[DuckAI] Gagal decode state base64, memulai sesi baru.");
        }
      }
      if (decodedState?.cookies) {
        this.cookies = {
          ...this.cookies,
          ...decodedState.cookies
        };
      }
      if (decodedState?.feVersion) {
        this.feVersion = decodedState.feVersion;
      }
      if (decodedState?.entryScript) {
        this.entryScript = decodedState.entryScript;
      }
      const conversationId = decodedState?.conversationId || crypto.randomUUID();
      const jwk = decodedState?.jwk || this._jwk();
      const historyMessages = Array.isArray(decodedState?.messages) ? [...decodedState.messages] : [];
      const newIncomingMessages = [];
      let totalCharCount = 0;
      let hasImage = Boolean(media);
      if (Array.isArray(messages) && messages.length > 0) {
        for (const m of messages) {
          newIncomingMessages.push(m);
        }
      } else if (prompt) {
        newIncomingMessages.push({
          role: "user",
          content: prompt
        });
      }
      for (const msg of newIncomingMessages) {
        try {
          const role = msg?.role || "user";
          if (role === "assistant") {
            const textContent = typeof msg?.content === "string" ? msg.content : msg?.text || "";
            const parts = Array.isArray(msg?.parts) ? msg.parts : [{
              type: "text",
              text: textContent
            }];
            totalCharCount += textContent.length;
            historyMessages.push({
              role: "assistant",
              content: "",
              parts: parts
            });
          } else {
            const contentArray = [];
            if (typeof msg?.content === "string") {
              contentArray.push({
                type: "text",
                text: msg.content
              });
              totalCharCount += msg.content.length;
            } else if (Array.isArray(msg?.content)) {
              for (const item of msg.content) {
                if (item?.type === "text" || typeof item === "string") {
                  const t = item?.text || item;
                  contentArray.push({
                    type: "text",
                    text: t
                  });
                  totalCharCount += t.length;
                } else if (item?.type === "image" || item?.image) {
                  const parsed = await this._media(item.image || item);
                  if (parsed) {
                    contentArray.push(parsed);
                    hasImage = true;
                  }
                }
              }
            }
            if (media && msg === newIncomingMessages[newIncomingMessages.length - 1]) {
              const parsedMedia = await this._media(media);
              if (parsedMedia) {
                contentArray.push(parsedMedia);
                hasImage = true;
              }
            }
            historyMessages.push({
              role: "user",
              content: contentArray
            });
          }
        } catch (msgErr) {
          console.error(`[DuckAI] Error format pesan: ${msgErr?.message || msgErr}`);
        }
      }
      const rawTargetModel = model || decodedState?.model || this.defaultModel;
      const validated = this._val(rawTargetModel, {
        hasMedia: hasImage,
        reasoningEffort: reasoningEffort,
        generateImage: generateImage,
        search: search,
        charLength: totalCharCount
      });
      const targetModel = validated.model;
      const finalEffort = validated.reasoningEffort;
      const isImageGenAllowed = validated.generateImage;
      const isSearchAllowed = validated.search;
      let lastError = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[DuckAI] Mencoba request (Attempt ${attempt}/${maxAttempts})...`);
        await this._init(attempt > 1);
        const browserHdr = this._hdr();
        console.log("[DuckAI] Mengambil token challenge dari /status...");
        let challengeBase64 = null;
        for (let s = 0; s < 3; s++) {
          try {
            const statusRes = await this.client.get("/duckchat/v1/status", {
              headers: {
                ...browserHdr,
                "x-vqd-accept": "1"
              }
            });
            challengeBase64 = statusRes.headers?.["x-vqd-hash-1"] || null;
            if (challengeBase64) break;
          } catch (err) {
            await new Promise(r => setTimeout(r, 1e3));
          }
        }
        if (!challengeBase64) {
          lastError = "Gagal mengambil challenge header dari /status.";
          console.warn(`[DuckAI] Attempt ${attempt} gagal: ${lastError}`);
          this.sessionExpire = 0;
          this.cookies = {};
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, attempt * 1500));
          }
          continue;
        }
        const start = Date.now();
        const solution = await this._solv(challengeBase64, browserHdr["user-agent"]);
        if (!solution) {
          lastError = "Gagal memecahkan VQD challenge.";
          console.warn(`[DuckAI] Attempt ${attempt} gagal: ${lastError}`);
          this.sessionExpire = 0;
          this.cookies = {};
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, attempt * 1500));
          }
          continue;
        }
        const duration = Math.max(35, Math.min(120, Date.now() - start));
        const dynamicScriptPath = this.entryScript || "entry.duckai.js";
        solution.meta = solution.meta || {};
        solution.meta.origin = "https://duck.ai";
        solution.meta.duration = String(duration);
        solution.meta.stack = `Error\n    at l (https://duck.ai/dist/duckai-dist/${dynamicScriptPath}:2:1844804)\n    at async https://duck.ai/dist/duckai-dist/${dynamicScriptPath}:2:1619505`;
        if (Array.isArray(solution.client_hashes)) {
          solution.client_hashes = solution.client_hashes.map(h => crypto.createHash("sha256").update(h).digest("base64"));
        }
        const solutionBase64 = Buffer.from(JSON.stringify(solution)).toString("base64");
        const toolChoice = {
          NewsSearch: isSearchAllowed,
          VideosSearch: isSearchAllowed,
          LocalSearch: isSearchAllowed,
          WeatherForecast: isSearchAllowed
        };
        if (isImageGenAllowed) {
          toolChoice.GenerateImage = true;
        }
        const payload = {
          model: targetModel,
          metadata: {
            toolChoice: {
              ...toolChoice,
              ...rest?.metadata?.toolChoice || {}
            }
          },
          messages: historyMessages,
          canUseTools: true,
          reasoningEffort: finalEffort,
          canUseApproxLocation: null,
          canDelegateImageGeneration: null,
          durableStream: {
            messageId: crypto.randomUUID(),
            conversationId: conversationId,
            publicKey: jwk
          },
          ...rest
        };
        console.log(`[DuckAI] Mengirim prompt ke model: ${targetModel}...`);
        let response = null;
        try {
          response = await this.client.post("/duckchat/v1/chat", payload, {
            headers: {
              ...browserHdr,
              "x-vqd-hash-1": solutionBase64
            },
            responseType: "text"
          });
        } catch (postErr) {
          lastError = postErr?.response?.data ? typeof postErr.response.data === "object" ? JSON.stringify(postErr.response.data) : String(postErr.response.data) : postErr?.message || String(postErr);
          console.warn(`[DuckAI] Attempt ${attempt} gagal kirim request: ${lastError}`);
          this.sessionExpire = 0;
          this.cookies = {};
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, attempt * 1500));
          }
          continue;
        }
        const rawText = String(response?.data || "");
        if (rawText.includes("ERR_CHALLENGE") || rawText.includes('"status":418')) {
          lastError = "ERR_CHALLENGE: Server meminta solve ulang (418).";
          console.warn(`[DuckAI] Attempt ${attempt} gagal: ${lastError}`);
          this.sessionExpire = 0;
          this.cookies = {};
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, attempt * 1500));
          }
          continue;
        }
        console.log("[DuckAI] Berhasil menerima stream response!");
        const {
          result,
          chunks
        } = this._sse(rawText);
        const assistantText = result?.text || "";
        historyMessages.push({
          role: "assistant",
          content: "",
          parts: [{
            type: "text",
            text: assistantText
          }]
        });
        const nextStateObj = {
          conversationId: conversationId,
          jwk: jwk,
          model: targetModel,
          messages: historyMessages,
          cookies: this.cookies,
          feVersion: this.feVersion,
          entryScript: this.entryScript
        };
        const nextState = Buffer.from(JSON.stringify(nextStateObj)).toString("base64");
        return {
          status: true,
          result: result?.images ? result.images[0] : result?.text || result,
          state: nextState,
          data: result,
          chunks: chunks
        };
      }
      return {
        status: false,
        result: null,
        state: null,
        error: `Semua percobaan (${maxAttempts} attempts) gagal. Error terakhir: ${lastError}`,
        chunks: []
      };
    } catch (e) {
      console.error(`[DuckAI] Error pada chat: ${e?.message || e}`);
      return {
        status: false,
        result: null,
        state: null,
        error: e?.message || "Internal server error",
        chunks: []
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
  const api = new DuckAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}