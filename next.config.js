require("dotenv").config();
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com", "images.unsplash.com"]
  },
  async headers() {
    return [{
      source: "/sw.js",
      headers: [{
        key: "Cache-Control",
        value: "no-cache, no-store, must-revalidate"
      }, {
        key: "Service-Worker-Allowed",
        value: "/"
      }]
    }];
  }
};
module.exports = nextConfig;