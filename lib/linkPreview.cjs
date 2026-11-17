'use strict';
/**
 * Pratinjau link otomatis untuk endpoint API.
 *
 * Crawler pratinjau (WhatsApp, Telegram, Discord, Facebook, X/Twitter, Slack, LinkedIn, iMessage, …)
 * tidak menjalankan JavaScript dan hanya membaca <meta>. Endpoint API membalas JSON/teks biasa,
 * sehingga tidak ada pratinjau. Modul ini mengubah respons JSON/teks menjadi halaman HTML kecil
 * berisi tag Open Graph + Twitter yang judul & deskripsinya diambil dari ISI respons — khusus
 * untuk crawler. Klien API biasa (curl, axios, browser fetch, dst.) tetap menerima respons asli.
 * Untuk uji manual tambahkan `?__preview=1` pada URL.
 */
const BOT_RE = /(facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|discordbot|slackbot|slack-imgproxy|linkedinbot|skypeuripreview|pinterest|embedly|vkshare|redditbot|applebot|iframely|tumblr|bitlybot|kakaotalk-scrap|viber|mastodon|bluesky|cardyb|mattermost|nextcloud|zalo|snapchat|line-poker|quora link preview)/i;

const SITE = 'Wudysoft';

function wantsPreview(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const url = req.url || '';
  if (/[?&]__preview=1(&|$)/.test(url)) return true;
  return BOT_RE.test(String(req.headers['user-agent'] || ''));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const squash = (s, n) => {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const isStr = (v) => typeof v === 'string' && v.trim();
const firstStr = (o, keys) => { for (const k of keys) if (isStr(o && o[k])) return o[k]; return ''; };

function summarize(parsed, status, text, method, path) {
  const fallbackTitle = `${method} ${path}`;
  const ok = status < 400;
  const err = !ok ? `Error ${status}` : '';
  let title = '';
  let desc = '';

  if (parsed && typeof parsed === 'object') {
    let main = parsed;
    if (!Array.isArray(parsed) && parsed.data && typeof parsed.data === 'object') main = parsed.data;

    if (Array.isArray(main)) {
      const names = main.slice(0, 4).map((i) => (i && typeof i === 'object' ? firstStr(i, ['title', 'name', 'fileName', 'roomName', 'key', 'id', 'path']) : String(i))).filter(Boolean);
      title = `${main.length} data · ${path}`;
      desc = names.length ? names.join(' • ') : squash(JSON.stringify(main), 190);
    } else {
      title = firstStr(main, ['title', 'name', 'fileName', 'roomName', 'username']) || firstStr(parsed, ['title', 'name', 'message', 'error']);
      if (!title && isStr(main.status)) title = `${path} · ${main.status}`;
      const errObj = parsed.error && typeof parsed.error === 'object' ? parsed.error.message : parsed.error;
      desc = firstStr(main, ['description', 'content', 'code', 'message']) || (isStr(errObj) ? errObj : '') || firstStr(parsed, ['message']);
      if (!title && isStr(errObj)) title = squash(errObj, 80);
      if (!desc) {
        // ringkas: pasangan kunci: nilai dari field skalar, mis. "status: online · environment: production"
        const pairs = Object.entries(main).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)).slice(0, 6).map(([k, v]) => `${k}: ${v}`);
        desc = pairs.length ? pairs.join(' · ') : squash(JSON.stringify(main), 190);
      }
    }
  } else {
    const t = String(text || '').trim();
    const lines = t.split(/\r?\n/).filter((l) => l.trim());
    title = squash(lines[0] || '', 80);
    desc = squash(lines.slice(1).join(' ') || t, 190);
  }

  title = squash(title || fallbackTitle, 90);
  if (err) title = `${err} — ${title}`;
  return { title, desc: squash(desc, 190) };
}

function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  return `${proto}://${host}`;
}

function buildHtml({ req, status, contentType, text, bytes }) {
  const origin = originOf(req);
  const full = req.url || '/';
  const path = full.split('?')[0];
  const canonical = `${origin}${full.replace(/([?&])__preview=1(&|$)/, '$1').replace(/[?&]$/, '')}`;
  let parsed = null;
  if (/json/i.test(contentType) || /^\s*[[{]/.test(text)) { try { parsed = JSON.parse(text); } catch { parsed = null; } }
  const { title, desc } = summarize(parsed, status, text, req.method, path);
  const pageTitle = `${title} · ${SITE} API`;
  const img = `${origin}/api/og?${new URLSearchParams({ title, desc, tag: 'API', path }).toString()}`;
  let shown = text;
  if (parsed) { try { shown = JSON.stringify(parsed, null, 2); } catch { /* pakai teks asli */ } }
  shown = shown.length > 6000 ? `${shown.slice(0, 6000)}\n…` : shown;
  const m = (k, v, attr = 'property') => `<meta ${attr}="${k}" content="${esc(v)}">`;
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pageTitle)}</title>
${m('description', desc, 'name')}
${m('robots', 'noindex,nofollow', 'name')}
<link rel="canonical" href="${esc(canonical)}">
${m('og:type', 'website')}${m('og:site_name', `${SITE} API`)}${m('og:title', pageTitle)}${m('og:description', desc)}${m('og:url', canonical)}
${m('og:image', img)}${m('og:image:secure_url', img)}${m('og:image:type', 'image/png')}${m('og:image:width', '1200')}${m('og:image:height', '630')}${m('og:image:alt', pageTitle)}${m('og:locale', 'id_ID')}
${m('twitter:card', 'summary_large_image', 'name')}${m('twitter:title', pageTitle, 'name')}${m('twitter:description', desc, 'name')}${m('twitter:image', img, 'name')}${m('twitter:image:alt', pageTitle, 'name')}
</head><body style="font-family:'Segoe UI',system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 16px;color:#1b1b1b">
<h1>${esc(title)}</h1><p style="color:#5e5e5e">${esc(desc)}</p>
<p><code>${esc(req.method)} ${esc(full)}</code> · HTTP ${status} · ${bytes} byte</p>
<pre style="background:#f3f3f3;padding:14px;overflow:auto;white-space:pre-wrap;word-break:break-word">${esc(shown)}</pre>
</body></html>`;
}

/**
 * Pasang pada `res` sebelum handler berjalan. Bila respons ternyata JSON/teks biasa,
 * body diganti halaman pratinjau. HTML / biner / redirect dibiarkan apa adanya.
 */
function installPreview(req, res) {
  if (!wantsPreview(req) || res.__previewInstalled) return;
  res.__previewInstalled = true;
  const origEnd = res.end;
  const chunks = [];
  res.write = function (chunk) { if (chunk && typeof chunk !== 'function') chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); return true; };
  res.end = function (chunk, ...rest) {
    if (chunk && typeof chunk !== 'function') chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    const body = Buffer.concat(chunks);
    const ct = String(res.getHeader('content-type') || '');
    const previewable = res.statusCode < 300 || res.statusCode >= 400;
    if (previewable && body.length < 2_000_000 && (/json|text\/plain/i.test(ct) || (!ct && body.length)) && !res.getHeader('content-encoding')) {
      const html = buildHtml({ req, status: res.statusCode, contentType: ct, text: body.toString('utf8'), bytes: body.length });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      res.setHeader('Content-Length', Buffer.byteLength(html));
      return origEnd.call(this, req.method === 'HEAD' ? undefined : html, ...rest);
    }
    return origEnd.call(this, body.length ? body : undefined, ...rest);
  };
}

module.exports = { wantsPreview, installPreview, buildHtml, summarize, BOT_RE };
