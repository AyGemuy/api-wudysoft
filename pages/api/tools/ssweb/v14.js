import axios from "axios";
class Microlink {
  constructor() {
    this.api = "https://api.microlink.io";
    this.headers = {
      Accept: "application/json"
    };
  }
  async generate({
    url,
    ...rest
  }) {
    console.log(`[Proses] Mengambil buffer screenshot: ${url}`);
    try {
      const res = await axios.get(this.api, {
        params: {
          url: url,
          screenshot: true,
          embed: "screenshot.url",
          ...rest
        },
        headers: this.headers,
        responseType: "arraybuffer"
      });
      const result = {
        buffer: Buffer.from(res?.data),
        mime: res?.headers?.["content-type"] || "image/png"
      };
      console.log(`[Sukses] Terambil ${result.buffer.length} bytes | Mime: ${result.mime}`);
      return result;
    } catch (err) {
      const errMsg = err?.response?.data ? Buffer.from(err.response.data).toString() : err.message;
      console.error(`[Error] Gagal: ${errMsg}`);
      return {
        buffer: null,
        mime: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Microlink();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}