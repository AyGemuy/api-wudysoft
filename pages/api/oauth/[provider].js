import crypto from 'crypto';
import { PROVIDERS, isConfigured, baseUrl } from '../../../src/lib/oauth';
import { cookie } from '../../../src/lib/session';

export default function handler(req, res) {
  const { provider } = req.query;
  const p = PROVIDERS[provider];
  if (!p) return res.status(404).json({ error: 'Provider tidak dikenal' });
  if (!isConfigured(provider)) return res.redirect(`/auth/oauth?error=${encodeURIComponent(`${p.label} belum dikonfigurasi di .env`)}`);

  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', cookie('oauth_state', state, 600));

  const url = new URL(p.authUrl);
  url.searchParams.set('client_id', p.id());
  url.searchParams.set('redirect_uri', `${baseUrl(req)}/api/oauth/callback/${provider}`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', p.scope);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
}
