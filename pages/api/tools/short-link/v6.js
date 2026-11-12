import axios from "axios";
class Shorten {
  constructor() {
    console.log("Shorten API siap digunakan.");
    this.baseHeaders = {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
  }
  async generate({
    url,
    alias,
    password,
    max_clicks,
    ...rest
  }) {
    console.log("Proses pemendekan via API dimulai...");
    const payload = {
      long_url: url,
      ...alias && {
        alias: alias
      },
      ...password && {
        password: password
      },
      ...max_clicks && {
        max_clicks: Number(max_clicks)
      },
      ...rest
    };
    console.log("Mengirim permintaan POST ke API spoo.me...", JSON.stringify(payload));
    const response = await axios.post("https://spoo.me/api/v1/shorten", payload, {
      headers: this.baseHeaders
    });
    console.log("Permintaan berhasil, status:", response?.status || "Tidak ada status");
    if (response.data) {
      return response.data;
    } else {
      throw new Error("Respons dari API kosong");
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
  const api = new Shorten();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.response?.data || error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}