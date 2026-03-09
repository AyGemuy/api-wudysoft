import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/grup/list";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    console.log(`[HtmlToImg] Fetching image buffer from URL: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      console.log(`[HtmlToImg] Image buffer fetched successfully.`);
      return response.data;
    } catch (error) {
      console.error("[HtmlToImg] Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    model: template = 1,
    type = "v5",
    ...rest
  }) {
    const finalWidth = rest?.width || 1024;
    const finalHeight = rest?.height || 512;
    const data = {
      width: finalWidth,
      height: finalHeight,
      html: Html({
        template: template,
        ...rest
      })
    };
    console.log(`[HtmlToImg] Sending POST request to: ${this.url}${type}`, data);
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      console.log("[HtmlToImg] POST request successful. Response data:", response.data);
      return response.data?.url;
    } catch (error) {
      console.error("[HtmlToImg] Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    }
    return res.status(400).json({
      error: "No image URL returned from the service"
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to generate fansign image"
    });
  }
}