/**
 * Generator OpenAPI 3.0 — memindai pages/api, menganalisis kode secara statis
 * (method, parameter query, field body, kebutuhan login), lalu menggabungkan registry.
 *
 *   node scripts/openapi-gen.mjs        → tulis src/generated/openapi.json
 * Otomatis dijalankan sebelum `dev` dan `build` (lihat package.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from './openapi-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = path.join(ROOT, 'pages', 'api');
const OUT = path.join(ROOT, 'src', 'generated', 'openapi.json');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const SKIP = new Set(['[[...path]].js', 'socket.js']);
const SKIP_ROUTES = new Set(['/api/playground/endpoints', '/api/routes', '/api/live']); // internal/usang

/* ---------------- util ---------------- */
const cap = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (k === 'parameters') continue; // ditangani terpisah
    out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
  }
  return out;
}

function walk(dir, base = '') {
  const out = [];
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    if (it.name.startsWith('_')) continue;
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(full, `${base}/${it.name}`));
    else if (/\.(js|ts)$/.test(it.name) && !SKIP.has(it.name)) {
      const name = it.name.replace(/\.(js|ts)$/, '');
      out.push({ file: full, route: name === 'index' ? base || '/' : `${base}/${name}`, fileName: it.name });
    }
  }
  return out;
}

