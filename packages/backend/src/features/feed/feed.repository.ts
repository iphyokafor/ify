import { sql } from "../../db/connection";
import type { AuthorRow, FeedRepository, FeedRow, TweetRow } from "./feed.domain";

const cursorClause = (cursor: { createdAt: string; id: string } | null) =>
  cursor
    ? sql`WHERE sort_at < ${cursor.createdAt}
         OR (sort_at = ${cursor.createdAt} AND id < ${cursor.id})`
    : sql``;

const enrichmentColumns = (viewerId: string | null) => {
  const likedByMe = viewerId
    ? sql`EXISTS (SELECT 1 FROM tweet_likes l WHERE l.tweet_id = items.id AND l.user_id = ${viewerId})`
    : sql`FALSE`;
  const repostedByMe = viewerId
    ? sql`EXISTS (SELECT 1 FROM tweet_reposts r WHERE r.tweet_id = items.id AND r.user_id = ${viewerId})`
    : sql`FALSE`;

  return sql`
    items.id, items.text, items.created_at, items.sort_at,
    items.author_id, items.username, items.first_name, items.last_name,
    items.reposted_by_username, items.reposted_by_first_name,
    (SELECT COUNT(*) FROM tweet_likes l WHERE l.tweet_id = items.id) AS like_count,
    (SELECT COUNT(*) FROM tweet_reposts r WHERE r.tweet_id = items.id) AS repost_count,
    ${likedByMe} AS liked_by_me,
    ${repostedByMe} AS reposted_by_me
  `;
};

export const feedRepository: FeedRepository = {
  async findUserIdByUsername(username) {
    const [row] = await sql`SELECT id FROM users WHERE username = ${username}`;
    return row?.id ?? null;
  },

  async fetchFeed(userId, viewerId, cursor, limit) {
    const filter = cursorClause(cursor);
    const enriched = enrichmentColumns(viewerId);

    const rows = await sql`
      WITH items AS (
        SELECT t.id, t.text, t.created_at, t.created_at AS sort_at,
               u.id AS author_id, u.username, u.first_name, u.last_name,
               NULL::text AS reposted_by_username,
               NULL::text AS reposted_by_first_name
        FROM tweets t
        JOIN users u ON t.author_id = u.id
        WHERE t.author_id = ${userId}
           OR EXISTS (
             SELECT 1 FROM followers f
             WHERE f.follower_id = ${userId} AND f.followed_id = t.author_id
           )

        UNION ALL

        SELECT t.id, t.text, t.created_at, r.created_at AS sort_at,
               u.id AS author_id, u.username, u.first_name, u.last_name,
               ru.username AS reposted_by_username,
               ru.first_name AS reposted_by_first_name
        FROM tweet_reposts r
        JOIN tweets t ON r.tweet_id = t.id
        JOIN users u ON t.author_id = u.id
        JOIN users ru ON r.user_id = ru.id
        WHERE r.user_id = ${userId}
           OR EXISTS (
             SELECT 1 FROM followers f
             WHERE f.follower_id = ${userId} AND f.followed_id = r.user_id
           )
      )
      SELECT ${enriched}
      FROM items
      ${filter}
      ORDER BY sort_at DESC, id DESC
      LIMIT ${limit}
    `;

    return rows as unknown as FeedRow[];
  },

  async fetchUserTweets(userId, viewerId, cursor, limit) {
    const filter = cursorClause(cursor);
    const enriched = enrichmentColumns(viewerId);

    const rows = await sql`
      WITH items AS (
        SELECT t.id, t.text, t.created_at, t.created_at AS sort_at,
               u.id AS author_id, u.username, u.first_name, u.last_name,
               NULL::text AS reposted_by_username,
               NULL::text AS reposted_by_first_name
        FROM tweets t
        JOIN users u ON t.author_id = u.id
        WHERE t.author_id = ${userId}

        UNION ALL

        SELECT t.id, t.text, t.created_at, r.created_at AS sort_at,
               u.id AS author_id, u.username, u.first_name, u.last_name,
               ru.username AS reposted_by_username,
               ru.first_name AS reposted_by_first_name
        FROM tweet_reposts r
        JOIN tweets t ON r.tweet_id = t.id
        JOIN users u ON t.author_id = u.id
        JOIN users ru ON r.user_id = ru.id
        WHERE r.user_id = ${userId}
      )
      SELECT ${enriched}
      FROM items
      ${filter}
      ORDER BY sort_at DESC, id DESC
      LIMIT ${limit}
    `;

    return rows as unknown as FeedRow[];
  },

  async findAuthor(id, username) {
    const [row] = await sql`
      SELECT id, username, first_name, last_name
      FROM users
      WHERE id = ${id} AND username = ${username}
    `;

    return (row as AuthorRow | undefined) ?? null;
  },

  async insertTweet(authorId, text) {
    const [row] = await sql`
      INSERT INTO tweets (author_id, text)
      VALUES (${authorId}, ${text})
      RETURNING id, text, created_at
    `;

    return row as TweetRow;
  },

  async tweetExists(tweetId) {
    const [row] = await sql`SELECT 1 AS ok FROM tweets WHERE id = ${tweetId}`;
    return Boolean(row);
  },

  async findTweetAuthor(tweetId) {
    const [row] = await sql`SELECT author_id FROM tweets WHERE id = ${tweetId}`;
    return row ? (row.author_id as string) : null;
  },

  async deleteTweet(tweetId) {
    await sql`DELETE FROM tweets WHERE id = ${tweetId}`;
  },

  async likeTweet(tweetId, userId) {
    await sql`
      INSERT INTO tweet_likes (tweet_id, user_id)
      VALUES (${tweetId}, ${userId})
      ON CONFLICT DO NOTHING
    `;
  },

  async unlikeTweet(tweetId, userId) {
    await sql`
      DELETE FROM tweet_likes
      WHERE tweet_id = ${tweetId} AND user_id = ${userId}
    `;
  },

  async countLikes(tweetId) {
    const [row] = await sql`
      SELECT COUNT(*)::int AS count FROM tweet_likes WHERE tweet_id = ${tweetId}
    `;
    return Number(row?.count ?? 0);
  },

  async repostTweet(tweetId, userId) {
    await sql`
      INSERT INTO tweet_reposts (tweet_id, user_id)
      VALUES (${tweetId}, ${userId})
      ON CONFLICT DO NOTHING
    `;
  },

  async unrepostTweet(tweetId, userId) {
    await sql`
      DELETE FROM tweet_reposts
      WHERE tweet_id = ${tweetId} AND user_id = ${userId}
    `;
  },

  async countReposts(tweetId) {
    const [row] = await sql`
      SELECT COUNT(*)::int AS count FROM tweet_reposts WHERE tweet_id = ${tweetId}
    `;
    return Number(row?.count ?? 0);
  },

  async isRepostedBy(tweetId, userId) {
    const [row] = await sql`
      SELECT 1 AS ok FROM tweet_reposts WHERE tweet_id = ${tweetId} AND user_id = ${userId}
    `;
    return Boolean(row);
  },
};

