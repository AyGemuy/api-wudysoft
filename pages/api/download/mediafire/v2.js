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
  async download({
    url
  }) {
    try {
      if (!url || typeof url !== "string" || !url.includes("mediafire.com")) {
        return {
          status: false,
          error: "Bukan URL MediaFire yang valid"
        };
      }
      const fileMatch = url.match(/mediafire\.com\/file\/([a-z0-9]+)/i);
      if (fileMatch) {
        return await this.getFileInfo(fileMatch[1]);
      }
      const folderMatch = url.match(/mediafire\.com\/folder\/([a-z0-9]+)/i);
      if (folderMatch) {
        return await this.getFolderContent(folderMatch[1]);
      }
      return {
        status: false,
        error: "URL tidak dikenali sebagai file atau folder MediaFire"
      };
    } catch (err) {
      return {
        status: false,
        error: err.message || "Gagal memproses URL"
      };
    }
  }
  async _resolveDirectLink(quickKey) {
    try {
      const jar = cloudscraper.jar();
      const pageUrl = `https://www.mediafire.com/file/${quickKey}`;
      const html = await cloudscraper({
        method: "GET",
        url: pageUrl,
        headers: this.headers,
        jar: jar,
        followAllRedirects: true
      });
      let directMatch = html.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
      if (directMatch) return directMatch[0];
      const $ = cheerio.load(html);
      let href = $("#downloadButton").attr("href") || $("a.input.popsok").attr("href");
      if (href && href.startsWith("//")) {
        href = "https:" + href;
      }
      if (href && (href.includes("dkey=") || href.includes("mediafire.com/file/"))) {
        const secondHtml = await cloudscraper({
          method: "GET",
          url: href,
          headers: {
            ...this.headers,
            Referer: pageUrl
          },
          jar: jar,
          followAllRedirects: true
        });
        directMatch = secondHtml.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
        if (directMatch) return directMatch[0];
        const $2 = cheerio.load(secondHtml);
        const secondHref = $2("#downloadButton").attr("href") || $2("a.input.popsok").attr("href");
        if (secondHref) {
          return secondHref.startsWith("//") ? "https:" + secondHref : secondHref;
        }
      }
      return href || pageUrl;
    } catch {
      return `https://www.mediafire.com/file/${quickKey}`;
    }
  }
  async getFileInfo(quickKey) {
    try {
      const rawData = await cloudscraper({
        method: "GET",
        url: `${this.api}/file/get_info.php`,
        qs: {
          quick_key: quickKey,
          response_format: "json"
        },
        json: true
      });
      const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      const info = data?.response?.file_info;
      if (!info || info.ready !== "yes") {
        return {
          status: false,
          error: data?.response?.message || "File tidak ditemukan atau belum siap"
        };
      }
      const directDownload = await this._resolveDirectLink(quickKey);
      return {
        status: true,
        result: {
          type: "file",
          ...info,
          download: directDownload
        }
      };
    } catch (err) {
      return {
        status: false,
        error: err.message || "Gagal mengambil info file"
      };
    }
  }
  async getFolderContent(folderKey) {
    try {
      const rawInfo = await cloudscraper({
        method: "GET",
        url: `${this.api}/folder/get_info.php`,
        qs: {
          folder_key: folderKey,
          response_format: "json"
        },
        json: true
      });
      const infoData = typeof rawInfo === "string" ? JSON.parse(rawInfo) : rawInfo;
      const folderInfo = infoData?.response?.folder_info || {};
      const rawContent = await cloudscraper({
        method: "GET",
        url: `${this.api}/folder/get_content.php`,
        qs: {
          folder_key: folderKey,
          response_format: "json",
          content_type: "files",
          filter: "all",
          order_by: "name",
          order_direction: "asc",
          chunk: 1,
          version: "1.5",
          r: Math.random().toString(36).slice(2)
        },
        json: true
      });
      const contentData = typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
      const folderContent = contentData?.response?.folder_content || {};
      return {
        status: true,
        result: {
          type: "folder",
          ...folderInfo,
          ...folderContent
        }
      };
    } catch (err) {
      return {
        status: false,
        error: err.message || "Gagal mengambil isi folder"
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