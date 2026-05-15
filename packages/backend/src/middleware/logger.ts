import type { MiddlewareHandler } from "hono";
import type { RequestContext } from "./request-id";

const log = (entry: Record<string, unknown>): void => {
  console.log(JSON.stringify(entry));
};

export const logger: MiddlewareHandler<{ Variables: RequestContext }> = async (ctx, next) => {
  const start = performance.now();

  await next();

  const durationMs = Math.round(performance.now() - start);

  log({
    level: "info",
    requestId: ctx.get("requestId"),
    method: ctx.req.method,
    path: ctx.req.path,
    status: ctx.res.status,
    durationMs,
  });
};
