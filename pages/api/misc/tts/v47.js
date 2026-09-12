import axios from "axios";
class AzureTTSClient {
  constructor() {
    this.url = "https://aprilkunu4-3841-resource.cognitiveservices.azure.com/openai/deployments/gpt-4o-mini-tts/audio/speech?api-version=2024-02-15-preview";
    this.apiKey = "6f24kBHJ1vYFmcAa5EpShEwBLcZgW6dwRr5b8OGgMZqlZSVPwhBVJQQJ99CFACHYHv6XJ3w3AAAAACOGTVYd";
    this.allowedVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"];
  }
  voice_list() {
    return {
      list: this.allowedVoices
    };
  }
  async generate({
    text,
    voice = "alloy",
    ...rest
  }) {
    if (!this.allowedVoices.includes(voice.toLowerCase())) {
      throw new Error(`Voice '${voice}' tidak valid. Pilih salah satu dari: ${this.allowedVoices.join(", ")}`);
    }
    const headers = {
      "api-key": this.apiKey,
      "Content-Type": "application/json"
    };
    const body = {
      model: "tts-1",
      input: text,
      voice: voice.toLowerCase(),
      ...rest
    };
    try {
      const response = await axios.post(this.url, body, {
        headers: headers,
        responseType: "arraybuffer"
      });
      return {
        status: response.status,
        buffer: Buffer.from(response.data),
        contentType: response.headers["content-type"]
      };
    } catch (error) {
      if (error.response && error.response.data instanceof ArrayBuffer) {
        const errorText = Buffer.from(error.response.data).toString("utf-8");
        try {
          throw JSON.parse(errorText);
        } catch {
          throw new Error(errorText);
        }
      }
      throw error.response ? error.response.data : error;
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new AzureTTSClient();
  try {
    let response;
    switch (action) {
      case "voice_list":
        response = api.voice_list();
        return res.status(200).json(response);
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'generate'."
          });
        }
        const audioResult = await api.generate(params);
        res.setHeader("Content-Type", audioResult.contentType);
        res.setHeader("Content-Disposition", 'inline; filename="generated_audio.mp3"');
        return res.status(200).send(audioResult.buffer);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'voice_list', 'generate'.`
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}