import type { MiddlewareHandler } from "hono";
import { sql } from "../db/connection";
import { extractBearerToken, verifyAccessToken, type AccessTokenClaims } from "./jwt";

export type AuthVariables = {
  user: AccessTokenClaims;
};

export type OptionalAuthVariables = {
  viewer: AccessTokenClaims | null;
};

const userExists = async (id: string): Promise<boolean> => {
  const [row] = await sql`SELECT 1 FROM users WHERE id = ${id}`;
  return Boolean(row);
};

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (ctx, next) => {
  const token = extractBearerToken(ctx.req.header("authorization"));
  const claims = token ? await verifyAccessToken(token) : null;

  if (!claims || !(await userExists(claims.sub))) {
    ctx.header("WWW-Authenticate", 'Bearer realm="ify"');
    return ctx.json({ error: "Invalid or expired token" }, 401);
  }

  ctx.set("user", claims);
  await next();
};

export const optionalAuth: MiddlewareHandler<{ Variables: OptionalAuthVariables }> = async (ctx, next) => {
  const token = extractBearerToken(ctx.req.header("authorization"));
  const claims = token ? await verifyAccessToken(token) : null;
  const viewer = claims && (await userExists(claims.sub)) ? claims : null;
  ctx.set("viewer", viewer);
  await next();
};
