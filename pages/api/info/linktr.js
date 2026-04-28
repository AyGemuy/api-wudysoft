import axios from 'axios';
import * as cheerio from 'cheerio';

class Linktree {
    async get_info({ input }) {
        try {
            const target = this._norm(input);
            const { data: html } = await axios.get(target, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                    'Accept-Language': 'id-ID,en-US;q=0.9'
                },
                timeout: 30000
            });

            const $ = cheerio.load(html);
            const json = JSON.parse($('#__NEXT_DATA__').html());
            const acc = json.props.pageProps.account;

            if (!acc) throw new Error('Account not found');

            // 1. Flat Profile: Menggabungkan Profile, SEO, dan Theme jadi satu level
            const flatUser = {
                id: acc.id,
                username: acc.username,
                title: acc.pageTitle,
                bio: acc.description,
                avatar: acc.profilePictureUrl || acc.customAvatar,
                tier: acc.tier,
                url: target,
                timezone: acc.timezone,
                meta_title: acc.dynamicMetaTitle,
                meta_desc: acc.dynamicMetaDescription,
                // Ambil warna background saja dari nested theme agar simpel
                theme_color: acc.theme?.background?.color || null,
                theme_font: acc.theme?.typeface?.family || null,
            };

            // 2. Simpel Links: Hanya ambil field yang benar-benar berguna
            const simpleLinks = acc.links.map(l => ({
                title: l.title,
                url: l.url,
                type: l.type,
                desc: l.metadata?.description || null
            })).sort((a, b) => (a.position || 0) - (b.position || 0));

            // 3. Final Result: Gabungkan semua dan bersihkan null
            return this._clean({
                ...flatUser,
                links: simpleLinks
            });

        } catch (e) {
            console.log(`[Error] ${url}: ${e.message}`);
            return null;
        }
    }

    _norm(u) {
        if (!u) return '';
        if (u.startsWith('http')) return u;
        return `https://linktr.ee/${u.replace('@', '').trim()}`;
    }

    _clean(obj) {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => v != null)
        );
    }
}

// --- Test Case ---
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new Linktree();
  try {
    const data = await api.get_info(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}