import type { MiddlewareHandler } from "hono";
import { AppError } from "../errors/app-error";

type RateLimiterOptions = {
  windowMs: number;
  max: number;
  keyFn?: (ctx: Parameters<MiddlewareHandler>[0]) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const defaultKey: RateLimiterOptions["keyFn"] = (ctx) => {
  const forwarded = ctx.req.header("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || ctx.req.header("x-real-ip") || "unknown";
  return ip;
};

export const createRateLimiter = ({ windowMs, max, keyFn = defaultKey }: RateLimiterOptions): MiddlewareHandler => {
  const buckets = new Map<string, Bucket>();
  const disabled = process.env.NODE_ENV === "test";

  return async (ctx, next) => {
    if (disabled) {
      await next();
      return;
    }
    const key = keyFn(ctx);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      ctx.header("Retry-After", String(retryAfter));
      throw new AppError({
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many requests, slow down",
      });
    }

    bucket.count += 1;
    await next();
  };
};
