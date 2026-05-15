import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../../security/auth-middleware";
import { usersRepository } from "./users.repository";
import { createUsersService } from "./users.service";

const usersService = createUsersService({ repository: usersRepository });

export const usersRoutes = new Hono<{ Variables: AuthVariables }>();

usersRoutes.use("*", requireAuth);

usersRoutes.get("/me/stats", async (ctx) => {
  const result = await usersService.stats(ctx.get("user").sub);
  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

usersRoutes.get("/search", async (ctx) => {
  const result = await usersService.search({
    query: ctx.req.query("q") ?? "",
    viewerId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

usersRoutes.get("/:username/profile", async (ctx) => {
  const result = await usersService.profile({
    username: ctx.req.param("username"),
    viewerId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

usersRoutes.post("/:username/follow", async (ctx) => {
  const result = await usersService.follow({
    targetUsername: ctx.req.param("username"),
    viewerId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

usersRoutes.delete("/:username/follow", async (ctx) => {
  const result = await usersService.unfollow({
    targetUsername: ctx.req.param("username"),
    viewerId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});
