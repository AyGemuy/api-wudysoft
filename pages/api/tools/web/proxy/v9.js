import axios from "axios";
class HideProxy {
  constructor() {
    this.cookies = [];
    this.proxies = ["nl", "de", "fi"];
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36";
    this.client = axios.create({
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    this.client.interceptors.response.use(res => {
      const rawCookies = res.headers["set-cookie"];
      if (rawCookies) {
        this.cookies = [...this.cookies.filter(c => !rawCookies.some(rc => rc.split("=")[0] === c.split("=")[0])), ...rawCookies];
        console.log(`[COOKIE] Berhasil memperbarui cookie store. Total: ${this.cookies.length}`);
      }
      return res;
    }, err => Promise.reject(err));
  }
  _gPrx(custom) {
    return custom || this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }
  _gHdr(extra = {}) {
    return {
      "User-Agent": this.ua,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "id,ms;q=0.9,en;q=0.8",
      Cookie: this.cookies.join("; "),
      ...extra
    };
  }
  async download({
    url,
    proxy,
    ...rest
  }) {
    try {
      const targetUrl = url || "https://nekopoi.care";
      const selectedProxy = this._gPrx(proxy);
      const baseUrl = `https://${selectedProxy}.hideproxy.me`;
      console.log(`[PROSES] Memulai bypass lewat proxy server: [${selectedProxy.toUpperCase()}]`);
      console.log(`[PROSES] Target URL: ${targetUrl}`);
      console.log("[PROSES] Mengirim token update session via POST...");
      const step1 = await this.client.post(`${baseUrl}/includes/process.php?action=update`, new URLSearchParams({
        u: targetUrl,
        go: "",
        proxy_formdata_server: selectedProxy
      }).toString(), {
        headers: this._gHdr({
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://hide.me",
          Referer: "https://hide.me/"
        }),
        ...rest
      });
      const redirectUrl = step1.headers?.location || step1.config?.url;
      if (!redirectUrl) throw new Error("Gagal mendapatkan URL redirect (go.php).");
      console.log(`[PROSES] Berhasil melewati Step 1. URL Pengalihan: ${redirectUrl}`);
      console.log("[PROSES] Mengambil konten halaman target via GET...");
      const step2 = await this.client.get(redirectUrl, {
        headers: this._gHdr({
          Referer: "https://hide.me/",
          "Upgrade-Insecure-Requests": "1"
        }),
        ...rest
      });
      console.log("[SUKSES] Data HTML berhasil didapatkan.");
      return {
        success: true,
        proxyUsed: selectedProxy,
        cookies: this.cookies,
        html: step2.data?.toString() ? step2.data : ""
      };
    } catch (error) {
      console.error(`[ERROR] Terjadi kegagalan saat proses download: ${error.message}`);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new HideProxy();
  try {
    const result = await api.download(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result?.html);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}