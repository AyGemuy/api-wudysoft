import axios from "axios";
const BASE = "https://api.apps.web.id";
const IMG_PROXY = `${BASE}/stickerly/image`;
const HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  origin: "https://afianf.vercel.app",
  referer: "https://afianf.vercel.app/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};

function parseUrl(url) {
  if (!url) return null;
  const fromStickerLy = url.match(/sticker\.ly\/s\/([A-Za-z0-9]+)/i)?.[1];
  if (fromStickerLy) return fromStickerLy;
  const fromVercel = url.match(/\/stickerly\/(?:get\/?)?\?id=([A-Za-z0-9]+)/i)?.[1];
  if (fromVercel) return fromVercel;
  const fromApi = url.match(/stickerly\/detail\/([A-Za-z0-9]+)/i)?.[1];
  if (fromApi) return fromApi;
  const rawId = url.match(/^([A-Za-z0-9]{6})$/)?.[1];
  if (rawId) return rawId;
  return null;
}
class Stickerly {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE,
      headers: HEADERS
    });
  }
  async detail(packId) {
    try {
      console.log(`[detail] packId: ${packId}`);
      const res = await this.ax.get(`/stickerly/detail/${packId}`);
      const data = res.data?.result || {};
      return this._fmtDetail(data);
    } catch (e) {
      console.error("[detail] error:", e?.response?.data || e.message);
      return {};
    }
  }
  async download({
    url,
    detail = true
  }) {
    const packId = parseUrl(url);
    if (!packId) {
      console.error("[download] gagal parse URL/packId:", url);
      return null;
    }
    console.log(`[download] packId: ${packId}, detail: ${detail}`);
    if (!detail) {
      try {
        const res = await this.ax.get(`/stickerly/detail/${packId}`);
        const data = res.data?.result || {};
        return this._fmtPack(data);
      } catch (e) {
        console.error("[download] error:", e?.response?.data || e.message);
        return null;
      }
    }
    return await this.detail(packId);
  }
  _fmtPack(data) {
    return {
      packId: data.packId,
      name: data.name,
      authorName: data.authorName,
      isAnimated: data.isAnimated ?? data.animated ?? false,
      isPaid: data.isPaid ?? false,
      viewCount: data.viewCount ?? 0,
      exportCount: data.exportCount ?? 0,
      shareUrl: data.shareUrl ?? `https://sticker.ly/s/${data.packId}`,
      resourceUrlPrefix: data.resourceUrlPrefix,
      updated: data.updated
    };
  }
  _fmtDetail(data) {
    const prefix = data.resourceUrlPrefix || "";
    const stickers = (data.stickers || []).map(s => ({
      sid: s.sid,
      fileName: s.fileName,
      isAnimated: s.isAnimated ?? s.animated ?? false,
      tags: s.tags ?? [],
      viewCount: s.viewCount ?? 0,
      url: `${IMG_PROXY}?url=${prefix}${s.fileName}`,
      directUrl: `${prefix}${s.fileName}`
    }));
    return {
      ...this._fmtPack(data),
      resourceZip: data.resourceZip,
      zipUrl: data.resourceZip ? `${IMG_PROXY}?url=${prefix}${data.resourceZip}` : null,
      total: stickers.length,
      stickers: stickers
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Stickerly();
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