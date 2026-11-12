export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    configLoaded: {
      hasSessionSecret: Boolean(process.env.SESSION_SECRET),
      hasGithubAuth: Boolean(process.env.GITHUB_CLIENT_ID),
      rateLimitMax: process.env.RATE_LIMIT_MAX || 60,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set (using default fallback)',
    },
  });
}