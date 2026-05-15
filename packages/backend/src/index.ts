import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./features/auth/auth.routes";
import { feedRoutes } from "./features/feed/feed.routes";
import { usersRoutes } from "./features/users/users.routes";
import { env } from "./config/env";
import { requestId, type RequestContext } from "./middleware/request-id";
import { logger } from "./middleware/logger";
import { errorHandler } from "./middleware/error-handler";

const app = new Hono<{ Variables: RequestContext }>();

app.use("*", requestId);
app.use("*", logger);
app.use("/*", cors({ exposeHeaders: ["x-request-id"] }));

app.route("/api/auth", authRoutes);
app.route("/api/feed", feedRoutes);
app.route("/api/users", usersRoutes);

app.onError(errorHandler);

const port = env.PORT;
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
