import axios from "axios";
class InstaDownloader {
  constructor() {
    this.baseUrl = "https://eoehwyffvhpmvpeblkbi.supabase.co/functions/v1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZWh3eWZmdmhwbXZwZWJsa2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjkyMDQsImV4cCI6MjA3NTI0NTIwNH0.6gaEplv2FuUOos8h4Zs9ELxE77F2d6cv1jiNVTDKJ1w",
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZWh3eWZmdmhwbXZwZWJsa2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjkyMDQsImV4cCI6MjA3NTI0NTIwNH0.6gaEplv2FuUOos8h4Zs9ELxE77F2d6cv1jiNVTDKJ1w",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://instaddl.com",
      pragma: "no-cache",
      referer: "https://instaddl.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-client-info": "supabase-js-web/2.58.0"
    };
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async ftch(targetUrl) {
    console.log(`[PROSES] Memulai fetch untuk URL: ${targetUrl}`);
    try {
      const res = await axios.post(`${this.baseUrl}/instagram-fetch`, {
        url: targetUrl
      }, {
        headers: this.headers
      });
      console.log(`[SUKSES] Fetch berhasil dipicu. Message: ${res.data?.message || "No message"}`);
      return res.data || null;
    } catch (err) {
      console.error(`[ERROR] Gagal melakukan fetch:`, err.response?.data || err.message);
      throw err;
    }
  }
  async pll(reqBody) {
    console.log(`[PROSES] Memeriksa status (polling) untuk runId: ${reqBody?.runId}`);
    try {
      const res = await axios.post(`${this.baseUrl}/instagram-poll`, reqBody, {
        headers: this.headers
      });
      return res.data || null;
    } catch (err) {
      console.error(`[ERROR] Gagal saat polling status:`, err.response?.data || err.message);
      throw err;
    }
  }
  async download({
    url,
    ...rest
  }) {
    const targetUrl = url || rest.targetUrl;
    if (!targetUrl) {
      console.error("[ERROR] Parameter URL wajib diisi.");
      return null;
    }
    try {
      const initData = await this.ftch(targetUrl);
      const runId = initData?.runId;
      const datasetId = initData?.datasetId;
      if (!runId || !datasetId) {
        console.error("[ERROR] Gagal mendapatkan token tracking (runId/datasetId).");
        return null;
      }
      const pollPayload = {
        runId: runId,
        datasetId: datasetId,
        url: targetUrl
      };
      let attempts = 0;
      const maxAttempts = 60;
      console.log("[PROSES] Memulai siklus auto-polling (interval 3000ms)...");
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[PROSES] Polling ke-${attempts}/${maxAttempts}`);
        const pollResult = await this.pll(pollPayload);
        if (pollResult?.success && !pollResult?.pending && pollResult?.data?.mediaUrls) {
          console.log("[SUKSES] Data media berhasil didapatkan!");
          return pollResult.data;
        }
        console.log(`[PROSES] Konten masih diproses, menunggu 3 detik...`);
        await this.sleep(3e3);
      }
      console.warn("[TIMEOUT] Proses mencapai batas maksimal waktu tunggu (60 kali klik).");
      return null;
    } catch (err) {
      const errMsg = err.message ? err.message : "Terjadi kesalahan internal pada sistem";
      console.error(`[FATAL] Alur download terputus: ${errMsg}`);
      return null;
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
  const api = new InstaDownloader();
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