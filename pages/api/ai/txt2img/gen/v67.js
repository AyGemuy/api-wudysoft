import axios from 'axios';

class AIImageGen {
    constructor() {
        this.cfg = {
            base: "https://www.nanobananaai.dev",
            api: "/api/generate",
            proxy: "/api/proxy-image-display",
            headers: {
                'accept': '*/*',
                'accept-language': 'id-ID',
                'content-type': 'application/json',
                'origin': 'https://www.nanobananaai.dev',
                'referer': 'https://www.nanobananaai.dev/seedream',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36'
            },
            // Hanya value saja sesuai permintaan
            sizes: [
                "1024x1024", 
                "768x1344", 
                "864x1152", 
                "1344x768", 
                "1152x864", 
                "1440x720", 
                "720x1440"
            ]
        };
    }

    // Singkat: Req (Request)
    async req(ep, dt) {
        console.log(`[LOG] POST: ${ep}`);
        try {
            const r = await axios.post(`${this.cfg.base}${ep}`, dt, { 
                headers: this.cfg.headers 
            });
            return r?.data; // Optional chaining
        } catch (e) {
            console.error(`[ERR] Net: ${e.message}`);
            return null;
        }
    }

    async generate({ prompt, ratio, ...rest }) {
        console.log('[LOG] Processing...');
        
        try {
            // Cek apakah ratio ada di list, jika tidak pakai default index 0 (Ternary & Logic)
            const sz = this.cfg.sizes.includes(ratio) ? ratio : this.cfg.sizes[0];
            
            // Payload setup dengan Default Value (Logic OR)
            const py = {
                prompt: prompt || "A masterpiece landscape",
                size: sz,
                ...rest
            };

            const raw = await this.req(this.cfg.api, py);

            // Parsing dalam dengan Optional Chaining
            const url = raw?.artifacts?.[0]?.url;

            if (!url) throw new Error("Empty URL Response");

            // Construct Proxy URL
            const px = `${this.cfg.base}${this.cfg.proxy}?url=${encodeURIComponent(url)}`;

            console.log('[LOG] Done.');

            return {
                result: url,
                proxy: px,
                used_size: sz,
                original_prompt: py.prompt,
                info: "Generated Successfully"
            };

        } catch (e) {
            console.error(`[ERR] Gen: ${e.message}`);
            return {
                result: null,
                proxy: null,
                info: e.message
            };
        }
    }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AIImageGen();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}