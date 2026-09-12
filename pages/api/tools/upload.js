import crypto from "crypto";
import FormData from "form-data";
import * as fileType from "file-type";
const fileTypeFromBuffer = fileType.fileTypeFromBuffer || fileType.fromBuffer || fileType.default?.fileTypeFromBuffer || fileType.default?.fromBuffer;
import axios from "axios";
import * as cheerio from "cheerio";
import multer from "multer";
const Provider = ["Catbox", "Litterbox", "Doodstream", "Fexnet", "DOffice", "Bash", "FileDitch", "Filebin", "Fileio", "Filezone", "FreeImage", "Gofile", "Gozic", "Hostfile", "Imgbb", "Kitc", "Kraken", "Leopard", "Poners", "Kappa", "Shz", "MediaUpload", "Eax", "Nullbyte", "Vello", "Lusia", "Pomf2", "Sazumi", "Sohu", "Gizai", "PhoTo", "Sojib", "Instantiated", "Exonity", "Zcy", "BltokProject", "Maricon", "Nauval", "PhotoToUrl", "TmpfileLink", "DropMeAFile", "ImageUrlGen", "Knowee", "Puticu", "Stylar", "Telegraph", "Tmpfiles", "Cloudmini", "Babup", "Transfersh", "Ucarecdn", "Uguu", "UploadEE", "Uploadify", "Videy", "Uplider", "ZippyShare", "Quax", "Aceimg"];
class Uploader {
  constructor() {
    this.Provider = Provider;
    this._referer = "https://krakenfiles.com";
    this._uloadUrlRegexStr = /url: "([^"]+)"/;
    this._http = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      },
      timeout: 6e4
    });
  }
  _generateSlug() {
    return crypto.createHash("md5").update(`${Date.now()}-${crypto.randomUUID()}`).digest("hex").substring(0, 8);
  }
  async _createFormData(content, fieldName) {
    const fileInfo = await fileTypeFromBuffer(content);
    const ext = fileInfo?.ext || "bin";
    const mime = fileInfo?.mime || "application/octet-stream";
    const filename = `${this._generateSlug()}.${ext}`;
    const formData = new FormData();
    formData.append(fieldName, content, {
      filename: filename,
      contentType: mime
    });
    return {
      formData: formData,
      ext: ext,
      mime: mime,
      filename: filename
    };
  }
  _formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
  async _getBufferInfo(buffer) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        return {
          valid: false,
          error: "Input bukan Buffer"
        };
      }
      const info = await fileTypeFromBuffer(buffer);
      const length = buffer.length;
      return {
        valid: true,
        length: length,
        formatted: this._formatBytes(length),
        mime: info?.mime || "unknown",
        ext: info?.ext || "unknown",
        preview: buffer.slice(0, 16).toString("hex").toUpperCase()
      };
    } catch (e) {
      return {
        valid: false,
        error: e.message
      };
    }
  }
  async Puticu(content) {
    console.log("[Puticu] Mengunggah file...");
    try {
      const response = await this._http.put("https://put.icu/upload/", content, {
        headers: {
          Accept: "application/json"
        }
      });
      console.log("[Puticu] Berhasil diunggah.");
      return response.data?.direct_url;
    } catch (error) {
      console.error("[Puticu] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Sohu(content) {
    console.log("[Sohu] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://changyan.sohu.com/api/2/comment/attachment", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Sohu] Berhasil diunggah.");
      return response.data?.url;
    } catch (error) {
      console.error("[Sohu] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Pomf2(content) {
    console.log("[Pomf2] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://pomf2.lain.la/upload.php", formData, {
        headers: formData.getHeaders()
      });
      if (!response.data?.success) {
        return {
          status: false,
          message: "Upload failed on Pomf2"
        };
      }
      console.log("[Pomf2] Berhasil diunggah.");
      return response.data?.files[0]?.url;
    } catch (error) {
      console.error("[Pomf2] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Gizai(content) {
    console.log("[Gizai] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://app.giz.ai/api/tempFiles", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Gizai] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[Gizai] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async PhoTo(content) {
    console.log("[PhoTo] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://temp.ws.pho.to/upload.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[PhoTo] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[PhoTo] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Catbox(content) {
    console.log("[Catbox] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "fileToUpload");
      formData.append("reqtype", "fileupload");
      const response = await this._http.post("https://catbox.moe/user/api.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Catbox] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[Catbox] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Litterbox(content) {
    console.log("[Litterbox] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "fileToUpload");
      formData.append("reqtype", "fileupload");
      formData.append("time", "72h");
      const response = await this._http.post("https://litterbox.catbox.moe/resources/internals/api.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Litterbox] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[Litterbox] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Telegraph(content) {
    console.log("[Telegraph] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://telegra.ph/upload", formData, {
        headers: formData.getHeaders()
      });
      if (response.data?.error) {
        return {
          status: false,
          message: response.data.error
        };
      }
      console.log("[Telegraph] Berhasil diunggah.");
      return `https://telegra.ph${response.data[0]?.src}`;
    } catch (error) {
      console.error("[Telegraph] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Ucarecdn(content) {
    console.log("[Ucarecdn] Mengunggah file...");
    try {
      const {
        formData,
        ext
      } = await this._createFormData(content, "file");
      formData.append("UPLOADCARE_PUB_KEY", "demopublickey");
      formData.append("UPLOADCARE_STORE", "1");
      const response = await this._http.post("https://upload.uploadcare.com/base/", formData, {
        headers: formData.getHeaders()
      });
      const {
        file
      } = response.data;
      console.log("[Ucarecdn] Berhasil diunggah.");
      return `https://ucarecdn.com/${file}/${this._generateSlug()}.${ext || "bin"}`;
    } catch (error) {
      console.error("[Ucarecdn] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Transfersh(content) {
    console.log("[Transfersh] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://transfer.sh/", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Transfersh] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[Transfersh] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async FreeImage(content) {
    console.log("[FreeImage] Mengunggah file...");
    try {
      const apiKey = "6d207e02198a847aa98d0a2a901485a5";
      const formData = new FormData();
      formData.append("key", apiKey);
      formData.append("action", "upload");
      formData.append("source", content.toString("base64"));
      const response = await this._http.post("https://freeimage.host/api/1/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[FreeImage] Berhasil diunggah.");
      return response.data?.image?.url || response.data?.image?.image?.url;
    } catch (error) {
      console.error("[FreeImage] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Babup(content) {
    console.log("[Babup] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file_1_");
      formData.append("submitr", "رفع");
      const uploadResponse = await this._http.post("https://www.babup.com/", formData, {
        headers: formData.getHeaders()
      });
      const output = uploadResponse.data;
      const regex = /do\.php\?.*?=(\d+)/g;
      const id = [...output.matchAll(regex)].map(match => match[1])[0];
      if (id) {
        const downloadUrl = `https://www.babup.com/do.php?down=${id}`;
        const refererUrl = `https://www.babup.com/do.php?id=${id}`;
        const res = await this._http.get(downloadUrl, {
          headers: {
            Referer: refererUrl
          }
        });
        console.log("[Babup] Berhasil diunggah.");
        return res.request?.res?.responseUrl || downloadUrl;
      }
      console.log("[Babup] Berhasil diunggah.");
      return output;
    } catch (error) {
      console.error("[Babup] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Tmpfiles(content) {
    console.log("[Tmpfiles] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://tmpfiles.org/api/v1/upload", formData, {
        headers: formData.getHeaders()
      });
      const originalURL = response.data?.data?.url;
      if (!originalURL) {
        return {
          status: false,
          message: "Gagal mendapatkan URL dari respons Tmpfiles"
        };
      }
      const pageRes = await this._http.get(originalURL);
      const $ = cheerio.load(pageRes.data);
      const directURL = $("a.download").attr("href") || $("#img_preview").attr("src");
      if (!directURL) {
        const fallbackURL = `https://tmpfiles.org/dl/${originalURL.split("/").slice(-2).join("/")}`;
        console.log("[Tmpfiles] Berhasil diunggah (fallback url).");
        return fallbackURL;
      }
      console.log("[Tmpfiles] Berhasil diunggah.");
      return directURL;
    } catch (error) {
      console.error("[Tmpfiles] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Cloudmini(content) {
    console.log("[Cloudmini] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://files.cloudmini.net/upload", formData, {
        headers: formData.getHeaders()
      });
      const filename = response.data?.filename;
      console.log("[Cloudmini] Berhasil diunggah.");
      return filename ? `https://files.cloudmini.net/download/${filename}` : null;
    } catch (error) {
      console.error("[Cloudmini] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Vello(content) {
    console.log("[Vello] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://api.vello.ai/upload", formData, {
        headers: formData.getHeaders()
      });
      const sid = typeof response.data === "string" ? JSON.parse(response.data).sid : response.data.sid;
      console.log("[Vello] Berhasil diunggah.");
      return `https://d3cflkbt5y83mw.cloudfront.net/files/${sid}`;
    } catch (error) {
      console.error("[Vello] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Lusia(content) {
    console.log("[Lusia] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      formData.append("expireAfter", "24");
      formData.append("burn", "false");
      const getToken = await this._http.get("https://litter.lusia.moe/post/token");
      const response = await this._http.post(`https://litter.lusia.moe/post/upload?token=${getToken.data?.token}`, formData, {
        headers: formData.getHeaders()
      });
      console.log("[Lusia] Berhasil diunggah.");
      return `https://litter.lusia.moe/${response.data.path}`;
    } catch (error) {
      console.error("[Lusia] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Nullbyte(content) {
    console.log("[Nullbyte] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("http://0x0.st", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Nullbyte] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[Nullbyte] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Kraken(content) {
    console.log("[Kraken] Mengunggah file...");
    try {
      const {
        data
      } = await this._http.get(this._referer);
      const uploadUrl = data?.match(this._uloadUrlRegexStr)?.[1];
      if (!uploadUrl) {
        return {
          status: false,
          message: "URL upload tidak ditemukan pada Krakenfiles"
        };
      }
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post(uploadUrl, formData, {
        headers: {
          Referer: this._referer,
          ...formData.getHeaders()
        }
      });
      const file = response.data?.files?.[0];
      const htmlRes = await this._http.get(this._referer + file.url);
      console.log("[Kraken] Berhasil diunggah.");
      return cheerio.load(htmlRes.data)("#link1").val();
    } catch (error) {
      console.error("[Kraken] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Leopard(content) {
    console.log("[Leopard] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "uploadContent");
      formData.append("showname", "yes");
      formData.append("password", "");
      const response = await this._http.post("https://leopard.hosting.pecon.us/upload.php", formData, {
        headers: formData.getHeaders()
      });
      const $ = cheerio.load(response.data);
      const downloadLink = $(".pageContainer a").first().attr("href");
      if (!downloadLink) {
        return {
          status: false,
          message: "Gagal mendapatkan link download dari Leopard Hosting"
        };
      }
      console.log("[Leopard] Berhasil diunggah.");
      return downloadLink;
    } catch (error) {
      console.error("[Leopard] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Poners(content) {
    console.log("[Poners] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://pone.rs/upload.php", formData, {
        headers: formData.getHeaders()
      });
      const resData = response.data;
      if (!resData?.success || !resData?.files || resData.files.length === 0) {
        return {
          status: false,
          message: "Gagal mengupload atau format respons tidak sesuai dari Pone.rs"
        };
      }
      console.log("[Poners] Berhasil diunggah.");
      return resData.files[0].url;
    } catch (error) {
      console.error("[Poners] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Kappa(content) {
    console.log("[Kappa] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://kappa.lol/api/upload", formData, {
        headers: formData.getHeaders()
      });
      const url = response.data?.link;
      if (!url) {
        return {
          status: false,
          message: "Gagal mendapatkan link download dari Kappa.lol"
        };
      }
      console.log("[Kappa] Berhasil diunggah.");
      return url;
    } catch (error) {
      console.error("[Kappa] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Shz(content) {
    console.log("[Shz] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "c");
      formData.append("e", "7d");
      const response = await this._http.post("https://shz.al/", formData, {
        headers: formData.getHeaders()
      });
      const {
        url
      } = response.data || {};
      if (!url) {
        return {
          status: false,
          message: "Gagal mendapatkan URL dari Shz.al"
        };
      }
      console.log("[Shz] Berhasil diunggah.");
      return url;
    } catch (error) {
      console.error("[Shz] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Hostfile(content) {
    console.log("[Hostfile] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://hostfile.my.id/api/upload", formData, {
        headers: formData.getHeaders()
      });
      const base64Data = response.data;
      console.log("[Hostfile] Berhasil diunggah.");
      return typeof base64Data === "object" ? base64Data.url : JSON.parse(base64Data).url;
    } catch (error) {
      console.error("[Hostfile] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Gofile(content) {
    console.log("[Gofile] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const getServer = await this._http.get("https://api.gofile.io/getServer");
      const response = await this._http.post(`https://${getServer.data?.data?.server}.gofile.io/uploadFile`, formData, {
        headers: formData.getHeaders()
      });
      const result = response.data;
      console.log("[Gofile] Berhasil diunggah.");
      return `https://${getServer.data?.data?.server}.gofile.io/download/${result.data?.fileId}/${result.data?.fileName}`;
    } catch (error) {
      console.error("[Gofile] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Fileio(content) {
    console.log("[Fileio] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://file.io", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Fileio] Berhasil diunggah.");
      return response.data?.link;
    } catch (error) {
      console.error("[Fileio] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Filebin(content) {
    console.log("[Filebin] Mengunggah file...");
    try {
      const {
        formData,
        ext
      } = await this._createFormData(content, "file");
      const homeRes = await this._http.get("https://filebin.net/");
      const binId = homeRes.data.match(/var\s+bin\s*=\s*['"]([^'"]+)['"]/)?.[1];
      const uploadURL = `https://filebin.net/${binId}/${this._generateSlug()}.${ext || "bin"}`;
      const response = await this._http.post(uploadURL, formData, {
        headers: formData.getHeaders()
      });
      const output = response.data;
      console.log("[Filebin] Berhasil diunggah.");
      return `https://filebin.net/${output.bin?.id}/${output.file?.filename}`;
    } catch (error) {
      console.error("[Filebin] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Fexnet(content) {
    console.log("[Fexnet] Mengunggah file...");
    try {
      const {
        formData,
        ext
      } = await this._createFormData(content, "file");
      formData.append("filename", `${this._generateSlug()}.${ext || "bin"}`);
      const auth = Buffer.from("as@fexnet.com/token:1RQO68P13pmqFXorJUKp4P").toString("base64");
      const response = await this._http.post("https://fexnet.zendesk.com/api/v2/uploads.json", formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${auth}`
        }
      });
      console.log("[Fexnet] Berhasil diunggah.");
      return response.data?.upload?.attachment?.content_url;
    } catch (error) {
      console.error("[Fexnet] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async DOffice(content) {
    console.log("[DOffice] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://www.digitalofficepro.com/file-converter/assembly/upload-file.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[DOffice] Berhasil diunggah.");
      return `https://s3.us-west-2.amazonaws.com/temp.digitalofficepro.com/${response.data}`;
    } catch (error) {
      console.error("[DOffice] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Bash(content) {
    console.log("[Bash] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file_1");
      formData.append("json", "true");
      const response = await this._http.post("https://bashupload.com/", formData, {
        headers: formData.getHeaders()
      });
      const files = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      console.log("[Bash] Berhasil diunggah.");
      return files.file_1?.url;
    } catch (error) {
      console.error("[Bash] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async MediaUpload(content) {
    console.log("[MediaUpload] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://media-upload.net/php/ajax_upload_file.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[MediaUpload] Berhasil diunggah.");
      return response.data?.files?.[0]?.fileUrl;
    } catch (error) {
      console.error("[MediaUpload] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Eax(content) {
    console.log("[Eax] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://pomf.eax.moe/upload.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Eax] Berhasil diunggah.");
      return response.data?.files?.[0]?.url;
    } catch (error) {
      console.error("[Eax] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Sazumi(content) {
    console.log("[Sazumi] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://cdn.sazumi.moe/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Sazumi] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[Sazumi] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Imgbb(content, exp, key) {
    console.log("[Imgbb] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "image");
      formData.append("key", key || "c93b7d1d3f7a145263d4651c46ba55e4");
      formData.append("expiration", exp || 600);
      const response = await this._http.post("https://api.imgbb.com/1/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Imgbb] Berhasil diunggah.");
      return response.data?.data?.url;
    } catch (error) {
      console.error("[Imgbb] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async FileDitch(content) {
    console.log("[FileDitch] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://up1.fileditch.com/upload.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[FileDitch] Berhasil diunggah.");
      return response.data?.files?.[0]?.url;
    } catch (error) {
      console.error("[FileDitch] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Uguu(content) {
    console.log("[Uguu] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://uguu.se/upload?output=json", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Uguu] Berhasil diunggah.");
      return response.data?.files?.[0]?.url;
    } catch (error) {
      console.error("[Uguu] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Doodstream(content, key) {
    console.log("[Doodstream] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      formData.append("type", "submit");
      formData.append("api_key", key || "13527p8pcv54of4yjeryk");
      const srvRes = await this._http.get("https://doodapi.com/api/upload/server?key=" + (key || "13527p8pcv54of4yjeryk"));
      const uploadUrl = srvRes.data?.result;
      const response = await this._http.post(uploadUrl, formData, {
        headers: formData.getHeaders()
      });
      console.log("[Doodstream] Berhasil diunggah.");
      return response.data?.files?.[0]?.url;
    } catch (error) {
      console.error("[Doodstream] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Videy(content) {
    console.log("[Videy] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://videy.co/api/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Videy] Berhasil diunggah.");
      return `https://cdn.videy.co/${response.data?.id}.mp4`;
    } catch (error) {
      console.error("[Videy] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Gozic(content) {
    console.log("[Gozic] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://appbanhang.gozic.vn/api/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Gozic] Berhasil diunggah.");
      return response.data?.url;
    } catch (error) {
      console.error("[Gozic] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async UploadEE(content) {
    console.log("[UploadEE] Mengunggah file...");
    try {
      const baseUrl = "https://www.upload.ee";
      const response = await this._http.get(`${baseUrl}/ubr_link_upload.php?rnd_id=${Date.now()}`);
      const uploadId = (response.data.match(/startUpload\("(.+?)"/) || [])[1];
      if (!uploadId) {
        return {
          status: false,
          message: "Tidak dapat memperoleh Upload ID dari Upload.ee"
        };
      }
      const {
        formData
      } = await this._createFormData(content, "upfile_0");
      formData.append("link", "");
      formData.append("email", "");
      formData.append("category", "cat_file");
      formData.append("big_resize", "none");
      formData.append("small_resize", "120x90");
      const uploadResponse = await this._http.post(`${baseUrl}/cgi-bin/ubr_upload.pl?X-Progress-ID=${encodeURIComponent(uploadId)}&upload_id=${encodeURIComponent(uploadId)}`, formData, {
        headers: {
          Referer: baseUrl,
          ...formData.getHeaders()
        }
      });
      const viewUrl = cheerio.load(uploadResponse.data)("input#file_src").val() || "";
      if (!viewUrl) {
        return {
          status: false,
          message: "Proses upload gagal pada Upload.ee"
        };
      }
      const viewResponse = await this._http.get(viewUrl);
      const downUrl = cheerio.load(viewResponse.data)("#d_l").attr("href") || "";
      if (!downUrl) {
        return {
          status: false,
          message: "Gagal mendapatkan tautan unduhan dari Upload.ee"
        };
      }
      console.log("[UploadEE] Berhasil diunggah.");
      return downUrl;
    } catch (error) {
      console.error("[UploadEE] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Uploadify(content) {
    console.log("[Uploadify] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const response = await this._http.post("https://uploadify.net/core/page/ajax/file_upload_handler.ajax.php?r=uploadify.net&p=https&csaKey1=1af7f41511fe40833ff1aa0505ace436a09dcb7e6e35788aaad2ef29d0331596&csaKey2=256b861c64ec1e4d1007eb16c68b3cfc5cb8170658b1053b7185653640bb3909", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Uploadify] Berhasil diunggah.");
      return response.data?.[0]?.url;
    } catch (error) {
      console.error("[Uploadify] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Kitc(content) {
    console.log("[Kitc] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://ki.tc/file/u/", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Kitc] Berhasil diunggah.");
      return response.data?.file?.link;
    } catch (error) {
      console.error("[Kitc] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Stylar(content) {
    console.log("[Stylar] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://cdn.stylar.ai/api/v1/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Stylar] Berhasil diunggah.");
      return response.data?.file_path;
    } catch (error) {
      console.error("[Stylar] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Filezone(content) {
    console.log("[Filezone] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://filezone.my.id/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Filezone] Berhasil diunggah.");
      return response.data?.result?.url?.url_file;
    } catch (error) {
      console.error("[Filezone] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Sojib(content) {
    console.log("[Sojib] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://chat-gpt.photos/api/uploadImage", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Sojib] Berhasil diunggah.");
      return response.data?.location;
    } catch (error) {
      console.error("[Sojib] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Instantiated(content) {
    console.log("[Instantiated] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "fileName");
      const response = await this._http.post("https://instantiated.xyz/upload.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Instantiated] Berhasil diunggah.");
      return response.data?.url;
    } catch (error) {
      console.error("[Instantiated] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Uplider(content) {
    console.log("[Uplider] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://uplider.my.id/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Uplider] Berhasil diunggah.");
      return `https://uplider.my.id${response.data?.url}`;
    } catch (error) {
      console.error("[Uplider] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Exonity(content) {
    console.log("[Exonity] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://exonity.tech/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Exonity] Berhasil diunggah.");
      return response.data?.media_url || response.data?.github_raw;
    } catch (error) {
      console.error("[Exonity] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Zcy(content) {
    console.log("[Zcy] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "c");
      formData.append("e", "7d");
      const response = await this._http.post("https://p.zcy.moe/", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Zcy] Berhasil diunggah.");
      return response.data?.url || response.data?.admin;
    } catch (error) {
      console.error("[Zcy] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async BltokProject(content) {
    console.log("[BltokProject] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://www.bltokproject.xyz/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[BltokProject] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[BltokProject] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Maricon(content) {
    console.log("[Maricon] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://maricon.lol/-/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Maricon] Berhasil diunggah.");
      return response.data?.linkExt;
    } catch (error) {
      console.error("[Maricon] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Quax(content) {
    console.log("[Quax] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files[]");
      formData.append("expiry", "30");
      const response = await this._http.post("https://qu.ax/upload.php", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Quax] Berhasil diunggah.");
      return response.data?.files?.[0]?.url;
    } catch (error) {
      console.error("[Quax] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Nauval(content) {
    console.log("[Nauval] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      formData.append("filename", "");
      formData.append("expire_value", "24");
      formData.append("expire_unit", "");
      const response = await this._http.post("https://nauval.cloud/upload", formData, {
        headers: formData.getHeaders()
      });
      console.log("[Nauval] Berhasil diunggah.");
      return response.data?.file_url;
    } catch (error) {
      console.error("[Nauval] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Aceimg(content) {
    console.log("[Aceimg] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://api.aceimg.com/api/upload", formData, {
        headers: formData.getHeaders()
      });
      const link = response.data?.link;
      const urlObject = new URL(link);
      const filename = urlObject.searchParams.get("f");
      console.log("[Aceimg] Berhasil diunggah.");
      return `https://cdn.aceimg.com/${filename}`;
    } catch (error) {
      console.error("[Aceimg] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async PhotoToUrl(content) {
    console.log("[PhotoToUrl] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://phototourl.com/api/upload", formData, {
        headers: {
          ...formData.getHeaders(),
          Origin: "https://phototourl.com",
          Referer: "https://phototourl.com/"
        }
      });
      const directUrl = response.data?.url;
      if (directUrl) {
        console.log("[PhotoToUrl] Berhasil diunggah.");
        return directUrl;
      }
      console.log("[PhotoToUrl] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[PhotoToUrl] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async TmpfileLink(content) {
    console.log("[TmpfileLink] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "file");
      const response = await this._http.post("https://tmpfile.link/api/upload", formData, {
        headers: {
          ...formData.getHeaders(),
          Origin: "https://tmpfile.link",
          Referer: "https://tmpfile.link/"
        }
      });
      const downloadLink = response.data?.downloadLink || response.data?.downloadLinkEncoded;
      if (downloadLink) {
        console.log("[TmpfileLink] Berhasil diunggah.");
        return downloadLink;
      }
      console.log("[TmpfileLink] Berhasil diunggah.");
      return response.data;
    } catch (error) {
      console.error("[TmpfileLink] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async DropMeAFile(content) {
    console.log("[DropMeAFile] Mengunggah file...");
    try {
      const baseHeaders = {
        Origin: "https://dropmeafile.com",
        Referer: "https://dropmeafile.com/"
      };
      const sessionRes = await this._http.post("https://support2.lsdsoftware.com/dropmeafile", null, {
        headers: baseHeaders
      });
      const folderId = sessionRes.data?.id;
      if (!folderId) {
        return {
          status: false,
          message: "Gagal membuat ID folder di DropMeAFile"
        };
      }
      const {
        formData
      } = await this._createFormData(content, "files[]");
      const uploadRes = await this._http.post(`https://support2.lsdsoftware.com/dropmeafile/${folderId}`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...baseHeaders
        }
      });
      const fileData = Array.isArray(uploadRes.data) ? uploadRes.data[0] : uploadRes.data;
      const fileId = fileData?.id;
      if (!fileId) {
        return {
          status: false,
          message: "Gagal mendapatkan ID file dari DropMeAFile"
        };
      }
      const directUrl = `https://support2.lsdsoftware.com/dropmeafile/${folderId}/${fileId}`;
      console.log("[DropMeAFile] Berhasil diunggah.");
      return directUrl;
    } catch (error) {
      console.error("[DropMeAFile] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async ImageUrlGen(content) {
    console.log("[ImageUrlGen] Mengunggah file...");
    try {
      const fileInfo = await fileTypeFromBuffer(content);
      const ext = fileInfo?.ext || "jpg";
      const mime = fileInfo?.mime || "image/jpeg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const filesize = content.length;
      const uploadUrl = `https://imageurlgenerator-upload.hrbrackishlifecarepvt.workers.dev/?filename=${encodeURIComponent(filename)}&filesize=${filesize}`;
      const response = await this._http.post(uploadUrl, content, {
        headers: {
          "Content-Type": mime,
          Origin: "https://www.imageurlgenerator.com",
          Referer: "https://www.imageurlgenerator.com/"
        }
      });
      console.log("[ImageUrlGen] Berhasil diunggah.");
      return response.data?.url;
    } catch (error) {
      console.error("[ImageUrlGen] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async Knowee(content) {
    console.log("[Knowee] Mengunggah file...");
    try {
      const {
        formData
      } = await this._createFormData(content, "files");
      const response = await this._http.post("https://core.knowee.ai/api/databank/pub-files", formData, {
        headers: {
          ...formData.getHeaders(),
          Client: "web",
          "Device-Id": "9b5fe0d0-d92f-42d2-a461-eb30b63fa45e",
          "Update-Version": "0.1.0",
          Referer: "https://knowee.ai/webapp/homework/1b7562c3-e9ab-442d-9c00-4b0eea2310e3"
        }
      });
      console.log("[Knowee] Berhasil diunggah.");
      return response.data?.data?.files?.[0]?.url;
    } catch (error) {
      console.error("[Knowee] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
  async ZippyShare(content) {
    console.log("[ZippyShare] Mengunggah file...");
    try {
      const fileInfo = await fileTypeFromBuffer(content);
      const ext = fileInfo?.ext || "bin";
      const mime = fileInfo?.mime || "application/octet-stream";
      const filename = `${this._generateSlug()}.${ext}`;
      const size = content.length;
      let cookieJar = "";
      const syncCookies = res => {
        const raw = res?.headers?.["set-cookie"];
        if (raw) {
          const map = new Map();
          if (cookieJar) {
            cookieJar.split("; ").forEach(p => {
              const [k, ...v] = p.split("=");
              if (k) map.set(k.trim(), v.join("="));
            });
          }
          raw.forEach(p => {
            const [k, ...v] = p.split(";")[0].split("=");
            if (k) map.set(k.trim(), v.join("="));
          });
          cookieJar = Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
        }
      };
      const homeRes = await this._http.get("https://zippyshare.day/");
      syncCookies(homeRes);
      let $ = cheerio.load(homeRes.data);
      let csrfToken = $('meta[name="csrf-token"]').attr("content");
      if (!csrfToken) {
        return {
          status: false,
          message: "Gagal mendapatkan CSRF Token awal dari ZippyShare"
        };
      }
      const presignRes = await this._http.post("https://zippyshare.day/upload/presign", {
        filename: filename,
        size: size,
        mime: mime,
        password: "",
        upload_auto_delete: 14,
        folder_id: null
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://zippyshare.day",
          Referer: "https://zippyshare.day/",
          Cookie: cookieJar
        }
      });
      syncCookies(presignRes);
      const presignData = presignRes.data;
      if (presignData?.type !== "success" || !presignData?.presigned_url) {
        return {
          status: false,
          message: presignData?.msg || "Presign gagal di ZippyShare"
        };
      }
      await axios.put(presignData.presigned_url, content, {
        headers: {
          "Content-Type": mime
        }
      });
      const completeRes = await this._http.post("https://zippyshare.day/upload/complete", {
        token: presignData.token,
        mime: mime
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://zippyshare.day",
          Referer: "https://zippyshare.day/",
          Cookie: cookieJar
        }
      });
      syncCookies(completeRes);
      const completeData = completeRes.data;
      const fileCode = completeData?.download_id && completeData.download_id.replace("download_", "") || completeData?.download_link && completeData.download_link.match(/zippyshare\.day\/([a-zA-Z0-9]+)/)?.[1] || completeData?.preview_id && completeData.preview_id.replace("preview_", "") || completeData?.file_code;
      if (!fileCode) {
        return completeData?.download_link || completeData;
      }
      const filePageUrl = `https://zippyshare.day/${fileCode}/file`;
      const filePageRes = await this._http.get(filePageUrl, {
        headers: {
          Referer: "https://zippyshare.day/",
          Cookie: cookieJar
        }
      });
      syncCookies(filePageRes);
      $ = cheerio.load(filePageRes.data);
      const pageCsrf = $('meta[name="csrf-token"]').attr("content");
      if (pageCsrf) csrfToken = pageCsrf;
      const dlCreateRes = await this._http.post(`https://zippyshare.day/${fileCode}/download/create`, {}, {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://zippyshare.day",
          Referer: filePageUrl,
          Cookie: cookieJar
        }
      });
      const directLink = dlCreateRes.data?.download_link;
      if (directLink) {
        console.log("[ZippyShare] Berhasil diunggah & direct link didapatkan.");
        return directLink;
      }
      console.log("[ZippyShare] Berhasil diunggah.");
      return filePageUrl;
    } catch (error) {
      console.error("[ZippyShare] Gagal:", error.message);
      return {
        status: false,
        message: error.message
      };
    }
  }
}
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};
const upload = multer({
  limits: {
    fileSize: 1024 * 1024 * 1024
  },
  storage: multer.memoryStorage()
});
export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({
      error: `Metode ${req.method} tidak diizinkan`
    });
  }
  const uploader = new Uploader();
  if (req.method === "GET") {
    const availableHosts = Object.getOwnPropertyNames(Object.getPrototypeOf(uploader)).filter(fn => typeof uploader[fn] === "function" && fn !== "constructor" && !fn.startsWith("_"));
    return res.status(200).json({
      hosts: availableHosts
    });
  }
  try {
    let buffer;
    let fileName = "unknown_file";
    let host;
    const contentType = req.headers["content-type"] || "";
    if (contentType.startsWith("multipart/form-data")) {
      await new Promise((resolve, reject) => {
        upload.single("file")(req, res, err => {
          if (err) return reject(err);
          resolve();
        });
      });
      if (!req.file) {
        return res.status(400).json({
          error: "Field 'file' kosong."
        });
      }
      buffer = req.file.buffer;
      fileName = req.file.originalname;
      host = req.body.host || req.query.host || "Tmpfiles";
    } else {
      let rawBody = "";
      await new Promise((resolve, reject) => {
        req.on("data", chunk => rawBody += chunk.toString());
        req.on("end", resolve);
        req.on("error", reject);
      });
      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({
          error: "Gagal parsing JSON"
        });
      }
      host = parsed?.host || req.query.host || "Tmpfiles";
      const media = parsed?.file || parsed?.url;
      const urlRegex = /^https?:\/\/[^\s]+$/;
      const base64Regex = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/;
      if (!media) {
        return res.status(400).json({
          error: "Field file/url kosong"
        });
      }
      if (urlRegex.test(media)) {
        const {
          data
        } = await uploader._http.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(data);
        fileName = media.split("/").pop().split("?")[0] || fileName;
      } else if (base64Regex.test(media)) {
        const [, mimeType, base64Data] = media.match(base64Regex);
        buffer = Buffer.from(base64Data, "base64");
        const ext = mimeType.split("/")[1];
        fileName = `upload.${ext}`;
      } else {
        try {
          buffer = Buffer.from(media, "base64");
          fileName = "upload.bin";
        } catch (e) {
          return res.status(400).json({
            error: "Input bukan URL atau base64 yang valid"
          });
        }
      }
    }
    if (!buffer) {
      return res.status(400).json({
        error: "Buffer kosong. Tidak dapat memproses file."
      });
    }
    const availableHosts = Object.getOwnPropertyNames(Object.getPrototypeOf(uploader)).filter(fn => typeof uploader[fn] === "function" && fn !== "constructor" && !fn.startsWith("_"));
    if (!availableHosts.includes(host)) {
      return res.status(400).json({
        error: `Penyedia tidak valid. Gunakan salah satu: ${availableHosts.join(", ")}`
      });
    }
    console.log(`[Handler] Memproses unggahan ke ${host}...`);
    const result = await uploader[host](buffer, fileName);
    if (result && typeof result === "object" && result.status === false) {
      return res.status(500).json({
        error: `Gagal unggah ke ${host}: ${result.message}`
      });
    }
    const info = await uploader._getBufferInfo(buffer);
    return res.status(200).json({
      result: result,
      name: fileName,
      host: host,
      ...info
    });
  } catch (err) {
    console.error("[Handler] Terjadi kesalahan:", err.message);
    if (err.message.includes("too large")) {
      return res.status(413).json({
        error: `Payload terlalu besar. Batas platform terlampaui. Pesan: ${err.message}`
      });
    }
    return res.status(500).json({
      error: `Kesalahan server: ${err.message}`
    });
  }
}