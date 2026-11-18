import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import { PROVIDERS, isConfigured } from '../../../src/lib/oauth';

function handler(req, res) {
  res.status(200).json({
    providers: Object.keys(PROVIDERS).map((key) => ({ key, label: PROVIDERS[key].label, enabled: isConfigured(key) })),
  });
}

export default withApiLog(withRateLimit(handler));
