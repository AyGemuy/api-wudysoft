import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class OlabibaAI {
  constructor() {
    this.jar = new CookieJar();
    this.req = wrapper(axios.create({
      baseURL: "https://www.olabiba.com",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://www.olabiba.com",
        referer: "https://www.olabiba.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async rsvMed(media) {
    if (!media) return "";
    try {
      if (typeof media === "string") {
        if (media.startsWith("http")) {
          console.log("[PROSES] Mengunduh media dari URL...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          return `data:${mime};base64,${Buffer.from(res.data).toString("base64")}`;
        }
        return media.startsWith("data:") ? media : `data:image/jpeg;base64,${media}`;
      }
      return Buffer.isBuffer(media) ? `data:image/jpeg;base64,${media.toString("base64")}` : "";
    } catch (e) {
      console.log(`[WARNING] Gagal proses media: ${e.message}`);
      return "";
    }
  }
  prsStr(chunk, onChunk) {
    const lines = chunk.toString().split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
      const dataRaw = line.slice(5).trim();
      if (dataRaw) {
        onChunk(dataRaw);
      }
    }
  }
  async chat({
    prompt,
    media,
    ...rest
  }) {
    try {
      console.log("[PROSES] Memulai sesi obrolan...");
      console.log("[PROSES] Sinkronisasi cookie session...");
      await this.req.post("/php/cookie.php", "version=v3", {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const imgData = await this.rsvMed(media) || "";
      console.log("[PROSES] Mengirim pesan ke server...");
      const form = new FormData();
      form.append("text", prompt);
      form.append("mood", rest?.mood || "friendly");
      form.append("lang", rest?.lang || "en");
      form.append("adblock", rest?.adblock || "No");
      form.append("theme", rest?.theme || "light");
      form.append("image", imgData);
      await this.req.post("/php/message.php", form);
      console.log("[PROSES] Menunggu response stream...");
      const resStream = await this.req.get("/php/stream.php", {
        headers: {
          accept: "text/event-stream"
        },
        responseType: "stream"
      });
      let dirtySentence = "";
      return new Promise(resolve => {
        resStream.data.on("data", chunk => {
          this.prsStr(chunk, rawText => {
            dirtySentence += rawText;
          });
        });
        resStream.data.on("end", () => {
          console.log("[PROSES] Stream selesai. Parsing & membersihkan data...");
          const $ = cheerio.load(`<body>${dirtySentence}</body>`);
          const decodedText = $("body").text();
          const blocks = decodedText.split("[FOLLOWUP]");
          const cleanText = blocks[0].trim();
          const followups = [];
          for (let i = 1; i < blocks.length; i++) {
            const innerData = blocks[i].split("[/FOLLOWUP]")[0];
            if (innerData) {
              followups.push(innerData.trim());
            }
          }
          console.log("[PROSES] Selesai.");
          resolve({
            text: cleanText,
            followup: followups
          });
        });
      });
    } catch (err) {
      console.error("[ERROR] Terjadi kegagalan:", err?.response?.data || err.message);
      return null;
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
  const api = new OlabibaAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}