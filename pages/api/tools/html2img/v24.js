import axios from "axios";
import FormData from "form-data";
class HtmlToImg {
  constructor() {
    this.imgApi = "https://www.allimagetools.com/api/html-to-image";
    this.upApi = "https://pone.rs/upload.php";
  }
  async _fd(buf, name) {
    try {
      console.log("[PROSES] Helper membuat FormData...");
      const fd = new FormData();
      fd.append("files[]", buf, {
        filename: name || "render.png"
      });
      return fd;
    } catch (err) {
      console.error("[ERROR] Gagal membuat FormData:", err?.message);
      throw err;
    }
  }
  async execute_run({
    html,
    ...rest
  }) {
    try {
      console.log("[PROSES] Memulai execute_run...");
      let coreHtml = html || "";
      if (/^https?:\/\//i.test(coreHtml.trim())) {
        try {
          console.log(`[PROSES] Mengambil konten HTML dari URL: ${coreHtml}`);
          const resHtml = await axios.get(coreHtml);
          coreHtml = resHtml?.data || "";
        } catch (e) {
          console.error("[ERROR] Gagal fetch URL HTML:", e?.message);
          throw e;
        }
      }
      const baseCfg = {
        width: 768,
        height: 1024,
        isMobile: false,
        fullPage: true,
        format: "png",
        quality: 90,
        scale: 3,
        darkMode: false,
        delay: 0,
        customCss: "",
        hideElements: ""
      };
      const payload = {
        html: coreHtml,
        ...baseCfg,
        ...rest
      };
      console.log("[PROSES] Mengirim data ke API AllImageTools...");
      let imgRes;
      try {
        imgRes = await axios.post(this.imgApi, payload, {
          headers: {
            accept: "*/*",
            "content-type": "application/json",
            origin: "https://www.allimagetools.com",
            referer: "https://www.allimagetools.com/html-to-image",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
          }
        });
      } catch (e) {
        console.error("[ERROR] HTTP request ke AllImageTools gagal:", e?.response?.data || e?.message);
        throw e;
      }
      const b64 = imgRes?.data?.image;
      if (!b64) {
        throw new Error("API AllImageTools tidak mengembalikan string base64 gambar");
      }
      console.log("[PROSES] Mengonversi Base64 ke Buffer...");
      let buf;
      try {
        const cleanB64 = b64.replace(/^data:image\/\w+;base64,/, "");
        buf = Buffer.from(cleanB64, "base64");
      } catch (bufErr) {
        console.error("[ERROR] Gagal memproses Buffer data gambar:", bufErr?.message);
        throw bufErr;
      }
      console.log("[PROSES] Mempersiapkan upload ke pone.rs...");
      const ext = payload.format === "jpeg" ? "jpg" : payload.format;
      const fd = await this._fd(buf, `render.${ext}`);
      let upRes;
      try {
        upRes = await axios.post(this.upApi, fd, {
          headers: {
            ...fd.getHeaders()
          }
        });
      } catch (e) {
        console.error("[ERROR] HTTP request upload ke pone.rs gagal:", e?.response?.data || e?.message);
        throw e;
      }
      const rawData = upRes?.data;
      const resData = rawData?.files?.[0] || (rawData?.url ? rawData : null);
      if (!resData || !resData?.url) {
        throw new Error("Format response pone.rs tidak dikenali atau upload gagal");
      }
      console.log(`[SUKSES] Selesai! File terdeteksi di: ${resData.url}`);
      return resData;
    } catch (e) {
      console.error("[FATAL ERROR] Alur eksekusi terhenti:", e?.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new HtmlToImg();
    const result = await converter.execute_run(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}