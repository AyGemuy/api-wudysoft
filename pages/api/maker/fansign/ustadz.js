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
  }
  genHtml(params) {
    const questionText = params.text?.trim() || "Ustadz";
    const photoLibrary = {
      normal: "https://8upload.com/image/1fc2ae3661204ddb/Generated_Image_February_04__2026_-_8_00AM.png",
      ketawa: "https://8upload.com/image/bf1af3ddf2d436ea/Generated_Image_February_04__2026_-_11_24AM.png",
      mikir: "https://8upload.com/image/1115d78d226fc1e6/Generated_Image_February_04__2026_-_11_20AM.png",
      mulut: "https://8upload.com/image/2f9fbb9f0db3aea0/Generated_Image_February_04__2026_-_11_09AM.png"
    };
    const photoKey = params.imageUrl || "normal";
    const selectedPhoto = photoLibrary[photoKey] || photoLibrary.normal;
    const imageUrl = selectedPhoto;
    const headerText = params.header?.text || "Soalan";
    const headerBgColor = params.header?.bgColor || "#1a1a1a";
    const headerTextColor = params.header?.textColor || "#ffffff";
    const headerFontSize = params.header?.fontSize || "48px";
    const headerFontFamily = params.header?.fontFamily || "'Montserrat', sans-serif";
    const headerFontWeight = params.header?.weight || "600";
    const headerPadding = params.header?.padding || "48px 60px";
    const contentBgColor = params.content?.bgColor || "#ffffff";
    const contentTextColor = params.content?.textColor || "#333333";
    const contentFontSize = params.content?.fontSize || "44px";
    const contentFontFamily = params.content?.fontFamily || "'Poppins', sans-serif";
    const contentLineHeight = params.content?.lineHeight || "1.3";
    const contentPadding = params.content?.padding || "40px";
    const contentTextAlign = params.content?.textAlign || "center";
    const contentFontWeight = params.content?.fontWeight || "400";
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas dengan Card Soalan</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Poppins',sans-serif;background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        #image-container{position:relative;max-width:1200px;width:100%;line-height:0}
        #imageCanvas{display:block;width:100%;height:auto}
        #card-overlay{
            position:absolute;
            top:120px;
            left:50%;
            transform:translateX(-50%) rotate(0deg);
            width:80%;
            max-width:800px;
            z-index:10;
        }
        #card{
            border-radius:20px;
            overflow:hidden;
        }
        #card-header{padding:30px 50px;text-align:center;background:#1a1a1a}
        #card-title{font-family:'Montserrat',sans-serif;font-weight:600;letter-spacing:1px;color:#fff;font-size:36px}
        #card-content{padding:40px;line-height:1.9;background:#fff;color:#333;font-size:26px;font-weight:500}
        @media(max-width:768px){#card-header{padding:25px 35px}#card-content{padding:30px;font-size:24px}#card-title{font-size:32px}}
        @media(max-width:480px){#card-header{padding:20px 30px}#card-content{padding:25px;font-size:22px}#card-title{font-size:28px}}
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
        const config = {
            header: {
                text: "${headerText}",
                bgColor: "${headerBgColor}",
                textColor: "${headerTextColor}",
                fontSize: "${headerFontSize}",
                fontFamily: "${headerFontFamily}",
                weight: "${headerFontWeight}",
                padding: "${headerPadding}"
            },
            content: {
                bgColor: "${contentBgColor}",
                textColor: "${contentTextColor}",
                fontSize: "${contentFontSize}",
                fontFamily: "${contentFontFamily}",
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
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            document.getElementById('image-container').style.width = canvas.width + 'px';
            document.getElementById('image-container').style.height = canvas.height + 'px';
        };
        
        image.onerror = function() {
            canvas.width = 1200;
            canvas.height = 675;
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, "#1a2a6c");
            gradient.addColorStop(0.5, "#b21f1f");
            gradient.addColorStop(1, "#fdbb2d");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = "bold 44px 'Montserrat', sans-serif";
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const textX = canvas.width / 2;
            const textY = canvas.height * 0.5;
            ctx.fillText("Gambar Tidak Dapat Dimuat", textX, textY - 30);
            ctx.fillText("Tampilkan Card Soalan Saja", textX, textY + 30);
            
            document.getElementById('image-container').style.width = canvas.width + 'px';
            document.getElementById('image-container').style.height = canvas.height + 'px';
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
    imageUrl,
    header,
    content,
    type = "v5",
    ...rest
  }) {
    console.log("[LOG] Memulai proses generate gambar...");
    try {
      const htmlContent = this.genHtml({
        text: text,
        imageUrl: imageUrl,
        header: header,
        content: content,
        ...rest
      });
      const payload = {
        html: htmlContent,
        width: rest?.width || 832,
        height: rest?.height || 1248
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