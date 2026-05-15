"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import type { FollowResponse, UserProfile, UserStats } from "@ify/shared";
import { Feed } from "@/components/feed";
import { Topbar } from "@/components/topbar";
import { avatarTone } from "@/lib/avatar";
import { useSession } from "@/lib/session";
import { apiUrl, authHeader } from "@/lib/api";

const EMPTY_STATS: UserStats = { following: 0, followers: 0 };

type RouteParams = { username: string };

export default function ProfilePage({
  params,
}: Readonly<{ params: Promise<RouteParams> }>) {
  const { username } = use(params);
  const { session, setSession, hydrated } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meStats, setMeStats] = useState<UserStats>(EMPTY_STATS);

  const token = session?.token;

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const url = apiUrl(`/api/users/${encodeURIComponent(username)}/profile`);
      const res = await fetch(url, {
        cache: "no-store",
        headers: authHeader(token),
      });
      if (res.status === 401) {
        setSession(null);
        return;
      }
      if (res.status === 404) {
        setProfile(null);
        setError("This profile doesn't exist.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load profile.");
        return;
      }
      setProfile((await res.json()) as UserProfile);
    } catch {
      setError("Failed to load profile.");
    }
  }, [token, username, setSession]);

  const loadMeStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/users/me/stats"), {
        headers: authHeader(token),
      });
      if (!res.ok) return;
      setMeStats((await res.json()) as UserStats);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    void loadProfile();
    void loadMeStats();
  }, [loadProfile, loadMeStats]);

  const toggleFollow = useCallback(async () => {
    if (!profile || !token || profile.isSelf) return;

    const wasFollowing = profile.isFollowing;
    setProfile({
      ...profile,
      isFollowing: !wasFollowing,
      stats: {
        ...profile.stats,
        followers: wasFollowing
          ? Math.max(0, profile.stats.followers - 1)
          : profile.stats.followers + 1,
      },
    });

    try {
      const url = apiUrl(`/api/users/${encodeURIComponent(profile.username)}/follow`);
      const res = await fetch(url, {
        method: wasFollowing ? "DELETE" : "POST",
        headers: authHeader(token),
      });
      if (!res.ok) throw new Error("Follow failed");
      const data = (await res.json()) as FollowResponse;
      setProfile((current) =>
        current ? { ...current, isFollowing: data.isFollowing } : current
      );
      void loadMeStats();
      setRefreshKey((k) => k + 1);
    } catch {
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: wasFollowing,
              stats: {
                ...current.stats,
                followers: wasFollowing
                  ? current.stats.followers + 1
                  : Math.max(0, current.stats.followers - 1),
              },
            }
          : current
      );
    }
  }, [profile, token, loadMeStats]);

  if (!hydrated) {
    return <main className="app-shell" />;
  }

  if (!session) {
    return (
      <main className="app-shell">
        <div className="empty-state mt-16">
          <p className="text-sm text-slate-300">You need to be signed in to view profiles.</p>
          <Link href="/" className="subtle-link mt-3 inline-block">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Topbar
        user={session}
        stats={meStats}
        onLogout={() => setSession(null)}
        onFollowChange={() => {
          void loadProfile();
          void loadMeStats();
        }}
      />

      <div className="space-y-3 pt-4">
        {error && !profile ? (
          <div className="empty-state">
            <p className="text-sm text-slate-300">{error}</p>
            <Link href="/" className="subtle-link mt-3 inline-block">
              Back home
            </Link>
          </div>
        ) : null}

        {profile ? (
          <ProfileHeader profile={profile} onToggleFollow={() => void toggleFollow()} />
        ) : null}

        {profile ? (
          <Feed
            username={profile.username}
            viewerUsername={session.username}
            authToken={session.token}
            refreshKey={refreshKey}
            source="profile"
            showComposer={false}
            emptyTitle={profile.isSelf ? "You haven't tweeted yet." : `@${profile.username} hasn't tweeted yet.`}
            emptyHint={profile.isSelf ? "Share something from the home feed." : "Check back later."}
          />
        ) : null}
      </div>
    </main>
  );
}

type ProfileHeaderProps = {
  profile: UserProfile;
  onToggleFollow: () => void;
};

const ProfileHeader = ({ profile, onToggleFollow }: Readonly<ProfileHeaderProps>) => {
  const tone = avatarTone(profile.username);
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const joined = new Date(profile.joinedAt);

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={`avatar avatar-lg ${tone.bg} ${tone.text} ${tone.ring}`}
        >
          {profile.firstName[0]}
          {profile.lastName[0]}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-slate-100">{fullName}</h1>
          <p className="truncate text-sm text-slate-400">@{profile.username}</p>
          <p className="mt-1 text-xs text-slate-500">
            Joined{" "}
            {joined.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>

          <div className="mt-3 flex gap-5 text-sm">
            <span className="text-slate-300">
              <span className="font-semibold text-slate-100">{profile.stats.following}</span>{" "}
              <span className="text-slate-400">Following</span>
            </span>
            <span className="text-slate-300">
              <span className="font-semibold text-slate-100">{profile.stats.followers}</span>{" "}
              <span className="text-slate-400">Followers</span>
            </span>
          </div>
        </div>

        {profile.isSelf ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
            You
          </span>
        ) : (
          <button
            type="button"
            onClick={onToggleFollow}
            className={
              profile.isFollowing
                ? "follow-btn follow-btn--following"
                : "follow-btn follow-btn--idle"
            }
          >
            {profile.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
    </section>
  );
};
