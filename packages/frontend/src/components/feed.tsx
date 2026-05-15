"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { Tweet, FeedResponse, LikeResponse, RepostResponse } from "@ify/shared";
import { TweetCard } from "./tweet-card";
import { avatarTone } from "@/lib/avatar";
import { apiUrl, authHeader } from "@/lib/api";

const MAX_TWEET_LENGTH = 280;
const FEED_REQUEST_ERROR = "Failed to load feed";
const CREATE_TWEET_ERROR = "Failed to post tweet";
const LIKE_ERROR = "Failed to update like";
const REPOST_ERROR = "Failed to update repost";
const DELETE_ERROR = "Failed to delete tweet";
const DELETE_CONFIRM = "Delete this tweet? This can't be undone.";
const UNKNOWN_ERROR = "Something went wrong";
const RETRY_LABEL = "Try again";
const EMPTY_FEED_TITLE = "No tweets yet.";
const EMPTY_FEED_HINT = "Follow some people to see their tweets here.";
const LOAD_MORE_LABEL = "Load more";
const LOADING_MORE_LABEL = "Loading...";
const PLACEHOLDER_LABEL = "What's happening?";

type FeedProps = {
  username: string;
  viewerUsername: string;
  authToken: string;
  refreshKey?: number;
  source?: "home" | "profile";
  emptyTitle?: string;
  emptyHint?: string;
  showComposer?: boolean;
};

type LoadMode = "replace" | "append";

type TimelineProps = {
  isInitialLoading: boolean;
  tweets: Tweet[];
  viewerUsername: string;
  error: string | null;
  nextCursor: string | null;
  isLoadingMore: boolean;
  emptyTitle: string;
  emptyHint: string;
  onRetry: () => void;
  onLoadMore: () => void;
  onToggleLike: (tweetId: string) => void;
  onToggleRepost: (tweetId: string) => void;
  onDelete: (tweetId: string) => void;
};

const buildFeedUrl = (
  source: "home" | "profile",
  username: string,
  cursor: string | null = null,
): URL => {
  const path = source === "profile"
    ? `/api/feed/profile/${encodeURIComponent(username)}`
    : `/api/feed/${encodeURIComponent(username)}`;
  const url = apiUrl(path);

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  return url;
};

const counterToneClass = (remaining: number): string => {
  if (remaining < 0) return "text-rose-400";
  if (remaining < 20) return "text-amber-300";
  return "text-slate-500";
};

const Timeline = ({
  isInitialLoading,
  tweets,
  viewerUsername,
  error,
  nextCursor,
  isLoadingMore,
  emptyTitle,
  emptyHint,
  onRetry,
  onLoadMore,
  onToggleLike,
  onToggleRepost,
  onDelete,
}: Readonly<TimelineProps>) => {
  if (isInitialLoading && tweets.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="skeleton h-3.5 w-28 rounded-full" />
                <div className="mt-3 space-y-1.5">
                  <div className="skeleton h-3.5 w-full rounded-full" />
                  <div className="skeleton h-3.5 w-4/5 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && tweets.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-sm text-rose-400">{error}</p>
        <button onClick={onRetry} className="subtle-link mt-3">
          {RETRY_LABEL}
        </button>
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="empty-state">
        <p className="font-medium text-slate-100">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-400">{emptyHint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="stagger space-y-3">
        {tweets.map((tweet) => (
          <TweetCard
            key={`${tweet.id}-${tweet.repostedBy?.username ?? "self"}`}
            tweet={tweet}
            viewerUsername={viewerUsername}
            onToggleLike={onToggleLike}
            onToggleRepost={onToggleRepost}
            onDelete={onDelete}
          />
        ))}
      </div>

      {error ? <p className="text-center text-sm text-red-700">{error}</p> : null}

      {nextCursor ? (
        <div className="flex justify-center py-6">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="subtle-link disabled:opacity-50"
          >
            {isLoadingMore ? LOADING_MORE_LABEL : LOAD_MORE_LABEL}
          </button>
        </div>
      ) : null}
    </>
  );
};

