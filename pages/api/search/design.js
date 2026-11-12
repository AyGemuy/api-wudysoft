import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class DesignClient {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://www.design.com",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.isReady = false;
  }
  async init() {
    if (this.isReady) return;
    try {
      console.log("[PROCESS] Initializing session and cookies...");
      await this.client.get("/", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none"
        }
      });
      this.isReady = true;
      console.log("[SUCCESS] Auto initialization completed successfully");
    } catch (err) {
      console.error(`[WARNING] Auto initialization partial failure: ${err?.message || err}`);
      this.isReady = true;
    }
  }
  async genIntent(prompt, origin) {
    try {
      await this.init();
      console.log(`[PROCESS] Generating design intent for: ${prompt}`);
      const payload = {
        prompt: prompt || "Car",
        searchOrigin: origin || "RootHomePage"
      };
      const res = await this.client.post("/api/generate-design-intent", payload, {
        headers: {
          origin: "https://www.design.com",
          referer: `https://www.design.com/designs/search?searchOrigin=${payload.searchOrigin}&prompt=${payload.prompt}`
        }
      });
      console.log("[SUCCESS] Intent generated successfully");
      return res?.data || {};
    } catch (err) {
      console.error(`[ERROR] Failed to generate intent: ${err?.message || err}`);
      return {};
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      await this.init();
      const activePrompt = prompt || "Car";
      console.log(`[PROCESS] Starting search pipeline for: ${activePrompt}`);
      const intent = await this.genIntent(activePrompt, rest?.searchOrigin);
      const businessName = intent?.generatedBusinessName || "Auto Haven";
      const keywords = intent?.generatedKeywords || "automobile, vehicle";
      const queryParams = {
        page: "1",
        pageSize: "15",
        prompt: activePrompt,
        text: businessName.replace(/ /g, "+"),
        searchText: encodeURIComponent(keywords),
        searchOrigin: "RootHomePage",
        templateCategory: "",
        filterByTags: "",
        colors: "",
        locale: "en-US",
        ...rest
      };
      console.log(`[PROCESS] Fetching search results for page: ${queryParams.page}`);
      const res = await this.client.get("/api/designs/search/load-more", {
        params: queryParams,
        headers: {
          referer: `https://www.design.com/designs/search?searchOrigin=${queryParams.searchOrigin}&prompt=${queryParams.prompt}&text=${queryParams.text}&searchText=${queryParams.searchText}`
        }
      });
      console.log("[SUCCESS] Search pipeline finished successfully");
      const rawData = res?.data || {};
      const totalSearchResult = rawData?.searchTelemetry?.totalResults || 0;
      const rawGroups = rawData?.designGroups || [];
      const currentResultCount = rawGroups.length;
      const groupedResult = rawGroups.map(group => {
        const logoData = group?.logo || {};
        const itemsData = group?.designs || [];
        return {
          logo_token: group?.logoToken || logoData?.token || "",
          main_logo: {
            image_url: logoData?.imageUrl || "",
            is_free: logoData?.isFree || false,
            is_ai: logoData?.isAiGenerated || false
          },
          mockups: itemsData.map(item => ({
            design_token: item?.token || "",
            design_name: item?.designName || "Unknown",
            image_url: item?.imageUrl || "",
            action_path: item?.actionPath || "",
            edit_path: item?.editPath || "",
            content_key: item?.contentKey || ""
          }))
        };
      });
      return {
        status: true,
        total_search_result: totalSearchResult,
        current_result_count: currentResultCount,
        result: groupedResult
      };
    } catch (err) {
      console.error(`[ERROR] Search pipeline broken: ${err?.message || err}`);
      return {
        status: false,
        total_search_result: 0,
        current_result_count: 0,
        result: []
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
  const api = new DesignClient();
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