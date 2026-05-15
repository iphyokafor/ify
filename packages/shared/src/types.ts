export type User = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  createdAt: string;
};

export type Tweet = {
  id: string;
  text: string;
  createdAt: string;
  author: Pick<User, "id" | "username" | "firstName" | "lastName">;
  likeCount: number;
  likedByMe: boolean;
  repostCount: number;
  repostedByMe: boolean;
  repostedBy?: {
    username: string;
    firstName: string;
  };
};

export type FeedResponse = {
  tweets: Tweet[];
  nextCursor: string | null;
};

export type LikeResponse = {
  tweetId: string;
  likeCount: number;
  likedByMe: boolean;
};

export type RepostResponse = {
  tweetId: string;
  repostCount: number;
  repostedByMe: boolean;
};

export type DeleteTweetResponse = {
  tweetId: string;
};

export type UserSearchResult = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isFollowing: boolean;
  isSelf: boolean;
};

export type UserSearchResponse = {
  results: UserSearchResult[];
};

export type FollowResponse = {
  username: string;
  isFollowing: boolean;
};

export type UserStats = {
  following: number;
  followers: number;
};

export type UserProfile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  joinedAt: string;
  isSelf: boolean;
  isFollowing: boolean;
  stats: UserStats;
};
