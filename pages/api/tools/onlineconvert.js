import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class OnlineConverter {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://www.onlineconverter.com",
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      }
    }));
  }
  async _med(media) {
    try {
      console.log("[Proses] Memulai validasi dan resolusi input media...");
      if (!media) {
        console.log("[Error] Input media kosong.");
        return {
          success: false,
          error: "Input media tidak boleh kosong."
        };
      }
      if (Buffer.isBuffer(media)) {
        console.log("[Proses] Input media terdeteksi sebagai Buffer.");
        return {
          success: true,
          data: media,
          name: "file.bin"
        };
      }
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          console.log(`[Proses] Mengunduh media dari URL: ${media}`);
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          const disp = res.headers["content-disposition"] || "";
          const match = disp.match(/filename="?([^"]+)"?/);
          let name = match?.[1] || "file.bin";
          if (name === "file.bin") {
            const parsedUrl = new URL(media);
            const last = parsedUrl.pathname.split("/").pop();
            name = last && last.includes(".") ? last : "file.bin";
          }
          return {
            success: true,
            data: Buffer.from(res.data),
            name: name
          };
        }
        if (media.startsWith("data:")) {
          console.log("[Proses] Input media terdeteksi sebagai Base64 Data URI.");
          const match = media.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const ext = match[1]?.split("/")?.[1] || "bin";
            return {
              success: true,
              data: Buffer.from(match[2], "base64"),
              name: `file.${ext}`
            };
          }
        }
        try {
          const buf = Buffer.from(media, "base64");
          if (buf.toString("base64") === media) {
            console.log("[Proses] Input media terdeteksi sebagai string Base64 murni.");
            return {
              success: true,
              data: buf,
              name: "file.bin"
            };
          }
        } catch {}
        console.log("[Proses] Input media diproses sebagai berkas teks.");
        return {
          success: true,
          data: Buffer.from(media),
          name: "file.txt"
        };
      }
      console.log("[Error] Tipe data media tidak didukung.");
      return {
        success: false,
        error: "Tipe data media harus berupa Buffer, URL, atau Base64 String."
      };
    } catch (err) {
      console.log(`[Error] Gagal memproses media: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _cats() {
    try {
      console.log("[Proses] Membaca kategori target converter dari homepage...");
      const res = await this.client.get("/");
      const $ = cheerio.load(res.data || "");
      const data = {};
      $("select").get().forEach(el => {
        const id = $(el).attr("id") || "";
        if (id.endsWith("-converter")) {
          const key = id.replace("-converter", "");
          data[key] = $(el).find("option").map((_, opt) => $(opt).attr("value") || "").get().filter(val => val !== "");
        }
      });
      return {
        success: true,
        data: data
      };
    } catch (err) {
      console.log(`[Error] Gagal memetakan kategori: ${err.message}`);
      return {
        success: false,
        error: err.message,
        data: {}
      };
    }
  }
  async _srcs(target) {
    try {
      const tgt = target?.toLowerCase() || "";
      console.log(`[Proses] Memuat halaman target /${tgt} untuk mengidentifikasi format source yang didukung...`);
      const res = await this.client.get(`/${tgt}`);
      const $ = cheerio.load(res.data || "");
      const list = $("#format option").map((_, el) => {
        const val = $(el).attr("value") || "";
        const parts = val.split("-to-");
        return parts.length === 2 && parts[1] === tgt ? parts[0] : "";
      }).get().filter(val => val !== "");
      return {
        success: true,
        data: [...new Set(list)],
        html: res.data
      };
    } catch (err) {
      console.log(`[Error] Gagal memetakan format source yang didukung untuk target ${target}: ${err.message}`);
      return {
        success: false,
        error: err.message,
        data: [],
        html: ""
      };
    }
  }
  async _prs(html, src, tgt) {
    try {
      console.log("[Proses] Mengurai parameter form dari dokumen HTML...");
      const $ = cheerio.load(html || "");
      const form = $("#form");
      if (!form.length) {
        return {
          success: false,
          error: "Target form tidak ditemukan di dalam HTML."
        };
      }
      const formatVal = $(`#format option[value="${src}-to-${tgt}"]`).val() || $(`#format option[value*="-to-${tgt}"]`).first().val() || $("#format option").first().val() || `${src}-to-${tgt}`;
      let groupClass = "image";
      const title = $("title").text().toLowerCase() || "";
      if (title.includes("video")) groupClass = "video";
      else if (title.includes("audio")) groupClass = "audio";
      else if (title.includes("document")) groupClass = "document";
      else if (title.includes("ebook")) groupClass = "ebook";
      return {
        success: true,
        data: {
          formatVal: formatVal,
          groupClass: groupClass,
          from: formatVal.split("-to-")[0] || src,
          to: formatVal.split("-to-")[1] || tgt
        }
      };
    } catch (err) {
      console.log(`[Error] Gagal mengurai elemen form: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _hst(src) {
    try {
      console.log("[Proses] Meminta host pengiriman file...");
      const res = await this.client.get("/get/host", {
        headers: {
          Accept: "*/*",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          Referer: `https://www.onlineconverter.com/${src || ""}`
        }
      });
      const host = res.data?.trim() || "";
      if (!host.startsWith("https://")) {
        return {
          success: false,
          error: "Format respons host dari server tidak valid."
        };
      }
      return {
        success: true,
        data: host
      };
    } catch (err) {
      console.log(`[Error] Gagal mendapatkan alamat host pengiriman: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _pol(convertUrl) {
    try {
      console.log(`[Proses] Mengunduh halaman hasil awal: ${convertUrl}`);
      const res = await this.client.get(convertUrl);
      const match = (res.data || "").match(/var url\s*=\s*'([^']+)'/);
      const statusUrl = match?.[1] || "";
      if (!statusUrl) {
        return {
          success: false,
          error: "Gagal mendeteksi tracking URL dari server."
        };
      }
      console.log(`[Proses] Memulai polling ke server tujuan: ${statusUrl}`);
      let completed = false;
      let count = 0;
      const maxPolls = 120;
      while (!completed && count < maxPolls) {
        count++;
        const pollRes = await this.client.get(statusUrl);
        const code = pollRes.data?.substring(0, 1) || "";
        if (code === "d") {
          completed = true;
          return {
            success: true,
            data: {
              downloadUrl: `${statusUrl}/download`,
              statusUrl: statusUrl
            }
          };
        } else if (code === "e") {
          return {
            success: false,
            error: "Proses konversi gagal diproses oleh server."
          };
        } else if (code === "i") {
          return {
            success: false,
            error: "Berkas telah dihapus atau kedaluwarsa di server."
          };
        }
        console.log(`[Proses] Polling ${count}: Status server -> ${pollRes.data || "Menunggu"}. Mencoba kembali dalam 3 detik...`);
        await new Promise(r => setTimeout(r, 3e3));
      }
      return {
        success: false,
        error: "Batas waktu tunggu konversi terlampaui."
      };
    } catch (err) {
      console.log(`[Error] Polling status konversi terputus: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async generate({
    media,
    source,
    target,
    ...rest
  }) {
    try {
      const fileVal = await this._med(media);
      if (!fileVal.success) {
        return {
          status: "failed",
          result: null,
          meta: {
            error: fileVal.error || "Validasi berkas media gagal."
          }
        };
      }
      const catsRes = await this._cats();
      const cats = catsRes.data || {};
      const allTargets = Object.values(cats).flat();
      const tgt = target?.toLowerCase() || "";
      if (!tgt || !allTargets.includes(tgt)) {
        console.log("[Proses] Target format salah/kosong. Menyajikan daftar target terklasifikasi.");
        return {
          status: "failed",
          result: null,
          meta: {
            error: tgt ? `Format target '${tgt}' tidak didukung.` : "Parameter target wajib ditentukan.",
            available_targets: cats
          }
        };
      }
      const srcsRes = await this._srcs(tgt);
      if (!srcsRes.success) {
        return {
          status: "failed",
          result: null,
          meta: {
            error: srcsRes.error
          }
        };
      }
      const srcList = srcsRes.data || [];
      const src = source?.toLowerCase() || "";
      if (!src || !srcList.includes(src)) {
        console.log(`[Proses] Source format salah/kosong untuk target '${tgt}'. Menyajikan daftar source yang didukung.`);
        return {
          status: "failed",
          result: null,
          meta: {
            error: src ? `Format source '${src}' tidak didukung untuk target '${tgt}'.` : "Parameter source wajib ditentukan.",
            available_sources: srcList
          }
        };
      }
      const parseRes = await this._prs(srcsRes.html, src, tgt);
      if (!parseRes.success) {
        return {
          status: "failed",
          result: null,
          meta: {
            error: parseRes.error
          }
        };
      }
      const hostRes = await this._hst(src);
      if (!hostRes.success) {
        return {
          status: "failed",
          result: null,
          meta: {
            error: hostRes.error
          }
        };
      }
      const uploadUrl = hostRes.data;
      const form = new FormData();
      form.append("file", fileVal.data, {
        filename: fileVal.name
      });
      form.append("class", parseRes.data.groupClass || "image");
      form.append("from", parseRes.data.from || src);
      form.append("to", parseRes.data.to || tgt);
      form.append("source", "online");
      Object.entries(rest || {}).forEach(([k, v]) => {
        form.append(k, v);
      });
      console.log(`[Proses] Mengunggah file ke endpoint: ${uploadUrl}`);
      const uploadRes = await this.client.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          Accept: "*/*",
          Origin: "https://www.onlineconverter.com",
          Referer: `https://www.onlineconverter.com/${tgt}`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const convertUrl = uploadRes.data?.trim() || "";
      if (!convertUrl.startsWith("https://")) {
        return {
          status: "failed",
          result: null,
          meta: {
            error: `Pengunggahan gagal. Respon server: ${uploadRes.data}`
          }
        };
      }
      console.log(`[Proses] File berhasil diunggah. Alamat tracking: ${convertUrl}`);
      const resultData = await this._pol(convertUrl);
      if (!resultData.success) {
        return {
          status: "failed",
          result: null,
          meta: {
            error: resultData.error
          }
        };
      }
      return {
        status: "success",
        result: resultData.data.downloadUrl,
        meta: {
          source: src,
          target: tgt,
          tracking_url: convertUrl,
          status_url: resultData.data.statusUrl
        }
      };
    } catch (err) {
      console.log(`[Error] Kegagalan sistem pada fungsi generate: ${err.message}`);
      return {
        status: "failed",
        result: null,
        meta: {
          error: err.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new OnlineConverter();
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