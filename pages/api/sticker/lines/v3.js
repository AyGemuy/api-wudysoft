import axios from "axios";
const BASE = "https://api.apps.web.id/line";
const CDN_STICKER = "https://stickershop.line-scdn.net/stickershop/v1/sticker";
const CDN_EMOJI = "https://stickershop.line-scdn.net/sticonshop/v1/sticon";
const HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  origin: "https://afianf.vercel.app",
  referer: "https://afianf.vercel.app/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};
class LineShop {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE,
      headers: HEADERS
    });
  }
  async search({
    query,
    limit = 5,
    detail = true,
    mode = "sticker",
    ...rest
  }) {
    try {
      const isEmoji = mode === "emoji";
      const idFromUrl = query?.match(/(?:emojishop|stickershop)\/product\/([a-z0-9]+)/i)?.[1] || query?.match(/(?:emojilist|stickerlist)\?id=([a-z0-9]+)/i)?.[1];
      if (idFromUrl) {
        console.log(`[search] link terdeteksi, langsung detail id: ${idFromUrl} mode: ${mode}`);
        return await this.detail(idFromUrl, mode);
      }
      const endpoint = isEmoji ? "/emojisearch" : "/stickersearch";
      console.log(`[search] mode: ${mode}, query: "${query}", limit: ${limit}`);
      const res = await this.ax.get(endpoint, {
        params: {
          q: query,
          offset: 0,
          ...rest
        }
      });
      const items = (res.data?.items || []).slice(0, limit);
      console.log(`[search] total hasil: ${res.data?.totalCount || 0}, ambil: ${items.length}`);
      const results = [];
      for (const item of items) {
        const id = item?.id;
        const base = this._fmt(item, mode);
        if (detail) {
          console.log(`[search] fetch detail id: ${id}`);
          const det = await this.detail(id, mode);
          results.push({
            ...base,
            ...det
          });
        } else {
          results.push(base);
        }
      }
      return results;
    } catch (e) {
      console.error("[search] error:", e?.response?.data || e.message);
      return [];
    }
  }
  async detail(id, mode = "sticker") {
    try {
      const isEmoji = mode === "emoji";
      const endpoint = isEmoji ? "/emojilist" : "/stickerlist";
      console.log(`[detail] mode: ${mode}, id: ${id}`);
      const res = await this.ax.get(endpoint, {
        params: {
          id: id
        }
      });
      const data = res.data || {};
      const items = data?.items || [];
      const isAnim = data?.isAnim || false;
      const isPopup = data?.isPopup || false;
      const images = items.map(num => {
        if (isEmoji) {
          const pad = String(num).padStart(3, "0");
          return {
            id: num,
            png: `${CDN_EMOJI}/${id}/iPhone/${pad}.png`,
            ...isAnim ? {
              anim: `${CDN_EMOJI}/${id}/iPhone/${pad}_animation.png`
            } : {}
          };
        } else {
          return {
            id: num,
            png: `${CDN_STICKER}/${num}/iPhone/sticker@2x.png`,
            ...isAnim ? {
              anim: `${CDN_STICKER}/${num}/iPhone/sticker_animation@2x.png`
            } : {},
            ...isPopup ? {
              popup: `${CDN_STICKER}/${num}/android/sticker_popup.png`
            } : {}
          };
        }
      });
      console.log(`[detail] total: ${items.length}, anim: ${isAnim}, popup: ${isPopup}`);
      return {
        id: id,
        mode: mode,
        isAnim: isAnim,
        isPopup: isPopup,
        total: items.length,
        images: images
      };
    } catch (e) {
      console.error("[detail] error:", e?.response?.data || e.message);
      return {};
    }
  }
  _fmt(item, mode) {
    const isEmoji = mode === "emoji";
    const id = item?.id;
    return {
      id: id,
      mode: mode,
      title: item?.title || "Untitled",
      author: item?.authorName || "Unknown",
      price: item?.priceString || "Free",
      isAnim: item?.hasAnimation || false,
      type: isEmoji ? item?.sticonResourceType || "STATIC" : item?.stickerResourceType || "STATIC",
      thumb: item?.listIcon?.src || (isEmoji ? `${CDN_EMOJI}/${id}/iPhone/main.png` : `${CDN_STICKER}/${id}/LINEStorePC/main.png`),
      url: `https://store.line.me${item?.productUrl || ""}`
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new LineShop();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}