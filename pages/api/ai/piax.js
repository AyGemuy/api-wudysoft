import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class PiaxClient {
  constructor() {
    this.debug = true;
    this.api_base = "https://piax-api.piax.org";
    this.mail_base = `https://${apiConfig.DOMAIN_URL}/api/mails/v41`;
    this.device = {
      deviceType: "mobile",
      osPlatform: "web"
    };
    this.token = null;
    this.def_headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      origin: "https://www.piax.org",
      referer: "https://www.piax.org/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.http = axios.create({
      baseURL: this.api_base,
      headers: {
        ...this.def_headers
      }
    });
    this.http.interceptors.request.use(config => {
      try {
        if (this.token && !config.headers?.authorization) {
          config.headers.authorization = this.token;
        }
        if (this.debug) {
          console.log(`\x1b[36m[DEBUG-REQ]\x1b[0m ${config.method?.toUpperCase()} ${config.baseURL || ""}${config.url}`);
        }
        return config;
      } catch {
        return config;
      }
    }, error => Promise.resolve({
      error: error?.message
    }));
    this.http.interceptors.response.use(response => {
      try {
        if (this.debug) {
          console.log(`\x1b[32m[DEBUG-RES]\x1b[0m ${response.config.url} [${response.status}]`);
        }
        return response?.data ?? response;
      } catch {
        return response;
      }
    }, error => {
      try {
        console.error(`\x1b[31m[DEBUG-HTTP-ERR]\x1b[0m ${error?.config?.url} ->`, error?.response?.data || error?.message);
        return Promise.resolve(error?.response?.data || {
          status: "error",
          message: error?.message
        });
      } catch {
        return Promise.resolve({
          status: "error",
          message: "HTTP request failed"
        });
      }
    });
    this.chat_models = [{
      id: 1,
      model_name: "openai/gpt-4o-mini"
    }, {
      id: 2,
      model_name: "openai/gpt-4-turbo"
    }, {
      id: 3,
      model_name: "openai/gpt-4o-2024-11-20"
    }, {
      id: 4,
      model_name: "openai/o1-preview"
    }, {
      id: 5,
      model_name: "anthropic/claude-3.5-sonnet"
    }, {
      id: 6,
      model_name: "anthropic/claude-3-opus"
    }, {
      id: 7,
      model_name: "deepseek/deepseek-chat"
    }, {
      id: 8,
      model_name: "chatPaper"
    }, {
      id: 9,
      model_name: "google/gemini-2.0-flash-001"
    }, {
      id: 10,
      model_name: "deepseek/deepseek-r1"
    }, {
      id: 11,
      model_name: "minimax/minimax-01"
    }, {
      id: 12,
      model_name: "qwen/qvq-72b-preview"
    }, {
      id: 13,
      model_name: "x-ai/grok-2-vision-1212"
    }, {
      id: 14,
      model_name: "meta-llama/llama-3.3-70b-instruct"
    }, {
      id: 15,
      model_name: "anthropic/claude-3.7-sonnet"
    }, {
      id: 16,
      model_name: "openai/o3-mini"
    }, {
      id: 17,
      model_name: "openai/gpt-4.5-preview"
    }, {
      id: 18,
      model_name: "perplexity/sonar-pro"
    }, {
      id: 19,
      model_name: "pair-programmer"
    }, {
      id: 20,
      model_name: "x-ai/grok-3"
    }, {
      id: 21,
      model_name: "x-ai/grok-4"
    }, {
      id: 22,
      model_name: "meta-llama/llama-4-maverick"
    }, {
      id: 23,
      model_name: "openai/gpt-4.1-nano"
    }, {
      id: 24,
      model_name: "openai/gpt-4.1-mini"
    }, {
      id: 25,
      model_name: "openai/gpt-4.1"
    }, {
      id: 26,
      model_name: "pia-deepresearch"
    }, {
      id: 27,
      model_name: "google/gemini-2.5-pro"
    }, {
      id: 28,
      model_name: "google/gemini-2.5-flash"
    }, {
      id: 29,
      model_name: "openai/o4-mini-high"
    }, {
      id: 30,
      model_name: "openai/o4-mini"
    }, {
      id: 31,
      model_name: "deepseek/deepseek-chat-v3-0324"
    }, {
      id: 32,
      model_name: "google/gemma-3-27b-it"
    }, {
      id: 33,
      model_name: "qwen/qwen2.5-vl-32b-instruct"
    }, {
      id: 34,
      model_name: "meta-llama/llama-4-scout"
    }, {
      id: 35,
      model_name: "perplexity/sonar-reasoning-pro"
    }, {
      id: 36,
      model_name: "perplexity/sonar-deep-research"
    }, {
      id: 37,
      model_name: "openai/o1"
    }, {
      id: 38,
      model_name: "qwen/qwen3-30b-a3b"
    }, {
      id: 39,
      model_name: "qwen/qwen3-8b"
    }, {
      id: 40,
      model_name: "qwen/qwen3-32b"
    }, {
      id: 41,
      model_name: "qwen/qwen3-235b-a22b"
    }, {
      id: 42,
      model_name: "anthropic/claude-sonnet-4"
    }, {
      id: 43,
      model_name: "anthropic/claude-opus-4"
    }, {
      id: 44,
      model_name: "openai/gpt-4o-mini-search-preview"
    }, {
      id: 45,
      model_name: "openai/gpt-4o-search-preview"
    }, {
      id: 46,
      model_name: "microsoft/phi-4"
    }, {
      id: 47,
      model_name: "microsoft/phi-4-multimodal-instruct"
    }, {
      id: 48,
      model_name: "mistralai/devstral-small"
    }, {
      id: 49,
      model_name: "mistralai/mistral-medium-3"
    }, {
      id: 50,
      model_name: "mistralai/mistral-saba"
    }, {
      id: 51,
      model_name: "mistralai/codestral-2501"
    }, {
      id: 52,
      model_name: "deepseek/deepseek-r1-0528"
    }, {
      id: 53,
      model_name: "openai/o3-pro"
    }, {
      id: 54,
      model_name: "openai/o3"
    }, {
      id: 55,
      model_name: "minimax/minimax-m1"
    }, {
      id: 56,
      model_name: "psychologist"
    }, {
      id: 57,
      model_name: "decision-making"
    }, {
      id: 58,
      model_name: "slang-dictionary"
    }, {
      id: 59,
      model_name: "creative-writing"
    }, {
      id: 60,
      model_name: "interviewer"
    }, {
      id: 61,
      model_name: "brainstormer"
    }, {
      id: 62,
      model_name: "moonshotai/kimi-k2"
    }, {
      id: 63,
      model_name: "jesus"
    }, {
      id: 64,
      model_name: "qwen/qwen3-coder"
    }, {
      id: 65,
      model_name: "z-ai/glm-4.5"
    }, {
      id: 66,
      model_name: "z-ai/glm-4.5-air"
    }, {
      id: 67,
      model_name: "anthropic/claude-opus-4.1"
    }, {
      id: 68,
      model_name: "openai/gpt-5-nano"
    }, {
      id: 69,
      model_name: "openai/gpt-5-mini"
    }, {
      id: 70,
      model_name: "openai/gpt-5"
    }, {
      id: 71,
      model_name: "openai/gpt-5-chat"
    }, {
      id: 72,
      model_name: "deepseek/deepseek-chat-v3.1"
    }, {
      id: 73,
      model_name: "qwen/qwen3-max"
    }, {
      id: 74,
      model_name: "x-ai/grok-code-fast-1"
    }, {
      id: 75,
      model_name: "deepseek/deepseek-v3.2-exp"
    }, {
      id: 76,
      model_name: "anthropic/claude-sonnet-4.5"
    }, {
      id: 77,
      model_name: "z-ai/glm-4.6"
    }, {
      id: 78,
      model_name: "anthropic/claude-haiku-4.5"
    }, {
      id: 79,
      model_name: "minimax/minimax-m2"
    }, {
      id: 80,
      model_name: "qwen/qwen3-vl-8b-instruct"
    }, {
      id: 81,
      model_name: "moonshotai/kimi-k2-thinking"
    }, {
      id: 82,
      model_name: "openai/gpt-5.1"
    }, {
      id: 83,
      model_name: "google/gemini-3-pro-preview"
    }, {
      id: 84,
      model_name: "x-ai/grok-4.1-fast"
    }, {
      id: 85,
      model_name: "anthropic/claude-opus-4.5"
    }, {
      id: 86,
      model_name: "deepseek/deepseek-v3.2"
    }, {
      id: 87,
      model_name: "mistralai/mistral-large-2512"
    }, {
      id: 88,
      model_name: "openai/gpt-5.1-codex"
    }, {
      id: 89,
      model_name: "openai/gpt-5.2"
    }, {
      id: 91,
      model_name: "google/gemini-3-flash-preview"
    }, {
      id: 92,
      model_name: "z-ai/glm-4.7"
    }, {
      id: 93,
      model_name: "openai/gpt-5.2-codex"
    }, {
      id: 94,
      model_name: "minimax/minimax-m2.1"
    }, {
      id: 95,
      model_name: "minimax/minimax-m2-her"
    }, {
      id: 96,
      model_name: "moonshotai/kimi-k2.5"
    }, {
      id: 97,
      model_name: "anthropic/claude-opus-4.6"
    }, {
      id: 98,
      model_name: "z-ai/glm-5"
    }, {
      id: 99,
      model_name: "minimax/minimax-m2.5"
    }, {
      id: 100,
      model_name: "qwen/qwen3.5-plus-02-15"
    }, {
      id: 101,
      model_name: "anthropic/claude-sonnet-4.6"
    }, {
      id: 102,
      model_name: "google/gemini-3.1-pro-preview"
    }, {
      id: 103,
      model_name: "openai/gpt-5.3-codex"
    }, {
      id: 104,
      model_name: "google/gemini-3.1-flash-lite-preview"
    }, {
      id: 105,
      model_name: "openai/gpt-5.3-chat"
    }, {
      id: 106,
      model_name: "openai/gpt-5.4"
    }, {
      id: 107,
      model_name: "openai/gpt-5.4-pro"
    }, {
      id: 108,
      model_name: "x-ai/grok-4.20-beta"
    }, {
      id: 109,
      model_name: "openai/gpt-5.4-mini"
    }, {
      id: 110,
      model_name: "openai/gpt-5.4-nano"
    }, {
      id: 111,
      model_name: "minimax/minimax-m2.7"
    }, {
      id: 112,
      model_name: "xiaomi/mimo-v2.5-pro"
    }, {
      id: 113,
      model_name: "xiaomi/mimo-v2.5"
    }, {
      id: 114,
      model_name: "bytedance-seed/seed-2.0-mini"
    }, {
      id: 115,
      model_name: "bytedance-seed/seed-2.0-lite"
    }, {
      id: 116,
      model_name: "z-ai/glm-5.1"
    }, {
      id: 117,
      model_name: "qwen/qwen3.6-plus"
    }, {
      id: 118,
      model_name: "anthropic/claude-opus-4.7"
    }, {
      id: 119,
      model_name: "moonshotai/kimi-k2.6"
    }, {
      id: 120,
      model_name: "openai/gpt-5.5"
    }, {
      id: 121,
      model_name: "openai/gpt-5.5-pro"
    }, {
      id: 122,
      model_name: "deepseek/deepseek-v4-flash"
    }, {
      id: 123,
      model_name: "deepseek/deepseek-v4-pro"
    }, {
      id: 124,
      model_name: "x-ai/grok-4.3"
    }, {
      id: 125,
      model_name: "google/gemini-3.5-flash"
    }, {
      id: 126,
      model_name: "qwen/qwen3.7-max"
    }, {
      id: 127,
      model_name: "anthropic/claude-opus-4.8"
    }, {
      id: 128,
      model_name: "minimax/minimax-m3"
    }, {
      id: 129,
      model_name: "anthropic/claude-fable-5"
    }, {
      id: 130,
      model_name: "z-ai/glm-5.2"
    }, {
      id: 131,
      model_name: "anthropic/claude-sonnet-5"
    }, {
      id: 132,
      model_name: "x-ai/grok-4.5"
    }, {
      id: 133,
      model_name: "openai/gpt-5.6-luna"
    }, {
      id: 134,
      model_name: "openai/gpt-5.6-terra"
    }, {
      id: 135,
      model_name: "openai/gpt-5.6-sol"
    }, {
      id: 136,
      model_name: "moonshotai/kimi-k3"
    }, {
      id: 137,
      model_name: "google/gemini-3.6-flash"
    }, {
      id: 138,
      model_name: "anthropic/claude-opus-5"
    }, {
      id: 139,
      model_name: "deepseek/deepseek-v4-flash-0731"
    }, {
      id: 140,
      model_name: "meta/muse-spark-1.2"
    }];
    this.task_models = [{
      id: 238,
      model_name: "rodin-v2.5"
    }, {
      id: 237,
      model_name: "seedance-2.5/20/720p"
    }, {
      id: 236,
      model_name: "seedance-2.5/15/720p"
    }, {
      id: 235,
      model_name: "seedance-2.5/10/720p"
    }, {
      id: 234,
      model_name: "seedance-2.5/5/720p"
    }, {
      id: 233,
      model_name: "seedance-2.5/20/480p"
    }, {
      id: 232,
      model_name: "seedance-2.5/15/480p"
    }, {
      id: 231,
      model_name: "seedance-2.5/10/480p"
    }, {
      id: 230,
      model_name: "seedance-2.5/5/480p"
    }, {
      id: 229,
      model_name: "hunyuan-3d-v3"
    }, {
      id: 178,
      model_name: "gpt-image-2"
    }, {
      id: 228,
      model_name: "qwen-image-3"
    }, {
      id: 227,
      model_name: "flux-3/15/1080p"
    }, {
      id: 226,
      model_name: "flux-3/10/1080p"
    }, {
      id: 225,
      model_name: "flux-3/8/1080p"
    }, {
      id: 224,
      model_name: "flux-3/5/1080p"
    }, {
      id: 223,
      model_name: "flux-3/15/720p"
    }, {
      id: 222,
      model_name: "flux-3/10/720p"
    }, {
      id: 221,
      model_name: "flux-3/8/720p"
    }, {
      id: 220,
      model_name: "flux-3/5/720p"
    }, {
      id: 219,
      model_name: "grok-imagine-video-1.5/10/1080p"
    }, {
      id: 218,
      model_name: "grok-imagine-video-1.5/8/1080p"
    }, {
      id: 217,
      model_name: "grok-imagine-video-1.5/5/1080p"
    }, {
      id: 216,
      model_name: "grok-imagine-video-1.5/10/720p"
    }, {
      id: 215,
      model_name: "grok-imagine-video-1.5/8/720p"
    }, {
      id: 214,
      model_name: "grok-imagine-video-1.5/5/720p"
    }, {
      id: 213,
      model_name: "grok-imagine-video-1.5/10/480p"
    }, {
      id: 212,
      model_name: "grok-imagine-video-1.5/8/480p"
    }, {
      id: 211,
      model_name: "grok-imagine-video-1.5/5/480p"
    }, {
      id: 210,
      model_name: "minimax-h3/15/768p"
    }, {
      id: 209,
      model_name: "minimax-h3/12/768p"
    }, {
      id: 208,
      model_name: "minimax-h3/8/768p"
    }, {
      id: 207,
      model_name: "minimax-h3/5/768p"
    }, {
      id: 206,
      model_name: "gpt-image2"
    }, {
      id: 205,
      model_name: "happy-horse-1.1/15/1080p"
    }, {
      id: 204,
      model_name: "happy-horse-1.1/10/1080p"
    }, {
      id: 203,
      model_name: "happy-horse-1.1/5/1080p"
    }, {
      id: 202,
      model_name: "happy-horse-1.1/15/720p"
    }, {
      id: 201,
      model_name: "happy-horse-1.1/10/720p"
    }, {
      id: 200,
      model_name: "happy-horse-1.1/5/720p"
    }, {
      id: 199,
      model_name: "wan-2.7/15/1080p"
    }, {
      id: 198,
      model_name: "wan-2.7/10/1080p"
    }, {
      id: 197,
      model_name: "wan-2.7/5/1080p"
    }, {
      id: 196,
      model_name: "wan-2.7/15/720p"
    }, {
      id: 195,
      model_name: "wan-2.7/10/720p"
    }, {
      id: 194,
      model_name: "wan-2.7/5/720p"
    }, {
      id: 193,
      model_name: "kling-video/v3.0-pro/image-to-video/10"
    }, {
      id: 192,
      model_name: "kling-video/v3.0-pro/image-to-video/5"
    }, {
      id: 191,
      model_name: "kling-video/v3.0-pro/text-to-video/10"
    }, {
      id: 190,
      model_name: "kling-video/v3.0-pro/text-to-video/5"
    }, {
      id: 189,
      model_name: "kling-video/v3.0-std/image-to-video/10"
    }, {
      id: 187,
      model_name: "kling-video/v3.0-std/image-to-video/5"
    }, {
      id: 186,
      model_name: "kling-video/v3.0-std/text-to-video/10"
    }, {
      id: 185,
      model_name: "kling-video/v3.0-std/text-to-video/5"
    }, {
      id: 184,
      model_name: "happy-horse-1.0/15/1080p"
    }, {
      id: 183,
      model_name: "happy-horse-1.0/10/1080p"
    }, {
      id: 182,
      model_name: "happy-horse-1.0/5/1080p"
    }, {
      id: 181,
      model_name: "happy-horse-1.0/15/720p"
    }, {
      id: 180,
      model_name: "happy-horse-1.0/10/720p"
    }, {
      id: 179,
      model_name: "happy-horse-1.0/5/720p"
    }, {
      id: 177,
      model_name: "grok-imagine-video/10/720p"
    }, {
      id: 176,
      model_name: "grok-imagine-video/8/720p"
    }, {
      id: 175,
      model_name: "grok-imagine-video/5/720p"
    }, {
      id: 174,
      model_name: "grok-imagine-video/10/480p"
    }, {
      id: 173,
      model_name: "grok-imagine-video/8/480p"
    }, {
      id: 172,
      model_name: "grok-imagine-video/5/480p"
    }, {
      id: 171,
      model_name: "seedance-2-0/15/720p"
    }, {
      id: 170,
      model_name: "seedance-2-0/12/720p"
    }, {
      id: 169,
      model_name: "seedance-2-0/8/720p"
    }, {
      id: 168,
      model_name: "seedance-2-0/5/720p"
    }, {
      id: 167,
      model_name: "wan2.7-pro"
    }, {
      id: 166,
      model_name: "seedance-1-5-pro/10/1080p"
    }, {
      id: 165,
      model_name: "seedance-1-5-pro/10/720p"
    }, {
      id: 164,
      model_name: "seedance-1-5-pro/10/480p"
    }, {
      id: 163,
      model_name: "seedance-1-5-pro/5/1080p"
    }, {
      id: 162,
      model_name: "seedance-1-5-pro/5/720p"
    }, {
      id: 161,
      model_name: "seedance-1-5-pro/5/480p"
    }, {
      id: 160,
      model_name: "seedream5"
    }, {
      id: 159,
      model_name: "nano-banana-2"
    }, {
      id: 158,
      model_name: "grok-imagine-image"
    }, {
      id: 157,
      model_name: "z-image"
    }, {
      id: 156,
      model_name: "flux-2-klein-9b"
    }, {
      id: 155,
      model_name: "flux-2-klein-4b"
    }, {
      id: 154,
      model_name: "flux-2-max"
    }, {
      id: 153,
      model_name: "flux-2-flex"
    }, {
      id: 152,
      model_name: "flux-2-pro"
    }, {
      id: 148,
      model_name: "wan-2.6/15/720p"
    }, {
      id: 147,
      model_name: "wan-2.6/10/720p"
    }, {
      id: 146,
      model_name: "wan-2.6/5/720p"
    }, {
      id: 145,
      model_name: "wan-2.6/15/1080p"
    }, {
      id: 144,
      model_name: "wan-2.6/10/1080p"
    }, {
      id: 143,
      model_name: "wan-2.6/5/1080p"
    }, {
      id: 142,
      model_name: "kling-video/o1/image-to-vidoe/10"
    }, {
      id: 141,
      model_name: "kling-video/o1/image-to-video/5"
    }, {
      id: 140,
      model_name: "kling-video/o1/text-to-video/10"
    }, {
      id: 139,
      model_name: "kling-video/o1/text-to-video/5"
    }, {
      id: 138,
      model_name: "gpt-image-1.5"
    }, {
      id: 137,
      model_name: "seedream4.5"
    }, {
      id: 136,
      model_name: "kling-video/v2.6/image-to-video/10"
    }, {
      id: 135,
      model_name: "kling-video/v2.6/image-to-video/5"
    }, {
      id: 134,
      model_name: "kling-video/v2.6/text-to-video/10"
    }, {
      id: 133,
      model_name: "kling-video/v2.6/text-to-video/5"
    }, {
      id: 132,
      model_name: "gemini-3-pro-image"
    }, {
      id: 131,
      model_name: "sora2-pro/12/1080p"
    }, {
      id: 130,
      model_name: "sora2-pro/8/1080p"
    }, {
      id: 129,
      model_name: "sora2-pro/4/1080p"
    }, {
      id: 128,
      model_name: "sora2-pro/12/720p"
    }, {
      id: 127,
      model_name: "sora2-pro/8/720p"
    }, {
      id: 126,
      model_name: "sora2-pro/4/720p"
    }, {
      id: 125,
      model_name: "sora2/12"
    }, {
      id: 124,
      model_name: "sora2/8"
    }, {
      id: 123,
      model_name: "sora2/4"
    }, {
      id: 122,
      model_name: "veo3.1-fast/8/audio"
    }, {
      id: 121,
      model_name: "veo3.1-fast/8"
    }, {
      id: 120,
      model_name: "veo3.1-fast/6/audio"
    }, {
      id: 119,
      model_name: "veo3.1-fast/6"
    }, {
      id: 118,
      model_name: "veo3.1-fast/4/audio"
    }, {
      id: 117,
      model_name: "veo3.1-fast/4"
    }, {
      id: 116,
      model_name: "veo3.1/8/audio"
    }, {
      id: 115,
      model_name: "veo3.1/8"
    }, {
      id: 114,
      model_name: "veo3.1/6/audio"
    }, {
      id: 113,
      model_name: "veo3.1/6"
    }, {
      id: 112,
      model_name: "veo3.1/4/audio"
    }, {
      id: 111,
      model_name: "veo3.1/4"
    }, {
      id: 110,
      model_name: "wan-2.2-plus/5/1080p"
    }, {
      id: 109,
      model_name: "wan-2.2-plus/5/480p"
    }, {
      id: 108,
      model_name: "wan-2.2-flash/5/720p"
    }, {
      id: 107,
      model_name: "wan-2.2-flash/5/480p"
    }, {
      id: 106,
      model_name: "wan-2.5/10/1080p"
    }, {
      id: 105,
      model_name: "wan-2.5/10/720p"
    }, {
      id: 104,
      model_name: "wan-2.5/10/480p"
    }, {
      id: 103,
      model_name: "wan-2.5/5/1080p"
    }, {
      id: 102,
      model_name: "wan-2.5/5/720p"
    }, {
      id: 101,
      model_name: "wan-2.5/5/480p"
    }, {
      id: 100,
      model_name: "pika-2.2/10/1080p"
    }, {
      id: 99,
      model_name: "pika-2.2/10/720p"
    }, {
      id: 98,
      model_name: "pika-2.2/5/1080p"
    }, {
      id: 97,
      model_name: "pika-2.2/5/720p"
    }, {
      id: 96,
      model_name: "pika-2.1/5/1080p"
    }, {
      id: 95,
      model_name: "pixverse-v4/8/720p"
    }, {
      id: 94,
      model_name: "pixverse-v4/8/540p"
    }, {
      id: 93,
      model_name: "pixverse-v4/8/360p"
    }, {
      id: 92,
      model_name: "pixverse-v4/5/1080p"
    }, {
      id: 91,
      model_name: "pixverse-v4/5/720p"
    }, {
      id: 90,
      model_name: "pixverse-v4/5/540p"
    }, {
      id: 89,
      model_name: "pixverse-v4/5/360p"
    }, {
      id: 88,
      model_name: "pixverse-v4.5/8/720p"
    }, {
      id: 87,
      model_name: "pixverse-v4.5/8/540p"
    }, {
      id: 86,
      model_name: "pixverse-v4.5/8/360p"
    }, {
      id: 85,
      model_name: "pixverse-v4.5/5/1080p"
    }, {
      id: 84,
      model_name: "pixverse-v4.5/5/720p"
    }, {
      id: 83,
      model_name: "pixverse-v4.5/5/540p"
    }, {
      id: 82,
      model_name: "pixverse-v4.5/5/360p"
    }, {
      id: 76,
      model_name: "pixverse-v5/8/720p"
    }, {
      id: 75,
      model_name: "pixverse-v5/8/540p"
    }, {
      id: 74,
      model_name: "pixverse-v5/8/360p"
    }, {
      id: 73,
      model_name: "pixverse-v5/5/1080p"
    }, {
      id: 72,
      model_name: "pixverse-v5/5/720p"
    }, {
      id: 71,
      model_name: "pixverse-v5/5/540p"
    }, {
      id: 70,
      model_name: "pixverse-v5/5/360p"
    }, {
      id: 68,
      model_name: "hunyuan/5"
    }, {
      id: 67,
      model_name: "kling-video/v2.5/turbo/image-to-video/10"
    }, {
      id: 66,
      model_name: "kling-video/v2.5/turbo/image-to-video/5"
    }, {
      id: 65,
      model_name: "kling-video/v2.5/turbo/text-to-video/10"
    }, {
      id: 64,
      model_name: "kling-video/v2.5/turbo/text-to-video/5"
    }, {
      id: 63,
      model_name: "kling-video/v2.1/master/image-to-video/10"
    }, {
      id: 62,
      model_name: "kling-video/v2.1/master/image-to-video/5"
    }, {
      id: 61,
      model_name: "kling-video/v2.1/master/text-to-video/10"
    }, {
      id: 60,
      model_name: "kling-video/v2.1/master/text-to-video/5"
    }, {
      id: 59,
      model_name: "gemini-2.5-flash-image"
    }, {
      id: 58,
      model_name: "midjourney-video"
    }, {
      id: 57,
      model_name: "imagen-4.0-ultra-generate-preview-06-06"
    }, {
      id: 56,
      model_name: "seedance-1-0-lite/10/1080p"
    }, {
      id: 55,
      model_name: "seedance-1-0-lite/10/720p"
    }, {
      id: 54,
      model_name: "seedance-1-0-lite/10/480p"
    }, {
      id: 53,
      model_name: "seedance-1-0-lite/5/1080p"
    }, {
      id: 52,
      model_name: "seedance-1-0-lite/5/720p"
    }, {
      id: 51,
      model_name: "seedance-1-0-lite/5/480p"
    }, {
      id: 50,
      model_name: "flux-pro-1.1"
    }, {
      id: 49,
      model_name: "flux-pro-1.1-ultra"
    }, {
      id: 48,
      model_name: "flux-kontext-pro"
    }, {
      id: 47,
      model_name: "flux-kontext-max"
    }, {
      id: 46,
      model_name: "luma-ray-2-0/9/4k"
    }, {
      id: 45,
      model_name: "luma-ray-2-0/9/1080p"
    }, {
      id: 44,
      model_name: "luma-ray-2-0/9/720p"
    }, {
      id: 43,
      model_name: "luma-ray-2-0/9/540p"
    }, {
      id: 42,
      model_name: "luma-ray-2-0/5/4k"
    }, {
      id: 41,
      model_name: "luma-ray-2-0/5/1080p"
    }, {
      id: 40,
      model_name: "luma-ray-2-0/5/720p"
    }, {
      id: 39,
      model_name: "luma-ray-2-0/5/540p"
    }, {
      id: 38,
      model_name: "vidu-q1/text-to-video"
    }, {
      id: 37,
      model_name: "vidu-q1/image-to-video"
    }, {
      id: 36,
      model_name: "runway-gen-4-turbo/10"
    }, {
      id: 35,
      model_name: "runway-gen-4-turbo/5"
    }, {
      id: 34,
      model_name: "veo3/8/audio"
    }, {
      id: 33,
      model_name: "veo3/8"
    }, {
      id: 32,
      model_name: "veo2/8"
    }, {
      id: 31,
      model_name: "veo2/7"
    }, {
      id: 30,
      model_name: "veo2/6"
    }, {
      id: 29,
      model_name: "veo2/5"
    }, {
      id: 28,
      model_name: "V_2_TURBO"
    }, {
      id: 27,
      model_name: "V_2"
    }, {
      id: 26,
      model_name: "imagen-3.0-generate-002"
    }, {
      id: 25,
      model_name: "gpt-image-1"
    }, {
      id: 24,
      model_name: "kling-video/v2/master/image-to-video/10"
    }, {
      id: 23,
      model_name: "kling-video/v2/master/image-to-video/5"
    }, {
      id: 22,
      model_name: "kling-video/v2/master/text-to-video/10"
    }, {
      id: 21,
      model_name: "kling-video/v2/master/text-to-video/5"
    }, {
      id: 20,
      model_name: "kling-video/v1.6/pro/image-to-video/10"
    }, {
      id: 19,
      model_name: "kling-video/v1.6/pro/image-to-video/5"
    }, {
      id: 18,
      model_name: "kling-video/v1.6/pro/text-to-video/10"
    }, {
      id: 17,
      model_name: "kling-video/v1.6/pro/text-to-video/5"
    }, {
      id: 16,
      model_name: "kling-video/v1.6/standard/image-to-video/10"
    }, {
      id: 15,
      model_name: "kling-video/v1.6/standard/image-to-video/5"
    }, {
      id: 14,
      model_name: "kling-video/v1.6/standard/text-to-video/10"
    }, {
      id: 13,
      model_name: "kling-video/v1.6/standard/text-to-video/5"
    }, {
      id: 12,
      model_name: "sora_image"
    }, {
      id: 11,
      model_name: "gpt-4o-image"
    }, {
      id: 6,
      model_name: "midjourney"
    }, {
      id: 5,
      model_name: "flux-pro"
    }, {
      id: 4,
      model_name: "flux-dev"
    }, {
      id: 3,
      model_name: "flux"
    }, {
      id: 2,
      model_name: "dall-e-3"
    }];
    this.image_endpoints = {
      wan: {
        path: "/ai-api/ai/images/wanImageTaskSubmit",
        agent_id: "157"
      },
      grok: {
        path: "/ai-api/ai/images/grokImagineImageTaskSubmit",
        agent_id: "198"
      },
      qwen: {
        path: "/ai-api/ai/images/qwenImageTaskSubmit",
        agent_id: "192"
      },
      gpt: {
        path: "/ai-api/ai/images/gptImageTaskSubmit",
        agent_id: "181"
      },
      seedream: {
        path: "/ai-api/ai/images/seedreamTaskSubmit",
        agent_id: "155"
      },
      gemini: {
        path: "/ai-api/ai/images/geminiFlashImageTaskSubmit",
        agent_id: "91"
      },
      nano: {
        path: "/ai-api/ai/images/geminiFlashImageTaskSubmit",
        agent_id: "142"
      },
      imagen: {
        path: "/ai-api/ai/images/imagenTaskSubmit",
        agent_id: "73"
      }
    };
  }
  _slp(ms) {
    try {
      return new Promise(r => setTimeout(r, ms));
    } catch {
      return Promise.resolve();
    }
  }
  _rnd(len = 8) {
    try {
      return crypto.randomBytes(len).toString("hex");
    } catch {
      return Math.random().toString(36).substring(2, 2 + len);
    }
  }
  _parseOtp(emails) {
    try {
      if (!Array.isArray(emails) || emails.length === 0) return null;
      for (const item of emails) {
        const detail = item?.detail || item;
        const html_list = Array.isArray(detail?.html) ? detail.html : [detail?.html || ""];
        const html_str = html_list.join(" ");
        const text_str = String(detail?.text || detail?.text_preview || detail?.intro || "");
        const p1 = html_str.match(/<strong[^>]*>\s*(\d{6})\s*<\/strong>/i);
        if (p1?.[1]) return p1[1];
        const p2 = (html_str + " " + text_str).match(/(?:verification code is|verification code|code is)[\s\S]{0,40}?(\d{6})/i);
        if (p2?.[1]) return p2[1];
        const p3 = html_str.match(/\b\d{6}\b/) || text_str.match(/\b\d{6}\b/);
        if (p3?.[0]) return p3[0];
      }
      return null;
    } catch {
      return null;
    }
  }
  async _buf(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return {
        data: input,
        name: `${this._rnd(6)}.jpg`
      };
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          const matches = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const data = Buffer.from(matches?.[2] || input.split(",")[1], "base64");
          return {
            data: data,
            name: `${this._rnd(6)}.jpg`
          };
        }
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return {
            data: Buffer.from(res?.data),
            name: `${this._rnd(6)}.jpg`
          };
        }
        if (/^[A-Za-z0-9+/=]+$/.test(input)) {
          return {
            data: Buffer.from(input, "base64"),
            name: `${this._rnd(6)}.jpg`
          };
        }
      }
      return null;
    } catch (err) {
      console.error("[BUF-ERR]", err?.message);
      return null;
    }
  }
  _valMod(mode, model_name) {
    try {
      if (!model_name) return true;
      if (mode === "chat") {
        return this.chat_models.some(m => m?.model_name?.toLowerCase() === model_name?.toLowerCase());
      }
      if (mode === "image") {
        return this.task_models.some(m => m?.model_name?.toLowerCase() === model_name?.toLowerCase());
      }
      return true;
    } catch {
      return false;
    }
  }
  async autoClaim(token) {
    try {
      const active_token = token || this.token;
      if (!active_token) return {
        status: "error",
        claimed: false,
        message: "Missing token"
      };
      console.log("[AUTO-CLAIM] Checking daily bonus status...");
      const status = await this.http.post("/trade-api/trade/daily/status", {
        device: this.device
      }, {
        headers: {
          authorization: active_token,
          "content-type": "application/json"
        }
      });
      console.log(`[AUTO-CLAIM] Claimed today: ${status?.claimedToday ? "YES" : "NO"}`);
      if (!status?.claimedToday) {
        console.log("[AUTO-CLAIM] Claiming today reward...");
        const claim = await this.http.post("/trade-api/trade/daily/claim", {
          device: this.device
        }, {
          headers: {
            authorization: active_token,
            "content-type": "application/json"
          }
        });
        console.log(`[AUTO-CLAIM] Successfully claimed ${claim?.todayReward || 0} credits. Streak: ${claim?.streak || 1}`);
        return {
          status: "success",
          claimed: true,
          reward: claim?.todayReward || 0,
          streak: claim?.streak || 1
        };
      }
      return {
        status: "success",
        claimed: false,
        message: "Already claimed today",
        streak: status?.streak || 0
      };
    } catch (err) {
      console.error("[AUTO-CLAIM-ERR]", err?.message);
      return {
        status: "error",
        claimed: false,
        message: err?.message
      };
    }
  }
  async _auth() {
    try {
      console.log("[AUTH] Step 1: Creating temporary email (v41)...");
      const mail_res = await axios.get(`${this.mail_base}?action=create`, {
        headers: {
          ...this.def_headers
        }
      });
      const email = mail_res?.data?.result?.address;
      const state = mail_res?.data?.state;
      if (!email || !state) {
        console.error("[AUTH-ERR] Failed to create email or state with v41");
        return null;
      }
      console.log(`[AUTH] Email generated: ${email}`);
      console.log("[AUTH] Step 2: Sending verification code request...");
      const send_code = await this.http.post("/user-api/user/sendEmailVerifyCode", {
        channel: "pia",
        email: email.trim(),
        device: this.device
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      if (!send_code || send_code?.code !== 1) {
        console.error("[AUTH-ERR] Send verify code failed:", send_code);
        return null;
      }
      await this._slp(2e3);
      console.log("[AUTH] Step 3: Polling inbox for verification code...");
      let code = null;
      for (let i = 0; i < 30; i++) {
        await this._slp(2500);
        const check = await axios.get(`${this.mail_base}?action=message&state=${encodeURIComponent(state)}`, {
          headers: {
            ...this.def_headers
          }
        });
        const emails = check?.data?.result?.emails || check?.data?.result?.messages || [];
        code = this._parseOtp(emails);
        if (code) break;
      }
      if (!code) {
        console.error("[AUTH-ERR] Verification OTP code not found in v41 inbox");
        return null;
      }
      console.log(`[AUTH] OTP Extracted: ${code}`);
      await this._slp(1500);
      console.log("[AUTH] Step 4: Submitting emailLogin payload...");
      const login = await this.http.post("/user-api/user/emailLogin", {
        email: email.trim(),
        code: String(code).trim(),
        channel: "pia",
        device: this.device
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      const token = login?.token;
      if (!token) {
        console.error("[AUTH-ERR] Login failed. Response:", login);
        return null;
      }
      console.log("[AUTH] Authentication succeeded! Token acquired.");
      this.token = token;
      await this.autoClaim(token);
      return token;
    } catch (err) {
      console.error("[AUTH-ERR]", err?.message);
      return null;
    }
  }
  async _upChat(buffer_obj, token, agent_id = "184") {
    try {
      if (!buffer_obj?.data) return null;
      console.log("[UPLOAD-CHAT] Uploading attachment for chat agent...");
      const form = new FormData();
      form.append("agentId", agent_id);
      form.append("files", buffer_obj.data, {
        filename: buffer_obj.name,
        contentType: "image/jpeg"
      });
      const res = await this.http.post("/ai-api/ai/agent/uploadFile", form, {
        headers: {
          ...form.getHeaders(),
          authorization: token || this.token
        }
      });
      const file = res?.files?.[0] || res?.data?.files?.[0];
      if (!file?.url && !file?.fileKey) return null;
      return {
        transferMethod: "local_file",
        uploadFileId: file?.fileKey || "",
        url: file?.url || "",
        fileName: buffer_obj.name,
        type: "image"
      };
    } catch (err) {
      console.error("[UPLOAD-CHAT-ERR]", err?.message);
      return null;
    }
  }
  async _upImg(buffer_obj, token, agent_id = "157") {
    try {
      if (!buffer_obj?.data) return null;
      console.log("[UPLOAD-IMG] Uploading storage media for image task...");
      const form = new FormData();
      form.append("agentId", agent_id);
      form.append("files", buffer_obj.data, {
        filename: buffer_obj.name,
        contentType: "image/jpeg"
      });
      const res = await this.http.post("/ai-api/ai/storage/upload", form, {
        headers: {
          ...form.getHeaders(),
          authorization: token || this.token
        }
      });
      const file = res?.files?.[0] || res?.data?.files?.[0];
      return file?.url || null;
    } catch (err) {
      console.error("[UPLOAD-IMG-ERR]", err?.message);
      return null;
    }
  }
  async _pollTask(task_id, token, max_attempts = 60) {
    try {
      if (!task_id) return {
        status: "error",
        result: "Missing taskId"
      };
      console.log(`[POLL] Awaiting completion for Task ID: ${task_id}...`);
      for (let i = 0; i < max_attempts; i++) {
        await this._slp(2500);
        const res = await this.http.post("/ai-api/ai/task/get", {
          taskId: task_id,
          device: this.device
        }, {
          headers: {
            authorization: token || this.token,
            "content-type": "application/json"
          }
        });
        const task = res?.task;
        const status = task?.status?.toLowerCase();
        console.log(`[POLL] Status: ${status || "processing"}`);
        if (status === "success") {
          let parsed_output = null;
          if (typeof task?.output === "string") {
            try {
              parsed_output = JSON.parse(task.output);
            } catch {
              parsed_output = task.output;
            }
          } else {
            parsed_output = task?.output || null;
          }
          let parsed_input = null;
          if (typeof task?.input === "string") {
            try {
              parsed_input = JSON.parse(task.input);
            } catch {
              parsed_input = task.input;
            }
          } else {
            parsed_input = task?.input || null;
          }
          const image_url = task?.outputFileUrl || parsed_output?.images?.[0]?.url || null;
          const result_payload = {
            url: image_url,
            output: parsed_output,
            input: parsed_input,
            model: task?.model || null,
            status: task?.status || "success",
            finish_at: task?.finishAt || null,
            task_id: task?.id || task_id
          };
          return {
            status: "success",
            result: result_payload,
            raw_task: task
          };
        }
        if (status === "failed") {
          return {
            status: "error",
            result: task?.failedReason || "Task generation failed"
          };
        }
      }
      return {
        status: "error",
        result: "Task polling timed out"
      };
    } catch (err) {
      console.error("[POLL-ERR]", err?.message);
      return {
        status: "error",
        result: err?.message
      };
    }
  }
  async generate({
    token = null,
    mode = "chat",
    prompt = "",
    messages = [],
    media = null,
    image = null,
    model = null,
    agent_id = null,
    conversation_id = null,
    aspect_ratio = "1:1",
    image_size = "512x512",
    ...rest
  } = {}) {
    try {
      const active_token = token || this.token || await this._auth();
      if (!active_token) {
        return {
          status: "error",
          result: "Authentication failed. Unable to acquire token.",
          chunks: [],
          token: null
        };
      }
      const raw_media = media || image || null;
      let buffer_media = null;
      if (raw_media) {
        console.log("[RESOLVE] Processing media input...");
        buffer_media = await this._buf(raw_media);
      }
      this._valMod(mode, model);
      if (mode === "chat") {
        console.log("[EXEC-CHAT] Initiating chat stream...");
        const user_query = prompt || (messages.length ? messages[messages.length - 1]?.content : "") || "Hello";
        const active_agent = agent_id || "184";
        const files_payload = [];
        if (buffer_media) {
          const uploaded_file = await this._upChat(buffer_media, active_token, active_agent);
          if (uploaded_file) files_payload.push(uploaded_file);
        }
        const conv_id = conversation_id || crypto.randomUUID();
        const body = {
          device: {
            deviceType: "mobile"
          },
          agentId: active_agent,
          query: user_query,
          conversationId: conv_id,
          parentMessageId: "",
          files: files_payload,
          inputs: {
            "tools.enable": "true",
            "tools.network": "true",
            "tools.fetch_webpage": "true",
            "tools.reasoning": "false",
            deep_research_mode: "false",
            "reasoning.exclude": "true",
            "tools.preference": "false",
            "preferences.inject": "false",
            private_mode: "false",
            ...rest?.inputs || {}
          }
        };
        const res = await axios.post(`${this.api_base}/ai-api/ai/agent/chatStream`, body, {
          headers: {
            ...this.def_headers,
            accept: "*/*",
            "content-type": "application/json",
            authorization: active_token
          },
          responseType: "text"
        });
        console.log("[EXEC-CHAT] Stream received. Aggregating output...");
        const chunks = [];
        let final_text = "";
        const lines = (res?.data || "").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:") && !trimmed.includes("[DONE]")) {
            try {
              const json_str = trimmed.slice(5).trim();
              const parsed = JSON.parse(json_str);
              chunks.push(parsed);
              const delta_content = parsed?.choices?.[0]?.delta?.content || "";
              if (delta_content) {
                final_text += delta_content;
              }
            } catch {}
          }
        }
        return {
          status: "success",
          result: final_text.trim(),
          chunks: chunks,
          token: active_token
        };
      }
      if (mode === "image") {
        console.log("[EXEC-IMAGE] Submitting image generation task...");
        const user_prompt = prompt || (messages.length ? messages[messages.length - 1]?.content : "");
        if (!user_prompt) {
          return {
            status: "error",
            result: "Prompt is mandatory for image generation",
            chunks: [],
            token: active_token
          };
        }
        const active_model = model || "wan2.7-pro";
        let endpoint_conf = this.image_endpoints["wan"];
        for (const key of Object.keys(this.image_endpoints)) {
          if (active_model.toLowerCase().includes(key)) {
            endpoint_conf = this.image_endpoints[key];
            break;
          }
        }
        const active_agent = agent_id || endpoint_conf?.agent_id || "157";
        const uploaded_urls = [];
        if (buffer_media) {
          const uploaded_url = await this._upImg(buffer_media, active_token, active_agent);
          if (uploaded_url) uploaded_urls.push(uploaded_url);
        }
        const body = {
          model: active_model,
          agentId: active_agent,
          prompt: user_prompt,
          productNo: "pia",
          n: 1,
          imageSize: image_size,
          aspectRatio: aspect_ratio,
          urls: uploaded_urls,
          device: this.device,
          ...rest
        };
        const submit = await this.http.post(endpoint_conf.path, body, {
          headers: {
            authorization: active_token,
            "content-type": "application/json"
          }
        });
        const task_id = submit?.taskId;
        if (!task_id) {
          return {
            status: "error",
            result: submit?.message || "Empty task ID returned from server",
            chunks: [],
            token: active_token
          };
        }
        console.log(`[EXEC-IMAGE] Task queued with ID: ${task_id}`);
        const poll_res = await this._pollTask(task_id, active_token);
        return {
          status: poll_res?.status || "error",
          result: poll_res?.result || null,
          chunks: poll_res?.result ? [poll_res.result] : [],
          token: active_token
        };
      }
      return {
        status: "error",
        result: `Unsupported mode: "${mode}". Choose either "chat" or "image".`,
        chunks: [],
        token: active_token
      };
    } catch (err) {
      console.error("[GENERATE-ERR]", err?.message || err);
      return {
        status: "error",
        result: err?.message || "Execution error",
        chunks: [],
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
  const api = new PiaxClient();
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