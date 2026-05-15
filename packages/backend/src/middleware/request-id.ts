import type { MiddlewareHandler } from "hono";
import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";

export type RequestContext = {
  requestId: string;
};

export const requestId: MiddlewareHandler<{ Variables: RequestContext }> = async (ctx, next) => {
  const incoming = ctx.req.header(REQUEST_ID_HEADER);
  const id = incoming && incoming.length <= 64 ? incoming : randomUUID();

  ctx.set("requestId", id);
  ctx.header(REQUEST_ID_HEADER, id);

  await next();
};
