import crypto from 'crypto';
import { startSession } from '../../../src/lib/session';
import { withRateLimit } from '../../../src/lib/rateLimit';

function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = (req.body?.name || '').toString().trim().slice(0, 32);
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  const name = raw || `Operative-${randomHex}`;

  const user = {
    id: `guest:${crypto.randomUUID()}`,
    name,
    email: null,
    avatar: null,
    provider: 'guest',
    role: 'Guest Recon',
  };

  startSession(res, user);
  return res.status(200).json({ ok: true, user });
}

export default withRateLimit(handler, { limit: 10, windowMs: 60000 });