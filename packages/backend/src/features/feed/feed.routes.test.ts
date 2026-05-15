import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { hash } from "@node-rs/argon2";
import app from "../../index";
import { sql } from "../../db/connection";

const request = (path: string, init?: RequestInit): Promise<Response> => {
  const url = `http://localhost${path}`;
  return Promise.resolve(app.fetch(new Request(url, init)));
};

beforeAll(async () => {
  const schemaPath = join(import.meta.dir, "../../db/schema.sql");
  const schema = await Bun.file(schemaPath).text();
  await sql.unsafe(schema);
});

beforeEach(async () => {
  await sql`TRUNCATE tweet_reposts, tweet_likes, tweets, followers, users CASCADE`;

  const passwordHash = await hash("password123");

  const [bob] = await sql`
    INSERT INTO users (username, email, password_hash, first_name, last_name, age)
    VALUES ('bob', 'bob@example.com', ${passwordHash}, 'Bob', 'Smith', 28)
    RETURNING id
  `;

  const [alice] = await sql`
    INSERT INTO users (username, email, password_hash, first_name, last_name, age)
    VALUES ('alice', 'alice@example.com', ${passwordHash}, 'Alice', 'Johnson', 32)
    RETURNING id
  `;

  await sql`
    INSERT INTO followers (follower_id, followed_id)
    VALUES (${bob.id}, ${alice.id})
  `;

  await sql`
    INSERT INTO tweets (author_id, text)
    VALUES (${alice.id}, 'Hello from Alice')
  `;
});

afterAll(async () => {
  // shared sql connection is closed by Bun on process exit
});

