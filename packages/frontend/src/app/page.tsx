"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserStats } from "@ify/shared";
import { AuthPanel } from "@/components/auth-panel";
import { Feed } from "@/components/feed";
import { Topbar } from "@/components/topbar";
import { useSession } from "@/lib/session";
import { apiUrl, authHeader } from "@/lib/api";

const EMPTY_STATS: UserStats = { following: 0, followers: 0 };

export default function Home() {
  const { session, setSession, hydrated } = useSession();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);

  const token = session?.token;
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/users/me/stats"), {
        headers: authHeader(token),
      });
      if (res.status === 401) {
        setSession(null);
        return;
      }
      if (!res.ok) return;
      setStats((await res.json()) as UserStats);
    } catch {
      // ignore transient fetch errors
    }
  }, [token, setSession]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, feedRefreshKey]);

  if (!hydrated) {
    return <main className="app-shell" />;
  }

  if (!session) {
    return (
      <main className="app-shell fade-up">
        <div className="pt-16">
          <AuthPanel onAuthenticated={setSession} />
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Topbar
        user={session}
        stats={stats}
        onLogout={() => setSession(null)}
        onFollowChange={() => setFeedRefreshKey((k) => k + 1)}
      />

      <Feed
        username={session.username}
        viewerUsername={session.username}
        authToken={session.token}
        refreshKey={feedRefreshKey}
      />
    </main>
  );
}
