import axios from "axios";
import FormData from "form-data";
class HtmlToImg {
  constructor() {
    this.apiUp = "https://api.filestool.com/api/upload";
    this.apiConv = "https://api.filestool.com/api/convert";
    this.apiJob = "https://api.filestool.com/api/job";
    this.apiDl = "https://api.filestool.com/api/download";
    this.hdrs = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://www.filestool.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.filestool.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _upload(htmlText) {
    try {
      console.log("[PROSES] Mengunggah file HTML ke FilesTool...");
      const fd = new FormData();
      fd.append("file", Buffer.from(htmlText, "utf-8"), {
        filename: "html.html",
        contentType: "text/html"
      });
      const res = await axios.post(this.apiUp, fd, {
        headers: {
          ...this.hdrs,
          ...fd.getHeaders()
        }
      });
      if (!res.data?.file_id) {
        throw new Error("Gagal mendapatkan file_id dari respon upload.");
      }
      console.log(`[SUKSES] File berhasil diunggah. ID: ${res.data.file_id}`);
      return res.data.file_id;
    } catch (err) {
      console.error("[ERROR TAHAP 1] Gagal saat mengunggah file:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async _convert(fileId, targetExt = "png", targetTool = "html-to-png") {
    try {
      console.log(`[PROSES] Mengirim instruksi konversi untuk file_id: ${fileId}`);
      const payload = {
        file_id: fileId,
        outputs: [{
          ext: targetExt,
          tool: targetTool
        }],
        options: {
          options_by_tool: {}
        }
      };
      const res = await axios.post(this.apiConv, payload, {
        headers: {
          ...this.hdrs,
          "content-type": "application/json"
        }
      });
      if (!res.data?.job_id) {
        throw new Error("Gagal memicu konversi, job_id tidak ditemukan.");
      }
      console.log(`[SUKSES] Job Konversi Terdaftar. Job ID: ${res.data.job_id}`);
      return res.data.job_id;
    } catch (err) {
      console.error("[ERROR TAHAP 2] Gagal memicu perintah konversi:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async _poll(jobId, maxRetry = 60) {
    console.log(`[PROSES] Memulai Polling untuk memeriksa status Job ID: ${jobId}`);
    for (let i = 0; i < maxRetry; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        const res = await axios.get(`${this.apiJob}/${jobId}`, {
          headers: this.hdrs
        });
        const jobData = res.data;
        console.log(`[POLLING #${i + 1}] Status saat ini: ${jobData?.status}`);
        if (jobData?.status === "completed") {
          const targetOutput = jobData?.result?.outputs?.[0];
          if (targetOutput && targetOutput.status === "completed") {
            return targetOutput.download_url;
          }
          throw new Error("Job selesai tetapi data output unduhan kosong.");
        }
        if (jobData?.status === "failed" || jobData?.status === "error") {
          throw new Error("Proses konversi dilaporkan gagal oleh sistem server.");
        }
      } catch (err) {
        console.warn(`[PERINGATAN] Kendala koneksi saat polling ke-${i + 1}:`, err?.message);
      }
    }
    throw new Error("Batas waktu polling habis (Timeout), konversi terlalu lama.");
  }
  async execute_run({
    html,
    targetExt = "png",
    targetTool = "html-to-png"
  }) {
    try {
      console.log("[START] Memulai workflow otomatisasi FilesTool...");
      let coreHtml = html || "";
      if (/^https?:\/\//i.test(coreHtml.trim())) {
        console.log(`[PROSES] Mendeteksi URL, mengunduh sumber HTML dari: ${coreHtml}`);
        const fetchRes = await axios.get(coreHtml);
        coreHtml = fetchRes?.data || "";
      }
      const fileId = await this._upload(coreHtml);
      const jobId = await this._convert(fileId, targetExt, targetTool);
      const downloadToken = await this._poll(jobId);
      const finalDownloadUrl = `${this.apiDl}/${downloadToken}`;
      console.log(`[SUKSES] Seluruh proses berhasil! Tautan Unduhan: ${finalDownloadUrl}`);
      return {
        url: finalDownloadUrl
      };
    } catch (e) {
      console.error("[FATAL ERROR] Alur eksekusi FilesTool terhenti:", e?.message);
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