/**
 * Sumber data Live Stats (server-only). MongoDB adalah sumber kebenaran; memori proses hanya
 * menambah event yang belum sempat tersimpan. Dengan begitu stats tetap benar di hosting
 * serverless (banyak instance, memori tidak dibagi) maupun di server Node biasa.
 */
import connectMongo from "@/lib/mongoose";
import ApiLog from "@/models/ApiLog";
import logger from "@/lib/apiLogger.cjs";

const withTimeout = (p, ms = 3000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

const safeJson = (s) => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };

export function rowToEvent(l) {
  return {
    id: l.eid || String(l._id),
    seq: 0,
    ts: new Date(l.timestamp).getTime(),
    method: l.method,
    path: l.path,
    query: safeJson(l.query),
    status: l.statusCode,
    ms: l.latencyMs,
    ip: l.ip,
    ua: l.ua || "",
    req: { bytes: l.reqBytes || 0, contentType: "", headers: {}, body: l.reqBody || "" },
    res: { bytes: l.resBytes || 0, contentType: l.contentType || "", headers: {}, body: l.resBody || "", truncated: false },
  };
}

/** Gabungkan beberapa daftar event: buang duplikat (id sama), urut terbaru → terlama. */
function merge(lists, limit) {
  const seen = new Map();
  for (const list of lists) for (const e of list) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()].sort((a, b) => b.ts - a.ts).slice(0, limit);
}

let cache = { at: 0, value: null };

/** Agregat 7 hari terakhir (sesuai TTL koleksi) — di-cache singkat agar polling 2 detik tetap ringan. */
export async function dbCounters() {
  if (cache.value && Date.now() - cache.at < 4000) return cache.value;
  const rows = await withTimeout(
    ApiLog.aggregate([
      { $group: { _id: { $floor: { $divide: ["$statusCode", 100] } }, n: { $sum: 1 }, ms: { $sum: "$latencyMs" } } },
    ])
  );
  const by = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  let total = 0, sumMs = 0;
  for (const r of rows) {
    total += r.n; sumMs += r.ms;
    if (by[`${r._id}xx`] !== undefined) by[`${r._id}xx`] += r.n;
  }
  const value = { total, sumMs, byClass: by };
  cache = { at: Date.now(), value };
  return value;
}

export const invalidateCounters = () => { cache = { at: 0, value: null }; };

/**
 * Riwayat + counter untuk klien.
 * @param {number} after  ts (ms) — hanya event dengan ts >= after (0 = ambil snapshot terbaru)
 */
export async function liveSnapshot({ after = 0, limit = 150 } = {}) {
  const mem = after ? logger.snapshot(300).filter((e) => e.ts >= after) : logger.snapshot(limit);
  const unsaved = logger.pending().filter((e) => !after || e.ts >= after);
  let dbEvents = [];
  let source = "memory";
  let counters = logger.counters();

  try {
    await withTimeout(connectMongo(), 3000);
    const q = after ? { timestamp: { $gte: new Date(after) } } : {};
    const rows = await withTimeout(ApiLog.find(q).sort({ timestamp: -1 }).limit(after ? 300 : limit).lean());
    dbEvents = rows.map(rowToEvent);
    const agg = await dbCounters();

    // tambahkan event yang masih antre (belum tertulis) agar angka tidak "ketinggalan" 1–2 detik
    const queued = unsaved.filter((e) => !dbEvents.some((d) => d.id === e.id));
    let total = agg.total, sumMs = agg.sumMs;
    const by = { ...agg.byClass };
    for (const e of queued) {
      total += 1; sumMs += e.ms;
      const k = `${Math.floor(e.status / 100)}xx`;
      if (by[k] !== undefined) by[k] += 1;
    }
    counters = {
      source: "db",
      windowLabel: "7 hari terakhir",
      total,
      errors: by["4xx"] + by["5xx"],
      avgMs: total ? Math.round(sumMs / total) : 0,
      byClass: by,
      lastSeq: logger.counters().lastSeq,
    };
    source = "db";
  } catch {
    counters = { ...logger.counters(), source: "memory", windowLabel: "sejak instance menyala" };
  }

  const events = merge([dbEvents, mem, unsaved], after ? 300 : limit);
  return { events, counters, source };
}
