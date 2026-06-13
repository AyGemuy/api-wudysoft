import {
  execSync
} from "child_process";
import crypto from "crypto";
class SSYoutube {
  constructor() {
    this.tsDef = 1781077401086;
    this.tscDef = 0;
    this.secret = "a206400c60b78bd376073d4a840f8b65098e4d4bccd7d19aa90a1b9f0d615ecd";
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature hash _s...");
      const jsonPart = `{"target_url":"${url}"}`;
      const str = `${jsonPart}${ts}${this.secret}`;
      return crypto.createHash("sha256").update(str).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature:", err.message);
      return null;
    }
  }
  _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec dari server via cURL...");
      const cmd = `curl -s 'https://id.ssyoutube.com/msec' \\
              -H 'accept: */*' \\
              -H 'accept-language: id-ID' \\
              -H 'referer: https://id.ssyoutube.com/' \\
              -H 'sec-ch-ua: "Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"' \\
              -H 'sec-ch-ua-mobile: ?1' \\
              -H 'sec-ch-ua-platform: "Android"' \\
              -H 'sec-fetch-dest: empty' \\
              -H 'sec-fetch-mode: cors' \\
              -H 'sec-fetch-site: same-origin' \\
              -H 'user-agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36'`;
      const res = execSync(cmd).toString();
      return JSON.parse(res).msec;
    } catch (err) {
      console.error("[ERROR] Gagal mengambil msec server:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download untuk URL:", url);
      const msec = this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) + 14557;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = JSON.stringify({
        target_url: url,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _s: s
      });
      console.log("[PROSES] Mengirim payload ke endpoint api/convert...");
      const cmd = `curl -s 'https://api-wh.ssyoutube.com/api/convert' \\
              -H 'accept: application/json, text/plain, */*' \\
              -H 'accept-language: id-ID' \\
              -H 'cache-control: no-cache' \\
              -H 'content-type: application/json' \\
              -H 'origin: https://id.ssyoutube.com' \\
              -H 'pragma: no-cache' \\
              -H 'priority: u=1, i' \\
              -H 'referer: https://id.ssyoutube.com/' \\
              -H 'sec-ch-ua: "Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"' \\
              -H 'sec-ch-ua-mobile: ?1' \\
              -H 'sec-ch-ua-platform: "Android"' \\
              -H 'sec-fetch-dest: empty' \\
              -H 'sec-fetch-mode: cors' \\
              -H 'sec-fetch-site: same-site' \\
              -H 'user-agent: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36' \\
              --data-raw '${payload}'`;
      const res = execSync(cmd).toString();
      console.log("[SUKSES] Respons asli API berhasil didapatkan.");
      return JSON.parse(res);
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download:", err.message);
      return {
        success: false,
        error: err.message,
        output: err.output ? err.output.toString() : null
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
  const api = new SSYoutube();
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