import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.pasteBaseURL = `https://${apiConfig.DOMAIN_URL}/api/tools/paste/v1`;
    this.imageGeneratorURL = "https://www.nrecosite.com/html_to_image_generator_net.aspx?action=generate_image&web_page_url=";
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
  encodeURL(url) {
    return encodeURIComponent(url);
  }
  async execute_run({
    html
  } = {}) {
    try {
      const uploadResult = await this.uploadHTML(html);
      if (uploadResult && uploadResult.key) {
        const encodedURL = this.encodeURL(`${this.pasteBaseURL}?action=get&key=${uploadResult.key}&output=html`);
        return {
          url: this.imageGeneratorURL + encodedURL
        };
      } else {
        console.warn("Failed to get key after HTML upload. Cannot generate image URL.");
        return {
          url: null
        };
      }
    } catch (error) {
      console.error("Error generating image URL:", error);
      return {
        url: null
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
    const converter = new HtmlToImg();
    const result = await converter.execute_run(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}