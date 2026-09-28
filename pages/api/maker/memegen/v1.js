import axios from "axios";

class MemeGenerator {
  constructor() {
    this.api = "https://api.memegen.link";
    this.chars = {
      " ": "_",
      _: "__",
      "-": "--",
      "\n": "~n",
      "?": "~q",
      "&": "~a",
      "%": "~p",
      "#": "~h",
      "/": "~s",
      "\\": "~b",
      "<": "~l",
      ">": "~g",
      '"': "''"
    };
  }

  encodeText(text) {
    if (!text || !text.trim()) return "_";
    return text
      .trim()
      .split("")
      .map(c => this.chars[c] || c)
      .join("");
  }

  async getFonts() {
    try {
      const { data } = await axios.get(`${this.api}/fonts`, { timeout: 15000 });
      return data.map(v => v.id);
    } catch {
      return ["impact", "arial", "helvetica", "comic-sans"];
    }
  }

  async getTemplates() {
    try {
      const { data } = await axios.get(`${this.api}/templates`, { timeout: 15000 });
      return data.map(t => t.id);
    } catch {
      return ["buzz", "doge", "drake", "fine", "kermit"];
    }
  }

  createDirectCustomUrl(bgUrl, top, bottom, font = null) {
    const encodedTop = this.encodeText(top);
    const encodedBottom = this.encodeText(bottom);
    let finalUrl = `${this.api}/images/custom/${encodedTop}/${encodedBottom}.png?background=${encodeURIComponent(bgUrl)}`;
    if (font) finalUrl += `&font=${encodeURIComponent(font)}`;
    return { url: finalUrl };
  }

  createTemplateUrl(templateId, top, bottom) {
    const encodedTop = this.encodeText(top);
    const encodedBottom = this.encodeText(bottom);
    return {
      url: `${this.api}/images/${templateId}/${encodedTop}/${encodedBottom}.png`
    };
  }

  async fetchBuffer(imageUrl) {
    const { data } = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 30000
    });
    return Buffer.from(data);
  }
}

export default async function handler(req, res) {
  const memeGen = new MemeGenerator();
  const params = req.method === "GET" ? req.query : req.body;

  const action = params.action || "generate";
  const link = params.link || params.url || params.image;
  const top = params.top || "_";
  const bottom = params.bottom || "_";
  const font = params.font || null;
  const template = params.template || null;
  const output = params.output || "buffer";

  try {
    switch (action) {
      case "fonts":
        return res.status(200).json(await memeGen.getFonts());

      case "templates":
        return res.status(200).json(await memeGen.getTemplates());

      case "generate":
        let memeUrlObj = null;

        // 1. Generate via Template Bawaan
        if (template) {
          memeUrlObj = memeGen.createTemplateUrl(template, top, bottom);
        }
        // 2. Generate via Custom Link Gambar
        else if (link) {
          if (!/^https?:\/\/.+/i.test(link)) {
            return res.status(400).json({ status: false, error: "URL gambar tidak valid." });
          }
          memeUrlObj = memeGen.createDirectCustomUrl(link, top, bottom, font);
        } else {
          return res.status(400).json({
            status: false,
            error: "Parameter 'link' atau 'template' diperlukan."
          });
        }

        if (output === "url") {
          return res.status(200).json({ status: true, url: memeUrlObj.url });
        }

        // Ambil hasil gambar dalam bentuk Buffer
        const imageBuffer = await memeGen.fetchBuffer(memeUrlObj.url);

        if (output === "base64") {
          return res.status(200).json({
            status: true,
            base64: `data:image/png;base64,${imageBuffer.toString("base64")}`
          });
        }

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.status(200).send(imageBuffer);

      default:
        return res.status(400).json({
          status: false,
          error: "Aksi tidak valid. Gunakan 'fonts', 'templates', atau 'generate'."
        });
    }
  } catch (error) {
    console.error("[MEMEGEN API ERROR]:", error?.message || error);
    return res.status(500).json({
      status: false,
      error: error?.message || "Terjadi kesalahan saat memproses gambar meme."
    });
  }
}