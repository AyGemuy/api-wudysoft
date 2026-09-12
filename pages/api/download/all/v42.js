import axios from "axios";
import crypto from "crypto";
class GreenVideo {
  constructor() {
    try {
      this.base = "https://greenvideo.cc";
      this.token = "";
      this.cookies = {
        language: "cn",
        i18n_redirected: "cn"
      };
      this.k1 = "";
      this.k2 = "";
      this.iv = "kedou@8989!63233";
      this.ytHosts = ["youtube.com", "youtu.be"];
      this.dyHosts = ["douyin.com", "iesdouyin.com", "douyinvod.com", "douyinpic.com"];
      this.xgHosts = ["ixigua.com"];
      this._init();
    } catch (err) {
      console.log("[LOG] constructor: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  _init() {
    try {
      this.client = axios.create({
        baseURL: this.base,
        timeout: 18e4,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          kdsystem: "GreenVideo",
          "content-type": "application/json;charset=UTF-8",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.client.interceptors.request.use(config => {
        try {
          if (this.token) {
            config.headers["Authorization"] = `Bearer ${this.token}`;
          }
          const cookieArr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`);
          if (cookieArr.length > 0) {
            config.headers["cookie"] = cookieArr.join("; ");
          }
          return config;
        } catch (e) {
          console.log("[LOG] interceptor request: failed -", e?.message || e);
          return config;
        }
      }, err => Promise.resolve({
        error: true,
        message: err?.message || err
      }));
      this.client.interceptors.response.use(response => {
        try {
          const raw = response?.headers?.["set-cookie"] || [];
          raw.forEach(c => {
            const part = c.split(";")[0]?.split("=") || [];
            if (part[0]) {
              const key = part[0].trim();
              const val = (part.slice(1).join("=") || "").trim();
              this.cookies[key] = val;
            }
          });
          return response;
        } catch (e) {
          console.log("[LOG] interceptor response: failed -", e?.message || e);
          return response;
        }
      }, err => Promise.resolve(err?.response || {
        error: true,
        message: err?.message || err
      }));
    } catch (err) {
      console.log("[LOG] _init: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  _toSnake(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this._toSnake(item));
      }
      if (data !== null && typeof data === "object" && !(data instanceof Date) && !(data instanceof RegExp)) {
        return Object.keys(data).reduce((acc, key) => {
          const snakeKey = key.replace(/([a-z\d])([A-Z])/g, "$1_$2").replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1_$2").toLowerCase().replace(/-/g, "_");
          acc[snakeKey] = this._toSnake(data[key]);
          return acc;
        }, {});
      }
      return data;
    } catch (err) {
      console.log("[LOG] _toSnake: failed -", err?.message || err);
      return data;
    }
  }
  _chk(url) {
    try {
      if (!url) return false;
      const target = url.trim().toLowerCase();
      const match = hosts => {
        if (hosts.some(h => target.includes(h))) return true;
        try {
          const u = new URL(target.startsWith("http") ? target : `https://${target}`);
          const host = u.hostname.replace(/^www\./, "");
          return hosts.some(h => host === h || host.endsWith(`.${h}`));
        } catch {
          return false;
        }
      };
      if (match(this.ytHosts)) {
        return "油管最近风控增强，当前站先暂停解析YouTube一阵子，我们尽快回来";
      }
      if (match(this.dyHosts) || match(this.xgHosts)) {
        return "应相关要求，本站已暂停对该类链接的解析服务";
      }
      return null;
    } catch (err) {
      console.log("[LOG] _chk: failed -", err?.message || err);
      return null;
    }
  }
  _fmtPem(pubKey) {
    try {
      const clean = (pubKey || "").replace(/(-----(BEGIN|END) PUBLIC KEY-----|\s)/g, "");
      const chunks = clean.match(/.{1,64}/g)?.join("\n") || clean;
      return `-----BEGIN PUBLIC KEY-----\n${chunks}\n-----END PUBLIC KEY-----`;
    } catch (err) {
      console.log("[LOG] _fmtPem: failed -", err?.message || err);
      return pubKey;
    }
  }
  _rsaEnc(data, pubKey) {
    try {
      const pem = this._fmtPem(pubKey);
      const keyObj = crypto.createPublicKey(pem);
      const modLen = keyObj?.asymmetricKeyDetails?.modulusLength ? keyObj.asymmetricKeyDetails.modulusLength / 8 : 128;
      const chunkSize = modLen - 11;
      const buf = Buffer.from(data, "utf8");
      const chunks = [];
      for (let i = 0; i < buf.length; i += chunkSize) {
        const chunk = buf.subarray(i, i + chunkSize);
        const enc = crypto.publicEncrypt({
          key: pem,
          padding: crypto.constants.RSA_PKCS1_PADDING
        }, chunk);
        chunks.push(enc);
      }
      return Buffer.concat(chunks).toString("base64");
    } catch (err) {
      console.log("[LOG] _rsaEnc: failed -", err?.message || err);
      return null;
    }
  }
  _rsaDec(data, pubKey) {
    try {
      const pem = this._fmtPem(pubKey);
      const buf = Buffer.from(data, "base64");
      const dec = crypto.publicDecrypt({
        key: pem,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, buf);
      return dec.toString("utf8");
    } catch {
      return data;
    }
  }
  _aesEnc(text, key, ivStr) {
    try {
      const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key.padEnd(16, "\0").slice(0, 16), "utf8"), Buffer.from(ivStr.slice(0, 16), "utf8"));
      let encrypted = cipher.update(text, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (err) {
      console.log("[LOG] _aesEnc: failed -", err?.message || err);
      return null;
    }
  }
  async _enc(payload) {
    try {
      if (!this.k1 || !this.k2) {
        await this.keys();
      }
      const rawJson = typeof payload === "string" ? payload : JSON.stringify(payload);
      const decKey = this._rsaDec(this.k2, this.k1);
      const aesResult = this._aesEnc(rawJson, decKey, this.iv);
      return this._rsaEnc(aesResult, this.k1);
    } catch (err) {
      console.log("[LOG] _enc: failed -", err?.message || err);
      return null;
    }
  }
  async _req(path, opts = {}) {
    try {
      const isEncrypted = path.includes("/video/cnSimpleExtract") || path.includes("/video/extract/v2") || path.includes("/message/report");
      let config = {
        url: path,
        method: opts?.method ? opts.method.toLowerCase() : "get",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          ...opts?.headers || {}
        },
        ...opts
      };
      if (isEncrypted && opts?.data) {
        const encryptedData = await this._enc(opts.data);
        config.data = JSON.stringify(encryptedData);
      }
      let res = await this.client.request(config);
      if (res?.data?.code === 530 && isEncrypted) {
        console.log("[LOG] key expired: refreshing");
        await this.keys();
        const encryptedData = await this._enc(opts.data);
        config.data = JSON.stringify(encryptedData);
        res = await this.client.request(config);
      }
      return res?.data;
    } catch (err) {
      const serverMsg = err?.response?.data?.message || JSON.stringify(err?.response?.data) || err?.message;
      return {
        error: true,
        message: serverMsg
      };
    }
  }
  async keys(rest = {}) {
    try {
      const res = await this._req("/api/auth/keys", {
        method: "get",
        ...rest
      });
      if (res?.code === 200) {
        this.k1 = res?.data?.k1 || "";
        this.k2 = res?.data?.k2 || "";
        console.log("[LOG] keys: success");
        return {
          ...res?.data
        };
      }
      console.log("[LOG] keys: failed -", res?.message || "unknown");
      return {
        error: true,
        message: res?.message || "Gagal mendapatkan keys"
      };
    } catch (err) {
      console.log("[LOG] keys: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async saveSec(body = {}, rest = {}) {
    try {
      const res = await this._req("/api/secret/save", {
        method: "post",
        data: {
          ...body,
          ...rest
        }
      });
      console.log("[LOG] saveSec:", res?.code === 200 ? "success" : "failed");
      return {
        ...res
      };
    } catch (err) {
      console.log("[LOG] saveSec: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async report(body = {}, rest = {}) {
    try {
      const res = await this._req("/api/message/report", {
        method: "post",
        data: {
          ...body,
          ...rest
        }
      });
      console.log("[LOG] report:", res?.code === 200 ? "success" : "failed");
      return {
        ...res
      };
    } catch (err) {
      console.log("[LOG] report: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async ext(url, rest = {}) {
    try {
      const res = await this._req("/api/video/cnSimpleExtract", {
        method: "post",
        data: {
          url: url?.trim() || "",
          ...rest
        }
      });
      if (res?.code === 200) {
        console.log("[LOG] ext: success");
        return {
          ...res?.data
        };
      }
      return {
        error: true,
        message: res?.message || "Gagal cnSimpleExtract"
      };
    } catch (err) {
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async extV2(url, rest = {}) {
    try {
      const res = await this._req("/api/video/extract/v2", {
        method: "post",
        data: {
          url: url?.trim() || "",
          ...rest
        }
      });
      if (res?.code === 200) {
        console.log("[LOG] extV2: success");
        return {
          ...res?.data
        };
      }
      return {
        error: true,
        message: res?.message || "Gagal extract/v2"
      };
    } catch (err) {
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async task(params = {}, rest = {}) {
    try {
      const res = await this._req("/api/video/doDownload", {
        method: "post",
        data: {
          host: params?.host || "",
          vid: params?.vid || "",
          quality: params?.quality !== undefined ? params.quality : 0,
          ...rest
        }
      });
      return {
        ...res?.data
      };
    } catch (err) {
      console.log("[LOG] task: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async info(params = {}, rest = {}) {
    try {
      const res = await this._req("/api/video/getDownloadInfo", {
        method: "post",
        data: {
          host: params?.host || "",
          vid: params?.vid || "",
          quality: params?.quality !== undefined ? params.quality : 0,
          ...rest
        }
      });
      return {
        ...res?.data
      };
    } catch (err) {
      console.log("[LOG] info: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async poll(params = {}, rest = {}, delay = 3e3, maxRetries = 60) {
    try {
      let retries = 0;
      while (retries < maxRetries) {
        const taskRes = await this.task(params, rest);
        const st = taskRes?.status;
        const prg = taskRes?.progress || 0;
        console.log(`[LOG] poll: ${prg}% (status: ${st})`);
        if (st === 2 && prg === 100) {
          console.log("[LOG] poll: success (100%)");
          const finalInfo = await this.info(params, rest);
          return {
            ...taskRes,
            ...finalInfo
          };
        }
        if (st === 3 || st === 4 || st === 5) {
          console.log(`[LOG] poll: failed (status: ${st})`);
          return {
            error: true,
            status: st
          };
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      console.log("[LOG] poll: timeout");
      return {
        error: true,
        message: "Polling timeout"
      };
    } catch (err) {
      console.log("[LOG] poll: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
      };
    }
  }
  async download({
    url,
    quality,
    ...rest
  }) {
    try {
      if (!url) {
        console.log("[LOG] download: failed - url is required");
        return {
          error: true,
          message: "url is required"
        };
      }
      console.log("[LOG] download: start");
      const warn = this._chk(url);
      if (warn) {
        console.log("[LOG] download: blocked link -", warn);
        return {
          error: true,
          message: warn
        };
      }
      let extRes = await this.extV2(url, rest);
      if (extRes?.error || !extRes?.host) {
        const fallback = await this.ext(url, rest);
        if (!fallback?.error) {
          extRes = fallback;
        }
      }
      if (extRes?.error) {
        console.log("[LOG] extract: failed -", extRes?.message || "Data processing error");
        return this._toSnake({
          url: url,
          ...extRes,
          ...rest
        });
      }
      const rawItems = [...extRes?.videoItemVoList || [], ...extRes?.video_item_vo_list || [], ...extRes?.videoInfoVoList?.flatMap(v => v?.videoItemVoList || []) || [], ...extRes?.videoListItemVoList || []];
      const items = [];
      const seen = new Set();
      for (const it of rawItems) {
        const key = `${it?.quality}_${it?.qualityAlias || it?.title || it?.vid || it?.baseUrl}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push(it);
        }
      }
      const targetItem = quality ? items.find(x => x?.quality === quality || String(x?.qualityAlias || "").toLowerCase().includes(String(quality).toLowerCase())) || items[0] : items[0];
      const host = extRes?.host || rest?.host || "";
      const vid = extRes?.vid || rest?.vid || "";
      let pollRes = {};
      let isDirect = false;
      if (targetItem?.baseUrl) {
        const isDouyin = host.includes("douyin");
        const isVod = targetItem.baseUrl.includes("v3-web.douyinvod.com");
        if (isDouyin && isVod || targetItem?.canDirectDownload) {
          console.log("[LOG] direct download: detected");
          isDirect = true;
          pollRes = {
            download_url: targetItem.baseUrl,
            play_url: targetItem.baseUrl,
            can_download_video: true,
            status: 2,
            progress: 100
          };
        }
      }
      if (!isDirect && targetItem && host && vid) {
        const q = targetItem?.quality !== undefined ? targetItem.quality : 0;
        const pollParams = {
          host: host,
          vid: vid,
          quality: q
        };
        console.log(`[LOG] quality selected: ${targetItem?.quality || q} (${targetItem?.qualityAlias || "media"})`);
        pollRes = await this.poll(pollParams, rest);
      }
      const updatedItems = items.map(it => {
        if (it === targetItem) {
          return {
            ...it,
            ...pollRes?.error ? {} : pollRes
          };
        }
        return it;
      });
      const mergedResult = {
        url: url,
        ...extRes,
        ...pollRes?.error ? {} : pollRes,
        video_item_vo_list: updatedItems.length > 0 ? updatedItems : extRes?.videoItemVoList || [],
        ...rest
      };
      console.log("[LOG] download: done");
      return this._toSnake(mergedResult);
    } catch (err) {
      console.log("[LOG] download: failed -", err?.message || err);
      return {
        error: true,
        message: err?.message || err
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
  const api = new GreenVideo();
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