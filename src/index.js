// Konfigurasi 100% hardcoded di configs/*.cjs — tidak ada .env / dotenv.
const http = require("http");
const apiLog = require("../lib/apiLogger.cjs");
const log = require("../lib/logger.cjs");
const bootAt = Date.now();
const net = require("net");
const os = require("os");
const next = require("next");
// Kompresi gzip untuk HTML/JSON/JS/CSS (server kustom tidak memakai kompresi bawaan Next).
// SSE / socket / stream realtime dikecualikan agar tidak ter-buffer.
let compress = null;
try {
  const compression = require("next/dist/compiled/compression");
  compress = compression({
    threshold: 1024,
    filter: (req, res) => {
      const u = req.url || "";
      if (u.startsWith("/socket.io") || u.startsWith("/api/live") || u.includes("/stream")) return false;
      if (String(res.getHeader("Content-Type") || "").includes("text/event-stream")) return false;
      if (req.headers.accept && String(req.headers.accept).includes("text/event-stream")) return false;
      return compression.filter(req, res);
    }
  });
} catch {}
const dev = process.argv.includes("--dev");
if (!dev) process.env.NODE_ENV = "production";
const app = next({
  dev: dev,
  dir: process.cwd()
});
const handle = app.getRequestHandler();
const isFree = port => new Promise(resolve => {
  const s = net.createServer();
  s.once("error", () => resolve(false));
  s.once("listening", () => s.close(() => resolve(true)));
  s.listen(port, "0.0.0.0");
});
async function findPort(start, tries = 100) {
  for (let p = start; p < start + tries; p++) {
    if (await isFree(p)) return p;
  }
  throw new Error(`[WUDYSOFT-ERR] Tidak ada port kosong mulai dari ${start}`);
}
const lanIPs = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
app.prepare().then(async () => {
  const apiConfig = require("../configs/apiConfig.cjs");
  const wanted = apiConfig.PORT || 3000;
  const port = await findPort(wanted);
  if (port !== wanted) {
    log.warn(`Port ${wanted} terpakai, dialihkan ke ${port}`);
  }
  const server = http.createServer((req, res) => {
    const startTime = performance.now();
    if (req.url.startsWith("/api/")) apiLog.startLog(req, res); // log req/res realtime untuk semua route API
    res.on("finish", () => {
      const u = req.url;
      if (u.startsWith("/_next/static") || u.startsWith("/_next/webpack-hmr") || u.startsWith("/_next/image") || u.startsWith("/icons/") || u.endsWith(".ico")) return;
      log.request(req, res, Math.round(performance.now() - startTime));
    });
    if (compress) compress(req, res, () => handle(req, res));
    else handle(req, res);
  });
  server.listen(port, "0.0.0.0", () => {
    log.banner({
      port, dev, ips: lanIPs(), bootMs: Date.now() - bootAt,
      config: [
        ["Domain", apiConfig.DOMAIN_URL ? `https://${apiConfig.DOMAIN_URL}` : "belum diatur", !!apiConfig.DOMAIN_URL],
        ["MongoDB", apiConfig.MONGODB_URI ? "terhubung (URI terisi)" : "belum diatur", !!apiConfig.MONGODB_URI],
        ["Rate limit", `${apiConfig.LIMIT_POINTS} req / ${apiConfig.LIMIT_DURATION}s`, true],
        ["GitHub OAuth", apiConfig.GITHUB_ID && apiConfig.GITHUB_SECRET ? "aktif" : "tidak aktif", apiConfig.GITHUB_ID && apiConfig.GITHUB_SECRET ? true : null],
        ["Google OAuth", apiConfig.GOOGLE_CLIENT_ID ? "aktif" : "tidak aktif", apiConfig.GOOGLE_CLIENT_ID ? true : null],
      ]
    });
  });
  const shutdown = () => {
    log.warn("Mematikan server…");
    server.close(() => { log.ok("Server berhenti dengan aman."); process.exit(0); });
    setTimeout(() => process.exit(0), 4000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}).catch(err => {
  log.error("Gagal memulai server:");
  console.error(err);
  process.exit(1);
});