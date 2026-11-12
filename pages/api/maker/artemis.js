import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class ArtemisGen {
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
    const name = params.name || "SIPUTZX";
    const escapedName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
<meta charset=utf-8>
<title>Artemis Boarding Pass</title>
<style>
body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
canvas{display:block}
</style>
</head>
<body>
<canvas id=c></canvas>
<script>
const cfg={name:"${escapedName}",w:1200,h:498,x:408,y:140,max:500,fs:40,font:'bold 40px Helvetica,Arial,sans-serif',col:'#000'}
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),img=new Image()
function d(){
ctx.clearRect(0,0,canvas.width,canvas.height)
ctx.drawImage(img,0,0,canvas.width,canvas.height)
ctx.fillStyle=cfg.col
ctx.font=cfg.font
ctx.textAlign='left'
ctx.textBaseline='top'
const n=cfg.name.toUpperCase(),m=ctx.measureText(n)
if(m.width>cfg.max*s){
const r=(cfg.max*s)/m.width,f=Math.floor(cfg.fs*r)
ctx.font=\`bold \${f}px Helvetica,Arial,sans-serif\`}
ctx.fillText(n,cfg.x*s,cfg.y*s)}
function r(){
const ww=window.innerWidth,wh=window.innerHeight,sx=ww/cfg.w,sy=wh/cfg.h
s=Math.min(sx,sy)
canvas.width=cfg.w*s
canvas.height=cfg.h*s
canvas.style.width=cfg.w*s+'px'
canvas.style.height=cfg.h*s+'px'
canvas.style.marginLeft=(ww-cfg.w*s)/2+'px'
canvas.style.marginTop=(wh-cfg.h*s)/2+'px'
d()}
let s=1
img.crossOrigin='anonymous'
img.onload=r
img.src='https://www3.nasa.gov/send-your-name-with-artemis/img/boarding-pass.png'
window.addEventListener('resize',r)
</script>
</body>
</html>`;
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
    name,
    type = "v5",
    ...rest
  }) {
    console.log("[LOG] Memulai proses generate boarding pass Artemis...");
    try {
      const htmlContent = this.genHtml({
        name: name,
        ...rest
      });
      const payload = {
        html: htmlContent,
        width: rest?.width || 1200,
        height: rest?.height || 498
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
      throw new Error(`Artemis Generation Error: ${errMsg}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.name) {
    return res.status(400).json({
      error: "Parameter 'name' diperlukan"
    });
  }
  try {
    const api = new ArtemisGen();
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