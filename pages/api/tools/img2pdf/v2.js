import PDFDocument from "pdfkit";
import axios from "axios";
import {
  imageSize
} from "image-size";
async function processImageInput(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const response = await axios.get(trimmed, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    }
    if (trimmed.startsWith("data:")) {
      const base64Data = trimmed.split(";base64,").pop();
      return Buffer.from(base64Data, "base64");
    }
    try {
      const buffer = Buffer.from(trimmed, "base64");
      if (buffer.length > 0) {
        return buffer;
      }
    } catch (e) {}
  }
  throw new Error("Format gambar tidak valid. Gunakan URL, Data URI, Base64, atau Buffer.");
}
async function createPDFBuffer(inputs) {
  return new Promise(async (resolve, reject) => {
    try {
      let pdfDoc = null;
      const buffers = [];
      for (let i = 0; i < inputs.length; i++) {
        try {
          const imageBuffer = await processImageInput(inputs[i]);
          const dimensions = imageSize(imageBuffer);
          if (!dimensions || !dimensions.width || !dimensions.height) {
            throw new Error("Gagal mendeteksi dimensi gambar.");
          }
          const {
            width,
            height
          } = dimensions;
          if (i === 0) {
            pdfDoc = new PDFDocument({
              autoFirstPage: false,
              margin: 0
            });
            pdfDoc.on("data", buffer => buffers.push(buffer));
            pdfDoc.on("end", () => resolve(Buffer.concat(buffers)));
          }
          pdfDoc.addPage({
            size: [width, height],
            margin: 0
          });
          pdfDoc.image(imageBuffer, 0, 0, {
            width: width,
            height: height
          });
        } catch (error) {
          console.error(`Gagal memproses gambar pada indeks ${i}:`, error.message);
        }
      }
      if (pdfDoc) {
        pdfDoc.end();
      } else {
        reject(new Error("Tidak ada gambar valid yang berhasil diproses."));
      }
    } catch (error) {
      reject(error);
    }
  });
}
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const params = req.method === "GET" ? req.query : req.body;
  const rawImages = params?.images || params;
  if (!rawImages) {
    return res.status(400).json({
      error: "No image inputs provided"
    });
  }
  let inputs = [];
  if (Array.isArray(rawImages)) {
    inputs = rawImages;
  } else if (typeof rawImages === "string") {
    if (rawImages.includes(",") && !rawImages.startsWith("data:")) {
      inputs = rawImages.split(",").map(item => item.trim());
    } else {
      inputs = [rawImages];
    }
  } else {
    inputs = [rawImages];
  }
  try {
    const pdfBuffer = await createPDFBuffer(inputs);
    res.setHeader("Content-Type", "application/pdf");
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}