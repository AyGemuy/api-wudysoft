import axios from "axios";
class Genius {
  constructor() {
    this.inst = axios.create({
      baseURL: "https://api.genius.com",
      headers: {
        "user-agent": "Genius/8.0.5.4987 (Android; Android 10; samsung SM-J700F)",
        "x-genius-app-background-request": "0",
        "x-genius-logged-out": "true",
        "x-genius-android-version": "8.0.5.4987"
      }
    });
  }
  async search({
    query,
    ...rest
  }) {
    try {
      if (!query) throw new Error("Query is required.");
      const {
        data
      } = await this.inst.get("/search/multi", {
        params: {
          q: query,
          ...rest
        }
      });
      const result = data?.response?.sections?.find(s => s.type === "song")?.hits || [];
      return {
        result: result
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async detail({
    id
  }) {
    try {
      if (isNaN(id)) throw new Error("Song ID is required.");
      const {
        data
      } = await this.inst.get(`/songs/${id}`);
      const result = data?.response?.song || data;
      return {
        result: result
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["search", "detail"]
    });
  }
  const api = new Genius();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'",
            example: {
              action: "search",
              query: "hello"
            }
          });
        }
        result = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'detail'",
            example: {
              action: "detail",
              id: "12345678"
            }
          });
        }
        result = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["search", "detail"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}