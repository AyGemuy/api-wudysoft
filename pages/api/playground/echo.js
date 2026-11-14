import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withRateLimit } from '../../../src/lib/rateLimit';

async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Belum login' });
  res.status(200).json({
    method: req.method,
    user: session.user.name,
    provider: session.user.provider,
    query: req.query,
    body: req.body ?? null,
    receivedAt: new Date().toISOString(),
  });
}
export default withRateLimit(handler, { limit: 30, windowMs: 60000 });
