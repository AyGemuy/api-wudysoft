import fetch from "node-fetch";
import ApiKey from "@/configs/api-key";
class ApiMusicClient {
  constructor(cfg = {}) {
    console.log("Init: ApiMusicClient (Runpod Only)");
    const arrToken = ApiKey.runpod;
    const initialTokens = Array.isArray(cfg.token) ? cfg.token : cfg.token ? [cfg.token] : arrToken;
    this.token = initialTokens;
    this.cfg = {
      base: "https://api.runpod.ai/v2",
      token: this.token,
      ep: {
        create: "/j8cbecr5p9ujr3/run",
        status: "/j8cbecr5p9ujr3/status"
      },
      default: {
        input: {
          description: "",
          duration: 5
        }
      },
      ...Object.fromEntries(Object.entries(cfg).filter(([key]) => key !== "token"))
    };
    console.log(`Initialized with ${this.token.length} tokens.`);
  }
  async _req(url, opt = {}) {
    console.log(`Req: ${opt.method || "GET"} → ${url}`);
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      ...opt.token && {
        Authorization: `Bearer ${opt.token}`
      },
      ...opt.headers
    };
    try {
      const res = await fetch(url, {
        method: opt.method || "GET",
        headers: headers,
        body: opt.body ? JSON.stringify(opt.body) : undefined
      });
      console.log(`Res: ${res.status} ${res.statusText}`);
      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => res.text());
      } else {
        data = await res.text();
      }
      return data;
    } catch (e) {
      console.error(`Req: Failed → ${e.message}`);
      return {
        ok: false,
        status: 0,
        statusText: "Network Error",
        headers: {},
        data: null,
        error: e.message
      };
    }
  }
  async generate({
    prompt,
    duration = 60,
    ...rest
  }) {
    console.log("Runpod: create (Attempting with token array) →", {
      prompt: prompt,
      duration: duration,
      ...rest
    });
    const url = this.cfg.base + this.cfg.ep.create;
    const payload = {
      input: {
        description: prompt || `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
        duration: duration,
        ...rest
      }
    };
    let lastError = null;
    for (const token of this.token) {
      try {
        console.log(`Attempting generate with token ending in ...${token.slice(-4)}`);
        const result = await this._req(url, {
          method: "POST",
          body: payload,
          token: token
        });
        if (result && result.id) {
          console.log(`Token successful. Task ID: ${result.id}`);
          return result;
        } else if (result && result.error) {
          lastError = result.error;
          console.log(`Token failed (API Error: ${lastError}). Trying next...`);
          continue;
        } else {
          lastError = "Unknown or Network Error";
          continue;
        }
      } catch (e) {
        console.error("create: network error →", e.message);
        lastError = e.message;
        continue;
      }
    }
    console.error("create: All tokens failed.");
    return {
      ok: false,
      error: `All tokens failed. Last error: ${lastError}`
    };
  }
  async status({
    task_id: id,
    ...rest
  }) {
    if (!id) {
      console.error("status: id required");
      return {
        ok: false,
        error: "ID is required"
      };
    }
    console.log("Runpod: status →", {
      id: id,
      ...rest
    });
    const url = `${this.cfg.base}${this.cfg.ep.status}/${id}`;
    const tokenToUse = this.token[0];
    try {
      return await this._req(url, {
        method: "POST",
        token: tokenToUse
      });
    } catch (e) {
      console.error("status: error →", e.message);
      return {
        ok: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new ApiMusicClient();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt && !params.lyrics) {
          return res.status(400).json({
            error: "Paramenter 'prompt', atau 'lyrics' wajib diisi."
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi."
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Gunakan: generate, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}