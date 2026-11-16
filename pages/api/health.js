import { withApiLog } from "@/lib/apiLogger.cjs";
import apiConfig from "@/configs/apiConfig";
import site from "@/configs/siteConfig";

function handler(req, res) {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    configLoaded: {
      source: "hardcoded (configs/apiConfig.cjs)",
      hasSessionSecret: Boolean(apiConfig.JWT_SECRET),
      hasMongo: Boolean(apiConfig.MONGODB_URI),
      hasGithubAuth: Boolean(apiConfig.GITHUB_ID && apiConfig.GITHUB_SECRET),
      hasGoogleAuth: Boolean(apiConfig.GOOGLE_CLIENT_ID && apiConfig.GOOGLE_CLIENT_SECRET),
      rateLimitMax: apiConfig.LIMIT_POINTS,
      appUrl: site.SITE_URL,
    },
  });
}

export default withApiLog(handler);
