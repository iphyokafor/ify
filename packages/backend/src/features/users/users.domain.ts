import type { FollowResponse, UserProfile, UserSearchResponse, UserStats } from "@ify/shared";

export type UserRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  is_following: boolean;
};

export type ProfileRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string | Date;
  following: number | string;
  followers: number | string;
  is_following: boolean;
};

export type SearchSuccess = { ok: true; response: UserSearchResponse };
export type FollowSuccess = { ok: true; response: FollowResponse };
export type StatsSuccess = { ok: true; response: UserStats };
export type ProfileSuccess = { ok: true; response: UserProfile };

export type UsersFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
};

export type SearchResult = SearchSuccess | UsersFailure;
export type FollowResult = FollowSuccess | UsersFailure;
export type StatsResult = StatsSuccess | UsersFailure;
export type ProfileResult = ProfileSuccess | UsersFailure;

export type UsersRepository = {
  searchUsers: (query: string, viewerId: string, limit: number) => Promise<UserRow[]>;
  findUserByUsername: (username: string) => Promise<{ id: string } | null>;
  followUser: (followerId: string, followedId: string) => Promise<void>;
  unfollowUser: (followerId: string, followedId: string) => Promise<void>;
  getStats: (userId: string) => Promise<UserStats>;
  getProfile: (username: string, viewerId: string) => Promise<ProfileRow | null>;
};

export type UsersServiceDependencies = {
  repository: UsersRepository;
};

export type SearchInput = {
  query: string;
  viewerId: string;
};

export type FollowInput = {
  targetUsername: string;
  viewerId: string;
};

export type ProfileInput = {
  username: string;
  viewerId: string;
};

export type UsersService = {
  search: (input: SearchInput) => Promise<SearchResult>;
  follow: (input: FollowInput) => Promise<FollowResult>;
  unfollow: (input: FollowInput) => Promise<FollowResult>;
  stats: (viewerId: string) => Promise<StatsResult>;
  profile: (input: ProfileInput) => Promise<ProfileResult>;
};
