import {
  LRUCache
} from "lru-cache";
import apiConfig from "@/configs/apiConfig";
const defaultTtlMs = (apiConfig.LIMIT_DURATION || 60) * 1e3;
const defaultLimit = apiConfig.LIMIT_POINTS || 30;
export const rateLimitStore = globalThis.__lruRateLimitStore || (globalThis.__lruRateLimitStore = new LRUCache({
  max: 1e4,
  ttl: defaultTtlMs,
  updateAgeOnGet: false
}));
export const clientIp = req => {
  if (req?.headers?.get) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.ip || "127.0.0.1";
  }
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req?.headers?.["cf-connecting-ip"] || req?.headers?.["x-real-ip"] || req?.socket?.remoteAddress || "127.0.0.1";
};
export function checkRateLimit(key, limit = defaultLimit, windowMs = defaultTtlMs) {
  const now = Date.now();
  let record = rateLimitStore.get(key);
  if (!record || record.reset <= now) {
    record = {
      count: 0,
      reset: now + windowMs
    };
  }
  record.count++;
  rateLimitStore.set(key, record, {
    ttl: windowMs
  });
  const remaining = Math.max(0, limit - record.count);
  const resetSec = Math.ceil((record.reset - now) / 1e3);
  return {
    ok: record.count <= limit,
    remaining: remaining,
    resetSec: resetSec,
    limit: limit
  };
}
export function withRateLimit(handler, {
  limit = defaultLimit,
  windowMs = defaultTtlMs
} = {}) {
  return async (req, res) => {
    const route = (req.url || "").split("?")[0];
    const ip = clientIp(req);
    const key = `${route}::${ip}`;
    const r = checkRateLimit(key, limit, windowMs);
    res.setHeader("X-RateLimit-Limit", String(r.limit));
    res.setHeader("X-RateLimit-Remaining", String(r.remaining));
    res.setHeader("X-RateLimit-Reset", String(r.resetSec));
    if (!r.ok) {
      res.setHeader("Retry-After", String(r.resetSec));
      return res.status(429).json({
        ok: false,
        error: "Terlalu banyak permintaan (Rate limit exceeded).",
        limit: r.limit,
        remaining: 0,
        retryAfter: r.resetSec
      });
    }
    return handler(req, res);
  };
}
export default withRateLimit;