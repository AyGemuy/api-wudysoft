import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class ClothOff {
  constructor() {
    try {
      const anonId = crypto.randomBytes(16).toString("hex");
      const traceId = crypto.randomBytes(16).toString("hex");
      const parentId = crypto.randomBytes(8).toString("hex");
      const traceparent = `00-${traceId}-${parentId}-00`;
      const suffix = Array.from({
        length: 4
      }, () => crypto.randomBytes(2).toString("hex")).join(":");
      const randomIp = `2404:c0:4230::${suffix}`;
      this.cookies = `NEXT_LOCALE=en; anonymous_id=${anonId}; NEXT_THEME=dark; rulesAccepted=1; app=1`;
      this.baseHeaders = {
        accept: "application/graphql-response+json,application/json;q=0.9",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        traceparent: traceparent,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-auth-ip": randomIp,
        "x-auth-token": "",
        "x-country": "ID",
        "x-forwarded-for": randomIp,
        "x-forwarded-host": "app.clothoff.info",
        "x-ga-ab": "0",
        "x-ga-abc": "0",
        "x-segment-ab": "0",
        "x-user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      this.client = axios.create({
        headers: this.baseHeaders
      });
      console.log(`[Inisialisasi] IP Otomatis: ${randomIp}`);
      console.log(`[Inisialisasi] Anonymous ID Baru: ${anonId}`);
      console.log(`[Inisialisasi] Traceparent: ${traceparent}`);
    } catch (err) {
      console.log(`[Error Inisialisasi] ${err.message}`);
    }
  }
  async b64(img) {
    try {
      if (Buffer.isBuffer(img)) {
        return {
          buffer: img,
          mime: "image/jpeg",
          filename: "input.jpg"
        };
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[Proses] Mengunduh gambar dari: ${img}`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          const filename = img.split("/").pop()?.split("?")[0] || "input.jpg";
          return {
            buffer: Buffer.from(res.data),
            mime: mime,
            filename: filename
          };
        }
        if (img.startsWith("data:image")) {
          const matches = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            return {
              buffer: Buffer.from(matches[2], "base64"),
              mime: matches[1],
              filename: "input.jpg"
            };
          }
        }
        return {
          buffer: Buffer.from(img, "base64"),
          mime: "image/jpeg",
          filename: "input.jpg"
        };
      }
      throw new Error("Format gambar tidak valid atau tidak didukung");
    } catch (err) {
      console.log(`[Error] Gagal mengolah input gambar: ${err.message}`);
      throw err;
    }
  }
  async form(fileBuffer, filename, mimeType, options = {}) {
    try {
      const formInstance = new FormData();
      const operations = {
        operationName: "signUndress",
        variables: {
          inputs: [{
            file: null,
            aiRequestsIds: ["3Kd9ff1Eeu1WQst", "RcoIeP4wktisNgv", "0S9xD0tG9E6Gt8g", "Ljv3dFFZHO2IQvZ", "ahXGSqneVEUau16", "default", "default", "default", "default"],
            gender: options?.gender || "Famale",
            mask: null,
            prompt: "",
            undressType: "Image"
          }],
          lastUndressingIds: []
        },
        query: `mutation signUndress($inputs: [InputUndress!]!, $lastUndressingIds: [String!]) {
          signUndress(inputs: $inputs, lastUndressingIds: $lastUndressingIds) {
            ...TUndress
            __typename
          }
        }
        fragment TUndress on Undress {
          createdAt
          aiRequestIds
          batchId
          error
          video
          image
          inputImage
          id
          isBlur
          isFree
          isGuest
          isPaid
          isViewed
          resultInfo {
            __typename
            ... on AiRequestsResultInfo {
              prompt
              __typename
            }
          }
          pornGenerationInput {
            ai
            __typename
          }
          position
          prompt
          rating
          status
          successAt
          undressType
          __typename
        }`
      };
      const map = {
        1: ["variables.inputs.0.file"]
      };
      formInstance.append("operations", JSON.stringify(operations));
      formInstance.append("map", JSON.stringify(map));
      formInstance.append("1", fileBuffer, {
        filename: filename,
        contentType: mimeType
      });
      return formInstance;
    } catch (err) {
      console.log(`[Error] Gagal menyusun struktur form-data: ${err.message}`);
      throw err;
    }
  }
  async sign(fileBuffer, filename, mimeType, options = {}) {
    try {
      console.log("[Proses] Menyusun payload FormData...");
      const formData = await this.form(fileBuffer, filename, mimeType, options);
      console.log("[Proses] Mengunggah gambar ke GraphQL ClothOff...");
      const res = await this.client.post(`${proxy}https://app.clothoff.info/graphql`, formData, {
        headers: {
          ...this.baseHeaders,
          ...formData.getHeaders(),
          cookie: this.cookies,
          "apollo-require-preflight": "true"
        }
      });
      const detail = res.data?.data?.signUndress?.[0] || null;
      if (!detail) {
        throw new Error("Sesi pembuatan undressing gagal atau server mengembalikan respon kosong.");
      }
      console.log(`[Proses] Batch ID Terdaftar: ${detail.batchId} | Task ID: ${detail.id}`);
      return detail;
    } catch (err) {
      console.log(`[Error Upload] Gagal memproses data unggahan: ${err.message}`);
      throw err;
    }
  }
  async check(batchId) {
    try {
      const query = `query GetUndressings($batchId: String!) {
        getUndressings(batchId: $batchId) {
          ...TUndress
          __typename
        }
      }
      fragment TUndress on Undress {
        batchId
        error
        video
        image
        id
        position
        status
        __typename
      }`;
      const payload = {
        operationName: "GetUndressings",
        variables: {
          batchId: batchId
        },
        query: query
      };
      const res = await this.client.post(`${proxy}https://app.clothoff.info/graphql`, payload, {
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json",
          cookie: this.cookies,
          referer: `https://app.clothoff.info/gen/${batchId}`
        }
      });
      return res.data?.data?.getUndressings?.[0] || null;
    } catch (err) {
      console.log(`[Error Check] Pemeriksaan status gagal: ${err.message}`);
      throw err;
    }
  }
  async get(url) {
    try {
      console.log(`[Proses] Mengunduh hasil gambar final dari media server...`);
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return Buffer.from(res.data);
    } catch (err) {
      console.log(`[Error Download] Gagal mengambil gambar akhir: ${err.message}`);
      throw err;
    }
  }
  async generate({
    image,
    ...rest
  }) {
    try {
      const parsed = await this.b64(image);
      const undress = await this.sign(parsed.buffer, parsed.filename, parsed.mime, rest);
      const batchId = undress.batchId;
      console.log("[Proses] Memulai pemantauan antrean...");
      const limit = 30;
      const delay = 3e3;
      let finalUrl = null;
      for (let i = 1; i <= limit; i++) {
        try {
          const statusObj = await this.check(batchId);
          const currentStatus = statusObj?.status || "Unknown";
          const position = statusObj?.position ?? "N/A";
          console.log(`[Proses] Polling (${i}/${limit}) | Status: ${currentStatus} | Posisi Antrean: ${position}`);
          if (currentStatus === "Success") {
            finalUrl = statusObj?.image || null;
            break;
          }
          if (currentStatus === "Failed" || statusObj?.error) {
            throw new Error(`Sistem melaporkan kegagalan pengolahan gambar: ${statusObj?.error || "Unknown"}`);
          }
        } catch (pollErr) {
          console.log(`[Warning] Kesalahan polling pada percobaan ke-${i}: ${pollErr.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      if (!finalUrl) {
        throw new Error("Proses generasi terhenti karena batas waktu polling habis.");
      }
      const outBuffer = await this.get(finalUrl);
      return {
        status: true,
        buffer: outBuffer,
        contentType: "image/jpeg"
      };
    } catch (err) {
      console.log(`[Error] Gagal melakukan generasi gambar: ${err.message}`);
      return {
        status: false,
        buffer: null,
        contentType: null
      };
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
  const api = new ClothOff();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data.contentType || "image/png");
    return res.status(200).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}