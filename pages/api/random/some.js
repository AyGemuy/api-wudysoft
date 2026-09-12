import axios from "axios";
class SomeRandomApi {
  constructor() {
    this.baseApiUrl = "https://some-random-api.com";
    this.validOptions = {
      animal: ["bird", "cat", "dog", "fox", "kangaroo", "koala", "panda", "raccoon", "red_panda"],
      animu: ["face-palm", "hug", "pat", "quote", "wink"],
      canvas: {
        filter: ["blue", "blurple", "blurple2", "brightness", "color", "green", "greyscale", "invert", "invertgreyscale", "red", "sepia", "threshold"],
        misc: ["bisexual", "blur", "circle", "colorviewer", "heart", "hex", "horny", "its-so-stupid", "jpg", "lesbian", "lgbt", "lied", "lolice", "namecard", "nobitches", "nonbinary", "oogway", "oogway2", "pansexual", "pixelate", "rgb", "simpcard", "spin", "tonikawa", "transgender", "tweet", "youtube-comment"],
        overlay: ["comrade", "gay", "glass", "jail", "passed", "triggered", "wasted"]
      },
      facts: ["bird", "cat", "dog", "fox", "koala", "panda"],
      img: ["bird", "cat", "dog", "fox", "kangaroo", "koala", "panda", "pikachu", "raccoon", "red_panda", "whale"],
      others: ["base64", "binary", "bottoken", "dictionary", "joke", "lyrics"],
      pokemon: ["abilities", "items", "moves", "pokedex"]
    };
  }
  validateEndpoint(type, query) {
    if (type === "welcome") return "welcome";
    const options = this.validOptions;
    if (!options[type]) {
      const availableTypes = ["welcome", ...Object.keys(options)].join(", ");
      throw new Error(`❌ Type '${type}' tidak ditemukan. ✅ Tersedia: [ ${availableTypes} ]`);
    }
    if (type === "canvas") {
      for (const cat in options.canvas) {
        if (options.canvas[cat].includes(query)) return `canvas/${query}`;
      }
      const allCanvasQueries = Object.values(options.canvas).flat().join(", ");
      throw new Error(`❌ Query '${query}' salah untuk canvas. ✅ Tersedia: [ ${allCanvasQueries} ]`);
    }
    if (!options[type].includes(query)) {
      const availableQueries = options[type].join(", ");
      throw new Error(`❌ Query '${query}' salah untuk type '${type}'. ✅ Tersedia: [ ${availableQueries} ]`);
    }
    return `${type}/${query}`;
  }
  validateRequiredParams(type, query, params) {
    const missing = [];
    if (type === "canvas") {
      if (!params.avatar) missing.push("avatar (URL Image)");
      if (query === "tweet") {
        if (!params.username) missing.push("username");
        if (!params.displayname) missing.push("displayname");
        if (!params.comment) missing.push("comment");
      }
      if (query === "youtube-comment") {
        if (!params.username) missing.push("username");
        if (!params.comment) missing.push("comment");
      }
    }
    if (type === "others") {
      if (query === "lyrics" && !params.title) missing.push("title");
      if (query === "dictionary" && !params.word) missing.push("word");
    }
    if (missing.length > 0) {
      throw new Error(`❌ Query '${query}' membutuhkan parameter: [ ${missing.join(", ")} ]`);
    }
  }
  async run({
    type,
    query,
    ...params
  }) {
    if (!type || !query) {
      throw new Error("❌ Parameter 'type' dan 'query' wajib diisi.");
    }
    const endpoint = this.validateEndpoint(type, query);
    this.validateRequiredParams(type, query, params);
    try {
      const response = await axios({
        method: "get",
        url: `${this.baseApiUrl}/${endpoint}`,
        params: params,
        responseType: "arraybuffer",
        timeout: 15e3
      });
      const contentType = response.headers["content-type"];
      if (contentType && contentType.includes("application/json")) {
        return {
          type: "json",
          data: JSON.parse(Buffer.from(response.data).toString())
        };
      }
      return {
        type: "image",
        data: Buffer.from(response.data),
        contentType: contentType
      };
    } catch (error) {
      const errMsg = error.response ? Buffer.from(error.response.data).toString() : error.message;
      throw new Error(`API Endpoint Error: ${errMsg}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.type || !params.query) {
    return res.status(400).json({
      error: "Parameter 'type' dan 'query' wajib diisi."
    });
  }
  const api = new SomeRandomApi();
  try {
    const result = await api.run(params);
    if (result.type === "image") {
      res.setHeader("Content-Type", result.contentType);
      return res.status(200).send(result.data);
    }
    return res.status(200).json(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    const statusCode = errorMessage.includes("❌") ? 400 : 500;
    return res.status(statusCode).json({
      error: errorMessage
    });
  }
}