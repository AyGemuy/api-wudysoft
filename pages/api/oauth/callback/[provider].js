import { PROVIDERS, isConfigured, baseUrl } from '../../../../src/lib/oauth';
import { parseCookies, startSession, cookie } from '../../../../src/lib/session';

export default async function handler(req, res) {
  const { provider, code, state } = req.query;
  const p = PROVIDERS[provider];
  const fail = (m) => res.redirect(`/auth/oauth?error=${encodeURIComponent(m)}`);

  if (!p || !isConfigured(provider)) return fail('Provider tidak tersedia');
  if (!code || !state || state !== parseCookies(req).oauth_state) return fail('State tidak valid, coba lagi');

  try {
    const tokenRes = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: p.id(),
        client_secret: p.secret(),
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl(req)}/api/oauth/callback/${provider}`,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) return fail('Gagal menukar kode login');

    const userRes = await fetch(p.userUrl, { headers: { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'glass-next' } });
    const user = p.map(await userRes.json());

    res.setHeader('Set-Cookie', cookie('oauth_state', '', 0));
    startSession(res, user);
    res.redirect('/playground');
  } catch (e) {
    fail('Terjadi kesalahan saat login');
  }
}
