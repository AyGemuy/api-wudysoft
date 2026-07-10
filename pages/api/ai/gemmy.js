import axios from "axios";
class GemmyAI {
  constructor() {
    this.HEADERS = {
      "User-Agent": "ktor-client",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-goog-api-key": "AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ",
      "x-goog-api-client": "gl-kotlin/2.2.21-ai fire/17.7.0",
      "x-firebase-appid": "1:652803432695:android:c4341db6033e62814f33f2",
      "x-firebase-appversion": "91",
      "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJSVCJ9",
      "accept-charset": "UTF-8"
    };
    this.BASE_URL = "https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models";
  }
  async generate({
    mode = "chat",
    prompt,
    messages = [],
    ratio = "1:1",
    model,
    ...rest
  }) {
    try {
      console.log(`[LOG] Memulai proses mode: ${mode}...`);
      if (!prompt && messages.length === 0) {
        return {
          status: false,
          error: "Prompt atau messages wajib diisi!"
        };
      }
      let response;
      switch (mode) {
        case "chat":
          const chatModel = model || "gemini-3.1-flash-lite";
          const history = [...messages];
          if (prompt) history.push({
            role: "user",
            parts: [{
              text: prompt
            }]
          });
          const chatPayload = {
            contents: history,
            generationConfig: {
              maxOutputTokens: 4e3,
              temperature: 2
            },
            ...rest
          };
          console.log(`[LOG] Mengirim request ke model chat: ${chatModel}`);
          response = await axios.post(`${this.BASE_URL}/${chatModel}:generateContent`, chatPayload, {
            headers: this.HEADERS
          });
          break;
        case "image":
          const imgModel = model || "imagen-4.0-fast-generate-001";
          const imagePayload = {
            instances: [{
              prompt: prompt
            }],
            parameters: {
              sampleCount: 1,
              includeRaiReason: true,
              includeSafetyAttributes: true,
              aspectRatio: ratio,
              safetySetting: "block_low_and_above",
              personGeneration: "allow_adult",
              imageOutputOptions: {
                mimeType: "image/jpeg",
                compressionQuality: 100
              },
              ...rest
            }
          };
          console.log(`[LOG] Mengirim request ke model image: ${imgModel}`);
          response = await axios.post(`${this.BASE_URL}/${imgModel}:predict`, imagePayload, {
            headers: this.HEADERS
          });
          break;
        default:
          return {
            status: false,
              error: `Mode '${mode}' tidak didukung.`
          };
      }
      console.log(`[LOG] Proses ${mode} berhasil.`);
      return {
        status: true,
        mode: mode,
        ...response.data
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error(`[LOG ERROR] Mode ${mode} gagal:`, errorMsg);
      return {
        status: false,
        error: errorMsg
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
  const api = new GemmyAI();
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