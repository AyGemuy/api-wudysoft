import axios from "axios";
const sleep = ms => new Promise(r => setTimeout(r, ms));
class UCWeb {
  constructor() {
    this.api = "https://m-intldrive.ucweb.com/1/clouddrive/share/sharepage";
    this.maxDepth = 5;
    this.proxy = "https://upload.vbi1.my.id/ucweb/ucweb.php";
  }
  pwd(url) {
    const match = url.match(/\/s\/([a-z0-9]+)/i);
    return match ? match[1] : null;
  }
  async stoken(pwdId) {
    console.log(`[1] Mengambil stoken dari https://uc-share.com/s/${pwdId}...`);
    try {
      const {
        data
      } = await axios.get(`https://uc-share.com/s/${pwdId}?la=id`, {
        headers: this._headers(pwdId, true)
      });
      const match = data.match(/"stoken"\s*:\s*"([^"]+)"/i);
      if (match) {
        console.log(`[1] Stoken ditemukan: ${match[1].substring(0, 20)}...`);
        return match[1];
      }
      console.warn("[1] Stoken tidak ditemukan di HTML");
      return null;
    } catch (err) {
      console.error(`[1] Gagal ambil stoken: ${err.message}`);
      return null;
    }
  }
  _headers(pwdId, isHtml = false) {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Accept: isHtml ? "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" : "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Origin: "https://uc-share.com",
      Referer: `https://uc-share.com/s/${pwdId}?la=id`,
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": isHtml ? "document" : "empty",
      "Sec-Fetch-Mode": isHtml ? "navigate" : "cors",
      "Sec-Fetch-Site": "cross-site",
      ...isHtml ? {} : {
        "Content-Type": "application/json"
      }
    };
  }
  async list(pwdId, stoken, pdir = "", page = 1, size = 50) {
    const params = {
      pr: "UCBrowser",
      fr: "h5",
      __t: Date.now(),
      pwd_id: pwdId,
      stoken: stoken,
      pdir_fid: pdir,
      force: 0,
      _page: page,
      _size: size,
      _fetch_banner: 0,
      _fetch_share: 0,
      _fetch_total: 1,
      _sort: "file_type:asc,updated_at:desc",
      ip_limit: ""
    };
    try {
      const {
        data
      } = await axios.get(`${this.api}/detail`, {
        params: params,
        headers: this._headers(pwdId)
      });
      if (data.code !== 0) throw new Error(data.message || "Unknown error");
      return {
        ok: true,
        data: data.data
      };
    } catch (err) {
      return {
        ok: false,
        err: err.message
      };
    }
  }
  async dlUrl(pwdId, stoken, fid, fidToken) {
    const params = {
      pr: "UCBrowser",
      fr: "h5",
      __t: Date.now(),
      pwd_id: pwdId,
      stoken: stoken,
      fid: fid,
      fid_token: fidToken
    };
    try {
      const {
        data
      } = await axios.get(`${this.api}/download_url`, {
        params: params,
        headers: this._headers(pwdId)
      });
      return {
        ok: data.code === 0,
        data: data.data
      };
    } catch {
      return {
        ok: false
      };
    }
  }
  async video(pwdId, stoken, fid, fidToken) {
    const params = {
      pr: "UCBrowser",
      fr: "h5",
      __t: Date.now(),
      pwd_id: pwdId,
      stoken: stoken,
      fid: fid,
      fid_token: fidToken
    };
    try {
      const {
        data
      } = await axios.get(`${this.api}/video_preview`, {
        params: params,
        headers: this._headers(pwdId)
      });
      return {
        ok: data.code === 0,
        data: data.data
      };
    } catch {
      return {
        ok: false
      };
    }
  }
  isDir(item) {
    return item.dir === true || item.file === false;
  }
  isVid(file) {
    if (file.format_type?.startsWith("video/")) return true;
    const ext = file.file_name?.split(".").pop()?.toLowerCase();
    return ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "3gp"].includes(ext);
  }
  async scan(pwdId, stoken, pdir = "", depth = 0, path = "", visited = []) {
    if (depth > this.maxDepth) {
      console.warn(`[Scan] Max depth tercapai di ${path}`);
      return {
        files: [],
        scanned: 0
      };
    }
    if (pdir && visited.includes(pdir)) {
      console.warn(`[Scan] Circular reference di ${path}`);
      return {
        files: [],
        scanned: 0
      };
    }
    if (pdir) visited.push(pdir);
    console.log(`[Scan] Membuka folder depth ${depth}: ${path || "/"}`);
    const res = await this.list(pwdId, stoken, pdir);
    if (!res.ok) {
      console.error(`[Scan] Gagal baca folder: ${res.err}`);
      return {
        files: [],
        scanned: 0
      };
    }
    let files = [],
      scanned = 0;
    for (const item of res.data.list || []) {
      const itemPath = `${path}/${item.file_name || "unknown"}`;
      if (this.isDir(item) && !visited.includes(item.fid)) {
        scanned++;
        const sub = await this.scan(pwdId, stoken, item.fid, depth + 1, itemPath, visited);
        files.push(...sub.files);
        scanned += sub.scanned;
      } else if (!this.isDir(item)) {
        files.push({
          ...item,
          path: itemPath,
          depth: depth
        });
      }
    }
    return {
      files: files,
      scanned: scanned
    };
  }
  async download({
    url,
    ...opt
  }) {
    try {
      console.log(`[Start] Memproses URL: ${url}`);
      const pwdId = this.pwd(url);
      if (!pwdId) throw new Error("Invalid URL format (tidak mengandung /s/XXXXX)");
      console.log(`[OK] PWD ID: ${pwdId}`);
      const stoken = await this.stoken(pwdId);
      if (!stoken) throw new Error("Gagal mendapatkan stoken");
      const recursive = opt.recursive !== false;
      let files = [],
        scanned = 0;
      if (recursive) {
        console.log(`[Scan] Mode rekursif (max depth ${this.maxDepth})`);
        const res = await this.scan(pwdId, stoken, "", 0, "");
        if (res.err) throw new Error(res.err);
        files = res.files;
        scanned = res.scanned;
      } else {
        console.log(`[Scan] Hanya folder utama (non-rekursif)`);
        const res = await this.list(pwdId, stoken);
        if (!res.ok) throw new Error(res.err);
        files = (res.data.list || []).filter(i => !this.isDir(i));
      }
      if (!files.length) throw new Error("Tidak ada file ditemukan");
      let videos = files.filter(f => this.isVid(f));
      if (!videos.length) videos = [...files];
      videos = videos.map((v, idx) => ({
        ...v,
        idx: idx
      }));
      console.log(`[OK] Ditemukan ${files.length} file total, ${videos.length} video`);
      const totalSizeMB = files.reduce((s, f) => s + (f.size || 0), 0) / 1024 / 1024;
      const isSingle = opt.single || opt.fileIndex !== undefined;
      if (isSingle) {
        let idx = opt.fileIndex ?? 0;
        if (idx >= videos.length) idx = 0;
        const file = videos[idx];
        console.log(`[Single] Mengambil file index ${idx}: ${file.file_name}`);
        const fidToken = file.share_fid_token || file.fid_token;
        if (!fidToken) throw new Error(`fid_token missing untuk file ${file.file_name}`);
        let videoRes = await this.video(pwdId, stoken, file.fid, fidToken);
        if (!videoRes.ok && videoRes.data?.code === 404) {
          console.log(`[Single] Fallback ke download_url karena video_preview 404`);
          videoRes = await this.dlUrl(pwdId, stoken, file.fid, fidToken);
        }
        if (!videoRes.ok) throw new Error("Gagal mendapatkan URL download");
        const play = videoRes.data.play_info || {};
        const rawUrl = play.url || videoRes.data.download_url || videoRes.data.url;
        const directUrl = rawUrl ? `${this.proxy}?url=${encodeURIComponent(rawUrl)}&download=1&filename=${encodeURIComponent(file.file_name || "video.mp4")}` : null;
        return {
          status: "success",
          mode: "single",
          share: {
            totalFiles: files.length,
            totalSizeMB: totalSizeMB.toFixed(2),
            foldersScanned: scanned
          },
          file: {
            ...file,
            path: file.path,
            sizeMB: ((file.size || 0) / 1024 / 1024).toFixed(2)
          },
          video_info: {
            ...play,
            ...videoRes.data
          },
          download: {
            url: rawUrl,
            direct: directUrl
          },
          available: videos.map(v => ({
            ...v,
            index: v.idx,
            sizeMB: ((v.size || 0) / 1024 / 1024).toFixed(2)
          }))
        };
      } else {
        console.log(`[All] Mengambil semua ${videos.length} video...`);
        const results = [];
        let success = 0,
          failed = 0;
        for (const file of videos) {
          console.log(`  - Memproses: ${file.file_name}`);
          const fidToken = file.share_fid_token || file.fid_token;
          if (!fidToken) {
            results.push({
              ...file,
              status: "error",
              error: "no fid_token"
            });
            failed++;
            continue;
          }
          let videoRes = await this.video(pwdId, stoken, file.fid, fidToken);
          if (!videoRes.ok && videoRes.data?.code === 404) videoRes = await this.dlUrl(pwdId, stoken, file.fid, fidToken);
          if (!videoRes.ok) {
            results.push({
              ...file,
              status: "error",
              error: "no download url"
            });
            failed++;
            continue;
          }
          const play = videoRes.data.play_info || {};
          const rawUrl = play.url || videoRes.data.download_url || videoRes.data.url;
          const directUrl = rawUrl ? `${this.proxy}?url=${encodeURIComponent(rawUrl)}&download=1&filename=${encodeURIComponent(file.file_name || "video.mp4")}` : null;
          results.push({
            ...file,
            status: "success",
            sizeMB: ((file.size || 0) / 1024 / 1024).toFixed(2),
            video_info: {
              ...play,
              ...videoRes.data
            },
            download: {
              url: rawUrl,
              direct: directUrl
            }
          });
          success++;
          await sleep(100);
        }
        console.log(`[All] Selesai: success=${success}, failed=${failed}`);
        return {
          status: "success",
          mode: "all",
          recursive: recursive,
          summary: {
            total: videos.length,
            success: success,
            failed: failed,
            foldersScanned: scanned
          },
          files: results
        };
      }
    } catch (err) {
      console.error(`[Error] ${err.message}`);
      return {
        status: "error",
        message: err.message
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
  const api = new UCWeb();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}