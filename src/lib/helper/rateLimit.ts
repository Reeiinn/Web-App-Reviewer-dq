// lib/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import redis from "../redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error(
    "Upstash Redis env vars are missing — rate limiting is disabled.",
  );
}

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
 * 60 write requests per minute, per signed-in account where there is one and
 * per IP otherwise. Keying on the account is the point: a training centre puts
 * every reviewee behind one address, and an IP budget there is a budget they
 * spend on each other — one learner working quickly could throttle the room.
 */
export const writeLimiter = buildLimiter(
  Ratelimit.slidingWindow(60, "60 s"),
  "ratelimit:write",
);

/**
 * Answers written while sitting a practice exam.
 *
 * A paper runs to sixty questions and each pick is written through as it is
 * made, so a learner moving quickly through a paper they know is a burst of
 * writes that is entirely legitimate. It gets its own, wider budget rather
 * than eating the general one.
 */
export const examAnswerLimiter = buildLimiter(
  Ratelimit.slidingWindow(240, "60 s"),
  "ratelimit:exam-answers",
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
