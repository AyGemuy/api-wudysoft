import axios from "axios";
import {
  randomBytes,
  randomInt
} from "crypto";
class Quotly {
  constructor() {
    this.urls = ["https://quotly.netorare.codes/generate", "https://btzqc.betabotz.eu.org/generate", "https://qc.botcahx.eu.org/generate"];
  }
  async generate({
    name,
    text,
    avatar,
    media,
    messages,
    replyName,
    replyText,
    ...rest
  } = {}) {
    const payload = {
      type: "quote",
      format: "png",
      backgroundColor: "#FFFFFF",
      width: 512,
      height: 768,
      scale: 2,
      ...rest,
      messages: messages || [{
        entities: [],
        avatar: true,
        from: {
          id: randomInt(1, 1e5),
          name: name || `user-${randomBytes(4).toString("hex")}`,
          photo: {
            url: avatar || "https://telegra.ph/file/1e22e45892774893eb1b9.jpg"
          }
        },
        text: text || `text-${randomBytes(12).toString("hex")}`,
        replyMessage: replyName ? {
          name: replyName,
          text: replyText || `text-${randomBytes(10).toString("hex")}`,
          chatId: randomInt(1e6, 9999999)
        } : undefined,
        media: media ? {
          url: media
        } : undefined
      }]
    };
    for (const url of this.urls) {
      try {
        const response = await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json"
          }
        });
        const data = response.data;
        if (data.ok && data.result?.image) {
          return {
            buffer: Buffer.from(data.result.image, "base64"),
            contentType: "image/png"
          };
        }
      } catch (error) {
        continue;
      }
    }
    throw new Error("Quotly generation failed: All APIs are unreachable.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new Quotly();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}