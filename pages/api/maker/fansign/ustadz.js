import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class UstadzGen {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36"
      },
      timeout: 6e4
    });
    this.fontPresets = {
      1: {
        family: "'Montserrat', sans-serif",
        name: "Montserrat",
        weights: "400;600"
      },
      2: {
        family: "'Poppins', sans-serif",
        name: "Poppins",
        weights: "400;500"
      },
      3: {
        family: "'Roboto', sans-serif",
        name: "Roboto",
        weights: "400;700"
      },
      4: {
        family: "'Oswald', sans-serif",
        name: "Oswald",
        weights: "400;700"
      },
      5: {
        family: "'Merriweather', serif",
        name: "Merriweather",
        weights: "400;700"
      }
    };
  }
  getFontConfig(paramFont, defaultKey) {
    let fontConfig = this.fontPresets[defaultKey];
    if (paramFont && this.fontPresets[paramFont]) {
      fontConfig = this.fontPresets[paramFont];
    } else if (typeof paramFont === "string") {
      const foundKey = Object.keys(this.fontPresets).find(key => this.fontPresets[key].family === paramFont);
      if (foundKey) {
        fontConfig = this.fontPresets[foundKey];
      } else {
        const name = paramFont.replace(/['"]|,.*$/g, "").trim();
        fontConfig = {
          family: paramFont,
          name: name.length > 0 ? name : "Arial",
          weights: "400"
        };
      }
    }
    return fontConfig;
  }
  genHtml(params) {
    const questionText = params.text?.trim() || "Ustadz";
    const photoLibrary = {
      normal: "https://8upload.com/image/1fc2ae3661204ddb/Generated_Image_February_04__2026_-_8_00AM.png",
      ketawa: "https://8upload.com/image/bf1af3ddf2d436ea/Generated_Image_February_04__2026_-_11_24AM.png",
      mikir: "https://8upload.com/image/1115d78d226fc1e6/Generated_Image_February_04__2026_-_11_20AM.png",
      mulut: "https://8upload.com/image/2f9fbb9f0db3aea0/Generated_Image_February_04__2026_-_11_09AM.png"
    };
    const canvasWidth = params.width || 832;
    const canvasHeight = params.height || 1248;
    const photoKey = params.photo || "normal";
    const selectedPhoto = photoLibrary[photoKey] || photoLibrary.normal;
    const imageUrl = selectedPhoto;
    const headerFontConfig = this.getFontConfig(params.header_font || params.header_fontFamily, 1);
    const contentFontConfig = this.getFontConfig(params.content_font || params.content_fontFamily, 2);
    const headerText = params.header_text || "Soalan";
    const headerBgColor = params.header_bgColor || "#1a1a1a";
    const headerTextColor = params.header_textColor || "#ffffff";
    const headerFontSize = params.header_fontSize || "48px";
    const headerFontFamily = headerFontConfig.family;
    const headerFontWeight = params.header_weight || "600";
    const headerPadding = params.header_padding || "48px 60px";
    const contentBgColor = params.content_bgColor || "#ffffff";
    const contentTextColor = params.content_textColor || "#333333";
    const contentFontSize = params.content_fontSize || "44px";
    const contentFontFamily = contentFontConfig.family;
    const contentLineHeight = params.content_lineHeight || "1.3";
    const contentPadding = params.content_padding || "40px";
    const contentTextAlign = params.content_textAlign || "center";
    const contentFontWeight = params.content_fontWeight || "400";
    const uniqueFonts = new Map();
    [headerFontConfig, contentFontConfig].forEach(conf => {
      if (conf.name && !["serif", "sans-serif", "monospace", "cursive", "fantasy", "arial", "georgia", "times new roman"].includes(conf.name.toLowerCase())) {
        const existingWeights = uniqueFonts.get(conf.name) || [];
        const newWeights = conf.weights.split(";").map(w => w.trim()).filter(w => w);
        const combinedWeights = new Set([...existingWeights, ...newWeights]);
        uniqueFonts.set(conf.name, Array.from(combinedWeights));
      }
    });
    let dynamicFontLinks = "";
    if (uniqueFonts.size > 0) {
      const fontUrlParams = Array.from(uniqueFonts.entries()).map(([name, weights]) => {
        let url = `family=${name.replace(/ /g, "+")}`;
        if (weights.length > 0) {
          url += `:wght@${weights.join(";")}`;
        }
        return url;
      }).join("&");
      dynamicFontLinks = `<link href="https://fonts.googleapis.com/css2?${fontUrlParams}&display=swap" rel="stylesheet">`;
    } else {
      dynamicFontLinks = `<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Poppins:wght@400;500&display=swap" rel="stylesheet">`;
    }
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas dengan Card Soalan</title>
    <!-- Font Kustom Dinamis -->
    ${dynamicFontLinks}
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Poppins',sans-serif;background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:0} 
        #image-container{position:relative;width:${canvasWidth}px;height:${canvasHeight}px;line-height:0;overflow:hidden} 
        #imageCanvas{display:block;width:100%;height:100%} 
        #card-overlay{
            position:absolute;
            top:120px;
            left:50%;
            transform:translateX(-50%); 
            width:80%;
            max-width:100%; 
            z-index:10; 
        }
        #card{
            border-radius:20px;
            overflow:hidden;
        }
        #card-header{padding:30px 50px;text-align:center;background:#1a1a1a}
        #card-title{font-family:'Montserrat',sans-serif;font-weight:600;letter-spacing:1px;color:#fff;font-size:36px}
        #card-content{padding:40px;line-height:1.9;background:#fff;color:#333;font-size:26px;font-weight:500}
    </style>
</head>
<body>
    <div id="image-container">
        <canvas id="imageCanvas"></canvas>
        <div id="card-overlay">
            <div id="card">
                <div id="card-header">
                    <h2 id="card-title">Soalan</h2>
                </div>
                <div id="card-content"></div>
            </div>
        </div>
    </div>

    <script>
        const canvasDimensions = { width: ${canvasWidth}, height: ${canvasHeight} }; 
        const config = {
            header: {
                text: "${headerText.replace(/"/g, '\\"')}",
                bgColor: "${headerBgColor}",
                textColor: "${headerTextColor}",
                fontSize: "${headerFontSize}",
                fontFamily: "${headerFontFamily.replace(/"/g, '\\"')}",
                weight: "${headerFontWeight}",
                padding: "${headerPadding}"
            },
            content: {
                bgColor: "${contentBgColor}",
                textColor: "${contentTextColor}",
                fontSize: "${contentFontSize}",
                fontFamily: "${contentFontFamily.replace(/"/g, '\\"')}",
                lineHeight: "${contentLineHeight}",
                padding: "${contentPadding}",
                textAlign: "${contentTextAlign}",
                fontWeight: "${contentFontWeight}"
            },
            questions: [
                "${questionText.replace(/"/g, '\\"')}"
            ]
        };

        const imageUrl = "${imageUrl}";
        const canvas = document.getElementById('imageCanvas');
        const ctx = canvas.getContext('2d');
        const card = document.getElementById('card');
        const cardHeader = document.getElementById('card-header');
        const cardTitle = document.getElementById('card-title');
        const cardContent = document.getElementById('card-content');
        const imageContainer = document.getElementById('image-container');
        
        canvas.width = canvasDimensions.width;
        canvas.height = canvasDimensions.height;
        imageContainer.style.width = canvas.width + 'px';
        imageContainer.style.height = canvas.height + 'px';

        function applyConfig() {
            cardHeader.style.backgroundColor = config.header.bgColor;
            cardHeader.style.padding = config.header.padding;
            cardTitle.textContent = config.header.text;
            cardTitle.style.color = config.header.textColor;
            cardTitle.style.fontSize = config.header.fontSize;
            cardTitle.style.fontFamily = config.header.fontFamily;
            cardTitle.style.fontWeight = config.header.weight;
            
            card.style.backgroundColor = config.content.bgColor;
            cardContent.style.backgroundColor = config.content.bgColor;
            cardContent.style.color = config.content.textColor;
            cardContent.style.fontSize = config.content.fontSize;
            cardContent.style.fontFamily = config.content.fontFamily;
            cardContent.style.textAlign = config.content.textAlign;
            cardContent.style.lineHeight = config.content.lineHeight;
            cardContent.style.padding = config.content.padding;
            cardContent.style.fontWeight = config.content.fontWeight;
            
            config.questions.forEach(item => {
                const p = document.createElement('p');
                p.textContent = item;
                p.style.marginBottom = "20px";
                cardContent.appendChild(p);
            });
        }

        applyConfig();
        
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = imageUrl;
        
        image.onload = function() {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        };
        
        image.onerror = function() {
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, "#1a2a6c");
            gradient.addColorStop(0.5, "#b21f1f");
            gradient.addColorStop(1, "#fdbb2d");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Teks error
            ctx.font = \`bold 44px \${config.header.fontFamily}\`;
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const textX = canvas.width / 2;
            const textY = canvas.height * 0.5;
            ctx.fillText("Gambar Tidak Dapat Dimuat", textX, textY - 30);
            ctx.fillText("Tampilkan Card Soalan Saja", textX, textY + 30);
        };
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
      const finalWidth = rest?.width || 832;
      const finalHeight = rest?.height || 1248;
      const htmlContent = this.genHtml({
        text: text,
        width: finalWidth,
        height: finalHeight,
        ...rest
      });
      const payload = {
        html: htmlContent,
        width: finalWidth,
        height: finalHeight
      };
      console.log("[LOG] Mengirim permintaan ke API generator...");
      const apiRes = await this.client.post(`/api/tools/html2img/${type}`, payload);
      const imageUrlFromApi = apiRes.data?.url;
      if (!imageUrlFromApi) {
        const errorMessage = apiRes.data?.message || "URL gambar tidak ditemukan di respon API.";
        console.error(`[LOG: GAGAL] ${errorMessage}`);
        throw new Error(errorMessage);
      }
      console.log(`[LOG] Sukses mendapatkan URL (${imageUrlFromApi}). Melanjutkan ke proses download...`);
      const imageData = await this.down(imageUrlFromApi);
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
    const api = new UstadzGen();
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