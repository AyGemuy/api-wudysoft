import axios from "axios";
class CaptchaSolver {
  constructor() {
    this.api = axios.create({
      timeout: 6e4
    });
    this.providers = [{
      name: "solvium",
      keys: ["jyXRGmOUPPy0f09lPu9cFNTK7mNIkR8m", "Bsf82Mjt5NE8E6jzOQ3rdxJxPZ1l07U0", "nMVr1OXFgO77YVtlUwHFZPELEg6kEWFc", "Z0AGIJkNHQG55BLEpihJsaApVZzc41t8"],
      keyIndex: 0,
      add: {
        url: "https://captcha.solvium.io/api/v1/task",
        endpoint: "/turnstile",
        method: "GET",
        header: key => ({
          Authorization: `Bearer ${key}`
        }),
        params: (url, sitekey, rest) => ({
          url: url,
          sitekey: sitekey,
          ...rest
        }),
        body: null,
        response: data => data?.task_id
      },
      poll: {
        url: "https://captcha.solvium.io/api/v1/task",
        endpoint: tid => `/status/${tid}`,
        method: "GET",
        header: key => ({
          Authorization: `Bearer ${key}`
        }),
        body: null,
        ok: "completed",
        response: data => data?.result?.solution
      }
    }, {
      name: "anti-captcha",
      keys: ["98c5510fb5661c0511a3371de51c6e35"],
      keyIndex: 0,
      add: {
        url: "https://api.anti-captcha.com",
        endpoint: "/createTask",
        method: "POST",
        header: () => ({
          "Content-Type": "application/json"
        }),
        body: (key, url, sitekey, rest) => ({
          clientKey: key,
          task: {
            type: "TurnstileTaskProxyless",
            websiteURL: url,
            websiteKey: sitekey,
            ...rest
          }
        }),
        response: data => data?.errorId === 0 ? data?.taskId : null
      },
      poll: {
        url: "https://api.anti-captcha.com",
        endpoint: "/getTaskResult",
        method: "POST",
        header: () => ({
          "Content-Type": "application/json"
        }),
        body: (key, tid) => ({
          clientKey: key,
          taskId: tid
        }),
        ok: "ready",
        response: data => data?.solution?.token
      }
    }, {
      name: "2captcha",
      keys: ["e6dc1ba7300343def65a3e7c03e19bc2"],
      keyIndex: 0,
      add: {
        url: "https://api.2captcha.com",
        endpoint: "/createTask",
        method: "POST",
        header: () => ({
          "Content-Type": "application/json"
        }),
        body: (key, url, sitekey, rest) => ({
          clientKey: key,
          task: {
            type: "TurnstileTaskProxyless",
            websiteURL: url,
            websiteKey: sitekey,
            ...rest
          }
        }),
        response: data => data?.errorId === 0 ? data?.taskId : null
      },
      poll: {
        url: "https://api.2captcha.com",
        endpoint: "/getTaskResult",
        method: "POST",
        header: () => ({
          "Content-Type": "application/json"
        }),
        body: (key, tid) => ({
          clientKey: key,
          taskId: tid
        }),
        ok: "ready",
        response: data => data?.solution?.token
      }
    }];
  }
  getNextKey(provider) {
    const keys = provider.keys;
    if (!keys || keys.length === 0) return null;
    const key = keys[provider.keyIndex];
    provider.keyIndex = (provider.keyIndex + 1) % keys.length;
    return key;
  }
  log(m) {
    console.log(`[${new Date().toLocaleTimeString()}] ${m}`);
  }
  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  async solve({
    provider,
    url,
    sitekey,
    ...rest
  }) {
    for (const p of this.providers) {
      if (provider && p.name !== provider) continue;
      const key = rest?.key || rest?.apiKey || this.getNextKey(p);
      if (!key) {
        this.log(`Key tidak tersedia untuk provider: ${p.name}`);
        continue;
      }
      try {
        this.log(`Mencoba provider: ${p.name} dengan key index ${p.keyIndex}...`);
        const tid = await this.addTask(p, key, url, sitekey, rest);
        if (!tid) {
          this.log(`Gagal membuat task di ${p.name}, beralih ke provider lain...`);
          continue;
        }
        this.log(`ID Task: ${tid}. Memulai polling status...`);
        const res = await this.poll(p, key, tid);
        if (res?.token) return res;
      } catch (e) {
        this.log(`Error pada ${p.name}: ${e.message}`);
        continue;
      }
    }
    return null;
  }
  async addTask(provider, key, url, sitekey, rest) {
    const config = provider.add;
    const requestUrl = `${config.url}${config.endpoint}`;
    const headers = config.header ? config.header(key) : {};
    const body = config.body ? config.body(key, url, sitekey, rest) : null;
    const params = config.params ? config.params(url, sitekey, rest) : null;
    try {
      let res;
      switch (config.method.toUpperCase()) {
        case "GET":
          res = await this.api.get(requestUrl, {
            headers: headers,
            params: params
          });
          break;
        case "POST":
          res = await this.api.post(requestUrl, body, {
            headers: headers
          });
          break;
        default:
          this.log(`Metode ${config.method} tidak didukung.`);
          return null;
      }
      return config.response(res?.data);
    } catch (e) {
      this.log(`Gagal addTask pada ${provider.name}: ${e.message}`);
      return null;
    }
  }
  async poll(provider, key, tid) {
    const config = provider.poll;
    const endpoint = typeof config.endpoint === "function" ? config.endpoint(tid) : config.endpoint;
    const requestUrl = `${config.url}${endpoint}`;
    const headers = config.header ? config.header(key) : {};
    const body = config.body ? config.body(key, tid) : null;
    let loop = 0;
    while (loop < 60) {
      loop++;
      await this.wait(3e3);
      try {
        let res;
        switch (config.method.toUpperCase()) {
          case "GET":
            res = await this.api.get(requestUrl, {
              headers: headers
            });
            break;
          case "POST":
            res = await this.api.post(requestUrl, body, {
              headers: headers
            });
            break;
          default:
            return null;
        }
        const data = res?.data || {};
        const status = data?.status || "processing";
        if (status === config.ok) {
          this.log(`[${provider.name}] Berhasil diselesaikan!`);
          return {
            token: config.response(data),
            status: status,
            loop: loop,
            provider: provider.name
          };
        }
        this.log(`[${provider.name}] Polling ke-${loop}: ${status}`);
      } catch (e) {
        this.log(`Polling warn pada ${provider.name}: ${e.message}`);
      }
    }
    return null;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url || !params.sitekey) {
    return res.status(400).json({
      error: "Parameter 'url' dan 'sitekey' diperlukan"
    });
  }
  const api = new CaptchaSolver();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan sistem"
    });
  }
}