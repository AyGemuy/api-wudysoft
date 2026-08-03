import axios from "axios";
class RekamTTS {
  constructor() {
    this.base = "https://www.rekam.ai";
    this.cookies = "";
    this.voices = null;
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base}/free-text-to-speech`,
        origin: this.base,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.response.use(res => {
      try {
        const sc = res.headers["set-cookie"];
        if (sc) {
          const incoming = sc.map(c => c.split(";")[0]);
          const current = this.cookies ? this.cookies.split("; ") : [];
          const merged = [...new Set([...current, ...incoming])];
          this.cookies = merged.join("; ");
          this._log("Cookie state updated");
        }
      } catch (err) {
        this._log(`Failed parsing cookies: ${err?.message}`);
      }
      return res;
    }, err => Promise.reject(err));
    this.client.interceptors.request.use(conf => {
      try {
        if (this.cookies) {
          conf.headers["cookie"] = this.cookies;
        }
      } catch (err) {
        this._log(`Failed injecting cookies: ${err?.message}`);
      }
      return conf;
    }, err => Promise.reject(err));
  }
  _log(msg) {
    console.log(`[RekamTTS] ${msg}`);
  }
  async _cookies() {
    try {
      this._log("Visiting home page to init session...");
      await this.client.get("/free-text-to-speech");
      this._log("Session initialized");
      return true;
    } catch (err) {
      this._log(`Session init failed: ${err?.message}`);
      return false;
    }
  }
  async voiceList() {
    try {
      if (this.voices) {
        this._log("Using cached voices");
        return this.voices;
      }
      this._log("Fetching voices from API...");
      const res = await this.client.get("/api/tts/voices");
      this.voices = res?.data || null;
      return this.voices;
    } catch (err) {
      this._log(`Fetch voices failed: ${err?.message}`);
      return null;
    }
  }
  async create({
    text,
    voice,
    ...rest
  }) {
    try {
      this._log("Starting validation and state checking...");
      const hasCookie = !!this.cookies;
      if (!hasCookie) {
        await this._cookies();
      }
      const list = await this.voiceList() || {};
      const availableVoices = Object.keys(list);
      if (!text) {
        this._log("Validation failed: Missing text parameter");
        return {
          status: false,
          result: "Text input is required",
          voices: availableVoices
        };
      }
      const targetVoice = voice ? voice : "af_heart";
      const isAvailable = !!list[targetVoice];
      if (!isAvailable) {
        this._log(`Validation failed: Voice "${targetVoice}" is not available`);
        return {
          status: false,
          result: `Voice "${targetVoice}" is not valid`,
          voices: availableVoices
        };
      }
      const payload = {
        text: text,
        voice: targetVoice,
        speed: 1,
        ...rest
      };
      this._log(`Generating audio with voice "${targetVoice}"`);
      const res = await this.client.post("/api/tts/generate", payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      const responseCode = res?.data?.code;
      if (responseCode === 0) {
        this._log("Generation completed");
        return {
          status: true,
          result: res?.data?.data || null,
          voices: availableVoices
        };
      }
      this._log(`Server warning: ${res?.data?.message}`);
      return {
        status: false,
        result: res?.data?.message || "Server returned non-zero response code",
        voices: availableVoices
      };
    } catch (err) {
      this._log(`Error during generation: ${err?.message}`);
      const fallbackVoices = this.voices ? Object.keys(this.voices) : [];
      return {
        status: false,
        result: err?.message || "An unexpected error occurred",
        voices: fallbackVoices
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "voice_list"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&text=Halo+dunia"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: "${action}".`,
      valid_actions: validActions
    });
  }
  const api = new RekamTTS();
  try {
    switch (action) {
      case "create": {
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        const response = await api.create(params);
        return res.status(200).json(response);
      }
      case "voice_list": {
        const response = await api.voiceList();
        if (response) {
          return res.status(200).json({
            status: true,
            voices: response
          });
        } else {
          return res.status(400).json({
            status: false,
            error: "Gagal mengambil daftar suara dari RekamTTS."
          });
        }
      }
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}