DROP TABLE IF EXISTS tweet_reposts CASCADE;
DROP TABLE IF EXISTS tweet_likes CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS tweets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(30)  UNIQUE NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,30}$'),
  email       VARCHAR(255) UNIQUE NOT NULL CHECK (position('@' in email) > 1),
  password_hash TEXT       NOT NULL CHECK (char_length(password_hash) >= 60),
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  age         SMALLINT     NOT NULL CHECK (age BETWEEN 18 AND 80),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE tweets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        VARCHAR(280) NOT NULL CHECK (char_length(btrim(text)) > 0),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE followers (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_id)
);

CREATE TABLE tweet_likes (
  tweet_id   UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tweet_id, user_id)
);

CREATE TABLE tweet_reposts (
  tweet_id   UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tweet_id, user_id)
);

-- Feed query: tweets by followed users, ordered by recency
CREATE INDEX idx_tweets_author_created ON tweets (author_id, created_at DESC, id DESC);

-- Lookup who a user follows
CREATE INDEX idx_followers_follower ON followers (follower_id);

-- Lookup who follows a user
CREATE INDEX idx_followers_followed ON followers (followed_id);

-- Like counts per tweet, and a user's likes
CREATE INDEX idx_tweet_likes_tweet ON tweet_likes (tweet_id);
CREATE INDEX idx_tweet_likes_user ON tweet_likes (user_id);

-- Repost counts per tweet, and a user's repost feed
CREATE INDEX idx_tweet_reposts_tweet ON tweet_reposts (tweet_id);
CREATE INDEX idx_tweet_reposts_user_created ON tweet_reposts (user_id, created_at DESC, tweet_id DESC);
