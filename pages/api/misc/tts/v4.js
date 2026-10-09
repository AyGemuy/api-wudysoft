import axios from "axios";
class GoogleTTS {
  constructor() {
    this.baseUrl = "https://translate.google.com/translate_tts";
  }
  async generate(text, lang = "id") {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          tl: lang,
          q: text,
          client: "tw-ob"
        },
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        }
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(error.response?.statusText || error.message || "Failed to fetch TTS audio");
    }
  }
}
export default async function handler(req, res) {
  const {
    text,
    lang = "id"
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Text parameter is required"
    });
  }
  try {
    const tts = new GoogleTTS();
    const audioBuffer = await tts.generate(text, lang);
    res.setHeader("Content-Type", "audio/mp3");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}