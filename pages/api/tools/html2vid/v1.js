import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class Html5ToVideo {
  constructor() {
    this.jar = {};
    this.email = `user__${Date.now()}@test.com`;
    this.cli = axios.create({
      baseURL: "https://html5animationtogif.com"
    });
    this.cli.interceptors.request.use(cfg => {
      try {
        const cStr = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
        if (cStr) cfg.headers.Cookie = cStr;
        return cfg;
      } catch (err) {
        return cfg;
      }
    });
    this.cli.interceptors.response.use(res => {
      try {
        const raw = res.headers?.["set-cookie"];
        if (raw) {
          (Array.isArray(raw) ? raw : [raw]).forEach(c => {
            const [pair] = (c || "").split(";");
            const [k, ...v] = (pair || "").split("=");
            if (k) this.jar[k.trim()] = v.join("=").trim();
          });
        }
        return res;
      } catch (err) {
        return res;
      }
    });
    this.jar["EmailId"] = this.email;
    this.jar["batch"] = "N";
    this.jar["purchaseoption"] = "0";
    this.jar["__hashid"] = String(Math.floor(1e7 + Math.random() * 9e7));
  }
  async sleep(ms = 3e3) {
    try {
      return await new Promise(r => setTimeout(r, ms));
    } catch (err) {
      console.error("[ERROR:sleep]", err?.message || err);
    }
  }
  async att() {
    try {
      console.log("[LOG] Melakukan inisialisasi attempt session...");
      const res = await this.cli.get("/post_to_server.ashx?RequestCase=ATTEMPTCOUNT", {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          referer: "https://html5animationtogif.com/html5tovideo",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      return res?.data;
    } catch (err) {
      console.error("[ERROR:att]", err?.message || err);
      throw err;
    }
  }
  async up(content) {
    try {
      console.log("[LOG] Mengunggah file HTML ke server...");
      const fd = new FormData();
      fd.append("fileUpload", Buffer.from(content), {
        filename: "run.html",
        contentType: "text/html"
      });
      fd.append("inputsource", "html");
      fd.append("uselection", "1");
      const res = await this.cli.post("/fileUploadHandler.ashx", fd, {
        headers: {
          ...fd.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          origin: "https://html5animationtogif.com",
          priority: "u=1, i",
          referer: "https://html5animationtogif.com/html5tovideo",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      const txt = res?.data || "";
      const token = txt.split("SUCCESS:")[1]?.split("$$")[0]?.trim();
      if (!token) throw new Error(`Gagal upload HTML: ${txt}`);
      return token;
    } catch (err) {
      console.error("[ERROR:up]", err?.message || err);
      throw err;
    }
  }
  async sub(tok, dur, opt = {}) {
    try {
      console.log(`[LOG] Mendaftarkan request antrean video untuk token: ${tok}...`);
      const fd = new FormData();
      const w = opt?.width ? String(opt.width) : "1920";
      const h = opt?.height ? String(opt.height) : "1080";
      const fps = opt?.fps ? String(opt.fps) : "60";
      const defPayload = {
        sResizeExpand: "1",
        width: w,
        height: h,
        input_width: opt?.input_width ? String(opt.input_width) : w,
        input_height: opt?.input_height ? String(opt.input_height) : h,
        os: "Linux",
        browser: "Chrome 135",
        duration: dur,
        maxsize: "0",
        email: this.email,
        sessionkey: "",
        loop: "0",
        fps: fps,
        animatefps: opt?.animatefps ? String(opt.animatefps) : fps,
        videoformat: "mp4",
        istrans: "N",
        ckblendsimilarity: "0.2:0.2",
        activity: "MP4",
        action1: "-",
        setupscreen: "N",
        tokenid: tok,
        url: "",
        inputsource: "zip",
        loopinfo: "N",
        loopRange: "-",
        qualityinfo: "0",
        pixelformat: "1",
        sharpness: "0",
        recordaudio: opt?.audio || "Y",
        colors: "-1",
        batch: "N",
        bitrateoption: "CBR",
        bitratevalue: "18"
      };
      const finalPayload = {
        ...defPayload,
        ...opt
      };
      finalPayload.tokenid = finalPayload.tokenid || tok;
      finalPayload.duration = finalPayload.duration || dur;
      Object.entries(finalPayload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          fd.append(k, String(v));
        }
      });
      const res = await this.cli.post("/dataUploadHandler_video.ashx", fd, {
        headers: {
          ...fd.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: "https://html5animationtogif.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://html5animationtogif.com/html5tovideo",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      return res?.data;
    } catch (err) {
      console.error("[ERROR:sub]", err?.message || err);
      throw err;
    }
  }
  async job(tok) {
    try {
      console.log("[LOG] Mengambil JobId antrean dari halaman MyConversions...");
      const res = await this.cli.get("/MyConversions", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          referer: "https://html5animationtogif.com/html5tovideo",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(res?.data || "");
      const tr = $(`tr[tokenid="${tok}"]`);
      const jId = tr?.attr("jobid") || $("table#tblBatch tbody tr").first()?.attr("jobid");
      if (!jId) throw new Error("Job ID tidak terdaftar pada halaman konversi.");
      return jId;
    } catch (err) {
      console.error("[ERROR:job]", err?.message || err);
      throw err;
    }
  }
  async poll(jId, maxRetry = 60) {
    try {
      console.log(`[LOG] Memantau status rendering Job ID: ${jId}...`);
      for (let i = 0; i < maxRetry; i++) {
        await this.sleep(3e3);
        const res = await this.cli.get(`/post_to_server.ashx?RequestCase=JSTATUS&ids=${jId}`, {
          headers: {
            accept: "*/*",
            "accept-language": "id-ID,id;q=0.9",
            priority: "u=1, i",
            referer: "https://html5animationtogif.com/MyConversions",
            "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
          }
        });
        const statusText = res?.data || "";
        console.log(`[LOG] Poll status #${i + 1}: ${statusText}`);
        if (statusText.includes("Completed")) return true;
        if (statusText.includes("Failed") || statusText.includes("Error")) {
          throw new Error(`Rendering video gagal: ${statusText}`);
        }
      }
      throw new Error("Proses konversi melebihi batas waktu (timeout).");
    } catch (err) {
      console.error("[ERROR:poll]", err?.message || err);
      throw err;
    }
  }
  async chk(tok, jId, fmt = "mp4") {
    try {
      console.log(`[LOG] Memeriksa ukuran file video ${tok}.${fmt}...`);
      const res = await this.cli.get(`/CheckFile.ashx?filename=${tok}.${fmt}&jobid=${jId}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=1, i",
          referer: "https://html5animationtogif.com/MyConversions",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      return res?.data;
    } catch (err) {
      console.error("[ERROR:chk]", err?.message || err);
      throw err;
    }
  }
  async dl(jId, tok, fmt = "mp4") {
    try {
      const url = `https://omdle.com/content/${jId}/${tok}.${fmt}`;
      console.log(`[LOG] Mengunduh binary video langsung: ${url}...`);
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "id-ID,id;q=0.9",
          priority: "u=0, i",
          referer: "https://html5animationtogif.com/",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "iframe",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site",
          "sec-fetch-storage-access": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        }
      });
      return Buffer.from(res.data);
    } catch (err) {
      console.error("[ERROR:dl]", err?.message || err);
      throw err;
    }
  }
  async generate({
    html,
    duration,
    ...rest
  }) {
    try {
      if (!html) throw new Error('Input parameter "html" wajib diisi (URL atau teks HTML langsung).');
      let code = html;
      if (/^https?:\/\//i.test(html.trim())) {
        console.log(`[LOG] Input terdeteksi sebagai URL, mengambil konten dari: ${html}...`);
        const fetched = await axios.get(html);
        code = fetched?.data || "";
      }
      const durStr = duration ? String(duration) : "5";
      const fmt = rest?.videoformat || "mp4";
      await this.att();
      const token = await this.up(code);
      await this.sub(token, durStr, rest);
      const jobId = await this.job(token);
      await this.poll(jobId);
      await this.chk(token, jobId, fmt);
      const buffer = await this.dl(jobId, token, fmt);
      return {
        status: true,
        buffer: buffer,
        contentType: fmt === "webm" ? "video/webm" : "video/mp4"
      };
    } catch (err) {
      console.error("[ERROR:generate]", err?.message || err);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: err?.message || "Proses pembuatan video gagal"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params?.html) {
    return res.status(400).json({
      error: "Parameter 'html' diperlukan"
    });
  }
  const api = new Html5ToVideo();
  try {
    const data = await api.generate(params);
    if (!data?.status || !data?.buffer) {
      return res.status(500).json({
        error: data?.error || "Gagal memproses video"
      });
    }
    res.setHeader("Content-Type", data?.contentType || "video/mp4");
    return res.status(200).send(data.buffer);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}