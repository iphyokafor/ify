import type { Tweet } from "@ify/shared";
import type {
  AuthorRow,
  CreateTweetResult,
  DeleteTweetResult,
  FeedResult,
  FeedRow,
  FeedService,
  FeedServiceDependencies,
  LikeResult,
  RepostResult,
  TweetRow,
} from "./feed.domain";
import { encodeCursor, parseCursor, parseTweetInput } from "./feed.input";
import { failure } from "../shared/result";

const PAGE_SIZE = 30;
const FETCH_LIMIT = PAGE_SIZE + 1;

const tweetFromFeedRow = (row: FeedRow): Tweet => ({
  id: row.id,
  text: row.text,
  createdAt: new Date(row.created_at).toISOString(),
  author: {
    id: row.author_id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
  },
  likeCount: Number(row.like_count ?? 0),
  likedByMe: Boolean(row.liked_by_me),
  repostCount: Number(row.repost_count ?? 0),
  repostedByMe: Boolean(row.reposted_by_me),
  ...(row.reposted_by_username && row.reposted_by_first_name
    ? {
        repostedBy: {
          username: row.reposted_by_username,
          firstName: row.reposted_by_first_name,
        },
      }
    : {}),
});

const tweetFromInsert = (row: TweetRow, author: AuthorRow): Tweet => ({
  id: row.id,
  text: row.text,
  createdAt: new Date(row.created_at).toISOString(),
  author: {
    id: author.id,
    username: author.username,
    firstName: author.first_name,
    lastName: author.last_name,
  },
  likeCount: 0,
  likedByMe: false,
  repostCount: 0,
  repostedByMe: false,
});

const paginate = (rows: FeedRow[]) => {
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = page.at(-1);
  return {
    tweets: page.map(tweetFromFeedRow),
    nextCursor: hasMore && last ? encodeCursor(last.sort_at, last.id) : null,
  };
};

export const createFeedService = ({ repository }: FeedServiceDependencies): FeedService => ({
  async getFeed({ username, viewerId, rawCursor }): Promise<FeedResult> {
    const cursor = parseCursor(rawCursor);
    if (rawCursor && !cursor) return failure(400, "Invalid cursor");

    const userId = await repository.findUserIdByUsername(username);
    if (!userId) return failure(404, "User not found");

    const rows = await repository.fetchFeed(userId, viewerId, cursor, FETCH_LIMIT);
    return { ok: true, response: paginate(rows) };
  },

  async getUserTimeline({ username, viewerId, rawCursor }): Promise<FeedResult> {
    const cursor = parseCursor(rawCursor);
    if (rawCursor && !cursor) return failure(400, "Invalid cursor");

    const userId = await repository.findUserIdByUsername(username);
    if (!userId) return failure(404, "User not found");

    const rows = await repository.fetchUserTweets(userId, viewerId, cursor, FETCH_LIMIT);
    return { ok: true, response: paginate(rows) };
  },

  async createTweet({ profileUsername, currentUserId, currentUsername, body }): Promise<CreateTweetResult> {
    if (currentUsername !== profileUsername) {
      return failure(403, "You can only post as yourself");
    }

    const parsed = parseTweetInput(body);
    if ("failure" in parsed) return parsed.failure;

    const author = await repository.findAuthor(currentUserId, currentUsername);
    if (!author) return failure(401, "Invalid or expired token");

    const row = await repository.insertTweet(author.id, parsed.data.text);

    return { ok: true, tweet: tweetFromInsert(row, author) };
  },

  async likeTweet({ tweetId, currentUserId }): Promise<LikeResult> {
    if (!(await repository.tweetExists(tweetId))) return failure(404, "Tweet not found");

    await repository.likeTweet(tweetId, currentUserId);
    const likeCount = await repository.countLikes(tweetId);

    return { ok: true, response: { tweetId, likeCount, likedByMe: true } };
  },

  async unlikeTweet({ tweetId, currentUserId }): Promise<LikeResult> {
    if (!(await repository.tweetExists(tweetId))) return failure(404, "Tweet not found");

    await repository.unlikeTweet(tweetId, currentUserId);
    const likeCount = await repository.countLikes(tweetId);

    return { ok: true, response: { tweetId, likeCount, likedByMe: false } };
  },

  async repostTweet({ tweetId, currentUserId }): Promise<RepostResult> {
    if (!(await repository.tweetExists(tweetId))) return failure(404, "Tweet not found");

    await repository.repostTweet(tweetId, currentUserId);
    const repostCount = await repository.countReposts(tweetId);

    return { ok: true, response: { tweetId, repostCount, repostedByMe: true } };
  },

  async unrepostTweet({ tweetId, currentUserId }): Promise<RepostResult> {
    if (!(await repository.tweetExists(tweetId))) return failure(404, "Tweet not found");

    await repository.unrepostTweet(tweetId, currentUserId);
    const repostCount = await repository.countReposts(tweetId);

    return { ok: true, response: { tweetId, repostCount, repostedByMe: false } };
  },

  async deleteTweet({ tweetId, currentUserId }): Promise<DeleteTweetResult> {
    const authorId = await repository.findTweetAuthor(tweetId);
    if (!authorId) return failure(404, "Tweet not found");
    if (authorId !== currentUserId) return failure(403, "You can only delete your own tweets");

    await repository.deleteTweet(tweetId);
    return { ok: true, response: { tweetId } };
  },
});
