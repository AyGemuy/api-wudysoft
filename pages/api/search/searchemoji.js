import axios from 'axios';
import * as cheerio from 'cheerio';

class SearchEmoji {
  constructor(cfg = {}) {
    this.base = cfg?.baseUrl || 'https://searchemoji.app';
    this.imgHost = cfg?.imgHost || 'https://img.searchemoji.app';
    
    // Daftar vendor resmi sesuai struktur kode web asli (g array)
    this.platformList = [
      { name: 'Apple', imgPath: 'apple' },
      { name: 'Google', imgPath: 'google' },
      { name: 'Facebook', imgPath: 'facebook' },
      { name: 'X / Twitter', imgPath: 'x' },
      { name: 'Microsoft', imgPath: 'microsoft' },
      { name: 'Samsung', imgPath: 'samsung' },
      { name: 'Whatsapp', imgPath: 'whatsapp' }
    ];

    this.req = axios.create({
      baseURL: this.base,
      timeout: cfg?.timeout || 15000,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        referer: 'https://searchemoji.app/',
        ...(cfg?.headers || {})
      }
    });
  }

  // Singkat: Format emoji karakter / hex ke format path URL
  fmt(val) {
    if (!val) return '';
    const clean = String(val).trim().replace(/^U\+/i, '');
    const isHex = /^[0-9a-fA-F]{4,6}(-[0-9a-fA-F]{4,6})*$/i.test(clean);
    return isHex
      ? clean.toUpperCase()
      : [...clean]
          .map(char => char.codePointAt(0)?.toString(16)?.toUpperCase() || '')
          .filter(Boolean)
          .join('-');
  }

  // Singkat: Generate manual URL vendor sesuai logic imgPath web asli
  gen(code, emojiName = '') {
    console.log('[SearchEmoji] Menghasilkan URL vendor secara manual via imgPath...');
    const hex = (code || '').toLowerCase();
    return this.platformList.map(item => ({
      vendor: item.name,
      imgPath: item.imgPath,
      url: `${this.imgHost}/emoji-images/${item.imgPath}/${hex}.webp`,
      alt: emojiName ? `${emojiName} for ${item.name} platform` : `${item.name} emoji`
    }));
  }

  // Singkat: Fallback parser untuk JSON Nuxt & Schema.org Graph
  nxt($, html) {
    try {
      const ld = $('script#schema-org-graph')?.text() || '';
      const ldJson = ld ? JSON.parse(ld) : null;
      const art = ldJson?.['@graph']?.find(i => i?.['@type'] === 'VisualArtwork');

      const raw = $('script#__NUXT_DATA__')?.text() || '';
      const nuxtJson = raw ? JSON.parse(raw) : null;

      return {
        name: art?.name || '',
        altName: art?.alternateName || '',
        version: art?.version || '',
        keywords: art?.keywords ? art.keywords.split(',') : [],
        nuxtData: nuxtJson
      };
    } catch {
      return {};
    }
  }

  // Singkat: Ekstraksi DOM Cheerio dengan Fallback Manual URL
  dom(html, hexCode) {
    console.log('[SearchEmoji] Memproses data DOM Cheerio...');
    const $ = cheerio.load(html);
    const fb = this.nxt($, html);

    const character = $('main h2').first().text().trim() || $('h2').first().text().trim() || '❓';
    const name = $('main h3').first().text().trim() || fb?.name || 'Unknown Emoji';

    let unicodeName = '';
    let version = '';
    let code = '';
    let groupFull = '';
    const keywords = [];

    // Parse tabel metadata
    $('.flex.justify-between').each((_, el) => {
      const label = $(el).find('span').first().text().trim().toLowerCase();
      const valSpan = $(el).find('span').last();

      if (label.includes('unicode name')) {
        unicodeName = valSpan.text().trim();
      } else if (label.includes('search keyword')) {
        $(el).find('span.card').each((_, kw) => {
          const txt = $(kw).text().trim();
          txt ? keywords.push(txt) : null;
        });
      } else if (label.includes('version')) {
        version = valSpan.text().trim();
      } else if (label.includes('code')) {
        code = valSpan.text().trim();
      } else if (label.includes('group')) {
        groupFull = valSpan.text().trim();
      }
    });

    // Cek vendor dari DOM HTML
    let vendors = [];
    $('img[src*="emoji-images/"]').each((_, img) => {
      const src = $(img).attr('src') || '';
      const alt = $(img).attr('alt') || '';
      const match = src.match(/emoji-images\/([^/]+)\//);
      const slug = match?.[1] || '';
      const item = this.platformList.find(p => p.imgPath === slug);

      if (slug) {
        vendors.push({
          vendor: item?.name || slug.charAt(0).toUpperCase() + slug.slice(1),
          imgPath: slug,
          url: src.startsWith('http') ? src : `https:${src}`,
          alt: alt || `${unicodeName || name} for ${item?.name || slug} platform`
        });
      }
    });

    // Fallback: Jika DOM vendor kosong/tidak lengkap, buat manual dari imgPath
    if (!vendors.length || vendors.length < this.platformList.length) {
      vendors = this.gen(hexCode, unicodeName || name);
    }

    const [category, subcategory] = groupFull ? groupFull.split('>').map(s => s.trim()) : ['', ''];

    return {
      character,
      name,
      unicodeName: unicodeName || fb?.altName || '',
      code: code || `U+${hexCode?.replace(/-/g, ' U+')}`,
      rawCode: hexCode || '',
      version: version || fb?.version || '1.0',
      category: category || 'Unknown',
      subcategory: subcategory || 'Unknown',
      keywords: keywords.length ? keywords : fb?.keywords || [],
      vendors
    };
  }

  async search({ emoji, ...rest } = {}) {
    const query = emoji || rest?.q || rest?.code || '';

    try {
      console.log(`[SearchEmoji] Menjalankan pencarian untuk: "${query}"`);
      if (!query) {
        throw new Error('Parameter pencarian emoji tidak boleh kosong.');
      }

      const hex = this.fmt(query);
      console.log(`[SearchEmoji] Unicode Hex Code: ${hex}`);

      console.log(`[SearchEmoji] Request halaman: ${this.base}/${hex}`);
      const res = await this.req.get(`/${hex}`);

      if (!res?.data) {
        throw new Error('Respon data HTML kosong.');
      }

      const parsed = this.dom(res.data, hex);
      console.log('[SearchEmoji] Berhasil mendapatkan detail emoji dan URL vendor.');

      return {
        status: true,
        result: {
          ...parsed,
          source: `${this.base}/${hex}`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error(`[SearchEmoji] Gagal: ${err?.message || 'Terjadi error'}`);
      
      // Fallback Darurat: Jika request web gagal/error 404 tapi hex valid, tetap kembalikan URL vendor manual
      const hex = this.fmt(query);
      if (hex) {
        console.log('[SearchEmoji] Mengembalikan data fallback darurat (Generated Vendors)...');
        return {
          status: true,
          result: {
            character: query,
            name: 'Emoji Detail',
            unicodeName: '',
            code: `U+${hex.replace(/-/g, ' U+')}`,
            rawCode: hex,
            version: '1.0',
            category: 'Unknown',
            subcategory: 'Unknown',
            keywords: [],
            vendors: this.gen(hex, query),
            source: `${this.base}/${hex}`,
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        status: false,
        result: null,
        error: err?.response?.status === 404 ? 'Emoji tidak ditemukan' : err?.message || 'Internal Server Error'
      };
    }
  }
}

export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.emoji) {
    return res.status(400).json({
      error: "Parameter 'emoji' diperlukan"
    });
  }
  const api = new SearchEmoji();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}

const api = new SearchEmoji();

// 1. Mencari lewat karakter emoji langsung
const res1 = await api.search({ emoji: '😀' });
console.log(res1.result);

{
  character: '😀',
  name: 'Grinning Face',
  unicodeName: 'grinning face',
  code: 'U+1F600',
  rawCode: '1F600',
  version: '1.0',
  category: 'Smileys & Emotion',
  subcategory: 'Face Smiling',
  keywords: [
    'smile',    'happy',
    'joyful',   'laughing',
    'positive', 'cheerful',
    'grin',     'mirthful'
  ],
  vendors: [
    {
      vendor: 'Apple',
      imgPath: 'apple',
      url: 'https://img.searchemoji.app/emoji-images/apple/1f600.webp',
      alt: 'grinning face for Apple platform'
    },
    {
      vendor: 'Google',
      imgPath: 'google',
      url: 'https://img.searchemoji.app/emoji-images/google/1f600.webp',
      alt: 'grinning face for Google platform'
    },
    {
      vendor: 'Facebook',
      imgPath: 'facebook',
      url: 'https://img.searchemoji.app/emoji-images/facebook/1f600.webp',
      alt: 'grinning face for Facebook platform'
    },
    {
      vendor: 'X / Twitter',
      imgPath: 'x',
      url: 'https://img.searchemoji.app/emoji-images/x/1f600.webp',
      alt: 'grinning face for X / Twitter platform'
    },
    {
      vendor: 'Microsoft',
      imgPath: 'microsoft',
      url: 'https://img.searchemoji.app/emoji-images/microsoft/1f600.webp',
      alt: 'grinning face for Microsoft platform'
    },
    {
      vendor: 'Samsung',
      imgPath: 'samsung',
      url: 'https://img.searchemoji.app/emoji-images/samsung/1f600.webp',
      alt: 'grinning face for Samsung platform'
    },
    {
      vendor: 'Whatsapp',
      imgPath: 'whatsapp',
      url: 'https://img.searchemoji.app/emoji-images/whatsapp/1f600.webp',
      alt: 'grinning face for Whatsapp platform'
    }
  ],
  source: 'https://searchemoji.app/1F600',
  timestamp: '2026-09-23T03:21:30.913Z'
}