import Link from "next/link";
import type { Tweet } from "@ify/shared";
import { avatarTone } from "@/lib/avatar";

const reposterText = (
  repostedBy: Tweet["repostedBy"],
  viewerUsername?: string,
): string | null => {
  if (!repostedBy) return null;
  if (repostedBy.username === viewerUsername) return "You reposted";
  return `${repostedBy.firstName} reposted`;
};

type TweetCardProps = {
  tweet: Tweet;
  viewerUsername?: string;
  onToggleLike: (tweetId: string) => void;
  onToggleRepost: (tweetId: string) => void;
  onDelete?: (tweetId: string) => void;
};

export const TweetCard = ({
  tweet,
  viewerUsername,
  onToggleLike,
  onToggleRepost,
  onDelete,
}: Readonly<TweetCardProps>) => {
  const { id, author, text, createdAt, likeCount, likedByMe, repostCount, repostedByMe, repostedBy } = tweet;
  const fullName = `${author.firstName} ${author.lastName}`;
  const timestamp = new Date(createdAt);
  const tone = avatarTone(author.username);
  const reposterLabel = reposterText(repostedBy, viewerUsername);
  const canDelete = Boolean(onDelete) && author.username === viewerUsername;

  return (
    <article className="surface-card p-4 transition-colors hover:bg-[var(--surface-hover)] sm:p-5">
      {reposterLabel ? (
        <div className="repost-header">
          <RepostIcon className="h-3.5 w-3.5" />
          <span>{reposterLabel}</span>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <Link
          href={`/u/${author.username}`}
          aria-label={`${fullName}'s profile`}
          className={`avatar avatar-md ${tone.bg} ${tone.text} ${tone.ring} hover:opacity-90`}
        >
          {author.firstName[0]}
          {author.lastName[0]}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-[15px] leading-tight">
            <span className="min-w-0 flex-1 truncate">
              <Link
                href={`/u/${author.username}`}
                className="font-semibold text-slate-100 hover:underline"
              >
                {fullName}
              </Link>
              <Link
                href={`/u/${author.username}`}
                className="ml-1.5 text-slate-400 hover:underline"
              >
                @{author.username}
              </Link>
            </span>
            <time
              dateTime={timestamp.toISOString()}
              title={timestamp.toLocaleString()}
              className="tweet-meta"
            >
              {formatTimeAgo(timestamp)}
            </time>
            {canDelete ? (
              <DeleteButton onClick={() => onDelete?.(id)} />
            ) : null}
          </div>
          <p className="tweet-body">{text}</p>

          <div className="mt-3 flex items-center gap-4">
            <LikeButton
              liked={likedByMe}
              count={likeCount}
              onClick={() => onToggleLike(id)}
            />
            <RepostButton
              reposted={repostedByMe}
              count={repostCount}
              onClick={() => onToggleRepost(id)}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

type LikeButtonProps = {
  liked: boolean;
  count: number;
  onClick: () => void;
};

const LikeButton = ({ liked, count, onClick }: Readonly<LikeButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={liked}
    aria-label={liked ? "Unlike" : "Like"}
    className={`group like-btn ${liked ? "like-btn--active" : "like-btn--idle"}`}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] transition-transform group-active:scale-90"
      fill={liked ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
    <span className="tabular-nums text-xs">{count > 0 ? count : ""}</span>
  </button>
);

type RepostButtonProps = {
  reposted: boolean;
  count: number;
  onClick: () => void;
};

const RepostButton = ({ reposted, count, onClick }: Readonly<RepostButtonProps>) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={reposted}
    aria-label={reposted ? "Undo repost" : "Repost"}
    className={`group repost-btn ${reposted ? "repost-btn--active" : "repost-btn--idle"}`}
  >
    <RepostIcon className="h-[18px] w-[18px] transition-transform group-active:scale-90" />
    <span className="tabular-nums text-xs">{count > 0 ? count : ""}</span>
  </button>
);

const RepostIcon = ({ className }: Readonly<{ className?: string }>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const DeleteButton = ({ onClick }: Readonly<{ onClick: () => void }>) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Delete tweet"
    className="delete-btn"
  >
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  </button>
);

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
