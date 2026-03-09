import axios from "axios";
import FormData from "form-data";
import {
  randomBytes
} from "crypto";
const KEY = "hwaECzfO5A1uLYjnlDxqpISiyg0rK8VW372FXBPG";
const BASE = "https://rnd-api.wachanga.app/super-chat/v1";
const CID = "wdOBX1-2YW-ppK48b9hdEt";
const EP = {
  chat: `${BASE}/stream-chat`,
  gen: `${BASE}/chat-app/generate-image`,
  edit: `${BASE}/chat-app/edit-image`
};
const MODELS = ["gpt-4o-mini", "gpt-4.1", "gpt-5", "anthropic/claude-3.7-sonnet", "deepseek/deepseek-v3.1-terminus", "perplexity/sonar", "x-ai/grok-4-fast", "google/gemini-2.5-flash-image"];

function resolveModel(input) {
  if (!input) return MODELS[0];
  const found = MODELS.find(m => m.toLowerCase() === String(input).toLowerCase());
  if (!found) {
    console.warn(`[model] "${input}" tidak ada di daftar. Fallback ke "${MODELS[0]}". Valid models:`, MODELS);
    return MODELS[0];
  }
  return found;
}
class WachangaAI {
  constructor() {
    this.model = MODELS[0];
    this.token = null;
    this.deviceId = randomBytes(8).toString("hex");
    this.messages = [];
    console.log("[init] deviceId:", this.deviceId, "| model:", this.model);
  }
  h(tk = "", json = false) {
    return {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "x-api-key": KEY,
      "x-client-id": CID,
      authorization: `Bearer ${tk}`,
      ...json ? {
        "Content-Type": "application/json"
      } : {}
    };
  }
  async login() {
    console.log("[auth] device:", this.deviceId);
    try {
      const {
        data
      } = await axios.post(`${BASE}/auth/device`, {
        deviceId: this.deviceId
      }, {
        headers: this.h("", true)
      });
      this.token = data?.token ?? null;
      console.log("[auth] ok, expiresIn:", data?.expiresIn ?? 0);
      return this.token;
    } catch (e) {
      console.error("[auth] failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
  }
  async img(src) {
    console.log("[img] resolving...");
    try {
      if (typeof src === "string" && /^https?:\/\//.test(src)) {
        console.log("[img] type: url");
        const res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        const mime = res?.headers?.["content-type"]?.split(";")?.[0] ?? "image/jpeg";
        const base64 = Buffer.from(res.data).toString("base64");
        const ext = mime.split("/")?.[1] ?? "jpg";
        console.log("[img] url resolved, mime:", mime);
        return {
          base64: base64,
          mime: mime,
          ext: ext
        };
      }
      if (typeof src === "string" && src.startsWith("data:")) {
        const [meta, base64] = src.split(",");
        const mime = meta?.match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const ext = mime.split("/")?.[1] ?? "jpg";
        console.log("[img] type: data-uri, mime:", mime);
        return {
          base64: base64,
          mime: mime,
          ext: ext
        };
      }
      if (Buffer.isBuffer(src)) {
        console.log("[img] type: buffer");
        return {
          base64: src.toString("base64"),
          mime: "image/jpeg",
          ext: "jpg"
        };
      }
      if (typeof src === "string") {
        console.log("[img] type: raw base64");
        return {
          base64: src,
          mime: "image/jpeg",
          ext: "jpg"
        };
      }
      console.warn("[img] unknown type, skipped");
      return null;
    } catch (e) {
      console.error("[img] error:", e?.message ?? e);
      return null;
    }
  }
  async resolveImgs(image) {
    const out = [];
    try {
      for (const src of [image].flat().filter(Boolean)) {
        try {
          const solved = await this.img(src);
          if (solved) {
            console.log("[imgs] pushed, mime:", solved.mime);
            out.push(solved);
          }
        } catch (e) {
          console.warn("[imgs] skip:", e?.message ?? e);
        }
      }
    } catch (e) {
      console.warn("[imgs] loop error:", e?.message ?? e);
    }
    return out;
  }
  parse(raw, mode) {
    if (mode === "gen" || mode === "edit") {
      console.log("[parse] mode image, parsing JSON...");
      try {
        const json = typeof raw === "string" ? JSON.parse(raw) : raw;
        console.log("[parse] response keys:", Object.keys(json));
        const imagesKey = Object.keys(json).find(k => Array.isArray(json[k]));
        const images = json[imagesKey] ?? [];
        console.log("[parse] images key:", imagesKey, "| count:", images.length);
        return {
          result: images,
          ...json
        };
      } catch (e) {
        console.error("[parse] image JSON error:", e?.message ?? e);
        return {
          result: []
        };
      }
    }
    console.log("[sse] parsing...");
    try {
      const acc = {};
      for (const line of (raw ?? "").toString().split("\n").filter(l => l.startsWith("data: "))) {
        try {
          const {
            type,
            ...payload
          } = JSON.parse(line.slice(6));
          if (!type) continue;
          const val = Object.values(payload).filter(v => typeof v === "string").join("");
          if (val) acc[type] = (acc[type] ?? "") + val;
        } catch (e) {
          console.warn("[sse] skip bad line:", e?.message);
        }
      }
      console.log("[sse] acc keys:", Object.keys(acc));
      const TYPE_MAP = {
        chunk: "result",
        "image.generate": "imageGenPrompt",
        "image.edit": "imageEditInstr"
      };
      const output = Object.fromEntries(Object.entries(acc).map(([k, v]) => [TYPE_MAP[k] ?? k, v]));
      output.result ??= "";
      return output;
    } catch (e) {
      console.error("[sse] error:", e?.message ?? e);
      return {
        result: ""
      };
    }
  }
  async buildStreamForm({
    mdl,
    history,
    userMsg,
    locale,
    isEditImage,
    systemPrompt
  }) {
    console.log("[form] building stream form, isEditImage:", isEditImage);
    try {
      const form = new FormData();
      form.append("payload", JSON.stringify({
        model: mdl,
        systemPrompt: systemPrompt ?? null,
        history: history ?? [],
        userMessage: userMsg,
        clientLocale: locale ?? "id",
        isEditImage: isEditImage ?? false,
        attachments: []
      }));
      return form;
    } catch (e) {
      console.error("[form] stream error:", e?.message ?? e);
      throw e;
    }
  }
  buildImgBody({
    prompt,
    imgs,
    count = 1
  }) {
    console.log("[body] building image body, count:", count);
    try {
      return JSON.stringify({
        isProUser: false,
        prompt: prompt ?? "",
        count: count,
        images: imgs.map(i => ({
          base64: i.base64,
          ext: i.ext ?? "jpg"
        }))
      });
    } catch (e) {
      console.error("[body] image body error:", e?.message ?? e);
      throw e;
    }
  }
  async req({
    url,
    headers,
    data
  }) {
    console.log("[req] sending to:", url);
    try {
      const res = await axios.request({
        method: "POST",
        url: url,
        headers: headers,
        data: data
      });
      console.log("[req] response received");
      return res?.data ?? "";
    } catch (e) {
      console.error("[req] error:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
  }
  async chat({
    token,
    model,
    mode = "chat",
    prompt,
    history,
    image,
    systemPrompt,
    count,
    ...rest
  }) {
    console.log("[chat] start, mode:", mode, "| prompt:", prompt);
    try {
      const tk = token ?? this.token ?? await this.login();
      const mdl = resolveModel(model ?? this.model);
      console.log("[chat] token ok, model resolved:", mdl);
      if (history?.length) {
        this.messages = [...history];
        console.log("[chat] history synced, total:", this.messages.length);
      }
      const imgs = await this.resolveImgs(image);
      let raw;
      if (mode === "gen") {
        const body = this.buildImgBody({
          prompt: prompt,
          imgs: imgs,
          count: count ?? 1
        });
        raw = await this.req({
          url: EP.gen,
          headers: this.h(tk, true),
          data: body
        });
      } else if (mode === "edit") {
        const body = this.buildImgBody({
          prompt: prompt,
          imgs: imgs,
          count: count ?? 1
        });
        raw = await this.req({
          url: EP.edit,
          headers: this.h(tk, true),
          data: body
        });
      } else {
        const userMsg = [{
          type: "text",
          text: prompt || "."
        }];
        for (const i of imgs) userMsg.push({
          type: "image",
          base64: i.base64,
          mime: i.mime
        });
        const form = await this.buildStreamForm({
          mdl: mdl,
          history: this.messages,
          userMsg: userMsg,
          locale: rest?.locale ?? "id",
          isEditImage: mode === "edit",
          systemPrompt: systemPrompt ?? null
        });
        raw = await this.req({
          url: EP.chat,
          headers: {
            ...this.h(tk),
            Accept: "text/event-stream",
            "cache-control": "no-cache",
            ...form.getHeaders()
          },
          data: form
        });
      }
      const parsed = this.parse(raw, mode);
      if (mode !== "gen" && mode !== "edit") {
        try {
          this.messages.push({
            role: "user",
            content: prompt ?? ""
          });
          this.messages.push({
            role: "assistant",
            content: parsed?.result ?? ""
          });
          console.log("[chat] history updated, total:", this.messages.length);
        } catch (e) {
          console.warn("[chat] push history error:", e?.message ?? e);
        }
      }
      console.log("[chat] done ✓");
      return {
        ...parsed,
        history: this.messages,
        token: tk,
        model: mdl,
        mode: mode,
        model: MODELS
      };
    } catch (e) {
      console.error("[chat] fatal:", e?.response?.data ?? e?.message ?? e);
      throw e;
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
  const api = new WachangaAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}