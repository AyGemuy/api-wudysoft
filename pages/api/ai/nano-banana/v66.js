import axios from "axios";
import FormData from "form-data";
class NanoBanana {
  constructor() {
    this.url = "https://api.pixq.top/api";
    this.ua = "okhttp/4.11.0";
    this.pd = 3e3;
    this.pm = 6e4;
    this.ax = axios.create({
      baseURL: this.url
    });
    console.log(`✅ Pixq: ${this.url}`);
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      console.log(`🚀 gen: ${image ? "i2i" : "t2i"}`);
      const type = image ? "i2i" : "t2i";
      const id = await this[type]({
        prompt: prompt,
        image: image,
        ...rest
      });
      const res = await this.poll(id, type);
      console.log(`✅ done: ${res?.length || 0} images`);
      return {
        success: true,
        result: res
      };
    } catch (e) {
      console.log(`❌ gen: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async t2i({
    prompt,
    num = 1,
    model = "nano-banana",
    fmt = "png",
    ar = "3:4",
    style = "",
    append = "",
    ...rest
  }) {
    try {
      const data = {
        prompt: prompt,
        model: model,
        num_outputs: num,
        output_format: fmt,
        aspect_ratio: ar,
        style: style,
        append: append,
        ...rest
      };
      const res = await this.ax.post("/generate", data, {
        headers: {
          "User-Agent": this.ua
        }
      });
      if (!res.data?.status) throw new Error("API error");
      console.log(`📌 t2i id: ${res.data?.id?.slice(0, 12)}`);
      return res.data?.id;
    } catch (e) {
      throw new Error(`t2i failed: ${e.message}`);
    }
  }
  async i2i({
    prompt = "",
    image,
    num = 1,
    model = "nano-banana",
    fmt = "png",
    ar = "1:1",
    device_id = "1",
    is_paid = "true",
    ...rest
  }) {
    try {
      const imgs = Array.isArray(image) ? image : [image];
      const form = new FormData();
      for (let i = 0; i < imgs.length; i++) {
        const buf = await this.buf(imgs[i]);
        form.append("images[]", buf, {
          filename: `img_${i}.jpg`
        });
      }
      form.append("prompt", prompt);
      form.append("aspect_ratio", ar);
      form.append("device_id", device_id);
      form.append("is_paid", is_paid);
      Object.entries(rest).forEach(([k, v]) => form.append(k, String(v)));
      const res = await this.ax.post("/nano-banana/chat", form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": this.ua
        }
      });
      if (!res.data?.status) throw new Error("API error");
      console.log(`📌 i2i id: ${res.data?.id?.slice(0, 12)}`);
      return res.data?.id;
    } catch (e) {
      throw new Error(`i2i failed: ${e.message}`);
    }
  }
  async buf(src) {
    try {
      if (Buffer.isBuffer(src)) return src;
      if (typeof src !== "string") throw new Error("invalid type");
      if (src.startsWith("data:")) {
        const b64 = src.split(",")[1];
        return Buffer.from(b64, "base64");
      }
      if (src.startsWith("http://") || src.startsWith("https://")) {
        const res = await axios.get(src, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(src).origin
          }
        });
        return Buffer.from(res.data);
      }
      throw new Error("unknown format");
    } catch (e) {
      throw new Error(`buf: ${e.message}`);
    }
  }
  async poll(id, type = "t2i") {
    try {
      const ep = type === "i2i" ? "/get-chat-results" : "/get-results";
      const start = Date.now();
      let cnt = 0;
      while (true) {
        cnt++;
        const res = await this.ax.post(ep, {
          id: id
        }, {
          headers: {
            "User-Agent": this.ua
          },
          timeout: 3e4
        });
        if (res.data?.status && res.data?.data?.length) {
          console.log(`⏳ poll: ${cnt}x, ${Date.now() - start}ms`);
          return res.data.data;
        }
        if (Date.now() - start > this.pm) throw new Error("timeout");
        await new Promise(r => setTimeout(r, this.pd));
      }
    } catch (e) {
      throw new Error(`poll: ${e.message}`);
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