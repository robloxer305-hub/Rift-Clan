import Link from "next/link";

const gameLinks = [
  { href: "/leaderboards/valorant", label: "Valorant" },
  { href: "/leaderboards/cs2", label: "Counter-Strike 2" },
  { href: "/leaderboards/minecraft", label: "Minecraft" },
  { href: "/leaderboards/roblox", label: "Roblox" },
  { href: "/leaderboards/brawlhalla", label: "Brawlhalla" },
];

const platformLinks = [
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/challenges", label: "Challenges" },
  { href: "/profile", label: "My Profile" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <p className="font-display text-lg font-bold uppercase tracking-widest">
              RIFT <span className="text-rift-red">CLAN</span>
            </p>
            <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
              A competitive gaming community where players fight for their
              position and climb to the top.
            </p>
            {/* Discord invite */}
            <a
              href="https://discord.gg/"
              id="footer-discord-invite"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#5865F2]/10 px-3 py-1.5 text-xs font-semibold text-[#7289DA] ring-1 ring-[#5865F2]/20 transition-colors hover:bg-[#5865F2]/20"
            >
              {/* Discord icon inline SVG */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.118 18.1.137 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.81 13.81 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Join our Discord
            </a>
          </div>

          {/* Platform links */}
          <div>
            <p className="rift-eyebrow mb-4">Platform</p>
            <ul className="space-y-2">
              {platformLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Game leaderboards */}
          <div>
            <p className="rift-eyebrow mb-4">Leaderboards</p>
            <ul className="space-y-2">
              {gameLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border/30 pt-6 sm:flex-row">
          <p className="font-mono text-[11px] text-muted-foreground">
            © {year} RIFT CLAN — All rights reserved.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            Ranks synced live from Discord
          </p>
        </div>
      </div>
    </footer>
  );
}
