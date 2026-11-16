'use strict';
/**
 * Logger request/response API (CommonJS agar bisa dipakai server custom `src/index.js`
 * maupun route Next.js). State disimpan di globalThis sehingga dipakai bersama oleh
 * semua instance modul dalam satu proses.
 *
 *  - startLog(req, res)   : mulai merekam (idempotent). Dipanggil server custom untuk SEMUA /api/*.
 *  - withApiLog(handler)  : pembungkus route; menambah pratinjau body respons (sebelum kompresi).
 *  - bus 'log'            : event realtime (Socket.IO / polling membacanya).
 *  - persist              : ditulis ke MongoDB (koleksi ApiLog); koneksi dibuka otomatis, flush langsung (aman untuk serverless).
 */
const { EventEmitter } = require('events');

const g = globalThis;
const S = g.__nexusApiLog || (g.__nexusApiLog = {
  bus: new EventEmitter(),
  ring: [],
  seq: 0,
  queue: [],
  since: Date.now(),
  counters: { total: 0, errors: 0, sumMs: 0, s2: 0, s3: 0, s4: 0, s5: 0 },
  timer: null,
});
S.bus.setMaxListeners(0);

const RING_MAX = 300;
const BODY_MAX = 2000;
const CHUNK_MAX = 4096;
const IGNORE = [/^\/api\/stats/, /^\/api\/live/, /^\/api\/socket/, /^\/api\/auth\/(session|csrf|_log)/];
const SENSITIVE = /(pass(word)?|token|secret|authorization|cookie|api[-_]?key|csrf|session|credential|set-cookie)/i;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ---------------- redaksi ---------------- */
function redact(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value !== 'object') return value;
  if (depth > 4) return '[…]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(value)) {
    if (n++ > 40) { out['…'] = 'dipotong'; break; }
    out[k] = SENSITIVE.test(k) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

function redactHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h || {})) {
    const val = Array.isArray(v) ? v.join(', ') : String(v);
    out[k.toLowerCase()] = SENSITIVE.test(k) ? '[redacted]' : val.length > 200 ? `${val.slice(0, 200)}…` : val;
  }
  return out;
}