/* ---------------- heuristik tipe & contoh ---------------- */
function guess(name, def) {
  const n = name.toLowerCase();
  if (def !== undefined && def !== null) {
    if (/^-?\d+$/.test(def)) return { type: 'integer', default: Number(def) };
    if (/^-?\d*\.\d+$/.test(def)) return { type: 'number', default: Number(def) };
    if (def === 'true' || def === 'false') return { type: 'boolean', default: def === 'true' };
    const m = def.match(/^["'`](.*)["'`]$/);
    if (m) return { type: 'string', default: m[1] };
  }
  if (/(^|_)(page|limit|offset|count|size|ttl|max|min|timeout|skip|take)$/.test(n)) return { type: 'integer', example: n === 'page' ? 1 : 10 };
  if (/^(is|has|enable|with|include)[A-Z_a-z]/.test(name)) return { type: 'boolean', example: true };
  if (/email/.test(n)) return { type: 'string', format: 'email', example: 'user@example.com' };
  if (/(^|_)(url|link|uri)$/.test(n)) return { type: 'string', format: 'uri', example: 'https://example.com' };
  if (/(^|_)(ids|tags|items|list|files)$/.test(n)) return { type: 'array', items: { type: 'string' }, example: ['a', 'b'] };
  if (/(^|_)(data|payload|options|meta|metadata|config|settings)$/.test(n)) return { type: 'object', additionalProperties: true, example: {} };
  if (/(^id$|_id$|Id$)/.test(name)) return { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' };
  if (/(prompt|query|search|^q$|text|message|content|body)/.test(n)) return { type: 'string', example: 'halo' };
  if (/(title)/.test(n)) return { type: 'string', example: 'Judul contoh' };
  if (/(name|author|username|user)/.test(n)) return { type: 'string', example: 'Wudysoft' };
  if (/(password|pass|secret|token|key)/.test(n)) return { type: 'string', example: 'string' };
  return { type: 'string', example: 'string' };
}

/** "a, b = 1, c: alias, ...rest" → [{name, def}] */
function parseDestructure(src) {
  const items = [];
  let depth = 0, cur = '';
  for (const ch of src) {
    if ('{[('.includes(ch)) depth++;
    if ('}])'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { items.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) items.push(cur);
  return items
    .map((x) => x.trim().replace(/\/\/.*$/gm, '').trim())
    .filter((x) => x && !x.startsWith('...'))
    .map((x) => {
      const [left, ...rest] = x.split('=');
      const def = rest.length ? rest.join('=').trim() : undefined;
      return { name: left.split(':')[0].trim(), def };
    })
    .filter((x) => /^[A-Za-z_$][\w$]*$/.test(x.name));
}

/* ---------------- analisis statis ---------------- */
function analyze(src) {
  // posisi penanda method → untuk menentukan method pemilik sebuah blok
  const marks = [];
  for (const m of src.matchAll(/case\s+["'`](GET|POST|PUT|PATCH|DELETE)["'`]\s*:/g)) marks.push({ at: m.index, method: m[1] });
  for (const m of src.matchAll(/req\.method\s*===?\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/g)) marks.push({ at: m.index, method: m[1] });
  marks.sort((a, b) => a.at - b.at);
  const methodAt = (pos) => {
    let cur = null;
    for (const mk of marks) if (mk.at <= pos) cur = mk.method; else break;
    return cur;
  };

  const methods = new Set(marks.map((m) => m.method));
  const guard = [...src.matchAll(/req\.method\s*!==?\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/g)].map((m) => m[1]);
  guard.forEach((m) => methods.add(m));

  const hits = []; // {kind:'query'|'body', name, def, method|null}
  const addDestructure = (re, kind) => {
    for (const m of src.matchAll(re)) {
      for (const it of parseDestructure(m[1])) hits.push({ kind, ...it, method: methodAt(m.index) });
    }
  };
  addDestructure(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*req\.query\b/g, 'query');
  addDestructure(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*req\.body\b/g, 'body');
  // const { action } = req.method === "GET" ? req.query : req.body;
  for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*req\.method\s*===?\s*["'`]GET["'`]\s*\?\s*req\.query\s*:[^;]*?req\.body/g)) {
    methods.add('GET'); methods.add('POST');
    for (const it of parseDestructure(m[1])) {
      hits.push({ kind: 'query', ...it, method: 'GET' });
      hits.push({ kind: 'body', ...it, method: 'POST' });
    }
  }
  for (const m of src.matchAll(/req\.query\.([A-Za-z_$][\w$]*)/g)) hits.push({ kind: 'query', name: m[1], method: methodAt(m.index) });
  for (const m of src.matchAll(/req\.query\[\s*["'`]([\w$-]+)["'`]\s*\]/g)) hits.push({ kind: 'query', name: m[1], method: methodAt(m.index) });
  for (const m of src.matchAll(/req\.body\.([A-Za-z_$][\w$]*)/g)) hits.push({ kind: 'body', name: m[1], method: methodAt(m.index) });

  const usesBody = /req\.body\b/.test(src);
  // handler tanpa penjaga `!==` selalu melayani GET sebagai default
  if (!guard.length && !methods.has('GET')) methods.add('GET');
  if (!methods.size) methods.add('GET');
  if (usesBody && ![...methods].some((m) => m !== 'GET')) methods.add('POST');

  // enum dari `switch (action) { case "x": ... }`
  const enums = {};
  for (const sw of src.matchAll(/switch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/g)) {
    if (sw[1] === 'req' ) continue;
    const rest = src.slice(sw.index, sw.index + 2500);
    const vals = [...rest.matchAll(/case\s+["'`]([\w.-]+)["'`]\s*:/g)].map((m) => m[1]);
    if (vals.length && !vals.every((v) => METHODS.includes(v))) enums[sw[1]] = [...new Set(vals)];
  }

  return {
    methods: [...methods].filter((m) => METHODS.includes(m)),
    hits,
    enums,
    usesSession: /getServerSession|getSession\(|session\?*\.user/.test(src),
    rateLimited: /withRateLimit|checkRateLimit/.test(src),
  };
}

const VERB = { GET: 'Ambil', POST: 'Kirim', PUT: 'Perbarui', PATCH: 'Ubah', DELETE: 'Hapus' };
function friendlySummary(method, route) {
  const parts = route.replace(/^\/api\/?/, '').split('/').filter((p) => !/^\{/.test(p));
  return `${VERB[method] || method} ${cap(parts.join(' ') || 'root')}`.trim();
}

function buildOperation(method, route, a, tag) {
  const forMethod = (h) => h.method === method || h.method === null || (h.method && !a.methods.includes(h.method));
  const params = new Map();
  const bodyFields = new Map();

  for (const h of a.hits) {
    if (h.kind === 'query') {
      // query param valid untuk GET/DELETE selalu; untuk method lain hanya bila blok miliknya
      const allowed = h.method === method || (h.method === null && (method === 'GET' || method === 'DELETE'));
      if (!allowed) continue;
      if (!params.has(h.name)) params.set(h.name, h);
    } else {
      const allowed = h.method === method || (h.method === null && !['GET', 'DELETE'].includes(method));
      if (!allowed) continue;
      if (!bodyFields.has(h.name)) bodyFields.set(h.name, h);
    }
  }

  const parameters = [...params.values()].map((h) => {
    const schema = guess(h.name, h.def);
    if (a.enums[h.name]) schema.enum = a.enums[h.name];
    const { example, ...rest } = schema;
    return {
      name: h.name,
      in: 'query',
      required: false,
      description: `Terdeteksi otomatis dari kode.${h.def !== undefined ? ` Default: ${h.def}.` : ''}`,
      schema: rest,
      ...(example !== undefined ? { example } : {}),
    };
  });

  // path parameter dari {id}
  for (const m of route.matchAll(/\{(\w+)\}/g)) {
    parameters.unshift({ name: m[1], in: 'path', required: true, schema: { type: 'string' }, description: 'Path parameter', example: m[1] === 'id' ? '1' : 'string' });
  }

  const op = {
    tags: [tag],
    summary: friendlySummary(method, route),
    description: 'Parameter dideteksi otomatis dari kode sumber. Tambahkan detail di `scripts/openapi-registry.mjs`.',
    operationId: `${method.toLowerCase()}_${route.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`,
    parameters,
    responses: {
      200: { description: 'Berhasil', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
      400: { description: 'Permintaan tidak valid' },
      429: { description: 'Terlalu banyak permintaan (rate limit)' },
      500: { description: 'Kesalahan server' },
    },
  };

  if (method !== 'GET' && (method !== 'DELETE' || bodyFields.size > 0)) {
    const props = {};
    const example = {};
    for (const h of bodyFields.values()) {
      const g = guess(h.name, h.def);
      if (a.enums[h.name]) g.enum = a.enums[h.name];
      const { example: ex, ...schema } = g;
      props[h.name] = schema;
      example[h.name] = ex !== undefined ? ex : g.default !== undefined ? g.default : g.enum ? g.enum[0] : 'string';
    }
    op.requestBody = {
      required: bodyFields.size > 0,
      content: {
        'application/json': {
          schema: Object.keys(props).length ? { type: 'object', properties: props } : { type: 'object', additionalProperties: true },
          example: Object.keys(example).length ? example : {},
        },
      },
    };
  }

  if (a.usesSession) {
    op.security = [{ cookieAuth: [] }];
    op.responses[401] = { description: 'Belum login' };
  }
  return op;
}

/* ---------------- rakit spesifikasi ---------------- */
export function generateSpec() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const files = walk(API_DIR);
  const paths = {};
  const tagSet = new Set();

  const put = (route, method, op) => {
    (paths[route] ||= {})[method.toLowerCase()] = op;
    (op.tags || []).forEach((t) => tagSet.add(t));
  };

  for (const f of files) {
    const rawRoute = '/api' + (f.route === '/' ? '' : f.route);
    if (/\[\.\.\./.test(rawRoute) || SKIP_ROUTES.has(rawRoute)) continue; // catch-all (NextAuth ditangani registry)
    const route = rawRoute.replace(/\[(\w+)\]/g, '{$1}');
    const segs = route.split('/').filter(Boolean); // ['api', 'x', ...]
    const tag = cap(segs.length > 2 ? segs[1] : segs[1] || 'General');
    const src = fs.readFileSync(f.file, 'utf8');
    const a = analyze(src);
    for (const m of a.methods) put(route, m, buildOperation(m, route, a, tag));
  }

  // gabungkan registry (juga menambah endpoint yang tidak punya file sendiri)
  for (const [key, patch] of Object.entries(REGISTRY)) {
    const [method, route] = key.split(' ');
    const existing = paths[route]?.[method.toLowerCase()] || {
      tags: [cap(route.split('/')[2] || 'General')],
      operationId: `${method.toLowerCase()}_${route.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`,
      parameters: [],
      responses: { 200: { description: 'Berhasil' } },
    };
    const merged = merge(existing, patch);
    if (patch.parameters) {
      const byKey = new Map((existing.parameters || []).map((p) => [`${p.in}:${p.name}`, p]));
      for (const p of patch.parameters) byKey.set(`${p.in}:${p.name}`, p);
      merged.parameters = [...byKey.values()];
    }
    if (patch.security) merged.security = patch.security;
    put(route, method, merged);
  }

  const tags = [...tagSet].sort().map((name) => ({ name }));
  const pathCount = Object.keys(paths).length;
  const opCount = Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0);

  return {
    openapi: '3.0.3',
    info: {
      title: 'Wudysoft API',
      version: pkg.version || '1.0.0',
      description: `Dokumen dibuat otomatis dari \`pages/api\` (${opCount} operasi pada ${pathCount} path). Detail akurat ditambahkan lewat \`scripts/openapi-registry.mjs\`.\n\n**Auth:** sesi browser (cookie NextAuth) atau \`Authorization: Bearer <apiToken>\`.`,
    },
    servers: [{ url: '/', description: 'Origin saat ini' }],
    tags,
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'next-auth.session-token', description: 'Cookie sesi NextAuth (otomatis dikirim browser).' },
        apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key', description: 'Kunci API pribadi (buat di /keys): `wd_live_…`.' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT dari POST /api/auth atau `session.user.apiToken`.' },
      },
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const spec = generateSpec();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(spec, null, 2));
  const ops = Object.values(spec.paths).reduce((n, p) => n + Object.keys(p).length, 0);
  console.log(`[openapi] ${ops} operasi / ${Object.keys(spec.paths).length} path → ${path.relative(ROOT, OUT)}`);
}
