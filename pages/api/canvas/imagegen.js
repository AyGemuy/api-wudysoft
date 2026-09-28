import axios from 'axios';

// 1. Single Source of Truth untuk schema & tipe yang didukung
const TYPES = {
  // Image Generation (memerlukan parameter khusus)
  threats: ['url'], baguette: ['url'], clyde: ['text'], ship: ['user1', 'user2'],
  captcha: ['url', 'username'], whowouldwin: ['user1', 'user2'], changemymind: ['text'],
  ddlc: ['character', 'background', 'body', 'face', 'text'], jpeg: ['url'], lolice: ['url'],
  kannagen: ['text'], iphonex: ['url'], animeface: ['image'], awooify: ['url'],
  trap: ['name', 'author', 'image'], trumptweet: ['text'], tweet: ['username', 'text'],
  deepfry: ['image'], blurpify: ['image'], phcomment: ['image', 'text', 'username'],
  magik: ['image'], trash: ['url'], stickbug: ['url'],
  // General/Lood Image Endpoints (tanpa parameter tambahan)
  hass: [], hmidriff: [], pgif: [], '4k': [], hentai: [], holo: [], hneko: [], neko: [],
  hkitsune: [], kemonomimi: [], anal: [], hanal: [], gonewild: [], kanna: [], ass: [],
  pussy: [], thigh: [], hthigh: [], gah: [], coffee: [], food: [], paizuri: [],
  tentacle: [], boobs: [], hboobs: [], yaoi: [], cosplay: [], swimsuit: [], pantsu: [], nakadashi: []
};

// 2. Class NekoBot (Auto-Validate & Auto-Download)
class NekoBot {
  constructor({ token, baseURL, timeout } = {}) {
    this.client = axios.create({
      baseURL: baseURL || 'https://nekobot.xyz/api/',
      timeout: timeout ? timeout : 20000,
      headers: token ? { Authorization: token } : {}
    });
  }

  async get({ type, raw, ...rest } = {}) {
    try {
      const t = type ? type.toLowerCase().trim() : 'neko';
      if (!(t in TYPES)) throw new Error(`Tipe '${t}' tidak valid. Tersedia: ${Object.keys(TYPES).join(', ')}`);

      // Auto-validate required parameter
      const required = TYPES[t] || [];
      const missing = required.filter((k) => !rest?.[k] || `${rest[k]}`.trim() === '');
      if (missing.length) throw new Error(`Parameter wajib [${missing.join(', ')}] untuk '${t}' belum diisi`);

      const endpoint = required.length ? 'imagegen' : 'image';
      console.log(`[PROSES] 1/2 Request [${endpoint}] type: ${t}`);

      const res = await this.client.get(endpoint, {
        params: { type: t, ...(raw ? { raw: 1 } : {}), ...rest }
      });

      const imgUrl = res?.data?.message;
      if (!imgUrl) throw new Error('URL gambar tidak ditemukan pada response API');

      console.log(`[PROSES] 2/2 Download: ${imgUrl}`);
      const dl = await axios.get(imgUrl, { responseType: 'arraybuffer' });

      return {
        status: res?.data?.status ? res.data.status : dl?.status || 200,
        buffer: Buffer.from(dl?.data || ''),
        contentType: dl?.headers?.['content-type'] || 'image/png'
      };
    } catch (err) {
      console.error(`[ERROR] ${err?.message || err}`);
      throw err?.response?.data || err;
    }
  }
}

// 3. Next.js API Route Handler
export default async function handler(req, res) {
  try {
    const params = req.method === 'GET' ? req.query : req.body;

    if (!params?.type) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'type' wajib disertakan.",
        availableTypes: Object.keys(TYPES)
      });
    }

    const api = new NekoBot();
    const data = await api.get(params);

    // Opsi output JSON/Base64 jika query ?json=true
    if (params?.json === 'true' || params?.format === 'json') {
      return res.status(200).json({
        status: true,
        type: params?.type,
        contentType: data?.contentType,
        base64: `data:${data?.contentType};base64,${data?.buffer?.toString('base64')}`
      });
    }

    // Direct Image Response
    res.setHeader('Content-Type', data?.contentType || 'image/png');
    
    return res.status(data?.status ? 200 : 500).send(data?.buffer);
  } catch (err) {
    return res.status(400).json({
      status: false,
      error: err?.message || 'Terjadi kesalahan pada request'
    });
  }
}