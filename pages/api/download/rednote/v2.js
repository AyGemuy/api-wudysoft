import axios from "axios";
class RedNote {
  constructor() {
    this.api = "https://rednotedownloader.com/";
    this.headers = {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": "352bef296627adedcfc99e32c80dd93a4ee49d35",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
    };
  }
  async req(u, d) {
    try {
      const res = await axios.post(u, d, {
        headers: this.headers
      });
      return res?.data || "";
    } catch (err) {
      return null;
    }
  }
  fmt(str) {
    try {
      const lines = str?.split("\n") || [];
      const jsonLine = lines.filter(l => l.startsWith("1:")).map(l => l.slice(2))[0];
      const valid = jsonLine?.includes("{") ? jsonLine : "{}";
      let data = JSON.parse(valid);
      if (data.medias && Array.isArray(data.medias)) {
        data.medias = data.medias.map(item => {
          let direct = "";
          if (item.url && item.url.includes("url=")) {
            const encoded = item.url.split("url=")[1]?.split("&")[0];
            try {
              direct = Buffer.from(encoded, "base64").toString("utf-8");
            } catch (e) {
              direct = "Failed to decode";
            }
          }
          return {
            ...item,
            url: item.url.startsWith("http") ? item.url : `${this.api.replace(/\/$/, "")}${item.url}`,
            direct: direct
          };
        });
      }
      return data;
    } catch (e) {
      return {
        error: true
      };
    }
  }
  async download({
    url
  }) {
    try {
      const body = JSON.stringify([url || "", ""]);
      const rawData = await this.req(this.api, body);
      return this.fmt(rawData);
    } catch (err) {
      return {
        error: true
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
  const api = new RedNote();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}