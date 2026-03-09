import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class Perplexity {
  constructor() {
    this.baseUrl = `${proxy}https://www.perplexity.ai/rest/sse/perplexity_ask`;
    this.sourceMapping = {
      web: "web",
      academic: "scholar",
      social: "social",
      finance: "edgar"
    };
  }
  async chat({
    query,
    web = true,
    academic = false,
    social = false,
    finance = false,
    ...rest
  } = {}) {
    try {
      if (!query) throw new Error("Query is required.");
      const sourceFlags = {
        web: web,
        academic: academic,
        social: social,
        finance: finance
      };
      const activeSources = Object.keys(sourceFlags).filter(key => sourceFlags[key] === true).map(key => this.sourceMapping[key]).filter(Boolean);
      const frontend = uuidv4();
      const {
        data
      } = await axios.post(this.baseUrl, {
        params: {
          attachments: [],
          language: "en-US",
          timezone: "Asia/Jakarta",
          search_focus: "internet",
          sources: activeSources.length > 0 ? activeSources : ["web"],
          search_recency_filter: null,
          frontend_uuid: frontend,
          mode: "concise",
          model_preference: "turbo",
          is_related_query: false,
          is_sponsored: false,
          visitor_id: uuidv4(),
          frontend_context_uuid: uuidv4(),
          prompt_source: "user",
          query_source: "home",
          is_incognito: false,
          time_from_first_type: 2273.9,
          local_search_enabled: false,
          use_schematized_api: true,
          send_back_text_in_streaming_api: false,
          supported_block_use_cases: ["answer_modes", "media_items", "knowledge_cards", "inline_entity_cards", "place_widgets", "finance_widgets", "sports_widgets", "flight_status_widgets", "shopping_widgets", "jobs_widgets", "search_result_widgets", "clarification_responses", "inline_images", "inline_assets", "inline_finance_widgets", "placeholder_cards", "diff_blocks", "inline_knowledge_cards", "entity_group_v2", "refinement_filters", "canvas_mode", "maps_preview", "answer_tabs"],
          client_coordinates: null,
          mentions: [],
          dsl_query: query,
          skip_search_enabled: true,
          is_nav_suggestions_disabled: false,
          always_search_override: false,
          override_no_search: false,
          comet_max_assistant_enabled: false,
          should_ask_for_mcp_tool_confirmation: true,
          version: "2.18",
          ...rest
        },
        query_str: query
      }, {
        headers: {
          "content-type": "application/json",
          referer: "https://www.perplexity.ai/search/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
          "x-request-id": frontend,
          "x-perplexity-request-reason": "perplexity-query-state-provider"
        }
      });
      const result = data.split("\n").filter(line => line && line.startsWith("data:")).map(line => JSON.parse(line.substring(6))).find(line => line.final_sse_message);
      const info = JSON.parse(result.text);
      return {
        id: result.uuid,
        query: result.query_str,
        related_queries: result.related_queries,
        response: {
          answer: JSON.parse(info.find(line => line.step_type === "FINAL")?.content?.answer)?.answer,
          search_results: info.find(line => line.step_type === "SEARCH_RESULTS")?.content?.web_results || []
        }
      };
    } catch (error) {
      throw new Error(error.message);
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
  const api = new Perplexity();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}