import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const BASE = "https://www.mirrored.to";
class MirroredSolver {
  constructor(opts = {}) {
    this.jar = opts.jar ?? new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": opts.userAgent || UA,
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache"
      },
      timeout: opts.timeout ?? 6e4
    }));
  }
  log(...args) {
    console.log("[MirroredSolver]", ...args);
  }
  async get(url, config = {}) {
    try {
      this.log("GET", url);
      const res = await this.client.get(url, config);
      return res?.data ?? null;
    } catch (err) {
      this.log("GET failed ->", url, err?.message);
      return null;
    }
  }
  async post(url, data = {}, config = {}) {
    try {
      this.log("POST", url);
      const res = await this.client.post(url, new URLSearchParams(data), config);
      return res?.data ?? null;
    } catch (err) {
      this.log("POST failed ->", url, err?.message);
      return null;
    }
  }
  async _checkLink(checkParam, referer) {
    try {
      if (!checkParam) return "unknown";
      this.log(`Checking link status (param: ${checkParam.slice(0, 30)}...)`);
      const url = `${BASE}/checklink?lang=en&hash=${checkParam}`;
      const html = await this.get(url, {
        headers: {
          Referer: referer
        }
      });
      const $ = cheerio.load(html ?? "");
      const isOffline = $(".error").text().toLowerCase().includes("offline");
      const isOnline = $(".success").text().toLowerCase().includes("online");
      if (isOffline) return "offline";
      if (isOnline) return "online";
      return "unknown";
    } catch (err) {
      this.log("_checkLink error ->", err?.message);
      return "error";
    }
  }
  _extMulti(html) {
    try {
      this.log("Extracting multi links...");
      const $ = cheerio.load(html ?? "");
      return $('a[href*="_links"]').map((_, el) => $(el).attr("href")).get().filter(Boolean);
    } catch (err) {
      this.log("_extMulti error ->", err?.message);
      return [];
    }
  }
  _extMeta(html, url) {
    try {
      this.log("Extracting file meta...");
      const $ = cheerio.load(html ?? "");
      const dlHref = $("#download-link").attr("href") ?? null;
      const uid = url?.match(/\/(?:files|multilinks)\/([A-F0-9a-f]+)/i)?.[1] ?? null;
      const hash = dlHref?.match(/hash=([A-F0-9a-f=+|%]+)/i)?.[1] ?? null;
      const fname = $("h3.hdark").first().text()?.trim() || null;
      return {
        uid: uid,
        hash: hash,
        fname: fname,
        dlHref: dlHref
      };
    } catch (err) {
      this.log("_extMeta error ->", err?.message);
      return {
        uid: null,
        hash: null,
        fname: null,
        dlHref: null
      };
    }
  }
  _extStats(html) {
    try {
      this.log("Extracting mirstats url...");
      const m = html?.match(/ajaxRequest\.open\(\s*["']GET["']\s*,\s*["']([^"']+)["']/i);
      const path = m?.[1] ?? null;
      return path ? new URL(path, BASE).toString() : null;
    } catch (err) {
      this.log("_extStats error ->", err?.message);
      return null;
    }
  }
  _extHosts(html) {
    try {
      this.log("Extracting hosts table...");
      const $ = cheerio.load(html ?? "");
      return $("table.hoverable tbody tr").map((_, row) => {
        const $row = $(row);
        const name = $row.find('td[data-label="Host"] img').attr("alt")?.trim() ?? null;
        const $fileLinkCell = $row.find('td[data-label="File Link"]');
        const $linkA = $fileLinkCell.find("a[href]").first();
        const $linkForm = $fileLinkCell.find("form[action]").first();
        const isForm = $linkA.length === 0 && $linkForm.length > 0;
        const getlinkHref = $linkA.attr("href") ?? $linkForm.attr("action") ?? null;
        const formMethod = $linkForm.attr("method")?.toUpperCase() || "GET";
        const formData = {};
        if (isForm) {
          $linkForm.find("input[name]").each((_, inp) => {
            formData[$(inp).attr("name")] = $(inp).attr("value") ?? "";
          });
        }
        const checkOnclick = $row.find('td[data-label="Link Status"] a').attr("onclick") ?? "";
        const checkParam = checkOnclick.match(/showStatus\(\s*['"]([^'"]+)['"]/i)?.[1] ?? null;
        const status = $row.find('td[data-label="Upload Status"] span.id_Success, td[data-label="Upload Status"] span.id_Failed').text()?.trim() ?? null;
        const ok = status?.toLowerCase() === "success";
        return name && ok && getlinkHref ? {
          name: name,
          path: getlinkHref,
          checkParam: checkParam,
          method: isForm ? formMethod : "GET",
          formData: isForm ? formData : null
        } : null;
      }).get().filter(Boolean);
    } catch (err) {
      this.log("_extHosts error ->", err?.message);
      return [];
    }
  }
  _extFinal(html) {
    try {
      this.log("Extracting final link...");
      const $ = cheerio.load(html ?? "");
      const href = $('a[target="_blank"] button.get_btn').parent().attr("href") ?? $("code").first().text()?.trim() ?? null;
      return href;
    } catch (err) {
      this.log("_extFinal error ->", err?.message);
      return null;
    }
  }
  async resolveHost(host, referer) {
    try {
      this.log("Processing host ->", host.name);
      let status = "unknown";
      if (host.checkParam) {
        status = await this._checkLink(host.checkParam, referer);
      } else {
        this.log("No checkParam found for", host.name, "- skipping status check");
      }
      if (status === "offline") {
        this.log("Host", host.name, "is OFFLINE. Skipping resolve.");
        return {
          name: host.name,
          status: status,
          link: null
        };
      }
      const fullUrl = new URL(host.path, BASE).toString();
      const html = host.method === "POST" ? await this.post(fullUrl, host.formData ?? {}) : await this.get(fullUrl);
      const link = this._extFinal(html);
      this.log("Resolved", host.name, "->", link ? "SUCCESS" : "FAILED");
      return {
        name: host.name,
        status: status === "unknown" && link ? "online" : status,
        link: link
      };
    } catch (err) {
      this.log("resolveHost error ->", host.name, err?.message);
      return {
        name: host.name,
        status: "error",
        link: null
      };
    }
  }
  async resolveSingle(url) {
    try {
      this.log("Processing single file ->", url);
      const firstHtml = await this.get(url);
      const {
        uid,
        hash,
        fname
      } = this._extMeta(firstHtml, url);
      if (!uid || !hash) return {
        url: url,
        error: "Gagal extract uid/hash"
      };
      const dlUrl = `${BASE}/files/${uid}/?hash=${hash}&dl=0`;
      const dlHtml = await this.get(dlUrl);
      const mirstatsUrl = this._extStats(dlHtml);
      if (!mirstatsUrl) return {
        url: url,
        error: "Gagal extract mirstats"
      };
      const tableHtml = await this.get(mirstatsUrl, {
        headers: {
          Referer: dlUrl
        }
      });
      const hosts = this._extHosts(tableHtml);
      this.log("Hosts found ->", hosts.length);
      return {
        url: url,
        fname: fname,
        uid: uid,
        hosts: hosts,
        dlUrl: dlUrl
      };
    } catch (err) {
      this.log("resolveSingle error ->", err?.message);
      return {
        url: url,
        error: err?.message
      };
    }
  }
  async solve({
    url,
    host = "all"
  } = {}) {
    if (!url) return {
      status: false,
      error: "URL wajib diisi"
    };
    try {
      this.log("Starting solver for ->", url);
      const html = await this.get(url);
      const multiLinks = this._extMulti(html);
      const isMulti = multiLinks.length > 0;
      const targets = isMulti ? multiLinks : [url];
      this.log(isMulti ? "Mode: MULTI" : "Mode: SINGLE", "| Total target:", targets.length);
      const finalResult = [];
      for (const link of targets) {
        const data = await this.resolveSingle(link);
        if (data?.error || !data?.hosts) {
          finalResult.push({
            file_name: null,
            uid: null,
            source_url: link,
            error: data?.error || "Gagal memproses link",
            hosts: []
          });
          continue;
        }
        const availableHostNames = data.hosts.map(h => h.name);
        const targetHost = host?.toLowerCase();
        if (targetHost !== "all" && !availableHostNames.some(name => name?.toLowerCase().includes(targetHost))) {
          this.log(`Host "${host}" tidak ditemukan.`);
          finalResult.push({
            file_name: data.fname,
            uid: data.uid,
            source_url: link,
            error: `Host "${host}" tidak valid atau tidak tersedia.`,
            available_hosts: availableHostNames,
            hosts: []
          });
          continue;
        }
        const filtered = targetHost === "all" ? data.hosts : data.hosts.filter(h => h.name?.toLowerCase().includes(targetHost));
        const hostsArr = [];
        for (const h of filtered) {
          const r = await this.resolveHost(h, data.dlUrl);
          hostsArr.push({
            status: r.status,
            link: r.link,
            host: h.name
          });
        }
        finalResult.push({
          file_name: data.fname,
          uid: data.uid,
          source_url: link,
          hosts: hostsArr
        });
      }
      const finalStatus = finalResult.some(r => Array.isArray(r.hosts) && r.hosts.length > 0 && !r.error);
      return {
        status: finalStatus,
        total_files: finalResult.length,
        is_multi: isMulti,
        result: isMulti ? finalResult : finalResult[0]
      };
    } catch (err) {
      this.log("Solver fatal error ->", err?.message);
      return {
        status: false,
        error: err?.message,
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new MirroredSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat memproses URL"
    });
  }
}