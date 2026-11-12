import { getSession } from '../../../src/lib/session';
import { withRateLimit } from '../../../src/lib/rateLimit';

function handler(req, res) {
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'Belum login' });
  res.status(200).json({
    method: req.method,
    user: s.name,
    query: req.query,
    body: req.body ?? null,
    receivedAt: new Date().toISOString(),
  });
}
export default withRateLimit(handler, { limit: 30, windowMs: 60000 });