describe("feed routes integration", () => {
  it("logs in with demo credentials", async () => {
    const res = await request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });

    const body = (await res.json()) as { username: string; token: string };

    expect(res.status).toBe(200);
    expect(body.username).toBe("bob");
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(20);
  });

  it("rejects posting without authentication", async () => {
    const res = await request("/api/feed/bob/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "Should not be accepted" }),
    });

    expect(res.status).toBe(401);
  });

  it("creates a tweet for the authenticated user and returns it in feed", async () => {
    const text = "Integration tests keep regressions away";

    const loginRes = await request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });

    const loginBody = (await loginRes.json()) as { token: string };
    expect(loginRes.status).toBe(200);

    const createRes = await request("/api/feed/bob/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loginBody.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    expect(createRes.status).toBe(201);

    const dbRows = await sql`
      SELECT text
      FROM tweets t
      JOIN users u ON u.id = t.author_id
      WHERE u.username = 'bob' AND t.text = ${text}
    `;

    expect(dbRows.length).toBe(1);

    const feedRes = await request("/api/feed/bob");
    const feedBody = (await feedRes.json()) as {
      tweets: Array<{ text: string; author: { username: string } }>;
    };

    expect(feedRes.status).toBe(200);
    expect(feedBody.tweets.some((t) => t.text === text)).toBe(true);
    expect(feedBody.tweets.some((t) => t.author.username === "alice")).toBe(true);
  });

  it("paginates feed with cursor correctly", async () => {
    const [alice] = await sql`SELECT id FROM users WHERE username = 'alice'`;

    for (let i = 0; i < 5; i++) {
      await sql`
        INSERT INTO tweets (author_id, text)
        VALUES (${alice.id}, ${"Tweet " + i})
      `;
    }

    const firstPageRes = await request("/api/feed/bob");
    const firstPageBody = (await firstPageRes.json()) as {
      tweets: Array<{ text: string }>;
      nextCursor: string | null;
    };

    expect(firstPageRes.status).toBe(200);
    expect(firstPageBody.tweets.length).toBeGreaterThan(0);

    const firstPageTexts = firstPageBody.tweets.map((t) => t.text);

    if (firstPageBody.nextCursor) {
      const secondPageRes = await request(
        `/api/feed/bob?cursor=${encodeURIComponent(firstPageBody.nextCursor)}`
      );
      const secondPageBody = (await secondPageRes.json()) as {
        tweets: Array<{ text: string }>;
      };

      expect(secondPageRes.status).toBe(200);
      const secondPageTexts = new Set(secondPageBody.tweets.map((t) => t.text));

      const overlap = firstPageTexts.filter((t) =>
        secondPageTexts.has(t)
      );
      expect(overlap.length).toBe(0);
    }
  });

  it("likes and unlikes a tweet idempotently and reflects state in the feed", async () => {
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });
    const { token } = (await loginRes.json()) as { token: string };

    const [tweet] = await sql`
      SELECT t.id
      FROM tweets t JOIN users u ON u.id = t.author_id
      WHERE u.username = 'alice'
      LIMIT 1
    `;

    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const firstLike = await request(`/api/feed/tweets/${tweet.id}/like`, { method: "POST", headers: auth });
    expect(firstLike.status).toBe(200);
    expect(await firstLike.json()).toEqual({ tweetId: tweet.id, likeCount: 1, likedByMe: true });

    const secondLike = await request(`/api/feed/tweets/${tweet.id}/like`, { method: "POST", headers: auth });
    expect(secondLike.status).toBe(200);
    expect(((await secondLike.json()) as { likeCount: number }).likeCount).toBe(1);

    const feedRes = await request("/api/feed/bob", { headers: { Authorization: `Bearer ${token}` } });
    const feedBody = (await feedRes.json()) as {
      tweets: Array<{ id: string; likeCount: number; likedByMe: boolean }>;
    };
    const liked = feedBody.tweets.find((t) => t.id === tweet.id);
    expect(liked?.likeCount).toBe(1);
    expect(liked?.likedByMe).toBe(true);

    const anonRes = await request("/api/feed/bob");
    const anonBody = (await anonRes.json()) as {
      tweets: Array<{ id: string; likeCount: number; likedByMe: boolean }>;
    };
    expect(anonBody.tweets.find((t) => t.id === tweet.id)?.likedByMe).toBe(false);

    const unlike = await request(`/api/feed/tweets/${tweet.id}/like`, { method: "DELETE", headers: auth });
    expect(unlike.status).toBe(200);
    expect(await unlike.json()).toEqual({ tweetId: tweet.id, likeCount: 0, likedByMe: false });
  });

  it("rejects liking without authentication", async () => {
    const [tweet] = await sql`SELECT id FROM tweets LIMIT 1`;
    const res = await request(`/api/feed/tweets/${tweet.id}/like`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("returns 404 when liking a non-existent tweet", async () => {
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });
    const { token } = (await loginRes.json()) as { token: string };

    const res = await request(`/api/feed/tweets/00000000-0000-0000-0000-000000000000/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });

  it("reposts and unreposts a tweet, surfacing it on followers' feeds", async () => {
    const bobLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });
    const { token: bobToken } = (await bobLogin.json()) as { token: string };
    const bobAuth = { Authorization: `Bearer ${bobToken}` };

    const [tweet] = await sql`
      SELECT t.id FROM tweets t JOIN users u ON u.id = t.author_id
      WHERE u.username = 'alice' LIMIT 1
    `;

    const repost = await request(`/api/feed/tweets/${tweet.id}/repost`, {
      method: "POST",
      headers: bobAuth,
    });
    expect(repost.status).toBe(200);
    expect(await repost.json()).toEqual({
      tweetId: tweet.id,
      repostCount: 1,
      repostedByMe: true,
    });

    // idempotent
    const again = await request(`/api/feed/tweets/${tweet.id}/repost`, {
      method: "POST",
      headers: bobAuth,
    });
    expect(((await again.json()) as { repostCount: number }).repostCount).toBe(1);

    // Carol follows Bob — Alice's tweet shows up on Carol's feed via Bob's repost
    await sql`
      INSERT INTO users (username, email, password_hash, first_name, last_name, age)
      VALUES ('carol', 'carol@example.com', ${await hash("password123")}, 'Carol', 'Lee', 26)
    `;
    const carolLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "carol", password: "password123" }),
    });
    const { token: carolToken } = (await carolLogin.json()) as { token: string };
    const carolAuth = { Authorization: `Bearer ${carolToken}` };

    await request("/api/users/bob/follow", { method: "POST", headers: carolAuth });

    const feedRes = await request("/api/feed/carol", { headers: carolAuth });
    const feed = (await feedRes.json()) as {
      tweets: Array<{ id: string; text: string; repostedBy?: { username: string } }>;
    };
    const reposted = feed.tweets.find((t) => t.id === tweet.id);
    expect(reposted).toBeDefined();
    expect(reposted?.repostedBy?.username).toBe("bob");

    const unrepost = await request(`/api/feed/tweets/${tweet.id}/repost`, {
      method: "DELETE",
      headers: bobAuth,
    });
    expect(unrepost.status).toBe(200);
    expect(((await unrepost.json()) as { repostCount: number }).repostCount).toBe(0);

    const after = await request("/api/feed/carol", { headers: carolAuth });
    const afterFeed = (await after.json()) as { tweets: Array<{ id: string }> };
    expect(afterFeed.tweets.find((t) => t.id === tweet.id)).toBeUndefined();
  });

  it("returns a user's profile timeline with their tweets and reposts", async () => {
    const bobLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });
    const { token } = (await bobLogin.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const [bob] = await sql`SELECT id FROM users WHERE username = 'bob'`;
    await sql`INSERT INTO tweets (author_id, text) VALUES (${bob.id}, 'Bob original tweet')`;

    const [aliceTweet] = await sql`
      SELECT t.id FROM tweets t JOIN users u ON u.id = t.author_id
      WHERE u.username = 'alice' LIMIT 1
    `;
    await request(`/api/feed/tweets/${aliceTweet.id}/repost`, { method: "POST", headers: auth });

    const res = await request("/api/feed/profile/bob", { headers: auth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tweets: Array<{ id: string; text: string; repostedBy?: { username: string } }>;
    };

    const ownTweet = body.tweets.find((t) => t.text === "Bob original tweet");
    const repostedTweet = body.tweets.find((t) => t.id === aliceTweet.id);

    expect(ownTweet).toBeDefined();
    expect(repostedTweet?.repostedBy?.username).toBe("bob");
  });

  it("lets the author delete their own tweet and removes it from feeds", async () => {
    const bobLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });
    const { token } = (await bobLogin.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request("/api/feed/bob/tweets", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "About to vanish" }),
    });
    const tweet = (await created.json()) as { id: string };

    const del = await request(`/api/feed/tweets/${tweet.id}`, { method: "DELETE", headers: auth });
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ tweetId: tweet.id });

    const profile = await request("/api/feed/profile/bob", { headers: auth });
    const body = (await profile.json()) as { tweets: Array<{ id: string }> };
    expect(body.tweets.find((t) => t.id === tweet.id)).toBeUndefined();
  });

  it("forbids deleting someone else's tweet", async () => {
    const aliceLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", password: "password123" }),
    });
    const { token } = (await aliceLogin.json()) as { token: string };
    const auth = { Authorization: `Bearer ${token}` };

    const [bob] = await sql`SELECT id FROM users WHERE username = 'bob'`;
    const [bobTweet] = await sql`
      INSERT INTO tweets (author_id, text)
      VALUES (${bob.id}, 'Bob says hi') RETURNING id
    `;

    const del = await request(`/api/feed/tweets/${bobTweet.id}`, { method: "DELETE", headers: auth });
    expect(del.status).toBe(403);

    const [stillThere] = await sql`SELECT 1 AS ok FROM tweets WHERE id = ${bobTweet.id}`;
    expect(stillThere?.ok).toBe(1);
  });

  it("returns 404 when deleting a non-existent tweet", async () => {
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", password: "password123" }),
    });
    const { token } = (await login.json()) as { token: string };

    const del = await request("/api/feed/tweets/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(del.status).toBe(404);
  });
});
