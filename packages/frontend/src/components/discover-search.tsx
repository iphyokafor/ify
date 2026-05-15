"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserSearchResponse, UserSearchResult, FollowResponse } from "@ify/shared";
import { avatarTone } from "@/lib/avatar";
import { apiUrl, authHeader } from "@/lib/api";
import { useClickOutside } from "@/lib/use-click-outside";

const SEARCH_DEBOUNCE_MS = 200;

type DiscoverSearchProps = {
  authToken: string;
  onFollowChange: () => void;
};

export const DiscoverSearch = ({ authToken, onFollowChange }: Readonly<DiscoverSearchProps>) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const url = apiUrl("/api/users/search");
        url.searchParams.set("q", trimmed);
        const res = await fetch(url, { headers: authHeader(authToken) });
        if (!res.ok) return;
        const data = (await res.json()) as UserSearchResponse;
        setResults(data.results);
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query, authToken]);

  const toggleFollow = useCallback(
    async (user: UserSearchResult): Promise<void> => {
      const wasFollowing = user.isFollowing;

      setResults((prev) =>
        prev.map((r) => (r.id === user.id ? { ...r, isFollowing: !wasFollowing } : r))
      );

      try {
        const url = apiUrl(`/api/users/${user.username}/follow`);
        const res = await fetch(url, {
          method: wasFollowing ? "DELETE" : "POST",
          headers: authHeader(authToken),
        });
        if (!res.ok) throw new Error("Follow request failed");
        const data = (await res.json()) as FollowResponse;
        setResults((prev) =>
          prev.map((r) => (r.id === user.id ? { ...r, isFollowing: data.isFollowing } : r))
        );
        onFollowChange();
      } catch {
        setResults((prev) =>
          prev.map((r) => (r.id === user.id ? { ...r, isFollowing: wasFollowing } : r))
        );
      }
    },
    [authToken, onFollowChange]
  );

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Find people"
        aria-label="Find people"
        className="search-input w-full"
      />
      {showDropdown ? (
        <div className="search-results">
          <ResultsList isLoading={isLoading} results={results} onToggle={(u) => void toggleFollow(u)} />
        </div>
      ) : null}
    </div>
  );
};

type ResultsListProps = {
  isLoading: boolean;
  results: UserSearchResult[];
  onToggle: (user: UserSearchResult) => void;
};

const ResultsList = ({ isLoading, results, onToggle }: Readonly<ResultsListProps>) => {
  if (isLoading && results.length === 0) {
    return <p className="px-3 py-3 text-xs text-slate-500">Searching...</p>;
  }
  if (results.length === 0) {
    return <p className="px-3 py-3 text-xs text-slate-500">No matches</p>;
  }
  return (
    <>
      {results.map((user) => (
        <UserRow key={user.id} user={user} onToggle={() => onToggle(user)} />
      ))}
    </>
  );
};

type UserRowProps = {
  user: UserSearchResult;
  onToggle: () => void;
};

const UserRow = ({ user, onToggle }: Readonly<UserRowProps>) => {
  const tone = avatarTone(user.username);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5">
      <Link
        href={`/u/${user.username}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className={`avatar avatar-sm ${tone.bg} ${tone.text} ${tone.ring}`}>
          {user.firstName[0]}
          {user.lastName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-slate-400">@{user.username}</p>
        </div>
      </Link>
      {user.isSelf ? (
        <span className="text-xs text-slate-500">You</span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className={user.isFollowing ? "follow-btn follow-btn--following" : "follow-btn follow-btn--idle"}
        >
          {user.isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
};
