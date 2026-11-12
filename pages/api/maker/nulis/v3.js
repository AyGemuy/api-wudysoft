import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const THEMES = {
  line: {
    imgUrl: "https://marketplace.canva.com/EAFrsbqpvhQ/1/0/900w/canva-coklat-krem-abstrak-kuno-kertas-kosong-cerita-instagram-ToeMsTaAPjA.jpg",
    coords: "210,395,800,1350",
    lineSpacing: 70,
    fontSize: 59,
    width: 900,
    height: 1600
  },
  blank: {
    imgUrl: "https://marketplace.canva.com/EAGQ-8oHpkY/1/0/1131w/canva-coklat-sobekan-kertas-batas-catatan-kosong-dokumen-a4-Q8mLs-JJQBI.jpg",
    coords: "240,255,939,1439",
    lineSpacing: 70,
    fontSize: 55,
    width: 1131,
    height: 1600
  }
};
class HtmlTextWriterGen {
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
    const text = params.text;
    const imgUrl = params.imgUrl;
    const coords = params.coords;
    const lineSpacing = params.lineSpacing || 59;
    const letterSpacing = params.letterSpacing || 2;
    const fontSize = params.fontSize || 39;
    const fontStyle = params.fontStyle || "Dancing Script";
    const fontColor = params.fontColor || "#8B4513";
    const maxLines = params.maxLines || 16;
    const canvasWidth = params.width;
    const canvasHeight = params.height;
    const verticalOffset = params.verticalOffset || 20;
    const escapedText = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas Auto-Text Writer</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        body {margin:0;padding:0;background:#f0f0f0;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow:hidden}
        canvas {display:block;box-shadow: 0 4px 8px rgba(0,0,0,0.1);}
    </style>
</head>
<body>

    <canvas id="textWriterCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>

    <script>
        // Data diambil dari parameter API
        const cfg = {
            teks: "${escapedText}",
            lineSpacing: ${lineSpacing},
            letterSpacing: ${letterSpacing},
            fontSize: ${fontSize},
            fontStyle: '${fontStyle}',
            fontColor: '${fontColor}',
            verticalOffset: ${verticalOffset}
        };

        const imgUrl = '${imgUrl}';
        const coords = "${coords}"; 
        const [x1, y1, x2, y2] = coords.split(',').map(Number);
        
        const areaWidth = x2 - x1;
        const MAX_LINES = ${maxLines}; 
        
        const canvas = document.getElementById('textWriterCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous'; 
        img.src = imgUrl;

        function measureTextWithLetterSpacing(text, letterSpacing) {
            const textWidth = ctx.measureText(text).width;
            const additionalWidth = letterSpacing * (text.length - 1);
            return textWidth + additionalWidth;
        }

        function wrapText(context, text, maxWidth) {
            const words = text.replace(/\\n/g, ' ').split(' ');
            let line = '';
            const lines = [];

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                if (word.length === 0) continue; 
                
                const testLine = line ? line + ' ' + word : word; 
                const testWidth = measureTextWithLetterSpacing(testLine, cfg.letterSpacing);

                if (testWidth > maxWidth && line.length > 0) {
                    lines.push(line.trim()); 
                    line = word;   
                } else {
                    line = testLine; 
                }
            }
            lines.push(line.trim()); 
            return lines.filter(l => l.length > 0);
        }

        function fillTextWithSpacing(text, x, y, letterSpacing) {
            let currentX = x;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                ctx.fillText(char, currentX, y);
                currentX += ctx.measureText(char).width + letterSpacing;
            }
        }

        function drawImageAndText() {
            if (!img.complete || img.naturalWidth === 0) {
                img.onload = drawImageAndText;
                return;
            }
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = cfg.fontColor;
            ctx.font = \`\${cfg.fontSize}px '\${cfg.fontStyle}', cursive\`;

            const wrappedLines = wrapText(ctx, cfg.teks, areaWidth);

            for (let i = 0; i < wrappedLines.length; i++) {
                if (i >= MAX_LINES) {
                    break; 
                }

                const line = wrappedLines[i];
                const yPos = y1 + (i * cfg.lineSpacing) + cfg.verticalOffset;
                
                fillTextWithSpacing(line, x1, yPos, cfg.letterSpacing);
            }
        }

        img.onload = drawImageAndText;
        if (img.complete) {
            drawImageAndText();
        }
    </script>
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
    type = "v5",
    theme,
    ...rest
  }) {
    console.log("[LOG] Memulai proses generate gambar TextWriter...");
    try {
      const selectedTheme = THEMES[theme] || THEMES.line;
      const mergedParams = {
        ...selectedTheme,
        text: text,
        ...rest
      };
      const htmlContent = this.genHtml(mergedParams);
      const payload = {
        html: htmlContent,
        width: rest?.width || selectedTheme.width,
        height: rest?.height || selectedTheme.height
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
    const api = new HtmlTextWriterGen();
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