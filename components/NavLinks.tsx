"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/matches", label: "Matches" },
  { href: "/minigames", label: "MiniGames" },
  { href: "/profile", label: "Profile" },
];

type Props = {
  isLoggedIn: boolean;
  userImage?: string | null;
  username?: string | null;
};

export default function NavLinks({ isLoggedIn, userImage, username }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-rift-red" />
            )}
          </Link>
        );
      })}

      {isLoggedIn ? (
        <div className="ml-3 flex items-center gap-2">
          {userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={username ?? "avatar"}
              className="h-7 w-7 rounded-full ring-1 ring-rift-red/40"
            />
          )}
        </div>
      ) : null}
    </nav>
  );
}
