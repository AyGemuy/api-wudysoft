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
    const text = params.text || "Bahlil";
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
    const fontType = params.font_type || 3;
    const fontColor = params.font_color || "#111111";
    const fontWeight = params.font_weight || "bold";
    const fontFamilyMap = {
      1: "Arial, sans-serif",
      2: "Georgia, serif",
      3: "'Cinzel', 'Times New Roman', serif",
      4: "'Playfair Display', serif"
    };
    const fontFamily = fontFamilyMap[fontType] || fontFamilyMap[3];
    const defaultTextArea = {
      top: .55,
      height: .3,
      left: .1,
      width: .7
    };
    const textAreaConfig = params.textArea ? JSON.stringify(params.textArea) : JSON.stringify(defaultTextArea);
    const blendMode = params.blendMode || "multiply";
    const maxFontSize = params.max_font_size || 210;
    const finalText = text.trim() || "SELAMAT DATANG DI PESANTREN AL FAJAR";
    const escapedText = finalText.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bahlil Canvas Generator</title>
    <style>
        body {margin:0;padding:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow:hidden}
        canvas {display:block;max-width:100%;max-height:100vh}
    </style>
</head>
<body>
    <canvas id="bahlilCanvas"></canvas>

    <script>
        // Data ini diambil dari parameter API
        const setting = {
            text: "${escapedText}",
            photo: "${photo}",
            textArea: ${textAreaConfig},
            font: {family:"${fontFamily}",weight:"${fontWeight}",color:"${fontColor}"},
            textSettings: {paddingPercent:0.05,lineHeight:1.15,minFontSize:10,maxFontSize:${maxFontSize}}, 
            blendMode: "${blendMode}"
        };
        
        function splitIntoWords(text) {
            // Memisahkan teks menjadi kata-kata dan spasi-spasi. Spasi yang berlebih akan dipertahankan.
            return text.split(/(\\s+)/).filter(word => word.length > 0); 
        }
        
        function wrapText(ctx, text, maxWidth, fontSize) {
            const words = splitIntoWords(text);
            const lines = [];
            let currentLine = '';
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine ? currentLine + word : word; 
                ctx.font = \`\${setting.font.weight} \${fontSize}px \${setting.font.family}\`;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine.trim() !== '') {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            
            if (currentLine) lines.push(currentLine);
            return lines;
        }
        
        function calculateOptimalFontSize(ctx, text, maxWidth, maxHeight) {
            let low = setting.textSettings.minFontSize;
            let high = setting.textSettings.maxFontSize;
            let optimalSize = low;
            
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const lines = wrapText(ctx, text, maxWidth, mid);
                const lineHeightPx = mid * setting.textSettings.lineHeight;
                const totalHeight = lines.length * lineHeightPx;
                
                if (totalHeight <= maxHeight && mid <= high) {
                    optimalSize = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            
            return optimalSize;
        }
        
        async function createBahlilImage() {
            const canvas = document.getElementById('bahlilCanvas');
            const ctx = canvas.getContext('2d');
            const bgImage = new Image();
            bgImage.crossOrigin = "anonymous";
            
            await new Promise((resolve, reject) => {
                bgImage.onload = resolve;
                bgImage.onerror = reject;
                bgImage.src = setting.photo;
            });
            
            canvas.width = bgImage.width;
            canvas.height = bgImage.height;
            ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height);
            
            let safeText = (setting.text || '').trim(); 
            if (!safeText) safeText = '...';
            
            const textArea = setting.textArea;
            const textAreaX = bgImage.width * textArea.left;
            const textAreaY = bgImage.height * textArea.top;
            const textAreaWidth = bgImage.width * textArea.width;
            const textAreaHeight = bgImage.height * textArea.height;
            const padding = Math.round(textAreaWidth * setting.textSettings.paddingPercent);
            const textContentWidth = textAreaWidth - (padding * 2);
            const textContentHeight = textAreaHeight - (padding * 2);
            
            const optimalFontSize = calculateOptimalFontSize(ctx, safeText, textContentWidth, textContentHeight);
            const lines = wrapText(ctx, safeText, textContentWidth, optimalFontSize);
            const lineHeightPx = optimalFontSize * setting.textSettings.lineHeight;
            const totalTextHeight = lines.length * lineHeightPx;
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalCompositeOperation = setting.blendMode;
            ctx.fillStyle = setting.font.color;
            ctx.font = \`\${setting.font.weight} \${optimalFontSize}px \${setting.font.family}\`;
            
            let startX = textAreaX + textAreaWidth / 2;
            let startY = textAreaY + padding + (lineHeightPx / 2);
            
            if (totalTextHeight < textContentHeight) {
                startY = textAreaY + (textAreaHeight - totalTextHeight) / 2 + (lineHeightPx / 2);
            }
            
            for (const line of lines) {
                ctx.fillText(line, startX, startY);
                startY += lineHeightPx;
            }
            
            ctx.globalCompositeOperation = 'source-over';
        }
        
        window.onload = createBahlilImage;
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
    ...rest
  }) {
    console.log("[LOG] Memulai proses generate gambar...");
    try {
      const htmlContent = this.genHtml({
        text: text,
        ...rest
      });
      const payload = {
        html: htmlContent,
        width: rest?.width || 896,
        height: rest?.height || 1152
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