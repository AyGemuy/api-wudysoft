const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true
  }
});
const {
  createSecureHeaders
} = require("next-secure-headers");
const apiConfig = {
  DOMAIN_URL: "wudysoft.xyz"
};
const securityHeaders = [...createSecureHeaders({
  frameGuard: "deny",
  xssProtection: "block-rendering",
  referrerPolicy: "strict-origin-when-cross-origin"
}), {
  key: "Content-Security-Policy",
  value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'none';"
}, {
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
}, {
  key: "X-DNS-Prefetch-Control",
  value: "on"
}, {
  key: "Strict-Transport-Security",
  value: "max-age=31536000; includeSubDomains"
}, {
  key: "X-Content-Type-Options",
  value: "nosniff"
}, {
  key: "X-Frame-Options",
  value: "DENY"
}, {
  key: "X-XSS-Protection",
  value: "1; mode=block"
}, {
  key: "Referrer-Policy",
  value: "strict-origin-when-cross-origin"
}];
const nextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    nextScriptWorkers: true,
    serverActions: true,
    amp: {
      skipValidation: true
    }
  },
  images: {
    domains: [apiConfig.DOMAIN_URL, "cdn.weatherapi.com", "tile.openstreetmap.org", "www.chess.com", "deckofcardsapi.com", "raw.githubusercontent.com"],
    minimumCacheTTL: 60,
    remotePatterns: [{
      protocol: "https",
      hostname: "**"
    }]
  },
  async headers() {
    const staticCache = [{
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable"
    }];
    const noCache = [{
      key: "Cache-Control",
      value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    }];
    return [{
      source: "/(.*)",
      headers: securityHeaders
    }, {
      source: "/:path*(sw.js|workbox-*.js)",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=0, must-revalidate"
      }, {
        key: "Service-Worker-Allowed",
        value: "/"
      }]
    }, {
      source: "/manifest.json",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=0, must-revalidate"
      }]
    }, {
      source: "/api/:path*",
      headers: [{
        key: "Access-Control-Allow-Credentials",
        value: "true"
      }, {
        key: "Access-Control-Allow-Origin",
        value: "*"
      }, {
        key: "Access-Control-Allow-Methods",
        value: "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      }, {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Origin, X-CSRF-Token"
      }, ...noCache]
    }, {
      source: "/_next/static/:path*",
      headers: staticCache
    }, {
      source: "/_next/image/:path*",
      headers: [{
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable"
      }]
    }, {
      source: "/:path*\\.(jpg|jpeg|gif|png|svg|ico|webp|avif|woff|woff2|ttf|eot|otf|css|js|map)",
      headers: staticCache
    }, {
      source: "/:path*",
      has: [{
        type: "header",
        key: "accept",
        value: "(.*text/html.*)"
      }],
      headers: [...noCache, {
        key: "Pragma",
        value: "no-cache"
      }, {
        key: "Expires",
        value: "0"
      }]
    }];
  },
  async rewrites() {
    return [{
      source: "/api/:path*",
      has: [{
        type: "header",
        key: "access-control-request-method"
      }],
      destination: "/api/:path*"
    }];
  },
  webpack: (config, {
    dev,
    isServer
  }) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil"
    });
    if (!dev && !isServer) {
      const WebpackObfuscator = require("webpack-obfuscator");
      config.plugins.push(new WebpackObfuscator({
        compact: true,
        renameGlobals: false,
        identifierNamesGenerator: "hexadecimal",
        log: false,
        stringArray: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayThreshold: .75,
        unicodeEscapeSequence: false,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        selfDefending: false,
        disableConsoleOutput: true
      }, ["node_modules/**"]));
    }
    return config;
  }
});
module.exports = nextConfig;