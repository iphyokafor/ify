import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { hash } from "@node-rs/argon2";
import app from "../../index";
import { sql } from "../../db/connection";

const request = (path: string, init?: RequestInit): Promise<Response> => {
  const url = `http://localhost${path}`;
  return Promise.resolve(app.fetch(new Request(url, init)));
};

const login = async (username: string): Promise<string> => {
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "password123" }),
  });
  const body = (await res.json()) as { token: string };
  return body.token;
};

beforeAll(async () => {
  const schemaPath = join(import.meta.dir, "../../db/schema.sql");
  const schema = await Bun.file(schemaPath).text();
  await sql.unsafe(schema);
});

beforeEach(async () => {
  await sql`TRUNCATE tweet_reposts, tweet_likes, tweets, followers, users CASCADE`;
  const passwordHash = await hash("password123");

  await sql`
    INSERT INTO users (username, email, password_hash, first_name, last_name, age) VALUES
    ('bob', 'bob@example.com', ${passwordHash}, 'Bob', 'Smith', 28),
    ('alice', 'alice@example.com', ${passwordHash}, 'Alice', 'Johnson', 32),
    ('alex', 'alex@example.com', ${passwordHash}, 'Alex', 'Wong', 27)
  `;
});

afterAll(async () => {
  // shared sql connection is closed by Bun on process exit
});

describe("users routes integration", () => {
  it("requires authentication for search and follow", async () => {
    const search = await request("/api/users/search?q=al");
    expect(search.status).toBe(401);

    const follow = await request("/api/users/alice/follow", { method: "POST" });
    expect(follow.status).toBe(401);
  });

  it("searches users by username prefix and reflects follow state", async () => {
    const token = await login("bob");
    const headers = { Authorization: `Bearer ${token}` };

    const res = await request("/api/users/search?q=al", { headers });
    const body = (await res.json()) as {
      results: Array<{ username: string; isFollowing: boolean; isSelf: boolean }>;
    };

    expect(res.status).toBe(200);
    const names = body.results.map((r) => r.username).sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(["alex", "alice"]);
    expect(body.results.every((r) => r.isFollowing === false)).toBe(true);
    expect(body.results.every((r) => r.isSelf === false)).toBe(true);
  });

  it("marks the viewer as self in search results", async () => {
    const token = await login("bob");
    const res = await request("/api/users/search?q=bob", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { results: Array<{ username: string; isSelf: boolean }> };
    expect(body.results.find((r) => r.username === "bob")?.isSelf).toBe(true);
  });

  it("follows and unfollows a user idempotently", async () => {
    const token = await login("bob");
    const headers = { Authorization: `Bearer ${token}` };

    const first = await request("/api/users/alice/follow", { method: "POST", headers });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ username: "alice", isFollowing: true });

    const second = await request("/api/users/alice/follow", { method: "POST", headers });
    expect(second.status).toBe(200);

    const search = await request("/api/users/search?q=alice", { headers });
    const body = (await search.json()) as { results: Array<{ isFollowing: boolean }> };
    expect(body.results[0].isFollowing).toBe(true);

    const unfollow = await request("/api/users/alice/follow", { method: "DELETE", headers });
    expect(unfollow.status).toBe(200);
    expect(await unfollow.json()).toEqual({ username: "alice", isFollowing: false });
  });

  it("rejects following yourself", async () => {
    const token = await login("bob");
    const res = await request("/api/users/bob/follow", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown users", async () => {
    const token = await login("bob");
    const res = await request("/api/users/ghost/follow", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });

  it("includes followed user's tweets in viewer's feed after following", async () => {
    const token = await login("bob");
    const headers = { Authorization: `Bearer ${token}` };

    await sql`
      INSERT INTO tweets (author_id, text)
      SELECT id, 'Alex post' FROM users WHERE username = 'alex'
    `;

    const before = await request("/api/feed/bob", { headers });
    const beforeBody = (await before.json()) as { tweets: Array<{ text: string }> };
    expect(beforeBody.tweets.some((t) => t.text === "Alex post")).toBe(false);

    await request("/api/users/alex/follow", { method: "POST", headers });

    const after = await request("/api/feed/bob", { headers });
    const afterBody = (await after.json()) as { tweets: Array<{ text: string }> };
    expect(afterBody.tweets.some((t) => t.text === "Alex post")).toBe(true);
  });

  it("returns viewer follower/following counts that update on follow changes", async () => {
    const token = await login("bob");
    const headers = { Authorization: `Bearer ${token}` };

    const empty = await request("/api/users/me/stats", { headers });
    expect(await empty.json()).toEqual({ following: 0, followers: 0 });

    await request("/api/users/alice/follow", { method: "POST", headers });
    await request("/api/users/alex/follow", { method: "POST", headers });

    const aliceToken = await login("alice");
    await request("/api/users/bob/follow", {
      method: "POST",
      headers: { Authorization: `Bearer ${aliceToken}` },
    });

    const after = await request("/api/users/me/stats", { headers });
    expect(await after.json()).toEqual({ following: 2, followers: 1 });
  });

  it("returns a profile with stats and follow state", async () => {
    const bobToken = await login("bob");
    const bobHeaders = { Authorization: `Bearer ${bobToken}` };

    const initial = await request("/api/users/alice/profile", { headers: bobHeaders });
    expect(initial.status).toBe(200);
    const initialBody = (await initial.json()) as {
      username: string;
      isSelf: boolean;
      isFollowing: boolean;
      stats: { following: number; followers: number };
    };
    expect(initialBody.username).toBe("alice");
    expect(initialBody.isSelf).toBe(false);
    expect(initialBody.isFollowing).toBe(false);
    expect(initialBody.stats).toEqual({ following: 0, followers: 0 });

    await request("/api/users/alice/follow", { method: "POST", headers: bobHeaders });

    const after = await request("/api/users/alice/profile", { headers: bobHeaders });
    const afterBody = (await after.json()) as {
      isFollowing: boolean;
      stats: { followers: number };
    };
    expect(afterBody.isFollowing).toBe(true);
    expect(afterBody.stats.followers).toBe(1);
  });

  it("marks the viewer as self on their own profile", async () => {
    const token = await login("bob");
    const res = await request("/api/users/bob/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { isSelf: boolean; isFollowing: boolean };
    expect(body.isSelf).toBe(true);
    expect(body.isFollowing).toBe(false);
  });

  it("returns 404 for an unknown profile", async () => {
    const token = await login("bob");
    const res = await request("/api/users/ghost/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });
});
