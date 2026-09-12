import axios from "axios";
import https from "https";
import crypto from "crypto";
class Text2Pet {
  constructor() {
    this.cfg = {
      base: "https://text2pet.zdex.top",
      auth: "eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objMdf0NTM0NT",
      sign: "7259cb222a66496242650023583742fe40ea0a80",
      ver: "19",
      def: {
        isPremium: 0,
        ctry_target: "others"
      }
    };
    this.deviceId = this.genId();
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
  }
  genId() {
    try {
      return crypto.randomBytes(8).toString("hex");
    } catch (err) {
      console.error(`[CRYPTO ERR] Gagal membuat Device ID: ${err.message}`);
      return "0666b2e8da418dfa";
    }
  }
  getH(isJson = false) {
    try {
      let formattedAuth = "";
      if (this.cfg.auth) {
        formattedAuth = this.cfg.auth.trim();
      }
      const headers = {
        "User-Agent": "okhttp/5.1.0",
        "Accept-Encoding": "gzip",
        sign: this.cfg.sign,
        pt: "",
        v: this.cfg.ver,
        authorization: formattedAuth,
        deviceid: this.deviceId
      };
      if (isJson) headers["Content-Type"] = "application/json";
      return headers;
    } catch (err) {
      console.error(`[HEADER ERR] Gagal menyusun header: ${err.message}`);
      return {};
    }
  }
  async req(config) {
    try {
      config.httpsAgent = this.httpsAgent;
      if (!config.headers) {
        config.headers = this.getH(config.data && typeof config.data === "string");
      }
      return await axios(config);
    } catch (error) {
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async poll(key) {
    console.log(`[POLL START] Melacak antrean Job Key: ${key}`);
    const max = 60;
    let attempts = 0;
    while (attempts < max) {
      try {
        console.log(`[POLL] Percobaan ${attempts + 1}/${max}`);
        const res = await this.req({
          method: "POST",
          url: `${this.cfg.base}/videos/batch`,
          data: JSON.stringify({
            keys: [key]
          })
        });
        if (res.status === "failed") {
          return res;
        }
        if (res.data && res.data.code === 0 && res.data.datas?.length > 0) {
          const job = res.data.datas[0];
          if (job.url) {
            console.log(`[POLL SUCCESS] Hasil URL: ${job.url}`);
            return {
              url: job.url,
              key: job.key,
              video_id: job.video_id,
              safe: job.safe
            };
          }
        }
        attempts++;
        await new Promise(r => setTimeout(r, 4e3));
      } catch (error) {
        console.error(`[POLL ERR] Error saat polling: ${error.message}`);
        attempts++;
        await new Promise(r => setTimeout(r, 4e3));
      }
    }
    return {
      status: "failed",
      result: "Batas waktu polling habis, proses melebihi batas waktu"
    };
  }
  async genT2V(prompt, overrides = {}) {
    console.log(`[T2V] Mengirim payload text-to-video...`);
    try {
      const payload = {
        ai_sound: 0,
        aspect_ratio: "auto",
        ctry_target: this.cfg.def.ctry_target,
        deviceID: this.deviceId,
        isPremium: this.cfg.def.isPremium,
        used: [],
        versionCode: parseInt(this.cfg.ver),
        ...overrides
      };
      if (prompt) {
        payload.prompt = prompt;
      }
      const res = await this.req({
        method: "POST",
        url: `${this.cfg.base}/videos`,
        data: JSON.stringify(payload)
      });
      return res.status === "failed" ? res : res.data;
    } catch (error) {
      console.error(`[T2V ERR] Permintaan T2V gagal: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      if (!prompt) {
        return {
          status: "failed",
          result: "Parameter 'prompt' wajib disediakan"
        };
      }
      let response = await this.genT2V(prompt, rest);
      if (response && response.status === "failed") {
        return response;
      }
      const key = response?.key || response?.data?.key;
      if (key) {
        const pollResult = await this.poll(key);
        if (pollResult.status === "failed") {
          return pollResult;
        }
        response = pollResult;
      } else {
        return {
          status: "failed",
          result: "Gagal mendapatkan key pengerjaan dari server",
          raw: response
        };
      }
      return {
        status: "success",
        result: response
      };
    } catch (error) {
      console.error(`[GEN CONTROL ERR] Gangguan eksekusi umum: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "POST",
        example: {
          action: "generate",
          prompt: "Husky puppy in superhero cape leaps across neon cyberpunk city at night."
        }
      }
    });
  }
  if (action !== "generate") {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`
    });
  }
  const scraper = new Text2Pet();
  try {
    if (!params.prompt) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'prompt' wajib diisi untuk generate."
      });
    }
    const response = await scraper.generate(params);
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    return res.status(200).json({
      status: response.status === "success",
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Gangguan pada '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}