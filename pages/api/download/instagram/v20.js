import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class InstaDownloader {
  constructor() {
    this.hosts = ["https://fastdl.app", "https://anonyig.com", "https://storiesig.info", "https://igram.world", "https://sssinstagram.com", "https://instasupersave.com"];
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
    };
    this.host_cfg = {
      "fastdl.app": {
        input: "#search-form-input",
        button: "#searchFormButton"
      },
      "anonyig.com": {
        input: "input.search-form__input",
        button: "button.search-form__button"
      },
      "storiesig.info": {
        input: ".search-form__input",
        button: ".search-form__button"
      },
      "igram.world": {
        input: "#search-form-input",
        button: ".search-form__button"
      },
      "sssinstagram.com": {
        input: "#input",
        button: ".form__submit"
      },
      "instasupersave.com": {
        input: "#search-form-input",
        button: ".search-form__button"
      }
    };
  }
  toKey(path) {
    return path?.split("/").pop().replace(/[^a-z0-9]/gi, "_").toLowerCase() || "result";
  }
  async download({
    url,
    host
  }) {
    let targets = this.hosts;
    if (host !== undefined) {
      if (typeof host === "number") {
        targets = [this.hosts[host]];
      } else {
        targets = [host.startsWith("http") ? host : `https://${host}`];
      }
    }
    for (const base of targets) {
      try {
        const domain = new URL(base).hostname.replace("www.", "");
        const config = this.host_cfg[domain] || this.host_cfg["fastdl.app"];
        console.log(`🚀 Trying [${domain}] for URL: ${url}`);
        const code = `
const pw = require('playwright');

(async () => {
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  const getTargetData = new Promise((resolve) => {
    page.on('response', async (res) => {
      const req = res.request();
      const u = req.url();
      const postData = req.postData() || "";

      if (u.includes('api') && postData.includes('ts')) {
        try {
          const result = await res.json();
          resolve(result);
        } catch (e) {}
      }
    });
  });

  try {
    await page.goto("${base}", { waitUntil: 'domcontentloaded' });
    
    try {
      await page.click('.fc-button.fc-cta-consent, #ez-accept-all', { timeout: 3000 });
    } catch {}

    await page.waitForSelector('${config.input}');
    await page.fill('${config.input}', '${url}');
    await page.click('${config.button}', { force: true });

    const finalResult = await getTargetData;
    console.log(JSON.stringify(finalResult, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
`;
        const res = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/playwright-v2`, {
          code: code
        }, {
          headers: this.headers
        });
        const raw = res?.data?.output ? JSON.parse(res.data.output) : {};
        if (Object.keys(raw).length === 0) continue;
        return {
          success: true,
          source: domain,
          result: Object.values(raw).map(item => ({
            ...item
          }))
        };
      } catch (err) {
        console.log(`❌ Host ${base} failed:`, err.message);
        continue;
      }
    }
    return {
      success: false,
      error: "All hosts failed"
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
  const api = new InstaDownloader();
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