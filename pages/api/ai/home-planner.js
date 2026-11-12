import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class HomePlanner {
  constructor() {
    this.BASE = "https://api.aihomeplanner.app";
    this.BEARER = "d5e2a9f0c8b1374b6f9d21a4e3c87f52a1b4d6c9850f3a28c7e4129bd0a6f478";
    this.MODES = ["chat", "img", "tts", "search", "yt"];
    this.deviceId = this.mkId();
    this.client = axios.create({
      baseURL: this.BASE,
      headers: {
        "User-Agent": "ktor-client",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Device-Id": this.deviceId,
        Authorization: `Bearer ${this.BEARER}`
      }
    });
    this.ok("init", `deviceId=${this.deviceId}`);
  }
  mkId() {
    return crypto.randomBytes(8).toString("hex");
  }
  ok(tag, ...a) {
    console.log(`[${tag}]`, ...a);
  }
  no(tag, ...a) {
    console.error(`[${tag}] ERROR`, ...a);
  }
  fmtErr(e) {
    const d = e.response?.data;
    if (d?.message) return d.message;
    if (Buffer.isBuffer(d)) return d.toString();
    if (d) return JSON.stringify(d);
    return e.message ?? "unknown error";
  }
  print(label, res) {
    console.log("\n" + "=".repeat(50));
    console.log(`RESULT [${label}]`);
    console.log("=".repeat(50));
    console.log(JSON.stringify(res, null, 2));
  }
  async resolveMedia(media) {
    this.ok("media", "resolving...");
    try {
      if (!media) {
        this.ok("media", "no media, skip");
        return null;
      }
      if (Buffer.isBuffer(media)) {
        this.ok("media", `raw Buffer, size=${media.length}b`);
        return {
          buffer: media,
          mime: "application/octet-stream",
          name: "file.bin"
        };
      }
      if (typeof media === "string" && /^https?:\/\//.test(media)) {
        this.ok("media", "type=url, fetching:", media);
        try {
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] ?? "application/octet-stream";
          const ext = mime.split("/")[1]?.split(";")[0] ?? "bin";
          this.ok("media", `url ok, mime=${mime}, size=${res.data.byteLength}b`);
          return {
            buffer: Buffer.from(res.data),
            mime: mime,
            name: `file.${ext}`
          };
        } catch (e) {
          this.no("media", "fetch url failed:", this.fmtErr(e));
          return null;
        }
      }
      if (typeof media === "string") {
        this.ok("media", "type=base64, decoding...");
        try {
          const match = media.match(/^data:(.+);base64,(.+)$/);
          const mime = match?.[1] ?? "application/octet-stream";
          const data = match?.[2] ?? media;
          const ext = mime.split("/")[1]?.split(";")[0] ?? "bin";
          const buffer = Buffer.from(data, "base64");
          this.ok("media", `base64 ok, mime=${mime}, size=${buffer.length}b`);
          return {
            buffer: buffer,
            mime: mime,
            name: `file.${ext}`
          };
        } catch (e) {
          this.no("media", "base64 failed:", e.message);
          return null;
        }
      }
      this.no("media", "unknown type:", typeof media);
      return null;
    } catch (e) {
      this.no("media", "unexpected:", e.message);
      return null;
    }
  }
  async chat(opts) {
    const {
      prompt,
      media,
      cid,
      systemPrompt = ""
    } = opts;
    this.ok("chat", `start | cid=${cid ?? "(new)"} | prompt="${prompt?.slice(0, 60)}"`);
    try {
      if (!prompt) {
        this.no("chat", "prompt required");
        return {
          ok: false,
          error: "prompt required for chat"
        };
      }
      const fd = new FormData();
      fd.append("conversation_id", cid ?? "");
      fd.append("message", prompt);
      fd.append("systemPrompt", systemPrompt);
      if (media) {
        const resolved = await this.resolveMedia(media);
        if (resolved) {
          fd.append("images", resolved.buffer, {
            filename: resolved.name,
            contentType: resolved.mime
          });
          this.ok("chat", `img appended: ${resolved.name} (${resolved.mime})`);
        }
      }
      const res = await this.client.post("/api/ai/chat", fd, {
        headers: fd.getHeaders()
      });
      this.ok("chat", `done | status=${res.status} | cid=${res.data?.conversation_id}`);
      return {
        ok: true,
        data: res.data
      };
    } catch (e) {
      this.no("chat", this.fmtErr(e));
      return {
        ok: false,
        error: this.fmtErr(e)
      };
    }
  }
  async img(opts) {
    const {
      prompt
    } = opts;
    this.ok("img", `start | prompt="${prompt?.slice(0, 60)}"`);
    try {
      if (!prompt) {
        this.no("img", "prompt required");
        return {
          ok: false,
          error: "prompt required for img"
        };
      }
      const res = await this.client.post("/api/images/generate", opts);
      const rawUrl = res.data?.image_url ?? null;
      const imageUrl = rawUrl ? `${this.BASE}${rawUrl}` : null;
      this.ok("img", `done | status=${res.status} | url=${imageUrl}`);
      return {
        ok: true,
        data: {
          ...res.data,
          image_url: imageUrl
        }
      };
    } catch (e) {
      this.no("img", this.fmtErr(e));
      return {
        ok: false,
        error: this.fmtErr(e)
      };
    }
  }
  async tts(opts) {
    const {
      prompt,
      voice = "alloy",
      format = "mp3"
    } = opts;
    this.ok("tts", `start | voice=${voice} | fmt=${format} | text="${prompt?.slice(0, 40)}"`);
    try {
      if (!prompt) {
        this.no("tts", "prompt required");
        return {
          ok: false,
          error: "prompt required for tts"
        };
      }
      const body = {
        ...opts,
        text: prompt,
        voice: voice,
        format: format
      };
      delete body.prompt;
      const res = await this.client.post("/api/ai/tts", body, {
        responseType: "arraybuffer"
      });
      const audio = Buffer.from(res.data).toString("base64");
      this.ok("tts", `done | status=${res.status} | b64 len=${audio.length}`);
      return {
        ok: true,
        data: {
          audio: audio,
          format: format,
          voice: voice
        }
      };
    } catch (e) {
      this.no("tts", this.fmtErr(e));
      return {
        ok: false,
        error: this.fmtErr(e)
      };
    }
  }
  async search(opts) {
    const {
      prompt,
      cid
    } = opts;
    this.ok("search", `start | cid=${cid ?? "(new)"} | q="${prompt?.slice(0, 60)}"`);
    try {
      if (!prompt) {
        this.no("search", "prompt required");
        return {
          ok: false,
          error: "prompt (query) required for search"
        };
      }
      const body = {
        ...opts,
        conversation_id: cid ?? "",
        query: prompt
      };
      delete body.prompt;
      delete body.cid;
      const res = await this.client.post("/api/ai/web-search", body);
      this.ok("search", `done | status=${res.status} | sources=${res.data?.sources?.length ?? 0}`);
      return {
        ok: true,
        data: res.data
      };
    } catch (e) {
      this.no("search", this.fmtErr(e));
      return {
        ok: false,
        error: this.fmtErr(e)
      };
    }
  }
  async yt(opts) {
    const {
      prompt,
      language = "en",
      style = "short"
    } = opts;
    this.ok("yt", `start | lang=${language} | style=${style} | url="${prompt}"`);
    try {
      if (!prompt) {
        this.no("yt", "prompt required");
        return {
          ok: false,
          error: "prompt (youtube url) required for yt"
        };
      }
      const body = {
        ...opts,
        url: prompt,
        language: language,
        style: style
      };
      delete body.prompt;
      const res = await this.client.post("/api/youtube/summary", body);
      this.ok("yt", `done | status=${res.status} | topics=${res.data?.mainTopics?.length ?? 0}`);
      return {
        ok: true,
        data: res.data
      };
    } catch (e) {
      this.no("yt", this.fmtErr(e));
      return {
        ok: false,
        error: this.fmtErr(e)
      };
    }
  }
  async generate({
    mode,
    ...rest
  }) {
    this.ok("run", `dispatch | mode=${mode}`);
    try {
      let result;
      switch (mode) {
        case "chat":
          result = await this.chat(rest);
          break;
        case "img":
          result = await this.img(rest);
          break;
        case "tts":
          result = await this.tts(rest);
          break;
        case "search":
          result = await this.search(rest);
          break;
        case "yt":
          result = await this.yt(rest);
          break;
        default: {
          const msg = `mode invalid — must be: ${this.MODES.join(", ")}`;
          this.no("run", msg);
          return {
            ok: false,
            error: msg
          };
        }
      }
      this.ok("run", `done | mode=${mode} | ok=${result.ok}`);
      return result;
    } catch (e) {
      this.no("run", "dispatch error:", e.message);
      return {
        ok: false,
        error: e.message ?? "unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new HomePlanner();
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