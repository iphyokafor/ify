"use client";

import { useEffect, useState } from "react";

export const SESSION_STORAGE_KEY = "ify.session";

export type SessionUser = {
  username: string;
  firstName: string;
  token: string;
};

export const useSession = () => {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as SessionUser);
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session, hydrated]);

  return { session, setSession, hydrated };
};
