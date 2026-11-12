import axios from "axios";
import {
  randomBytes
} from "crypto";
class Chirp {
  constructor() {
    this.base = "https://topsuperapps.com/chirp";
    this.uid = null;
    this.http = axios.create({
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
      }
    });
  }
  genId() {
    return randomBytes(8).toString("hex");
  }
  async auth() {
    const uid = this.genId();
    console.log("[auth] registering uid:", uid);
    try {
      const {
        data
      } = await this.http.post(`${this.base}/create_user.php`, {
        unique_userid: uid
      });
      this.uid = data?.unique_userid || uid;
      console.log("[auth] ok uid:", this.uid, "| plan:", data?.plan, "| balance:", data?.char_limit);
      return data;
    } catch (e) {
      console.error("[auth] failed:", e?.message);
      throw e;
    }
  }
  async ensure() {
    if (this.uid) return;
    console.log("[ensure] no uid, auto auth...");
    await this.auth();
  }
  async generate({
    prompt,
    n = 1,
    size = "1024x1024",
    watchad = false,
    ...rest
  }) {
    await this.ensure();
    const validSizes = ["1024x1024", "1024x1792", "1024x683"];
    const safeSize = validSizes.includes(size) ? size : "1024x1024";
    const safeN = Math.min(Math.max(parseInt(n) || 1, 1), 3);
    console.log(`[generate] prompt="${prompt}" | size=${safeSize} | n=${safeN}`);
    try {
      const {
        data
      } = await this.http.post(`${this.base}/generate_image.php`, {
        prompt: prompt,
        n: String(safeN),
        size: safeSize,
        watchad: watchad,
        ...rest
      }, {
        headers: {
          "x-user-id": this.uid
        }
      });
      const imgs = data?.images?.map(i => i?.url) || [];
      console.log("[generate] ok | status:", data?.status, "| balance:", data?.new_balance, "| urls:", imgs);
      return {
        ...data,
        urls: imgs
      };
    } catch (e) {
      console.error("[generate] failed:", e?.response?.data || e?.message);
      throw e;
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
  const api = new Chirp();
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