export const Feed = ({
  username,
  viewerUsername,
  authToken,
  refreshKey = 0,
  source = "home",
  emptyTitle = EMPTY_FEED_TITLE,
  emptyHint = EMPTY_FEED_HINT,
  showComposer = true,
}: Readonly<FeedProps>) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const growTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const trimmedDraft = draft.trim();
  const remainingChars = MAX_TWEET_LENGTH - draft.length;
  const isDraftValid = trimmedDraft.length > 0 && draft.length <= MAX_TWEET_LENGTH;
  const meTone = avatarTone(username);

  const loadTweets = useCallback(
    async (mode: LoadMode, cursor: string | null = null): Promise<void> => {
      if (mode === "append") {
        setIsLoadingMore(true);
      } else {
        setIsInitialLoading(true);
      }

      setError(null);

      try {
        const url = buildFeedUrl(source, username, cursor);
        const res = await fetch(url, {
          cache: "no-store",
          headers: authHeader(authToken),
        });
        if (!res.ok) throw new Error(FEED_REQUEST_ERROR);

        const data: FeedResponse = await res.json();

        setTweets((prev) =>
          mode === "append" ? [...prev, ...data.tweets] : data.tweets
        );
        setNextCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : UNKNOWN_ERROR);
      } finally {
        if (mode === "append") {
          setIsLoadingMore(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [source, username, authToken]
  );

  useEffect(() => {
    setTweets([]);
    setNextCursor(null);
    void loadTweets("replace");
  }, [loadTweets, refreshKey]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadTweets("replace");
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadTweets]);

  const patchTweet = useCallback((id: string, patch: Partial<Tweet>) => {
    setTweets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const createTweet = useCallback(async (): Promise<void> => {
    if (!isDraftValid || isPosting) return;

    setIsPosting(true);
    setError(null);

    try {
      const url = apiUrl(`/api/feed/${encodeURIComponent(username)}/tweets`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(authToken) },
        body: JSON.stringify({ text: draft }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || CREATE_TWEET_ERROR);
      }

      const createdTweet: Tweet = await res.json();
      setTweets((prev) => [createdTweet, ...prev]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : UNKNOWN_ERROR);
    } finally {
      setIsPosting(false);
    }
  }, [authToken, draft, isDraftValid, isPosting, username]);

  const toggleLike = useCallback(
    (tweetId: string): void => {
      const target = tweets.find((t) => t.id === tweetId);
      if (!target) return;

      const wasLiked = target.likedByMe;
      patchTweet(tweetId, {
        likedByMe: !wasLiked,
        likeCount: wasLiked ? Math.max(0, target.likeCount - 1) : target.likeCount + 1,
      });

      const url = apiUrl(`/api/feed/tweets/${tweetId}/like`);
      fetch(url, { method: wasLiked ? "DELETE" : "POST", headers: authHeader(authToken) })
        .then(async (res) => {
          if (!res.ok) throw new Error(LIKE_ERROR);
          const data = (await res.json()) as LikeResponse;
          patchTweet(tweetId, { likedByMe: data.likedByMe, likeCount: data.likeCount });
        })
        .catch(() => {
          patchTweet(tweetId, { likedByMe: wasLiked, likeCount: target.likeCount });
          setError(LIKE_ERROR);
        });
    },
    [tweets, authToken, patchTweet]
  );

  const toggleRepost = useCallback(
    (tweetId: string): void => {
      const target = tweets.find((t) => t.id === tweetId);
      if (!target) return;

      const wasReposted = target.repostedByMe;
      const snapshot = tweets;

      const optimisticCount = wasReposted
        ? Math.max(0, target.repostCount - 1)
        : target.repostCount + 1;

      setTweets((prev) =>
        prev
          .filter((t) => !(wasReposted && t.id === tweetId && t.repostedBy?.username === viewerUsername))
          .map((t) =>
            t.id === tweetId
              ? { ...t, repostedByMe: !wasReposted, repostCount: optimisticCount }
              : t
          )
      );

      const url = apiUrl(`/api/feed/tweets/${tweetId}/repost`);
      fetch(url, { method: wasReposted ? "DELETE" : "POST", headers: authHeader(authToken) })
        .then(async (res) => {
          if (!res.ok) throw new Error(REPOST_ERROR);
          const data = (await res.json()) as RepostResponse;
          patchTweet(tweetId, { repostedByMe: data.repostedByMe, repostCount: data.repostCount });
        })
        .catch(() => {
          setTweets(snapshot);
          setError(REPOST_ERROR);
        });
    },
    [tweets, authToken, viewerUsername, patchTweet]
  );

  const deleteTweet = useCallback(
    (tweetId: string): void => {
      if (globalThis.window !== undefined && !globalThis.window.confirm(DELETE_CONFIRM)) return;

      const snapshot = tweets;
      const exists = snapshot.some((t) => t.id === tweetId);
      if (!exists) return;

      setTweets((prev) => prev.filter((t) => t.id !== tweetId));

      fetch(apiUrl(`/api/feed/tweets/${tweetId}`), {
        method: "DELETE",
        headers: authHeader(authToken),
      })
        .then((res) => {
          if (!res.ok) throw new Error(DELETE_ERROR);
        })
        .catch(() => {
          setTweets(snapshot);
          setError(DELETE_ERROR);
        });
    },
    [tweets, authToken]
  );

  return (
    <div className="space-y-3 pt-4">
      {showComposer ? (
        <section className="surface-card p-4 sm:p-5">
          <div className="flex gap-3">
            <div
              aria-hidden="true"
              className={`avatar avatar-md ${meTone.bg} ${meTone.text} ${meTone.ring}`}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <label htmlFor="tweet-draft" className="sr-only">
                {PLACEHOLDER_LABEL}
              </label>
              <textarea
                ref={textareaRef}
                id="tweet-draft"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  growTextarea();
                }}
                maxLength={MAX_TWEET_LENGTH}
                placeholder={PLACEHOLDER_LABEL}
                className="compose-input"
                rows={2}
              />
              <div className="compose-toolbar">
                <span
                  aria-live="polite"
                  className={`text-xs tabular-nums ${counterToneClass(remainingChars)}`}
                >
                  {remainingChars}
                </span>
                <button
                  type="button"
                  onClick={() => void createTweet()}
                  disabled={!isDraftValid || isPosting}
                  aria-label={isPosting ? "Posting" : "Post"}
                  className="primary-btn inline-flex items-center gap-1.5 px-4 py-1.5 text-sm"
                >
                  <span className="hidden sm:inline">{isPosting ? "Posting" : "Post"}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <Timeline
        isInitialLoading={isInitialLoading}
        tweets={tweets}
        viewerUsername={viewerUsername}
        error={error}
        nextCursor={nextCursor}
        isLoadingMore={isLoadingMore}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        onRetry={() => void loadTweets("replace")}
        onLoadMore={() => {
          if (nextCursor) {
            void loadTweets("append", nextCursor);
          }
        }}
        onToggleLike={toggleLike}
        onToggleRepost={toggleRepost}
        onDelete={deleteTweet}
      />
    </div>
  );
};
