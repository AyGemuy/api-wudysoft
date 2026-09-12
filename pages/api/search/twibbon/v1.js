import axios from "axios";
const BASE = {
  api: "https://api.twibbonize.com/v2",
  frame: "https://frame.cdn.twibbonize.com",
  campaign: "https://campaign.cdn.twibbonize.com",
  avatar: "https://campaign.cdn.twibbonize.com"
};
const HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  origin: "https://www.twibbonize.com",
  pragma: "no-cache",
  referer: "https://www.twibbonize.com/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};
class Twibbonize {
  constructor() {
    this.client = axios.create({
      baseURL: BASE.api,
      headers: HEADERS
    });
  }
  parseAvatar(av) {
    return av ? `${BASE.avatar}/${av}` : null;
  }
  parseThumb(th) {
    return th ? `${BASE.campaign}/${th}` : null;
  }
  parseFrames(frames = []) {
    return frames.map(f => `${BASE.frame}/${f}`);
  }
  parseCampaign(c) {
    return {
      ...c,
      thumbnail: this.parseThumb(c?.thumbnail),
      campaignCreator: c?.campaignCreator ? {
        ...c.campaignCreator,
        avatar: this.parseAvatar(c.campaignCreator?.avatar)
      } : null
    };
  }
  async detail(url) {
    console.log(`[detail] fetching: ${url}`);
    try {
      const res = await this.client.get(`/campaign/${url}`);
      const d = res?.data?.data;
      const campaign = this.parseCampaign(d?.campaign || {});
      const modules = (d?.modules || []).map(m => ({
        ...m,
        data: {
          ...m?.data,
          frames: this.parseFrames(m?.data?.frames || [])
        }
      }));
      console.log(`[detail] ok: ${url}`);
      return {
        ...d,
        campaign: campaign,
        modules: modules
      };
    } catch (e) {
      console.error(`[detail] error: ${url}`, e?.message);
      return null;
    }
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    console.log(`[search] query="${query}" limit=${limit} detail=${detail}`);
    try {
      const res = await this.client.get("/campaign/search", {
        params: {
          sort: "support",
          page: 1,
          numItems: 30,
          reactive: 1,
          keyword: query,
          category: "FRM,BKG",
          ...rest
        }
      });
      const raw = res?.data?.data?.campaigns || [];
      const total = res?.data?.data?.total || 0;
      console.log(`[search] total=${total} raw=${raw.length}`);
      let campaigns = raw.map(c => this.parseCampaign(c));
      if (detail) {
        const detailed = [];
        let count = 0;
        for (const c of campaigns) {
          if (count >= limit) break;
          const d = await this.detail(c?.url);
          detailed.push(d ? {
            ...c,
            ...d
          } : c);
          count++;
        }
        campaigns = detailed;
      } else {
        campaigns = campaigns.slice(0, limit);
      }
      console.log(`[search] done, returned=${campaigns.length}`);
      return {
        total: total,
        campaigns: campaigns
      };
    } catch (e) {
      console.error("[search] error", e?.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new Twibbonize();
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