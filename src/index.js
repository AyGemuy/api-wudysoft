const path = require("path");
const fs = require("fs");
const rootEnvPath = path.resolve(process.cwd(), ".env");
const rootEnvLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(rootEnvLocalPath)) {
  require("dotenv").config({
    path: rootEnvLocalPath
  });
} else if (fs.existsSync(rootEnvPath)) {
  require("dotenv").config({
    path: rootEnvPath
  });
} else {
  require("dotenv").config();
}
const http = require("http");
const net = require("net");
const os = require("os");
const next = require("next");
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
  throw new Error(`[NEXUS-ERR] Tidak ada port kosong mulai dari ${start}`);
}
const lanIPs = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
app.prepare().then(async () => {
  let apiConfig;
  try {
    const cfgModule = await import("../configs/apiConfig.js");
    apiConfig = cfgModule.default;
  } catch {
    apiConfig = {
      DOMAIN_URL: process.env.MY_DOMAIN_URL || "api-wudysoft.netlify.app",
      LIMIT_POINTS: 30,
      MONGODB_URI: process.env.MY_MONGODB_URI || "",
      GITHUB_ID: process.env.MY_GITHUB_ID || "",
      GOOGLE_CLIENT_ID: process.env.MY_GOOGLE_CLIENT_ID || ""
    };
  }
  const wanted = parseInt(process.env.PORT, 10) || 3e3;
  const port = await findPort(wanted);
  if (port !== wanted) {
    console.log(`\x1b[33m⚡ [PORT WARN] Port ${wanted} terpakai, dialihkan ke: ${port}\x1b[0m`);
  }
  const server = http.createServer((req, res) => {
    const startTime = performance.now();
    res.on("finish", () => {
      if (req.url.startsWith("/_next/static") || req.url.startsWith("/_next/webpack-hmr") || req.url.startsWith("/icons/") || req.url.endsWith(".ico")) {
        return;
      }
      const duration = Math.round(performance.now() - startTime);
      const status = res.statusCode;
      let statusColor = "[32m";
      if (status >= 500) statusColor = "[31m";
      else if (status >= 400) statusColor = "[33m";
      else if (status >= 300) statusColor = "[36m";
      const timestamp = new Date().toLocaleTimeString("id-ID", {
        hour12: false
      });
      console.log(`\x1b[90m[${timestamp}]\x1b[0m \x1b[35m${req.method.padEnd(6)}\x1b[0m ${statusColor}${status}\x1b[0m \x1b[90m${duration}ms\x1b[0m → ${req.url}`);
    });
    handle(req, res);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log("\n[36m╔══════════════════════════════════════════════════════════╗[0m");
    console.log(`\x1b[36m║  \x1b[1m\x1b[37mNEXUS OS // CYBER GLASS PLATFORM ONLINE\x1b[0m                 \x1b[36m║\x1b[0m`);
    console.log(`\x1b[36m║  Mode: \x1b[32m${(dev ? "DEVELOPMENT (LIVE RELOAD)" : "PRODUCTION (COMPILED)").padEnd(46)}\x1b[36m║\x1b[0m`);
    console.log("[36m╠══════════════════════════════════════════════════════════╣[0m");
    console.log(`\x1b[36m║\x1b[0m  \x1b[33m► Local Host\x1b[0m   : \x1b[4mhttp://localhost:${port}\x1b[0m`);
    lanIPs().forEach(ip => {
      console.log(`\x1b[36m║\x1b[0m  \x1b[34m► Network Node\x1b[0m : \x1b[4mhttp://${ip}:${port}\x1b[0m`);
    });
    console.log("[36m╠══════════════════════════════════════════════════════════╣[0m");
    console.log(`\x1b[36m║  \x1b[1m\x1b[90mCONFIG VALIDATION TELEMETRY (configs/apiConfig.js):\x1b[0m   \x1b[36m║\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  Target Domain : \x1b[36mhttps://${apiConfig.DOMAIN_URL}\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  MongoDB Sync  : ${apiConfig.MONGODB_URI ? "[32m✔ LOADED" : "[31m✖ UNSET"}\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  Rate Limiting : \x1b[32m${apiConfig.LIMIT_POINTS} req / ${apiConfig.LIMIT_DURATION}s\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  GitHub OAuth  : ${apiConfig.GITHUB_ID ? "[32m✔ CONFIGURED" : "[33m○ UNSET"}\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  Google OAuth  : ${apiConfig.GOOGLE_CLIENT_ID ? "[32m✔ CONFIGURED" : "[33m○ UNSET"}\x1b[0m`);
    console.log("[36m╚══════════════════════════════════════════════════════════╝[0m\n");
  });
  const shutdown = () => {
    console.log("\n[33m⚡ Mematikan instance Nexus Node...[0m");
    server.close(() => {
      console.log("[32m✔ Node berhasil dimatikan dengan aman.[0m");
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}).catch(err => {
  console.error("[31m[NEXUS FATAL ERROR][0m Gagal memulai engine server:");
  console.error(err);
  process.exit(1);
});