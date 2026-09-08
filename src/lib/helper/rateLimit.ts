// lib/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error(
    "Upstash Redis env vars are missing — rate limiting is disabled.",
  );
}

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

function buildLimiter(
  limiter: ReturnType<typeof Ratelimit.slidingWindow>,
  prefix: string,
) {
  if (!redis) {
    // No Redis configured — return a stub that always allows requests
    // through rather than crashing every page load.
    return {
      limit: async () => ({ success: true }),
    };
  }
  return new Ratelimit({ redis, limiter, prefix });
}

export const writeLimiter = buildLimiter(
  Ratelimit.slidingWindow(30, "60 s"),
  "ratelimit:write",
);

export const authLimiter = buildLimiter(
  Ratelimit.slidingWindow(7, "5 m"),
  "ratelimit:auth",
);
