import axios from "axios";
import FormData from "form-data";
const BASE_URL = "https://api-banana.chainhub.tech";
const HEADERS = {
  "User-Agent": "okhttp/5.0.0-alpha.12",
  Connection: "close",
  Accept: "application/json",
  "Accept-Encoding": "gzip"
};
class NanoBanana {
  constructor() {
    this.key = "sk-G3sYpC1b9Smfwhv7u1eShTpgw5dnlLtXYvwwmep4aSTe3uYqzLSIzJVFwNhm4jpf";
    this.http = axios.create({
      baseURL: BASE_URL,
      headers: {
        ...HEADERS,
        Authorization: `Bearer ${this.key}`
      }
    });
    console.log("[init] BananaAPI ready, base:", BASE_URL);
  }
  async toImg(img, idx = 0) {
    try {
      console.log(`[toImg#${idx}] type:`, Buffer.isBuffer(img) ? "Buffer" : typeof img);
      if (Buffer.isBuffer(img)) {
        console.log(`[toImg#${idx}] using buffer, size: ${img.length} bytes`);
        return img;
      }
      if (typeof img === "string" && /^https?:\/\//i.test(img)) {
        console.log(`[toImg#${idx}] fetching url:`, img);
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(res.data);
        console.log(`[toImg#${idx}] fetched ok, size: ${buf.length} bytes`);
        return buf;
      }
      const b64 = img?.replace(/^data:[^;]+;base64,/, "") ?? img;
      const buf = Buffer.from(b64, "base64");
      console.log(`[toImg#${idx}] base64 decoded, size: ${buf.length} bytes`);
      return buf;
    } catch (err) {
      console.error(`[toImg#${idx}] error:`, err?.message ?? err);
      throw err;
    }
  }
  async wait(taskId, ms = 3e3, max = 60) {
    try {
      console.log(`[wait] start — task_id: ${taskId}, ms: ${ms}, max: ${max}`);
      for (let i = 0; i < max; i++) {
        console.log(`[wait] waiting ${ms}ms...`);
        await new Promise(r => setTimeout(r, ms));
        console.log(`[wait] attempt ${i + 1}/${max} — GET /images/edits/${taskId}`);
        let data;
        try {
          const res = await this.http.get(`/images/edits/${taskId}`);
          data = res?.data;
          console.log(`[wait] response ok, status: ${data?.status ?? "UNKNOWN"}`);
        } catch (reqErr) {
          console.error(`[wait#${i + 1}] request error:`, reqErr?.response?.data ?? reqErr.message);
          throw reqErr;
        }
        const status = data?.status ?? "UNKNOWN";
        if (status === "COMPLETED") {
          const {
            result,
            error,
            ...info
          } = data;
          console.log(`[wait] COMPLETED — total_time: ${info?.total_time ?? "n/a"}s`);
          return {
            result: result,
            ...info
          };
        }
        if (status === "FAILED") {
          const reason = data?.error || "Task failed";
          console.error(`[wait] FAILED — reason: ${reason}`);
          throw new Error(reason);
        }
        console.log(`[wait] still pending (${status}), continuing...`);
      }
      throw new Error(`[wait] timeout — no result after ${max} attempts`);
    } catch (err) {
      console.error("[wait] fatal error:", err?.message ?? err);
      throw err;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log("[gen] start — prompt:", prompt?.slice(0, 60) + (prompt?.length > 60 ? "..." : ""));
      const imgs = image == null ? [] : Array.isArray(image) ? image : [image];
      const isI2I = imgs.length > 0;
      console.log(`[gen] mode: ${isI2I ? "i2i" : "t2i"}, images: ${imgs.length}`);
      const base = isI2I ? {
        prompt: prompt,
        width: 800,
        height: 800,
        quality: "hd"
      } : {
        prompt: prompt,
        quality: "hd"
      };
      const fields = {
        ...base,
        ...rest
      };
      console.log("[gen] fields:", Object.keys(fields).join(", "));
      let fd;
      try {
        fd = new FormData();
        for (const [k, v] of Object.entries(fields)) {
          if (v == null) {
            console.log(`[gen] skip null: ${k}`);
            continue;
          }
          fd.append(k, String(v));
          console.log(`[gen] fd.append: ${k} = ${String(v).slice(0, 40)}`);
        }
      } catch (fdErr) {
        console.error("[gen] FormData error:", fdErr?.message ?? fdErr);
        throw fdErr;
      }
      for (const [idx, img] of imgs.entries()) {
        try {
          const buf = await this.toImg(img, idx);
          fd.append("image", buf, {
            filename: "image.jpg",
            contentType: "image/jpeg",
            knownLength: buf.length
          });
          console.log(`[gen] appended image#${idx}: ${buf.length} bytes`);
        } catch (imgErr) {
          console.error(`[gen] image#${idx} error:`, imgErr?.message ?? imgErr);
          throw imgErr;
        }
      }
      console.log("[gen] POST /images/edits...");
      let taskId;
      try {
        const {
          data
        } = await this.http.post("/images/edits", fd, {
          headers: fd.getHeaders()
        });
        taskId = data?.task_id;
        console.log(`[gen] task_id: ${taskId}, status: ${data?.status ?? "UNKNOWN"}`);
        console.log(`[gen] message: ${data?.message ?? "n/a"}`);
      } catch (postErr) {
        console.error("[gen] POST error:", postErr?.response?.data ?? postErr.message);
        throw postErr;
      }
      if (!taskId) {
        console.error("[gen] no task_id in response");
        throw new Error("No task_id returned from server");
      }
      console.log("[gen] polling...");
      const out = await this.wait(taskId);
      console.log("[gen] done ✓");
      return out;
    } catch (err) {
      console.error("[gen] fatal error:", err?.response?.data ?? err.message);
      throw err;
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
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}