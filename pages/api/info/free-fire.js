import FreeFireAPI from "@pure0cd/freefire-api";
class FFAgent {
  constructor() {
    this.api = new FreeFireAPI();
  }
  log(task, status) {
    console.log(`[${task.toUpperCase()}] ${status}`);
  }
  async search({
    query,
    ...rest
  }) {
    try {
      this.log("search", `Mencari player: ${query ?? "Unknown"}`);
      return await this.api.searchAccount(query || "Miyya");
    } catch (e) {
      this.log("search", `Error: ${e.message}`);
    }
  }
  async profile({
    uid,
    ...rest
  }) {
    try {
      const target = uid || "16207002";
      this.log("profile", `Mengambil data UID: ${target}`);
      return await this.api.getPlayerProfile(target);
    } catch (e) {
      this.log("profile", `Error: ${e.message}`);
    }
  }
  async stats({
    uid,
    mode,
    type,
    ...rest
  }) {
    try {
      const target = uid || "16207002";
      const m = mode === "cs" ? "cs" : "br";
      const t = type || "career";
      this.log("stats", `Mengambil stats ${m} (${t}) untuk: ${target}`);
      return await this.api.getPlayerStats(target, m, t);
    } catch (e) {
      this.log("stats", `Error: ${e.message}`);
    }
  }
  async items({
    uid,
    ...rest
  }) {
    try {
      const target = uid || "16207002";
      this.log("items", `Cek inventory UID: ${target}`);
      return await this.api.getPlayerItems(target);
    } catch (e) {
      this.log("items", `Error: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "profile", "stats", "items"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=miya"
      }
    });
  }
  const api = new FFAgent();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "profile":
        if (!params.uid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uid' wajib diisi untuk action 'profile'."
          });
        }
        response = await api.profile(params);
        break;
      case "stats":
        if (!params.uid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uid' wajib diisi untuk action 'stats'."
          });
        }
        response = await api.stats(params);
        break;
      case "items":
        if (!params.uid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uid' wajib diisi untuk action 'items'."
          });
        }
        response = await api.items(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}