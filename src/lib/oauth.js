import apiConfig from "@/configs/apiConfig";
export const PROVIDERS = {
  github: {
    label: "GitHub",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    scope: "read:user user:email",
    id: () => apiConfig.GITHUB_ID,
    secret: () => apiConfig.GITHUB_SECRET,
    map: u => ({
      id: `github:${u.id}`,
      name: u.name || u.login || "GitHub Operative",
      email: u.email || null,
      avatar: u.avatar_url || null,
      provider: "github",
      role: "Operative"
    })
  },
  google: {
    label: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile",
    id: () => apiConfig.GOOGLE_CLIENT_ID,
    secret: () => apiConfig.GOOGLE_CLIENT_SECRET,
    map: u => ({
      id: `google:${u.sub}`,
      name: u.name || "Google Agent",
      email: u.email || null,
      avatar: u.picture || null,
      provider: "google",
      role: "Operative"
    })
  }
};
export const isConfigured = providerKey => {
  const p = PROVIDERS[providerKey];
  return Boolean(p && p.id() && p.secret());
};
export function baseUrl(req) {
  if (apiConfig.DOMAIN_URL) {
    return apiConfig.DOMAIN_URL.startsWith("http") ? apiConfig.DOMAIN_URL.replace(/\/$/, "") : `https://${apiConfig.DOMAIN_URL.replace(/\/$/, "")}`;
  }
  const proto = req.headers["x-forwarded-proto"] || (req.connection?.encrypted ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}
export function createGuestUser() {
  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return {
    id: `guest:${Date.now()}`,
    name: `Operative-${randomHex}`,
    email: null,
    avatar: null,
    provider: "guest",
    role: "Guest Recon"
  };
}