import axios from "axios";
class JooMods {
  constructor() {
    this.base = "https://m.joomods.web.id/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      referer: "https://m.joomods.web.id/",
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
      const url = `${this.base}/music`;
      this.log(`GET search: "${q}"`);
      const {
        data
      } = await axios.get(url, {
        params: {
          alicia: q
        },
        headers: this.headers
      });
      this.log(`Found ${data?.result?.length || 0} results`);
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
  async download({
    url = "",
    lyrics = false
  } = {}) {
    try {
      const api_url = `${this.base}/music`;
      this.log(`GET download: ${url}`);
      const {
        data
      } = await axios.get(api_url, {
        params: {
          download: url
        },
        headers: this.headers
      });
      let result = {
        ok: true,
        ...data
      };
      if (lyrics && url) {
        try {
          const title_match = url.match(/\/([^/]+)$/);
          const title = title_match ? title_match[1].replace(/-/g, " ") : "";
          if (title) {
            this.log(`Fetching lyrics: ${title}`);
            const lyrics_data = await this.lyrics({
              title: title
            });
            if (lyrics_data.ok) {
              result = {
                ...result,
                lyrics: lyrics_data
              };
            }
          }
        } catch (err) {
          this.log(`Lyrics error: ${err.message}`);
        }
      }
      this.log(`Download ready`);
      return result;
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        ok: false,
        msg: e.message
      };
    }
  }
  async lyrics({
    title = ""
  } = {}) {
    try {
      const url = `${this.base}/lyrics`;
      this.log(`GET lyrics: "${title}"`);
      const {
        data
      } = await axios.get(url, {
        params: {
          title: title
        },
        headers: this.headers
      });
      this.log(`Lyrics obtained`);
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
  const validActions = ["search", "download", "lyrics"];
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
  const api = new JooMods();
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
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'.",
            example: "https://"
          });
        }
        response = await api.download(params);
        break;
      case "lyrics":
        if (!params.title) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'title' wajib diisi untuk action 'lyrics'.",
            example: "judul-lagu"
          });
        }
        response = await api.lyrics(params);
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