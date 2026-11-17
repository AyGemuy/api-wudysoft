/** Mesin request Playground: draft, variabel {{env}}, pengiriman, snippet kode, persistensi. */
import { exampleFromSchema, validateAgainstSchema } from '@/src/lib/openapiClient';

export const uid = () => Math.random().toString(36).slice(2, 9);
export const row = (o = {}) => ({ id: uid(), on: true, key: '', value: '', desc: '', type: 'text', ...o });

export const BODY_MODES = [
  { id: 'none', label: 'None' },
  { id: 'json', label: 'JSON' },
  { id: 'form', label: 'Form-data' },
  { id: 'urlencoded', label: 'urlencoded' },
  { id: 'raw', label: 'Raw' },
];

const strOf = (v) => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/* ---------------- draft dari operasi OpenAPI ---------------- */
export function draftFromOperation(op, parsed) {
  const spec = parsed?.spec;
  const query = op.parameters
    .filter((p) => p.in === 'query')
    .map((p) => {
      const value = p.example !== undefined ? strOf(p.example) : p.enum?.length && p.required ? String(p.enum[0]) : '';
      return row({ key: p.name, value, desc: p.description, required: p.required, enumValues: p.enum, ptype: p.schema?.type, on: p.required || value !== '' });
    });
  const pathVars = op.parameters
    .filter((p) => p.in === 'path')
    .map((p) => row({ key: p.name, value: p.example !== undefined ? strOf(p.example) : p.enum ? String(p.enum[0]) : '', desc: p.description, required: true, enumValues: p.enum, ptype: p.schema?.type }));
  const headers = op.parameters
    .filter((p) => p.in === 'header')
    .map((p) => row({ key: p.name, value: p.example !== undefined ? strOf(p.example) : '', desc: p.description, required: p.required, on: p.required }));

  const body = { mode: 'none', json: '', raw: '', rawType: 'text/plain', form: [], urlencoded: [], mime: null, example: null };
  if (op.body) {
    const mimes = Object.keys(op.body.contents);
    const mime = mimes.find((m) => /json/.test(m)) || mimes[0];
    const c = op.body.contents[mime];
    body.mime = mime;
    const props = Object.entries(c?.schema?.properties || {});
    const asRows = () =>
      props.map(([k, s]) => {
        const sch = s || {};
        const isFile = sch.format === 'binary';
        const ex = spec ? exampleFromSchema(spec, sch) : '';
        return row({ key: k, value: isFile ? '' : strOf(ex), type: isFile ? 'file' : 'text', desc: sch.description || '', required: (c.schema.required || []).includes(k) });
      });
    if (/json/.test(mime)) {
      body.mode = 'json';
      body.json = c.example !== undefined ? JSON.stringify(c.example, null, 2) : '{}';
    } else if (/multipart/.test(mime)) {
      body.mode = 'form';
      body.form = asRows();
    } else if (/urlencoded/.test(mime)) {
      body.mode = 'urlencoded';
      body.urlencoded = asRows();
    } else {
      body.mode = 'raw';
      body.rawType = mime;
      body.raw = c.example !== undefined ? strOf(c.example) : '';
    }
  }

  return {
    id: uid(),
    title: op.summary || `${op.method} ${op.path}`,
    opKey: op.key,
    method: op.method,
    url: `{{baseUrl}}${op.path.replace(/\{(\w+)\}/g, '{$1}')}`,
    query,
    pathVars,
    headers,
    body,
    auth: { type: 'inherit', token: '', user: '', pass: '', keyName: 'X-API-Key', keyValue: '', in: 'header' },
  };
}

export function blankDraft() {
  return {
    id: uid(),
    title: 'Request baru',
    opKey: null,
    method: 'GET',
    url: '{{baseUrl}}/api/health',
    query: [],
    pathVars: [],
    headers: [],
    body: { mode: 'none', json: '', raw: '', rawType: 'text/plain', form: [], urlencoded: [], mime: null, example: null },
    auth: { type: 'inherit', token: '', user: '', pass: '', keyName: 'X-API-Key', keyValue: '', in: 'header' },
  };
}

