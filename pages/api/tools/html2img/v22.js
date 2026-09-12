import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.domain = apiConfig?.DOMAIN_URL || "";
    this.pasteBaseURL = `https://${this.domain}/api/tools/paste/v1`;
    this.microlinkAPI = "https://api.microlink.io/";
    this.defaultHeaders = {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    };
  }
  async uploadHTML(htmlString, title = "HTML2IMG") {
    try {
      const response = await axios.post(this.pasteBaseURL, {
        action: "create",
        title: title,
        content: htmlString
      }, {
        headers: this.defaultHeaders
      });
      return response?.data;
    } catch (error) {
      console.error("Error uploading HTML:", error?.response?.data || error.message);
      throw error;
    }
  }
  async execute_run({
    html,
    element = null
  } = {}) {
    try {
      const uploadResult = await this.uploadHTML(html);
      if (uploadResult?.key) {
        const targetUrl = `${this.pasteBaseURL}?action=get&key=${uploadResult.key}&output=html`;
        const params = new URLSearchParams({
          url: targetUrl,
          "screenshot.fullPage": "true"
        });
        if (element) params.append("element", element);
        const microlinkUrl = `${this.microlinkAPI}?${params.toString()}`;
        const response = await axios.get(microlinkUrl, {
          headers: this.defaultHeaders
        });
        const screenshotUrl = response?.data?.data?.screenshot?.url;
        if (screenshotUrl) {
          return {
            url: screenshotUrl,
            apiUrl: microlinkUrl,
            meta: response?.data?.data
          };
        }
        return {
          url: microlinkUrl,
          apiUrl: microlinkUrl,
          meta: null
        };
      }
      return {
        url: null,
        apiUrl: null,
        meta: null
      };
    } catch (error) {
      console.error("Error generating image:", error?.response?.data || error.message);
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
    const converter = new HtmlToImg();
    const result = await converter.execute_run(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}