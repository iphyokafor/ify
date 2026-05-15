import { z } from "zod";
import type { FeedFailure } from "./feed.domain";

const MAX_TWEET_LENGTH = 280;
const TWEET_TEXT_ERROR = "Tweet text must be 1-280 characters";

const tweetSchema = z.object({
  text: z
    .string({ error: TWEET_TEXT_ERROR })
    .trim()
    .min(1, TWEET_TEXT_ERROR)
    .max(MAX_TWEET_LENGTH, TWEET_TEXT_ERROR),
});

type NormalizedTweetInput = z.infer<typeof tweetSchema>;

type ParseResult<T> = { data: T } | { failure: FeedFailure };

export const parseTweetInput = (input: unknown): ParseResult<NormalizedTweetInput> => {
  const parsed = tweetSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data };

  return {
    failure: {
      ok: false,
      status: 400,
      error: parsed.error.issues[0]?.message ?? TWEET_TEXT_ERROR,
    },
  };
};

export const parseCursor = (raw: string | undefined) => {
  if (!raw) return null;

  const [createdAt, id] = raw.split("|");
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) return null;

  return { createdAt, id };
};

export const encodeCursor = (createdAt: string | Date, id: string): string => {
  return `${new Date(createdAt).toISOString()}|${id}`;
};
