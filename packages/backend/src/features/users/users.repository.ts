import { sql } from "../../db/connection";
import type { ProfileRow, UserRow, UsersRepository } from "./users.domain";

export const usersRepository: UsersRepository = {
  async searchUsers(query, viewerId, limit) {
    const pattern = `${query}%`;
    const rows = await sql`
      SELECT u.id, u.username, u.first_name, u.last_name,
             EXISTS (
               SELECT 1 FROM followers f
               WHERE f.follower_id = ${viewerId} AND f.followed_id = u.id
             ) AS is_following
      FROM users u
      WHERE u.username ILIKE ${pattern}
         OR u.first_name ILIKE ${pattern}
         OR u.last_name ILIKE ${pattern}
      ORDER BY u.username
      LIMIT ${limit}
    `;

    return rows as unknown as UserRow[];
  },

  async findUserByUsername(username) {
    const [row] = await sql`SELECT id FROM users WHERE username = ${username}`;
    return row ? { id: row.id } : null;
  },

  async followUser(followerId, followedId) {
    await sql`
      INSERT INTO followers (follower_id, followed_id)
      VALUES (${followerId}, ${followedId})
      ON CONFLICT DO NOTHING
    `;
  },

  async unfollowUser(followerId, followedId) {
    await sql`
      DELETE FROM followers
      WHERE follower_id = ${followerId} AND followed_id = ${followedId}
    `;
  },

  async getStats(userId) {
    const [row] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM followers WHERE follower_id = ${userId}) AS following,
        (SELECT COUNT(*)::int FROM followers WHERE followed_id = ${userId}) AS followers
    `;
    return {
      following: Number(row?.following ?? 0),
      followers: Number(row?.followers ?? 0),
    };
  },

  async getProfile(username, viewerId) {
    const [row] = await sql`
      SELECT u.id, u.username, u.first_name, u.last_name, u.created_at,
             (SELECT COUNT(*)::int FROM followers WHERE follower_id = u.id) AS following,
             (SELECT COUNT(*)::int FROM followers WHERE followed_id = u.id) AS followers,
             EXISTS (
               SELECT 1 FROM followers f
               WHERE f.follower_id = ${viewerId} AND f.followed_id = u.id
             ) AS is_following
      FROM users u
      WHERE u.username = ${username}
    `;
    return (row as ProfileRow | undefined) ?? null;
  },
};
