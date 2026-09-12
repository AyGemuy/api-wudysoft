import axios from "axios";
class SpotSong {
  constructor() {
    this.base = "https://find-song-by-lyrics-search.netlify.app/.netlify/functions/spotify-api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      referer: "https://find-song-by-lyrics-search.netlify.app/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
  async search({
    q = ""
  } = {}) {
    try {
      const url = `${this.base}/search`;
      this.log(`GET search: "${q}"`);
      const {
        data
      } = await axios.get(url, {
        params: {
          q: q
        },
        headers: this.headers
      });
      this.log(`Found ${data?.tracks?.items?.length || 0} tracks`);
      return {
        ok: true,
        ...data
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async tracks({
    id = ""
  } = {}) {
    try {
      const url = `${this.base}/tracks/${id}`;
      this.log(`GET tracks: ${id}`);
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      this.log(`Track obtained`);
      return {
        ok: true,
        ...data
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail", "genres", "sorts"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&q=hello"
      }
    });
  }
  const api = new SpotSong();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "tracks":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'tracks'.",
            example: "7ogPk9PSUggLEcqe87gcwa"
          });
        }
        response = await api.tracks(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
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