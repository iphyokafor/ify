import type { UserSearchResult } from "@ify/shared";
import type {
  FollowResult,
  ProfileResult,
  SearchResult,
  StatsResult,
  UserRow,
  UsersService,
  UsersServiceDependencies,
} from "./users.domain";
import { failure } from "../shared/result";

const SEARCH_LIMIT = 10;

const toResult = (row: UserRow, viewerId: string): UserSearchResult => ({
  id: row.id,
  username: row.username,
  firstName: row.first_name,
  lastName: row.last_name,
  isFollowing: Boolean(row.is_following),
  isSelf: row.id === viewerId,
});

export const createUsersService = ({ repository }: UsersServiceDependencies): UsersService => ({
  async search({ query, viewerId }): Promise<SearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { ok: true, response: { results: [] } };
    }

    const rows = await repository.searchUsers(trimmed, viewerId, SEARCH_LIMIT);
    return {
      ok: true,
      response: { results: rows.map((row) => toResult(row, viewerId)) },
    };
  },

  async follow({ targetUsername, viewerId }): Promise<FollowResult> {
    const target = await repository.findUserByUsername(targetUsername);
    if (!target) return failure(404, "User not found");
    if (target.id === viewerId) return failure(409, "You cannot follow yourself");

    await repository.followUser(viewerId, target.id);
    return { ok: true, response: { username: targetUsername, isFollowing: true } };
  },

  async unfollow({ targetUsername, viewerId }): Promise<FollowResult> {
    const target = await repository.findUserByUsername(targetUsername);
    if (!target) return failure(404, "User not found");
    if (target.id === viewerId) return failure(409, "You cannot unfollow yourself");

    await repository.unfollowUser(viewerId, target.id);
    return { ok: true, response: { username: targetUsername, isFollowing: false } };
  },

  async stats(viewerId): Promise<StatsResult> {
    const response = await repository.getStats(viewerId);
    return { ok: true, response };
  },

  async profile({ username, viewerId }): Promise<ProfileResult> {
    const row = await repository.getProfile(username, viewerId);
    if (!row) return failure(404, "User not found");

    return {
      ok: true,
      response: {
        id: row.id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        joinedAt: new Date(row.created_at).toISOString(),
        isSelf: row.id === viewerId,
        isFollowing: Boolean(row.is_following),
        stats: {
          following: Number(row.following ?? 0),
          followers: Number(row.followers ?? 0),
        },
      },
    };
  },
});
