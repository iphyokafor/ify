import { Hono } from "hono";
import { argon2PasswordService } from "../../security/password";
import { issueAccessToken } from "../../security/jwt";
import { createRateLimiter } from "../../middleware/rate-limit";
import { authRepository } from "./auth.repository";
import { createAuthService } from "./auth.service";

const ONE_MINUTE_MS = 60_000;

const authService = createAuthService({
  repository: authRepository,
  password: argon2PasswordService,
  token: { issue: issueAccessToken },
});

const loginLimiter = createRateLimiter({ windowMs: ONE_MINUTE_MS, max: 10 });
const registerLimiter = createRateLimiter({ windowMs: ONE_MINUTE_MS, max: 5 });

export const authRoutes = new Hono();

authRoutes.post("/register", registerLimiter, async (ctx) => {
  const result = await authService.register(await ctx.req.json());

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json({ ...result.user, token: result.token }, 201);
});

authRoutes.post("/login", loginLimiter, async (ctx) => {
  const result = await authService.login(await ctx.req.json());

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json({ ...result.user, token: result.token });
});
