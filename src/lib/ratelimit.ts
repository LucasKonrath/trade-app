import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Centralized rate-limiting for write actions. Uses Upstash's serverless
 * Redis (free tier covers an LGS-sized community easily).
 *
 * If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set, every
 * limiter is null and checkLimit() silently allows every call. That way the
 * code can ship and run locally or on preview deploys without any external
 * dependency, and prod enables rate limiting the moment env vars are set.
 */

const redis = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

function makeLimiter(limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`, prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix,
  });
}

export const limiters = {
  /** Trades proposed per user per hour. */
  createTrade: makeLimiter(30, "1 h", "rl:trade"),
  /** Trade comments posted per user per hour (chatty haggling is OK). */
  comment: makeLimiter(60, "1 h", "rl:comment"),
  /** Listing writes per user per hour (cataloging a whole collection is OK). */
  listing: makeLimiter(500, "1 h", "rl:listing"),
  /** LGS creation per user per day (abuse prevention). */
  createLgs: makeLimiter(3, "1 d", "rl:lgs"),
  /** Game-preference changes per user per hour. */
  gameInterests: makeLimiter(60, "1 h", "rl:games"),
};

export type LimitResult = { ok: true } | { ok: false; error: string };

/**
 * Non-throwing rate-limit check. Returns a result object that server actions
 * can forward to the client; critical for prod because Next.js masks thrown
 * errors from server actions as generic React errors.
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
  message: string,
): Promise<LimitResult> {
  if (!limiter) return { ok: true };
  const { success, reset } = await limiter.limit(key);
  if (success) return { ok: true };
  const seconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  const minutes = Math.ceil(seconds / 60);
  const retryHint =
    minutes >= 2
      ? `Tente novamente em ~${minutes} minutos.`
      : `Tente novamente em ${seconds}s.`;
  return { ok: false, error: `${message} ${retryHint}` };
}
