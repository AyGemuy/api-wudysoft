import axios from "axios";
import {
  EventSource
} from "eventsource";
const BASE = "https://apkdl.dietdroid.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const HDR = {
  "accept-language": "id-ID",
  referer: `${BASE}/`,
  "user-agent": UA,
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"'
};
class ApkDl {
  constructor() {
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        ...HDR,
        "sec-fetch-site": "same-origin"
      }
    });
  }
  id(str) {
    try {
      if (!str) return null;
      const match = str.match(/id=([a-zA-Z0-9_.]+)/);
      return match ? match[1] : str.trim();
    } catch (e) {
      console.error("[ID_ERR]", e.message);
      return null;
    }
  }
  _query(params) {
    const q = new URLSearchParams(params).toString();
    return q ? `?${q}` : "";
  }
  async sse(path, onMsg) {
    return new Promise((resolve, reject) => {
      const url = `${BASE}${path}`;
      console.log(`[SSE_CONN] ${url}`);
      const es = new EventSource(url, {
        headers: {
          ...HDR,
          accept: "text/event-stream"
        }
      });
      const timeout = setTimeout(() => {
        es.close();
        reject(new Error("SSE_TIMEOUT"));
      }, 3e5);
      es.onmessage = e => {
        try {
          const d = JSON.parse(e.data);
          const res = onMsg(d, es);
          if (res) {
            clearTimeout(timeout);
            resolve(res);
          }
        } catch (err) {
          clearTimeout(timeout);
          es.close();
          reject(err);
        }
      };
      es.onerror = err => {
        clearTimeout(timeout);
        es.close();
        reject(new Error(`SSE_ERR: ${err.message || "Connection lost"}`));
      };
    });
  }
  async info(pkg, arch, extra = {}) {
    try {
      const queryParams = this._query({
        arch: arch,
        ...extra,
        _: Date.now()
      });
      const path = `/api/download-info-stream/${encodeURIComponent(pkg)}${queryParams}`;
      return await this.sse(path, (d, es) => {
        if (d.type === "error") {
          es.close();
          throw new Error(d.message);
        }
        if (d.type === "success") {
          es.close();
          return {
            ...d,
            splits: (d.splits || []).map(s => ({
              ...s,
              is_config: s.name?.startsWith("config.")
            })),
            total_files: 1 + (d.splits?.length || 0)
          };
        }
        return null;
      });
    } catch (e) {
      throw e;
    }
  }
  async merge(pkg, arch, extra = {}) {
    try {
      const queryParams = this._query({
        arch: arch,
        ...extra,
        _: Date.now()
      });
      const path = `/api/download-merged-stream/${encodeURIComponent(pkg)}${queryParams}`;
      return await this.sse(path, (d, es) => {
        if (d.type === "error") {
          es.close();
          throw new Error(d.message);
        }
        if (d.type === "success") {
          es.close();
          return {
            ...d
          };
        }
        return null;
      });
    } catch (e) {
      throw e;
    }
  }
  temp(id) {
    return `${BASE}/api/download-temp/${id}`;
  }
  async download({
    query,
    merge = false,
    arch = "arm64-v8a",
    ...rest
  }) {
    try {
      const pkg = this.id(query);
      if (!pkg) throw new Error("Invalid Package ID");
      const infoData = await this.info(pkg, arch, rest);
      if (!infoData.splits?.length || !merge) {
        return {
          status: true,
          type: "single",
          pkg: pkg,
          arch: arch,
          ...infoData,
          dl_url: infoData.downloadUrl
        };
      }
      const mergedData = await this.merge(pkg, arch, rest);
      const finalUrl = this.temp(mergedData.download_id);
      return {
        status: true,
        type: "merged",
        pkg: pkg,
        arch: arch,
        meta: {
          ...infoData
        },
        ...mergedData,
        dl_url: finalUrl
      };
    } catch (err) {
      return {
        status: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan",
      example: "com.whatsapp"
    });
  }
  const api = new ApkDl();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}