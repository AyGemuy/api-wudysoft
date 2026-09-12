import axios from "axios";
import {
  randomUUID
} from "crypto";
import FormData from "form-data";
const API_URL = "https://api.findthatdude.org";
const SEARCH_KEY = "1697827719";
class FaceSearch {
  constructor() {
    this.apiUrl = API_URL;
    this.searchKey = SEARCH_KEY;
    this.uid = randomUUID();
    console.log("[facesearch] uid:", this.uid);
  }
  async resolve(image) {
    try {
      let buf, mime;
      if (typeof image === "string" && image.startsWith("http")) {
        const r = await axios.get(image, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(r.data);
        mime = r.headers["content-type"] || "image/jpeg";
      } else if (typeof image === "string") {
        const m = image.match(/^data:([^;]+);base64,(.+)/);
        mime = m?.[1] || "image/jpeg";
        buf = Buffer.from(m?.[2] || image, "base64");
      } else {
        buf = image;
        mime = "image/jpeg";
      }
      return {
        buf: buf,
        mime: mime
      };
    } catch (e) {
      console.error("[facesearch] resolve error:", e.message);
      throw e;
    }
  }
  parse(parsed) {
    try {
      let list = parsed?.data || parsed;
      if (typeof list === "string") try {
        list = JSON.parse(list);
      } catch {}
      return list;
    } catch (e) {
      console.error("[facesearch] parse error:", e.message);
      return [];
    }
  }
  async search({
    image,
    paid,
    numResults,
    ...rest
  }) {
    try {
      const {
        buf,
        mime
      } = await this.resolve(image);
      const endpoint = paid ? `/search_image/${this.searchKey}` : `/search_image_free_new/${this.searchKey}`;
      const form = new FormData();
      form.append("file", buf, {
        filename: "search.jpg",
        contentType: mime
      });
      form.append("num_results", String(numResults || rest.num_results || "250"));
      form.append("adult_flag", String(rest.adult_flag || "1"));
      form.append("user_uuid", this.uid);
      const res = await axios.post(`${this.apiUrl}${endpoint}`, form, {
        params: {
          userid: this.uid
        },
        headers: form.getHeaders()
      });
      const parsed = typeof res.data === "object" ? res.data : JSON.parse(res.data);
      const result = this.parse(parsed);
      const uuid = parsed?.search_uuid || null;
      console.log("[facesearch] done, results:", result.length, "uuid:", uuid);
      return {
        result: result,
        uuid: uuid
      };
    } catch (e) {
      console.error("[facesearch] search error:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new FaceSearch();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}