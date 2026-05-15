"use client";

import { useRef, useState } from "react";
import type { UserStats } from "@ify/shared";
import type { SessionUser } from "@/lib/session";
import { avatarTone } from "@/lib/avatar";
import { useClickOutside } from "@/lib/use-click-outside";

type UserMenuProps = {
  user: SessionUser;
  stats: UserStats;
  onLogout: () => void;
};

export const UserMenu = ({ user, stats, onLogout }: Readonly<UserMenuProps>) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tone = avatarTone(user.username);

  useClickOutside(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={`group flex items-center gap-1.5 rounded-full p-1 pr-2 transition-colors ${
          open ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <span
          className={`avatar avatar-sm ${tone.bg} ${tone.text} ${tone.ring}`}
        >
          {user.firstName.charAt(0).toUpperCase()}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={`h-3 w-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-52 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-[var(--surface)] shadow-xl shadow-black/40 ring-1 ring-black/20 fade-up"
        >
          <div className="border-b border-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-slate-100">{user.firstName}</p>
            <p className="truncate text-xs text-slate-400">@{user.username}</p>
          </div>
          <div className="grid grid-cols-2 border-b border-white/5 text-center">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-100">{stats.following}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Following</p>
            </div>
            <div className="border-l border-white/5 px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-100">{stats.followers}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Followers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
};
