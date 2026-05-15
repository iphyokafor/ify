
# ify

A small Twitter-style feed. Monorepo with a Bun/Hono backend, a Next.js frontend, and a shared types package.

## What it does

- Sign up, log in, log out
- Post a tweet (280 chars), delete your own
- Like and repost any tweet
- Follow and unfollow people
- Search for users
- View anyone's profile and timeline at `/u/<username>`
- Home feed = your tweets + tweets and reposts from people you follow

## Stack

- Backend: Bun, Hono, PostgreSQL, Zod, jose (JWT), argon2
- Frontend: Next.js 15, React 19, Tailwind
- Tests: `bun test`
- Postgres via Docker Compose


## Layout

```
packages/
  backend/   ← Hono API, Postgres, tests
  frontend/  ← Next.js app
  shared/    ← types used by both
```

Inside `backend/src`:

```
config/        env loaded once, validated with Zod
db/            schema, migrate, seed, connection
middleware/    request-id, logger, error-handler, rate-limit
security/      jwt, password hashing, auth middleware
features/
  auth/        domain · input · repository · service · routes
  feed/        domain · input · repository · service · routes
  users/       domain · input · repository · service · routes
```

Each feature is a vertical slice. Routes don't touch SQL, services don't touch HTTP, repositories don't validate.


## Run it

```bash
docker compose up -d
bun install
bun run db:migrate
bun run db:seed
bun run dev:backend     # http://localhost:3001
bun run dev:frontend    # http://localhost:3000
```

Demo accounts (all share password `password123`):
`bob`, `alice`, `charlie`, `diana`, `eve`.


## Run the tests

```bash
bun run test            # backend + frontend
bun run test:backend
bun run test:frontend
```

28 backend tests cover auth, feed, follows, profiles, likes, reposts, and delete. Frontend has component tests for the tweet card.

## A few design choices worth calling out

**Auth.** Argon2 for password hashing, HS256 JWT for sessions. The `requireAuth` middleware verifies the bearer token and also re-checks that the user still exists in the DB (so stale tokens after a re-seed give a clean 401 instead of a confusing UI).

**Validation at the edges.** Zod parses every request body in `*.input.ts` files. Inside services and repositories, types are trusted.

**Result objects, not exceptions, for expected failures.** Services return `{ ok: true, ... } | { ok: false, status, error }`. Routes turn that into HTTP. `AppError` is reserved for the unexpected and handled centrally.

**Feed pagination.** Keyset cursor on `(sort_at, id)`. Stable under inserts, no `OFFSET` scans.

**Reposts.** Implemented as a separate row that joins back to the original tweet. The viewer's own reposts surface as a "You reposted" header on the tweet card.

**Logging.** Every request gets a UUID `x-request-id` (or honors an incoming one) and emits a structured JSON log line with method, path, status, and duration.

**Rate limiting.** In-memory limiter on `/auth/register` (5/min) and `/auth/login` (10/min) keyed by IP. Fine for one process; would move to Redis for more.

## What I'd change at scale

Honest answer: the code is fine for one machine and a few thousand users. Past that:

- **Feed reads.** The pull-model query (join `tweets` × `followers` at read time) is correct and indexed but breaks down for users with millions of followers. Switch to fanout-on-write (push tweet IDs into each follower's precomputed timeline in Redis on post). Hybrid in practice: pull for big accounts, push for everyone else.
- **Caching.** Short-lived per-`(user, cursor)` cache on feed responses. Keyset pagination already plays well with cache keys.
- **Database.** Read replicas for feed queries, partition `tweets` by `created_at` once VACUUM starts hurting.
- **Rate limiting.** Move the in-memory buckets to Redis once there's more than one process.
- **Auth.** Add refresh-token rotation (short access token + long refresh token in HttpOnly cookie).
- **Background work.** A queue (BullMQ or SQS) for notifications, search indexing, analytics. That's also where an event bus starts paying for itself.
- **Observability.** Ship the structured logs to Datadog/Loki, add OpenTelemetry traces (the request ID becomes the trace ID), watch p95/p99 per route.

What I deliberately didn't do: event bus, CQRS, hexagonal scaffolding. They earn their keep when there's a real second consumer of writes or a real read/write asymmetry — neither exists yet.

## Demo

[View the demo video](docs/ify-social-app-demo.mp4)