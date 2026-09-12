import axios from "axios";
class NuelinkAI {
  constructor() {
    this.styles = ["Cyberpunk", "Anime", "Old Drawing", "Renaissance Painting", "Cartoon", "Cute Creature", "Abstract Painting", "Dark", "Fantasy", "3D Origami", "3D Hologram", "Pop Art", "Pixel World", "Manga", "Fantasy World", "Vintage"];
    this.client = axios.create({
      baseURL: "https://tools.nuelink.com/api",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Origin: "https://nuelink.com",
        Pragma: "no-cache",
        Referer: "https://nuelink.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      },
      responseType: "arraybuffer",
      timeout: 12e4
    });
  }
  valStyle(s) {
    try {
      if (!s || typeof s !== "string") return "";
      const matched = this.styles.find(item => item.toLowerCase() === s.trim().toLowerCase());
      return matched || s.trim();
    } catch (err) {
      console.error(`[NuelinkAI] Error pada valStyle: ${err?.message}`);
      return "";
    }
  }
  bldPrompt(p, s) {
    try {
      const cleanPrompt = (p || "").trim();
      const styleValue = this.valStyle(s);
      const suffix = styleValue ? `, use ${styleValue}` : " style";
      return `${cleanPrompt}${suffix}`;
    } catch (err) {
      console.error(`[NuelinkAI] Error pada bldPrompt: ${err?.message}`);
      return p || "";
    }
  }
  async generate({
    prompt,
    style,
    ...rest
  }) {
    try {
      console.log("[NuelinkAI] Memeriksa input parameter...");
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error("[NuelinkAI] Validasi gagal: prompt kosong.");
        return {
          status: false,
          error: 'Field "prompt" wajib diisi dan berupa string tidak kosong.'
        };
      }
      const finalPrompt = this.bldPrompt(prompt, style);
      const queryParams = new URLSearchParams({
        action: "IMAGE",
        prompt: finalPrompt
      }).toString();
      const body = {
        action: "TTI",
        prompt: finalPrompt,
        ...rest
      };
      console.log(`[NuelinkAI] Mengirim payload ke API dengan prompt: "${finalPrompt}"...`);
      const response = await this.client.post(`/ai/assist?${queryParams}`, body);
      const contentType = response.headers["content-type"] || "image/jpeg";
      const buffer = Buffer.from(response.data);
      console.log("[NuelinkAI] Gambar berhasil dibuat.");
      return {
        status: true,
        buffer: buffer,
        contentType: contentType
      };
    } catch (err) {
      let errMsg = err?.message || "Terjadi kesalahan internal pada saat request.";
      if (err?.response?.status === 429) {
        errMsg = "You've hit the 3-ai limit. Please wait 1 hour before doing more prompting.";
      } else if (err?.response?.data) {
        try {
          const parsed = JSON.parse(Buffer.from(err.response.data).toString("utf-8"));
          errMsg = parsed.message || parsed.error || errMsg;
        } catch (_) {}
      }
      console.error(`[NuelinkAI] Error koneksi/server: ${errMsg}`);
      return {
        status: false,
        error: errMsg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params?.prompt) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NuelinkAI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}