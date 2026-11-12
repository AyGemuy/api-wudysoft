import cloudscraper from "cloudscraper";
import * as cheerio from "cheerio";
class Mediafire {
  constructor() {
    this.api = "https://www.mediafire.com/api/1.5";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
    };
  }
  async _link(k) {
    try {
      console.log(`[MF] Resolve direct link: ${k}`);
      const pageUrl = `https://www.mediafire.com/file/${k}`;
      const jar = cloudscraper.jar();
      const html = await cloudscraper({
        method: "GET",
        url: pageUrl,
        headers: this.headers,
        jar: jar,
        followAllRedirects: true
      });
      let match = html.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
      if (match) return match[0];
      const $ = cheerio.load(html);
      let href = $("#downloadButton").attr("href") || $("a.input.popsok").attr("href");
      if (href?.startsWith("//")) href = "https:" + href;
      if (href && (href.includes("dkey=") || href.includes("mediafire.com/file/"))) {
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
        match = html2.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
        if (match) return match[0];
        const $2 = cheerio.load(html2);
        const href2 = $2("#downloadButton").attr("href") || $2("a.input.popsok").attr("href");
        if (href2) return href2.startsWith("//") ? "https:" + href2 : href2;
      }
      return href || pageUrl;
    } catch (err) {
      console.error(`[MF] Direct link error (${k}): ${err.message}`);
      return `https://www.mediafire.com/file/${k}`;
    }
  }
  async _chunk(k, t = "files") {
    try {
      const items = [];
      let chunk = 1;
      let more = true;
      while (more) {
        console.log(`[MF] Fetch ${t} chunk ${chunk} (${k})`);
        const res = await cloudscraper({
          method: "GET",
          url: `${this.api}/folder/get_content.php`,
          qs: {
            folder_key: k,
            response_format: "json",
            content_type: t,
            filter: "all",
            order_by: "name",
            order_direction: "asc",
            chunk: chunk,
            version: "1.5",
            r: Math.random().toString(36).slice(2)
          },
          json: true
        });
        const data = typeof res === "string" ? JSON.parse(res) : res;
        const content = data?.response?.folder_content;
        if (!content) break;
        items.push(...content[t] || []);
        more = content.more_chunks === "yes";
        chunk++;
      }
      return items;
    } catch (err) {
      console.error(`[MF] Chunk error (${k} - ${t}): ${err.message}`);
      return [];
    }
  }
  _parse(html) {
    try {
      console.log(`[MF] Fallback HTML parsing`);
      const $ = cheerio.load(html);
      const folders = [];
      const files = [];
      $("#main_list li.row_container").each((_, el) => {
        const $el = $(el);
        const key = $el.attr("data-key");
        const name = $el.find(".item-name").text().trim();
        const created = $el.find(".file_maindetails .created").text().trim();
        const size = $el.find(".file_maindetails .size").text().trim();
        if ($el.hasClass("folder")) {
          folders.push({
            folderkey: key,
            name: name,
            created: created,
            url: `https://www.mediafire.com/folder/${key}`
          });
        } else if ($el.hasClass("file")) {
          const url = $el.find("a.thumbnailClickArea").attr("href") || `https://www.mediafire.com/file/${key}`;
          files.push({
            quickkey: key,
            filename: name,
            size: size,
            created: created,
            url: url
          });
        }
      });
      return {
        folders: folders,
        files: files
      };
    } catch (err) {
      console.error(`[MF] HTML parse error: ${err.message}`);
      return {
        folders: [],
        files: []
      };
    }
  }
  async file(k) {
    try {
      console.log(`[MF] Fetch file info: ${k}`);
      const res = await cloudscraper({
        method: "GET",
        url: `${this.api}/file/get_info.php`,
        qs: {
          quick_key: k,
          response_format: "json"
        },
        json: true
      });
      const data = typeof res === "string" ? JSON.parse(res) : res;
      const info = data?.response?.file_info;
      if (!info || info.ready !== "yes") {
        return {
          status: false,
          error: data?.response?.message || "File tidak ditemukan/belum siap"
        };
      }
      const dl = await this._link(k);
      return {
        status: true,
        result: {
          type: "file",
          ...info,
          download: dl
        }
      };
    } catch (err) {
      console.error(`[MF] File error (${k}): ${err.message}`);
      return {
        status: false,
        error: err.message
      };
    }
  }
  async folder(k, rec = true, path = "") {
    try {
      console.log(`[MF] Fetch folder: ${k} [rekursif: ${rec}]`);
      let info = {};
      try {
        const res = await cloudscraper({
          method: "GET",
          url: `${this.api}/folder/get_info.php`,
          qs: {
            folder_key: k,
            response_format: "json"
          },
          json: true
        });
        const data = typeof res === "string" ? JSON.parse(res) : res;
        info = data?.response?.folder_info || {};
      } catch (e) {
        console.error(`[MF] Folder info warning: ${e.message}`);
      }
      const name = info.name || "Root";
      const curPath = path ? `${path}/${name}` : name;
      let files = await this._chunk(k, "files");
      let folders = await this._chunk(k, "folders");
      if (!files.length && !folders.length) {
        try {
          const html = await cloudscraper({
            method: "GET",
            url: `https://www.mediafire.com/folder/${k}`,
            headers: this.headers
          });
          const parsed = this._parse(html);
          files = parsed.files;
          folders = parsed.folders;
        } catch (e) {
          console.error(`[MF] Scrape fallback warning: ${e.message}`);
        }
      }
      const formattedFiles = files.map(f => ({
        quickkey: f.quickkey,
        filename: f.filename || f.name,
        size: f.size,
        created: f.created,
        url: f.url || `https://www.mediafire.com/file/${f.quickkey}`,
        path: curPath
      }));
      const subFolders = [];
      if (rec && folders.length > 0) {
        for (const sub of folders) {
          const subRes = await this.folder(sub.folderkey, rec, curPath);
          if (subRes.status) {
            subFolders.push(subRes.result);
          } else {
            subFolders.push({
              folderkey: sub.folderkey,
              name: sub.name,
              error: "Gagal mengambil subfolder"
            });
          }
        }
      } else {
        folders.forEach(sub => {
          subFolders.push({
            folderkey: sub.folderkey,
            name: sub.name,
            url: `https://www.mediafire.com/folder/${sub.folderkey}`
          });
        });
      }
      return {
        status: true,
        result: {
          type: "folder",
          folderkey: k,
          name: name,
          path: curPath,
          file_count: formattedFiles.length,
          folder_count: subFolders.length,
          files: formattedFiles,
          folders: subFolders
        }
      };
    } catch (err) {
      console.error(`[MF] Folder error (${k}): ${err.message}`);
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
      console.log(`[MF] Start process: ${url}`);
      if (!url || typeof url !== "string" || !url.includes("mediafire.com")) {
        return {
          status: false,
          error: "Bukan URL MediaFire yang valid"
        };
      }
      const fileMatch = url.match(/mediafire\.com\/file\/([a-z0-9]+)/i);
      if (fileMatch) return await this.file(fileMatch[1]);
      const folderMatch = url.match(/mediafire\.com\/folder\/([a-z0-9]+)/i);
      if (folderMatch) return await this.folder(folderMatch[1], rec);
      return {
        status: false,
        error: "Tipe URL tidak dikenali"
      };
    } catch (err) {
      console.error(`[MF] Main error: ${err.message}`);
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