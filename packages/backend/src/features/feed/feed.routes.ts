import { Hono } from "hono";
import {
  optionalAuth,
  requireAuth,
  type AuthVariables,
  type OptionalAuthVariables,
} from "../../security/auth-middleware";
import { feedRepository } from "./feed.repository";
import { createFeedService } from "./feed.service";

const feedService = createFeedService({ repository: feedRepository });

type Variables = Partial<AuthVariables> & Partial<OptionalAuthVariables>;

export const feedRoutes = new Hono<{ Variables: Variables }>();

feedRoutes.post("/tweets/:id/like", requireAuth, async (ctx) => {
  const result = await feedService.likeTweet({
    tweetId: ctx.req.param("id"),
    currentUserId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.delete("/tweets/:id/like", requireAuth, async (ctx) => {
  const result = await feedService.unlikeTweet({
    tweetId: ctx.req.param("id"),
    currentUserId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.post("/tweets/:id/repost", requireAuth, async (ctx) => {
  const result = await feedService.repostTweet({
    tweetId: ctx.req.param("id"),
    currentUserId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.delete("/tweets/:id/repost", requireAuth, async (ctx) => {
  const result = await feedService.unrepostTweet({
    tweetId: ctx.req.param("id"),
    currentUserId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.delete("/tweets/:id", requireAuth, async (ctx) => {
  const result = await feedService.deleteTweet({
    tweetId: ctx.req.param("id"),
    currentUserId: ctx.get("user").sub,
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.get("/profile/:username", optionalAuth, async (ctx) => {
  const result = await feedService.getUserTimeline({
    username: ctx.req.param("username"),
    viewerId: ctx.get("viewer")?.sub ?? null,
    rawCursor: ctx.req.query("cursor"),
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.get("/:username", optionalAuth, async (ctx) => {
  const result = await feedService.getFeed({
    username: ctx.req.param("username"),
    viewerId: ctx.get("viewer")?.sub ?? null,
    rawCursor: ctx.req.query("cursor"),
  });

  if (!result.ok) return ctx.json({ error: result.error }, result.status);
  return ctx.json(result.response);
});

feedRoutes.post("/:username/tweets", requireAuth, async (ctx) => {
  const claims = ctx.get("user");
  const result = await feedService.createTweet({
    profileUsername: ctx.req.param("username"),
    currentUserId: claims.sub,
    currentUsername: claims.username,
    body: await ctx.req.json(),
  });

  if (!result.ok) {
    if (result.status === 401) ctx.header("WWW-Authenticate", 'Bearer realm="ify"');
    return ctx.json({ error: result.error }, result.status);
  }

  return ctx.json(result.tweet, 201);
});
