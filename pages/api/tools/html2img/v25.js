import axios from "axios";
import FormData from "form-data";
import WebSocket from "ws";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class HtmlToImg {
  constructor() {
    this.base = "https://www.runconvert.com";
    this.authApi = "https://api.runconvert.com/v2/auth/guest";
    this.jobApi = "https://api.runconvert.com/v2/core/jobs";
    this.wsUrl = "wss://ws.runconvert.com/socket.io/?EIO=4&transport=websocket";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.hdrs = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: this.base,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.base}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _init() {
    try {
      console.log("[PROSES] Melakukan hit landing page awal...");
      await this.client.get(`${this.base}/html-to-png`, {
        headers: {
          ...this.hdrs,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none"
        }
      });
      const initCookies = await this.jar.getCookies(this.base);
      const devCookie = initCookies.find(c => c.key === "runconvert_device_id");
      const activeDeviceId = devCookie ? devCookie.value : "855c6ae1430e8fda8501cf99933c4790";
      this.hdrs["x-device-id"] = activeDeviceId;
      console.log(`[SUKSES] Auto dapat Device ID dari Cookie: ${activeDeviceId}`);
      console.log("[PROSES] Memicu registrasi auth/guest token...");
      await this.client.post(this.authApi, {}, {
        headers: this.hdrs
      });
      const authCookies = await this.jar.getCookies(this.base);
      const socketCookie = authCookies.find(c => c.key === "runconvert_socket_web");
      if (!socketCookie || !socketCookie.value) {
        throw new Error("Gagal mengamankan runconvert_socket_web dari cookie jar");
      }
      console.log("[SUKSES] Token socket client berhasil diamankan.");
      return {
        deviceId: activeDeviceId,
        socketToken: socketCookie.value
      };
    } catch (err) {
      console.error("[ERROR] Handshake session gagal:", err?.message);
      throw err;
    }
  }
  async _fd(htmlText) {
    const fd = new FormData();
    fd.append("file", Buffer.from(htmlText, "utf-8"), {
      filename: "html.html",
      contentType: "application/octet-stream"
    });
    return fd;
  }
  async _connect(jobId, socketToken) {
    return new Promise((resolve, reject) => {
      console.log("[WS] Membuka koneksi WebSocket...");
      const ws = new WebSocket(this.wsUrl, {
        headers: {
          Pragma: "no-cache",
          Origin: this.base,
          "Accept-Language": "id-ID",
          "User-Agent": this.hdrs["user-agent"],
          "Cache-Control": "no-cache"
        }
      });
      let resolved = false;
      let finalDownloadUrl = null;
      let convertTaskFailed = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          ws.terminate();
          reject(new Error("WebSocket timeout (120 detik)"));
        }
      }, 12e4);
      ws.on("open", () => {
        console.log("[WS] Terkoneksi, kirim auth...");
        ws.send(`40{"token":"Bearer ${socketToken}"}`);
      });
      ws.on("message", data => {
        const msg = data.toString();
        if (msg === "2") {
          ws.send("3");
          return;
        }
        if (msg.startsWith("0{")) {
          console.log("[WS] Handshake OK, menunggu auth...");
          return;
        }
        if (msg.startsWith("40")) {
          console.log("[WS] Auth berhasil, subscribe job...");
          ws.send(`42["subscribe",{"channels":["private-job.${jobId}","private-job.${jobId}.tasks"]}]`);
          return;
        }
        if (msg.startsWith("42")) {
          try {
            const jsonPart = msg.slice(2);
            const [eventName, eventData] = JSON.parse(jsonPart);
            console.log(`[WS EVENT] ${eventName}`, JSON.stringify(eventData).slice(0, 200));
            if (eventName === "ack") {
              console.log("[WS] Subscription acknowledged");
            } else if (eventName === "task.finished") {
              const task = eventData.task;
              if (task?.operation === "export/direct/url" && task?.links?.download) {
                finalDownloadUrl = task.links.download;
                console.log(`[WS] 🔥 URL download ditemukan: ${finalDownloadUrl}`);
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  ws.close();
                  resolve({
                    url: finalDownloadUrl,
                    ...eventData.task
                  });
                }
              }
            } else if (eventName === "task.updated") {
              const task = eventData.task;
              if (task?.operation === "convert") {
                if (task.status === "failed" || task.code && task.code !== 200) {
                  convertTaskFailed = true;
                  console.error(`[WS ERROR] Convert task gagal: ${task.message || "Unknown error"}`);
                  if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    ws.close();
                    reject(new Error(`Convert failed: ${task.message || "Task error"}`));
                  }
                }
              }
            } else if (eventName === "job.updated") {
              if (eventData.job?.status === "failed") {
                console.error("[WS ERROR] Job status failed");
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  ws.close();
                  reject(new Error("Job failed"));
                }
              }
            } else if (eventName === "job.finished") {
              console.log("[WS] Job finished");
              if (!resolved) {
                if (finalDownloadUrl) {
                  resolved = true;
                  clearTimeout(timeout);
                  ws.close();
                  resolve({
                    url: finalDownloadUrl,
                    ...eventData.task
                  });
                } else {
                  reject(new Error("Job selesai tapi tidak ada URL download"));
                }
              }
            }
          } catch (err) {
            console.warn("[WS] Gagal parse event:", err.message);
          }
        }
      });
      ws.on("error", err => {
        console.error("[WS ERROR]", err);
        if (!resolved) {
          clearTimeout(timeout);
          reject(err);
        }
      });
      ws.on("close", () => {
        console.log("[WS] Koneksi ditutup");
        if (!resolved && !convertTaskFailed) {
          clearTimeout(timeout);
          reject(new Error("WebSocket ditutup sebelum job selesai"));
        }
      });
    });
  }
  async execute_run({
    html,
    ...rest
  }) {
    try {
      console.log("[PROSES] Memulai eksekusi RunConvert dengan Engine WebSocket...");
      const session = await this._init();
      let coreHtml = html || "";
      if (/^https?:\/\//i.test(coreHtml.trim())) {
        console.log(`[PROSES] Mengambil isi HTML dari URL: ${coreHtml}`);
        const resHtml = await axios.get(coreHtml);
        coreHtml = resHtml?.data || "";
      }
      const htmlBuffer = Buffer.from(coreHtml, "utf-8");
      const totalSize = htmlBuffer.length;
      const basePayload = {
        tag: "webinterface",
        tasks: {
          "import-1": {
            operation: "import/direct/upload",
            file_size: totalSize
          },
          "convert-1": {
            operation: "convert",
            input: ["import-1"],
            engine: "onlyoffice",
            input_format: "html",
            output_format: "png",
            engine_version: "7.5"
          },
          "export-1": {
            operation: "export/direct/url",
            input: ["convert-1"],
            inline_additional: true,
            archive_multiple_files: true
          }
        }
      };
      const payload = {
        ...basePayload,
        ...rest
      };
      console.log("[PROSES] Mendaftarkan Job ke runconvert...");
      const jobRes = await this.client.post(this.jobApi, payload, {
        headers: this.hdrs
      });
      const jobId = jobRes?.data?.job?.id;
      const tasksList = jobRes?.data?.tasks || [];
      const importTask = tasksList.find(t => t.name === "import/direct/upload") || tasksList[0];
      const upUrl = importTask?.results?.upload_url;
      const joinUrl = importTask?.results?.complete_url;
      if (!jobId || !upUrl || !joinUrl) {
        throw new Error("Gagal mengamankan parameter unggahan/Job ID dari API Gateway");
      }
      const wsPromise = this._connect(jobId, session.socketToken);
      console.log("[PROSES] Mengunggah data biner file HTML...");
      const fd = await this._fd(coreHtml);
      const chunkParams = `?chunkNumber=1&filename=html.html&totalSize=${totalSize}&currentChunkSize=${totalSize}&totalChunks=1`;
      await this.client.post(`${upUrl}${chunkParams}`, fd, {
        headers: {
          ...this.hdrs,
          ...fd.getHeaders(),
          accept: "*/*"
        }
      });
      console.log("[PROSES] Mengirim sinyal instruksi Join File...");
      await this.client.post(joinUrl, {}, {
        headers: {
          ...this.hdrs,
          accept: "*/*",
          "content-length": "0"
        }
      });
      const finalResult = await wsPromise;
      console.log(`[SUKSES] Eksekusi selesai. Output: ${finalResult.url}`);
      return finalResult;
    } catch (e) {
      console.error("[FATAL ERROR] Alur eksekusi RunConvert terhenti:", e?.response?.data || e?.message);
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