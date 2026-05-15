import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TweetCard } from "./tweet-card";
import type { Tweet } from "@ify/shared";

describe("TweetCard", () => {
  const baseTweet: Tweet = {
    id: "tweet-1",
    text: "Testing keeps shipping safe.",
    createdAt: new Date().toISOString(),
    author: {
      id: "user-1",
      username: "bob",
      firstName: "Bob",
      lastName: "Smith",
    },
    likeCount: 0,
    likedByMe: false,
    repostCount: 0,
    repostedByMe: false,
  };

  it("renders author and tweet text", () => {
    const html = renderToStaticMarkup(
      <TweetCard tweet={baseTweet} onToggleLike={() => {}} onToggleRepost={() => {}} />
    );

    expect(html).toContain("Bob Smith");
    expect(html).toContain("@bob");
    expect(html).toContain("Testing keeps shipping safe.");
  });

  it("shows a reposted-by header when the tweet was reposted", () => {
    const reposted: Tweet = {
      ...baseTweet,
      repostedBy: { username: "alice", firstName: "Alice" },
    };

    const html = renderToStaticMarkup(
      <TweetCard tweet={reposted} onToggleLike={() => {}} onToggleRepost={() => {}} />
    );

    expect(html).toContain("Alice reposted");
  });
});

