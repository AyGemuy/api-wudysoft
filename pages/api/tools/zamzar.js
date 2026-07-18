import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
class ZamzarConverter {
  constructor() {
    this.jar = new CookieJar();
    this.types = null;
    this.headers = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async sC(res, url = "https://www.zamzar.com") {
    try {
      const cookies = res?.headers?.["set-cookie"] || [];
      const arr = Array.isArray(cookies) ? cookies : [cookies];
      for (const c of arr) {
        if (c) {
          await this.jar.setCookie(c, url);
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  async gC(url = "https://www.zamzar.com") {
    try {
      return await this.jar.getCookieString(url) || "";
    } catch (e) {
      return "";
    }
  }
  async gH() {
    try {
      console.log("[Zamzar] Mengunjungi beranda...");
      const url = "https://www.zamzar.com/converters/image/";
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1"
        }
      });
      await this.sC(res);
      return {
        status: true
      };
    } catch (err) {
      console.error("[Zamzar] Gagal menginisialisasi beranda:", err?.message);
      return {
        status: false,
        result: err?.message || "Gagal menginisialisasi beranda"
      };
    }
  }
  async pM(media) {
    try {
      if (Buffer.isBuffer(media)) {
        console.log("[Zamzar] Input media adalah Buffer.");
        return {
          status: true,
          buffer: media,
          name: "file.bin"
        };
      }
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          console.log("[Zamzar] Mengunduh media dari URL...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          }).catch(e => ({
            error: e?.message
          }));
          if (res?.error) {
            return {
              status: false,
              result: `Gagal mengunduh URL: ${res.error}`
            };
          }
          const disposition = res?.headers?.["content-disposition"] || "";
          const match = disposition.match(/filename="?([^"]+)"?/);
          const name = match ? match[1] : media.split("/").pop()?.split("?")[0] || "file.bin";
          return {
            status: true,
            buffer: Buffer.from(res.data),
            name: name
          };
        }
        if (media.startsWith("data:")) {
          console.log("[Zamzar] Memproses base64 data URI...");
          const split = media.split(",");
          const mime = split[0]?.match(/:(.*?);/)?.[1] || "";
          const ext = mime.split("/")[1] || "bin";
          const buffer = Buffer.from(split[1] || "", "base64");
          return {
            status: true,
            buffer: buffer,
            name: `file.${ext}`
          };
        }
        if (/^[a-zA-Z0-9+/=]+$/.test(media)) {
          console.log("[Zamzar] Memproses base64 string...");
          const buffer = Buffer.from(media, "base64");
          return {
            status: true,
            buffer: buffer,
            name: "file.bin"
          };
        }
      }
      return {
        status: false,
        result: "Format media tidak didukung."
      };
    } catch (err) {
      console.error("[Zamzar] Gagal memproses media:", err?.message);
      return {
        status: false,
        result: err?.message || "Gagal memproses media"
      };
    }
  }
  async gT() {
    try {
      console.log("[Zamzar] Mengambil daftar tipe konversi...");
      const url = "https://www.zamzar.com/conversionTypes.php";
      const cookieHeader = await this.gC();
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          referer: "https://www.zamzar.com/converters/image/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "upgrade-insecure-requests": "1",
          Cookie: cookieHeader
        }
      });
      await this.sC(res);
      const $ = cheerio.load(res?.data || "");
      const map = {};
      $("table tbody tr").map((_, tr) => {
        const fromText = $(tr).find("td").eq(0).text().trim().toLowerCase();
        if (!fromText) return null;
        const fromExt = fromText.split("-")[0]?.trim().split(" ")[0] || fromText;
        const targets = $(tr).find("td").eq(1).find("div").map((__, div) => {
          const toText = $(div).text().trim().toLowerCase();
          return toText.split("-")[0]?.trim().split(" ")[0] || toText;
        }).get();
        if (fromExt) {
          map[fromExt] = targets;
        }
        return null;
      }).get();
      this.types = map;
      const sources = Object.keys(map);
      console.log(`[Zamzar] Berhasil memuat ${sources.length} format sumber (source list): ${sources.join(", ")}`);
      return {
        status: true,
        result: map
      };
    } catch (err) {
      console.error("[Zamzar] Gagal memuat tipe konversi:", err?.message);
      return {
        status: false,
        result: err?.message || "Gagal memuat tipe konversi"
      };
    }
  }
  async gS() {
    try {
      const url = "https://www.zamzar.com/uploader/convert.php?url=/Convert/GenerateSession&email=";
      console.log("[Zamzar] Menginisialisasi sesi konversi...");
      const cookieHeader = await this.gC();
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          accept: "*/*",
          referer: "https://www.zamzar.com/converters/image/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          Cookie: cookieHeader
        }
      });
      await this.sC(res);
      const session = res?.data?.result || {};
      return {
        status: true,
        result: session
      };
    } catch (err) {
      console.error("[Zamzar] Gagal membuat sesi:", err?.message);
      return {
        status: false,
        result: err?.message || "Gagal membuat sesi"
      };
    }
  }
  async uF(tcs, sessionId, fileBuf, fileName, source, target) {
    try {
      const url = `https://www.zamzar.com/uploader/convert.php?url=/Convert/Upload&tcs=${tcs}`;
      console.log("[Zamzar] Mengunggah berkas...");
      const fd = new FormData();
      fd.append("name", fileName);
      fd.append("convert-to", target);
      fd.append("original-name", fileName);
      fd.append("source", "local");
      fd.append("started", Date.now().toString());
      fd.append("location", "/converters/image/");
      fd.append("sessionId", sessionId);
      fd.append("file", fileBuf, {
        filename: fileName
      });
      const cookieHeader = await this.gC();
      const formHeaders = fd.getHeaders();
      const res = await axios.post(url, fd, {
        headers: {
          ...this.headers,
          ...formHeaders,
          accept: "*/*",
          origin: "https://www.zamzar.com",
          referer: "https://www.zamzar.com/converters/image/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          Cookie: cookieHeader
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      await this.sC(res);
      console.log("[Zamzar] Pengunggahan selesai:", res?.status);
      return {
        status: true,
        result: res?.data || {}
      };
    } catch (err) {
      const errorData = err?.response?.data;
      console.error("[Zamzar] Gagal mengunggah file:", err?.message);
      if (errorData) {
        console.error("[Zamzar] Detail error server:", typeof errorData === "object" ? JSON.stringify(errorData) : errorData);
      }
      return {
        status: false,
        result: err?.message || "Gagal mengunggah file"
      };
    }
  }
  async cS(sessionId, source, target, tcs) {
    try {
      const url = `https://www.zamzar.com/files/${sessionId}/?from=${source}&to=${target}`;
      console.log("[Zamzar] Memeriksa status...");
      const cookieHeader = await this.gC();
      const res = await axios.get(url, {
        headers: {
          ...this.headers,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          referer: "https://www.zamzar.com/converters/image/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          Cookie: cookieHeader
        }
      });
      await this.sC(res);
      const $ = cheerio.load(res?.data || "");
      const links = $("a").map((_, el) => $(el).attr("href")).get();
      let path = links.find(href => href?.includes(`/files/${sessionId}/`) && href?.includes("tcs="));
      if (!path) {
        const jobId = $("tr[data-id]").first().attr("data-id");
        if (jobId && tcs) {
          console.log(`[Zamzar] Tautan terblokir modal limit. Membangun tautan unduhan manual dengan Job ID: ${jobId}...`);
          path = `/files/${sessionId}/${jobId}/?tcs=${tcs.toLowerCase()}`;
        }
      }
      if (path) {
        return {
          status: true,
          result: `https://www.zamzar.com${path}`
        };
      }
      return {
        status: true,
        result: null
      };
    } catch (err) {
      console.error("[Zamzar] Gagal saat memeriksa status:", err?.message);
      return {
        status: false,
        result: err?.message || "Gagal saat memeriksa status"
      };
    }
  }
  async gHd(url) {
    try {
      console.log("[Zamzar] Mengambil metadata berkas hasil konversi (HEAD)...");
      const cookieHeader = await this.gC();
      let res;
      try {
        res = await axios.head(url, {
          headers: {
            ...this.headers,
            Cookie: cookieHeader
          }
        });
      } catch (e) {
        res = await axios.get(url, {
          headers: {
            ...this.headers,
            Cookie: cookieHeader
          },
          responseType: "stream"
        });
        res.data.destroy();
      }
      const size = res?.headers?.["content-length"] ? parseInt(res.headers["content-length"], 10) : null;
      const contentType = res?.headers?.["content-type"] || null;
      return {
        size: size,
        contentType: contentType
      };
    } catch (err) {
      console.error("[Zamzar] Gagal mengambil metadata berkas HEAD:", err?.message);
      return {
        size: null,
        contentType: null
      };
    }
  }
  async generate({
    media,
    source = "jpg",
    target = "png",
    ...rest
  }) {
    try {
      console.log("[Zamzar] Memulai konversi...");
      const homeRes = await this.gH();
      if (!homeRes?.status) {
        return homeRes;
      }
      if (!this.types) {
        const typesRes = await this.gT();
        if (!typesRes?.status) {
          return typesRes;
        }
      }
      const src = source ? source.toLowerCase().trim() : "";
      const tgt = target ? target.toLowerCase().trim() : "";
      if (!src) {
        return {
          status: false,
          result: "Format asal (source) tidak boleh kosong.",
          sources: Object.keys(this.types || {})
        };
      }
      const allowedTargets = this.types ? this.types[src] : null;
      if (!allowedTargets || allowedTargets.length === 0) {
        return {
          status: false,
          result: `Format asal "${src}" tidak didukung oleh Zamzar.`,
          sources: Object.keys(this.types || {})
        };
      }
      if (!tgt) {
        return {
          status: false,
          result: "Format tujuan (target) tidak boleh kosong.",
          targets: allowedTargets
        };
      }
      console.log(`[Zamzar] Format sumber terpilih: "${src}". Daftar format tujuan yang didukung (target list): ${allowedTargets.join(", ")}`);
      if (!allowedTargets.includes(tgt)) {
        return {
          status: false,
          result: `Format tujuan "${tgt}" tidak didukung untuk format asal "${src}".`,
          targets: allowedTargets
        };
      }
      const mediaRes = await this.pM(media);
      if (!mediaRes?.status) {
        return mediaRes;
      }
      const {
        buffer,
        name
      } = mediaRes;
      const sessionRes = await this.gS();
      if (!sessionRes?.status) {
        return sessionRes;
      }
      const session = sessionRes.result;
      const sessionId = session?.sessionId;
      const tcs = session?.tcs;
      if (!sessionId || !tcs) {
        return {
          status: false,
          result: "Gagal mendapatkan Session ID atau TCS."
        };
      }
      console.log(`[Zamzar] Session ID diperoleh: ${sessionId} (Server TCS: ${tcs}). Menunggu sinkronisasi...`);
      await this.slp(1500);
      const uploadRes = await this.uF(tcs, sessionId, buffer, name, src, tgt);
      if (!uploadRes?.status) {
        return uploadRes;
      }
      let downloadUrl = null;
      const maxAttempts = 25;
      let attempt = 0;
      while (!downloadUrl && attempt < maxAttempts) {
        attempt++;
        console.log(`[Zamzar] Menunggu konversi. Polling ke-${attempt}/${maxAttempts}...`);
        await this.slp(3e3);
        const statusRes = await this.cS(sessionId, src, tgt, tcs);
        if (!statusRes?.status) {
          return statusRes;
        }
        downloadUrl = statusRes.result;
      }
      if (!downloadUrl) {
        return {
          status: false,
          result: "Proses konversi melampaui batas waktu."
        };
      }
      const meta = await this.gHd(downloadUrl);
      return {
        status: true,
        result: downloadUrl,
        ...meta
      };
    } catch (err) {
      console.error("[Zamzar] Proses pembuatan gagal:", err?.message);
      return {
        status: false,
        result: err?.message || "Terjadi kesalahan internal."
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.media) {
    return res.status(400).json({
      error: "Parameter 'media' diperlukan"
    });
  }
  const api = new ZamzarConverter();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}