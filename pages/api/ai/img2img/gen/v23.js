import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class VDrawAI {
  constructor() {
    this.base = "https://vdraw.ai";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: this.headers()
    }));
    this.models = {
      flux: 9,
      qwen: 11,
      seedream: 4,
      nano: 1
    };
    this.ready = false;
  }
  headers() {
    return {
      accept: "application/json",
      "accept-language": "id-ID",
      authorization: "",
      origin: this.base,
      referer: `${this.base}/ai-image-editor`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async ensure() {
    if (this.ready) return this;
    try {
      console.log("[INIT] Memulai inisialisasi...");
      await this.client.get(`${this.base}/ai-image-editor`, {
        headers: {
          ...this.headers(),
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        }
      });
      console.log("[INIT] Mengambil user info...");
      const {
        data: user
      } = await this.client.post(`${this.base}/api/v1/auth/userinfo`);
      console.log(`[INIT] Credits: ${user?.data?.guest_info?.credits || 0}`);
      console.log("[INIT] Identifikasi user...");
      const userId = crypto.randomUUID();
      await axios.post("https://vdrawai.featurebase.app/api/v1/user/identify", {
        organization: "vdrawai",
        name: "Visitor",
        userId: userId
      }, {
        headers: {
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/`
        }
      });
      this.ready = true;
      console.log("[INIT] Inisialisasi selesai\n");
      return this;
    } catch (err) {
      console.error("[INIT ERROR]", err?.response?.data || err.message);
      throw err;
    }
  }
  async toBase64(input) {
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string") {
        if (input.startsWith("data:image")) return input;
        if (input.startsWith("http")) {
          console.log(`[IMG] Mengunduh: ${input.slice(0, 50)}...`);
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = input.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || "jpeg";
          return `data:image/${mime};base64,${Buffer.from(data).toString("base64")}`;
        }
        return `data:image/jpeg;base64,${input}`;
      }
    } catch (err) {
      console.error("[IMG ERROR]", err.message);
      throw err;
    }
  }
  async generate({
    prompt,
    image,
    model = "flux",
    output_type = "png",
    aspect_ratio = "match_input_image",
    ...rest
  }) {
    await this.ensure();
    try {
      console.log(`[GEN] Model: ${model} | Prompt: ${prompt.slice(0, 50)}...`);
      const imageList = [];
      if (image) {
        const imgs = Array.isArray(image) ? image : [image];
        for (const img of imgs) {
          const b64 = await this.toBase64(img);
          imageList.push(b64);
          console.log(`[GEN] Image ${imageList.length} diproses`);
        }
      }
      const payload = {
        model: this.models[model] || this.models.flux,
        prompt: PROMPT.text || "",
        output_type: output_type,
        aspect_ratio: aspect_ratio,
        ...rest,
        ...imageList.length && {
          image_list: imageList
        }
      };
      console.log("[GEN] Membuat task...");
      const {
        data: task
      } = await this.client.post(`${this.base}/api/v1/r/text-to-image/create`, payload);
      if (task?.code !== 1e5) throw new Error(task?.message || "Task gagal dibuat");
      const taskId = task?.data?.id;
      console.log(`[GEN] Task ID: ${taskId}`);
      console.log("[POLL] Memulai polling...\n");
      let attempt = 0;
      while (attempt < 60) {
        attempt++;
        await new Promise(r => setTimeout(r, 3e3));
        console.log(`[POLL] Cek #${attempt}...`);
        const {
          data: result
        } = await this.client.post(`${this.base}/api/v1/r/image-editor/result`, {
          model: payload.model,
          task_id: taskId
        });
        const status = result?.data?.status;
        console.log(`[POLL] Status: ${status}`);
        if (status === "succeeded") {
          const output = result?.data?.output || [];
          const urls = output.map(p => `${this.base}${p}`);
          console.log(`[DONE] ${urls.length} gambar berhasil dibuat\n`);
          return {
            result: urls,
            ...result?.data
          };
        }
        if (status === "failed" || result?.data?.error) {
          throw new Error(result?.data?.error || "Task gagal");
        }
      }
      throw new Error("Timeout: polling melebihi batas waktu");
    } catch (err) {
      console.error("[GEN ERROR]", err?.response?.data || err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new VDrawAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}