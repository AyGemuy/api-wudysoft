import axios from "axios";
class UnlimAI {
  constructor() {
    this.url = {
      gen: "https://api.unlimai.space/generate",
      edit: "https://api.unlimai.space/edit"
    };
    this.h = {
      "User-Agent": "UnlimAI/1.0",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-api-secret": "qb_api_G56ZBQRR5xKznEjR_PyLFcCvKbFt71z2",
      "accept-charset": "UTF-8"
    };
  }
  async resolveImage(input) {
    if (!input) return "";
    try {
      if (Buffer.isBuffer(input)) return `data:image/jpeg;base64,${input.toString("base64")}`;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return `data:${res.headers["content-type"] || "image/jpeg"};base64,${Buffer.from(res.data).toString("base64")}`;
      }
      return input.includes("base64,") ? input : `data:image/jpeg;base64,${input}`;
    } catch (err) {
      console.log(`[Image] Resolve error: ${err.message}`);
      return "";
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      const isI2I = Array.isArray(image) ? image.length > 0 : !!image;
      const mode = isI2I ? "edit" : "gen";
      console.log(`[Generate] Mode: ${mode.toUpperCase()} | Prompt: ${prompt?.slice(0, 30)}...`);
      let payload = {
        prompt: prompt,
        ...rest
      };
      if (isI2I) {
        const inputs = Array.isArray(image) ? image : [image];
        const images = [];
        for (const inp of inputs) {
          const r = await this.resolveImage(inp);
          if (r) images.push(r);
        }
        if (!images.length) throw new Error("No valid image provided");
        payload.images = images;
      }
      const {
        data: res
      } = await axios.post(this.url[mode], payload, {
        headers: this.h
      });
      return res;
    } catch (e) {
      const msg = e?.response?.data || e?.message || "Internal Error";
      console.error(`[Error]`, msg);
      return {
        error: true,
        msg: msg
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
  const api = new UnlimAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}