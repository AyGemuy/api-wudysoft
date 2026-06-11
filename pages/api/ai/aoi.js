import axios from "axios";
import https from "https";
class AoiClient {
  constructor() {
    this.key = "aoi_DcKjZrldb_mOZaGqwAfGRpVd2E-KxXh8N1hBQSbuJQ6v8g2uU7M6y7zpJS2f6z-n";
    this.uid = `aoi_user_${Math.floor(Date.now() / 1e3)}_${Math.floor(1e8 + Math.random() * 9e8)}`;
    this.base = "https://api.aoiapp.jp";
    this.modes = ["chat", "image", "tts", "translate"];
    this.agent = new https.Agent({
      keepAlive: true
    });
    console.log(`[INIT] Client siap. User ID: ${this.uid}`);
  }
  req(path, data, extraHeaders = {}) {
    return {
      method: "POST",
      url: `${this.base}${path}`,
      httpsAgent: this.agent,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-AOI-API-Key": this.key,
        ...extraHeaders
      },
      data: data
    };
  }
  async generate({
    mode,
    prompt,
    history,
    ...rest
  }) {
    try {
      console.log(`[PROSES] Memulai mode: ${mode || "tidak ditentukan"}`);
      const activeMode = mode && this.modes.includes(mode) ? mode : null;
      if (!activeMode) {
        return {
          success: false,
          error: `Mode tidak valid. Pilih: ${this.modes.join(", ")}`
        };
      }
      let config = {};
      const hist = history || [];
      switch (activeMode) {
        case "chat": {
          const msg = prompt || rest.message;
          if (!msg) return {
            success: false,
            error: 'Param "prompt" atau "message" wajib untuk chat'
          };
          hist.push({
            role: "user",
            text: msg
          });
          const defaultPayload = {
            message: msg,
            language: "ja",
            mode: "friendly",
            level: 125,
            callNameOptions: {
              callEnabled: true,
              callMode: "growth",
              callName: "葵",
              growthMid: "chan",
              honorific: "さん",
              lv: 125
            },
            history: hist,
            maxTokens: 3200
          };
          config = this.req("/chat.php", {
            ...defaultPayload,
            ...rest
          });
          break;
        }
        case "image": {
          const text = prompt || rest.prompt;
          if (!text) return {
            success: false,
            error: 'Param "prompt" wajib untuk image'
          };
          const defaultPayload = {
            user_id: this.uid,
            prompt: text,
            model: "gpt-image-1",
            size: "1024x1024"
          };
          const finalPayload = {
            ...defaultPayload,
            ...rest
          };
          config = this.req("/image.php", finalPayload, {
            "X-AOI-User-Id": finalPayload.user_id || this.uid
          });
          break;
        }
        case "tts": {
          const text = prompt || rest.text;
          if (!text) return {
            success: false,
            error: 'Param "prompt" atau "text" wajib untuk tts'
          };
          const defaultPayload = {
            text: text,
            speaker: "female",
            lang: "id"
          };
          config = this.req("/radio_tts_cartesia.php", {
            ...defaultPayload,
            ...rest
          });
          config.responseType = "arraybuffer";
          break;
        }
        case "translate": {
          const text = prompt || rest.text;
          if (!text) return {
            success: false,
            error: 'Param "prompt" atau "text" wajib untuk translate'
          };
          const defaultPayload = {
            mode: "voice_translate",
            user_id: this.uid,
            text: text,
            source_lang: "id",
            target_lang: "en",
            source_locale: "id-ID",
            target_locale: "en-US"
          };
          const finalPayload = {
            ...defaultPayload,
            ...rest
          };
          config = this.req("/voice_translate.php", finalPayload, {
            "X-AOI-User-Id": finalPayload.user_id || this.uid
          });
          break;
        }
      }
      console.log(`[PROSES] Mengirim request ke ${config.url}`);
      const res = await axios(config);
      console.log(`[SUKSES] Respon diterima dari mode: ${activeMode}`);
      if (activeMode === "tts") {
        return {
          buffer: Buffer.from(res.data),
          contentType: "audio/mp3"
        };
      }
      if (activeMode === "image") {
        const base64Data = res.data?.image_base64 || "";
        if (!base64Data) return {
          success: false,
          error: "API tidak mengembalikan image_base64"
        };
        return {
          buffer: Buffer.from(base64Data, "base64"),
          contentType: "image/png"
        };
      }
      if (activeMode === "chat" && res.data?.text) {
        hist.push({
          role: "assistant",
          text: res.data.text
        });
      }
      return res?.data;
    } catch (err) {
      const errMsg = err?.response?.data instanceof ArrayBuffer ? Buffer.from(err.response.data).toString("utf8") : err?.response?.data?.message || err?.message;
      console.error(`[ERROR] Terjadi kesalahan: ${errMsg}`);
      return {
        success: false,
        error: errMsg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AoiClient();
  try {
    const data = await api.generate(params);
    if (data?.success === false || data?.error) {
      return res.status(400).json({
        success: false,
        error: data.error || "Gagal memproses request."
      });
    }
    if (data?.buffer && data?.contentType) {
      res.setHeader("Content-Type", data.contentType);
      return res.status(200).send(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan sistem saat memproses.";
    console.error("[API ERROR]", error);
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}