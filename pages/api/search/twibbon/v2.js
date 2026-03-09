import axios from "axios";

const BASE_URL = "https://twibify.com";
const STORAGE_URL = "https://twibify.com/storage";

const HEADERS = {
  'accept': 'application/json',
  'accept-language': 'id-ID',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'referer': 'https://twibify.com/explore',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
  'x-requested-with': 'XMLHttpRequest'
};

class Twibify {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: HEADERS
    });
  }

  /**
   * Memperbaiki path gambar menjadi URL lengkap
   */
  parseImageUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : `${STORAGE_URL}/${path}`;
  }

  /**
   * Fungsi Pencarian Twibify
   */
  async search({
    query,
    page = 1,
    perPage = 12,
    sort = "newest" // newest, popular, dll
  }) {
    console.log(`[Twibify] Searching: "${query}" (Page: ${page})`);
    
    try {
      const response = await this.client.get("/explore/search", {
        params: {
          search: query,
          sort: sort,
          page: page,
          per_page: perPage
        }
      });

      const data = response.data;

      if (!data.success) {
        throw new Error("API Twibify mengembalikan status gagal.");
      }

      // Mapping data agar lebih bersih dan URL gambar valid
      const campaigns = data.campaigns.map(c => ({
        id: c.id,
        title: c.judul,
        url: c.link,
        image: this.parseImageUrl(c.image),
        thumbnail: this.parseImageUrl(c.image_thumbnail),
        hashtags: c.hashtags,
        createdAt: c.created_at,
        stats: {
          clicks: c.clicks_count,
          downloads: c.downloads_count
        },
        creator: {
          name: c.user?.name,
          avatar: c.user?.profile_photo_url ? this.parseImageUrl(c.user.profile_photo_url) : null
        }
      }));

      return {
        total: data.total_count,
        currentPage: data.current_page,
        hasMore: data.has_more,
        results: campaigns
      };

    } catch (error) {
      console.error("[Twibify] Error:", error.message);
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
  const api = new Twibify();
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