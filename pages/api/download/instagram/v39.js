import axios from "axios";
import crypto from "crypto";
class SaveFromIns {
  constructor() {
    try {
      this.baseURL = "https://api.savefromins.com/api/contentsite_api";
      this.timeout = 6e4;
      this.auth = "20250901majwlqo";
      this.domain = "api-ak.savefromins.com";
      const k1 = "f8a1c2d4".repeat(4);
      const k2 = "rz18efAX" + "UbdiaO7k";
      this.keys = [k1, k2];
      this.http = axios.create({
        baseURL: this.baseURL,
        timeout: this.timeout,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://savefromins.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://savefromins.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("[LOG] Instance SaveFromIns berhasil diinisialisasi.");
    } catch (err) {
      console.error(`[ERROR] Gagal inisialisasi constructor: ${err?.message}`);
    }
  }
  dCrypt(cipherText, keyStr) {
    try {
      const keyBuf = Buffer.from(keyStr, "utf8");
      const ivBuf = Buffer.from(keyStr.slice(0, 16), "utf8");
      const algo = keyBuf.length === 32 ? "aes-256-cbc" : "aes-128-cbc";
      const decipher = crypto.createDecipheriv(algo, keyBuf, ivBuf);
      decipher.setAutoPadding(false);
      const raw = Buffer.concat([decipher.update(Buffer.from(cipherText, "base64")), decipher.final()]).toString("utf8");
      return raw.replace(/\0+$/, "");
    } catch (err) {
      return null;
    }
  }
  dec(str) {
    try {
      if (typeof str !== "string") return str;
      const cleanStr = str.trim();
      for (const k of this.keys) {
        const decrypted = this.dCrypt(cleanStr, k);
        if (decrypted) {
          try {
            return JSON.parse(decrypted);
          } catch {
            return decrypted;
          }
        }
      }
      return str;
    } catch (err) {
      console.error(`[ERROR] Gagal proses dekripsi: ${err?.message}`);
      return str;
    }
  }
  pUrl(input) {
    try {
      console.log(`[LOG] Memvalidasi input URL/Username: "${input}"`);
      let u = (input || "").toString().trim();
      if (!u) return null;
      if (!/^https?:\/\//i.test(u) && !u.includes("instagram.com")) {
        u = u.replace(/^@/, "");
        return {
          type: "profile",
          url: `https://www.instagram.com/${u}`
        };
      }
      if (!/^https?:\/\//i.test(u)) {
        u = `https://${u}`;
      }
      const parsed = new URL(u);
      const path = parsed.pathname.toLowerCase();
      let type = "media";
      if (/^\/reels?\/[\w-]+\/?$/.test(path)) type = "reels";
      else if (/^\/stories\/[\w.-]+\/\d+\/?$/.test(path) || /^\/stories\/highlights\/[\w-]+\/?$/.test(path)) type = "story";
      else if (/^\/p\/[\w-]+\/?$/.test(path)) type = "post";
      else if (/^\/[\w.-]+\/?$/.test(path)) type = "profile";
      return {
        type: type,
        url: u
      };
    } catch (err) {
      console.error(`[ERROR] URL tidak valid: ${err?.message}`);
      return null;
    }
  }
  async req(endpoint, payloadObj = {}) {
    try {
      console.log(`[LOG] Mengirim request ke /${endpoint}...`);
      const bodyParams = new URLSearchParams({
        auth: this.auth,
        domain: this.domain,
        ...payloadObj
      });
      const response = await this.http.post(`/${endpoint}`, bodyParams.toString());
      let resData = response?.data;
      if (resData?.status === 1 && typeof resData?.data === "string") {
        console.log("[LOG] Mendekripsi data response AES...");
        resData = {
          ...resData,
          data: this.dec(resData.data)
        };
      }
      return resData;
    } catch (err) {
      console.error(`[ERROR] Request ke /${endpoint} gagal: ${err?.response?.data || err?.message}`);
      return {
        status: 0,
        msg: err?.message || "Request Failed",
        data: null
      };
    }
  }
  async rLink(resContent) {
    try {
      if (!resContent) return null;
      console.log("[LOG] Mengambil direct download link dari resource_content...");
      const res = await this.req("media/download", {
        request: resContent
      });
      return res?.data?.download_link || null;
    } catch (err) {
      console.error(`[ERROR] Gagal resolve resource download: ${err?.message}`);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[LOG] Memulai proses download untuk URL: ${url}`);
      const target = this.pUrl(url);
      if (!target?.url) {
        throw new Error("URL atau Username Instagram tidak valid");
      }
      let rawResult = null;
      if (target.type === "profile") {
        console.log("[LOG] Mendeteksi tipe Profile. Memanggil media/blogger_parse...");
        const profileRes = await this.req("media/blogger_parse", {
          link: target.url
        });
        if (profileRes?.status === 1 && profileRes?.data) {
          const {
            uid,
            site_name
          } = profileRes.data;
          console.log(`[LOG] Profil ditemukan: ${profileRes.data.username || uid}. Mengambil daftar postingan...`);
          const postsRes = await this.req("media/posts_parse", {
            site_name: site_name || "instagram",
            uid: uid || "",
            cursor: "",
            type: "posts"
          });
          rawResult = {
            status: 1,
            data: {
              blogger: profileRes.data,
              posts: postsRes?.data?.items || []
            }
          };
        } else {
          rawResult = profileRes;
        }
      } else {
        console.log("[LOG] Mendeteksi media link. Memanggil media/parse...");
        rawResult = await this.req("media/parse", {
          origin: "source",
          link: target.url
        });
      }
      if (rawResult?.status !== 1 || !rawResult?.data) {
        throw new Error(rawResult?.msg || "Gagal mem-parsing media dari Instagram");
      }
      const data = rawResult.data;
      const downloads = [];
      const mediaList = Array.isArray(data?.media) ? data.media : [];
      for (const item of mediaList) {
        const resources = Array.isArray(item?.resources) ? item.resources : [];
        const resList = [];
        for (const res of resources) {
          let directUrl = res?.download_url || null;
          if (!directUrl && res?.resource_content) {
            directUrl = await this.rLink(res.resource_content);
          }
          resList.push({
            quality: res?.quality || "default",
            format: res?.format || "mp4",
            download_url: directUrl || res?.preview_url || null
          });
        }
        downloads.push({
          id: item?.media_id || item?.id || null,
          type: item?.type || "video",
          thumbnail: item?.thumbnail || data?.thumbnail || null,
          sources: resList
        });
      }
      console.log(`[LOG] Selesai memproses. Total ${downloads.length} media berhasil didapatkan.`);
      return {
        success: true,
        title: data?.title || data?.caption || "",
        thumbnail: data?.thumbnail || null,
        like_count: data?.like_count ?? null,
        comment_count: data?.comment_count ?? null,
        publish_ts: data?.publish_ts || null,
        media: downloads,
        raw: data
      };
    } catch (err) {
      console.error(`[ERROR] Download gagal: ${err?.message}`);
      return {
        success: false,
        error: err?.message || "Unknown error occurred",
        media: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SaveFromIns();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}