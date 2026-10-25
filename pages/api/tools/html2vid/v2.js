import axios from "axios";
class Fix42HtmlToVideo {
  constructor() {
    this.cli = axios.create({
      baseURL: "https://backend.fix42.com",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://fix42.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://fix42.com/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async generate({
    html,
    width = 1080,
    height = 1080,
    fps = 15,
    duration = 5,
    backgroundColor = "#000000",
    ...rest
  }) {
    try {
      if (!html) {
        throw new Error('Input parameter "html" wajib diisi (URL atau teks HTML langsung).');
      }
      let code = html;
      if (/^https?:\/\//i.test(html.trim())) {
        console.log(`[LOG] Mengambil konten HTML dari URL: ${html}...`);
        const fetched = await axios.get(html, {
          responseType: "text"
        });
        code = fetched?.data || "";
      }
      const payload = {
        html: code,
        width: Number(width) || 1080,
        height: Number(height) || 1080,
        fps: Number(fps) || 15,
        duration: Number(duration) || 5,
        backgroundColor: backgroundColor || "#000000",
        ...rest
      };
      console.log(`[LOG] Mengirim request render video (${payload.width}x${payload.height}, ${payload.duration}s, ${payload.fps}fps)...`);
      const res = await this.cli.post("/api/html-to-video", payload);
      const data = res?.data;
      if (!data?.success || !data?.data) {
        throw new Error(data?.message || "Gagal merender video dari HTML.");
      }
      console.log("[LOG] Berhasil menerima data video (Base64), mengonversi ke buffer...");
      const buffer = Buffer.from(data.data, "base64");
      return {
        status: true,
        buffer: buffer,
        base64: data.data,
        contentType: "video/mp4"
      };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Proses pembuatan video gagal";
      console.error("[ERROR:generate]", msg);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params?.html) {
    return res.status(400).json({
      error: "Parameter 'html' diperlukan (dapat berupa string HTML mentah atau URL web)"
    });
  }
  const api = new Fix42HtmlToVideo();
  try {
    const data = await api.generate(params);
    if (!data?.status || !data?.buffer) {
      return res.status(500).json({
        error: data?.error || "Gagal memproses video"
      });
    }
    if (params.json === "true" || params.json === true) {
      return res.status(200).json({
        success: true,
        data: data.base64
      });
    }
    res.setHeader("Content-Type", data.contentType || "video/mp4");
    return res.status(200).send(data.buffer);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}