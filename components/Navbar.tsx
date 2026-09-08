import Link from "next/link";
import { auth } from "@/lib/auth";
import { signInAction, signOutAction } from "@/app/actions/auth";
import NavLinks from "@/components/NavLinks";

export default async function Navbar() {
  // auth() reads the JWT cookie — no external fetch
  const session = await auth().catch(() => null);
  const user = session?.user;

  return (
    <header className="nav-bar sticky top-0 z-50">
      {/* Logo */}
      <Link
        href="/"
        id="nav-logo"
        className="shrink-0 font-display text-lg font-bold uppercase tracking-widest"
      >
        RIFT <span className="text-rift-red">CLAN</span>
      </Link>

      {/* Active-route nav links (client — needs usePathname) */}
      <NavLinks
        isLoggedIn={!!user}
        userImage={user?.image}
        username={user?.name ?? (user as { username?: string })?.username}
      />

      {/* Auth action */}
      <div className="ml-2 shrink-0">
        {user ? (
          <form action={signOutAction}>
            <button
              type="submit"
              id="nav-sign-out"
              className="btn-ghost text-sm"
            >
              Sign out
            </button>
          </form>
        ) : (
          <form action={signInAction}>
            <button
              type="submit"
              id="nav-sign-in"
              className="btn-primary text-sm"
            >
              Log in with Discord
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
