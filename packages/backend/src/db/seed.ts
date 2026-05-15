import { sql } from "./connection";
import { hash } from "@node-rs/argon2";

// Demo seed for local dev only. Override via SEED_PASSWORD env var.
const SHARED_PASSWORD = process.env.SEED_PASSWORD ?? "password123"; // NOSONAR

const TWEET_TEXTS = [
  "Just had the best coffee this morning",
  "Working on a new project, can't wait to share",
  "Anyone else watching the game tonight?",
  "Beautiful sunset from my balcony",
  "Finally finished that book I've been reading",
  "Hot take: tabs are better than spaces",
  "Just adopted a puppy! Meet Max",
  "Monday motivation: ship something today",
  "The food at that new restaurant was incredible",
  "Learning Bun and I'm impressed with the speed",
  "Rainy day, perfect for coding",
  "Just ran my first 10K! Personal best",
  "Who else is excited about the new season?",
  "Clean code is not about perfection, it's about clarity",
  "Making homemade pasta for the first time",
  "The sunrise this morning was unreal",
  "Sometimes the simplest solution is the best one",
  "Just finished a great pair programming session",
  "Weekend plans: hiking and reading",
  "TypeScript generics finally clicked for me",
];

const FEED_TWEETS_PER_AUTHOR_TOTAL = 40;
const PRIVATE_TWEET_COUNT = 5;
const POPULAR_TWEET_COUNT = 15;
const REPOSTABLE_TWEET_COUNT = 10;
const MINUTES = 60 * 1000;

type SeededUser = { id: string; username: string };

const wipeAllData = () =>
  sql`TRUNCATE tweet_reposts, tweet_likes, tweets, followers, users CASCADE`;

const createUsers = async (): Promise<Record<string, SeededUser>> => {
  const passwordHash = await hash(SHARED_PASSWORD);

  const definitions = [
    { username: "bob", email: "bob@example.com", first: "Bob", last: "Smith", age: 28 },
    { username: "alice", email: "alice@example.com", first: "Alice", last: "Johnson", age: 32 },
    { username: "charlie", email: "charlie@example.com", first: "Charlie", last: "Brown", age: 45 },
    { username: "diana", email: "diana@example.com", first: "Diana", last: "Prince", age: 22 },
    { username: "eve", email: "eve@example.com", first: "Eve", last: "Williams", age: 55 },
  ];

  const users: Record<string, SeededUser> = {};

  for (const u of definitions) {
    const [row] = await sql`
      INSERT INTO users (username, email, password_hash, first_name, last_name, age)
      VALUES (${u.username}, ${u.email}, ${passwordHash}, ${u.first}, ${u.last}, ${u.age})
      RETURNING id, username
    `;
    users[u.username] = row as SeededUser;
  }

  return users;
};

const createFollowGraph = async (users: Record<string, SeededUser>): Promise<void> => {
  const { bob, alice, charlie, diana, eve } = users;
  await sql`
    INSERT INTO followers (follower_id, followed_id) VALUES
    (${bob.id}, ${alice.id}),
    (${bob.id}, ${charlie.id}),
    (${bob.id}, ${diana.id}),
    (${alice.id}, ${bob.id}),
    (${alice.id}, ${eve.id})
  `;
};

const createPublicTweets = async (
  authors: SeededUser[],
  startedAt: number,
): Promise<void> => {
  for (let index = 0; index < FEED_TWEETS_PER_AUTHOR_TOTAL; index++) {
    const author = authors[index % authors.length];
    const text = TWEET_TEXTS[index % TWEET_TEXTS.length];
    const createdAt = new Date(startedAt - index * 30 * MINUTES);

    await sql`
      INSERT INTO tweets (author_id, text, created_at)
      VALUES (${author.id}, ${text}, ${createdAt})
    `;
  }
};

const createPrivateTweets = async (
  author: SeededUser,
  startedAt: number,
): Promise<void> => {
  for (let index = 0; index < PRIVATE_TWEET_COUNT; index++) {
    const text = `Eve's tweet that Bob shouldn't see #${index + 1}`;
    const createdAt = new Date(startedAt - index * 60 * MINUTES);

    await sql`
      INSERT INTO tweets (author_id, text, created_at)
      VALUES (${author.id}, ${text}, ${createdAt})
    `;
  }
};

const sprinkleLikes = async (everyone: SeededUser[]): Promise<void> => {
  const popular = await sql<{ id: string }[]>`
    SELECT id FROM tweets ORDER BY created_at DESC LIMIT ${POPULAR_TWEET_COUNT}
  `;

  for (const [tweetIndex, { id: tweetId }] of popular.entries()) {
    const howManyLikers = (tweetIndex % 4) + 1;
    for (let offset = 0; offset < howManyLikers; offset++) {
      const liker = everyone[(tweetIndex + offset) % everyone.length];
      await sql`
        INSERT INTO tweet_likes (tweet_id, user_id)
        VALUES (${tweetId}, ${liker.id})
        ON CONFLICT DO NOTHING
      `;
    }
  }
};

const sprinkleReposts = async (
  reposters: SeededUser[],
  startedAt: number,
): Promise<void> => {
  const repostable = await sql<{ id: string; author_id: string }[]>`
    SELECT id, author_id FROM tweets ORDER BY created_at DESC LIMIT ${REPOSTABLE_TWEET_COUNT}
  `;

  for (const [tweetIndex, { id: tweetId, author_id }] of repostable.entries()) {
    const reposter = reposters[tweetIndex % reposters.length];
    if (reposter.id === author_id) continue;

    const repostedAt = new Date(startedAt - tweetIndex * 15 * MINUTES);
    await sql`
      INSERT INTO tweet_reposts (tweet_id, user_id, created_at)
      VALUES (${tweetId}, ${reposter.id}, ${repostedAt})
      ON CONFLICT DO NOTHING
    `;
  }
};

const seed = async (): Promise<void> => {
  console.log("Seeding database...");

  await wipeAllData();
  const users = await createUsers();
  await createFollowGraph(users);

  const now = Date.now();
  const publicAuthors = [users.alice, users.charlie, users.diana];
  await createPublicTweets(publicAuthors, now);
  await createPrivateTweets(users.eve, now);

  const everyone = [users.bob, users.alice, users.charlie, users.diana, users.eve];
  await sprinkleLikes(everyone);

  const reposters = [users.bob, users.alice, users.charlie, users.diana];
  await sprinkleReposts(reposters, now);

  console.log("Seeded 5 users, 45 tweets, follower relationships, likes, and reposts.");
  await sql.end();
};

try {
  await seed();
} catch (e) {
  console.error("Seed failed:", e);
  process.exit(1);
}