/** Sinkronkan baris path variable dengan placeholder {name} di URL. */
export function syncPathVars(draft) {
  const names = [...String(draft.url).matchAll(/\{(\w+)\}(?!\})/g)].map((m) => m[1]).filter((n, i, a) => a.indexOf(n) === i);
  const byKey = new Map(draft.pathVars.map((r) => [r.key, r]));
  const next = names.map((n) => byKey.get(n) || row({ key: n, required: true }));
  const same = next.length === draft.pathVars.length && next.every((r, i) => r === draft.pathVars[i]);
  return same ? draft : { ...draft, pathVars: next };
}

/* ---------------- variabel & build request ---------------- */
export function interpolate(text, vars, missing) {
  return String(text ?? '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, name) => {
    if (vars && name in vars && vars[name] !== '') return String(vars[name]);
    missing?.add(name);
    return m;
  });
}

const utf8b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s).toString('base64'));

export function buildRequest(draft, vars, files = {}) {
  const missing = new Set();
  const errors = [];
  const warnings = [];
  const sub = (t) => interpolate(t, vars, missing);

  // URL + path variables
  let url = sub(draft.url).trim();
  for (const pv of draft.pathVars) {
    if (!pv.key) continue;
    const v = sub(pv.value);
    if (v === '') errors.push(`Path variable {${pv.key}} belum diisi`);
    url = url.replace(new RegExp(`\\{${pv.key}\\}`, 'g'), encodeURIComponent(v));
  }
  if (/^\//.test(url) && typeof window !== 'undefined') url = window.location.origin + url;
  if (!/^https?:\/\//i.test(url)) errors.push('URL harus diawali http(s):// atau /path (cek variabel baseUrl)');

  // query
  const qs = [];
  for (const q of draft.query) if (q.on && q.key) qs.push([sub(q.key), sub(q.value)]);

  // header
  const headers = {};
  for (const h of draft.headers) if (h.on && h.key) headers[sub(h.key)] = sub(h.value);

  // auth
  const a = draft.auth || { type: 'inherit' };
  if (a.type === 'bearer' && a.token) headers.Authorization = `Bearer ${sub(a.token)}`;
  if (a.type === 'basic') headers.Authorization = `Basic ${utf8b64(`${sub(a.user)}:${sub(a.pass)}`)}`;
  if (a.type === 'apikey' && a.keyName) {
    if (a.in === 'query') qs.push([sub(a.keyName), sub(a.keyValue)]);
    else headers[sub(a.keyName)] = sub(a.keyValue);
  }

  if (qs.length) {
    const sep = url.includes('?') ? '&' : '?';
    url += sep + qs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  }

  // body
  const method = draft.method;
  const canBody = !['GET', 'HEAD'].includes(method);
  const b = draft.body;
  const hasCT = Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');
  let body;
  let desc = { kind: 'none' };
  if (canBody && b.mode === 'json' && b.json.trim()) {
    const text = sub(b.json);
    try { JSON.parse(text); } catch (e) { warnings.push(`Body JSON tidak valid: ${e.message}`); }
    body = text;
    desc = { kind: 'json', text };
    if (!hasCT) headers['Content-Type'] = 'application/json';
  } else if (canBody && b.mode === 'raw' && b.raw !== '') {
    body = sub(b.raw);
    desc = { kind: 'raw', text: body };
    if (!hasCT) headers['Content-Type'] = b.rawType || 'text/plain';
  } else if (canBody && b.mode === 'urlencoded') {
    const entries = b.urlencoded.filter((r) => r.on && r.key).map((r) => [sub(r.key), sub(r.value)]);
    body = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    desc = { kind: 'urlencoded', text: body, entries };
    if (!hasCT) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (canBody && b.mode === 'form') {
    const fd = new FormData();
    const entries = [];
    for (const r of b.form) {
      if (!r.on || !r.key) continue;
      if (r.type === 'file') {
        const f = files[r.id];
        if (f) { fd.append(sub(r.key), f, f.name); entries.push({ key: r.key, file: f.name }); }
        else if (r.required) errors.push(`File untuk "${r.key}" belum dipilih`);
      } else {
        fd.append(sub(r.key), sub(r.value));
        entries.push({ key: r.key, value: sub(r.value) });
      }
    }
    body = fd;
    desc = { kind: 'form', entries };
    for (const k of Object.keys(headers)) if (k.toLowerCase() === 'content-type') delete headers[k]; // biarkan browser membuat boundary
  }

  if (missing.size) warnings.push(`Variabel belum terisi: ${[...missing].map((m) => `{{${m}}}`).join(', ')}`);
  return { url, method, headers, body, desc, errors, warnings };
}

/* ---------------- kirim request ---------------- */
const TEXTUAL = /(json|text|xml|javascript|html|csv|x-www-form-urlencoded|yaml)/i;

export async function sendRequest(req, { signal } = {}) {
  const t0 = performance.now();
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === window.location.origin; } catch {}
  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      signal,
      cache: 'no-store',
      credentials: sameOrigin ? 'include' : 'omit',
    });
    const buf = await res.arrayBuffer();
    const ms = Math.round(performance.now() - t0);
    const contentType = res.headers.get('content-type') || '';
    const headers = [...res.headers.entries()];
    let text = '';
    let blobUrl = null;
    let kind = 'text';
    if (TEXTUAL.test(contentType) || (!contentType && buf.byteLength < 2_000_000)) {
      text = new TextDecoder('utf-8').decode(buf);
    } else {
      blobUrl = URL.createObjectURL(new Blob([buf], { type: contentType || 'application/octet-stream' }));
      kind = /^image\//.test(contentType) ? 'image' : /pdf/.test(contentType) ? 'pdf' : 'binary';
    }
    let json;
    let isJson = false;
    if (kind === 'text') {
      if (/json/i.test(contentType) || /^\s*[\[{]/.test(text)) {
        try { json = JSON.parse(text); isJson = true; } catch {}
      }
      if (!isJson && /html/i.test(contentType)) kind = 'html';
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, ms, size: buf.byteLength, contentType, headers, text, json, isJson, kind, blobUrl, redirected: res.redirected, finalUrl: res.url };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    if (err?.name === 'AbortError') return { error: 'Request dibatalkan', cancelled: true, ms };
    return {
      error: 'Request gagal dikirim',
      detail: crossOriginHint(req.url, err),
      ms,
    };
  }
}

function crossOriginHint(url, err) {
  try {
    if (new URL(url).origin !== window.location.origin) {
      return 'Server tujuan kemungkinan memblokir CORS, mati, atau URL salah. Browser hanya boleh memanggil origin lain jika servernya mengizinkan (header Access-Control-Allow-Origin).';
    }
  } catch {}
  return err?.message || 'Periksa koneksi dan URL.';
}

/* ---------------- snippet kode ---------------- */
const q1 = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export function toCurl(req) {
  const parts = [`curl -X ${req.method} ${q1(req.url)}`];
  for (const [k, v] of Object.entries(req.headers)) parts.push(`-H ${q1(`${k}: ${v}`)}`);
  const d = req.desc || { kind: 'none' };
  if (d.kind === 'json' || d.kind === 'raw' || d.kind === 'urlencoded') parts.push(`--data-raw ${q1(d.text)}`);
  if (d.kind === 'form') d.entries.forEach((e) => parts.push(`-F ${q1(e.file ? `${e.key}=@${e.file}` : `${e.key}=${e.value}`)}`));
  return parts.join(' \\\n  ');
}

export function toFetch(req) {
  const d = req.desc || { kind: 'none' };
  const lines = [`const res = await fetch(${JSON.stringify(req.url)}, {`, `  method: ${JSON.stringify(req.method)},`];
  if (Object.keys(req.headers).length) lines.push(`  headers: ${JSON.stringify(req.headers, null, 2).replace(/\n/g, '\n  ')},`);
  if (d.kind === 'json') {
    let pretty = d.text;
    try { pretty = JSON.stringify(JSON.parse(d.text), null, 2).replace(/\n/g, '\n  '); lines.push(`  body: JSON.stringify(${pretty}),`); } catch { lines.push(`  body: ${JSON.stringify(d.text)},`); }
  } else if (d.kind === 'raw' || d.kind === 'urlencoded') lines.push(`  body: ${JSON.stringify(d.text)},`);
  else if (d.kind === 'form') lines.push('  body: formData, // new FormData() dengan field sesuai request');
  lines.push('});', 'const data = await res.json();', 'console.log(res.status, data);');
  return lines.join('\n');
}

export function toAxios(req) {
  const d = req.desc || { kind: 'none' };
  const cfg = { method: req.method.toLowerCase(), url: req.url };
  if (Object.keys(req.headers).length) cfg.headers = req.headers;
  if (d.kind === 'json') { try { cfg.data = JSON.parse(d.text); } catch { cfg.data = d.text; } }
  else if (d.kind === 'raw' || d.kind === 'urlencoded') cfg.data = d.text;
  return `import axios from 'axios';\n\nconst res = await axios(${JSON.stringify(cfg, null, 2)});\nconsole.log(res.status, res.data);`;
}

export function toPython(req) {
  const d = req.desc || { kind: 'none' };
  const lines = ['import requests', '', `url = ${JSON.stringify(req.url)}`];
  if (Object.keys(req.headers).length) lines.push(`headers = ${JSON.stringify(req.headers, null, 2)}`);
  let args = `${JSON.stringify(req.method)}, url`;
  if (Object.keys(req.headers).length) args += ', headers=headers';
  if (d.kind === 'json') {
    try { lines.push(`payload = ${JSON.stringify(JSON.parse(d.text), null, 2).replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None')}`); args += ', json=payload'; }
    catch { lines.push(`payload = ${JSON.stringify(d.text)}`); args += ', data=payload'; }
  } else if (d.kind === 'raw' || d.kind === 'urlencoded') { lines.push(`payload = ${JSON.stringify(d.text)}`); args += ', data=payload'; }
  else if (d.kind === 'form') { lines.push('files = {}  # isi dengan file/field sesuai request'); args += ', files=files'; }
  lines.push('', `res = requests.request(${args})`, 'print(res.status_code, res.text)');
  return lines.join('\n');
}

export const SNIPPETS = [
  { id: 'curl', label: 'cURL', fn: toCurl },
  { id: 'fetch', label: 'fetch', fn: toFetch },
  { id: 'axios', label: 'axios', fn: toAxios },
  { id: 'python', label: 'Python', fn: toPython },
];

/* ---------------- tampilan respons ---------------- */
export function formatBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function statusTone(code) {
  if (!code) return 'err';
  if (code >= 500) return 'err';
  if (code >= 400) return 'warn';
  if (code >= 300) return 'info';
  return 'ok';
}

const TOKEN_RE = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
export function tokenizeJson(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m.index > last) out.push({ t: 'plain', v: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      if (m[2]) { out.push({ t: 'key', v: m[1] }); out.push({ t: 'plain', v: m[2] }); }
      else out.push({ t: 'str', v: m[1] });
    } else if (m[3]) out.push({ t: 'bool', v: m[0] });
    else if (m[0] === 'null') out.push({ t: 'null', v: m[0] });
    else out.push({ t: 'num', v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: 'plain', v: text.slice(last) });
  return out;
}

/* ---------------- persistensi ---------------- */
const KEY = 'wudysoft_pg_v2';
export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('nexus_pg_v2') || 'null'); } catch { return null; }
}
export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

