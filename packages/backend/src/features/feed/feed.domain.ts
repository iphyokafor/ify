import type { Tweet, FeedResponse, LikeResponse, RepostResponse, DeleteTweetResponse } from "@ify/shared";

export type FeedRow = {
  id: string;
  text: string;
  created_at: string | Date;
  sort_at: string | Date;
  author_id: string;
  username: string;
  first_name: string;
  last_name: string;
  like_count: number | string;
  liked_by_me: boolean;
  repost_count: number | string;
  reposted_by_me: boolean;
  reposted_by_username: string | null;
  reposted_by_first_name: string | null;
};

export type AuthorRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
};

export type TweetRow = {
  id: string;
  text: string;
  created_at: string | Date;
};

export type FeedCursor = {
  createdAt: string;
  id: string;
};

export type FeedSuccess = { ok: true; response: FeedResponse };
export type CreateTweetSuccess = { ok: true; tweet: Tweet };
export type LikeSuccess = { ok: true; response: LikeResponse };
export type RepostSuccess = { ok: true; response: RepostResponse };
export type DeleteTweetSuccess = { ok: true; response: DeleteTweetResponse };

export type FeedFailure = {
  ok: false;
  status: 400 | 401 | 403 | 404;
  error: string;
};

export type FeedResult = FeedSuccess | FeedFailure;
export type CreateTweetResult = CreateTweetSuccess | FeedFailure;
export type LikeResult = LikeSuccess | FeedFailure;
export type RepostResult = RepostSuccess | FeedFailure;
export type DeleteTweetResult = DeleteTweetSuccess | FeedFailure;

export type FeedRepository = {
  findUserIdByUsername: (username: string) => Promise<string | null>;
  fetchFeed: (
    userId: string,
    viewerId: string | null,
    cursor: FeedCursor | null,
    limit: number,
  ) => Promise<FeedRow[]>;
  fetchUserTweets: (
    userId: string,
    viewerId: string | null,
    cursor: FeedCursor | null,
    limit: number,
  ) => Promise<FeedRow[]>;
  findAuthor: (id: string, username: string) => Promise<AuthorRow | null>;
  insertTweet: (authorId: string, text: string) => Promise<TweetRow>;
  tweetExists: (tweetId: string) => Promise<boolean>;
  findTweetAuthor: (tweetId: string) => Promise<string | null>;
  deleteTweet: (tweetId: string) => Promise<void>;
  likeTweet: (tweetId: string, userId: string) => Promise<void>;
  unlikeTweet: (tweetId: string, userId: string) => Promise<void>;
  countLikes: (tweetId: string) => Promise<number>;
  repostTweet: (tweetId: string, userId: string) => Promise<void>;
  unrepostTweet: (tweetId: string, userId: string) => Promise<void>;
  countReposts: (tweetId: string) => Promise<number>;
  isRepostedBy: (tweetId: string, userId: string) => Promise<boolean>;
};

export type FeedServiceDependencies = {
  repository: FeedRepository;
};

export type GetFeedInput = {
  username: string;
  viewerId: string | null;
  rawCursor: string | undefined;
};

export type GetUserTimelineInput = {
  username: string;
  viewerId: string | null;
  rawCursor: string | undefined;
};

export type CreateTweetInput = {
  profileUsername: string;
  currentUserId: string;
  currentUsername: string;
  body: unknown;
};

export type ToggleLikeInput = {
  tweetId: string;
  currentUserId: string;
};

export type ToggleRepostInput = {
  tweetId: string;
  currentUserId: string;
};

export type DeleteTweetInput = {
  tweetId: string;
  currentUserId: string;
};

export type FeedService = {
  getFeed: (input: GetFeedInput) => Promise<FeedResult>;
  getUserTimeline: (input: GetUserTimelineInput) => Promise<FeedResult>;
  createTweet: (input: CreateTweetInput) => Promise<CreateTweetResult>;
  likeTweet: (input: ToggleLikeInput) => Promise<LikeResult>;
  unlikeTweet: (input: ToggleLikeInput) => Promise<LikeResult>;
  repostTweet: (input: ToggleRepostInput) => Promise<RepostResult>;
  unrepostTweet: (input: ToggleRepostInput) => Promise<RepostResult>;
  deleteTweet: (input: DeleteTweetInput) => Promise<DeleteTweetResult>;
};

