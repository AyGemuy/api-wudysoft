import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class BahlilGen {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36"
      },
      timeout: 6e4
    });
  }
  genHtml(params) {
    const text = params.text?.trim() || "Bahlil";
    const photoLibrary = {
      normal: "https://8upload.com/image/fea07694059184d8/IMG-20260203-WA0084.jpg",
      sad: "https://8upload.com/image/22a2bee870758cca/Generated_Image_February_03__2026_-_11_44PM.png",
      beach: "https://8upload.com/image/42449058da9d827b/Generated_Image_February_03__2026_-_11_45PM.png",
      minyak: "https://8upload.com/image/d86aabfb6e3481d8/Generated_Image_February_03__2026_-_11_46PM.png",
      sawit: "https://8upload.com/image/b5f19608b846a8cd/Generated_Image_February_03__2026_-_11_47PM.png",
      old: "https://8upload.com/image/666308d3524090ee/Generated_Image_February_03__2026_-_11_48PM.png"
    };
    const photoKey = params.photo || "normal";
    const selectedPhoto = photoLibrary[photoKey] || photoLibrary.normal;
    const photo = selectedPhoto;
    const fontType = params.font?.type || 3;
    const fontSize = params.font?.size || 3;
    const fontColor = params.font?.color || "#111111";
    const fontWeight = params.font?.weight || "bold";
    const shadowLevel = params.shadow?.level || 2;
    const finalText = text.length > 150 ? `${text.substring(0, 147)}...` : text;
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <canvas id="canvas"></canvas>

    <script>
        const config = {
            text: "${finalText.replace(/"/g, '\\"')}",
            paper: { x: 256, y: 1550, width: 1944, height: 1619 },
            font: { size: ${fontSize}, type: ${fontType}, color: "${fontColor}", weight: "${fontWeight}" },
            shadow: { level: ${shadowLevel}, color: "rgba(0,0,0,0.5)" },
            textSettings: { maxChars: 100, lineHeight: 1.15 },
            photo: "${photo}"
        };

        const fonts = {
            1: "Arial, sans-serif",
            2: "Georgia, serif",
            3: "'Cinzel', 'Times New Roman', serif",
            4: "'Playfair Display', serif"
        };

        const sizes = {
            1: { auto: 0.22, min: 24, max: 140 },
            2: { auto: 0.25, min: 28, max: 160 },
            3: { auto: 0.28, min: 32, max: 180 },
            4: { auto: 0.32, min: 36, max: 200 }
        };

        const shadows = {
            1: { blur: 3, offsetX: 1, offsetY: 1, opacity: 0.3 },
            2: { blur: 5, offsetX: 2, offsetY: 2, opacity: 0.5 },
            3: { blur: 8, offsetX: 3, offsetY: 3, opacity: 0.7 },
            4: { blur: 12, offsetX: 4, offsetY: 4, opacity: 0.9 }
        };

        function clamp(v, min, max) {
            return Math.min(Math.max(v, min), max);
        }

        function wrap(ctx, text, width) {
            const words = text.split(' ');
            const lines = [];
            let line = '';
            for (const word of words) {
                const test = line ? \`\${line} \${word}\` : word;
                const met = ctx.measureText(test);
                if (met.width > width && line) {
                    lines.push(line);
                    line = word;
                } else {
                    line = test;
                }
            }
            if (line) lines.push(line);
            return lines;
        }

        async function draw() {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise((r, e) => {
                img.onload = r;
                img.onerror = e;
                img.src = config.photo;
            });
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const maxChars = clamp(parseInt(config.textSettings.maxChars) || 100, 10, 200);
            let text = (config.text || '').trim().replace(/\\s+/g, ' ');
            if (!text) text = '...';
            if (text.length > maxChars) {
                text = \`\${text.slice(0, maxChars - 3).trim()}...\`;
            }
            
            const paper = config.paper;
            const pad = Math.round(paper.width * 0.07);
            const maxW = paper.width - pad * 2;
            const maxH = paper.height - pad * 2;
            
            const fontName = fonts[config.font.type] || fonts[3];
            const sizeConf = sizes[config.font.size] || sizes[3];
            const shadowConf = shadows[config.shadow.level] || shadows[2];
            
            let fontSize = Math.round(Math.min(paper.height * sizeConf.auto, sizeConf.max));
            const minSize = sizeConf.min;
            let lines = [];
            
            while (fontSize >= minSize) {
                ctx.font = \`\${config.font.weight} \${fontSize}px \${fontName}\`;
                lines = wrap(ctx, text, maxW);
                const lineH = Math.round(fontSize * config.textSettings.lineHeight);
                const totalH = lines.length * lineH;
                const longest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
                if (totalH <= maxH && longest <= maxW) break;
                fontSize -= 6;
            }
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = \`rgba(0,0,0,\${shadowConf.opacity})\`;
            ctx.shadowBlur = shadowConf.blur;
            ctx.shadowOffsetX = shadowConf.offsetX;
            ctx.shadowOffsetY = shadowConf.offsetY;
            
            const lineH = Math.round(fontSize * config.textSettings.lineHeight);
            const totalH = lines.length * lineH;
            const startX = paper.x + paper.width / 2;
            let startY = paper.y + (paper.height - totalH) / 2 + lineH / 2;
            
            ctx.fillStyle = config.font.color;
            for (const line of lines) {
                ctx.fillText(line, startX, startY);
                startY += lineH;
            }
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
        }

        window.onload = draw;
    </script>
    
    <style>
        body { margin:0; padding:0; background:#111; display:flex; justify-content:center; align-items:center; min-height:100vh; }
        canvas { display:block; max-width:95vw; max-height:95vh; }
    </style>
</body>
</html>
`;
    return htmlTemplate;
  }
  async down(url) {
    console.log(`[LOG] Mulai download data gambar dari URL: ${url}`);
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 6e4
      });
      const buffer = Buffer.from(res.data);
      const contentType = res.headers["content-type"] || "image/png";
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (error) {
      console.error(`[LOG: GAGAL] Gagal mendownload data dari URL. Error: ${error.message}`);
      throw new Error(`Download Failed: ${error.message}`);
    }
  }
  async generate({
    text,
    font,
    photo,
    type = "v5",
    ...rest
  }) {
    console.log("[LOG] Memulai proses generate gambar...");
    try {
      const htmlContent = this.genHtml({
        text: text,
        font: font,
        photo: photo,
        ...rest
      });
      const payload = {
        html: htmlContent,
        width: rest?.width || 1944,
        height: rest?.height || 1619
      };
      console.log("[LOG] Mengirim permintaan ke API generator...");
      const apiRes = await this.client.post(`/api/tools/html2img/${type}`, payload);
      const imageUrl = apiRes.data?.url;
      if (!imageUrl) {
        const errorMessage = apiRes.data?.message || "URL gambar tidak ditemukan di respon API.";
        console.error(`[LOG: GAGAL] ${errorMessage}`);
        throw new Error(errorMessage);
      }
      console.log(`[LOG] Sukses mendapatkan URL (${imageUrl}). Melanjutkan ke proses download...`);
      const imageData = await this.down(imageUrl);
      console.log("[LOG] Proses generate dan download selesai.");
      return imageData;
    } catch (error) {
      const errMsg = error.message.includes("Download Failed") ? error.message : error.response?.data?.message || error.message || "Terjadi kesalahan tidak terduga.";
      console.error(`[LOG: ERROR UTAMA] Gagal dalam proses generate. Pesan: ${errMsg}`);
      throw new Error(`Image Generation Error: ${errMsg}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  try {
    const api = new BahlilGen();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}