/* ---------------- bandingkan respons dengan spesifikasi ---------------- */
export function validateResponse(parsed, op, res) {
  if (!op || !res || res.error) return null;
  const expected = op.responses.map((r) => r.code);
  const code = String(res.status);
  const match =
    op.responses.find((r) => r.code === code) ||
    op.responses.find((r) => r.code.toUpperCase() === `${code[0]}XX`) ||
    op.responses.find((r) => r.code === 'default');
  const issues = [];
  if (match?.schema && res.isJson) validateAgainstSchema(parsed.spec, match.schema, res.json, '$', issues);
  let state = 'ok';
  let title;
  let short;
  if (!expected.length) { state = res.status < 400 ? 'ok' : 'warn'; title = 'Spesifikasi tidak mendefinisikan respons untuk operasi ini'; short = 'tanpa spec'; }
  else if (!match) { state = 'warn'; title = `Status ${res.status} tidak terdokumentasi di spesifikasi`; short = 'di luar spec'; }
  else if (issues.length) { state = 'warn'; title = `Status ${match.code} cocok, tetapi ${issues.length} ketidaksesuaian skema`; short = `${issues.length} isu skema`; }
  else { title = `Cocok dengan spesifikasi (${match.code})`; short = 'sesuai spec'; }
  return { state, title, short, issues, expected };
}
