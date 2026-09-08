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
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

function buildLimiter(
  limiter: ReturnType<typeof Ratelimit.slidingWindow>,
  prefix: string,
) {
  if (!redis) {
    return {
      limit: async (_key: string) => ({
        success: true,
      }),
    };
  }

  return new Ratelimit({
    redis,
    limiter,
    prefix,
  });
}

/**
 * General write protection.
 *
 * 30 write requests per minute per IP.
 */
export const writeLimiter = buildLimiter(
  Ratelimit.slidingWindow(30, "60 s"),
  "ratelimit:write",
);

/**
 * Login protection per IP.
 *
 * Prevents one client from repeatedly attacking
 * multiple accounts.
 *
 * 20 attempts per 15 minutes per IP.
 */
export const authIpLimiter = buildLimiter(
  Ratelimit.slidingWindow(20, "15 m"),
  "ratelimit:auth:ip",
);

/**
 * Login protection per account.
 *
 * Prevents repeated attempts against one account,
 * even if the attacker changes IP addresses.
 *
 * 7 attempts per 15 minutes per email.
 */
export const authEmailLimiter = buildLimiter(
  Ratelimit.slidingWindow(7, "15 m"),
  "ratelimit:auth:email",
);
