import cloudscraper from "cloudscraper";
import * as cheerio from "cheerio";
class Mediafire {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
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
      if (url.includes("/folder/")) {
        return await this.scrapeFolder(url);
      }
      return await this.scrapeFile(url);
    } catch (err) {
      return {
        status: false,
        error: err.message || "Gagal memproses URL MediaFire"
      };
    }
  }
  async scrapeFile(url) {
    try {
      const jar = cloudscraper.jar();
      let html = await cloudscraper({
        method: "GET",
        url: url,
        headers: this.headers,
        jar: jar,
        followAllRedirects: true
      });
      const $ = cheerio.load(html);
      const downloadButton = $("a#downloadButton, a.popsok, a[aria-label='Download file'], .download_link a.input, .mftd-download, .mftd-mobile");
      let downloadLink = downloadButton.attr("href");
      if (downloadLink && downloadLink.startsWith("//")) {
        downloadLink = "https:" + downloadLink;
      }
      const name = $(".dl-btn-label").attr("title")?.trim() || html.match(/optFileName\s*=\s*["']([^"']+)["']/i)?.[1] || $(".dl-btn-label").text().trim() || $("meta[property='og:title']").attr("content")?.trim() || $("title").text().trim();
      const rawBtnText = downloadButton.text();
      const sizeMatch = rawBtnText.match(/\(([\d.]+\s*[KMGT]?B)\)/i) || html.match(/File size:\s*([^\s<]+)/i) || html.match(/\(([\d.]+\s*[KMGT]?B)\)/i);
      const size = sizeMatch ? sizeMatch[1].trim() : null;
      const key = html.match(/optFileKey\s*=\s*["']([^"']+)["']/i)?.[1] || url.match(/mediafire\.com\/file\/([a-z0-9]+)/i)?.[1] || html.match(/qkey=([a-z0-9]+)/i)?.[1] || null;
      const extension = html.match(/"dimension5"\s*:\s*["']([^"']+)["']/i)?.[1] || (name && name.includes(".") ? name.split(".").pop() : null);
      const filetype = html.match(/"dimension3"\s*:\s*["']([^"']+)["']/i)?.[1] || html.match(/optFileType\s*=\s*["']([^"']+)["']/i)?.[1] || null;
      let mimetype = null;
      $(".icon, [class*='application_'], [class*='image_'], [class*='video_'], [class*='audio_'], [class*='text_']").each((_, el) => {
        if (mimetype) return;
        const classes = ($(el).attr("class") || "").split(/\s+/);
        const mimeClass = classes.find(c => /^(application|image|video|audio|text)_/i.test(c));
        if (mimeClass) {
          mimetype = mimeClass.replace("_", "/");
        }
      });
      const detailsText = $("ul.details, .dl-info").text().replace(/\s+/g, " ");
      const uploaded = detailsText.match(/Uploaded:\s*([\d-]+\s*[\d:]+)/i)?.[1] || html.match(/Uploaded:\s*([\d-]+\s*[\d:]+)/i)?.[1] || $(".dl-info ul.details li:nth-child(2) span").text().trim() || null;
      const securityToken = $('input[name="security"]').val() || html.match(/optSecurityToken\s*=\s*["']([^"']+)["']/i)?.[1] || null;
      const repairUrl = $("a.retry").attr("href") || (key && downloadLink?.includes("dkey=") ? `https://www.mediafire.com/download_repair.php?qkey=${key}&dkey=${downloadLink.match(/dkey=([^&]+)/)?.[1]}` : null);
      const shareUrl = $("textarea#copy").text().trim() || html.match(/optFileURL\s*=\s*["']([^"']+)["']/i)?.[1] || url;
      if (downloadLink && (downloadLink.includes("dkey=") || !downloadLink.includes("download"))) {
        try {
          const redirectHtml = await cloudscraper({
            method: "GET",
            url: downloadLink,
            headers: {
              ...this.headers,
              Referer: url
            },
            jar: jar,
            followAllRedirects: true
          });
          const directMatch = redirectHtml.match(/https?:\/\/download\d*\.mediafire\.com\/[^\s"'>]+/i);
          if (directMatch) {
            downloadLink = directMatch[0];
          } else {
            const $redirect = cheerio.load(redirectHtml);
            downloadLink = $redirect("#downloadButton").attr("href") || downloadLink;
          }
        } catch (_) {}
      }
      if (!downloadLink) {
        return {
          status: false,
          error: "Tautan unduhan tidak ditemukan. File mungkin telah dihapus atau dibatasi."
        };
      }
      return {
        status: true,
        result: {
          type: "file",
          key: key,
          name: name,
          size: size,
          extension: extension,
          filetype: filetype,
          mimetype: mimetype,
          uploaded: uploaded,
          security_token: securityToken,
          repair_url: repairUrl,
          url: shareUrl,
          download: downloadLink
        }
      };
    } catch (err) {
      return {
        status: false,
        error: err.message || "Gagal melakukan scraping pada file"
      };
    }
  }
  async scrapeFolder(url) {
    try {
      const jar = cloudscraper.jar();
      const html = await cloudscraper({
        method: "GET",
        url: url,
        headers: this.headers,
        jar: jar,
        followAllRedirects: true
      });
      const $ = cheerio.load(html);
      const folderKey = html.match(/afI\s*=\s*["']([^"']+)["']/i)?.[1] || url.match(/mediafire\.com\/folder\/([a-z0-9]+)/i)?.[1] || null;
      const folderName = $("#folder_name").text().trim() || $("#myfilesCurrentFolderName").text().trim() || $("title").text().trim();
      const author = $("#folder_author").attr("title")?.replace(/^shared by\s*"?|"?$/gi, "").trim() || $("#owner_breadcrumb1").text().replace(/Shared Files|["']/gi, "").trim() || null;
      let files = [];
      $("#main_list li[data-key], #main_list li.mf_filecontainer").each((_, el) => {
        const item = $(el);
        const key = item.attr("data-key") || item.attr("id")?.replace(/^file-/, "");
        const name = item.find(".item-name").text().trim() || item.find("input.updatename").val() || item.find("a.thumbnailClickArea").attr("title") || item.find("a.foldername").text().trim();
        const fileUrl = item.find("a.thumbnailClickArea").attr("href") || item.find("a.foldername").attr("href") || (key ? `https://www.mediafire.com/file/${key}/${name}/file` : null);
        const size = item.find(".file_maindetails .size").text().trim() || null;
        const uploaded = item.find(".file_maindetails .created").text().trim() || null;
        const rawDownloads = item.find(".file_maindetails .downloads").text();
        const downloadsMatch = rawDownloads.match(/(\d+)/);
        const downloads = downloadsMatch ? parseInt(downloadsMatch[1], 10) : 0;
        let extension = item.find(".filetype_column em").text().trim();
        if (!extension && name && name.includes(".")) {
          extension = name.split(".").pop();
        }
        let mimetype = null;
        const fileTypeClasses = (item.find(".filetype_column span").attr("class") || "").split(/\s+/);
        const mimeClass = fileTypeClasses.find(c => /^(application|text|image|video|audio)_/i.test(c));
        if (mimeClass) {
          mimetype = mimeClass.replace("_", "/");
        }
        if (name || key) {
          files.push({
            key: key,
            name: name,
            size: size,
            extension: extension,
            mimetype: mimetype,
            uploaded: uploaded,
            downloads: downloads,
            url: fileUrl
          });
        }
      });
      if (files.length === 0 && folderKey) {
        try {
          const apiUrl = `https://www.mediafire.com/api/1.5/folder/get_content.php?r=json&content_type=files&filter=all&order_by=name&order_direction=asc&chunk=1&version=1.5&folder_key=${folderKey}&response_format=json`;
          const apiRes = await cloudscraper({
            method: "GET",
            url: apiUrl,
            headers: {
              ...this.headers,
              Referer: url
            },
            json: true
          });
          const folderFiles = apiRes?.response?.folder_content?.files || [];
          files = folderFiles.map(file => ({
            key: file.quickkey,
            name: file.filename,
            size: this.formatBytes(file.size),
            extension: file.filename?.split(".").pop() || null,
            mimetype: file.mimetype || null,
            uploaded: file.created || null,
            downloads: parseInt(file.downloads, 10) || 0,
            url: file.links?.normal_download || `https://www.mediafire.com/file/${file.quickkey}`
          }));
        } catch (_) {}
      }
      return {
        status: true,
        result: {
          type: "folder",
          key: folderKey,
          name: folderName,
          author: author,
          url: url,
          item_count: files.length,
          files: files
        }
      };
    } catch (err) {
      return {
        status: false,
        error: err.message || "Gagal melakukan scraping pada folder"
      };
    }
  }
  formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return null;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
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