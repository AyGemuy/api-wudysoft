import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import { endSession } from '../../../src/lib/session';

function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  endSession(res);
  return res.status(200).json({ ok: true, message: 'Session terminated' });
}

export default withApiLog(withRateLimit(handler));
