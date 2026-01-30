import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HTMLToImageConverter {
  constructor() {
    this.pasteBaseURL = `https://${apiConfig.DOMAIN_URL}/api/tools/paste/v1`;
    this.microlinkAPI = "https://api.microlink.io";
  }
  async uploadHTML(htmlString, title = "HTML2IMG") {
    try {
      const response = await axios.post(this.pasteBaseURL, {
        action: "create",
        title: title,
        content: htmlString
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading HTML:", error);
      throw error;
    }
  }
  async convertHTMLToImage({
    html,
    width = 1280,
    height = 900,
    format = "png",
    waitTime = 1e3,
    isFullPage = false,
    element = null,
    quality = 80
  } = {}) {
    try {
      const uploadResult = await this.uploadHTML(html);
      if (uploadResult && uploadResult.key) {
        const targetUrl = `${this.pasteBaseURL}?action=get&key=${uploadResult.key}&output=html`;
        const params = new URLSearchParams({
          url: targetUrl,
          screenshot: "true",
          "viewport.width": width.toString(),
          "viewport.height": height.toString(),
          waitForTimeout: waitTime.toString(),
          fullPage: isFullPage.toString(),
          type: format === "jpg" ? "jpeg" : format,
          quality: quality.toString()
        });
        if (element) {
          params.append("element", element);
        }
        const microlinkUrl = `${this.microlinkAPI}?${params.toString()}`;
        const response = await axios.get(microlinkUrl);
        if (response.data && response.data.data && response.data.data.screenshot && response.data.data.screenshot.url) {
          return {
            url: response.data.data.screenshot.url,
            apiUrl: microlinkUrl,
            meta: response.data.data
          };
        } else {
          return {
            url: microlinkUrl,
            apiUrl: microlinkUrl,
            meta: null
          };
        }
      } else {
        console.warn("Failed to get key after HTML upload. Cannot generate image URL.");
        return {
          url: null,
          apiUrl: null,
          meta: null
        };
      }
    } catch (error) {
      console.error("Error generating image URL:", error);
      return {
        url: null,
        apiUrl: null,
        meta: null
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new HTMLToImageConverter();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}