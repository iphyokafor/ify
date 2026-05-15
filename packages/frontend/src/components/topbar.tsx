"use client";

import Link from "next/link";
import type { UserStats } from "@ify/shared";
import type { SessionUser } from "@/lib/session";
import { DiscoverSearch } from "./discover-search";
import { Logotype } from "./logo";
import { UserMenu } from "./user-menu";

type TopbarProps = {
  user: SessionUser;
  stats: UserStats;
  onLogout: () => void;
  onFollowChange: () => void;
};

export const Topbar = ({ user, stats, onLogout, onFollowChange }: Readonly<TopbarProps>) => (
  <header className="topbar">
    <Link href="/" aria-label="Home" className="bg-transparent p-0">
      <Logotype className="text-xl" />
    </Link>
    <DiscoverSearch authToken={user.token} onFollowChange={onFollowChange} />
    <UserMenu user={user} stats={stats} onLogout={onLogout} />
  </header>
);
