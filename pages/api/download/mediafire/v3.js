import cloudscraper from "cloudscraper";
import * as cheerio from "cheerio";
class Mediafire {
  constructor() {
    this.api = "https://www.mediafire.com/api/1.5";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      Accept: "application/json,text/html,*/*",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
    };
  }
  _byte(b) {
    try {
      if (!b || isNaN(b)) return null;
      const s = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(b) / Math.log(1024));
      return (b / Math.pow(1024, i)).toFixed(2) + " " + s[i];
    } catch (err) {
      console.error(`[MF] Byte err: ${err.message}`);
      return null;
    }
  }
  async _link(k) {
    try {
      console.log(`[MF] Link: ${k}`);
      const pageUrl = `https://www.mediafire.com/file/${k}`;
      const jar = cloudscraper.jar();
      const html = await cloudscraper({
        method: "GET",
        url: pageUrl,
        headers: this.headers,
        jar: jar,
        followAllRedirects: true
      });
      let m = html.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
      if (m) return m[0];
      const $ = cheerio.load(html);
      let href = $("#downloadButton, .popsok").attr("href");
      if (href?.startsWith("//")) href = "https:" + href;
      if (href && (href.includes("dkey=") || href.includes("/file/"))) {
        const html2 = await cloudscraper({
          method: "GET",
          url: href,
          headers: {
            ...this.headers,
            Referer: pageUrl
          },
          jar: jar,
          followAllRedirects: true
        });
        m = html2.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
        if (m) return m[0];
        const $2 = cheerio.load(html2);
        const href2 = $2("#downloadButton, .popsok").attr("href");
        if (href2) return href2.startsWith("//") ? "https:" + href2 : href2;
      }
      return href || pageUrl;
    } catch (err) {
      console.error(`[MF] Link err (${k}): ${err.message}`);
      return `https://www.mediafire.com/file/${k}`;
    }
  }
  async _chunk(k, type = "files") {
    try {
      const items = [];
      let chunk = 1;
      let more = true;
      while (more) {
        console.log(`[MF] API Get ${type} (${k}) chunk ${chunk}`);
        const res = await cloudscraper({
          method: "GET",
          url: `${this.api}/folder/get_content.php`,
          qs: {
            folder_key: k,
            response_format: "json",
            content_type: type,
            filter: "all",
            order_by: "name",
            order_direction: "asc",
            chunk: chunk,
            version: "1.5",
            r: Math.random().toString(36).slice(2)
          },
          headers: this.headers,
          json: true
        });
        const data = typeof res === "string" ? JSON.parse(res) : res;
        const content = data?.response?.folder_content;
        if (!content) break;
        const list = content[type] || [];
        items.push(...list);
        more = content.more_chunks === "yes";
        chunk++;
      }
      return items;
    } catch (err) {
      console.error(`[MF] Chunk err (${k} - ${type}): ${err.message}`);
      return [];
    }
  }
  async _file(k) {
    try {
      console.log(`[MF] API File info: ${k}`);
      const res = await cloudscraper({
        method: "GET",
        url: `${this.api}/file/get_info.php`,
        qs: {
          quick_key: k,
          response_format: "json"
        },
        headers: this.headers,
        json: true
      });
      const data = typeof res === "string" ? JSON.parse(res) : res;
      const info = data?.response?.file_info;
      if (!info || info.ready !== "yes") {
        return {
          status: false,
          error: data?.response?.message || "File tidak ditemukan"
        };
      }
      const dl = await this._link(k);
      return {
        status: true,
        result: {
          type: "file",
          key: info.quickkey,
          name: info.filename,
          size: this._byte(info.size),
          raw_size: parseInt(info.size, 10),
          extension: info.filename?.split(".").pop() || null,
          mimetype: info.mimetype || null,
          uploaded: info.created,
          downloads: parseInt(info.downloads, 10) || 0,
          url: info.links?.normal_download || `https://www.mediafire.com/file/${k}`,
          download: dl
        }
      };
    } catch (err) {
      console.error(`[MF] File err (${k}): ${err.message}`);
      return {
        status: false,
        error: err.message
      };
    }
  }
  async _folder(k, rec = true, path = "") {
    try {
      console.log(`[MF] API Folder info: ${k} [rekursif: ${rec}]`);
      let folderInfo = {};
      try {
        const res = await cloudscraper({
          method: "GET",
          url: `${this.api}/folder/get_info.php`,
          qs: {
            folder_key: k,
            response_format: "json"
          },
          headers: this.headers,
          json: true
        });
        const data = typeof res === "string" ? JSON.parse(res) : res;
        folderInfo = data?.response?.folder_info || {};
      } catch (e) {
        console.error(`[MF] Folder info err: ${e.message}`);
      }
      const folderName = folderInfo.name || "Root";
      const curPath = path ? `${path}/${folderName}` : folderName;
      const rawFiles = await this._chunk(k, "files");
      const rawFolders = await this._chunk(k, "folders");
      const files = rawFiles.map(f => ({
        key: f.quickkey,
        name: f.filename,
        size: this._byte(f.size),
        raw_size: parseInt(f.size, 10),
        extension: f.filename?.split(".").pop() || null,
        mimetype: f.mimetype || null,
        uploaded: f.created || null,
        downloads: parseInt(f.downloads, 10) || 0,
        url: f.links?.normal_download || `https://www.mediafire.com/file/${f.quickkey}`,
        path: curPath
      }));
      const subFolders = [];
      if (rec && rawFolders.length > 0) {
        for (const sub of rawFolders) {
          const subRes = await this._folder(sub.folderkey, rec, curPath);
          if (subRes.status) {
            subFolders.push(subRes.result);
          } else {
            subFolders.push({
              type: "folder",
              key: sub.folderkey,
              name: sub.name,
              error: "Gagal memproses subfolder"
            });
          }
        }
      } else {
        rawFolders.forEach(sub => {
          subFolders.push({
            type: "folder",
            key: sub.folderkey,
            name: sub.name,
            uploaded: sub.created,
            file_count: parseInt(sub.file_count, 10) || 0,
            folder_count: parseInt(sub.folder_count, 10) || 0,
            url: `https://www.mediafire.com/folder/${sub.folderkey}`
          });
        });
      }
      return {
        status: true,
        result: {
          type: "folder",
          key: k,
          name: folderName,
          path: curPath,
          url: `https://www.mediafire.com/folder/${k}`,
          file_count: files.length,
          folder_count: subFolders.length,
          files: files,
          folders: subFolders
        }
      };
    } catch (err) {
      console.error(`[MF] Folder err (${k}): ${err.message}`);
      return {
        status: false,
        error: err.message
      };
    }
  }
  async download({
    url,
    rec = true
  }) {
    try {
      console.log(`[MF] Start: ${url}`);
      if (!url || typeof url !== "string" || !url.includes("mediafire.com")) {
        return {
          status: false,
          error: "Bukan URL MediaFire yang valid"
        };
      }
      const fileMatch = url.match(/\/file\/([a-z0-9]+)/i);
      if (fileMatch) return await this._file(fileMatch[1]);
      const folderMatch = url.match(/\/folder\/([a-z0-9]+)/i);
      if (folderMatch) return await this._folder(folderMatch[1], rec);
      return {
        status: false,
        error: "Format URL MediaFire tidak dikenali"
      };
    } catch (err) {
      console.error(`[MF] Main err: ${err.message}`);
      return {
        status: false,
        error: err.message
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
  const api = new Mediafire();
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