function preview(body, contentType) {
  if (body == null || body === '') return '';
  let v = body;
  if (Buffer.isBuffer(v)) v = v.toString('utf8');
  if (typeof v === 'object') {
    try { return JSON.stringify(redact(v)).slice(0, BODY_MAX); } catch { return '[object]'; }
  }
  const s = String(v);
  if (/json/i.test(contentType || '') || /^\s*[\[{]/.test(s)) {
    try { return JSON.stringify(redact(JSON.parse(s))).slice(0, BODY_MAX); } catch { /* bukan JSON utuh */ }
  }
  return s.slice(0, BODY_MAX);
}

const ipOf = (req) => String(req.headers['x-nf-client-connection-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || '127.0.0.1';

function queryOf(req, url) {
  // hanya dari URL: req.query juga berisi parameter route dinamis (mis. `path`) yang bukan query sebenarnya
  const i = url.indexOf('?');
  if (i < 0) return {};
  const o = {};
  new URLSearchParams(url.slice(i + 1)).forEach((v, k) => { o[k] = v; });
  return redact(o);
}

/* ---------------- perekaman ---------------- */
function startLog(req, res) {
  if (req.__nexusLog) return req.__nexusLog;
  const url = req.url || '';
  const path = url.split('?')[0];
  if (!path.startsWith('/api/') || IGNORE.some((r) => r.test(path))) {
    req.__nexusLog = { skip: true };
    return req.__nexusLog;
  }
  let doneFn; const done = new Promise((r) => { doneFn = r; });
  const ctx = { skip: false, done, doneFn, start: now(), url, path, size: 0, outer: [], got: 0, plain: [], plainGot: 0, hasPlain: false };
  req.__nexusLog = ctx;

  const capture = (chunk) => {
    if (!chunk || typeof chunk === 'function') return;
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    ctx.size += b.length;
    if (ctx.got < CHUNK_MAX) { const part = b.subarray(0, CHUNK_MAX - ctx.got); ctx.outer.push(part); ctx.got += part.length; }
  };
  const w = res.write;
  const e = res.end;
  res.write = function (chunk, ...a) { capture(chunk); return w.call(this, chunk, ...a); };
  res.end = function (chunk, ...a) { capture(chunk); return e.call(this, chunk, ...a); };
  res.once('finish', () => finish(req, res, ctx));
  return ctx;
}

/** Lapisan dalam: menangkap body respons SEBELUM kompresi dari Next.js. */
function captureInner(res, ctx) {
  const take = (chunk) => {
    if (!chunk || typeof chunk === 'function') return;
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    ctx.hasPlain = true;
    ctx.plainSize = (ctx.plainSize || 0) + b.length;
    if (ctx.plainGot < CHUNK_MAX) { const part = b.subarray(0, CHUNK_MAX - ctx.plainGot); ctx.plain.push(part); ctx.plainGot += part.length; }
  };
  const w = res.write;
  const e = res.end;
  res.write = function (chunk, ...a) { take(chunk); return w.call(this, chunk, ...a); };
  res.end = function (chunk, ...a) { take(chunk); return e.call(this, chunk, ...a); };
}

function finish(req, res, ctx) {
  const ms = Math.round(now() - ctx.start);
  const status = res.statusCode;
  const resCT = String(res.getHeader('content-type') || '');
  const reqCT = String(req.headers['content-type'] || '');
  const encoded = res.getHeader('content-encoding');
  let resBody = '';
  if (ctx.hasPlain) resBody = preview(Buffer.concat(ctx.plain), resCT);
  else if (!encoded && ctx.outer.length) resBody = preview(Buffer.concat(ctx.outer), resCT);
  else if (encoded) resBody = '[terkompresi]';

  S.seq += 1;
  const ev = {
    id: `${Date.now().toString(36)}${S.seq}`,
    seq: S.seq,
    ts: Date.now(),
    method: req.method,
    path: ctx.path,
    query: queryOf(req, ctx.url),
    status,
    ms,
    ip: ipOf(req),
    ua: String(req.headers['user-agent'] || '').slice(0, 160),
    req: { bytes: Number(req.headers['content-length'] || 0), contentType: reqCT, headers: redactHeaders(req.headers), body: preview(req.body, reqCT) },
    res: { bytes: ctx.plainSize || ctx.size, contentType: resCT, headers: redactHeaders(res.getHeaders ? res.getHeaders() : {}), body: resBody, truncated: (ctx.plainSize || ctx.size) > CHUNK_MAX },
  };
  record(ev);
  if (ctx.doneFn) ctx.doneFn();
}

function record(ev) {
  S.ring.push(ev);
  if (S.ring.length > RING_MAX) S.ring.splice(0, S.ring.length - RING_MAX);
  const c = S.counters;
  c.total += 1; c.sumMs += ev.ms;
  if (ev.status >= 500) { c.s5 += 1; c.errors += 1; } else if (ev.status >= 400) { c.s4 += 1; c.errors += 1; } else if (ev.status >= 300) c.s3 += 1; else c.s2 += 1;
  S.bus.emit('log', ev);
  S.queue.push(ev);
  if (!S.timer) {
    S.timer = setInterval(flush, 2000);
    if (S.timer.unref) S.timer.unref();
  }
  setImmediate(flush);
}

/* ---------------- persistensi (opsional, batch) ---------------- */
function getModel() {
  const mongoose = require('mongoose');
  if (mongoose.models.ApiLog) return mongoose.models.ApiLog;
  const schema = new mongoose.Schema({
    eid: { type: String, index: true },
    path: { type: String, required: true, index: true },
    method: { type: String, required: true, default: 'GET' },
    statusCode: { type: Number, required: true, index: true },
    latencyMs: { type: Number, required: true },
    isSuccess: { type: Boolean, required: true, index: true },
    ip: { type: String, default: '127.0.0.1' },
    query: { type: String },
    ua: { type: String },
    reqBody: { type: String },
    resBody: { type: String },
    reqBytes: { type: Number },
    resBytes: { type: Number },
    contentType: { type: String },
    timestamp: { type: Date, default: Date.now, index: { expires: '7d' } },
  }, { timestamps: false });
  return mongoose.model('ApiLog', schema);
}

const toDoc = (e) => ({
  eid: e.id, path: e.path, method: e.method, statusCode: e.status, latencyMs: e.ms, isSuccess: e.status < 400, ip: e.ip,
  query: JSON.stringify(e.query), ua: e.ua, reqBody: e.req.body, resBody: e.res.body, reqBytes: e.req.bytes, resBytes: e.res.bytes,
  contentType: e.res.contentType, timestamp: new Date(e.ts),
});

let flushing = null;
/**
 * Tulis antrean ke MongoDB. Bila belum terhubung, mencoba menyambung (dengan jeda antar-kegagalan)
 * sehingga log TIDAK hilang di hosting serverless yang baru "bangun".
 */
function flush() {
  if (flushing) return flushing;
  if (!S.queue.length) return Promise.resolve();
  flushing = (async () => {
    try {
      if (Date.now() < (S.retryAt || 0)) return;
      await require('./mongoose.cjs')();
      const batch = S.queue.splice(0, 200);
      if (!batch.length) return;
      try {
        await getModel().insertMany(batch.map(toDoc), { ordered: false });
      } catch (err) {
        if (!err || !err.insertedDocs) S.queue.unshift(...batch.slice(0, 100)); // coba lagi nanti
      }
    } catch {
      S.retryAt = Date.now() + 5000;
      if (S.queue.length > 500) S.queue.splice(0, S.queue.length - 500);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Event yang sudah terjadi tapi belum tersimpan di DB (untuk digabung saat membaca riwayat). */
const pending = () => S.queue.slice();

/* ---------------- API publik ---------------- */
function withApiLog(handler) {
  return async function apiLogged(req, res) {
    const ctx = startLog(req, res);
    if (!ctx.skip && !ctx.inner) { ctx.inner = true; captureInner(res, ctx); }
    try {
      return await handler(req, res);
    } finally {
      // Serverless membekukan fungsi sesaat setelah respons: pastikan log sudah masuk DB sebelum selesai.
      if (!ctx.skip && ctx.done) {
        try {
          await Promise.race([ctx.done, new Promise((r) => setTimeout(r, 800))]);
          await Promise.race([flush(), new Promise((r) => setTimeout(r, 1500))]);
        } catch { /* log tidak boleh merusak respons */ }
      }
    }
  };
}

const snapshot = (limit = 100) => S.ring.slice(-limit).reverse();
const since = (seq) => S.ring.filter((e) => e.seq > seq).reverse();
function counters() {
  const c = S.counters;
  return { startedAt: S.since, total: c.total, errors: c.errors, avgMs: c.total ? Math.round(c.sumMs / c.total) : 0, byClass: { '2xx': c.s2, '3xx': c.s3, '4xx': c.s4, '5xx': c.s5 }, lastSeq: S.seq };
}
function clearLogs() {
  S.ring.length = 0; S.queue.length = 0;
  Object.assign(S.counters, { total: 0, errors: 0, sumMs: 0, s2: 0, s3: 0, s4: 0, s5: 0 });
  S.since = Date.now();
}

module.exports = { bus: S.bus, startLog, withApiLog, snapshot, since, counters, clearLogs, getModel, flush, pending, redact };
